# LXC Deployment Guide

Run Pladi natively in an LXC container with systemd.

## Prerequisites

- LXC host with container support
- Ubuntu 22.04+ or Debian 12+ container image
- Your `RAILS_MASTER_KEY` (from `config/master.key` in development)

## Quick Start

### 1. Create the container

```bash
# Proxmox example
pct create 200 local:vztmpl/ubuntu-24.04-standard_24.04-2_amd64.tar.zst \
  --hostname pladi \
  --memory 1024 \
  --cores 2 \
  --rootfs local-lvm:10 \
  --net0 name=eth0,bridge=vmbr0,ip=dhcp \
  --unprivileged 1
pct start 200
pct enter 200

# Incus/LXD example
incus launch images:ubuntu/24.04 pladi -c limits.memory=1GiB -c limits.cpu=2
incus exec pladi -- bash
```

**Recommended resources:** 1 GB RAM, 2 CPU cores, 10 GB disk.

### 2. Run the setup script

```bash
apt-get update && apt-get install -y git
git clone https://github.com/sforse/pladi.git /opt/pladi
cd /opt/pladi
bash deploy/lxc/setup.sh
```

The script will prompt for your `RAILS_MASTER_KEY`. You can also pass it as an environment variable:

```bash
RAILS_MASTER_KEY=your_key_here bash deploy/lxc/setup.sh
```

### 3. Verify

```bash
systemctl status pladi
curl -s http://localhost/ | head -20
```

The app listens on **port 80** (via Thruster).

## Managing the Service

```bash
systemctl start pladi
systemctl stop pladi
systemctl restart pladi
journalctl -u pladi -f        # follow logs
journalctl -u pladi --since today
```

## Updating

```bash
cd /opt/pladi
sudo -u pladi git pull --ff-only
sudo -u pladi bundle install --jobs $(nproc)
sudo -u pladi npm ci
sudo -u pladi bash -c "SECRET_KEY_BASE_DUMMY=1 RAILS_ENV=production bundle exec rails assets:precompile"
sudo -u pladi bash -c "RAILS_ENV=production bundle exec rails db:migrate"
systemctl restart pladi
```

## Backups

All persistent data lives in `/opt/pladi/storage/`:

| File | Contents |
|------|----------|
| `production.sqlite3` | Users, sessions, Plex servers |
| `production_cache.sqlite3` | Solid Cache |
| `production_queue.sqlite3` | Solid Queue |
| `production_cable.sqlite3` | Solid Cable |

To back up:

```bash
systemctl stop pladi
cp -a /opt/pladi/storage/ /backups/pladi-$(date +%F)/
systemctl start pladi
```

Or use SQLite's online backup (no downtime):

```bash
sqlite3 /opt/pladi/storage/production.sqlite3 ".backup '/backups/production.sqlite3'"
```

## Reverse Proxy (HTTPS)

Thruster already handles HTTP compression and caching. Put a reverse proxy in front for TLS termination.

### Caddy (automatic HTTPS)

```
pladi.example.com {
    reverse_proxy <lxc-ip>:80
}
```

### Nginx

```nginx
server {
    listen 443 ssl;
    server_name pladi.example.com;

    ssl_certificate     /etc/ssl/certs/pladi.pem;
    ssl_certificate_key /etc/ssl/private/pladi.key;

    location / {
        proxy_pass http://<lxc-ip>:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Troubleshooting

**Service won't start:** Check logs with `journalctl -u pladi -e` and verify `.env` contains `RAILS_MASTER_KEY`.

**Permission errors:** Ensure `/opt/pladi/storage/` is owned by `pladi:pladi`:
```bash
chown -R pladi:pladi /opt/pladi/storage/
```

**Port 80 in use:** Another service may be bound to port 80. Check with `ss -tlnp | grep :80`.
