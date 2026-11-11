#!/usr/bin/env bash
# One-step redeploy of the web to the VPS (run from the repo root, Git Bash/WSL/Linux).
#   ./deploy/deploy.sh            # package, upload, build, restart, verify
#   VPS_HOST=csms-vps ./deploy/deploy.sh
#
# Secrets stay on the server in ~/fabrica-web/.env (never uploaded by this script).
# NEXT_PUBLIC_* are baked in at build time, so edit ~/fabrica-web/.env and rerun this
# script whenever one of them changes.
set -euo pipefail

HOST="${VPS_HOST:-csms-vps}"
REMOTE_DIR="fabrica-web"

echo "==> Packaging source"
# Excludes are anchored to the repo root (./name). Unanchored names would also drop
# nested dirs such as src/lib/supabase and public/logos.
tar czf - \
  --exclude=./node_modules --exclude=./.next --exclude=./.git \
  --exclude='./.env*' --exclude=./.claude --exclude=./.codex-remote-attachments \
  --exclude=./whatsapp-bot --exclude=./fotosbase --exclude=./ventas --exclude=./logos \
  --exclude=./docs --exclude=./supabase --exclude=./scripts --exclude=./chat.txt \
  --exclude=./fastoria_qr.png --exclude=./tsconfig.tsbuildinfo \
  . | ssh -o BatchMode=yes "$HOST" "mkdir -p ~/$REMOTE_DIR && rm -rf ~/$REMOTE_DIR/src.new && mkdir ~/$REMOTE_DIR/src.new && tar xzf - -C ~/$REMOTE_DIR/src.new"

echo "==> Swapping source, copying compose file"
scp -q deploy/docker-compose.yml "$HOST:$REMOTE_DIR/docker-compose.yml"
ssh -o BatchMode=yes "$HOST" "cd ~/$REMOTE_DIR && rm -rf src.old && { [ -d src ] && mv src src.old || true; } && mv src.new src && rm -rf src.old"

echo "==> Building image (low priority: the VPS is shared)"
ssh -o BatchMode=yes "$HOST" "cd ~/$REMOTE_DIR && nice -n 15 docker compose build"

echo "==> Restarting"
ssh -o BatchMode=yes "$HOST" "cd ~/$REMOTE_DIR && docker compose up -d"

echo "==> Verifying"
ssh -o BatchMode=yes "$HOST" 'for i in $(seq 1 20); do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:13000/robots.txt || true)
  [ "$code" = "200" ] && break
  sleep 3
done
echo "robots.txt -> $code"
echo "health     -> $(docker inspect fabrica-web --format "{{.State.Health.Status}}")"
[ "$code" = "200" ]'

echo "==> Done"
