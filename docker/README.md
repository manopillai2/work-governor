# Dockerized stack (parallel to the native local setup)

Two independent services, each with its own `docker-compose.yml`, meant to be
started/stopped/checked on individually. They talk to each other over a
shared external Docker network, since each folder is its own Compose project.

- `docker/postgres/` — Postgres 16, same credentials as the native setup,
  own named volume (`work-governor-docker-pgdata`), separate from the
  native container's volume.
- `docker/web/` — the whole Next.js app (React + API routes), built from
  the project root as its Docker build context.

Both are configured for the **same ports** as the native setup
(`3000` for web, `5432` for postgres), so only one of the two — native or
Docker — can run at a time. Stop the native app (`npm run dev` /
`docker compose down` at the project root) before starting this stack.

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
cd docker/web
docker compose up -d   # builds the image on first run
docker compose ps
```

## Pushing the schema into this Postgres instance

Since this Postgres container also exposes port 5432 on the host, you can
run the existing Drizzle scripts from the project root against it (as long
as the native postgres container isn't also bound to 5432 at the same time):

```bash
npm run db:push
```

## Stopping

```bash
cd docker/web && docker compose down
cd docker/postgres && docker compose down   # add -v to also wipe the volume
```

## Env files

- `docker/web/.env.docker` and `docker/postgres/.env.docker` hold real
  credentials (gitignored) — mirrors of the root `.env.local` values, but
  with `DATABASE_URL` pointing at the `postgres` service hostname instead
  of `localhost`, since `web` reaches Postgres over the Docker network,
  not the host loopback.
- `.env.docker.example` files are committed and show the shape without
  secrets.
