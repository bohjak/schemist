// @ts-check
import tsc from "typescript";

/**
 * @typedef {tsc.CompilerOptions} TsCompilerOptions
 * @param {string[]} fileNames
 * @param {TsCompilerOptions} options
 */
function compile(fileNames, options) {
  try {
    // Prepare and emit the d.ts files
    const program = tsc.createProgram(fileNames, options);
    const emitResult = program.emit();

    const allDiagnostics = tsc
      .getPreEmitDiagnostics(program)
      .concat(emitResult.diagnostics);

    const messages = allDiagnostics.map((diagnostic) => {
      if (diagnostic.file) {
        const {line, character} = tsc.getLineAndCharacterOfPosition(
          diagnostic.file,
          diagnostic.start
        );
        const message = tsc.flattenDiagnosticMessageText(
          diagnostic.messageText,
          "\n"
        );
        return `${diagnostic.file.fileName} (${line + 1},${
          character + 1
        }): ${message}`;
      } else {
        return tsc.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
      }
    });

    if (messages.length) {
      return Promise.reject(messages);
    }

    return Promise.resolve();
  } catch (e) {
    return Promise.reject(e);
  }
}

// Run the compiler
compile(["src/index.ts"], {
  declaration: true,
  emitDeclarationOnly: true,
  outDir: "dist",
  forceConsistentCasingInFileNames: true,
  esModuleInterop: true,
  declarationMap: true,
  strict: true,
  lib: ["lib.esnext.d.ts", "lib.dom.d.ts"],
  // target: tsc.ScriptTarget.ESNext,
})
  .then(() =>
    console.log("=== Type declaration successful".padEnd(39, " ") + "===")
  )
  .catch((e) => {
    console.log("TSC found the following type errors:");
    Array.isArray(e) ? e.forEach((m) => console.log(m)) : console.log(e);
    console.log();
  });
