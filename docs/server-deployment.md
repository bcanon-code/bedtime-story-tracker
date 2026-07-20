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

The committed files do not choose a server host. This application reserves host
port block `12000-12009`: the frontend uses 12000, the API uses 12001, and the
remaining ports stay reserved. See
[`docker-host-port-policy.md`](docker-host-port-policy.md) before changing it.

## Configure the environment

From the repository root, create the ignored local configuration file:

```powershell
Copy-Item .env.server.example .env.server
```

Replace every placeholder in `.env.server`:

- `SERVER_HOST`: hostname or IP address that client browsers can reach.
- `SERVER_BIND_ADDRESS`: `127.0.0.1` for host-only access or the explicit trusted
  LAN IP when other machines must connect. Do not use `0.0.0.0` by default.
- `PORT_BLOCK_START`: first port of the registered ten-port block; 12000 here.
- `FRONTEND_PORT` and `API_PORT`: assigned ports inside the registered block.
- `FRONTEND_ORIGIN`: exact browser origin, such as
  `http://server-name:12000`; the API uses it as its single allowed CORS origin.
- `EXPO_PUBLIC_API_BASE_URL`: browser-visible API URL, such as
  `http://server-name:12001`. Expo embeds this public value into the web bundle at
  image build time; changing it requires rebuilding the frontend image.
- `ConnectionStrings__ApplicationDatabase`: container-compatible SQL Server
  connection string for the existing database.

For host-only access, use `SERVER_HOST=localhost` with
`SERVER_BIND_ADDRESS=127.0.0.1`. For access from other computers, use this
machine's trusted LAN IP as `SERVER_BIND_ADDRESS` and the matching browser-visible
hostname or IP as `SERVER_HOST`. The deployment script rejects inconsistent URL,
host, port, and loopback combinations.

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

The script refuses a dirty Git working tree. It validates `version.json` and the
server configuration, uses the version/build/SHA identity in both image tags,
applies OCI labels, and gives both builds one UTC timestamp. It recreates the
services, waits up to 180 seconds for health, then fails if `/version` differs from
the expected identity. Use `-EnvironmentFile` for another environment-file path or
`-StartupTimeoutSeconds` for a different bounded wait.

Before building, the script checks all ten registered ports for foreign Windows
listeners and Windows-excluded TCP ranges. Ports already owned by this Compose
project are allowed during upgrades.

Expected URLs are:

- Frontend: `http://SERVER_HOST:FRONTEND_PORT`
- API health: `http://SERVER_HOST:API_PORT/health`
- Scalar: `http://SERVER_HOST:API_PORT/scalar/v1`
- OpenAPI document: `http://SERVER_HOST:API_PORT/openapi/v1.json`

Scalar and OpenAPI are intentionally available because the container uses the
Development environment for local server testing, migrations, and seeding. Do not
expose them or this unauthenticated API to an untrusted network.

## Operate and troubleshoot

Run these commands from the repository root. Export the complete deployed identity
when calling Compose directly:

```powershell
$version = Get-Content -Raw version.json | ConvertFrom-Json
$env:APP_VERSION = $version.version
$env:BUILD_NUMBER = [string] $version.build
$env:GIT_SHA = git rev-parse --short HEAD
$env:IMAGE_TAG = "$($version.version)-build.$($version.build.ToString('000'))-$env:GIT_SHA"
$env:BUILD_DATE = '<original-UTC-build-timestamp>'
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
docker image inspect bedtime-story-tracker-web:<version-build-sha> --format '{{json .Config.Labels}}'
docker image inspect bedtime-story-tracker-api:<version-build-sha> --format '{{json .Config.Labels}}'
```

Previous versioned images are not pruned. For a manual rollback, first confirm both
previous images exist, then select their shared version/build/SHA and recreate
without a build:

```powershell
$env:APP_VERSION = '<previous-version>'
$env:BUILD_NUMBER = '<previous-build-number>'
$env:GIT_SHA = '<previous-git-sha>'
$env:IMAGE_TAG = '<previous-version>-build.<zero-padded-build>-<previous-git-sha>'
$env:BUILD_DATE = '<previous-UTC-build-timestamp>'
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
