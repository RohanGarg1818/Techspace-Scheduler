import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
    },
    rules: {
      // Possible Problems
      "no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "no-console": "off", // Allow console.log in Node.js
      "no-constant-condition": ["error", { checkLoops: false }],

      // Best Practices
      "eqeqeq": ["error", "always"], // Require === and !==
      "curly": ["error", "all"], // Require curly braces for all control statements
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-with": "error",
      "no-multi-spaces": "error",
      "no-return-await": "error",
      "require-await": "off", // Allow async functions without await for consistency

      // ES6/Modern JavaScript
      "prefer-const": "error",
      "no-var": "error",
      "prefer-arrow-callback": "warn",
      "arrow-spacing": ["error", { before: true, after: true }],
      "prefer-template": "warn",
      "template-curly-spacing": ["error", "never"],
      "object-shorthand": ["warn", "always"],

      // Code Style (Consistency)
      "semi": ["error", "always"],
      "quotes": ["error", "double", { avoidEscape: true }],
      "comma-dangle": ["error", "always-multiline"],
      "indent": ["error", 2, { SwitchCase: 1 }],
      "linebreak-style": "off", // Allow both LF and CRLF (cross-platform)
      "space-before-function-paren": [
        "error",
        {
          anonymous: "always",
          named: "never",
          asyncArrow: "always",
        },
      ],
      "space-in-parens": ["error", "never"],
      "space-before-blocks": "error",
      "keyword-spacing": ["error", { before: true, after: true }],
      "object-curly-spacing": ["error", "always"],
      "array-bracket-spacing": ["error", "never"],
      "computed-property-spacing": ["error", "never"],
      "key-spacing": ["error", { beforeColon: false, afterColon: true }],

      // Async/Await
      "no-async-promise-executor": "error",
      "no-await-in-loop": "off", // We need sequential DB operations in seed data
      "no-promise-executor-return": "error",

      // Error Handling
      "no-throw-literal": "error",
      "prefer-promise-reject-errors": "error",
    },
  },
  {
    ignores: [
      "node_modules/",
      "dist/",
      "build/",
      "coverage/",
      "*.min.js",
      ".env",
      ".env.*",
    ],
  },
];
