# Bedtime Story Tracker — Approved Project Specification

**Project:** `bedtime-story-tracker-interview-demo`  
**Status:** Approved target specification  
**Purpose:** React Native Web interview demo  
**Primary deadline:** Working, presentable MVP by tomorrow  

> This document describes what the application should become.  
> It does not prove that any feature is already implemented.  
> The Git repository is authoritative for the actual code, dependencies, configuration, validation results, Git status, and commit history.  
> Codex must inspect the repository before determining implementation state.

---

## 1. Goal

Build a small, credible **Bedtime Story Tracker** using React Native Web and TypeScript.

The demo should help an experienced .NET and ASP.NET Web Forms developer demonstrate the ability to:

- Learn and apply React Native concepts pragmatically
- Deliver a complete workflow under a short deadline
- Use TypeScript effectively
- Maintain a clear and honest Git history
- Explain architectural and implementation decisions confidently
- Control scope and defer low-value work

Optimize every decision for:

1. A working MVP as quickly as possible
2. Low implementation risk
3. Clear, credible Git commit history
4. Code that is easy to explain
5. Strong practical interview value
6. A stable repository suitable for review before the interview

A simple, complete, well-tested feature is more valuable than a sophisticated unfinished feature.

---

## 2. Source-of-Truth Model

Use this mental model throughout the project:

- **Project specification:** what should exist
- **Repository:** what actually exists
- **Codex inspection:** comparison between the specification and repository
- **Manual verification:** what has been personally confirmed in the browser or terminal

Do not assume that a requirement in this specification is already implemented.

Do not invent:

- Existing files
- Installed dependencies
- Local environment details
- Successful commands
- Validation results
- Git status
- Git history
- Completed features
- Pushed commits

Clearly distinguish:

- Confirmed facts
- Assumptions
- Codex findings
- Items requiring local verification

---

## 3. Demo Use Case

Build a simple **Bedtime Story Tracker** for two fictional children.

Each child has a small list of preferred stories. The children alternate which night they get first choice.

A completed bedtime session may record:

- Child
- Selected story
- Calmness before reading
- Optional notes before reading
- Story-reading duration
- Calmness after reading
- Optional notes after reading
- Session date

The data may support future analysis, but do not implement analytics, recommendations, or charts during the initial demo.

Use only fictional names, neutral mock notes, and original sample stories.

---

## 4. Core MVP Workflow

Keep the workflow linear:

1. Select a story.
2. Record calmness and optional notes before reading.
3. Start the story and timer.
4. Stop the timer when reading finishes.
5. Record calmness and optional notes afterward.
6. Review the session summary.
7. Reset the demo.

Use conditional rendering instead of routing unless the repository already contains a valid routing setup that should be preserved.

---

## 5. Tier 1 — Working MVP

Tier 1 is the required deadline target.

Implement:

1. Display one predefined fictional child.
2. Display a small predefined story list.
3. Select one story.
4. Record calmness before reading using a 1–5 scale.
5. Enter optional notes before reading.
6. Start the story session.
7. Display an elapsed-time timer.
8. Stop the timer.
9. Record calmness after reading.
10. Enter optional notes after reading.
11. Display a session summary.
12. Reset the workflow for another demonstration.

Tier 1 may use:

- One screen with conditionally rendered sections
- Hard-coded mock data
- Local component state
- Minimal styling
- No navigation library
- No saved history

The purpose of Tier 1 is to prove the complete workflow from selection through summary.

### Recommended Tier 1 Commit Sequence

Prefer a progression similar to:

1. Project initialization or stable baseline
2. Typed mock stories and basic selection
3. Pre-story calmness and notes
4. Story reading view and timer
5. Post-story check-in
6. Session summary and reset
7. README with verified setup instructions

Combine steps only when separating them would create artificial or insignificant commits.

---

## 6. Tier 1 Definition of Done

Tier 1 is complete only when:

- The project starts without errors.
- The app runs in a web browser.
- A story can be selected.
- Before-story calmness and notes can be entered.
- The timer starts, visibly updates, and stops.
- The final duration is preserved.
- The timer interval is cleaned up correctly.
- After-story calmness and notes can be entered.
- A final summary shows the story, observations, calmness change, and elapsed time.
- The workflow can be reset and demonstrated again.
- A second complete session works after Reset.
- TypeScript validation passes.
- The README contains verified setup and run instructions.
- No sensitive or private family data is committed.
- The Git history contains focused, understandable commits.
- The latest commit is stable and suitable for team review.
- The main files, state flow, event handlers, timer, and commit progression can be explained at a high level.

