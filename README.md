# Bedtime Story Tracker

Bedtime Story Tracker is a small React Native Web and TypeScript interview demo for recording a fictional bedtime reading session. It includes a deliberately scoped ASP.NET Core API that persists the fictional children and story catalog in local SQL Server; session workflow state remains frontend-only and in memory.

## Demo use case

A parent records an observed calmness value for each fictional child, optionally adds a note, chooses an original sample story, and reads it while an elapsed timer runs. After reading, the parent records another check-in and optional note, then reviews a session summary and can reset the app to begin again.

## Technology stack

- Expo 57.0.6
- React 19.2.3
- React Native 0.86.0
- React Native Web 0.21.2
- TypeScript 6.0.3 in strict mode
- Local React state
- Typed JSON story data
- ASP.NET Core .NET 10 API with built-in OpenAPI and Scalar
- EF Core 10 with local SQL Server

## Prerequisites

- Node.js and npm
- .NET SDK 10
- A local default SQL Server instance accessible as `localhost` with Windows authentication
- The `dotnet-ef` 10 tool

The repository does not declare a required Node.js or npm version. Use a Node.js version supported by Expo 57. The committed npm lockfile is lockfile version 3.

## Installation

```bash
npm install
```

## Run the web application

```bash
npm run web
```

Expo starts the development server and prints the local web URL in the terminal. Open that URL if a browser does not open automatically.

## Run the API

The development connection string in `src/BedtimeStoryTracker.Api/appsettings.Development.json` targets only `BedtimeStoryTrackerDemo` on `localhost` using Windows authentication. Verify that server name for your machine before starting:

```bash
dotnet run --project src/BedtimeStoryTracker.Api/BedtimeStoryTracker.Api.csproj
```

In Development, API startup applies EF Core migrations and idempotently inserts missing fictional demo children and stories. This is a local-demo convenience, not a production migration strategy. The API is available at `http://localhost:5076`; Scalar is at `http://localhost:5076/scalar/v1`.

To drop and recreate only the demo database from migrations, then seed it on the next API start:

```powershell
.\scripts\Reset-Database.ps1
```

To launch the API and Expo Web together and open the frontend and Scalar in Chrome:

```powershell
.\scripts\Start-LocalDemo.ps1
```

For a versioned Docker deployment on a trusted local testing server, see
[`docs/server-deployment.md`](docs/server-deployment.md).
The shared release identity and explicit bump workflow are documented in
[`docs/versioning.md`](docs/versioning.md).
The shared host-port allocation convention is documented in
[`docs/docker-host-port-policy.md`](docs/docker-host-port-policy.md).

## Validation

```bash
npx tsc --noEmit
dotnet build src/BedtimeStoryTracker.Api/BedtimeStoryTracker.Api.csproj
```

The same TypeScript check is also available as `npm run typecheck`. This repository does not define lint or automated test scripts.

## Implemented workflow

1. Select a required pre-reading calmness value for Avery and Jordan.
2. Optionally enter pre-reading notes.
3. Continue after both required values are present; the story-selection step remains locked until then.
4. Select a story from the JSON-backed catalog.
5. Begin reading the selected story in the low-light reading view.
6. Follow the visibly updating elapsed timer and use the persistent reading controls.
7. Finish reading, which stops the timer and preserves the elapsed duration.
8. Select a required post-reading calmness value for both children.
9. Optionally enter post-reading notes.
10. Review the selected story, duration, before/after values, derived calmness changes, and any notes in the session summary.
11. Reset with **Start another session**, which returns the app to its initial workflow.

## Architecture overview

- [`index.ts`](index.ts) registers the Expo root component.
- [`App.tsx`](App.tsx) coordinates the workflow and its local state. Conditional rendering selects the setup, reading, post-reading, or summary view.
- [`src/components/CalmnessSelector.tsx`](src/components/CalmnessSelector.tsx) is a reusable controlled component with typed values, props, and change events.
- [`src/data/stories.json`](src/data/stories.json) contains the original fictional stories and remains the API's embedded development seed source; it is no longer a frontend runtime data source. [`src/data/storyCatalog.ts`](src/data/storyCatalog.ts) defines the frontend story model.
- [`src/api/bedtimeApi.ts`](src/api/bedtimeApi.ts) uses `fetch` to load typed children, story summaries, and selected story detail. The API base URL defaults to `http://localhost:5076` and can be overridden with `EXPO_PUBLIC_API_BASE_URL`.
- [`src/BedtimeStoryTracker.Api`](src/BedtimeStoryTracker.Api) contains the single ASP.NET Core API project, EF Core context and migrations, fictional seed data, and read-only child/story endpoints.
- A `useEffect` in `App.tsx` owns the timer interval and cleanup for the reading step.
- [`src/theme.ts`](src/theme.ts) centralizes low-light colors, spacing, and radius tokens.

Session state remains in memory and flows down through props. Required-value completeness and calmness changes are derived from the current state rather than stored separately. The API integration is read-only; completed sessions are not sent to the backend.

## Important design decisions

- Local React state instead of Redux or Zustand keeps the small demo direct and reviewable.
- Conditional rendering replaces a navigation dependency for this linear workflow.
- The local API is the frontend's single runtime source for fictional children and stories; the JSON catalog remains seed data only.
- Persistent reading controls keep the timer and finish action available while story text scrolls.
- The low-light, phone-focused interface supports the intended bedtime reading context.
- Validation state and calmness changes are derived to avoid duplicated state.
- Session workflow state intentionally remains frontend-only and in memory.

## Current limitations

- No saved session history or write API integration
- No authentication
- No analytics or recommendations
- No claim of medical or behavioral effectiveness
- Refreshing the page resets all in-memory state
- Story filters exist in the mock data schema but are not implemented in the interface
- A second complete session after reset still requires explicit final manual confirmation; only starting another session has been confirmed

## Possible future improvements

- Two-child preferences or nightly first-choice rotation
- Local session history
- Story filters
- Additional accessibility refinement
- One focused automated workflow test

## Interview talking points

- Moving from event-driven Web Forms to declarative React views derived from state
- Using typed props, state, and narrow value unions to make invalid states harder to represent
- Building a reusable controlled input with one-way data flow
- Managing interval lifecycle and cleanup with `useEffect`
- Deriving validation and summary values instead of synchronizing duplicate state
- Controlling scope with local state, a linear workflow, and no unnecessary dependencies
- Building functionality through focused incremental Git commits
- Describing limitations and verification status honestly

## Data and privacy

Avery and Jordan are fictional names. Notes are entered only at runtime and are not saved. The local database contains only the fictional children and original story catalog; no real child or private family data is included in the application content.
