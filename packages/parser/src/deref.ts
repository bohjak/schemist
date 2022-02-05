import {JSONSchema7} from "json-schema";

interface DerefOptions {
  /**
   * Will allow resolving remote URI addresses in $ref over the network.
   *
   * **Do not** allow unless you know ahead of time the contents of the schema.
   *
   * @example {"$ref": "http://json-schema.org/draft-07/schema/#"}
   */
  unsafeAllowRemoteUriResolution?: boolean;
}

/**
 * Resolves $ref
 * @param options Additional options
 * @param idDict Dictionary of schemas with $id
 * @param rootSchema Fallback schema so use if ref doesn't specify an id
 * or an address or remote address resolution is not enabled.
 * @param ref [JSON pointer] to referenced schema
 *
 * [JSON pointer]: https://datatracker.ietf.org/doc/html/rfc6901
 */
export async function deref(
  options: DerefOptions,
  idDict: Record<string, JSONSchema7>,
  rootSchema: JSONSchema7,
  ref?: string
): Promise<[unknown, Error?]> {
  if (ref === undefined) return [{}];
  if (ref in idDict) return [idDict[ref]];
  const [address, jp] = ref.split(/\/?#\/?/);
  if (address.length && options.unsafeAllowRemoteUriResolution) {
    const [val, err] = await resolveAddress(address);
    if (err !== undefined) {
      return [{}, err];
    }

    rootSchema = val;
  }

  return evaljp(rootSchema, parseJsonPointer(jp));
}

export async function derefSchema(
  deref: (ref?: string) => Promise<[unknown, Error?]>,
  schema: JSONSchema7
): Promise<[JSONSchema7, Error?]> {
  const [ref, derErr] = await deref(schema.$ref);
  if (derErr !== undefined) {
    return [schema, derErr];
  }
  if (typeof ref !== "object") {
    return [
      schema,
      new Error(`Bad reference: "${schema.$ref}"; Received: ${ref}`),
    ];
  }

  return [{...schema, ...ref}];
}

async function resolveAddress(
  address: string
): Promise<[Record<string, unknown>, Error?]> {
  try {
    const r = await fetch(address);
    if (!r.ok) {
      return [{}, new Error(`${r.status}: ${r.statusText}`)];
    }
    return [await r.json()];
  } catch (e) {
    return [{}, e as Error];
  }
}

function evaljp(j: JSONSchema7, keys: string[]): [unknown, Error?] {
  // TODO: rewrite iteratively + potentially add recursive dereferencing
  if (!keys.length) return [j];

  const [key, ...rest] = keys;
  if (!(key in j)) return [j, new Error(`No key "${key}" in given object`)];

  // @ts-expect-error Indexing with {string}
  return evaljp(j[key], rest);
}

function parseJsonPointer(jp: string): string[] {
  return jp.split("/").map((key) => key.replace("~1", "/").replace("~0", "~"));
}
