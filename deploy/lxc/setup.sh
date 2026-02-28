#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/opt/pladi"
RUBY_VERSION="4.0.1"
NODE_MAJOR=22
REPO_URL="https://github.com/sforse/pladi.git"

# ── Helpers ──────────────────────────────────────────────────────────
info()  { echo -e "\033[1;34m==>\033[0m $*"; }
error() { echo -e "\033[1;31m==>\033[0m $*" >&2; }

if [[ $EUID -ne 0 ]]; then
  error "This script must be run as root."
  exit 1
fi

# ── System packages ─────────────────────────────────────────────────
info "Updating package lists..."
apt-get update -qq

info "Installing system dependencies..."
apt-get install -y -qq \
  build-essential git curl wget \
  libyaml-dev pkg-config libvips libffi-dev \
  sqlite3 libsqlite3-dev \
  libjemalloc2 \
  autoconf bison rustc libssl-dev zlib1g-dev \
  ca-certificates gnupg

# ── Node.js ──────────────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  info "Installing Node.js ${NODE_MAJOR}..."
  curl -fsSL https://deb.nodesource.com/setup_${NODE_MAJOR}.x | bash -
  apt-get install -y -qq nodejs
else
  info "Node.js already installed: $(node -v)"
fi

# ── Ruby (via ruby-install) ──────────────────────────────────────────
if ! command -v ruby &>/dev/null || [[ "$(ruby -v)" != *"${RUBY_VERSION}"* ]]; then
  info "Installing ruby-install..."
  RUBY_INSTALL_VERSION="0.9.4"
  cd /tmp
  wget -q "https://github.com/postmodern/ruby-install/releases/download/v${RUBY_INSTALL_VERSION}/ruby-install-${RUBY_INSTALL_VERSION}.tar.gz"
  tar -xzf "ruby-install-${RUBY_INSTALL_VERSION}.tar.gz"
  cd "ruby-install-${RUBY_INSTALL_VERSION}"
  make install

  info "Installing Ruby ${RUBY_VERSION} (this takes a few minutes)..."
  ruby-install --system ruby "${RUBY_VERSION}" -- --disable-install-doc
  cd /
else
  info "Ruby already installed: $(ruby -v)"
fi

# ── Create pladi user ────────────────────────────────────────────────
if ! id pladi &>/dev/null; then
  info "Creating pladi system user..."
  useradd --system --shell /usr/sbin/nologin --home-dir "${APP_DIR}" pladi
fi

# ── Clone / update repository ───────────────────────────────────────
if [[ -d "${APP_DIR}/.git" ]]; then
  info "Updating existing repository..."
  cd "${APP_DIR}"
  sudo -u pladi git pull --ff-only
else
  info "Cloning repository to ${APP_DIR}..."
  git clone "${REPO_URL}" "${APP_DIR}"
  chown -R pladi:pladi "${APP_DIR}"
fi

cd "${APP_DIR}"

# ── Bundle install ───────────────────────────────────────────────────
info "Installing Ruby gems..."
sudo -u pladi bundle config set --local deployment true
sudo -u pladi bundle config set --local without "development test"
sudo -u pladi bundle install --jobs "$(nproc)"

# ── npm install ──────────────────────────────────────────────────────
info "Installing Node packages..."
sudo -u pladi npm ci

# ── Environment file ────────────────────────────────────────────────
if [[ ! -f "${APP_DIR}/.env" ]]; then
  info "Creating .env file..."

  if [[ -n "${RAILS_MASTER_KEY:-}" ]]; then
    MASTER_KEY="${RAILS_MASTER_KEY}"
  else
    echo ""
    echo "  Enter your RAILS_MASTER_KEY (from config/master.key in development)."
    echo "  If you don't have one yet, generate credentials with:"
    echo "    EDITOR=nano rails credentials:edit"
    echo ""
    read -rp "  RAILS_MASTER_KEY: " MASTER_KEY
  fi

  cat > "${APP_DIR}/.env" <<EOF
RAILS_MASTER_KEY=${MASTER_KEY}
EOF
  chown pladi:pladi "${APP_DIR}/.env"
  chmod 600 "${APP_DIR}/.env"
else
  info ".env file already exists, skipping."
fi

# ── Precompile assets ───────────────────────────────────────────────
info "Precompiling assets..."
sudo -u pladi bash -c "cd ${APP_DIR} && SECRET_KEY_BASE_DUMMY=1 RAILS_ENV=production bundle exec rails assets:precompile"

# ── Precompile bootsnap ─────────────────────────────────────────────
info "Precompiling bootsnap cache..."
sudo -u pladi bash -c "cd ${APP_DIR} && bundle exec bootsnap precompile app/ lib/"

# ── Storage directory ────────────────────────────────────────────────
info "Ensuring storage directory exists..."
mkdir -p "${APP_DIR}/storage"
chown pladi:pladi "${APP_DIR}/storage"

# ── Database ─────────────────────────────────────────────────────────
info "Preparing database..."
sudo -u pladi bash -c "cd ${APP_DIR} && RAILS_ENV=production bundle exec rails db:prepare"

# ── Systemd service ─────────────────────────────────────────────────
info "Installing systemd service..."
cp "${APP_DIR}/deploy/lxc/pladi.service" /etc/systemd/system/pladi.service
systemctl daemon-reload
systemctl enable pladi

info "Starting pladi service..."
systemctl start pladi

echo ""
info "Setup complete! Check status with: systemctl status pladi"
info "Application should be available on port 80."
