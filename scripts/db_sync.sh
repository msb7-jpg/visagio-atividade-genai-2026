#!/usr/bin/env bash
# ==============================================================================
# CineData Analytics -- Sincronizacao e Compressao de Base de Dados (db_sync.sh)
# Suporta extracao/compressao (serialize) e descompressao/reconstrucao (deserialize)
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

DB_NAME="cinerocket.db"
DB_PATH="$PROJECT_ROOT/$DB_NAME"
ARCHIVE_NAME="database.sql.xz"
ARCHIVE_PATH="$PROJECT_ROOT/$ARCHIVE_NAME"
SQL_DUMP_NAME="database_dump.sql"
SQL_DUMP_PATH="$PROJECT_ROOT/$SQL_DUMP_NAME"

ACTION="${1:-}"

# Funcao para filtrar e excluir tabelas/dados de app settings do fluxo SQL
filter_dump_stream() {
  # Remove comandos DDL e DML relacionados a app settings / configuracoes de usuario
  grep -v -E "(user_model_configs|app_settings)" || true
}

# Funcao de compressao de fluxo SQL para XZ (com suporte a multithreading)
compress_stream_to_xz() {
  local target_archive="$1"
  if command -v xz &> /dev/null; then
    if xz --help 2>&1 | grep -q -- "-T"; then
      xz -9 -T0 --extreme > "$target_archive"
    else
      xz -9 --extreme > "$target_archive"
    fi
  else
    # Fallback transparente para modulo nativo lzma do Python
    python3 -c "
import sys, lzma
with open(sys.argv[1], 'wb') as f_out:
    with lzma.open(f_out, 'wb', preset=9 | lzma.PRESET_EXTREME) as f_xz:
        while True:
            chunk = sys.stdin.buffer.read(65536)
            if not chunk:
                break
            f_xz.write(chunk)
" "$target_archive"
  fi
}

# Funcao de descompressao de arquivo XZ para fluxo SQL
decompress_xz_to_stream() {
  local source_archive="$1"
  if command -v xz &> /dev/null; then
    xz -dc "$source_archive"
  else
    python3 -c "
import sys, lzma
with lzma.open(sys.argv[1], 'rb') as f_xz:
    while True:
        chunk = f_xz.read(65536)
        if not chunk:
            break
        sys.stdout.buffer.write(chunk)
" "$source_archive"
  fi
}

case "$ACTION" in
  cp|serialize|compress)
    echo "[>] Iniciando extracao analitica e compressao do banco de dados..."
    
    if [ ! -f "$DB_PATH" ]; then
      echo "[ERRO] Banco de dados '$DB_NAME' nao encontrado em: $DB_PATH"
      exit 1
    fi
    
    ORIG_SIZE=$(du -sh "$DB_PATH" | cut -f1)
    echo "   [DB] Tamanho original do SQLite binario: $ORIG_SIZE"

    # Garante fechamento de wal antes do dump
    if command -v sqlite3 &> /dev/null; then
      sqlite3 "$DB_PATH" "PRAGMA wal_checkpoint(TRUNCATE);" 2>/dev/null || true
      
      echo "   [>] Gerando dump SQL (filtrando tabelas de configuracao) e comprimindo para $ARCHIVE_NAME..."
      sqlite3 "$DB_PATH" .dump | filter_dump_stream | compress_stream_to_xz "$ARCHIVE_PATH"
      
      # Gera tambem database_dump.sql se solicitado ou para manter dump em texto
      if [ "${2:-}" = "--dump-sql" ] || [ ! -f "$SQL_DUMP_PATH" ]; then
        echo "   [>] Atualizando dump em texto puro: $SQL_DUMP_NAME..."
        sqlite3 "$DB_PATH" .dump | filter_dump_stream > "$SQL_DUMP_PATH"
      fi
    else
      # Fallback quando sqlite3 CLI nao esta instalado: usa Python sqlite3
      echo "   [!] sqlite3 CLI nao encontrado. Executando extracao via runtime Python..."
      python3 -c "
import sqlite3, lzma, sys, re
conn = sqlite3.connect('$DB_PATH')
with lzma.open('$ARCHIVE_PATH', 'wt', encoding='utf-8', preset=9 | lzma.PRESET_EXTREME) as f_out:
    for line in conn.iterdump():
        if not re.search(r'(user_model_configs|app_settings)', line, re.IGNORECASE):
            f_out.write(f'{line}\n')
conn.close()
"
      if [ "${2:-}" = "--dump-sql" ] || [ ! -f "$SQL_DUMP_PATH" ]; then
        echo "   [>] Gerando $SQL_DUMP_NAME via Python..."
        python3 -c "
