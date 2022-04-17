import {
  parseJSONSchema7,
  prepareJSONSchema7,
  SchemaNode,
  SchemaNodes,
} from "./parse";
// @ts-ignore
import fds from "./fds.json";

const dict = {};
const errs = [];
const nodes: SchemaNodes = {};

prepareJSONSchema7({schema: fds, dict});
parseJSONSchema7({
  dict,
  errs,
  nodes,
  schema: fds,
});

// const output = Object.keys(dict);
// const output = nodes.values();
const multiparentNodes: SchemaNode[] = [];
for (const node of Object.values(nodes)) {
  if (Object.keys(node.parents).length >= 2) multiparentNodes.push(node);
}
const output = multiparentNodes.map((node) => ({
  uri: node.uri,
  parents: Object.keys(node.parents),
}));

console.log(output);
