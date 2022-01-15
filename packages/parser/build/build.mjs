// @ts-check
import {Worker} from "worker_threads";
import {performance} from "perf_hooks";

const start = performance.now();

/**
 * @param {string} path
 */
const runService = (path) => {
  return new Promise((res, rej) => {
    const worker = new Worker(path);
    worker.on("message", res);
    worker.on("error", rej);
    worker.on("exit", (code) => {
      if (code !== 0) {
        rej(new Error(`stopped with ${code} exit code`));
      } else {
        res();
      }
    });
  });
};

Promise.all([runService("./build/esbuild.mjs"), runService("./build/tsc.mjs")])
  .then(() => {
    console.log("Build successful");
  })
  .finally(() => {
    console.log(`Done in ${Math.round(performance.now() - start)}ms`);
  });
