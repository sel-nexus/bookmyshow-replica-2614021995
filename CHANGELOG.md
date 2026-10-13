# Changelog

## Unreleased — Application Dark Mode

### Feature
- Add an accessible native Light/Dark Appearance selector in the shared header.
- Preserve Light as the default regardless of operating-system preference; validate local preferences and restore them before paint.
- Keep session switching usable when local storage getters, reads or writes fail.
- Keep root children stable so appearance changes do not reset routes, authentication, booking selections or unsaved inputs.
- Add warm charcoal, ivory, coral and amber semantic Dark tokens and coherent selected, disabled, focus, status and error treatment across all six existing screens. Preserve inherited Light style values, fonts and spacing; previously unstyled booking controls receive Dark-only color rules.

### Files
- `frontend/lib/theme.ts`: validation, safe storage and pre-paint bootstrap.
- `frontend/lib/theme-context.tsx`: stable root appearance context.
- `frontend/components/ThemeToggle.tsx`: named native selector with current selection.
- `frontend/components/AppShell.tsx`: shared selector placement and JSX-runtime compatibility.
- `frontend/app/layout.tsx`: root provider and blocking bootstrap integration.
- `frontend/app/globals.css`: semantic Dark palette and existing control-state coverage.
- `frontend/__tests__/theme.test.tsx`: preference/bootstrap/provider/selector regression tests.
- `frontend/e2e/theme.spec.ts`: real-server booking, persistence, keyboard, mobile, loading/empty/invalid-OTP recovery and preflight evidence specs.
- `frontend/e2e/theme-fixtures.ts`: disposable SQLite empty-state fixture with exact restoration and genuine HTTP transport latency.
- `README.md`: appearance usage, behavior and exact test commands.
- `CHANGELOG.md`: feature and compatibility notes.

### Compatibility
- Breaking changes: none.
- Migration: none. No backend, schema or dependency changes.
- Third-party font delivery is not theme-controlled. Automated unit/API/integration/browser and production/container builds were verified; visual acceptance by a product/design authority remains pending (RG-06).
- Unchanged legacy proxy/auth/transaction test gaps and request-lifecycle races are disclosed in the implementation plan; this appearance-only revision does not claim to repair them.
