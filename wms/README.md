# Warehouse Management System (Proxmox LXC + Docker)

Deploy a WMS stack on Proxmox using an **Ubuntu 24.04 unprivileged LXC** with nesting, then run **Docker Compose** (app + Postgres + Caddy) inside the CT.

## Architecture

```
Proxmox host
 └── LXC CT (ubuntu-24.04, unprivileged, nesting=1)
      └── Docker Compose
           ├── proxy  (Caddy :80/:443)
           ├── app    (FastAPI WMS :8000)
           └── db     (Postgres 16)
```

## 1. Create the LXC (on Proxmox host)

```bash
cd /path/to/this/repo/wms
chmod +x proxmox/*.sh scripts/*.sh
CTID=200 HOSTNAME=wms MEMORY_MB=8192 CORES=4 DISK_GB=64 \
  ./proxmox/create-lxc.sh
```

Static IP example:

```bash
CTID=200 IP=192.168.1.50/24 GATEWAY=192.168.1.1 ./proxmox/create-lxc.sh
```

Defaults match [proxmox/ct.conf.example](proxmox/ct.conf.example): 4 vCPU, 8 GB RAM, 64 GB disk, nesting enabled.

## 2. Install Docker + deploy the stack

From the Proxmox host:

```bash
CTID=200 ./scripts/deploy-to-lxc.sh
```

Or manually inside the CT:

```bash
pct enter 200
# copy wms/ to /opt/wms, then:
./scripts/install-docker.sh
cp .env.example .env   # edit passwords
docker compose up -d --build
```

Open `http://<ct-ip>/`. API also available under `/api/*` (see `/docs` for OpenAPI).

## 3. Snapshots and Postgres dumps

On the Proxmox host:

```bash
CTID=200 ./scripts/setup-proxmox-snapshots.sh
```

That takes a baseline CT snapshot and registers a daily vzdump-style job when possible.

**Also** schedule logical DB dumps inside the CT (Proxmox backups alone are not enough for Postgres consistency workflows you can restore independently):

```bash
pct enter 200
/opt/wms/scripts/install-backup-cron.sh
```

Or manually:

```bash
crontab -e
# add:
15 2 * * * /opt/wms/scripts/backup-postgres.sh >> /var/log/wms-backup.log 2>&1
```

Dumps land in `/opt/wms/backups/wms-*.sql.gz` (14-day retention by default).

## Environment

Copy [.env.example](.env.example) to `.env`:

| Variable | Purpose |
|----------|---------|
| `POSTGRES_PASSWORD` | Database password (required) |
| `APP_SECRET_KEY` | App secret |
| `WMS_SITE_ADDRESS` | Caddy site address (`:80` for LAN HTTP, or `wms.example.com` for TLS) |

## Local smoke test (developer machine)

```bash
cd wms
cp .env.example .env
docker compose up -d --build
curl -fsS http://127.0.0.1/health
```

## Seed data

On first boot the app creates sample locations (`RECV`, `A-01-01`, `SHIP`) and products (`WIDGET-100`, `BOLT-M8`) with starter stock. Location/SKU lookups are case-insensitive.
