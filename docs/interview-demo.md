# Interview demo guide

## Fastest startup and primary mode

Use the local API plus Expo Web. This directly demonstrates the React Native frontend and its typed HTTP integration while avoiding the additional Docker health, networking, and SQL permission failure points.

From the repository root, run:

```powershell
.\scripts\Start-LocalDemo.ps1
```

The launcher starts the ASP.NET Core API, waits for `http://localhost:5076/health`, starts Expo Web, waits for `http://localhost:8081`, and opens the frontend and Scalar (`http://localhost:5076/scalar/v1`) in one Chrome window. It requires Node/npm, .NET 10, Chrome, and a reachable local default SQL Server instance with Windows authentication. If SQL Server is unavailable, inaccessible, or cannot accept migrations, the API does not become healthy and the launcher times out. If Docker is unavailable, this primary mode is unaffected.

`npm run web` is useful for starting only Expo, but it is not a functional offline demo mode: the workflow still requires the API at `http://localhost:5076` unless `EXPO_PUBLIC_API_BASE_URL` is set to another working API.

## Fallback mode

Use the versioned Docker deployment only if it has been started and fully rehearsed on the interview machine immediately beforehand. It packages the frontend and API, but it still depends on Docker health, SQL connectivity, container permissions, and correct environment configuration. Current local diagnostics contain a database bootstrap failure (`CREATE DATABASE permission denied in database 'master'`), so an unverified Docker start is not a safe fallback.

If the launcher itself is the only problem (for example, Chrome discovery), start the same primary mode manually in two terminals:

```powershell
dotnet run --project src/BedtimeStoryTracker.Api/BedtimeStoryTracker.Api.csproj
npm run web
```

Then open `http://localhost:8081` and optionally `http://localhost:5076/scalar/v1`.

## Five-minute walkthrough

1. Start `.\scripts\Start-LocalDemo.ps1` and show the React Native Web UI at `http://localhost:8081`.
2. Open `App.tsx`: explain that it owns the small linear workflow, API loading state, selections, timer, notes, and save status in local React state.
3. Open `CalmnessSelector.tsx`: show the narrow `CalmnessValue` union and controlled `value`/`onChange` props.
4. In the UI, point out that fictional children and story summaries were loaded through the API client.
5. Complete both pre-reading calmness selections and optionally enter a short note.
6. Select a story, wait for its detail to load, and begin reading.
7. Show the elapsed timer. Explain that a `useEffect` creates the interval only during the reading state and clears it when that state ends or the component unmounts.
8. Finish reading, complete both post-reading selections, and continue to the summary.
9. Show `SessionSummaryCard`, the before/after comparison, duration, automatic save status, retry-on-failure action, and reset action.
10. Briefly open `apiTypes.ts` and `bedtimeApi.ts`: explain DTO contracts, runtime response guards, non-success HTTP handling, and the configurable API base URL.
11. Optionally show Scalar or the persisted session endpoint as supporting full-stack depth; keep the focus on the frontend.
12. Close with one deliberate deferral: authentication and multi-tenancy were excluded to keep the interview workflow small and reviewable.

## Architecture and TypeScript talking points

- `index.ts` registers `App.tsx` with Expo. The same React Native component tree is bundled for web; core UI uses `View`, `Text`, `Pressable`, `TextInput`, and `ScrollView`, with no browser-only elements.
- `App.tsx` remains the workflow orchestrator because the flow is small and linear. Extracted components represent genuinely reusable or distinct responsibilities, while API access, theme tokens, formatting, build metadata, and domain/API types live outside it.
- Local state is enough for one screen and avoids Redux or Zustand ceremony. Values derived from current state are not stored again.
- Built-in `fetch` is adequate for four endpoints. The API client centralizes the base URL, HTTP checks, response validation, and user-appropriate errors.
- DTO interfaces document the HTTP boundary; `CalmnessValue` restricts UI choices to `1 | 2 | 3 | 4 | 5`; strict compiler checks catch identifier, property, and nullability mistakes. Runtime guards cover the point where JSON is still `unknown`.
- One ASP.NET Core API and EF Core migrations demonstrate familiar .NET depth without splitting a small demo into unnecessary services.

## React compared with Web Forms

- Props are typed inputs to a component, similar in purpose to control properties but passed explicitly from a parent.
- State is client-side data that causes a declarative re-render, rather than page/control state restored around a server postback.
- Conditional rendering derives visible UI from state, instead of toggling a server control's `Visible` property.
- A controlled component receives its current value and reports changes upward, similar to form binding but with explicit one-way data flow.
- Effects handle work tied to render lifecycle, such as loading data or owning a timer, rather than page lifecycle events.
- React Native primitives are platform-neutral controls rendered by the target platform; React Native Web maps the same component implementation to the browser.

## Likely interview questions

- **Why no state library?** The workflow is local, linear, and small; lifting state into `App.tsx` keeps ownership obvious.
- **Why both TypeScript interfaces and runtime guards?** TypeScript checks code at build time, but an HTTP server can still return malformed JSON at runtime.
- **How are duplicate saves prevented?** A ref blocks concurrent requests and the saved status prevents another completed save.
- **What happens when saving fails?** The summary remains visible, the user sees the error, and can retry or deliberately discard the unsaved session.
- **Why no navigation package?** Four mutually exclusive steps are clearer as a typed workflow state for this single linear screen.
- **What would come next?** Authentication and tenant-aware authorization would precede family data or history UI; neither belongs in this demo checkpoint.

## Known limitations

- The functional workflow requires the API and SQL Server; there is no offline/mock frontend mode.
- Refreshing the page clears in-memory workflow state.
- Authentication, multi-tenancy, and session-history UI are deliberately deferred.
- Initial and story-detail requests are aborted on cleanup; the session-save request is not aborted on unmount.
- The frontend assumes exactly two displayed children after requiring at least two API records.
- Docker is not a safe fallback until its recorded database create-permission failure is resolved and reverified.
- Automated end-to-end browser coverage is not present; the full workflow still requires manual verification.

## Shutdown

Close the two application PowerShell windows opened by the launcher, or press Ctrl+C in each. Closing Chrome alone does not stop the API or Expo processes.

## Fifteen minutes before the interview

- Pull the intended branch and confirm the working tree is clean.
- Confirm the exact commit with `git rev-parse HEAD`.
- Run `npx tsc --noEmit`.
- Start `.\scripts\Start-LocalDemo.ps1`.
- Confirm children and stories load, then complete and save one full session.
- Confirm the timer starts, stops, and resets.
- Check the browser console for unexpected errors.
- Keep `App.tsx`, `CalmnessSelector.tsx`, `apiTypes.ts`, and Scalar ready.
- Close unrelated windows and disable notifications.
- Keep the two manual startup commands available.
- Test Docker only if it is intended to serve as the fallback.
