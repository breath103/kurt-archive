# Project Instructions

## Deployment

- **CI deploys automatically on merge to main.** Never deploy manually.
- **Never use `--squash` when merging PRs.** Use `gh pr merge` without `--squash`.

See `documents/coding-guidelines/` for coding standards:
- `backend.md` - Backend (packages/backend)
- `frontend.md` - Frontend (packages/frontend)

## Important Rules

- **Never call `npx` directly.** This project has scripts for everything. Use the provided scripts instead.

## Running Scripts

All scripts are executable via shebang — no `npm run` or `npx` needed. Run everything from repo root.

### Root-level scripts

```bash
./scripts/dev.ts                # Start all dev servers (frontend, backend, edge proxy)
./scripts/lint                  # Run linters across packages
./scripts/e2e.ts start          # Start headless Chrome for e2e
./scripts/setup.ts              # Interactive project setup
```

### Package scripts

```bash
# Backend
./packages/backend/scripts/deploy.ts --name=main
./packages/backend/scripts/build.ts
./packages/backend/scripts/logs.ts -n main -t

# Frontend
./packages/frontend/scripts/deploy.ts --name=main
./packages/frontend/scripts/destroy.ts --name=feature-branch

# Edge
./packages/edge/scripts/deploy.ts deploy
./packages/edge/scripts/logs.ts -f origin-request -r us-east-1
```

### Other common commands

```bash
./packages/backend/scripts/lint.ts                     # Lint backend
./packages/backend/scripts/lint.ts --fix               # Lint backend with auto-fix
./packages/frontend/scripts/lint.ts                    # Lint frontend
./packages/frontend/scripts/lint.ts --fix              # Lint frontend with auto-fix
./packages/backend/scripts/build-types.ts              # Type check backend
./packages/frontend/scripts/build-types.ts             # Type check frontend
```

### Install packages

```bash
npm install <package> -w backend
npm install -D <package> -w frontend  # as devDependency
```
