# SQL Server environment isolation

The API uses one EF Core SQL Server model and three physically separate databases.
Environment selection follows standard ASP.NET Core configuration precedence:
`appsettings.json`, `appsettings.{Environment}.json`, user secrets or an ignored
environment file for local work, and deployment environment variables.

| Environment | Database | Schema updates | Demo seed data | OpenAPI/Scalar |
| --- | --- | --- | --- | --- |
| Development | `BedtimeStoryTracker_Dev` | Applied at startup | Idempotently inserted | Enabled |
| Demo | `BedtimeStoryTracker_Demo` | Applied at startup | Idempotently inserted | Enabled |
| Production | `BedtimeStoryTracker_Prod` | External deployment step | Never inserted | Disabled |

The API compares the connection string's database name with
`DatabaseManagement:ExpectedDatabaseName` and refuses to start on a mismatch.
This guard reduces the risk of running a Development or Demo process against
Production. It is an additional check, not a replacement for separate SQL
credentials, network controls, backups, and least-privilege permissions.

## Development

IDE launch profiles use `ASPNETCORE_ENVIRONMENT=Development`. The tracked local
connection uses Windows authentication and targets only
`BedtimeStoryTracker_Dev`. Startup migration and fictional-data seeding
favor fast developer iteration.

Reset it explicitly with:

```powershell
.\scripts\Reset-Database.ps1 -Environment Development
```

## Demo

The interview launcher and trusted-local-server Compose deployment use
`ASPNETCORE_ENVIRONMENT=Demo`. Local Demo targets only
`BedtimeStoryTracker_Demo`; Compose overrides its connection string from the
ignored `.env.server`.

Reset the local Demo database with:

```powershell
.\scripts\Reset-Database.ps1 -Environment Demo
```

Demo startup applies existing migrations and inserts missing fictional catalog
data. Do not use Demo configuration for real or sensitive data.

## Production

Production has no tracked connection string. Supply secrets through the hosting
platform's secret store or environment variables:

```text
ASPNETCORE_ENVIRONMENT=Production
ConnectionStrings__ApplicationDatabase=<production SQL Server connection>
FrontendOrigin=https://<production-frontend>
```

The production connection must target `BedtimeStoryTracker_Prod`. Use a
dedicated application login with only the permissions required at runtime. Use a
separate, short-lived deployment identity to apply reviewed migrations before
starting the new application version; the runtime process does not migrate or
seed Production. Require encrypted SQL connections with a trusted certificate,
restrict network access, protect backups, test restores, and monitor failed
connections and migration activity.

Generate a reviewable migration script from the repository:

```powershell
dotnet ef migrations script --idempotent `
  --project src\BedtimeStoryTracker.Api\BedtimeStoryTracker.Api.csproj `
  --startup-project src\BedtimeStoryTracker.Api\BedtimeStoryTracker.Api.csproj `
  --output artifacts\BedtimeStoryTracker_Prod.sql
```

Review and execute that artifact through the approved production deployment
process using the migration identity. Never run `Reset-Database.ps1` against
Production; the script accepts only Development or Demo.

## Configuration rules

- Never commit database passwords, tokens, or production connection strings.
- Use different SQL logins for Development, Demo, Production runtime, and
  Production migrations.
- Keep database names explicit and environment-specific.
- Back up Production before schema changes and verify restore procedures.
- Promote the same reviewed migrations between environments; do not maintain
  environment-specific schemas.
- Treat automatic migration and fictional seeding as Development/Demo
  conveniences only.
