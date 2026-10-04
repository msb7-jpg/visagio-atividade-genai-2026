"""Script agnóstico de hardware e alta performance para geração da coluna genai_context e vec_movies.

Detecta dinamicamente a arquitetura de aceleração disponível (NVIDIA CUDA com FP16, Apple Silicon MPS
ou CPU multi-thread), aplicando pré-agregação concorrente via ThreadPoolExecutor, pipeline produtor-consumidor
e PRAGMAs turbo no SQLite.
"""

from __future__ import annotations

import argparse
import logging
import queue
import sqlite3
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from pathlib import Path
from typing import TYPE_CHECKING

import numpy as np
import sqlite_vec
import torch

if TYPE_CHECKING:
    from sentence_transformers import SentenceTransformer

# Adiciona o diretório backend ao sys.path para importação dos módulos da app
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.agent.embeddings.embedding_model import get_embedding_model  # ruff: ignore[module-import-not-at-top-of-file]
from app.core.config import get_settings  # ruff: ignore[module-import-not-at-top-of-file]

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("generate_genai_context")

type FactUpdateTuple = tuple[str, str]  # (genai_context, sk_movie_id)
type VecInsertTuple = tuple[str, bytes]  # (sk_movie_id, embedding_bytes)
type DbBatchPayload = tuple[list[FactUpdateTuple], list[VecInsertTuple]]


@dataclass(frozen=True, slots=True)
class MovieContextRecord:
    """Representação tipada dos dados contextuais de um filme para vetorização."""

    sk_movie_id: str
    titulo: str
    ano_lancamento: int | None
    duracao_minutos: int | None
    sinopse: str
    generos: str | None
    diretores: str | None
    elenco_principal: str | None
    popularidade: float | None
    nota_imdb: float | None
    nota_tmdb: float | None
    receita_brl: float | None
    orcamento_brl: float | None
    lucro_brl: float | None
    genai_context: str


def get_writeable_db_path() -> Path:
    """Retorna o caminho validado para o arquivo cinerocket.db.

    Returns:
        Path absoluto para o banco SQLite.

    Raises:
        FileNotFoundError: Caso o arquivo cinerocket.db não exista.
    """
    settings = get_settings()
    db_path = Path(settings.sqlite_db_path).resolve()
    if not db_path.exists():
        raise FileNotFoundError(f"Arquivo cinerocket.db não encontrado em: {db_path}")
    return db_path


def get_read_only_uri(db_path: Path) -> str:
    """Gera URI segura para abertura de banco de dados em modo somente leitura agnóstica de SO."""
    return f"{db_path.resolve().as_uri()}?mode=ro"


def apply_turbo_pragmas(conn: sqlite3.Connection) -> None:
    """Aplica configurações de ultra-performance no SQLite durante o processamento em lote.

    Args:
        conn: Conexão ativa com o banco SQLite.
    """
    conn.execute("PRAGMA synchronous = OFF;")
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA cache_size = -128000;")  # 128 MB de cache em RAM
    conn.execute("PRAGMA temp_store = MEMORY;")


def ensure_schema(conn: sqlite3.Connection, recreate_vec: bool = False) -> None:
    """Garante que a coluna genai_context exista na fact_movies_performance e que vec_movies esteja pronta.

    Args:
        conn: Conexão SQLite writeable.
        recreate_vec: Se True, recria a tabela virtual vec_movies.
    """
    cur = conn.cursor()

    # 1. Garante que a coluna genai_context exista na fact_movies_performance
    cur.execute("PRAGMA table_info(fact_movies_performance);")
    cols = {row[1] for row in cur.fetchall()}
    if "genai_context" not in cols:
        logger.info("Adicionando coluna genai_context na tabela fact_movies_performance...")
        cur.execute("ALTER TABLE fact_movies_performance ADD COLUMN genai_context TEXT;")
        conn.commit()

    # 2. Recria ou inicializa a tabela virtual vec_movies (sqlite-vec)
    if recreate_vec:
        logger.info("Recriando índice virtual vec_movies...")
        cur.execute("DROP TABLE IF EXISTS vec_movies;")

    cur.execute("""
        CREATE VIRTUAL TABLE IF NOT EXISTS vec_movies USING vec0(
            sk_movie_id TEXT PRIMARY KEY,
            embedding float[384]
        );
    """)
    conn.commit()
    logger.info("Schema do banco de dados e índice vec_movies prontos.")


