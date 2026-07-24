# Docker production troubleshooting

The server deployment runs two containers on the `bedtime-story-tracker-server`
network. The browser connects to the frontend host port and directly to the API
host port. The API connects to an externally managed SQL Server; this project
does not run SQL Server in Docker.

## Normal workflow

1. Copy `.env.server.example` to the ignored `.env.server`.
2. Configure a reachable SQL Server and the dedicated production database
   `BedtimeStoryTracker_Prod`.
3. Run the non-destructive preflight:

   ```powershell
   .\scripts\Test-ServerDeployment.ps1
   ```

4. After every check passes and the Git tree is clean, deploy:

   ```powershell
   .\scripts\Deploy-Server.ps1
   ```

The deploy script runs preflight before building. It waits for API health before
the frontend starts, checks `/health` and `/version`, and verifies the reported
image identity. If startup fails after containers are started, it automatically
collects diagnostics and leaves the failed containers available for inspection.

## Database separation and permissions

Local Development uses `BedtimeStoryTracker_Dev`; the local Demo launcher uses
`BedtimeStoryTracker_Demo`; Docker Production uses
`BedtimeStoryTracker_Prod`. Preflight parses the connection string in memory and
rejects an empty, LocalDB, loopback, integrated-authentication, Development,
Demo, or unexpected database target without printing credentials.

Production has `ApplyMigrations=false` and `SeedDemoData=false`. A separately
authorized database administrator must create the one production database,
apply reviewed migrations, create/map the runtime database user, and grant only
the application permissions it needs. The runtime login must not receive
`sysadmin` or `dbcreator`. Diagnostics never create databases, apply migrations,
or change permissions.

## Collecting a failure bundle

Run:

```powershell
.\scripts\Collect-DockerDiagnostics.ps1
```

Output is written to `diagnostics\docker-<timestamp>` and a neighboring ZIP.
The bundle includes Compose state and images, service logs, exit/restart/health
history, health commands, listeners, environment-variable names, image labels,
networks, redacted effective Compose configuration, internal `/health` and
`/version` probes, SQL DNS/TCP evidence, safe SQL database tests where possible,
Git state, and application identity.

Common categories are DNS resolution, TCP unreachable, TLS/certificate failure,
SQL authentication failure, missing database, missing user mapping, denied
CONNECT, insufficient schema/migration permission, denied CREATE DATABASE, EF
migration failure, migration-history mismatch, application-query failure, and
unknown database error. A later check is reported as `NOT TESTED` when a
prerequisite prevents it.

Useful direct inspections:

```powershell
docker compose --env-file .env.server -f compose.server.yml ps -a
docker compose --env-file .env.server -f compose.server.yml logs api --tail 200
docker inspect bedtime-story-tracker-api-1 --format '{{json .State.Health}}'
Invoke-RestMethod http://<server-host>:<api-port>/health
Invoke-RestMethod http://<server-host>:<api-port>/version
```

`/health` checks both API liveness and SQL connectivity. `/version` reports the
safe version/build/revision identity. Review the database shown by preflight and
the Settings screen to verify production isolation.

## Before sharing diagnostics

The collector never copies `.env.server`; it writes variable names and a
redacted template. It redacts connection strings, passwords, user IDs, tokens,
and secrets, then scans generated files. Always review the folder and ZIP
yourself before sharing:

```powershell
Get-ChildItem .\diagnostics\docker-* -File -Recurse |
  Select-String -Pattern 'Password=|Pwd=|User Id=|UID=|Token=|Secret=|ConnectionStrings__'
```

The scripts never create/drop a database, grant permissions, prune Docker,
delete volumes, remove failed containers, publish images, or expose the real
environment file. Correct only the categorized prerequisite, rerun preflight,
then redeploy.
