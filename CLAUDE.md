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
