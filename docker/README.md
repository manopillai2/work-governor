# Dockerized stack (parallel to the native local setup)

Three independent services, each with its own `docker-compose.yml`, meant to be
started/stopped/checked on individually. They talk to each other over a
shared external Docker network, since each folder is its own Compose project.

- `docker/postgres/` — Postgres 16, the main app's data (applications,
  controls, chat messages, backups). Own named volume
  (`work-governor-docker-pgdata`). Host port `5432`.
- `docker/learning-db/` — Postgres 16, dedicated to the Learning Engine
  (`learnings` / `learning_notes` tables). Fully separate database and
  volume (`work-governor-learning-pgdata`) from the main app's Postgres —
  intentionally not sharing a schema or a container. Host port `5433`
  (5432 is taken by `docker/postgres/`).
- `docker/web/` — the whole Next.js app (React + API routes), built from
  the project root as its Docker build context. Talks to both Postgres
  instances over the internal Docker network.

`web` and `postgres` are configured for the **same ports** as the native
setup (`3000` and `5432`), so only one of native or Docker can run at a
time for those two. Stop the native app (`npm run dev` / `docker compose
down` at the project root) before starting this stack. `learning-db` has
no native equivalent, so it doesn't have this conflict.

## One-time setup

Create the shared network (only needs to be done once):

```bash
docker network create work-governor-net
```

## Starting each service manually

```bash
cd docker/postgres
docker compose up -d
docker compose ps      # check status / wait for "healthy"
```

```bash
cd docker/learning-db
docker compose up -d
docker compose ps
```

```bash
cd docker/web
docker compose up -d   # builds the image on first run
docker compose ps
```

## Pushing the schema into each Postgres instance

Main app DB — since this Postgres container also exposes port 5432 on the
host, you can run the existing Drizzle scripts from the project root
against it (as long as the native postgres container isn't also bound to
5432 at the same time):

```bash
npm run db:push
```

Learning Engine DB (its own separate schema/config, port 5433):

```bash
npm run db:learning:push
```

## Stopping

```bash
cd docker/web && docker compose down
cd docker/postgres && docker compose down          # add -v to also wipe the volume
cd docker/learning-db && docker compose down        # add -v to also wipe the volume
```

## Env files

- `docker/web/.env.docker`, `docker/postgres/.env.docker`, and
  `docker/learning-db/.env.docker` hold real credentials (gitignored) —
  mirrors of the root `.env.local` values, but with `DATABASE_URL` /
  `LEARNING_DATABASE_URL` pointing at the Compose service hostnames
  (`postgres`, `learning-postgres`) instead of `localhost`, since `web`
  reaches both over the Docker network, not the host loopback.
- `.env.docker.example` files are committed and show the shape without
  secrets.
