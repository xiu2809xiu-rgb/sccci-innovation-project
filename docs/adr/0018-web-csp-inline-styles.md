# ADR 0018: Allow inline styles in the web content security policy

- **Status:** Accepted
- **Date:** 2026-10-20
- **Traceability:** M4.1-04 · capability F

## Context

The web container's nginx sends a strict content security policy ([ADR 0014](0014-deployment-docker-aws.md), Phase 2): `style-src 'self'`, `script-src 'self'`, `font-src 'self'` and no inline anything.

Running the Phase 4 build behind that policy in Chromium showed two classes of blocked resources:

1. **Runtime `<style>` elements** injected by libraries we rely on: Radix's scroll lock for dialogs, sheets and menus (through `react-remove-scroll` and `react-style-singleton`), and the `sonner` toaster's stylesheet. Blocking them breaks scroll locking under modals and leaves toasts unstyled.
2. **Fonts inlined as `data:` URIs** by Vite (small Noto Sans SC subsets fall under its 4 KB inline limit).

Our own code adds no runtime `<style>` elements: the one vendored component that did (LatticeLoader's keyframes) was moved to a co-located stylesheet. React's `style` props are applied through the CSSOM, which the policy does not block.

Options considered:

| Option                             | Assessment                                                                                                                                                                                                  |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nonces                             | nginx would have to template a fresh nonce into `index.html` and the header per request (`sub_filter`), and both libraries would need to read it. `sonner` has no nonce support. Too fragile for the value. |
| Hashes                             | The injected stylesheets change with library versions and runtime state. Not maintainable.                                                                                                                  |
| Replace the libraries              | Radix is our accessibility foundation; replacing it to satisfy a style directive would cost far more than it protects.                                                                                      |
| `style-src 'self' 'unsafe-inline'` | Inline styles cannot run script. The remaining risk is CSS injection (for example styling-based data exfiltration), which needs an injection point; React escapes all text, and we render no user HTML.     |

## Decision

- `style-src 'self' 'unsafe-inline'` in the web policy. Every other directive stays strict: `script-src 'self'` (no inline scripts, no `eval`), `default-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`.
- Fonts are never inlined: `build.assetsInlineLimit` in `vite.config.ts` keeps every `.woff2` as a file, so `font-src 'self'` stays as it is.
- Our own components must not create `<style>` elements; keyframes go in stylesheet files (checklist in [reactbits-usage.md](../design/reactbits-usage.md)).
- The API's policy is unchanged (`default-src 'none'`); it serves JSON, not pages.

## Consequences

- Scroll locking and toasts work under the production policy, and the browser console is free of CSP violations.
- The policy is one notch weaker on styles. The Phase 10 security checklist records this residual risk, and the decision is revisited if `sonner` and Radix gain nonce support.
- Script injection, the threat a CSP exists to stop, remains fully blocked.