---

## 7. Calmness Scale

Use the same scale before and after reading:

- **1 — Very restless**
- **2 — Restless**
- **3 — Neutral**
- **4 — Calm**
- **5 — Very calm**

Display the final comparison simply:

```text
Before: 2 → After: 4 → Change: +2
```

Do not interpret the score medically or behaviorally.

---

## 8. Timer Requirements

The timer must:

- Start only when the parent begins the story.
- Begin from `00:00`.
- Update visibly on screen.
- Display an easy-to-read format such as `05:32`.
- Avoid creating duplicate intervals.
- Stop when the story is marked finished.
- Preserve the final duration in the session summary.
- Stop changing after the session is finished.
- Clean up its interval when stopped or when the component unmounts.

Keep the implementation simple enough to explain at a high level.

---

## 9. Tier 2 — Highest Interview Value

Add only after Tier 1 works completely.

Ranked priorities:

1. Support both fictional children.
2. Show each child’s preferred stories.
3. Add the nightly alternation rule.
4. Improve component separation where it improves clarity.
5. Add typed props and clear TypeScript models.
6. Add basic input validation.
7. Improve phone and desktop responsiveness.
8. Add accessibility improvements.
9. Add simulated asynchronous story loading.
10. Add a simple error and retry state.

Each Tier 2 feature should be independently reviewable and committed only after verification.

Do not begin Tier 2 until all Tier 1 stop conditions pass.

---

## 10. Nightly Preference Rule

Add this only in Tier 2.

Use a simple deterministic rule that alternates between the two children based on the date or an easily changed starting value.

The rule must be:

- Easy to test
- Easy to explain
- Isolated in a small pure function
- Overrideable by the parent
- Free of persistence or scheduling infrastructure

Do not add notifications, background tasks, or calendar integration.

---

## 11. Tier 3 — Only If Time Remains

Consider:

- Small in-memory session history
- Empty-state handling
- Cleaner styling
- Additional original stories
- Clearer preference-night indicator
- Additional accessibility improvements
- One focused automated test
- Final README refinement

Do not add Tier 3 features if they introduce risk to the stable demo.

---

## 12. Explicitly Deferred

Do not implement during the MVP:

- Authentication
- User accounts
- Cloud storage
- Backend services
- Databases
- AI-generated stories
- Audio narration
- Notifications
- Charts
- Analytics
- Recommendations
- Medical or behavioral claims
- Redux
- Zustand
- Other global-state libraries
- Complex navigation
- Advanced architecture
- Production infrastructure
- Large test suites
- Unnecessary service layers
- Premature abstractions

---

## 13. Technical Requirements

Use Expo with React Native Web unless the repository already uses another valid and working setup.

Reference:

`https://necolas.github.io/react-native-web/`

The final demo should demonstrate as many of the following as time permits:

- React Native Web
- TypeScript
- Typed models
- Typed component props
- Local state
- React hooks
- Parent-child communication
- Event handling
- Form inputs
- List rendering
- Conditional rendering
- A working timer
- Simulated asynchronous loading
- Basic error handling
- Basic responsive behavior
- Clear Git history
- Reviewer-friendly documentation

Use local state by default.

Do not add Context, Zustand, Redux, or another state library unless the implementation becomes genuinely difficult to manage without one.

---

## 14. Simplicity Principle

Prefer the smallest implementation that works.

Do not add:

- Unnecessary interfaces
- Generic abstractions
- Extra service layers
- Excessive folders
- Premature frameworks
- Patterns that are difficult to explain
- Dependencies that duplicate simple platform functionality

Where useful, relate React concepts to familiar .NET or Web Forms concepts:

- **Component** → reusable user control
- **Props** → typed input parameters
- **State** → data that changes the displayed UI
- **Event handler** → control event
- **TypeScript interface** → C# DTO or data contract
- **Service function** → service-layer method
- **Hook** → component state or lifecycle behavior

Also explain:

- Declarative rendering
- One-way data flow
- Immutable state updates
- Hooks
- Component composition
- Rendering based on state instead of manually updating controls
- Component lifecycle and cleanup

---

## 15. Minimum Data Model

Start with only the models required by the current tier.

### Child

```ts
interface Child {
  id: string;
  name: string;
  preferredStoryIds: string[];
}
```

