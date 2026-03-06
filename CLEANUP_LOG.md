# 🧹 CLEANUP_LOG.md

This log tracks all architectural cleanups, dead code eliminations, and bundle size reduction efforts run by the Garbage Disposer.

| Date | Action | Files Modified | Lines Removed | Description / Reason |
|------|--------|----------------|---------------|----------------------|
| 2026-03-06 | Dead Code Elim | `apps/web/src/lib/api.ts` | ~30 | Removed 100% unused `getEventsByDate`, `getAIWeeklyReport` and unexported internal types that were unnecessarily exported. |
| 2026-03-06 | API Refactor | `packages/api/routers/analyze.py` | 2 | Removed dead `face_need_label` and `face_all_needs` parameters from `/combined` endpoint, aligning perfectly with frontend params. |
| 2026-03-06 | ESLint Fix | `[multiple]` | 4 | Removed unused Icon imports across 4 page files to resolve all warnings (`Wifi`, `Search`, `Sparkle`, `RiLockLine`). |
| 2026-03-06 | UI Cleanup | `login/page.tsx` | ~20 | Cleaned up obsolete visual fluff (clouds, redundant baby logo) to strictly match the requested clean visual direction. |
