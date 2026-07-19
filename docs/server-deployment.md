# Local testing server deployment

This guide runs the Expo web export and ASP.NET Core API as versioned Docker
containers on a trusted local network. SQL Server remains external. This is a
testing deployment, not production hosting: it uses HTTP, has no authentication,
and exposes Development-only Scalar/OpenAPI and startup migrations.

## Prerequisites and required server facts

Install Git, Docker Engine, Docker Compose v2, and PowerShell 5.1 or later on the
server. Before deploying, confirm the target operating system and CPU architecture,
Docker Engine and Compose versions, server IP address or DNS name, available
frontend and API ports, SQL Server host reachable from Docker, SQL authentication
method, and whether an image registry exists. The deployment builds locally and
does not require or use a registry.

The committed files do not choose a server host. The default example ports are
8080 for the frontend and 8081 for the API; change them if they conflict with
another service or the server firewall policy.

## Configure the environment

From the repository root, create the ignored local configuration file:

```powershell
Copy-Item .env.server.example .env.server
```

Replace every placeholder in `.env.server`:

- `SERVER_HOST`: hostname or IP address that client browsers can reach.
- `FRONTEND_PORT` and `API_PORT`: free host ports.
- `FRONTEND_ORIGIN`: exact browser origin, such as
  `http://server-name:8080`; the API uses it as its single allowed CORS origin.
- `EXPO_PUBLIC_API_BASE_URL`: browser-visible API URL, such as
  `http://server-name:8081`. Expo embeds this public value into the web bundle at
  image build time; changing it requires rebuilding the frontend image.
- `ConnectionStrings__ApplicationDatabase`: container-compatible SQL Server
  connection string for the existing database.

Secrets stay in `.env.server`, which Git ignores. Never commit this file.

### SQL Server connectivity

The workstation Development configuration uses `Trusted_Connection=True`
(Windows integrated authentication) against `localhost`. A Linux API container
cannot normally reuse that Windows identity without separate domain/Kerberos
configuration. For this checkpoint, use a dedicated least-privilege SQL login or
provide separately engineered integrated authentication. Do not put credentials in
tracked files.

Confirm from the Docker server that DNS/routing and the SQL Server TCP port are
reachable. `localhost` inside the API container means the container itself, not the
Docker host or SQL server. SQL Server should not be exposed beyond the networks
that need it.

In Development, API startup applies existing EF Core migrations and idempotently
seeds missing fictional children and stories. It does not reset the database or
seed completed sessions. Startup migrations are a demo/testing convenience, not a
recommended production migration strategy.

## Deploy

Run:

```powershell
.\scripts\Deploy-Server.ps1
```

The script refuses a dirty Git working tree unless
`-AllowDirtyWorkingTree` is supplied intentionally. It validates configuration,
uses the current short Git SHA in both image tags and OCI revision labels, builds
both images, recreates the services, and waits up to 180 seconds for both health
checks. Use `-EnvironmentFile` for another environment-file path or
`-StartupTimeoutSeconds` for a different bounded wait.

Expected URLs are:

- Frontend: `http://SERVER_HOST:FRONTEND_PORT`
- API health: `http://SERVER_HOST:API_PORT/health`
- Scalar: `http://SERVER_HOST:API_PORT/scalar/v1`
- OpenAPI document: `http://SERVER_HOST:API_PORT/openapi/v1.json`

Scalar and OpenAPI are intentionally available because the container uses the
Development environment for local server testing, migrations, and seeding. Do not
expose them or this unauthenticated API to an untrusted network.

## Operate and troubleshoot

Run these commands from the repository root. Export the currently deployed SHA
when calling Compose directly:

```powershell
$env:DEPLOYMENT_VERSION = git rev-parse --short HEAD
docker compose --env-file .env.server -f compose.server.yml ps
docker compose --env-file .env.server -f compose.server.yml logs --tail 200 api
docker compose --env-file .env.server -f compose.server.yml logs --tail 200 frontend
docker compose --env-file .env.server -f compose.server.yml restart api
docker compose --env-file .env.server -f compose.server.yml down
```

Both services use `restart: unless-stopped`, so Docker restarts them after a process
failure or Docker/server restart unless an operator explicitly stopped them. No
source code, development certificate, or database volume is mounted.

Common failures:

- Placeholder/missing values: update `.env.server` and redeploy.
- Frontend loads but API calls fail: verify the embedded API URL, exact frontend
  origin, server firewall, and browser reachability; rebuild after URL changes.
- API is unhealthy: inspect API logs, SQL credentials, SQL encryption settings,
  DNS, routing, and SQL Server TCP access.
- Migration fails: verify the SQL login can read/write the target database and
  apply the existing migrations.
- Port already allocated: select unused host ports and update both URLs.
- Scalar is missing: confirm `ASPNETCORE_ENVIRONMENT=Development` remains set for
  this testing-only Compose deployment.

Firewall changes, reverse proxies, HTTPS termination, certificates, domain setup,
backup, secret management, and registry workflows are outside this checkpoint.

## Upgrade, verify, and roll back

To upgrade, update the repository to the intended clean Git revision, review
`.env.server`, and rerun `Deploy-Server.ps1`. Confirm the deployed SHA printed by
the script and inspect image metadata if needed:

```powershell
docker image inspect bedtime-story-tracker-web:<git-sha> --format '{{json .Config.Labels}}'
docker image inspect bedtime-story-tracker-api:<git-sha> --format '{{json .Config.Labels}}'
```

Previous versioned images are not pruned. For a manual rollback, first confirm both
previous images exist, then select their shared short SHA and recreate without a
build:

```powershell
$env:DEPLOYMENT_VERSION = '<previous-git-sha>'
docker compose --env-file .env.server -f compose.server.yml up -d --no-build --force-recreate
docker compose --env-file .env.server -f compose.server.yml ps
```

Rollback changes only application containers. It does not reverse database schema
changes, so compatibility must be assessed manually before rollback.

## Target-server manual verification

These checks must be performed by the operator; local validation does not prove the
target server works.

### Server setup and deployment

1. Confirm Docker Engine is running.
2. Confirm `docker compose version` works.
3. Clone or update the repository to the intended revision.
4. Create `.env.server` from `.env.server.example`.
5. Set the target server hostname or IP.
6. Set free frontend and API ports.
7. Set the API URL visible to client browsers.
8. Set a container-compatible SQL Server connection string.
9. Confirm the Docker host can reach SQL Server.
10. Run `.\scripts\Deploy-Server.ps1`.
11. Confirm both containers report healthy.

### Application workflow

12. Open the frontend URL from another machine.
13. Confirm children and stories load.
14. Open the API `/health` URL.
15. Open Scalar at `/scalar/v1` while still on the trusted network.
16. Complete a full reading session.
17. Confirm the completed session saves in SQL Server.

### Restart and reboot

18. Restart the API container.
19. Confirm the frontend recovers.
20. Confirm saved data remains.
21. Reboot the Docker server.
22. Confirm both services return automatically.
23. Confirm `restart: unless-stopped` behaves as expected.

### Versioning and rollback

24. Deploy a second Git revision.
25. Confirm both new image tags contain its short Git SHA.
26. Confirm the running version changed.
27. Perform the documented manual rollback to the earlier SHA.
28. Confirm the earlier version runs, accounting for database compatibility.

### Logs and secret safety

29. Check both container logs for errors.
30. Run `git status --short` and `git ls-files .env.server`; confirm no secret file
    is tracked.

HTTP is acceptable only on a trusted local testing network. This application has
no authentication and is not production-ready.