def _fetch_genres(db_path: Path) -> dict[str, str]:
    """Recupera mapa de gêneros concatenados por filme em conexão somente leitura."""
    conn = sqlite3.connect(get_read_only_uri(db_path), uri=True)
    try:
        apply_turbo_pragmas(conn)
        cur = conn.cursor()
        cur.execute("""
            SELECT bmg.sk_movie_id, GROUP_CONCAT(g.nome_genero, ', ')
            FROM bridge_movie_genre bmg
            JOIN dim_genres g ON bmg.sk_genre_id = g.sk_genre_id
            GROUP BY bmg.sk_movie_id;
        """)
        return dict(cur.fetchall())
    finally:
        conn.close()


def _fetch_people_by_type(db_path: Path, tipo_pessoa: str) -> dict[str, str]:
    """Recupera mapa de pessoas (diretores ou atores) agrupados por filme."""
    conn = sqlite3.connect(get_read_only_uri(db_path), uri=True)
    try:
        apply_turbo_pragmas(conn)
        cur = conn.cursor()
        cur.execute(
            """
            SELECT bmp.sk_movie_id, GROUP_CONCAT(p.nome_pessoa, ', ')
            FROM bridge_movie_person bmp
            JOIN dim_people p ON bmp.sk_person_id = p.sk_person_id
            WHERE p.tipo_pessoa = ?
            GROUP BY bmp.sk_movie_id;
            """,
            (tipo_pessoa,),
        )
        return dict(cur.fetchall())
    finally:
        conn.close()


def preaggregate_dimensions_parallel(
    db_path: Path,
) -> tuple[dict[str, str], dict[str, str], dict[str, str]]:
    """Carrega dados relacionais de 3 dimensões concorrentemente via ThreadPoolExecutor.

    Args:
        db_path: Caminho do arquivo cinerocket.db.

    Returns:
        Tupla contendo (genres_map, directors_map, actors_map).
    """
    t0 = time.time()
    logger.info("Iniciando pré-agregação concorrente de dimensões (gêneros, diretores e elenco)...")
    with ThreadPoolExecutor(max_workers=3) as executor:
        f_genres = executor.submit(_fetch_genres, db_path)
        f_directors = executor.submit(_fetch_people_by_type, db_path, "Diretor")
        f_actors = executor.submit(_fetch_people_by_type, db_path, "Ator")

        genres = f_genres.result()
        directors = f_directors.result()
        actors = f_actors.result()

    logger.info(
        "Dimensões pré-agregadas em %.2fs (%d gêneros, %d diretores, %d elencos).",
        time.time() - t0,
        len(genres),
        len(directors),
        len(actors),
    )
    return genres, directors, actors


def _format_metrics_line(
    popularidade: float | None,
    nota_imdb: float | None,
    nota_tmdb: float | None,
    receita_brl: float | None,
    lucro_brl: float | None,
) -> str:
    """Auxiliar para formatar a linha de métricas de forma sucinta.

    Args:
        popularidade: Índice de popularidade.
        nota_imdb: Nota no IMDb.
        nota_tmdb: Nota no TMDB.
        receita_brl: Receita total em Reais.
        lucro_brl: Lucro calculado em Reais.

    Returns:
        String formatada com as métricas presentes.
    """
    parts: list[str] = []
    if popularidade is not None:
        parts.append(f"Popularidade: {popularidade:.1f}")
    if nota_imdb is not None:
        parts.append(f"IMDb: {nota_imdb:.1f}")
    if nota_tmdb is not None:
        parts.append(f"TMDB: {nota_tmdb:.1f}")
    if receita_brl is not None and receita_brl > 0:
        parts.append(f"Bilheteria: R$ {receita_brl:,.2f}")
    if lucro_brl is not None and lucro_brl != 0:
        parts.append(f"Lucro: R$ {lucro_brl:,.2f}")
    return " | ".join(parts)


