#!/usr/bin/env bash
# Encaminha execucao para o orquestrador completo em scripts/setup.sh
exec "$(dirname "$0")/scripts/setup.sh" "$@"
