// @ts-check
import {build, analyzeMetafile} from "esbuild";
import {performance} from "perf_hooks";

const start = performance.now();

build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  minify: true,
  sourcemap: true,
  outdir: "dist",
  platform: "node",
  target: "node14",
  external: ["react", "react-dom", "styled-components"],
  metafile: true,
})
  .then(({metafile}) => analyzeMetafile(metafile))
  .then((r) => {
    console.log("=== Typescript transpilation succesful ===");
    console.log(r);
    console.log(`⚡ Done in ${Math.round(performance.now() - start)}ms`);
    console.log();
  })
  .catch(console.log);
