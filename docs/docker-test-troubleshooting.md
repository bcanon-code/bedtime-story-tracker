# Docker TEST troubleshooting

Docker Compose packages the frontend and API for full-stack TEST validation.
SQL Server remains external to Compose and must be reachable from the API
container.

## Normal workflow

1. Copy `.env.server.example` to ignored `.env.server`.
2. Configure a reachable SQL Server and the dedicated
   `BedtimeStoryTracker_Test` database.
3. Run `.\scripts\Test-ServerDeployment.ps1`.
4. After preflight passes, run `.\scripts\Deploy-Server.ps1`.

Preflight parses the connection string without printing credentials. It requires
the exact TEST database name and rejects empty, LocalDB, loopback,
integrated-authentication, DEV, and DEMO targets. The deploy script validates
`/health` and `/version`; the reported environment must be `TEST`.

TEST applies migrations and idempotently inserts missing fictional catalog data
at startup. This is packaged validation behavior, not a production migration
strategy.

## Diagnostics

Run:

```powershell
.\scripts\Collect-DockerDiagnostics.ps1
```

The ignored `diagnostics` directory receives a redacted folder and ZIP containing
Compose state, logs, health/version probes, safe SQL checks, Git state, and image
identity. The collector does not copy `.env.server` or intentionally print its
connection string.

Useful direct checks:

```powershell
docker compose --env-file .env.server -f compose.server.yml ps -a
docker compose --env-file .env.server -f compose.server.yml logs api --tail 200
Invoke-RestMethod http://<server-host>:<api-port>/health
Invoke-RestMethod http://<server-host>:<api-port>/version
```

Review generated diagnostics before sharing them. The scripts do not prune
images, delete volumes, or create Production/Azure resources.
