import { dirname, resolve } from "path";
import { includeIgnoreFile } from "@eslint/compat";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import unusedImports from 'eslint-plugin-unused-imports';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const esLintignorePath = resolve(__dirname, ".gitignore");

const eslintConfig = [
  includeIgnoreFile(esLintignorePath),
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  // Add rules for cleaner code
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    plugins: {
      'unused-imports': unusedImports
    },
    rules: {
      // Detect unused imports and variables
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-imports": "warn",
      "unused-imports/no-unused-vars": ["warn", {
        "vars": "all",
        "args": "after-used",
        "ignoreRestSiblings": true,
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_"
      }],

      //
       "react/no-unescaped-entities": ["error", { "forbid": [">", "}"] }],
    "@next/next/no-img-element": "warn",
    "react-hooks/exhaustive-deps": ["warn", {
      "additionalHooks": "(useRecoilCallback|useRecoilTransaction_UNSTABLE)"
    }],

      //
      "@typescript-eslint/no-explicit-any": [
        "warn",  // or "error" if you want to be strict
        {
          "fixToUnknown": true,
          "ignoreRestArgs": true
        }
      ],

      // Remove unnecessary console.logs
      "no-console": ["warn", { "allow": ["warn", "error"] }],

       // Enforce consistent import sorting
       "import/order": ["warn", {
        "groups": ["builtin", "external", "internal", "parent", "sibling", "index"],
        "newlines-between": "always",
        "alphabetize": { "order": "asc", "caseInsensitive": true }
      }],

      // Enforce consistent spacing and formatting
      "no-multiple-empty-lines": ["warn", { "max": 1, "maxEOF": 1 }],
      "padding-line-between-statements": [
        "warn",
        { "blankLine": "always", "prev": "*", "next": "return" }
      ],

      // Prevent unnecessary boolean conversions
      "no-extra-boolean-cast": "warn",

      // Enforce consistent function returns
      "consistent-return": "warn",

      // Prevent unreachable code
      "no-unreachable": "error",

      // Prevent code that will never execute
      "no-constant-condition": "warn",

      // Hydration issues - keeping these from previous config
      "react/jsx-key": "error",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // Detect when you can use object shorthand
      "object-shorthand": ["warn", "always"],

      // Encourage using template literals instead of string concatenation
      "prefer-template": "warn",

      // No unnecessary fragments
      "react/jsx-no-useless-fragment": "warn"
    }
  }
];

export default eslintConfig;