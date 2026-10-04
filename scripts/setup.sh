#!/usr/bin/env bash
# ==============================================================================
# CineData Analytics -- Script de Orquestracao, Setup Inteligente e Execucao (setup.sh)
# Totalmente baseado em old-scripts/setup.sh, calibrado para a arquitetura CineData
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

DB_NAME="cinerocket.db"
DB_PATH="$PROJECT_ROOT/$DB_NAME"
ARCHIVE_NAME="database.sql.xz"
ARCHIVE_PATH="$PROJECT_ROOT/$ARCHIVE_NAME"
SQL_DUMP_NAME="database_dump.sql"
SQL_DUMP_PATH="$PROJECT_ROOT/$SQL_DUMP_NAME"

# Cores padrao ANSI para formatacao no terminal (sem emojis/icones)
C_RESET="\033[0m"
C_BOLD="\033[1m"
C_CYAN="\033[36m"
C_GREEN="\033[32m"
C_YELLOW="\033[33m"
C_RED="\033[31m"
C_GRAY="\033[90m"

echo -e "\n${C_BOLD}${C_CYAN}[CineData] Iniciando orquestrador do sistema...${C_RESET}\n"

# ------------------------------------------------------------------------------
# 1. Verificacao de Ferramentas / Pre-requisitos & Deteccao de Fallbacks
# ------------------------------------------------------------------------------
echo -e "${C_CYAN}[>] Verificando ferramentas instaladas e selecionando runtimes...${C_RESET}"

# Deteccao Backend: uv (preferencial) ou python3 + venv/pip (fallback)
BACKEND_RUNNER=""
if command -v uv &> /dev/null; then
  BACKEND_RUNNER="uv"
  echo -e "${C_GREEN}   [OK] Backend runtime: 'uv' detectado (modo de alta performance).${C_RESET}"
elif command -v python3 &> /dev/null; then
  if python3 -m venv --help &> /dev/null; then
    BACKEND_RUNNER="pip"
    echo -e "${C_YELLOW}   [!]  'uv' nao encontrado. Usando fallback do Backend: 'python3 -m venv' e 'pip'.${C_RESET}"
  else
    echo -e "${C_RED}[ERRO] Nem 'uv' nem o pacote 'python3-venv' foram encontrados.${C_RESET}"
    echo -e "${C_RED}   Instale o uv (https://docs.astral.sh/uv/) ou o pacote venv (ex: sudo apt install python3-venv).${C_RESET}"
    exit 1
  fi
else
  echo -e "${C_RED}[ERRO] Nenhum runtime Python ou 'uv' foi encontrado no sistema.${C_RESET}"
  exit 1
fi

# Deteccao Frontend: bun (preferencial) ou npm + node (fallback)
FRONTEND_RUNNER=""
if command -v bun &> /dev/null; then
  FRONTEND_RUNNER="bun"
  echo -e "${C_GREEN}   [OK] Frontend runtime: 'bun' detectado (modo de alta performance).${C_RESET}"
elif command -v npm &> /dev/null && command -v node &> /dev/null; then
  FRONTEND_RUNNER="npm"
  echo -e "${C_YELLOW}   [!]  'bun' nao encontrado. Usando fallback do Frontend: 'npm' e 'node'.${C_RESET}"
else
  echo -e "${C_RED}[ERRO] Nem 'bun' nem 'npm' foram encontrados no sistema.${C_RESET}"
  echo -e "${C_RED}   Instale o Bun (https://bun.sh/) ou o Node.js / npm (https://nodejs.org/).${C_RESET}"
  exit 1
fi

# ------------------------------------------------------------------------------
# 2. Configuracao de Variaveis de Ambiente
# ------------------------------------------------------------------------------
BACKEND_ENV="$BACKEND_DIR/.env"
BACKEND_ENV_EXAMPLE="$BACKEND_DIR/.env.example"
ROOT_ENV="$PROJECT_ROOT/.env"
ROOT_ENV_EXAMPLE="$PROJECT_ROOT/.env.example"

