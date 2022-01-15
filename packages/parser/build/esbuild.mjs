// @ts-check
import {build, analyzeMetafile} from "esbuild";

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
  .then((r) => console.log("=== Typescript transpilation succesful ===", r))
  .catch(console.log);
