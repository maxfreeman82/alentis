#!/usr/bin/env bash
# deploy.sh — Setup + déploiement Teranga Align sur KVM2 Hostinger (Ubuntu 22/24)
# Usage : bash deploy.sh
set -euo pipefail

REPO_URL="https://github.com/VOTRE_ORG/teranga-align.git"   # ← à modifier
APP_DIR="/opt/teranga-align"
DOMAIN="votre-domaine.com"                                   # ← à modifier

echo "═══════════════════════════════════════════"
echo "  Teranga Align — déploiement KVM2 Hostinger"
echo "═══════════════════════════════════════════"

# ── 1. Mise à jour système ────────────────────────────────────────────────────
echo "▶ Mise à jour des paquets…"
apt-get update -qq && apt-get upgrade -y -qq

# ── 2. Installation Docker ────────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  echo "▶ Installation de Docker…"
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
else
  echo "✓ Docker déjà installé ($(docker --version))"
fi

# Docker Compose v2 (plugin)
if ! docker compose version &>/dev/null; then
  echo "▶ Installation de Docker Compose plugin…"
  COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep '"tag_name"' | cut -d'"' -f4)
  mkdir -p /usr/local/lib/docker/cli-plugins
  curl -SL "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-linux-x86_64" \
    -o /usr/local/lib/docker/cli-plugins/docker-compose
  chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
fi

# ── 3. Installation Git ───────────────────────────────────────────────────────
if ! command -v git &>/dev/null; then
  apt-get install -y -qq git
fi

# ── 4. Clone ou pull du dépôt ─────────────────────────────────────────────────
if [ -d "$APP_DIR/.git" ]; then
  echo "▶ Mise à jour du dépôt…"
  git -C "$APP_DIR" pull origin main
else
  echo "▶ Clonage du dépôt…"
  git clone "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"

# ── 5. Fichier .env.production ────────────────────────────────────────────────
if [ ! -f ".env.production" ]; then
  cp .env.production.example .env.production
  echo ""
  echo "⚠  IMPORTANT : éditez .env.production avant de continuer !"
  echo "   nano $APP_DIR/.env.production"
  echo ""
  read -rp "Appuyez sur Entrée une fois le fichier édité…"
fi

# ── 6. Mise à jour du domaine dans Caddyfile ─────────────────────────────────
sed -i "s/votre-domaine.com/${DOMAIN}/g" Caddyfile

# ── 7. Build + démarrage ──────────────────────────────────────────────────────
echo "▶ Build Docker (peut prendre 3–5 min la première fois)…"
docker compose pull caddy
docker compose up -d --build --remove-orphans

echo ""
echo "✅ Déploiement terminé !"
echo "   → https://${DOMAIN}"
echo ""
echo "Commandes utiles :"
echo "  docker compose logs -f app    # logs Next.js"
echo "  docker compose logs -f caddy  # logs Caddy/HTTPS"
echo "  docker compose restart app    # redémarrer l'app"
echo "  docker compose down           # arrêter"
