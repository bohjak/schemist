import {assertEquals} from "https://deno.land/std/testing/asserts.ts";
import {composeUri, getTarget, parseUri} from "./uri.ts";

/// https://datatracker.ietf.org/doc/html/rfc3986#section-5.4

const base = "http://a/b/c/d;p?q";
const parsedBase = parseUri(base);

/*
 */
const cases: [input: string, expected: string][] = [
  // Normal
  ["g:h", "g:h"],
  ["g", "http://a/b/c/g"],
  ["./g", "http://a/b/c/g"],
  ["g/", "http://a/b/c/g/"],
  ["/g", "http://a/g"],
  ["//g", "http://g"],
  ["?y", "http://a/b/c/d;p?y"],
  ["g?y", "http://a/b/c/g?y"],
  ["#s", "http://a/b/c/d;p?q#s"],
  ["g#s", "http://a/b/c/g#s"],
  ["g?y#s", "http://a/b/c/g?y#s"],
  [";x", "http://a/b/c/;x"],
  ["g;x", "http://a/b/c/g;x"],
  ["g;x?y#s", "http://a/b/c/g;x?y#s"],
  ["", "http://a/b/c/d;p?q"],
  [".", "http://a/b/c/"],
  ["./", "http://a/b/c/"],
  ["..", "http://a/b/"],
  ["../", "http://a/b/"],
  ["../g", "http://a/b/g"],
  ["../..", "http://a/"],
  ["../../", "http://a/"],
  ["../../g", "http://a/g"],
  // Abnormal
  ["../../../g", "http://a/g"],
  ["../../../../g", "http://a/g"],
  ["/./g", "http://a/g"],
  ["/../g", "http://a/g"],
  ["g.", "http://a/b/c/g."],
  [".g", "http://a/b/c/.g"],
  ["g..", "http://a/b/c/g.."],
  ["..g", "http://a/b/c/..g"],
  ["./../g", "http://a/b/g"],
  ["./g/.", "http://a/b/c/g/"],
  ["g/./h", "http://a/b/c/g/h"],
  ["g/../h", "http://a/b/c/h"],
  ["g;x=1/./y", "http://a/b/c/g;x=1/y"],
  ["g;x=1/../y", "http://a/b/c/y"],
  ["g?y/./x", "http://a/b/c/g?y/./x"],
  ["g?y/../x", "http://a/b/c/g?y/../x"],
  ["g#s/./x", "http://a/b/c/g#s/./x"],
  ["g#s/../x", "http://a/b/c/g#s/../x"],
  ["http:g", "http:g"],
];

// const cases = [["../../../g", "http://a/g"]];

const debug = <T>(x: T): T => (console.log(x), x);
cases.forEach(([input, expected]) => {
  Deno.test(`Resolves reference for ${input}`, () => {
    const [result] = [input]
      .map(parseUri)
      .map((parsedInput) => getTarget(parsedInput, parsedBase))
      .map(debug)
      .map(composeUri);
    assertEquals(result, expected);
  });
});
