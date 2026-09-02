import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // 워크트리마다 자기 .next 를 갖는데 위의 ".next/**" 는 루트만 가린다.
    // 여러 세션이 .worktrees/ 에 브랜치를 파는 게 이 프로젝트의 작업 방식이라
    // 남의 빌드 산출물이 린트에 딸려 들어온다
    ".worktrees/**",
  ]),
]);

export default eslintConfig;