def build_text_context(
    titulo: str,
    ano_lancamento: int | None,
    generos: str | None,
    diretores: str | None,
    elenco: str | None,
    sinopse: str | None,
    popularidade: float | None,
    nota_imdb: float | None,
    nota_tmdb: float | None,
    receita_brl: float | None,
    lucro_brl: float | None,
) -> str:
    """Monta a string textual canônica concatenando todos os campos relevantes para o modelo de embeddings.

    Args:
        titulo: Título da obra.
        ano_lancamento: Ano de lançamento.
        generos: Nomes dos gêneros concatenados por vírgula.
        diretores: Nomes dos diretores concatenados.
        elenco: Nomes do elenco principal.
        sinopse: Sinopse textual.
        popularidade: Índice de popularidade.
        nota_imdb: Nota no IMDb.
        nota_tmdb: Nota no TMDB.
        receita_brl: Receita em BRL.
        lucro_brl: Lucro em BRL.

    Returns:
        Contexto textual consolidado.
    """
    header = f"Título: {titulo}" + (f" ({ano_lancamento})" if ano_lancamento else "")

    meta_parts: list[str] = []
    if generos:
        meta_parts.append(f"Gêneros: {generos}")
    if diretores:
        meta_parts.append(f"Direção: {diretores}")
    if elenco:
        elenco_amostra = ", ".join(elenco.split(", ")[:5])
        meta_parts.append(f"Elenco: {elenco_amostra}")

    lines: list[str] = [header]
    if meta_parts:
        lines.append(" | ".join(meta_parts))

    if sinopse and sinopse.strip():
        lines.append(f"Sinopse: {sinopse.strip()}")

    stats_line = _format_metrics_line(popularidade, nota_imdb, nota_tmdb, receita_brl, lucro_brl)
    if stats_line:
        lines.append(f"Métricas: {stats_line}")

    return "\n".join(lines)


def _row_to_record(
    row: tuple[object, ...],
    genres_map: dict[str, str],
    directors_map: dict[str, str],
    actors_map: dict[str, str],
) -> MovieContextRecord:
    """Converte uma tupla bruta de filme em uma instância tipada de MovieContextRecord."""
    sk_id = str(row[0])
    titulo = str(row[1])
    ano = int(row[2]) if row[2] is not None else None
    duracao = int(row[3]) if row[3] is not None else None
    sinopse = str(row[4])
    pop = float(row[5]) if row[5] is not None else None
    n_imdb = float(row[6]) if row[6] is not None else None
    n_tmdb = float(row[7]) if row[7] is not None else None
    rec_brl = float(row[8]) if row[8] is not None else None
    orc_brl = float(row[9]) if row[9] is not None else None
    luc_brl = float(row[10]) if row[10] is not None else None

    generos = genres_map.get(sk_id)
    diretores = directors_map.get(sk_id)
    elenco = actors_map.get(sk_id)

    context_text = build_text_context(
        titulo=titulo,
        ano_lancamento=ano,
        generos=generos,
        diretores=diretores,
        elenco=elenco,
        sinopse=sinopse,
        popularidade=pop,
        nota_imdb=n_imdb,
        nota_tmdb=n_tmdb,
        receita_brl=rec_brl,
        lucro_brl=luc_brl,
    )

    return MovieContextRecord(
        sk_movie_id=sk_id,
        titulo=titulo,
        ano_lancamento=ano,
        duracao_minutos=duracao,
        sinopse=sinopse,
        generos=generos,
        diretores=diretores,
        elenco_principal=elenco,
        popularidade=pop,
        nota_imdb=n_imdb,
        nota_tmdb=n_tmdb,
        receita_brl=rec_brl,
        orcamento_brl=orc_brl,
        lucro_brl=luc_brl,
        genai_context=context_text,
    )


def _prepare_batch_payload(
    records: list[MovieContextRecord],
    embeddings: np.ndarray,
) -> DbBatchPayload:
    """Converte registros e matriz de embeddings para tuplas otimizadas do banco."""
    fact_updates: list[FactUpdateTuple] = []
    vec_inserts: list[VecInsertTuple] = []

    for idx, item in enumerate(records):
        emb_bytes = np.asarray(embeddings[idx], dtype=np.float32).tobytes()
        fact_updates.append((item.genai_context, item.sk_movie_id))
        vec_inserts.append((item.sk_movie_id, emb_bytes))

    return fact_updates, vec_inserts


def detect_default_batch_size() -> int:
    """Calcula dinamicamente o tamanho de lote ideal com base no hardware disponível."""
    if torch.cuda.is_available():
        return 512
    if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        return 256
    return 128


