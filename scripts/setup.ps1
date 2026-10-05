# ==============================================================================
# CineData Analytics -- Script de Orquestracao, Setup Inteligente e Execucao (setup.ps1)
# Compativel com Windows PowerShell 5.1+ e PowerShell Core (pwsh)
# Totalmente baseado em old-scripts/setup.ps1, calibrado para a arquitetura CineData
# ==============================================================================

[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$BackendDir = Join-Path $ProjectRoot "backend"
$FrontendDir = Join-Path $ProjectRoot "frontend"

$DbName = "cinerocket.db"
$DbPath = Join-Path $ProjectRoot $DbName
$ArchiveName = "database.sql.xz"
$ArchivePath = Join-Path $ProjectRoot $ArchiveName
$SqlDumpName = "database_dump.sql"
$SqlDumpPath = Join-Path $ProjectRoot $SqlDumpName

Write-Host "`n[CineData] Iniciando orquestrador do sistema no Windows...`n" -ForegroundColor Cyan

# ------------------------------------------------------------------------------
# 1. Verificacao de Ferramentas / Pre-requisitos & Deteccao de Fallbacks
# ------------------------------------------------------------------------------
Write-Host "[>] Verificando ferramentas instaladas e selecionando runtimes..." -ForegroundColor Cyan

function Test-CommandAvailable {
    param([string]$CommandName)
    return [bool](Get-Command $CommandName -ErrorAction SilentlyContinue)
}

$PythonCmd = $null
if (Test-CommandAvailable "python") {
    $PythonCmd = "python"
} elseif (Test-CommandAvailable "python3") {
    $PythonCmd = "python3"
} elseif (Test-CommandAvailable "py") {
    $PythonCmd = "py"
}

# Deteccao Backend: uv (preferencial) ou python venv/pip (fallback)
$BackendRunner = ""
if (Test-CommandAvailable "uv") {
    $BackendRunner = "uv"
    Write-Host "   [OK] Backend runtime: 'uv' detectado (modo de alta performance)." -ForegroundColor Green
} elseif ($null -ne $PythonCmd) {
    $BackendRunner = "pip"
    Write-Host "   [!]  'uv' nao encontrado. Usando fallback do Backend: '$PythonCmd -m venv' e 'pip'." -ForegroundColor Yellow
} else {
    Write-Host "[ERRO] Nem 'uv' nem 'python' foram encontrados no sistema." -ForegroundColor Red
    Write-Host "   Instale uv (https://docs.astral.sh/uv/) ou Python 3.11+ e adicione ao PATH." -ForegroundColor Red
    exit 1
}

# Deteccao Frontend: bun (preferencial) ou npm (fallback)
$FrontendRunner = ""
if (Test-CommandAvailable "bun") {
    $FrontendRunner = "bun"
    Write-Host "   [OK] Frontend runtime: 'bun' detectado (modo de alta performance)." -ForegroundColor Green
} elseif (Test-CommandAvailable "npm") {
    $FrontendRunner = "npm"
    Write-Host "   [!]  'bun' nao encontrado. Usando fallback do Frontend: 'npm' e 'node'." -ForegroundColor Yellow
} else {
    Write-Host "[ERRO] Nem 'bun' nem 'npm' foram encontrados no sistema." -ForegroundColor Red
    Write-Host "   Instale o Bun (https://bun.sh/) ou o Node.js / npm (https://nodejs.org/)." -ForegroundColor Red
    exit 1
}

# ------------------------------------------------------------------------------
# 2. Configuracao de Variaveis de Ambiente
# ------------------------------------------------------------------------------
$BackendEnv = Join-Path $BackendDir ".env"
$BackendEnvExample = Join-Path $BackendDir ".env.example"
$RootEnv = Join-Path $ProjectRoot ".env"
$RootEnvExample = Join-Path $ProjectRoot ".env.example"

if (-not (Test-Path $BackendEnv)) {
    Write-Host "`n[>] Arquivo .env ausente no backend. Configurando variaveis de ambiente..." -ForegroundColor Yellow
    if (Test-Path $RootEnv) {
        Copy-Item -Path $RootEnv -Destination $BackendEnv
        Write-Host "   [OK] $BackendEnv configurado a partir de $RootEnv." -ForegroundColor Green
    } elseif (Test-Path $BackendEnvExample) {
        Copy-Item -Path $BackendEnvExample -Destination $BackendEnv
        Write-Host "   [OK] $BackendEnv configurado a partir de .env.example." -ForegroundColor Green
    } elseif (Test-Path $RootEnvExample) {
        Copy-Item -Path $RootEnvExample -Destination $BackendEnv
        Write-Host "   [OK] $BackendEnv configurado a partir de .env.example da raiz." -ForegroundColor Green
    } else {
        @"
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
"@ | Set-Content -Path $BackendEnv -Encoding UTF8
        Write-Host "   [OK] $BackendEnv gerado com configuracoes padrao." -ForegroundColor Green
    }
}

# ------------------------------------------------------------------------------
# 3. Sincronizacao de Dependencias
# ------------------------------------------------------------------------------
$VenvDir = Join-Path $BackendDir ".venv"
$VenvScripts = Join-Path $VenvDir "Scripts"
$VenvPython = Join-Path $VenvScripts "python.exe"
$VenvUvicorn = Join-Path $VenvScripts "uvicorn.exe"

# Suporte caso o ambiente seja criado com padrao POSIX bin/
if (-not (Test-Path $VenvPython)) {
    $VenvScripts = Join-Path $VenvDir "bin"
    $VenvPython = Join-Path $VenvScripts "python.exe"
    if (-not (Test-Path $VenvPython)) { $VenvPython = Join-Path $VenvScripts "python" }
    $VenvUvicorn = Join-Path $VenvScripts "uvicorn.exe"
    if (-not (Test-Path $VenvUvicorn)) { $VenvUvicorn = Join-Path $VenvScripts "uvicorn" }
}

if ($BackendRunner -eq "uv") {
    Write-Host "`n[PKG] Sincronizando dependencias do Backend (uv sync)..." -ForegroundColor Cyan
    Push-Location $BackendDir
    try {
        & uv sync --all-extras
        if ($LASTEXITCODE -ne 0) { throw "Falha ao executar uv sync" }
    } finally {
        Pop-Location
    }
    
    $prevEAP = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    Push-Location $BackendDir
    & uv run python -c "import uvicorn" 2>&1 | Out-Null
    $uvicornOk = ($LASTEXITCODE -eq 0)
    Pop-Location
    $ErrorActionPreference = $prevEAP

    if (-not $uvicornOk) {
        Write-Host "[ERRO] Pre-requisito ausente: 'uvicorn' nao encontrado apos uv sync." -ForegroundColor Red
        Write-Host "   Verifique se uvicorn esta listado nas dependencias do pyproject.toml." -ForegroundColor Red
        exit 1
    }
    Write-Host "   [OK] uvicorn disponivel no ambiente uv." -ForegroundColor Green
} else {
    Write-Host "`n[PKG] Preparando ambiente virtual do Backend (venv + pip)..." -ForegroundColor Cyan
    if (-not (Test-Path $VenvDir)) {
        Write-Host "   Criando ambiente virtual em $VenvDir..."
        & $PythonCmd -m venv $VenvDir
    }
    Write-Host "   Instalando/atualizando dependencias com pip..."
    Push-Location $BackendDir
    try {
        & $VenvPython -m pip install --upgrade pip
        & $VenvPython -m pip install -e ".[dev]"
        if ($LASTEXITCODE -ne 0) { throw "Falha na instalacao de dependencias do backend com pip" }
    } finally {
        Pop-Location
    }
    if (-not (Test-Path $VenvUvicorn)) {
        Write-Host "[ERRO] Pre-requisito ausente: 'uvicorn' nao encontrado em $VenvUvicorn apos pip install." -ForegroundColor Red
        exit 1
    }
    Write-Host "   [OK] uvicorn disponivel no venv." -ForegroundColor Green
}

# Binarios criticos do frontend
$NodeModulesDir = Join-Path $FrontendDir "node_modules"
$ViteBinDir     = Join-Path (Join-Path $FrontendDir "node_modules") ".bin"
$ViteBin        = Join-Path $ViteBinDir "vite"
$ViteBinCmd     = Join-Path $ViteBinDir "vite.cmd"
$VitePkgDir     = Join-Path (Join-Path $FrontendDir "node_modules") "vite"
$VitePresent    = (Test-Path $ViteBin) -or (Test-Path $ViteBinCmd) -or (Test-Path $VitePkgDir)

function Install-FrontendDeps {
    param([string]$runner)
    Push-Location $FrontendDir
    try {
        if ($runner -eq "bun") {
            & bun install
        } else {
            & npm install --legacy-peer-deps
        }
        if ($LASTEXITCODE -ne 0) { throw "Falha ao instalar dependencias do frontend com $runner" }
    } finally {
        Pop-Location
    }
}

if ($FrontendRunner -eq "bun") {
    Write-Host "`n[PKG] Verificando dependencias do Frontend (bun install)..." -ForegroundColor Cyan
    if (-not (Test-Path $NodeModulesDir) -or -not $VitePresent) {
        if (Test-Path $NodeModulesDir) {
            Write-Host "   [!]  node_modules existe mas 'vite' nao encontrado em .bin/. Reinstalando..." -ForegroundColor Yellow
        }
        Install-FrontendDeps "bun"
    } else {
        Write-Host "   [OK] node_modules e vite presentes no frontend." -ForegroundColor Green
    }
} else {
    Write-Host "`n[PKG] Verificando dependencias do Frontend (npm install)..." -ForegroundColor Cyan
    if (-not (Test-Path $NodeModulesDir) -or -not $VitePresent) {
        if (Test-Path $NodeModulesDir) {
            Write-Host "   [!]  node_modules existe mas 'vite' nao encontrado em .bin/. Reinstalando..." -ForegroundColor Yellow
        }
        Install-FrontendDeps "npm"
    } else {
        Write-Host "   [OK] node_modules e vite presentes no frontend." -ForegroundColor Green
    }
}

$VitePresent = (Test-Path $ViteBin) -or (Test-Path $ViteBinCmd) -or (Test-Path $VitePkgDir)
if (-not $VitePresent) {
    Write-Host "[ERRO] Pre-requisito ausente: 'vite' nao encontrado em node_modules/ apos install." -ForegroundColor Red
    Write-Host "   Tente manualmente: cd frontend && bun install (ou npm install)" -ForegroundColor Red
    exit 1
}

# ------------------------------------------------------------------------------
# 4. Deteccao de Estado do Banco de Dados & Restauracao Automatica de Dump
# ------------------------------------------------------------------------------
Write-Host "`n[DB] Analisando estado da base de dados ($DbPath)..." -ForegroundColor Cyan

$EffectivePy = if (Test-Path $VenvPython) { $VenvPython } else { $PythonCmd }

function Restore-DatabaseFromDump {
    if (-not (Test-Path $ArchivePath)) {
        $parts = Get-ChildItem -Path "$ArchivePath.part-*" -ErrorAction SilentlyContinue
        if ($parts.Count -gt 0) {
            Write-Host "   [>] Recombinando partes de $ArchiveName..." -ForegroundColor Cyan
            $CombineScript = @"
import sys, glob, time
parts = sorted(glob.glob(r'$ArchivePath.part-*'))
total_parts = len(parts)
print(f'   [+] Recombinando {total_parts} partes do arquivo compactado...')
with open(r'$ArchivePath', 'wb') as outfile:
    for idx, p in enumerate(parts, 1):
        print(f'       -> Processando parte {idx}/{total_parts}: {p}', flush=True)
        with open(p, 'rb') as infile:
            while True:
                chunk = infile.read(8 * 1024 * 1024)
                if not chunk:
                    break
                outfile.write(chunk)
print('   [OK] Partes recombinadas com sucesso!', flush=True)
"@
            if ($BackendRunner -eq "uv") {
                Push-Location $BackendDir
                try { & uv run --no-project python -c $CombineScript } finally { Pop-Location }
            } else {
                & $EffectivePy -c $CombineScript
            }
        }
    }

    if (Test-Path $ArchivePath) {
        Write-Host "   [!]  Banco nao encontrado. Restaurando a partir de $ArchiveName..." -ForegroundColor Yellow
        Remove-Item -Path $DbPath -Force -ErrorAction SilentlyContinue
        Remove-Item -Path "$DbPath-wal" -Force -ErrorAction SilentlyContinue
        Remove-Item -Path "$DbPath-shm" -Force -ErrorAction SilentlyContinue

        $RestoreScript = @"
import sqlite3, lzma, time

db_file = r'$DbPath'
xz_file = r'$ArchivePath'

print('   [1/3] Descomprimindo arquivo XZ na memoria...', flush=True)
t_start = time.time()
with lzma.open(xz_file, 'rt', encoding='utf-8', errors='replace') as f:
    sql_script = f.read()
t_decomp = time.time() - t_start
decomp_mb = len(sql_script.encode('utf-8')) / (1024 * 1024)
print(f'   [2/3] Descompressao concluida em {t_decomp:.1f}s ({decomp_mb:.1f} MB de SQL).', flush=True)

print('   [3/3] Executando script SQL no SQLite (otimizando I/O)...', flush=True)
t_sql = time.time()
conn = sqlite3.connect(db_file)
conn.create_function('unistr', 1, lambda s: s)
conn.execute('PRAGMA synchronous=OFF')
conn.execute('PRAGMA journal_mode=MEMORY')
conn.executescript(sql_script)
conn.commit()
conn.close()
t_exec = time.time() - t_sql
print(f'   [OK] Execucao concluida com sucesso em {t_exec:.1f}s!', flush=True)
"@
        if ($BackendRunner -eq "uv") {
            Push-Location $BackendDir
            try { & uv run --no-project python -c $RestoreScript } finally { Pop-Location }
        } else {
            & $EffectivePy -c $RestoreScript
        }
        $RestSizeMB = [math]::Round(((Get-Item $DbPath).Length / 1MB), 2)
        Write-Host "   [OK] Banco de dados restaurado com sucesso ($RestSizeMB MB)." -ForegroundColor Green
    } elseif (Test-Path $SqlDumpPath) {
        Write-Host "   [!]  Banco nao encontrado. Restaurando a partir de $SqlDumpName..." -ForegroundColor Yellow
        Remove-Item -Path $DbPath -Force -ErrorAction SilentlyContinue
        Remove-Item -Path "$DbPath-wal" -Force -ErrorAction SilentlyContinue
        Remove-Item -Path "$DbPath-shm" -Force -ErrorAction SilentlyContinue

        $RestoreDumpScript = @"
import sqlite3, time
db_file = r'$DbPath'
sql_file = r'$SqlDumpPath'
print('   [1/2] Lendo dump SQL...', flush=True)
t_start = time.time()
with open(sql_file, 'r', encoding='utf-8', errors='replace') as f:
    sql = f.read()
print(f'   [2/2] Executando SQL no SQLite...', flush=True)
conn = sqlite3.connect(db_file)
conn.create_function('unistr', 1, lambda s: s)
conn.execute('PRAGMA synchronous=OFF')
conn.execute('PRAGMA journal_mode=MEMORY')
conn.executescript(sql)
conn.commit()
conn.close()
print(f'   [OK] Restauracao concluida em {time.time()-t_start:.1f}s!', flush=True)
"@
        if ($BackendRunner -eq "uv") {
            Push-Location $BackendDir
            try { & uv run --no-project python -c $RestoreDumpScript } finally { Pop-Location }
        } else {
            & $EffectivePy -c $RestoreDumpScript
        }
        $RestSizeMB = [math]::Round(((Get-Item $DbPath).Length / 1MB), 2)
        Write-Host "   [OK] Banco de dados restaurado com sucesso ($RestSizeMB MB)." -ForegroundColor Green
    } else {
        Write-Host "[ERRO] Banco $DbName nao encontrado e nenhum dump ($ArchiveName ou $SqlDumpName) disponivel." -ForegroundColor Red
        Write-Host "   Execute scripts/db_sync.ps1 ou posicione $ArchiveName na raiz do projeto." -ForegroundColor Red
        exit 1
    }
}

if ((-not (Test-Path $DbPath)) -or ((Get-Item $DbPath).Length -eq 0)) {
    Restore-DatabaseFromDump
}

# ------------------------------------------------------------------------------
# 5. Deteccao de Embeddings & Contexto GenAI
# ------------------------------------------------------------------------------
Write-Host "[DB] Verificando integridade das tabelas e embeddings vetoriais..." -ForegroundColor Cyan

$InspectScript = @"
import sqlite3
conn = sqlite3.connect(r'$DbPath')
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
"@

$DbStatusRaw = $null
if ($BackendRunner -eq "uv") {
    Push-Location $BackendDir
    try {
        $DbStatusRaw = (& uv run --no-project python -c $InspectScript 2>`$null | Select-Object -Last 1)
    } finally {
        Pop-Location
    }
} else {
    $DbStatusRaw = (& $EffectivePy -c $InspectScript 2>`$null | Select-Object -Last 1)
}

$Parts = if ($DbStatusRaw) { $DbStatusRaw.Trim().Split('|') } else { @() }
$MoviesCount = 0
$GenAiCount = 0
$VecCount = 0
if ($Parts.Length -ge 3) {
    [int]::TryParse($Parts[0], [ref]$MoviesCount) | Out-Null
    [int]::TryParse($Parts[1], [ref]$GenAiCount) | Out-Null
    [int]::TryParse($Parts[2], [ref]$VecCount) | Out-Null
}

if ($MoviesCount -eq 0) {
    Write-Host "   [!]  Banco detectado mas sem registros em dim_movies. Restaurando..." -ForegroundColor Yellow
    Restore-DatabaseFromDump
}

if ($VecCount -gt 0 -and $GenAiCount -ge $MoviesCount) {
    Write-Host "   [OK] Catalogo analitico e embeddings vetoriais ja inicializados ($MoviesCount filmes)." -ForegroundColor Green
    Write-Host "   [OK] Indice vetorial vec_movies integro ($VecCount registros). Pulando geracao." -ForegroundColor Green
} else {
    Write-Host "   [!]  Contexto GenAI ou embeddings incompletos (GenAI: $GenAiCount/$MoviesCount, Vec: $VecCount/$MoviesCount)." -ForegroundColor Yellow
    Write-Host "   [>]  Executando geracao acelerada de contexto e embeddings (generate_genai_context.py)..." -ForegroundColor Cyan
    Push-Location $BackendDir
    try {
        if ($BackendRunner -eq "uv") {
            & uv run --no-project python scripts/generate_genai_context.py
        } else {
            & $EffectivePy scripts/generate_genai_context.py
        }
        if ($LASTEXITCODE -ne 0) { throw "Falha ao gerar embeddings vetoriais" }
        Write-Host "   [OK] Contexto semantico e tabela vec_movies gerados com sucesso!" -ForegroundColor Green
    } finally {
        Pop-Location
    }
}

# ------------------------------------------------------------------------------
# 6. Execucao Conjunta: Backend FastAPI + Frontend Vite
# ------------------------------------------------------------------------------
Write-Host "`n[RUN] Tudo pronto! Iniciando servidores..." -ForegroundColor Green
Write-Host "   * Backend FastAPI: http://0.0.0.0:8000 (Docs: http://localhost:8000/docs)" -ForegroundColor Gray
Write-Host "   * Frontend React:  http://0.0.0.0:5173 (Local: http://localhost:5173)" -ForegroundColor Gray
Write-Host "   * Pressione Ctrl+C para encerrar ambos os servicos.`n" -ForegroundColor Yellow

$BackendJob = Start-Job -ScriptBlock {
    param($dir, $runner, $uvicornPath)
    Set-Location $dir
    if ($runner -eq "uv") {
        & uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000 2>&1
    } else {
        & $uvicornPath main:app --reload --host 0.0.0.0 --port 8000 2>&1
    }
} -ArgumentList $BackendDir, $BackendRunner, $VenvUvicorn

$FrontendJob = Start-Job -ScriptBlock {
    param($dir, $runner)
    Set-Location $dir
    if ($runner -eq "bun") {
        & bun run dev -- --host 0.0.0.0 2>&1
    } else {
        & npx --yes vite --host 0.0.0.0 2>&1
    }
} -ArgumentList $FrontendDir, $FrontendRunner

try {
    while ($true) {
        $ErrorActionPreference = "Continue"
        Receive-Job -Job $BackendJob -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "[backend]  $_" -ForegroundColor DarkCyan }
        Receive-Job -Job $FrontendJob -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "[frontend] $_" -ForegroundColor DarkMagenta }

        if ($BackendJob.State -ne 'Running' -and $FrontendJob.State -ne 'Running') {
            break
        }
        Start-Sleep -Milliseconds 500
    }
} finally {
    Write-Host "`n[STOP] Encerrando servidores e liberando portas..." -ForegroundColor Yellow
    Stop-Job -Job $BackendJob -ErrorAction SilentlyContinue
    Stop-Job -Job $FrontendJob -ErrorAction SilentlyContinue
    Remove-Job -Job $BackendJob -Force -ErrorAction SilentlyContinue
    Remove-Job -Job $FrontendJob -Force -ErrorAction SilentlyContinue

    Get-Process -Name "uvicorn", "node", "bun", "python" -ErrorAction SilentlyContinue | Where-Object {
        $_.Path -like "*$BackendDir*" -or $_.Path -like "*$FrontendDir*"
    } | Stop-Process -Force -ErrorAction SilentlyContinue
    Write-Host "   [OK] Servidores encerrados com sucesso." -ForegroundColor Green
}
