#!/bin/bash
# =========================================================
#  VMEX start script for Pterodactyl
#  Pulls code → installs packages → SQLite engine →
#  checks settings → builds site → Cloudflare Tunnel →
#  starts the backend (website + API + Discord bot)
# =========================================================
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

# ---------- 4. SQLite engine for this Linux server ----------
# New npm versions block install scripts, so run the download step directly.
SQLITE_BIN="server/node_modules/better-sqlite3/build/Release/better_sqlite3.node"
if [ ! -f "$SQLITE_BIN" ]; then
  echo "▶ Downloading the better-sqlite3 engine for this server..."
  (cd server/node_modules/better-sqlite3 && ../.bin/prebuild-install) \
    || (cd server/node_modules/better-sqlite3 && npx --yes node-gyp rebuild --release)

  if [ ! -f "$SQLITE_BIN" ]; then
    echo "✖ better-sqlite3 engine is still missing — see the errors above."
    exit 1
  fi
  echo "✔ better-sqlite3 engine ready"
fi

# ---------- 5. Discord bot settings check (warnings only) ----------
env_has () {
  grep -Eq "^[[:space:]]*$1=[^[:space:]]" server/.env
}

echo "▶ Checking Discord settings..."
DISCORD_OK=1
for key in DISCORD_BOT_TOKEN DISCORD_CLIENT_ID DISCORD_CLIENT_SECRET PUBLIC_URL; do
  if ! env_has "$key"; then
    echo "  ! $key is missing — the Discord bot and account linking are off"
    DISCORD_OK=0
  fi
done
if [ "$DISCORD_OK" = "1" ]; then
  echo "  ✔ Discord bot will start with the website"
  if env_has DISCORD_GUILD_ID && env_has DISCORD_PLAN_ROLES; then
    echo "  ✔ Plan roles are set up"
  else
    echo "  ! DISCORD_GUILD_ID or DISCORD_PLAN_ROLES missing — plan roles are off"
  fi
fi

# ---------- 6. Build the website ----------
if [ "${BUILD_ON_START}" = "1" ] || [ ! -d dist ]; then
  echo "▶ Building the website..."
  npx vite build || { echo "✖ Website build failed"; exit 1; }
fi

# ---------- 7. Cloudflare Tunnel ----------
CF_PID=""
if [ -n "${CF_TUNNEL_TOKEN}" ]; then
  if [ ! -x ./cloudflared ]; then
    ARCH=$(uname -m)
    if [ "$ARCH" = "aarch64" ]; then CF_ARCH=arm64; else CF_ARCH=amd64; fi
    echo "▶ Downloading cloudflared..."
    curl -fsSL -o cloudflared "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${CF_ARCH}" \
      && chmod +x cloudflared
  fi
  echo "▶ Starting Cloudflare Tunnel..."
  ./cloudflared tunnel --no-autoupdate --loglevel warn --protocol http2 run --token "${CF_TUNNEL_TOKEN}" &
  CF_PID=$!
else
  echo "! CF_TUNNEL_TOKEN is empty — running without Cloudflare Tunnel"
fi

# ---------- 8. Start the backend (website + API + Discord bot) ----------
NODE_PID=""

cleanup () {
  echo "▶ Stopping VMEX..."
  [ -n "$NODE_PID" ] && kill "$NODE_PID" 2>/dev/null
  [ -n "$CF_PID" ] && kill "$CF_PID" 2>/dev/null
  wait 2>/dev/null
  exit 0
}
trap cleanup SIGINT SIGTERM

cd server
node --env-file=.env index.js &
NODE_PID=$!
wait "$NODE_PID"

# If the backend stops or crashes, stop the tunnel too
echo "! Backend stopped"
[ -n "$CF_PID" ] && kill "$CF_PID" 2>/dev/null
wait 2>/dev/null