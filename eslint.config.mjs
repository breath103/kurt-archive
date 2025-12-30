import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ["node_modules/", ".next/", "out/", "*.config.js", "*.config.ts"],
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "separate-type-imports" },
      ],
      quotes: ["error", "double", { avoidEscape: true }],
      indent: ["error", 2],
      "lines-between-class-members": [
        "error",
        {
          enforce: [
            { blankLine: "always", prev: "method", next: "method" },
          ],
        },
      ],
    },
  }
);
