import { useState, useEffect } from "react";
import type { z } from "zod";

import type { ValueNode } from "../../nodes/value-node";

type Props = {
  node: ValueNode<unknown>;
};

export function ValueNodePreview({ node }: Props) {
  const [value, setValue] = useState(node.value);
  const schema = node.schema;

  useEffect(() => {
    const sub = node.subscribe(setValue);
    return () => sub.unsubscribe();
  }, [node]);

  const handleChange = (newValue: unknown) => {
    try {
      node.value = newValue;
    } catch {
      // validation failed, ignore
    }
  };

  return (
    <div className="flex flex-col gap-1">
      {renderEditor(schema, value, handleChange)}
    </div>
  );
}

function renderEditor(
  schema: z.ZodType<unknown>,
  value: unknown,
  onChange: (v: unknown) => void,
) {
  const def = schema._def;
  const typeName = def.typeName as string;

  if (typeName === "ZodNumber") {
    const numDef = def as { checks?: Array<{ kind: string; value: number }> };
    const min = numDef.checks?.find(c => c.kind === "min")?.value;
    const max = numDef.checks?.find(c => c.kind === "max")?.value;

    return (
      <input
        type="range"
        min={min ?? 0}
        max={max ?? 100}
        step={0.01}
        value={value as number}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full"
      />
    );
  }

  if (typeName === "ZodString") {
    return (
      <input
        type="text"
        value={value as string}
        onChange={e => onChange(e.target.value)}
        className="bg-gray-700 text-white px-2 py-1 rounded text-sm w-full"
      />
    );
  }

  if (typeName === "ZodBoolean") {
    return (
      <input
        type="checkbox"
        checked={value as boolean}
        onChange={e => onChange(e.target.checked)}
      />
    );
  }

  return <span className="text-xs text-gray-400">{String(value)}</span>;
}
