# Docker host port policy

This Windows Docker host reserves application ports in blocks of ten. The registry
records reservations even while containers are stopped; an empty listener check
alone does not make a registered port available.

## Policy

- Reserve `10000-19999` for locally managed Docker applications.
- Give each application one aligned block of ten ports.
- Keep container ports conventional; only host ports must be unique.
- Publish only browser- or host-facing services.
- Bind host-only applications to `127.0.0.1`.
- Bind LAN applications to one explicit trusted LAN IP, not every interface.
- Reserve ports 80 and 443 for a future shared reverse proxy.
- Use a unique Compose project name and avoid fixed `container_name` values.
- Check Windows listeners, Docker mappings, excluded ranges, and this registry
  before assigning a block.

## Registry

| Port block | Application | Project name | Assignments |
|---|---|---|---|
| `12000-12009` | Bedtime Story Tracker | `bedtime-story-tracker` | `12000` frontend, `12001` API, `12002-12009` reserved |

Add every future application before using its ports. Suggested next blocks are
`12010-12019`, `12020-12029`, and so on.

## Preflight

Run the repository checker before first deployment or after changing the block:

```powershell
.\scripts\Test-DockerPortBlock.ps1
```

The checker rejects active foreign listeners and Windows-excluded TCP ranges. It
allows ports already published by the `bedtime-story-tracker` Compose project so
normal upgrades can reuse their current bindings.

For a different allocation:

```powershell
.\scripts\Test-DockerPortBlock.ps1 -StartPort 12010 -BlockSize 10 -ComposeProjectName application-b
```

The host-level `PORTS.md` outside individual application repositories is the
authoritative registry. This repository table documents only this application's
reservation and should remain consistent with that central registry.
