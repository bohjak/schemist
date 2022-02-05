import {JSONSchema7} from "json-schema";
import {derefSchema} from "./deref";
import {deref} from "./internal";

const keys = <O>(o: O) => Object.keys(o) as (keyof O)[];

interface SchemaNode {
  id?: string;
  raw?: JSONSchema7;
  title?: string;
  description?: string;
  key?: string;
  group?: string;
  path?: string[];
  idx?: number;
  isRequired?: boolean;
  children?: SchemaNode[];
}

/*
TODO
Global Record<JSONPointer, SchemaNode>
SchemaNode.children: JSONPointer[]
*/

async function parseJsonSchema(
  schema: JSONSchema7
): Promise<[SchemaNode, Error?]> {
  const node: SchemaNode = {raw: schema};

  for (const key of keys(schema)) {
    switch (key) {
      case "title": {
        node.title = schema[key];
        break;
      }
      case "description": {
        node.description = schema[key];
        break;
      }
      case "additionalItems": {
        let p = schema[key];
        break;
      }
      case "additionalProperties":
      case "allOf":
      case "anyOf":
      case "const":
      case "contains":
      case "contentEncoding":
      case "contentMediaType":
      case "default":
      case "definitions":
      case "dependencies":
      case "else":
      case "enum":
      case "examples":
      case "exclusiveMaximum":
      case "exclusiveMinimum":
      case "format":
      case "if":
      case "items":
      case "maxItems":
      case "maxLength":
      case "maxProperties":
      case "maximum":
      case "minItems":
      case "minLength":
      case "minProperties":
      case "minimum":
      case "multipleOf":
      case "not":
      case "oneOf":
      case "pattern":
      case "patternProperties":
      case "properties":
      case "propertyNames":
      case "readOnly":
      case "required":
      case "then":
      case "type":
      case "uniqueItems":
      case "writeOnly": {
      }
      case "$comment":
      case "$id":
      case "$schema":
      case "$ref":
      default: {
        // noop
        break;
      }
    }
  }

  return [node];
}

export async function exampleUsage(schema: JSONSchema7) {
  const [dschema, derErr] = await derefSchema(
    deref.bind(null, {unsafeAllowRemoteUriResolution: true}, {}, schema),
    schema
  );
  if (derErr !== undefined) {
    console.error(derErr);
  }

  const [nodes, parsErr] = await parseJsonSchema(dschema);
  if (parsErr !== undefined) {
    return console.error(parsErr);
  }
  console.log(nodes);
}