def setup_accelerated_model() -> SentenceTransformer:
    """Inicializa o modelo SentenceTransformer com detecção dinâmica e agnóstica de hardware.

    Suporta NVIDIA CUDA (com FP16 Tensor Cores), Apple Silicon MPS e CPU com fallback automático.

    Returns:
        Instância do SentenceTransformer configurada.

    Raises:
        RuntimeError: Se o modelo não puder ser inicializado.
    """
    model_mgr = get_embedding_model()
    model_mgr.warmup()
    raw_model = model_mgr.raw_model
    if raw_model is None:
        raise RuntimeError("Instância interna do SentenceTransformer não inicializada.")

    if torch.cuda.is_available():
        logger.info("Aceleração detectada: NVIDIA CUDA com Tensor Cores FP16.")
        raw_model.to("cuda")
        raw_model.half()
    elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        logger.info("Aceleração detectada: Apple Silicon MPS (Metal Performance Shaders).")
        raw_model.to("mps")
    else:
        logger.info(
            "Executando em CPU multi-thread (threads disponíveis: %d)...",
            torch.get_num_threads(),
        )

    return raw_model


def db_writer_worker(
    db_path: Path,
    write_queue: queue.Queue[DbBatchPayload | None],
    stop_event: threading.Event,
    error_holder: list[Exception],
) -> None:
    """Thread dedicada que consome lotes gerados e grava em transações rápidas no SQLite.

    Args:
        db_path: Caminho do banco SQLite.
        write_queue: Fila de lotes a serem persistidos.
        stop_event: Evento para interrupção ou sinal de encerramento.
        error_holder: Lista compartilhada para captura de exceções críticas.
    """
    conn = sqlite3.connect(db_path)
    try:
        apply_turbo_pragmas(conn)
        conn.enable_load_extension(True)
        sqlite_vec.load(conn)
        conn.enable_load_extension(False)

        while not stop_event.is_set() or not write_queue.empty():
            try:
                batch_data = write_queue.get(timeout=0.2)
            except queue.Empty:
                continue

            if batch_data is None:
                write_queue.task_done()
                break

            fact_updates, vec_inserts = batch_data
            cur = conn.cursor()
            with conn:
                cur.executemany(
                    """
                    UPDATE fact_movies_performance
                    SET genai_context = ?
                    WHERE sk_movie_id = ?;
                    """,
                    fact_updates,
                )
                cur.executemany(
                    """
                    INSERT OR REPLACE INTO vec_movies(sk_movie_id, embedding)
                    VALUES (?, ?);
                    """,
                    vec_inserts,
                )
            write_queue.task_done()

    except Exception as exc:
        logger.exception("Erro crítico na thread de gravação do banco: %s", exc)
        error_holder.append(exc)
        stop_event.set()
    finally:
        conn.close()


def fetch_movie_rows(db_path: Path, limit: int | None = None) -> list[tuple[object, ...]]:
    """Carrega dados da tabela fato unidos à dimensão dim_movies em modo somente leitura.

    Args:
        db_path: Caminho para o arquivo cinerocket.db.
        limit: Limite máximo de registros a serem retornados.

    Returns:
        Lista de tuplas contendo os dados dos filmes.
    """
    conn_read = sqlite3.connect(get_read_only_uri(db_path), uri=True)
    try:
        apply_turbo_pragmas(conn_read)
        cur = conn_read.cursor()

        query = """
            SELECT 
                f.sk_movie_id,
                m.titulo,
                m.ano_lancamento,
                m.duracao_minutos,
                COALESCE(m.sinopse, '') AS sinopse,
                f.popularidade,
                f.nota_imdb,
                f.nota_tmdb,
                f.receita_brl,
                f.orcamento_brl,
                f.lucro_brl
            FROM fact_movies_performance f
            JOIN dim_movies m ON f.sk_movie_id = m.sk_movie_id
            ORDER BY f.popularidade DESC
        """
        if limit is not None and limit > 0:
            query += f" LIMIT {int(limit)}"

        logger.info("Carregando catálogo de filmes para vetorização...")
        t0 = time.time()
        cur.execute(query)
        rows = cur.fetchall()
        logger.info("Total de filmes carregados: %d em %.2fs", len(rows), time.time() - t0)
        return rows
    finally:
        conn_read.close()


