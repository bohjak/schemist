import {JSONSchema7, JSONSchema7Definition} from "json-schema";
import {composeUri, getTarget, parseUri} from "./uri";

type SchemaDict = Record<string, JSONSchema7>;

interface prepareArgs {
  /** schema Schema to be processed */
  schema: JSONSchema7Definition;
  /** baseUri Currently set base URI */
  baseUri?: string;
  /** currentPath Current path relative to baseUri */
  currentPath?: string;
  /** nodes Doubly-multiply-linked list */
  dict: SchemaDict;
  /** allows URI resolution over the network */
  unsafeAllowRemoteUriResolution?: boolean;
}

// TODO: could be possibly done in one pass*. In addition to SchemaDict, we'd need nodes and derefQ
// * One for simple referenceless schemas and a very short second for the rest

/**
 * Traverses the schema and resolves all URIs and remote schemas (if enabled), creating a flat URI/subschema dictionary.
 * @returns Since we need to reference the nodes list as it is being created,
 *          there is no point in returning anything. Might change.
 */
export function prepareJSONSchema7({
  schema,
  baseUri = "",
  currentPath = "#",
  dict,
  unsafeAllowRemoteUriResolution,
}: prepareArgs): void {
  // https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-01#section-4.3.1
  // We don't want to deal with booleans
  if (schema === true) {
    schema = {};
  } else if (schema === false) {
    schema = {not: {}};
  }

  // https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-01#section-8.2
  // $id defines a URI for the schema
  // A subschema's $id is resolved against the base URI
  if (schema.$id) {
    const newBaseUri = mergeUris(baseUri, schema.$id);

    if (newBaseUri !== baseUri) {
      return prepareJSONSchema7({
        schema,
        baseUri: newBaseUri,
        currentPath,
        dict,
      });
    }
  }

  // https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-01#section-8.3
  if (schema.$ref && unsafeAllowRemoteUriResolution) {
    // TODO: fetch and process remote schemas
  }

  /************************************************************
   * Create the current schema node and link it to its parent *
   ************************************************************/

  const uri = mergeUris(baseUri, currentPath);
  dict[uri] = schema;

  /*******************************************************************
   * Go one by one through the schema fields and create schema nodes *
   *******************************************************************/

  function parseObj(prop: keyof JSONSchema7) {
    if (schema[prop] == undefined) {
      return;
    }

    for (const key of Object.keys(schema[prop])) {
      const value = schema[prop][key];
      prepareJSONSchema7({
        schema: value,
        baseUri,
        currentPath: `${currentPath}/${prop}/${key}`,
        dict,
      });
    }
  }

  function parseProp(prop: keyof JSONSchema7) {
    if (schema[prop] == undefined) {
      return;
    }

    prepareJSONSchema7({
      schema: schema[prop],
      baseUri,
      currentPath: `${currentPath}/${prop}`,
      dict,
    });
  }

  parseObj("definitions");

  parseObj("properties");
  parseObj("patternProperties");
  parseProp("propertyNames");
  parseProp("additionalProperties");

  // https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-validation-01#section-6.5.7
  for (const key of Object.keys(schema.dependencies ?? {})) {
    const value = schema.dependencies[key];
    if (!Array.isArray(value)) {
      prepareJSONSchema7({
        schema: value,
        baseUri,
        dict,
        currentPath: `${currentPath}/dependencies/${key}`,
      });
    }
  }

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
}

export type SchemaNodes = Record<string, SchemaNode>;

export interface SchemaNode {
  uri: string;
  title?: string;
  valueType: string | string[];
  parents: SchemaNodes;
  children: SchemaNodes;
  type?: "keyword" | "custom";
}

interface ParseArgs {
  schema: JSONSchema7Definition;
  nodes: SchemaNodes;
  baseUri?: string;
  currentPath?: string;
  parent?: SchemaNode;
  dict: SchemaDict;
  errs: Error[];
}

export function parseJSONSchema7({
  schema,
  nodes,
  baseUri = "",
  currentPath = "#",
  parent,
  dict,
  errs,
}: ParseArgs): void {
  // COPIED FROM PREPARATION STAGE
  // https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-01#section-4.3.1
  // We don't want to deal with booleans
  if (schema === true) {
    schema = {};
  } else if (schema === false) {
    schema = {not: {}};
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
        dict,
        parent,
        errs,
      });
    }
  }

  // DEREFERENCING

  // https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-01#section-8.3
  if (schema.$ref) {
    // https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-01#section-8.3.2
    currentPath = schema.$ref;
    const refUri = mergeUris(baseUri, currentPath);

    if (refUri in nodes) {
      const node = nodes[refUri];
      node.parents[parent.uri] = parent;
      parent.children[refUri] = node;
      return;
    }

    // https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-01#section-8.3
    // All other properties in a "$ref" object MUST be ignored.
    schema = dict[refUri];

    if (schema.$ref) {
      errs.push(
        new Error(
          `cyclical reference: referenced schema ${refUri} contains a reference to ${mergeUris(
            baseUri,
            schema.$ref
          )}`
        )
      );
    }
  }

  // NODE CREATION

  const uri = mergeUris(baseUri, currentPath);
  const node: SchemaNode = {
    uri,
    title: schema.title,
    valueType: schema.type,
    parents: parent ? {[parent.uri]: parent} : {},
    children: {},
  };
  nodes[uri] = node;
  parent && (parent.children[uri] = node);

  // TREE TRAVERSAL

  function parseObj(prop: keyof JSONSchema7) {
    if (schema[prop] == undefined) {
      return;
    }

    for (const key of Object.keys(schema[prop])) {
      const value = schema[prop][key];
      const newPath = `${currentPath}/${prop}/${key}`;
      parseJSONSchema7({
        schema: value,
        baseUri,
        currentPath: newPath,
        dict,
        nodes,
        parent: node,
        errs,
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
      dict,
      nodes,
      parent: node,
      errs,
    });
  }

  parseObj("properties");
  parseObj("patternProperties");
  parseProp("propertyNames");
  parseProp("additionalProperties");

  // https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-validation-01#section-6.5.7
  for (const key of Object.keys(schema.dependencies ?? {})) {
    const value = schema.dependencies[key];
    if (!Array.isArray(value)) {
      const newPath = `${currentPath}/dependencies/${key}`;
      parseJSONSchema7({
        schema: value,
        baseUri,
        dict,
        currentPath: newPath,
        nodes,
        parent: node,
        errs,
      });
    }
  }

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
}

function mergeUris(base: string, ref: string): string {
  const baseUri = parseUri(base);
  const refUri = parseUri(ref);

  return composeUri(getTarget(refUri, baseUri));
}
