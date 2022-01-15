import {JSONSchema7} from "json-schema";

interface DerefOptions {
  /**
   * Will allow resolving remote URI addresses over the network in $ref.
   * @example "$ref": "http://json-schema.org/draft-07/schema/#"
   */
  unsafeAllowUriAddressResolution?: boolean;
}

/**
 * Resolves $ref
 * @param options Additional options
 * @param idDict Dictionary of schemas with $id
 * @param rootSchema Fallback schema so use if ref doesn't specify an address
 * or remote address resolution is not enabled.
 * @param ref [JSON pointer] to referenced schema
 *
 * [JSON pointer]: https://datatracker.ietf.org/doc/html/rfc6901
 */
export async function deref(
  options: DerefOptions,
  idDict: Record<string, JSONSchema7>,
  rootSchema: JSONSchema7,
  ref: string
): Promise<[unknown, Error?]> {
  if (ref in idDict) return [idDict[ref]];
  const [address, jptr] = ref.split("#");
  if (address.length && options.unsafeAllowUriAddressResolution) {
    const [val, err] = await resolveAddress(address);
    if (err !== undefined) {
      return [{}, err];
    }

    console.log("fetched", val);

    rootSchema = val;
  }

  return evaljp(rootSchema, parseJsonPointer(jptr));
}

function trailSlash(uri: string): string {
  return uri.endsWith("/") ? uri.slice(0, -1) : uri;
}

async function resolveAddress(
  address: string
): Promise<[Record<string, unknown>, Error?]> {
  try {
    const r = await fetch(trailSlash(address));
    if (!r.ok) {
      return [{}, new Error(`${r.status}: ${r.statusText}`)];
    }
    return [await r.json()];
  } catch (e) {
    return [{}, e as Error];
  }
}

function evaljp(j: JSONSchema7, jp: string[]): [unknown, Error?] {
  // TODO: rewrite iteratively + potentially add recursive dereferencing
  if (!jp.length) return [j];

  const [key, ...rest] = jp;
  if (!(key in j)) return [j, new Error(`No key "${key}" in given object`)];

  // @ts-expect-error Indexing with {string}
  return evaljp(j[key], rest);
}

function parseJsonPointer(path: string): string[] {
  return path
    .split("/")
    .flatMap((s) => (s.length ? [s] : []))
    .map((s) => s.replace("~1", "/").replace("~0", "~"));
}
