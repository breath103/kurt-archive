import Form from "@rjsf/core";
import type { RJSFSchema } from "@rjsf/utils";
import validator from "@rjsf/validator-ajv8";
import { useEffect, useMemo,useState } from "react";
import { toJSONSchema } from "zod";

import type { ValueNode } from "../../nodes/ValueNode";

type Props = {
  node: ValueNode<unknown>;
};

export function ValueNodePreview({ node }: Props) {
  const [value, setValue] = useState(node.value);
  const jsonSchema = useMemo(() => toJSONSchema(node.schema) as RJSFSchema, [node.schema]);

  useEffect(() => {
    const sub = node.subscribe(setValue);
    return () => sub.unsubscribe();
  }, [node]);

  return (
    <Form
      schema={jsonSchema}
      formData={value}
      validator={validator}
      onChange={e => {
        try {
          node.value = e.formData;
        } catch {
          // validation failed, ignore
        }
      }}
      uiSchema={{ "ui:submitButtonOptions": { norender: true } }}
      className="text-black"
    />
  );
}
