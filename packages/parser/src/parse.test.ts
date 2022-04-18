import {parseJSONSchema7, SchemaNode, SchemaNodes} from "./parse";
// @ts-ignore
import fds from "./fds.json";

const errs = [];
const nodes: SchemaNodes = {};

parseJSONSchema7({
  errs,
  nodes,
  schema: fds,
});

// const output = Object.keys(dict);
const output = nodes;
// const multiparentNodes: SchemaNode[] = [];
// for (const node of Object.values(nodes)) {
//   if (Object.keys(node.parents).length >= 2) multiparentNodes.push(node);
// }
// const output = multiparentNodes.map((node) => ({
//   uri: node.uri,
//   parents: Object.keys(node.parents),
// }));

console.log(output);
