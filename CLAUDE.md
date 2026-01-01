# Coding Guidelines

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