### Story

```ts
interface Story {
  id: string;
  title: string;
  text: string;
}
```

### BedtimeSession

```ts
interface BedtimeSession {
  childId: string;
  storyId: string;
  startedAt: string;
  durationSeconds: number;
  calmnessBefore: number;
  notesBefore: string;
  calmnessAfter: number;
  notesAfter: string;
  completedAt: string;
}
```

Do not create fields that are not used by the working application.

Use a few short original stories. Do not copy copyrighted story text.

---

## 16. Repository and Git Requirements

The repository must be suitable for review before the interview.

Use small, meaningful commits that reflect the actual implementation sequence.

Do not:

- Place the entire application into one large commit
- Create fake, backdated, or misleading history
- Automatically squash the history before review
- Commit broken intermediate states unless the commit is intentionally a safe scaffolding step

Example commit messages:

```text
chore: initialize Expo TypeScript project
chore: establish Expo TypeScript demo baseline
feat: add bedtime story selection
feat: add story selection and pre-reading check-in
feat: capture pre-story calmness and notes
feat: add story reading timer
feat: capture post-story check-in
feat: add bedtime session summary
feat: complete bedtime session summary and reset
feat: support both children and story preferences
feat: add nightly preference rotation
fix: clean up story timer interval
refactor: separate bedtime workflow components
style: improve responsive bedtime workflow
docs: add setup and interview walkthrough
```

Avoid noisy messages such as:

- `updates`
- `changes`
- `fix stuff`
- Repeated formatting-only commits
- Commits containing unrelated features
- Commits containing broken intermediate states

### Before Each Commit

1. Review changed files.
2. Confirm only relevant files are included.
3. Run the appropriate validation command.
4. Check for secrets, personal information, generated clutter, and unnecessary files.
5. Review the staged diff.
6. Summarize what the commit contains.
7. Use an accurate focused commit message.
8. Do not claim the commit succeeded until the actual result is available.

Prefer staging specific files rather than using `git add .` when practical.

---

## 17. Public Repository Safety

Before publication, verify that the repository does not expose:

- Real children’s names
- Private family notes
- Sensitive behavioral observations
- Credentials
- Tokens
- Local environment files
- Machine-specific paths
- Personal email addresses
- Unnecessary generated files

Use fictional names, neutral mock notes, and original sample stories.

Include an appropriate `.gitignore`.

Do not commit:

- `node_modules`
- Environment secrets
- Local IDE state
- Build output unless required
- Temporary files
- Private session data

---

## 18. README Requirements

Create a concise reviewer-friendly `README.md` before sharing the repository.

It should include:

1. Project purpose
2. Demo use case
3. Technology stack
4. Prerequisites
5. Installation commands
6. How to run the web application
7. Main application workflow
8. Architecture overview
9. Important design decisions
10. Current limitations
11. Possible future improvements
12. Interview talking points
13. Confirmation that the data is fictional mock data stored locally or in memory

Keep the README honest and consistent with the implemented application.

Do not document incomplete features.

---

## 19. Working Method

First inspect any project files, package manifests, Git status, Git log, requirements, and existing code.

Ask no more than two questions only when the answers would materially change implementation. Otherwise, state practical assumptions and proceed.

Work in short, testable checkpoints.

For each checkpoint provide:

1. Priority tier
2. Objective
3. Why it matters for the interview
4. Exact files or areas to create or change
5. Complete code or bounded changes
6. Exact commands to run
7. Verification steps
8. Changed-file review
9. Recommended commit message
10. Exact Git commands
11. Brief interview explanation
12. Next checkpoint only after verification

When an error or command result is provided, troubleshoot it before advancing.

Do not redesign or rewrite working code unless required.

---

## 20. Repository Inspection Requirements

Before implementation, Codex must inspect the repository without changing files.

Inspect:

- Repository structure
- Application entry points
- Existing screens and components
- Existing data models and mock data
- Navigation or workflow-state logic
- Dependencies
- Expo and React Native Web configuration
- TypeScript configuration
- Existing tests
- Available validation commands
- `.gitignore`
- `README.md`
- Git status
- Recent Git history

Compare the repository against Tier 1.

Classify each major requirement as:

- Complete
- Partial
- Missing
- Unverifiable
- Intentionally deferred

Do not claim a feature is implemented until repository inspection confirms it.

---

## 21. Tool Responsibilities

### ChatGPT Project

