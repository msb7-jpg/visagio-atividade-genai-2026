# ==============================================================================
# CineData Analytics -- Sincronizacao e Compressao de Base de Dados (db_sync.ps1)
# Compativel com Windows PowerShell 5.1+ e PowerShell Core (pwsh)
# Suporta extracao/compressao (serialize) e descompressao/reconstrucao (deserialize)
# ==============================================================================

[CmdletBinding()]
param(
    [Parameter(Position=0)]
    [string]$Action = "",

    [Parameter()]
    [switch]$DumpSql
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$DbName = "cinerocket.db"
$DbPath = Join-Path $ProjectRoot $DbName
$ArchiveName = "database.sql.xz"
$ArchivePath = Join-Path $ProjectRoot $ArchiveName
$SqlDumpName = "database_dump.sql"
$SqlDumpPath = Join-Path $ProjectRoot $SqlDumpName

function Test-CommandAvailable {
    param([string]$CommandName)
    return [bool](Get-Command $CommandName -ErrorAction SilentlyContinue)
}

# Localiza runtime Python disponivel
$PythonCmd = $null
$VenvPy = Join-Path (Join-Path $ProjectRoot "backend") ".venv\Scripts\python.exe"
if (Test-Path $VenvPy) {
    $PythonCmd = $VenvPy
} elseif (Test-CommandAvailable "uv") {
    $PythonCmd = "uv run python"
} elseif (Test-CommandAvailable "python") {
    $PythonCmd = "python"
} elseif (Test-CommandAvailable "python3") {
    $PythonCmd = "python3"
} elseif (Test-CommandAvailable "py") {
    $PythonCmd = "py"
}

switch ($Action.ToLower()) {
    { $_ -in @("cp", "serialize", "compress") } {
        Write-Host "`n[>] Iniciando extracao analitica e compressao do banco de dados..." -ForegroundColor Cyan

        if (-not (Test-Path $DbPath)) {
            Write-Host "[ERRO] Banco de dados '$DbName' nao encontrado em: $DbPath" -ForegroundColor Red
            exit 1
        }

        $OrigSizeMB = [math]::Round(((Get-Item $DbPath).Length / 1MB), 2)
        Write-Host "   [DB] Tamanho original do SQLite binario: $OrigSizeMB MB" -ForegroundColor Yellow

        if ($null -eq $PythonCmd) {
            Write-Host "[ERRO] Runtime Python nao encontrado para compressao xz." -ForegroundColor Red
            exit 1
        }

        Write-Host "   [>] Gerando dump SQL e comprimindo para $ArchiveName via modulo Python lzma..." -ForegroundColor Cyan
        $DumpScript = @"
import sqlite3, lzma, sys

db_file = r'$DbPath'
xz_file = r'$ArchivePath'
sql_dump_file = r'$SqlDumpPath'
dump_sql = $(if ($DumpSql -or (-not (Test-Path $SqlDumpPath))) { "True" } else { "False" })

conn = sqlite3.connect(db_file)
conn.execute('PRAGMA wal_checkpoint(TRUNCATE);')

with lzma.open(xz_file, 'wt', encoding='utf-8', preset=9 | lzma.PRESET_EXTREME) as f_xz:
    if dump_sql:
        with open(sql_dump_file, 'w', encoding='utf-8') as f_sql:
            for line in conn.iterdump():
                stmt = f'{line}\n'
                f_xz.write(stmt)
                f_sql.write(stmt)
    else:
        for line in conn.iterdump():
            f_xz.write(f'{line}\n')

conn.close()
"@
        if ($PythonCmd -like "uv run *") {
            Push-Location (Join-Path $ProjectRoot "backend")
            try {
                uv run python -c $DumpScript
            } finally {
                Pop-Location
            }
        } else {
            & $PythonCmd -c $DumpScript
        }

        $NewSizeMB = [math]::Round(((Get-Item $ArchivePath).Length / 1MB), 2)
        Write-Host "   [OK] Concluido com sucesso! Arquivo gerado: $ArchivePath" -ForegroundColor Green
        Write-Host "   [OK] Resumo da compressao: $OrigSizeMB MB -> $NewSizeMB MB" -ForegroundColor Green
        break
    }

    { $_ -in @("dc", "deserialize", "decompress") } {
        Write-Host "`n[>] Restaurando base de dados $DbName a partir do arquivo compactado..." -ForegroundColor Cyan

        if (-not (Test-Path $ArchivePath)) {
            if (Test-Path $SqlDumpPath) {
                Write-Host "   [!] $ArchiveName nao encontrado, mas $SqlDumpName esta disponivel." -ForegroundColor Yellow
                Write-Host "   [>] Restaurando diretamente a partir do dump em texto puro..." -ForegroundColor Cyan
                Remove-Item -Path $DbPath -Force -ErrorAction SilentlyContinue
                Remove-Item -Path "$DbPath-wal" -Force -ErrorAction SilentlyContinue
                Remove-Item -Path "$DbPath-shm" -Force -ErrorAction SilentlyContinue

                $RestoreScript = @"
import sqlite3
db_file = r'$DbPath'
sql_dump = r'$SqlDumpPath'
conn = sqlite3.connect(db_file)
with open(sql_dump, 'r', encoding='utf-8') as f:
    conn.executescript(f.read())
conn.close()
"@
                if ($PythonCmd -like "uv run *") {
                    Push-Location (Join-Path $ProjectRoot "backend")
                    try { uv run python -c $RestoreScript } finally { Pop-Location }
                } else {
                    & $PythonCmd -c $RestoreScript
                }
                $RebuiltSizeMB = [math]::Round(((Get-Item $DbPath).Length / 1MB), 2)
                Write-Host "   [OK] Base reconstruida com sucesso: $RebuiltSizeMB MB" -ForegroundColor Green
                exit 0
            } else {
                Write-Host "[ERRO] Nem '$ArchiveName' nem '$SqlDumpName' foram encontrados em: $ProjectRoot" -ForegroundColor Red
                exit 1
            }
        }

        $ArchSizeMB = [math]::Round(((Get-Item $ArchivePath).Length / 1MB), 2)
        Write-Host "   [DB] Tamanho do arquivo compactado: $ArchSizeMB MB" -ForegroundColor Yellow

        Remove-Item -Path $DbPath -Force -ErrorAction SilentlyContinue
        Remove-Item -Path "$DbPath-wal" -Force -ErrorAction SilentlyContinue
        Remove-Item -Path "$DbPath-shm" -Force -ErrorAction SilentlyContinue

        Write-Host "   [>] Descomprimindo e recriando tabelas, indices e embeddings vetoriais..." -ForegroundColor Cyan
        $RestoreXzScript = @"
import sqlite3, lzma
db_file = r'$DbPath'
xz_file = r'$ArchivePath'
conn = sqlite3.connect(db_file)
with lzma.open(xz_file, 'rt', encoding='utf-8') as f:
    conn.executescript(f.read())
conn.close()
"@
        if ($PythonCmd -like "uv run *") {
            Push-Location (Join-Path $ProjectRoot "backend")
            try { uv run python -c $RestoreXzScript } finally { Pop-Location }
        } else {
            & $PythonCmd -c $RestoreXzScript
        }

        $RebuiltSizeMB = [math]::Round(((Get-Item $DbPath).Length / 1MB), 2)
        Write-Host "   [OK] Reconstrucao concluida com sucesso!" -ForegroundColor Green
        Write-Host "   [OK] Resumo da restauracao: $ArchSizeMB MB -> $RebuiltSizeMB MB" -ForegroundColor Green
        break
    }

    "dump" {
        Write-Host "`n[>] Gerando dump puro SQL ($SqlDumpName) a partir de $DbName..." -ForegroundColor Cyan
        if (-not (Test-Path $DbPath)) {
            Write-Host "[ERRO] Banco de dados '$DbName' nao encontrado em: $DbPath" -ForegroundColor Red
            exit 1
        }
        $DumpOnlyScript = @"
import sqlite3
db_file = r'$DbPath'
sql_dump = r'$SqlDumpPath'
conn = sqlite3.connect(db_file)
with open(sql_dump, 'w', encoding='utf-8') as f:
    for line in conn.iterdump():
        f.write(f'{line}\n')
conn.close()
"@
        if ($PythonCmd -like "uv run *") {
            Push-Location (Join-Path $ProjectRoot "backend")
            try { uv run python -c $DumpOnlyScript } finally { Pop-Location }
        } else {
            & $PythonCmd -c $DumpOnlyScript
        }
        $DumpSizeMB = [math]::Round(((Get-Item $SqlDumpPath).Length / 1MB), 2)
        Write-Host "   [OK] Dump gerado com sucesso: $SqlDumpName ($DumpSizeMB MB)" -ForegroundColor Green
        break
    }

    default {
        Write-Host "Uso: .\scripts\db_sync.ps1 {serialize|deserialize|dump}" -ForegroundColor Yellow
        Write-Host "  serialize   (ou cp) -> Extrai $DbName e comprime em $ArchiveName" -ForegroundColor Gray
        Write-Host "  deserialize (ou dc) -> Descompacta $ArchiveName e reconstroi $DbName" -ForegroundColor Gray
        Write-Host "  dump                -> Gera dump puro em texto ($SqlDumpName) sem compressao" -ForegroundColor Gray
        exit 1
    }
}
