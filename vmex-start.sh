#!/bin/bash
# VMEX start script for Pterodactyl
cd /home/container || exit 1

export PORT="${SERVER_PORT}"
export NODE_ENV="${NODE_ENV:-production}"

echo "▶ VMEX starting on port ${PORT} (${NODE_ENV})"

# ---------- 1. Update code from GitHub ----------
if [ "${AUTO_UPDATE}" = "1" ] && [ -d .git ]; then
  echo "▶ Pulling latest code..."
  git pull --ff-only || echo "! git pull failed — starting with the current code"
fi

# ---------- 2. Backend settings ----------
if [ ! -f server/.env ]; then
  echo "✖ server/.env is missing."
  echo "  Create it in the File Manager (server/.env), then restart."
  exit 1
fi

# ---------- 3. Install packages (only when they changed) ----------
needs_install () {
  local dir="$1"
  [ ! -d "$dir/node_modules" ] && return 0
  [ -f "$dir/package-lock.json" ] && ! cmp -s "$dir/package-lock.json" "$dir/node_modules/.vmex-lock" && return 0
  return 1
}

install_in () {
  local dir="$1"; shift
  echo "▶ Installing packages in ${dir}..."
  if [ -f "$dir/package-lock.json" ]; then
    (cd "$dir" && npm ci "$@" --no-audit --no-fund) || return 1
    cp "$dir/package-lock.json" "$dir/node_modules/.vmex-lock"
  else
    (cd "$dir" && npm install "$@" --no-audit --no-fund) || return 1
  fi
}

if needs_install "."; then install_in "." --include=dev || exit 1; fi
if needs_install "server"; then install_in "server" --omit=dev || exit 1; fi

# ---------- 4. Build the website ----------
if [ "${BUILD_ON_START}" = "1" ] || [ ! -d dist ]; then
  echo "▶ Building the website..."
  npx vite build || { echo "✖ Website build failed"; exit 1; }
fi

# ---------- 5. Cloudflare Tunnel ----------
CF_PID=""
if [ -n "${CF_TUNNEL_TOKEN}" ]; then
  if [ ! -x ./cloudflared ]; then
    ARCH=$(uname -m)
    [ "$ARCH" = "aarch64" ] && CF_ARCH=arm64 || CF_ARCH=amd64
    echo "▶ Downloading cloudflared..."
    curl -fsSL -o cloudflared "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${CF_ARCH}" \
      && chmod +x cloudflared
  fi
  echo "▶ Starting Cloudflare Tunnel..."
  ./cloudflared tunnel --no-autoupdate --loglevel warn run --token "${CF_TUNNEL_TOKEN}" &
  CF_PID=$!
else
  echo "! CF_TUNNEL_TOKEN is empty — running without Cloudflare Tunnel"
fi

# ---------- 6. Start the backend ----------
cleanup () {
  echo "▶ Stopping VMEX..."
  [ -n "$NODE_PID" ] && kill "$NODE_PID" 2>/dev/null
  [ -n "$CF_PID" ] && kill "$CF_PID" 2>/dev/null
  wait
}
trap cleanup SIGINT SIGTERM

cd server
node --env-file=.env index.js &
NODE_PID=$!
wait "$NODE_PID"
cleanup