Use ChatGPT to:

- Interpret and refine this specification
- Define the minimum viable demo scope
- Prioritize implementation work
- Explain React Native concepts using brief .NET or Web Forms comparisons
- Prepare small copy/paste-ready Codex prompts
- Review Codex summaries
- Troubleshoot errors
- Prepare Git checkpoint plans
- Track decisions, risks, completed checkpoints, and deferred work
- Prepare the demo script and interview talking points

### Codex

Use Codex to:

- Inspect the repository before changing anything
- Compare the repository against this specification
- Identify what is complete, partial, missing, or unverifiable
- Implement one bounded checkpoint at a time
- Preserve working functionality
- Run available validation
- Review diffs
- Locate bugs
- Report changed files, validation results, risks, and the next checkpoint
- Stop after completing the bounded task

### My Responsibilities

I will:

- Run the application
- Test the browser UI
- Review diffs
- Make Git commits
- Push the repository
- Practice the demo

---

## 22. Checkpoint Feedback Loop

After every Codex checkpoint, record:

```text
Checkpoint:
Changed files:
Validation commands:
Validation results:
Manual browser result:
Git diff summary:
Current git status:
Known issues:
Recommended commit message:
```

Then decide:

- Commit the checkpoint
- Fix the checkpoint
- Revert or defer the change

Do not move forward until the current checkpoint is stable.

---

## 23. Project Tracker

Maintain this lightweight tracker in the ChatGPT Project:

```text
Current stable checkpoint:
Last verified commands:
Last verified commit:
Next checkpoint:
Known issues:
Deferred:
```

### Meaning

- **Current stable checkpoint:** latest feature set personally tested and known to work
- **Last verified commands:** commands personally run successfully
- **Last verified commit:** latest verified Git commit
- **Next checkpoint:** one small bounded task
- **Known issues:** current bugs or uncertainties
- **Deferred:** intentionally excluded features

The tracker records verified progress. It does not replace the repository.

---

## 24. Recommended Project Chat Organization

Use these chats inside the ChatGPT Project:

```text
00 — Project Control and Checkpoint Tracker
01 — Repository Inspection
02 — Tier 1 Implementation
03 — Errors and Troubleshooting
04 — Git and Pre-Share Review
05 — Demo and Interview Preparation
```

Use:

- `00` for current state, scope decisions, and tracker updates
- `01` for the initial repository inspection
- `02` for bounded implementation prompts and checkpoint reviews
- `03` for troubleshooting
- `04` for Git, README, privacy, and pre-share checks
- `05` for demo practice and interview preparation

---

## 25. Pre-Share Review

Before recommending that the repository be shared with the interview team, verify:

1. The application starts and runs.
2. The Tier 1 workflow works from beginning to end.
3. Reset allows a second complete session.
4. The timer starts, updates, stops, preserves duration, and cleans up correctly.
5. TypeScript validation passes.
6. The repository contains no sensitive information.
7. The commit history is understandable and chronological.
8. Commit messages accurately describe changes.
9. The README matches the actual implementation.
10. Setup instructions have been locally verified.
11. Incomplete features are clearly documented.
12. The repository can be understood quickly by a reviewer.
13. The latest commit represents a stable demo.

Return a concise review with:

- **Ready**
- **Needs attention**
- **Optional improvement**

Do not claim the repository is ready unless available evidence supports it.

---

## 26. Demo Preparation

Prepare a 3–5 minute demonstration that covers:

1. The purpose of the application
2. Story and pre-reading selection
3. Timer behavior
4. Post-reading check-in
5. Session summary
6. Reset
7. High-level architecture
8. Git progression
9. Deliberate scope decisions
10. Known limitations and sensible next steps

Be honest about limited React Native experience.

Emphasize:

- Transferable .NET and Web Forms knowledge
- Typed data
- State-driven rendering
- Hooks and cleanup
- Parent-child communication
- Practical scope control
- Stable incremental delivery

---

## 27. Initial Implementation Priority

The required execution order is:

1. Read-only repository inspection
2. Stable Expo/TypeScript baseline
3. Story selection and pre-reading check-in
4. Reading timer
5. Post-reading check-in
6. Session summary and reset
7. README and privacy review
8. Two-child support, only if Tier 1 is stable
9. Nightly rotation, only if time remains
10. Final demo practice and pre-share review

The immediate next action is always the smallest safe checkpoint supported by the latest repository inspection and manual verification.
