# np = 2 pq precisamos do paralelismo pra processar eventuais pedidos como 
# gerar o titulo dinamicamente
# to pensando em gerar as msgs de loading/processamento dinamicamente tb


~/workspace/llama.cpp/build/bin/llama-server -m ~/workspace/llama.cpp/models/Qwen3.5-4B-Q4_K_M.gguf \
-ngl 999 -c 32000 -np 2 \
-fa on \
--host 0.0.0.0 \
--port 1234 \
--no-context-shift \


