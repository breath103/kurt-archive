import { z } from "zod";

export type Command =
  | { description: string; args: z.ZodTuple; run: (...args: string[]) => Promise<void> }
  | { description: string; args?: undefined; run: () => Promise<void> };

export function defineCommand<T extends z.ZodTuple>(def: { description: string; args: T; run: (...args: z.infer<T>) => Promise<void> }): Command;
export function defineCommand(def: { description: string; run: () => Promise<void> }): Command;
export function defineCommand(def: Command): Command { return def; }

export function usageFromSchema(name: string, schema?: z.ZodTuple): string {
  if (!schema) return name;
  const items = schema._zod.def.items as z.ZodTypeAny[];
  const labels = items.map((item) => {
    const label = item.description ?? "arg";
    return item.isOptional() ? `[${label}]` : `<${label}>`;
  });
  return `${name} ${labels.join(" ")}`;
}
