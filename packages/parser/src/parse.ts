import {JSONSchema7, JSONSchema7Definition} from "json-schema";

type URI = string;

interface SchemaNode {
  uri: URI;
  raw: unknown;
  parents: SchemaNode[];
  children: SchemaNode[];
}

/**
 * It should recursively go through the schema and "flatten" its contents into
 * the nodes map as a doubly-multiply-linked list (see cyclical graph)
 * @param schema Schema to be processed
 * @param baseUri Currently set base URI
 * @param nodes Doubly-multiply-linked list
 * @returns Since we need to reference the nodes list as it is being created,
 *          there is no point in returning anything. Might change.
 */
function parseJSONSchema7(
  schema: JSONSchema7Definition,
  baseUri: URI,
  nodes: Map<URI, SchemaNode>
): void {
  // As per https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-01#section-4.3.1
  if (schema === true) {
    schema = {};
  } else if (schema === false) {
    schema = {not: {}};
  }

  const {$id, definitions} = schema;
  if ($id) {
    parseJSONSchema7(schema, mergeUris($id, baseUri), nodes);
  }

  for (const key of Object.keys(definitions)) {
    const value = definitions[key];
  }
}

declare function mergeUris(ref: string, base: string): string;
