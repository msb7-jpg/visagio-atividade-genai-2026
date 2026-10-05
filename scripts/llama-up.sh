#!/usr/bin/env bash
# Script de inicialização otimizado do servidor llama.cpp para o modelo local.
# Hardware: RTX 5060 (8 GB VRAM) + 32 GB RAM.
#
# Configurações de Memória e Contexto:
# - Modelo Qwen 3.5 4B Q4_K_M: ~2.6 GB de VRAM.
# - Contexto total de 64.000 tokens com 2 slots paralelos (-np 2): 32.000 tokens dedicados por slot.
# - Quantização do KV Cache (-ctk q8_0 -ctv q8_0): consome ~2.2 GB de VRAM para 64k tokens.
# - Uso total de VRAM: ~4.8 GB (ficando folgadamente dentro dos 8 GB disponíveis).
# - Flash Attention (-fa on) ativado para máxima velocidade de inferência.

~/workspace/llama.cpp/build/bin/llama-server -m ~/workspace/llama.cpp/models/Qwen3.5-4B-Q4_K_M.gguf \
  -ngl 999 \
  -c 64000 \
  -np 2 \
  -ctk q8_0 \
  -ctv q8_0 \
  --alias "Qwen3.5-4B-Q4_K_M" \
  -fa on \
  --host 0.0.0.0 \
  --port 1234