if [ ! -f "$BACKEND_ENV" ]; then
  echo -e "\n${C_YELLOW}[>] Arquivo .env ausente no backend. Configurando variaveis de ambiente...${C_RESET}"
  if [ -f "$ROOT_ENV" ]; then
    cp "$ROOT_ENV" "$BACKEND_ENV"
    echo -e "${C_GREEN}   [OK] $BACKEND_ENV configurado a partir de $ROOT_ENV.${C_RESET}"
  elif [ -f "$BACKEND_ENV_EXAMPLE" ]; then
    cp "$BACKEND_ENV_EXAMPLE" "$BACKEND_ENV"
    echo -e "${C_GREEN}   [OK] $BACKEND_ENV configurado a partir de .env.example.${C_RESET}"
  elif [ -f "$ROOT_ENV_EXAMPLE" ]; then
    cp "$ROOT_ENV_EXAMPLE" "$BACKEND_ENV"
    echo -e "${C_GREEN}   [OK] $BACKEND_ENV configurado a partir de .env.example da raiz.${C_RESET}"
  else
    cat <<EOF > "$BACKEND_ENV"
ENVIRONMENT=development
DEBUG=true
PORT=8000
HOST=0.0.0.0
LOG_LEVEL=INFO
LLM_PROVIDER=local
LLM_MODEL=Qwen3.5-4B-Q4_K_M
LLM_BASE_URL=http://localhost:1234
LLM_TIMEOUT_SECONDS=30
EMBEDDING_MODEL_NAME=sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
EOF
    echo -e "${C_GREEN}   [OK] $BACKEND_ENV gerado com configuracoes padrao.${C_RESET}"
  fi
fi

# ------------------------------------------------------------------------------
# 3. Sincronizacao de Dependencias
# ------------------------------------------------------------------------------
VENV_DIR="$BACKEND_DIR/.venv"
VENV_PYTHON="$VENV_DIR/bin/python"
VENV_UVICORN="$VENV_DIR/bin/uvicorn"

if [ "$BACKEND_RUNNER" = "uv" ]; then
  echo -e "\n${C_CYAN}[PKG] Sincronizando dependencias do Backend (uv sync)...${C_RESET}"
  (cd "$BACKEND_DIR" && uv sync --all-extras)
  if ! (cd "$BACKEND_DIR" && uv run python -c "import uvicorn" 2>/dev/null); then
    echo -e "${C_RED}[ERRO] Pre-requisito ausente: 'uvicorn' nao encontrado apos uv sync.${C_RESET}"
    echo -e "${C_RED}   Verifique as dependencias do pyproject.toml.${C_RESET}"
    exit 1
  fi
  echo -e "${C_GREEN}   [OK] uvicorn disponivel no ambiente uv.${C_RESET}"
else
  echo -e "\n${C_CYAN}[PKG] Preparando ambiente virtual do Backend (venv + pip)...${C_RESET}"
  if [ ! -d "$VENV_DIR" ]; then
    echo -e "   Criando ambiente virtual em $VENV_DIR..."
    python3 -m venv "$VENV_DIR"
  fi
  echo -e "   Instalando/atualizando dependencias com pip..."
  (cd "$BACKEND_DIR" && "$VENV_DIR/bin/pip" install --upgrade pip && "$VENV_DIR/bin/pip" install -e ".[dev]")
  if [ ! -x "$VENV_UVICORN" ]; then
    echo -e "${C_RED}[ERRO] Pre-requisito ausente: 'uvicorn' nao encontrado em $VENV_UVICORN apos pip install.${C_RESET}"
    exit 1
  fi
  echo -e "${C_GREEN}   [OK] uvicorn disponivel no venv.${C_RESET}"
fi