def process_and_populate_turbo(
    db_path: Path,
    limit: int | None = None,
    batch_size: int | None = None,
) -> int:
    """Executa o pipeline acelerado: pré-agregação paralela + inferência hardware-aware + gravação assíncrona.

    Args:
        db_path: Caminho do banco SQLite.
        limit: Quantidade máxima de filmes para processar.
        batch_size: Tamanho do lote (se omitido, calibra automaticamente para o hardware).

    Returns:
        Quantidade total de filmes vetorizados e persistidos.
    """
    eff_batch_size = batch_size if batch_size is not None and batch_size > 0 else detect_default_batch_size()
    logger.info("Tamanho de lote calibrado: %d itens por iteração.", eff_batch_size)

    genres_map, directors_map, actors_map = preaggregate_dimensions_parallel(db_path)
    model = setup_accelerated_model()
    rows = fetch_movie_rows(db_path, limit=limit)
    total_rows = len(rows)

    if total_rows == 0:
        logger.info("Nenhum filme encontrado para processar.")
        return 0

    write_queue: queue.Queue[DbBatchPayload | None] = queue.Queue(maxsize=8)
    stop_event = threading.Event()
    error_holder: list[Exception] = []

    writer_thread = threading.Thread(
        target=db_writer_worker,
        args=(db_path, write_queue, stop_event, error_holder),
        daemon=True,
    )
    writer_thread.start()

    processed_count = 0
    t_start = time.time()

    try:
        for i in range(0, total_rows, eff_batch_size):
            if error_holder:
                raise error_holder[0]

            batch_rows = rows[i : i + eff_batch_size]
            batch_records = [_row_to_record(r, genres_map, directors_map, actors_map) for r in batch_rows]
            batch_texts = [item.genai_context for item in batch_records]

            with torch.inference_mode():
                embeddings = model.encode(
                    batch_texts,
                    batch_size=eff_batch_size,
                    show_progress_bar=False,
                    normalize_embeddings=True,
                )

            payload = _prepare_batch_payload(batch_records, embeddings)
            write_queue.put(payload)
            processed_count += len(batch_rows)

            elapsed = time.time() - t_start
            rate = processed_count / elapsed if elapsed > 0 else 0
            eta = (total_rows - processed_count) / rate if rate > 0 else 0
            logger.info(
                "Progresso: %d/%d (%.1f%%) | %.1f itens/s | ETA: %.0fs",
                processed_count,
                total_rows,
                (processed_count / total_rows) * 100,
                rate,
                eta,
            )

        if writer_thread.is_alive() and not error_holder:
            write_queue.put(None)
            write_queue.join()
        stop_event.set()
        writer_thread.join()

        if error_holder:
            raise error_holder[0]

    except Exception:
        stop_event.set()
        writer_thread.join(timeout=5.0)
        raise

    total_time = time.time() - t_start
    rate_total = processed_count / total_time if total_time > 0 else 0
    logger.info(
        "[OK] Processo concluído com sucesso! %d filmes processados em %.2fs (%.1f filmes/s).",
        processed_count,
        total_time,
        rate_total,
    )
    return processed_count


def process_and_populate(
    conn: sqlite3.Connection | None = None,
    limit: int | None = None,
    batch_size: int | None = None,
) -> int:
    """Invoca o pipeline acelerado de pré-computação e persistência."""
    db_path = get_writeable_db_path()
    return process_and_populate_turbo(db_path=db_path, limit=limit, batch_size=batch_size)


def main() -> None:
    """Ponto de entrada do script CLI."""
    parser = argparse.ArgumentParser(
        description="Gera e pré-computa em alta velocidade e agnóstico de hardware a coluna genai_context e vec_movies."
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Quantidade máxima de filmes para processar (útil para testes rápidos, ex: --limit 500).",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=None,
        help="Tamanho do lote para inferência e inserção no SQLite (padrão: auto calibrado por hardware).",
    )
    parser.add_argument(
        "--recreate-vec",
        "--recreate",
        action="store_true",
        dest="recreate_vec",
        help="Se informado, exclui e recria a tabela virtual vec_movies antes de popular.",
    )
    args = parser.parse_args()

    db_path = get_writeable_db_path()
    logger.info("Conectando ao banco de dados para inicialização de schema: %s", db_path)

    conn = sqlite3.connect(db_path)
    try:
        apply_turbo_pragmas(conn)
        conn.enable_load_extension(True)
        sqlite_vec.load(conn)
        conn.enable_load_extension(False)

        ensure_schema(conn, recreate_vec=args.recreate_vec)
    finally:
        conn.close()

    process_and_populate_turbo(
        db_path=db_path,
        limit=args.limit,
        batch_size=args.batch_size,
    )


if __name__ == "__main__":
    main()
