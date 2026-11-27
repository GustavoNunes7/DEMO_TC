#!/usr/bin/env bash
set -Eeuo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"
echo "====================================================="
echo "                 DEMO_TC - TECHCAMPUS"
echo "====================================================="
echo

if ! command -v node >/dev/null 2>&1; then
  echo "[ERRO] Node.js não encontrado. Instale uma versão LTS."
  exit 1
fi
if ! command -v npm >/dev/null 2>&1; then
  echo "[ERRO] npm não encontrado."
  exit 1
fi

if [[ ! -f .env ]]; then
  if [[ ! -f .env.example ]]; then
    echo "[ERRO] .env.example não encontrado."
    exit 1
  fi
  cp .env.example .env
  echo "[OK] Arquivo .env criado a partir do modelo."
fi

if [[ ! -d node_modules ]]; then
  echo "[*] Instalando dependências..."
  npm install
fi

echo
echo "[*] Preparando banco, segurança e conta administrativa..."
npm run setup

PORT="$(grep -E '^PORT=' .env | tail -n 1 | cut -d '=' -f 2- | tr -d '\r' || true)"
PORT="${PORT:-3022}"
URL="http://localhost:${PORT}"

echo
echo "[*] Iniciando servidor em ${URL}"
if command -v xdg-open >/dev/null 2>&1; then
  (sleep 2; xdg-open "${URL}" >/dev/null 2>&1 || true) &
fi

npm start