install_frontend_deps() {
  if [ "$FRONTEND_RUNNER" = "bun" ]; then
    (cd "$FRONTEND_DIR" && bun install)
  else
    (cd "$FRONTEND_DIR" && npm install)
  fi
}

VITE_BIN="$FRONTEND_DIR/node_modules/.bin/vite"

if [ "$FRONTEND_RUNNER" = "bun" ]; then
  echo -e "\n${C_CYAN}[PKG] Verificando dependencias do Frontend (bun install)...${C_RESET}"
  if [ ! -d "$FRONTEND_DIR/node_modules" ] || [ ! -f "$VITE_BIN" ]; then
    if [ -d "$FRONTEND_DIR/node_modules" ]; then
      echo -e "${C_YELLOW}   [!]  node_modules existe mas 'vite' nao encontrado em .bin/. Reinstalando...${C_RESET}"
    fi
    install_frontend_deps
  else
    echo -e "${C_GREEN}   [OK] node_modules e vite presentes no frontend.${C_RESET}"
  fi
else
  echo -e "\n${C_CYAN}[PKG] Verificando dependencias do Frontend (npm install)...${C_RESET}"
  if [ ! -d "$FRONTEND_DIR/node_modules" ] || [ ! -f "$VITE_BIN" ]; then
    if [ -d "$FRONTEND_DIR/node_modules" ]; then
      echo -e "${C_YELLOW}   [!]  node_modules existe mas 'vite' nao encontrado em .bin/. Reinstalando...${C_RESET}"
    fi
    install_frontend_deps
  else
    echo -e "${C_GREEN}   [OK] node_modules e vite presentes no frontend.${C_RESET}"
  fi
fi

if [ ! -f "$VITE_BIN" ]; then
  echo -e "${C_RED}[ERRO] Pre-requisito ausente: 'vite' nao encontrado em node_modules/.bin/ apos install.${C_RESET}"
  echo -e "${C_RED}   Tente manualmente: cd frontend && bun install (ou npm install)${C_RESET}"
  exit 1
fi

# ------------------------------------------------------------------------------
# 4. Deteccao de Estado do Banco de Dados & Restauracao Automatica de Dump
# ------------------------------------------------------------------------------
echo -e "\n${C_CYAN}[DB] Analisando estado da base de dados ($DB_PATH)...${C_RESET}"

# Define o comando Python a ser utilizado para inspecao e comandos auxiliares
PY_INSPECT="python3"
if [ "$BACKEND_RUNNER" = "uv" ]; then
  PY_INSPECT="uv run --directory $BACKEND_DIR python"
elif [ -x "$VENV_PYTHON" ]; then
  PY_INSPECT="$VENV_PYTHON"
fi

restore_database_from_dump() {
  if [ -f "$ARCHIVE_PATH" ]; then
    echo -e "${C_YELLOW}[!]  Banco nao encontrado. Restaurando a partir de $ARCHIVE_NAME...${C_RESET}"
    rm -f "$DB_PATH" "$DB_PATH-wal" "$DB_PATH-shm"
    if command -v xz &> /dev/null && command -v sqlite3 &> /dev/null; then
      xz -dc "$ARCHIVE_PATH" | sqlite3 "$DB_PATH"
    else
      $PY_INSPECT -c "
import sqlite3, lzma
conn = sqlite3.connect('$DB_PATH')
with lzma.open('$ARCHIVE_PATH', 'rt', encoding='utf-8') as f:
    conn.executescript(f.read())
conn.close()
"
    fi
    REST_SIZE=$(du -sh "$DB_PATH" | cut -f1)
    echo -e "${C_GREEN}   [OK] Banco de dados restaurado com sucesso ($REST_SIZE).${C_RESET}"
  elif [ -f "$SQL_DUMP_PATH" ]; then
    echo -e "${C_YELLOW}[!]  Banco nao encontrado. Restaurando a partir de $SQL_DUMP_NAME...${C_RESET}"
    rm -f "$DB_PATH" "$DB_PATH-wal" "$DB_PATH-shm"
    if command -v sqlite3 &> /dev/null; then
      sqlite3 "$DB_PATH" < "$SQL_DUMP_PATH"
    else
      $PY_INSPECT -c "
import sqlite3
conn = sqlite3.connect('$DB_PATH')
with open('$SQL_DUMP_PATH', 'r', encoding='utf-8') as f:
    conn.executescript(f.read())
conn.close()
"
    fi
    REST_SIZE=$(du -sh "$DB_PATH" | cut -f1)
    echo -e "${C_GREEN}   [OK] Banco de dados restaurado com sucesso ($REST_SIZE).${C_RESET}"
  else
    echo -e "${C_RED}[ERRO] Banco $DB_NAME nao encontrado e nenhum dump ($ARCHIVE_NAME ou $SQL_DUMP_NAME) disponivel.${C_RESET}"
    echo -e "${C_RED}   Execute o script de sincronizacao (scripts/db_sync.sh) ou providencie $ARCHIVE_NAME.${C_RESET}"
    exit 1
  fi
}

