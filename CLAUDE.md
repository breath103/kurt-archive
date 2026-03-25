# Project Instructions

## Deployment

- **CI deploys automatically on merge to main.** Never deploy manually.
- **Never use `--squash` when merging PRs.** Use `gh pr merge` without `--squash`.

See `documents/coding-guidelines/` for coding standards:
- `backend.md` - Backend (packages/backend)
- `frontend.md` - Frontend (packages/frontend)

## Running Scripts

All scripts are executable via shebang — no `npm run` needed.

### Root-level scripts (run from repo root)

```bash
./scripts/dev/index.ts          # Start all dev servers (frontend, backend, edge proxy)
./scripts/lint                  # Run linters across packages
./scripts/e2e/index.ts start    # Start headless Chrome for e2e
./scripts/setup.ts              # Interactive project setup
```

### Package scripts (run from package directory)

```bash
# Backend
cd packages/backend
./scripts/deploy.ts --name=main
./scripts/build.ts
./scripts/logs.ts -n main -t

# Frontend
cd packages/frontend
./scripts/deploy.ts --name=main
./scripts/destroy.ts --name=feature-branch

# Edge
cd packages/edge
./scripts/deploy.ts deploy
./scripts/logs.ts -f origin-request -r us-east-1
```

### Other common commands (run from package directory)

```bash
eslint src scripts              # Lint
eslint src scripts --fix        # Lint with auto-fix
tsc --noEmit                    # Type check
tsx --test src/**/__tests__/**/*.test.ts  # Run tests (backend)
```

### Install packages

```bash
npm install <package> -w backend
npm install -D <package> -w frontend  # as devDependency
```
