---
name: run
description: Use when starting, running, or launching the work-governor app locally (Next.js dev server + Postgres via Docker Compose).
---

# Running work-governor locally

The app is a Next.js frontend backed by Postgres (run via Docker
Compose). Both must be up.

## 1. Start Postgres

```bash
docker compose up -d
```

Wait for it to report healthy:

```bash
docker compose ps
```

Look for `Up ... (healthy)` on the `work-governor-db` service. If it
won't start and `docker ps -a` shows a container stuck `Exited (255)`
that `docker inspect`/`docker rm` can't touch ("no such container"
despite `ps -a` listing it), the container's containerd metadata is
corrupted (seen after abrupt Docker daemon restarts, e.g. WSL2 host
sleep/crash). Fix by removing it directly from containerd (needs
sudo — ask the user to run it):

```bash
sudo systemctl stop docker
sudo ctr -n moby tasks rm -f <full-container-id>
sudo ctr -n moby containers rm <full-container-id>
sudo rm -rf /var/lib/docker/containers/<full-container-id>
sudo systemctl start docker
```

Get the full ID via `docker ps -a --no-trunc`. This does not touch
the named volume (`work-governor_work-governor-pgdata`), so DB data
survives. After cleanup, `docker compose up -d` again.

## 2. Start the dev server

```bash
npm run dev
```

Runs on Turbopack, default port 3000. For a non-blocking launch:

```bash
nohup npm run dev > /tmp/dev-server.log 2>&1 &
disown
```

## 3. Verify

```bash
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:3000/
```

Expect `HTTP 200`.
