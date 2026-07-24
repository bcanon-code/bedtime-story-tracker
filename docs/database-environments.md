# Database environments

The application uses three isolated SQL Server databases. Production is a future
Azure-hosted environment and is not implemented by this repository.

| Logical environment | ASP.NET Core environment | Database | Used by |
| --- | --- | --- | --- |
| DEV | `Development` | `BedtimeStoryTracker_Dev` | Default local development |
| DEMO | `Demo` | `BedtimeStoryTracker_Demo` | Optional local rehearsal |
| TEST | `Test` | `BedtimeStoryTracker_Test` | Docker Compose validation |

The API refuses to start when the configured connection string's database name
does not exactly match `DatabaseManagement:ExpectedDatabaseName`. This protects
against DEV, DEMO, and TEST collisions.

## Local DEV and DEMO

DEV is the safe default:

```powershell
.\scripts\Start-LocalDemo.ps1
# Equivalent:
.\scripts\Start-LocalDemo.ps1 -DatabaseEnvironment DEV
```

Select the preserved demonstration database explicitly:

```powershell
.\scripts\Start-LocalDemo.ps1 -DatabaseEnvironment DEMO
```

The launcher maps DEV to ASP.NET Core `Development` and DEMO to `Demo`, clears
any inherited connection-string override, and labels frontend build diagnostics
with the selected logical environment. Both local environments apply migrations
and idempotently insert missing fictional catalog data at API startup.

Reset commands remain local-only and require an exact database-name confirmation:

```powershell
.\scripts\Reset-Database.ps1 -Environment Development
.\scripts\Reset-Database.ps1 -Environment Demo
```

## Docker TEST

Docker Compose explicitly sets `ASPNETCORE_ENVIRONMENT=Test`. The safe,
non-secret settings in `appsettings.Test.json` require
`BedtimeStoryTracker_Test`, enable startup migrations, and seed missing
fictional catalog data. The real container-compatible connection string is
supplied through the ignored `.env.server` file:

```text
ConnectionStrings__ApplicationDatabase=Server=...;Database=BedtimeStoryTracker_Test;...
```

`Test` also enables Scalar/OpenAPI for packaged validation. Docker never selects
Development, Demo, or Production and cannot fall back to a tracked connection
string because no TEST connection string is stored in appsettings.

## Secrets and configuration hierarchy

ASP.NET Core loads shared `appsettings.json`, then the selected
environment-specific file, then environment variables. Local Windows-authenticated
DEV and DEMO connections are tracked because they contain no credentials.
Docker credentials belong only in ignored `.env.server`. `.env.server.example`
contains placeholders and the required TEST database name.

Do not commit passwords, tokens, real remote connection strings, or
`.env.server`.

## Production

Production is deferred to a future Azure-hosted environment. This checkpoint
does not provide a Production appsettings file, Docker environment, database,
credentials, deployment script, or Azure resources.
