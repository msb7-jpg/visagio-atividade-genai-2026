#!/usr/bin/env bash

bunx concurrently \
  --names "FRONT,BACK,LLAMA" \
  --prefix-colors "cyan,magenta,yellow" \
  "cd frontend && bun run dev" \
  "cd backend && uv run uvicorn main:app --reload" \
  "./llama-up.sh"
