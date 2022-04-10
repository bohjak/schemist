/// https://datatracker.ietf.org/doc/html/rfc3986#section-3
///
/// URI           = scheme ":" hier-part [ "?" query ] [ "#" fragment ]
///
/// hier-part     = "//" authority path-abempty
///               / path-absolute
///               / path-rootless
///               / path-empty
///
/// path-abempty  = *( "/" segment )
/// path-absolute = "/" [ segment-nz *( "/" segment ) ]
/// path-rootless = segment-nz *( "/" segment )
/// path-empty    = 0<pchar>

interface UriRef {
  scheme?: string;
  path: string;
  authority?: string;
  query?: string;
  fragment?: string;
}

/**
 * @see https://www.rfc-editor.org/rfc/rfc3986#appendix-B
 */
const uriRegex = /^(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?/i;

/**
 * Breaks down a URI into its components
 * @example
 * r = parseUri("http://www.ics.uci.edu/pub/ietf/uri/#Related")
 * r.scheme == "http"
 * r.authority == "www.ics.uci.edu"
 * r.path == "/pub/ietf/uri/"
 * r.query == undefined
 * r.fragment == "Related"
 */
export function parseUri(uri: string): UriRef {
  const [, , scheme, , authority, path = "", , query, , fragment] =
    uri.match(uriRegex) ?? [];
  return {
    scheme,
    authority,
    path,
    query,
    fragment,
  };
}

/**
 * Creates a target URI from a reference URI and a Base URI
 * @see https://datatracker.ietf.org/doc/html/rfc3986#section-5.2.2
 * @param r Reference URI
 * @param b Base URI
 */
export function getTarget(r: UriRef, b: UriRef): UriRef {
  if (r.scheme) return {...r, path: removeDots(r.path)};
  if (r.authority) return {...r, path: removeDots(r.path), scheme: b.scheme};
  if (!r.path.length) {
    if (r.query) return {...b, query: r.query, fragment: r.fragment};
    return {...b, fragment: r.fragment};
  }
  return {
    ...b,
    path: removeDots(
      r.path.startsWith("/") ? r.path : mergePaths(r.path, b.path)
    ),
    query: r.query,
    fragment: r.fragment,
  };
}

/**
 * @see https://datatracker.ietf.org/doc/html/rfc3986#section-5.2.3
 */
function mergePaths(a: string, b: string): string {
  if (!b.length) return "/" + a;

  return b.split("/").slice(0, -1).join("/") + `/${a}`;
}

/**
 * @see https://datatracker.ietf.org/doc/html/rfc3986#section-5.2.4
 */
function removeDots(path: string): string {
  const segs = path.split("/");
  const result: string[] = [];

  for (const s of segs) {
    if (s === ".") continue;
    else if (s === "..") result.pop();
    else result.push(s);
  }

  // FIXME: this is shit and doesn't cover all abnormal test cases
  // If the path ends with either `.` or `..` we would be missing the closing /
  if (path.endsWith(".")) result.push("");
  if (path.startsWith("/") && result[0]) return "/" + result.join("/");
  return result.join("/");
}

/**
 * @see https://datatracker.ietf.org/doc/html/rfc3986#section-5.3
 */
export function composeUri({
  scheme,
  authority,
  path,
  query,
  fragment,
}: UriRef): string {
  let result = "";

  if (undefined !== scheme) result += `${scheme}:`;
  if (undefined !== authority) result += `//${authority}`;
  // There always has to be a path, even if empty
  result += path;
  if (undefined !== query) result += `?${query}`;
  if (undefined !== fragment) result += `#${fragment}`;

  return result;
}
