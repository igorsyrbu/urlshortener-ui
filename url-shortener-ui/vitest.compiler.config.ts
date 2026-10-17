// The unit suite runs without the React Compiler (@vitejs/plugin-react v6 has no `babel` option), while production
// compiles every component. This config adds the compiler, for two scripts:
//   pnpm test:perf      render-count thresholds (`*.perf.test.tsx`), meaningful only with the compiler on
//   pnpm test:compiled  the whole unit suite compiled, to catch bugs only the compiled code has
import {createRequire} from "node:module";
import path from "node:path";
import {configDefaults} from "vitest/config";
import baseConfig from "./vitest.config";

const appRequire = createRequire(path.join(__dirname, "package.json"));
const babel = appRequire("@babel/core");
const reactCompiler = appRequire("babel-plugin-react-compiler");
const COMPILED_SOURCE_PATTERN = /\/src\/(?!test\/|.*\.(test|perf\.test)\.).*\.(ts|tsx)$/;
// Server components are called as plain functions in their tests; the compiler's memo cache needs a React render.
const SERVER_COMPONENT_PATH = "/src/app/inspect/";

const reactCompilerPlugin = {
    name: "react-compiler-for-vitest",
    enforce: "pre" as const,
    transform(code: string, id: string) {
        if (!COMPILED_SOURCE_PATTERN.test(id) || id.includes(SERVER_COMPONENT_PATH)) return null;
        const result = babel.transformSync(code, {
            filename: id,
            babelrc: false,
            configFile: false,
            sourceMaps: true,
            parserOpts: {plugins: ["typescript", "jsx"]},
            plugins: [[reactCompiler.default ?? reactCompiler, {panicThreshold: "all_errors"}]],
        });
        return result?.code ? {code: result.code, map: result.map} : null;
    },
};

const compilerConfig = {
    ...baseConfig,
    plugins: [reactCompilerPlugin, ...(baseConfig.plugins ?? [])],
    test: {
        ...baseConfig.test,
        include: [process.env.COMPILED_TEST_INCLUDE ?? "src/**/*.perf.test.tsx"],
        exclude: [...configDefaults.exclude],
        coverage: {enabled: false},
    },
};

export default compilerConfig;
