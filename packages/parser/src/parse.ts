import {JSONSchema7, JSONSchema7Definition} from "json-schema";
import {composeUri, getTarget, parseUri} from "./uri";

type URI = string;

type SchemaDict = Record<URI, JSONSchema7Definition>;

interface parseArgs {
  /** schema Schema to be processed */
  schema: JSONSchema7Definition;
  /** baseUri Currently set base URI */
  baseUri?: URI;
  /** currentPath Current path relative to baseUri */
  currentPath?: string;
  /** nodes Doubly-multiply-linked list */
  dict: SchemaDict;
  /** allows URI resolution over the network */
  unsafeAllowRemoteUriResolution?: boolean;
}

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
}: parseArgs): void {
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
    // TODO: should I overwrite the $ref with the resolved uri?
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

function mergeUris(base: string, ref: string): string {
  const baseUri = parseUri(base);
  const refUri = parseUri(ref);

  return composeUri(getTarget(refUri, baseUri));
}
