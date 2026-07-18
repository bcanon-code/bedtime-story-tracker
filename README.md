# Bedtime Story Tracker

Bedtime Story Tracker is a small React Native Web and TypeScript interview demo for recording a fictional bedtime reading session. It demonstrates a complete, deliberately scoped workflow without a backend or persistent storage.

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

## Prerequisites

- Node.js and npm

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

## Validation

```bash
npx tsc --noEmit
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
- [`src/data/stories.json`](src/data/stories.json) contains original mock stories; [`src/data/storyCatalog.ts`](src/data/storyCatalog.ts) defines their TypeScript shape and exposes the catalog.
- A `useEffect` in `App.tsx` owns the timer interval and cleanup for the reading step.
- [`src/theme.ts`](src/theme.ts) centralizes low-light colors, spacing, and radius tokens.

State remains in memory and flows down through props. Required-value completeness and calmness changes are derived from the current state rather than stored separately.

## Important design decisions

- Local React state instead of Redux or Zustand keeps the small demo direct and reviewable.
- Conditional rendering replaces a navigation dependency for this linear workflow.
- Typed JSON provides realistic mock content while keeping data separate from the UI.
- Persistent reading controls keep the timer and finish action available while story text scrolls.
- The low-light, phone-focused interface supports the intended bedtime reading context.
- Validation state and calmness changes are derived to avoid duplicated state.
- Tier 1 intentionally has no backend or persistence.

## Current limitations

- No saved session history, database, or backend
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

Avery and Jordan are fictional names. Notes are entered only at runtime and are not saved. The catalog contains original fictional stories and neutral mock metadata; no real child or private family data is included in the application content.
