#!/usr/bin/env bash
# deploy.sh — one-shot deployment for a fresh Ubuntu 22.04+ VPS.
# Run as root (or with sudo). Idempotent: safe to re-run.
#
# What it does:
#   1. Installs Docker + Docker Compose plugin if missing
#   2. Configures the firewall (ufw) for SSH + HTTP + HTTPS
#   3. Clones (or pulls) the repo to /opt/ai-study-hub
#   4. Generates a strong AUTH_SECRET if .env doesn't have one
#   5. Builds the Docker image
#   6. Starts the container, waits for the health check
#   7. Prints the public URL
#
# Environment variables (optional):
#   REPO_URL       — git URL to clone (default: ./ — assume files already on host)
#   REPO_DIR       — target directory (default: /opt/ai-study-hub)
#   DOMAIN         — if set, Caddy will be installed and configured for HTTPS
#   ADMIN_EMAIL    — email for Let's Encrypt (only used if DOMAIN is set)
#   SKIP_DOCKER    — set to 1 to skip Docker install (for re-runs)
#   SKIP_FIREWALL  — set to 1 to skip ufw config (e.g. on providers with their own firewall)
#
# Usage:
#   curl -fsSL <url>/deploy.sh | sudo bash -s -- --domain=study.example.com
#   # or
#   ./deploy.sh
set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/ai-study-hub}"
REPO_URL="${REPO_URL:-}"
DOMAIN="${DOMAIN:-}"
ADMIN_EMAIL="${ADMIN_EMAIL:-}"
SKIP_DOCKER="${SKIP_DOCKER:-}"
SKIP_FIREWALL="${SKIP_FIREWALL:-}"

# parse args
for arg in "$@"; do
  case $arg in
    --domain=*) DOMAIN="${arg#*=}" ;;
    --email=*)  ADMIN_EMAIL="${arg#*=}" ;;
    --repo=*)   REPO_URL="${arg#*=}" ;;
    --dir=*)    REPO_DIR="${arg#*=}" ;;
    --skip-docker)   SKIP_DOCKER=1 ;;
    --skip-firewall) SKIP_FIREWALL=1 ;;
    *) echo "Unknown arg: $arg"; exit 1 ;;
  esac
done

