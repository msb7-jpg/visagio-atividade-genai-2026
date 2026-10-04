# Encaminha execucao para o orquestrador completo em scripts/setup.ps1
& (Join-Path $PSScriptRoot "scripts\setup.ps1") @args
