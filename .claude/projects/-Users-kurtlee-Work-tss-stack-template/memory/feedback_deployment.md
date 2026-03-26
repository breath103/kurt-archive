---
name: deployment-rules
description: Never deploy manually and never squash merge PRs
type: feedback
---

1. Never deploy manually — CI deploys automatically when PRs are merged to main.
   **Why:** User was furious when I tried to run `npm run deploy` locally after merging. CI handles it.
   **How to apply:** After merging a PR, just wait for CI. Do not run deploy commands.

2. Never use `--squash` when merging PRs via `gh pr merge`.
   **Why:** User explicitly forbids squash merges. Use default merge strategy.
   **How to apply:** Use `gh pr merge <number>` without `--squash`, `--rebase`, or other flags.
