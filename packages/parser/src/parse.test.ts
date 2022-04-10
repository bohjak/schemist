import {prepareJSONSchema7} from "./parse";
// @ts-ignore
import fds from "./fds.json";

const dict = {};

prepareJSONSchema7({schema: fds, dict});

const output = Object.keys(dict);
console.log(output);
