# Development Rules & Gotchas

## Critical Lessons from Initial Setup

### 1. Electron Forge + Vite Configuration

**ERROR:** `"@vitejs/plugin-react" resolved to an ESM file. ESM file cannot be loaded by require.`

**ROOT CAUSE:** Using `.ts` extension for Vite config files when importing ESM-only packages.

**SOLUTION:**
- Use `.mjs` extension for Vite config files: `vite.renderer.config.mjs`, `vite.main.config.mjs`, `vite.preload.config.mjs`
- Update `forge.config.ts` to reference `.mjs` files
- ESM-only packages (like `@vitejs/plugin-react`) work fine with `.mjs` configs

**RULE:** When using Electron Forge with Vite and ESM packages → always use `.mjs` for Vite configs.

---

### 2. Documentation First, Not Trial-and-Error

**BAD PRACTICE:** Making incremental fixes without understanding the root cause ("fixing line by line")

**GOOD PRACTICE:**
1. Use brave MCP to look up the latest documentation when running into an error and make sure it hasnt changed. If, after trying a fix it still fails, use Context7
2. Audit entire configuration against docs
3. Understand the "why" before applying fixes

---

### 3. Electron + React Stack Specifics

**KEY FACTS:**
- `@vitejs/plugin-react` is ESM-only (v5+)
- Electron Forge uses esbuild internally which struggles with ESM in `.ts` configs
- `.mjs` files are native ESM and bypass this issue

**FILE STRUCTURE:**
```
forge.config.ts          (TypeScript OK - no ESM imports)
vite.main.config.mjs     (Must be .mjs for ESM packages)
vite.renderer.config.mjs (Must be .mjs for ESM packages)
vite.preload.config.mjs  (Must be .mjs for ESM packages)
```

---

### 4. Dependencies Best Practices

**INSTALLED:**
- React deps in `dependencies` (runtime): `react`, `react-dom`
- Types in `dependencies` (needed for TS): `@types/react`, `@types/react-dom`
- Build tools in `devDependencies`: `@vitejs/plugin-react`, `prettier`

**RULE:** Types can go in `dependencies` for Electron apps (bundled anyway).

---

### 5. Hot Reload Verification

**WHAT WORKS:**
- Editing `src/renderer/App.tsx` → auto-updates without restart
- Vite HMR works out of the box with correct `.mjs` configs

**WHAT TO TEST:**
1. Change component code → should see update immediately
2. Check browser console for TypeScript errors
3. Verify no ESLint errors in terminal

---

## Quick Reference

### When you see ESM errors:
1. Check file extensions (use `.mjs` for Vite configs with ESM imports)
2. Verify plugin versions are compatible
3. Check Electron Forge docs for latest patterns

### Before debugging:
1. Read error message fully
2. Check Context7 for latest docs
3. Audit config files systematically
4. Don't guess and iterate

### Config file naming convention:
- **TypeScript configs**: `forge.config.ts`, `tsconfig.json`
- **Vite configs with ESM**: `vite.*.config.mjs`
- **React entry point**: `src/renderer/index.tsx`
