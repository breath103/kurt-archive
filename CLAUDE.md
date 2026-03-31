# Project Instructions

## Deployment

- **CI deploys automatically on merge to main.** Never deploy manually.
- **Never use `--squash` when merging PRs.** Use `gh pr merge` without `--squash`.

See `documents/coding-guidelines/` for coding standards:
- `backend.md` - Backend (packages/backend)
- `frontend.md` - Frontend (packages/frontend)

## Running Scripts

All scripts are executable via shebang — no `npm run` needed. Run everything from repo root.

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
cd packages/backend && npx tsc --noEmit                # Type check
```

### Install packages

```bash
npm install <package> -w backend
npm install -D <package> -w frontend  # as devDependency
```

# Coding Guidelines

## Don't make parameters optional if the feature doesn't work without them

If a feature requires a parameter to function, make it required. Don't use `?` or `| undefined` just to avoid passing it through.

```typescript
// Bad - feature broken without renderer
function TexturePreview({ value, renderer?: THREE.WebGLRenderer })

// Good - required because it's needed
function TexturePreview({ value, renderer }: { value: THREE.Texture; renderer: THREE.WebGLRenderer })
```

## Polymorphic dispatch

For polymorphic items, always use mutually exclusive if-else pattern. Put conditional branching in a single place.

```typescript
// Bad - repeated type checks, scattered conditions
if (value instanceof Foo && condition1) { return <A /> }
if (value instanceof Foo && condition2) { return <B /> }
if (value instanceof Bar) { return <C /> }

// Good - single check per type, else-if chain
if (value instanceof Foo) {
  return <FooPreview value={value} />;
} else if (value instanceof Bar) {
  return <BarPreview value={value} />;
} else {
  return <DefaultPreview value={value} />;
}
```

## Use instanceof, not custom type guards

Just use `instanceof` for type checking. Don't create marker properties or type guard functions.

```typescript
// Bad - unnecessary marker and type guard
class Foo {
  readonly isFoo = true as const;
}
function isFoo(x: unknown): x is Foo {
  return (x as Foo).isFoo === true;
}

// Good - just use instanceof
if (x instanceof Foo) { ... }
```

## Prefer concise patterns

Use nullish coalescing assignment for cached lazy initialization:

```typescript
// Bad
async load(): Promise<Data> {
  if (this.promise) {
    return this.promise;
  }
  this.promise = this.loadAll();
  return this.promise;
}

// Good
load(): Promise<Data> {
  return this.promise ??= this.loadAll();
}
```