if [ ! -f "$DB_PATH" ] || [ ! -s "$DB_PATH" ]; then
  restore_database_from_dump
fi

# ------------------------------------------------------------------------------
# 5. Deteccao de Embeddings & Contexto GenAI
# ------------------------------------------------------------------------------
echo -e "${C_CYAN}[DB] Verificando integridade das tabelas e embeddings vetoriais...${C_RESET}"

DB_CHECK_OUTPUT=$($PY_INSPECT -c "
import sqlite3
conn = sqlite3.connect('$DB_PATH')
cur = conn.cursor()
tables = {r[0] for r in cur.execute(\"SELECT name FROM sqlite_master WHERE type in ('table','view')\").fetchall()}

movies_count = 0
if 'dim_movies' in tables:
    movies_count = cur.execute('SELECT COUNT(*) FROM dim_movies').fetchone()[0]

genai_count = 0
if 'fact_movies_performance' in tables:
    cols = {r[1] for r in cur.execute('PRAGMA table_info(fact_movies_performance)').fetchall()}
    if 'genai_context' in cols:
        genai_count = cur.execute(\"SELECT COUNT(*) FROM fact_movies_performance WHERE genai_context IS NOT NULL AND length(genai_context) > 0\").fetchone()[0]

vec_count = 0
if 'vec_movies' in tables:
    try:
        import sqlite_vec
        conn.enable_load_extension(True)
        sqlite_vec.load(conn)
        conn.enable_load_extension(False)
        vec_count = cur.execute('SELECT COUNT(*) FROM vec_movies').fetchone()[0]
    except Exception:
        pass

conn.close()
print(f'{movies_count}|{genai_count}|{vec_count}')
" 2>/dev/null || echo "0|0|0")

IFS='|' read -r MOVIES_COUNT GENAI_COUNT VEC_COUNT <<< "$DB_CHECK_OUTPUT"
MOVIES_COUNT="${MOVIES_COUNT:-0}"
GENAI_COUNT="${GENAI_COUNT:-0}"
VEC_COUNT="${VEC_COUNT:-0}"

if [ "$MOVIES_COUNT" -eq "0" ]; then
  echo -e "${C_YELLOW}[!]  Banco de dados detectado mas com dim_movies vazio. Tentando restaurar a partir do dump...${C_RESET}"
  restore_database_from_dump
fi

if [ "$VEC_COUNT" -gt "0" ] && [ "$GENAI_COUNT" -ge "$MOVIES_COUNT" ]; then
  echo -e "${C_GREEN}   [OK] Catalogo analitico e embeddings vetoriais ja inicializados (${MOVIES_COUNT} filmes).${C_RESET}"
  echo -e "${C_GREEN}   [OK] Indice vetorial vec_movies integro (${VEC_COUNT} registros). Pulando geracao.${C_RESET}"
else
  echo -e "${C_YELLOW}[!]  Contexto GenAI ou embeddings incompletos (GenAI: $GENAI_COUNT/$MOVIES_COUNT, Vec: $VEC_COUNT/$MOVIES_COUNT).${C_RESET}"
  echo -e "${C_CYAN}[>]  Executando geracao acelerada de contexto e embeddings (generate_genai_context.py)...${C_RESET}"
  
  if [ "$BACKEND_RUNNER" = "uv" ]; then
    (cd "$BACKEND_DIR" && uv run python scripts/generate_genai_context.py)
  else
    (cd "$BACKEND_DIR" && "$VENV_PYTHON" scripts/generate_genai_context.py)
  fi
  echo -e "${C_GREEN}   [OK] Contexto semantico e tabela vec_movies gerados com sucesso!${C_RESET}"
fi

# ------------------------------------------------------------------------------
# 6. Execucao Conjunta: Backend FastAPI + Frontend Vite com Encerramento Limpo
# ------------------------------------------------------------------------------
echo -e "\n${C_BOLD}${C_GREEN}[RUN] Tudo pronto! Iniciando servidores...${C_RESET}"
echo -e "   * Backend FastAPI: ${C_BOLD}http://0.0.0.0:8000${C_RESET} (Docs: http://localhost:8000/docs)"
echo -e "   * Frontend React:  ${C_BOLD}http://0.0.0.0:5173${C_RESET} (Local: http://localhost:5173)"
echo -e "   * Pressione ${C_BOLD}Ctrl+C${C_RESET} para encerrar ambos os servicos.\n"

BACKEND_PID=""
FRONTEND_PID=""

kill_tree() {
  local parent_pid=$1
  if [ -n "$parent_pid" ] && kill -0 "$parent_pid" 2>/dev/null; then
    local children
    children=$(pgrep -P "$parent_pid" 2>/dev/null || true)
    for child in $children; do
      kill_tree "$child"
    done
    kill -TERM "$parent_pid" 2>/dev/null || true
  fi
}

cleanup() {
  trap - SIGINT SIGTERM EXIT
  echo -e "\n${C_YELLOW}[STOP] Encerrando servidores e liberando portas...${C_RESET}"

  if [ -n "$BACKEND_PID" ]; then
    kill_tree "$BACKEND_PID"
  fi

  if [ -n "$FRONTEND_PID" ]; then
    kill_tree "$FRONTEND_PID"
  fi

  sleep 0.5

  if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    kill -KILL "$BACKEND_PID" 2>/dev/null || true
  fi
  if [ -n "$FRONTEND_PID" ] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
    kill -KILL "$FRONTEND_PID" 2>/dev/null || true
  fi

  kill 0 2>/dev/null || true

  echo -e "${C_GREEN}   [OK] Todos os servidores foram encerrados com sucesso.${C_RESET}"
  exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# Inicia backend em background
if [ "$BACKEND_RUNNER" = "uv" ]; then
  (cd "$BACKEND_DIR" && exec uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000) &
  BACKEND_PID=$!
else
  (cd "$BACKEND_DIR" && exec "$VENV_UVICORN" main:app --reload --host 0.0.0.0 --port 8000) &
  BACKEND_PID=$!
fi

# Inicia frontend em background
if [ "$FRONTEND_RUNNER" = "bun" ]; then
  (cd "$FRONTEND_DIR" && exec bun run dev -- --host 0.0.0.0) &
  FRONTEND_PID=$!
else
  (cd "$FRONTEND_DIR" && exec npm run dev -- --host 0.0.0.0) &
  FRONTEND_PID=$!
fi

# Monitoramento de processos
while true; do
  if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    echo -e "${C_RED}[ERRO] Processo do Backend encerrou inesperadamente.${C_RESET}"
    break
  fi
  if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
    echo -e "${C_RED}[ERRO] Processo do Frontend encerrou inesperadamente.${C_RESET}"
    break
  fi
  sleep 1
done

cleanup
