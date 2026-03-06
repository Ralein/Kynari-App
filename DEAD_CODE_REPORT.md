# 🗑️ DEAD_CODE_REPORT.md (The Garbage Disposer Sweep)

## 📦 1. Unused Dependencies (Candidate for Removal)
*Found via `depcheck` & `knip`*

| Dependency | Location | Notes |
|------------|----------|-------|
| `@kynari/shared` | `apps/web/package.json` | Knip reports this as unused. Wait, we must verify if any types or constants from the shared package are actively being used across the UI before removal (e.g. `NEED_EMOJI`). |
| `postcss` | `apps/web/postcss.config.mjs` | Used in configuration but missing from explicit `package.json` dependencies (unlisted). We need to `pnpm add postcss` or ensure it's provided by Next.js. |

*(Note: `depcheck` reported `@tailwindcss/postcss` and `tailwindcss` as unused devDependencies, but these are definitively used by Next.js 15 / Tailwind v4 and are false positives).*

## 🔌 2. Unused Exports & Dead Code Paths
*Found via `ts-prune` & `knip` static analysis*

**File: `apps/web/src/lib/api.ts`**
The following functions and types are exported but never imported anywhere else in the application. They can be safely removed or kept un-exported if only used internally.

**Functions:**
- 🔴 `export const getEventsByDate` (never imported)
- 🔴 `export const getAIWeeklyReport` (never imported)

**Types/Interfaces:**
- 🔴 `export interface WeeklyReport`
- 🔴 `export interface AnalyzeAudioResult`
- 🔴 `export interface AnalyzeVideoResult`
- 🔴 `export interface SaveResultResponse`
- 🔴 `export interface CombinedAnalysisResult`

## 📂 3. Orphaned Files / Unused Components
Currently, the codebase looks cleanly structured for whole files! All created components and hooks are properly wired and imported. Knip and ts-prune only surfaced the Next.js standard `page.tsx` and `layout.tsx` default exports, which are required framework abstractions.

---
**Next Steps:** Please review the items above. If you give me the 🟢 **GO AHEAD**, I will proceed to surgically remove these dead paths and log the exact changes in `CLEANUP_LOG.md`.
