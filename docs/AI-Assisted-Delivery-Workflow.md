# AI-Assisted Delivery Workflow

## Purpose

This demo uses AI to accelerate delivery without giving up engineering discipline.

The goal is not to have AI build an entire application in one pass. The goal is to use AI in small, controlled steps that are easy to inspect, test, explain, and commit.

---

## The Core Principle

Keep three sources of truth separate:

1. **Specification** — what should exist
2. **Repository** — what currently exists
3. **Verification** — what has actually been tested

```text
Specification
      ↓
Repository Inspection
      ↓
Gap Analysis
      ↓
Implementation
      ↓
Verification
```

A requirement in a specification does not prove that the feature is implemented.

This distinction helps prevent AI from assuming files, functionality, validation results, or completed work that do not exist.

---

## Clear Tool Responsibilities

### ChatGPT

ChatGPT supports:

- Requirements clarification
- Architecture and scope decisions
- Feature prioritization
- Checkpoint planning
- Codex prompt preparation
- Result review
- Git planning
- Technical explanations

### Codex

Codex supports:

- Repository inspection
- One bounded implementation task
- Validation commands
- Diff review
- Changed-file reporting
- Risk identification

### Developer

The developer remains responsible for:

- Reviewing the code
- Running the application
- Testing the user workflow
- Confirming validation results
- Creating commits
- Deciding whether to continue, fix, or revert

> AI proposes changes. The developer verifies reality.

---

## Feature Slicing

Avoid broad prompts such as:

> Build the entire application.

Instead, divide the work into small checkpoints.

For this demo:

1. Story selection
2. Pre-reading calmness and notes
3. Reading timer
4. Post-reading check-in
5. Session summary and reset
6. README and final review

Each checkpoint should be:

- Small
- Testable
- Reversible
- Explainable
- Independently committable

This reduces implementation risk, limits AI drift, simplifies reviews, and makes failures easier to isolate.

---

## Inspect Before Editing

Every implementation cycle begins with:

```text
Inspect
  ↓
Understand
  ↓
Compare with the specification
  ↓
Modify only what is required
```

This prevents AI from replacing working code, inventing architecture, or introducing unrelated changes.

---

## Checkpoint Delivery Loop

```text
Define one objective
        ↓
Inspect affected files
        ↓
Implement one bounded change
        ↓
Run available validation
        ↓
Review the diff
        ↓
Test the browser workflow
        ↓
Commit the verified change
        ↓
Repeat
```

The process stops after each checkpoint so issues are found while the change is still small and the context is fresh.

---

## Explicit Handoffs

A strong Codex prompt defines:

- Objective
- Scope
- Files or areas to inspect
- Files allowed to change
- Behavior to preserve
- Validation to run
- Expected report
- When to stop

This creates a clear handoff similar to assigning work to another engineer.

Avoid:

- Open-ended prompts
- Unbounded cleanup
- Hidden assumptions
- Requests to continue automatically
- Combining unrelated features

---

## Honest Status Reporting

Every update should distinguish between:

### Confirmed

Facts directly observed in the repository or command output.

### Codex Finding

What Codex reports after inspection or implementation.

### Requires Local Verification

Behavior that still needs to be confirmed by the developer, such as:

- Browser workflow
- Visual layout
- Runtime behavior
- Build or validation success
- Performance

This prevents AI-assisted work from being presented as complete before it has been verified.

---

## Meaningful Git History

Each commit should represent one stable, understandable change.

Prefer:

```text
feat: add story selection
feat: capture pre-reading calmness
feat: add story reading timer
feat: add session summary and reset
fix: clean up timer interval
docs: add verified setup instructions
```

Avoid:

```text
updates
changes
fix stuff
added everything
```

Focused commits improve:

- Code review
- Rollback
- Troubleshooting
- Production traceability
- Interview discussion

---

## Team Delivery Model

```text
Product Owner
      │
      ▼
Specification
      │
      ▼
ChatGPT
- Refines requirements
- Defines feature slices
- Identifies risks
      │
      ▼
Codex
- Inspects the repository
- Implements one slice
- Runs validation
- Reports the diff
      │
      ▼
Developer
- Reviews the code
- Tests the application
- Requests corrections
      │
      ▼
Verified Git Commit
      │
      ▼
Repeat
```

Each participant has a clear responsibility, reducing duplicated effort and making progress easier to track.

---

## Why This Approach Scales

The workflow depends on engineering discipline, not a specific AI product.

The highest-value practices are:

1. Maintain one authoritative specification.
2. Inspect the repository before editing.
3. Implement one bounded change at a time.
4. Validate every checkpoint.
5. Keep Git history meaningful.
6. Use explicit handoffs between planning, coding, and verification.
7. Separate confirmed facts from assumptions.
8. Defer lower-value work until the core workflow is stable.

These practices make AI-generated changes easier to review, reduce regression risk, improve onboarding, and create a repeatable process that can scale from one developer to a larger engineering team.

---

## Demo Talking Point

The main value of this workflow is not simply faster code generation.

It is faster **verified delivery**:

- Less AI hallucination
- Less unnecessary code
- Smaller reviewable changes
- Clearer ownership
- Easier rollback
- Better technical explanations
- More reliable progress toward a working release
