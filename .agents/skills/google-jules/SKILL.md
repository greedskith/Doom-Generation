---
name: google-jules
description: >-
  Procedures for collaborating with Google Jules as an asynchronous cloud coding agent.
  Use when the user asks to delegate tasks to Jules, set up or use @google/jules CLI,
  formulate GitHub issues for Jules, review Jules plans, or verify and test Jules PRs locally.
---

# Google Jules Collaboration Workflow

Google Jules is an autonomous cloud coding agent that operates directly on GitHub repositories. As Antigravity, your role is the **local co-pilot and quality gatekeeper**: framing tasks for Jules, triaging plans, testing PRs on the local machine before merge, and syncing the workspace.

## 1. Official Setup & Authentication
Do NOT install IDE extensions. Use only Google's official channels:
```bash
# Official CLI
npm install -g @google/jules
jules login
```

## 2. Delegation & Review Lifecycle

1. **Task Formulation**: Formulate crisp, self-contained specs with clear constraints. Dispatch via CLI (`jules session create`), GitHub Issues (`gh issue create`), or [jules.google.com](https://jules.google.com).
2. **Plan Triage**: When Jules enters `AWAITING_PLAN_APPROVAL`, review the proposed file list and diff outline before the user approves.
3. **Local PR Verification**: Never merge a Jules PR blindly:
   ```bash
   gh pr checkout <PR_NUMBER>
   npm run build
   git diff main...HEAD
   ```
4. **Post-Merge Workspace Sync**:
   ```bash
   git checkout main
   git pull origin main
   ```