log() { printf '\033[1;32m[deploy]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[deploy]\033[0m %s\n' "$*" >&2; }
fail() { printf '\033[1;31m[deploy]\033[0m %s\n' "$*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || fail "Please run as root (sudo bash deploy.sh)"

# --- 1. Docker ---
if [[ -z "$SKIP_DOCKER" ]]; then
  if ! command -v docker >/dev/null 2>&1; then
    log "Installing Docker…"
    curl -fsSL https://get.docker.com | sh
  else
    log "Docker already installed: $(docker --version)"
  fi
  # Docker Compose v2 ships with the docker-ce package; double-check
  if ! docker compose version >/dev/null 2>&1; then
    log "Installing Docker Compose plugin…"
    apt-get install -y docker-compose-plugin || warn "Failed to install compose plugin; continuing"
  fi
fi

# --- 2. Firewall ---
if [[ -z "$SKIP_FIREWALL" ]]; then
  if command -v ufw >/dev/null 2>&1; then
    log "Configuring firewall (ufw)…"
    ufw --force reset
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow OpenSSH
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw --force enable
  else
    warn "ufw not found; skipping firewall config. Make sure the host firewall allows 22, 80, 443."
  fi
fi

# --- 3. Code on disk ---
if [[ -n "$REPO_URL" ]]; then
  if [[ -d "$REPO_DIR/.git" ]]; then
    log "Pulling latest code in $REPO_DIR…"
    # Reset to remote in case local has diverged (common when files were scp'd before)
    git -C "$REPO_DIR" fetch --all --prune 2>/dev/null || warn "git fetch failed; continuing"
    git -C "$REPO_DIR" reset --hard origin/HEAD 2>/dev/null || git -C "$REPO_DIR" pull --ff-only
  else
    log "Cloning $REPO_URL to $REPO_DIR…"
    git clone "$REPO_URL" "$REPO_DIR"
  fi
else
  if [[ ! -f "$REPO_DIR/docker-compose.yml" ]]; then
    fail "No docker-compose.yml in $REPO_DIR and REPO_URL not set. Upload the project first (see INSTALL.md)."
  fi
  log "Using existing files in $REPO_DIR"
fi

cd "$REPO_DIR"

# --- 4. .env ---
if [[ ! -f .env ]]; then
  log "Generating .env…"
  AUTH_SECRET=$(head -c 32 /dev/urandom | base64 | tr -d '/+=' | cut -c1-48)
  cat > .env <<EOF
AUTH_SECRET=$AUTH_SECRET
GITHUB_ID=
GITHUB_SECRET=
EOF
  log "Generated AUTH_SECRET in .env. Edit .env to add GitHub OAuth credentials."
fi

# Pre-create data dir so the bind mount works on first run
mkdir -p data
[[ -f data/.gitkeep ]] || touch data/.gitkeep
# Make sure the data dir is writable by the container's node user (uid 1000 in the Dockerfile's base image)
chown -R 1000:1000 data 2>/dev/null || chmod -R 0777 data

# --- 5. Build + start ---
log "Building Docker image (this can take a couple of minutes the first time)…"
docker compose build

log "Starting container…"
docker compose up -d

# --- 6. Health check ---
log "Waiting for the app to be healthy (max 60s)…"
for i in $(seq 1 30); do
  STATUS=$(docker inspect --format='{{.State.Health.Status}}' ai-study-hub 2>/dev/null || echo "missing")
  if [[ "$STATUS" == "healthy" ]]; then
    log "App is healthy."
    break
  fi
  if [[ $i -eq 30 ]]; then
    warn "App did not become healthy in 60s. Showing last 50 lines of logs:"
    docker compose logs --tail=50 app
    warn "Container is still running. Check logs with: docker compose logs -f"
  fi
  sleep 2
done

# --- 7. Optional: Caddy reverse proxy for HTTPS ---
if [[ -n "$DOMAIN" ]]; then
  if ! command -v caddy >/dev/null 2>&1; then
    log "Installing Caddy…"
    apt install -y debian-keyring debian-archive-keyring curl gnupg
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/deb/debian.gpg' > /etc/apt/trusted.gpg.d/caddy-stable.gpg
    echo "deb [signed-by=/usr/share/keyrings/caddy-stable-archive-keyring.gpg] https://dl.cloudsmith.io/public/caddy/stable/deb/debian any-version main" > /etc/apt/sources.list.d/caddy-stable.list
    apt update
    apt install -y caddy
  fi
  log "Configuring Caddy for $DOMAIN…"
  cat > /etc/caddy/Caddyfile <<EOF
$DOMAIN {
    reverse_proxy 127.0.0.1:3000
    ${ADMIN_EMAIL:+email $ADMIN_EMAIL}
}
EOF
  systemctl reload caddy
  log "Caddy configured. HTTPS will be live within a minute or two."
fi

# --- 8. Done ---
PUBLIC_IP=$(curl -fsS https://api.ipify.org 2>/dev/null || echo "<server-ip>")
echo
log "DEPLOY COMPLETE"
echo
if [[ -n "$DOMAIN" ]]; then
  echo "  Public URL:  https://$DOMAIN"
else
  echo "  Public URL:  http://$PUBLIC_IP:3000"
  echo "  (no domain configured; consider setting up a reverse proxy + HTTPS later)"
fi
echo
echo "Useful commands:"
echo "  cd $REPO_DIR"
echo "  docker compose logs -f app      # follow logs"
echo "  docker compose restart app      # restart the app"
echo "  bash scripts/update.sh          # pull latest code + rebuild"
echo "  bash scripts/backup.sh          # back up the database"
