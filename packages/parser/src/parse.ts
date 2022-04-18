import {JSONSchema7, JSONSchema7Definition} from "json-schema";
import {composeUri, getTarget, parseUri} from "./uri";

export type SchemaNodes = Record<string, SchemaNode>;

// This cannot work because a reference could be used for both a keyword and a user schema
type SchemaType = "root" | "definition" | "keyword" | "user";

export interface SchemaNode {
  uri: string;
  title?: string;
  valueType?: string | string[];
  parents: SchemaNodes;
  children: SchemaNodes;
  ref?: string;
  type?: SchemaType;
}

interface ParseArgs {
  /** Schema to be processed */
  schema: JSONSchema7Definition;
  /** Doubly-multiply-linked list */
  nodes: SchemaNodes;
  /** Non-fatal errors encountered during parsing */
  errs: Error[];
  /** Currently set base URI */
  baseUri?: string;
  /** Current fragment path relative to baseUri; must begin with '#' */
  currentPath?: string;
  type?: SchemaType;
  /** Allows remote URI resolution over the network */
  unsafeAllowRemoteUriResolution?: boolean;
  /** Parents of the current schema */
  parents?: SchemaNodes;
  /** Queue of schemas waiting to be dereferenced; key is the referenced URI, value the parents of the schemas that reference it */
  derefQ?: Record<string, SchemaNodes>;
  /** Flag to mark that a schema is a definition and doesn't need to be linked to its parent */
  isDefinition?: boolean;
}

/**
 * Traverses the schema and resolves all URIs and remote schemas (if enabled), creating a flat URI/subschema dictionary.
 * @returns Since we need to reference the nodes list as it is being created,
 *          there is no point in returning anything. Might change.
 */
export function parseJSONSchema7({
  schema,
  nodes,
  baseUri = "",
  currentPath = "#",
  parents = {},
  errs,
  derefQ = {},
  isDefinition,
  unsafeAllowRemoteUriResolution,
}: ParseArgs): void {
  // https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-01#section-4.3.1
  // We don't want to deal with booleans
  if (schema === true) {
    schema = {};
  } else if (schema === false) {
    schema = {not: {}};
  }

  // https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-01#section-8.3
  // If schema is a reference object, it either references an already processed node, in which case we simply link it, otherwise add it to the dereferencing queue.
  if (schema.$ref) {
    if (unsafeAllowRemoteUriResolution) {
      // TODO: fetch and process remote schemas
    }

    // https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-01#section-8.3.2
    const refUri = mergeUris(baseUri, schema.$ref);

    if (refUri in nodes) {
      const node = nodes[refUri];
      node.parents = {...node.parents, ...parents};
      for (const parent of Object.values(parents)) {
        parent.children[refUri] = node;
      }
    } else {
      derefQ[refUri] = parents;
    }

    // All other properties in a "$ref" object MUST be ignored.
    return;
  }

  // https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-01#section-8.2
  // $id defines a URI for the schema
  // A subschema's $id is resolved against the base URI
  if (schema.$id) {
    const newBaseUri = mergeUris(baseUri, schema.$id);

    if (newBaseUri !== baseUri) {
      return parseJSONSchema7({
        schema,
        baseUri: newBaseUri,
        currentPath,
        nodes,
        parents,
        errs,
        derefQ,
      });
    }
  }

  /************************************************************
   * Create the current schema node and link it to its parent *
   ************************************************************/

  const uri = mergeUris(baseUri, currentPath);

  if (isDefinition) {
    parents = undefined;
  }

  if (uri in derefQ) {
    parents = derefQ[uri];

    // https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-01#section-8.3
    // It's never going to happen that the schema is in derefQueue and has reference itself (or rather it may happen but it's not going to get here).
    // Cyclical references (generally references referencing other references) are never actually get dereferenced, because as soon as we detect $ref, this function returns.
  }

  const node: SchemaNode = {
    uri,
    title: schema.title,
    valueType: schema.type,
    ref: schema.$ref && mergeUris(baseUri, schema.$ref),
    parents,
    children: {},
  };
  nodes[uri] = node;
  for (const parent of Object.values(parents)) {
    parent.children[uri] = node;
  }

  /*******************************************************************
   * Go one by one through the schema fields and create schema nodes *
   *******************************************************************/

  function parseObj(prop: keyof JSONSchema7, isDefinition?: boolean) {
    if (schema[prop] == undefined) {
      return;
    }

    for (const key of Object.keys(schema[prop])) {
      const value = schema[prop][key];

      // https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-validation-01#section-6.5.7
      // .dependencies can have a value of `string[]`
      if (Array.isArray(value)) return;

      const newPath = `${currentPath}/${prop}/${key}`;
      parseJSONSchema7({
        schema: value,
        baseUri,
        currentPath: newPath,
        nodes,
        parents: {[uri]: node},
        errs,
        derefQ,
        isDefinition,
      });
    }
  }

  function parseProp(prop: keyof JSONSchema7) {
    if (schema[prop] == undefined) {
      return;
    }

    const newPath = `${currentPath}/${prop}`;
    parseJSONSchema7({
      schema: schema[prop],
      baseUri,
      currentPath: newPath,
      nodes,
      parents: {[uri]: node},
      errs,
      derefQ,
    });
  }

  parseObj("properties");
  parseObj("patternProperties");
  parseProp("propertyNames");
  parseProp("additionalProperties");

  parseObj("dependencies");

  if (Array.isArray(schema.items)) {
    parseObj("items");
  } else {
    parseProp("items");
  }
  parseProp("additionalItems");
  parseProp("contains");

  parseProp("if");
  parseProp("then");
  parseProp("else");

  parseProp("not");
  parseObj("allOf");
  parseObj("anyOf");
  parseObj("oneOf");

  parseObj("definitions", true);
}

function mergeUris(base: string, ref: string): string {
  const baseUri = parseUri(base);
  const refUri = parseUri(ref);

  return composeUri(getTarget(refUri, baseUri));
}
