---
paths:
  - "client/**/*.ts"
  - "client/**/*.tsx"
  - "server/**/*.ts"
---

# Code Style

## TypeScript

- Strict mode enabled in both client and server. No `any` — use `unknown` with type narrowing or define an explicit type. Prefer `interface` for object shapes, `type` for unions and intersections.

## React Components

- Functional components only — `const` arrow functions with `React.FC<Props>`, or `React.forwardRef<RefType, Props>` when a parent needs a DOM ref. Set `displayName` on any `forwardRef` component for clearer devtools. Generic components, which `React.FC` can't type, are written as `const X = <T extends string>(props: XProps<T>): React.ReactElement`. Wrap a component in `React.memo<Props>` (with a `displayName`) only when a parent re-renders it often with unchanged props.
- Props interfaces are named `{ComponentName}Props` and sit above the component, with file-level constants between them and private sub-components and helpers after it.
- If a component exceeds ~150 lines, extract sub-components or custom hooks.
- Extract hooks when logic exceeds ~20 lines or is reused across components.
- Name event handlers `handle{Event}` (e.g., `handleShowInGraph`).

## Naming & Files

- PascalCase for component files, camelCase for utility and hook files.

## Exports & Docstrings

- Named exports only. The exception is tool config files that must default-export (`vite.config.ts`, `tailwind.config.js`, `postcss.config.js`).
- Every exported function, hook, and component gets a JSDoc: a short imperative overview (a noun phrase for components), `@param name - …` for each parameter (`@param props - …` for components, one `@param options - …` for a destructured options object), and `@returns …` when it returns a value. Private helpers with a docstring follow the same format.
- Props and exported interfaces get a one-line JSDoc on each field whose meaning isn't obvious from its name, and exported constants get a one-line JSDoc. Private constants get a `//` comment only when their meaning isn't obvious.

## Imports

- Group with blank lines between groups: React and third-party libraries → Components → Hooks and stores → Utils and engine modules → Types (using `import type`).

## Code Patterns

- Prefer pure functions. Use early returns instead of deeply nested conditionals.
- Wrap async operations in try/catch with meaningful error messages, and surface errors that affect the visitor in the UI. An error you deliberately ignore gets a comment saying why.
