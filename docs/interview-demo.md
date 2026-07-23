# Interview demo guide

## Demo objective

The primary deliverable is a React Native Web application written in TypeScript. Keep the walkthrough focused on the shared React Native component tree and complete bedtime-reading workflow. The ASP.NET Core API, SQL Server persistence, Docker packaging, and stored build provenance support that frontend story and demonstrate full-stack depth.

## Primary startup mode

The lowest-risk verified repository path is the local launcher:

```powershell
.\scripts\Start-LocalDemo.ps1
```

Prerequisites are Node.js/npm, the .NET 10 SDK, Google Chrome, and a local default SQL Server instance reachable at `localhost` with Windows authentication. Install the locked frontend dependencies with `npm ci` before interview day.

The launcher starts the API and Expo Web in separate PowerShell windows, waits for the API, waits for the frontend, and then opens the application and Scalar together in Chrome. Expected URLs:

- Application: `http://localhost:8081`
- API health: `http://localhost:5076/health`
- Scalar API reference: `http://localhost:5076/scalar/v1`
- API build metadata: `http://localhost:5076/version`

Before presenting, confirm that the health URL returns a successful response and that the application loads children and stories. API startup applies the existing migrations and seeds missing fictional demo data; it does not reset the database or seed completed sessions.

## Fallback startup mode

If the launcher fails because of its process or Chrome orchestration, start the same local architecture manually in two PowerShell terminals:

```powershell
dotnet run --project src/BedtimeStoryTracker.Api/BedtimeStoryTracker.Api.csproj
```

```powershell
$env:BROWSER = 'none'
npm run web
```

Then open `http://localhost:8081`, verify `http://localhost:5076/health`, and optionally open Scalar. This fallback uses the same prerequisites, ports, API, and database as the primary mode and is supported directly by the repository commands. Do not use Docker as an unrehearsed interview fallback; it adds environment-file, container, networking, and SQL-authentication dependencies.

## Five-minute walkthrough

1. Open `http://localhost:8081` and identify it as one TypeScript React Native application rendered for the web.
2. Complete the required pre-reading calmness check-in for both fictional children and optionally add a neutral note.
3. Select a story and let its detail load from the API.
4. Start reading, point out the updating timer, then finish reading.
5. Complete the required post-reading calmness check-in and optionally add a note.
6. Continue to the summary; show the duration, before/after values, derived changes, notes, and automatic-save status.
7. Select **Completed sessions** and show the newly saved record in the newest-first history.
8. Resize the same page to approximately 375 pixels and 1280 pixels; show the history changing between stacked and wider arrangements.
9. On the new history record, show version, build, Git SHA, and environment. Optionally compare them with the API `/version` response.
10. Explain one deliberate deferral: authentication and multi-tenancy would be required before treating family data as a real multi-user product, but were excluded from this interview demo.

## Responsive-component explanation

`CompletedSessionList` is one shared component. It calls `useWindowDimensions`, treats widths of 760 pixels or more as wide, and changes presentation styles by width: primary details become a row, observations wrap horizontally, and notes sit side by side. Narrow widths retain a stacked layout.

The DTOs, loading/error states, list rendering, accessibility behavior, event handlers, and API data are shared at every width. There is no duplicated web or native history component. Keeping one component and changing only its presentation reduces platform drift and keeps fixes in one place.

## Build-provenance explanation

The API creates the authoritative build metadata when it starts. When a new session is saved, the API—not the browser—stores the application version, build number, Git SHA, and environment with that session. The history response returns those stored values.

The provenance columns are nullable so sessions created before provenance was introduced remain honest: the UI displays **Build not recorded** instead of inventing metadata. Provenance can narrow regression investigation to a deployed build and environment; it provides traceability, not proof of root cause or automatic root-cause analysis.

## React and Web Forms talking points

- **Props:** explicit, typed inputs from a parent, comparable to control properties or parameters.
- **State:** client-side values that trigger declarative re-rendering, rather than values restored around a server postback.
- **Controlled components:** the parent owns the value and the child reports changes through a callback, making one-way data flow explicit.
- **Conditional rendering:** the visible workflow is derived from state instead of toggling server-control `Visible` properties.
- **Effects:** lifecycle-bound work such as API loading and timer setup/cleanup, rather than page lifecycle event handlers.
- **React Native primitives:** `View`, `Text`, `Pressable`, `TextInput`, `ScrollView`, and `FlatList` form a platform-neutral component vocabulary; React Native Web renders the same implementation in the browser.

## TypeScript talking points

- Typed DTOs document children, stories, save requests/responses, and completed-session history at the HTTP boundary.
- API functions centralize contracts, status handling, runtime JSON guards, and nullable provenance.
- Narrow workflow and save-status unions make valid UI states explicit.
- `CalmnessValue` restricts check-ins to `1 | 2 | 3 | 4 | 5`.
- Nullable types force old-session provenance and optional notes to be handled deliberately.
- `npx tsc --noEmit` validates identifiers, props, DTO fields, state transitions, and null handling without generating files.

## Known limitations

- React Native Web was manually tested previously; this checkpoint does not claim a new browser verification.
- Native Android and iOS remain unverified.
- Authentication and multi-tenancy are deferred.
- This is an interview demo using fictional data, not a production healthcare application.
- Provenance supports traceability, not automatic root-cause analysis.
- The workflow requires the API and SQL Server; there is no offline/mock mode.
- Refreshing clears the active in-memory workflow, although completed sessions are persisted.
- Automated end-to-end browser coverage is not present.

## Pre-interview checklist

- Confirm `git status --short` is clean.
- Confirm the intended commit with `git rev-parse HEAD`.
- Run `npx tsc --noEmit`.
- Run `dotnet build src/BedtimeStoryTracker.Api/BedtimeStoryTracker.Api.csproj`.
- Confirm the local SQL Server database is available.
- Start the application before the interview.
- Confirm history contains known records.
- Test approximately 375-pixel and 1280-pixel widths.
- Check the browser console for unexpected errors.
- Keep the two fallback commands ready.
- Close unrelated windows.
- Disable notifications.

## Shutdown

For primary or fallback local mode, press Ctrl+C in both the API and Expo PowerShell windows, or close both windows. Closing Chrome does not stop either process.

If the rehearsed Docker deployment was used, run this from the same PowerShell session that ran `Deploy-Server.ps1`:

```powershell
docker compose --env-file .env.server -f compose.server.yml down
```

## Ten-minute manual verification

These checks are intentionally left for the presenter and are not claimed as passed by this document:

1. Start the primary demo mode.
2. Confirm the frontend opens.
3. Confirm children and stories load.
4. Complete one full session.
5. Confirm automatic save.
6. Open completed-session history.
7. Confirm provenance appears on the new record.
8. Test approximately 375-pixel width.
9. Test approximately 1280-pixel width.
10. Confirm no browser-console errors.
11. Practice the five-minute walkthrough.
12. Practice the responsive-component explanation.
13. Practice the provenance explanation.
14. Test the fallback startup method.