import sqlite3, re
conn = sqlite3.connect('$DB_PATH')
with open('$SQL_DUMP_PATH', 'w', encoding='utf-8') as f:
    for line in conn.iterdump():
        if not re.search(r'(user_model_configs|app_settings)', line, re.IGNORECASE):
            f.write(f'{line}\n')
conn.close()
"
      fi
    fi

    NEW_SIZE=$(du -sh "$ARCHIVE_PATH" | cut -f1)
    echo "   [OK] Concluido com sucesso! Arquivo gerado: $ARCHIVE_PATH"
    echo "   [OK] Resumo da compressao: $ORIG_SIZE -> $NEW_SIZE"
    ;;

  dc|deserialize|decompress)
    echo "[>] Restaurando base de dados $DB_NAME a partir do arquivo compactado..."

    if [ ! -f "$ARCHIVE_PATH" ]; then
      if [ -f "$SQL_DUMP_PATH" ]; then
        echo "   [!] $ARCHIVE_NAME nao encontrado, mas $SQL_DUMP_NAME esta disponivel."
        echo "   [>] Restaurando diretamente a partir do dump em texto puro..."
        rm -f "$DB_PATH" "$DB_PATH-wal" "$DB_PATH-shm"
        if command -v sqlite3 &> /dev/null; then
          sqlite3 "$DB_PATH" < "$SQL_DUMP_PATH"
        else
          python3 -c "
import sqlite3
conn = sqlite3.connect('$DB_PATH')
with open('$SQL_DUMP_PATH', 'r', encoding='utf-8') as f:
    conn.executescript(f.read())
conn.close()
"
        fi
        REBUILT_SIZE=$(du -sh "$DB_PATH" | cut -f1)
        echo "   [OK] Base reconstruida com sucesso: $REBUILT_SIZE"
        exit 0
      else
        echo "[ERRO] Nem '$ARCHIVE_NAME' nem '$SQL_DUMP_NAME' foram encontrados em: $PROJECT_ROOT"
        exit 1
      fi
    fi

    ARCH_SIZE=$(du -sh "$ARCHIVE_PATH" | cut -f1)
    echo "   [DB] Tamanho do arquivo compactado: $ARCH_SIZE"

    # Remove o banco anterior e arquivos temporarios para evitar inconsistencias
    rm -f "$DB_PATH" "$DB_PATH-wal" "$DB_PATH-shm"

    echo "   [>] Descomprimindo e recriando tabelas, indices e embeddings vetoriais..."
    if command -v sqlite3 &> /dev/null; then
      decompress_xz_to_stream "$ARCHIVE_PATH" | sqlite3 "$DB_PATH"
    else
      echo "   [!] sqlite3 CLI nao encontrado. Restaurando via runtime Python..."
      python3 -c "
import sqlite3, lzma
conn = sqlite3.connect('$DB_PATH')
with lzma.open('$ARCHIVE_PATH', 'rt', encoding='utf-8') as f:
    conn.executescript(f.read())
conn.close()
"
    fi

    REBUILT_SIZE=$(du -sh "$DB_PATH" | cut -f1)
    echo "   [OK] Reconstrucao concluida com sucesso!"
    echo "   [OK] Resumo da restauracao: $ARCH_SIZE -> $REBUILT_SIZE"
    ;;

  dump)
    echo "[>] Gerando dump puro SQL ($SQL_DUMP_NAME) a partir de $DB_NAME..."
    if [ ! -f "$DB_PATH" ]; then
      echo "[ERRO] Banco de dados '$DB_NAME' nao encontrado em: $DB_PATH"
      exit 1
    fi
    if command -v sqlite3 &> /dev/null; then
      sqlite3 "$DB_PATH" .dump | filter_dump_stream > "$SQL_DUMP_PATH"
    else
      python3 -c "
import sqlite3, re
conn = sqlite3.connect('$DB_PATH')
with open('$SQL_DUMP_PATH', 'w', encoding='utf-8') as f:
    for line in conn.iterdump():
        if not re.search(r'(user_model_configs|app_settings)', line, re.IGNORECASE):
            f.write(f'{line}\n')
conn.close()
"
    fi
    DUMP_SIZE=$(du -sh "$SQL_DUMP_PATH" | cut -f1)
    echo "   [OK] Dump gerado com sucesso: $SQL_DUMP_NAME ($DUMP_SIZE)"
    ;;

  *)
    echo "Uso: $0 {serialize|deserialize|dump}"
    echo "  serialize   (ou cp) -> Extrai $DB_NAME e comprime em $ARCHIVE_NAME"
    echo "  deserialize (ou dc) -> Descompacta $ARCHIVE_NAME e reconstroi $DB_NAME"
    echo "  dump                -> Gera dump puro em texto ($SQL_DUMP_NAME) sem compressao"
    exit 1
    ;;
esac
