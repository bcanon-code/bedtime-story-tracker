# Application versioning

`version.json` is the one tracked release source. Its `version` is a Semantic
Versioning core value and its positive integer `build` identifies packaged
deployment candidates. Git SHA, dirty state, UTC build time, and environment are
generated metadata and are never written back to that file.

## Bump and build rules

Run exactly one explicit release action:

```powershell
.\scripts\Set-Version.ps1 -Increment Patch
.\scripts\Set-Version.ps1 -Increment Minor
.\scripts\Set-Version.ps1 -Increment Major
.\scripts\Set-Version.ps1 -Increment BuildOnly
```

Every action increments `build`. Patch, Minor, and Major update SemVer and reset
subordinate components; BuildOnly leaves SemVer unchanged. The script only edits
`version.json`: it does not commit, tag, push, build, or deploy. Local development
does not increment anything.

Local Expo runs derive the tracked version and current Git state through
`app.config.js`, for example `v1.0.0-dev | Local Development | 9472d2f-dirty`.
Docker builds receive one fixed metadata set from the deployment script. UTC is
canonical; local time is presentation only. A display can therefore render:

```text
v1.4.2 | 2026-06-30 14:35 ET | Build 027
Commit 73c78f1 | Server
```

The frontend uses public `EXPO_PUBLIC_APP_VERSION`, `BUILD_NUMBER`, `GIT_SHA`,
`GIT_DIRTY`, `BUILD_TIME_UTC`, and `BUILD_ENVIRONMENT` values. They contain no
secrets. The initial screen shows a compact identity with a detailed accessibility
label. `GET /version` returns the separate fields plus `displayVersion`; `/health`
is unchanged.

## Deploy and verify

Commit an intentional version bump, ensure the tree is clean, configure
`.env.server`, then run `.\scripts\Deploy-Server.ps1`. It calculates one SHA and
UTC timestamp, builds both services, waits for health, compares `/version`, and
fails on a mismatch. Images receive OCI title, version, revision, created, and
source labels.

Immutable tags use:

```text
bedtime-story-tracker-web:1.4.2-build.027-73c78f1
bedtime-story-tracker-api:1.4.2-build.027-73c78f1
```

Both also receive `server-current`. Inspect with:

```powershell
docker image inspect bedtime-story-tracker-web:server-current --format '{{json .Config.Labels}}'
docker image inspect bedtime-story-tracker-api:server-current --format '{{json .Config.Labels}}'
Invoke-RestMethod http://SERVER_HOST:API_PORT/version
```

After verification, an optional manual annotated tag is:

```powershell
git tag -a v1.4.2-build.027 -m "Bedtime Story Tracker v1.4.2 build 027"
```

## Roll back

Find the prior matching immutable API and web tags with `docker image ls`. Set
`APP_VERSION`, `BUILD_NUMBER`, `GIT_SHA`, and `IMAGE_TAG` to that identity, retain
the original `BUILD_DATE`, and run Compose with `up -d --no-build --force-recreate`.
Then call `/version`. Rollback does not reverse database changes; assess schema
compatibility first. `server-current` is only a convenience pointer and is not a
rollback record.

Expo native store build numbers and native binary version automation are outside
this web-only checkpoint. No EAS Build or Expo Updates configuration is added.
