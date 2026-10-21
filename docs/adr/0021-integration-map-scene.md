# ADR 0021: The integration map scene

- **Status:** Accepted
- **Date:** 2026-10-22
- **Traceability:** M4.2 (performance) · M4.3 (accessibility) · capability A (A.7, the integration map)

## Context

Phase 7 builds the integration map as a 3D scene ([`features/integration-map/`](../../apps/web/src/features/integration-map/)). The build prompt asks for ACES tone mapping, environment lighting, soft shadows, "bloom with subtle depth of field and vignette", adaptive quality, a still frame under reduced motion and labels over the scene. The libraries are three.js r186, React Three Fiber 9, drei 10 and postprocessing 6 under React 19. Building and measuring the scene in a real browser turned up six facts:

- **A scene background never matches the card.** The background goes through ACES and the effects like every other pixel, so the card's white came out light grey, and the stage no longer matched the page around it.
- **postprocessing's DepthOfField uses the alpha channel.** It stores the far circle of confusion in alpha. Over a transparent canvas the background is fully out of focus, so the whole stage turned black.
- **Transmission refracts a transparent stage as black.** `MeshPhysicalMaterial.transmission` draws what is behind the glass, and behind it there is nothing.
- **drei's `Html` loses labels under React 19.** It remounts a label's React root when its mount point changes, which happens once `events.connected` arrives after the first render. React 19 defers the synchronous unmount, and the deferred unmount empties the remounted label: the Singapore label never appeared.
- **drei's PerformanceMonitor counts every incline as a flip-flop.** With `flipflops` set, a fast device that keeps inclining reaches the limit in about ten seconds. `onFallback` then locked an RTX 3060 to low quality (measured: the pixel ratio fell from 1.5 to 1 after 10.5 seconds and stayed there).
- **three.js r186 removed `PCFSoftShadowMap`.** React Three Fiber's `shadows="soft"` falls back to hard PCF shadows with a warning.

## Decision

- **A transparent canvas on the card.** The canvas has `alpha: true` and no background, so the section's `bg-card` is the stage in both themes. The vignette is a CSS radial gradient from `--card` to `--background`.
- **Depth of field as tilt-shift.** postprocessing's `TiltShift` blurs colour and alpha together, so it keeps the stage transparent. The focus band runs through the platforms and the core, and softens the raised platform behind them. Bloom and ACES tone mapping stay as asked.
- **See-through glass for the core.** The crystal is alpha-blended, clear-coated and flat-shaded, with a faint emissive tint. The inner light carries the glow through bloom.
- **One label layer.** Every `Html` label mounts in a fixed layer over the canvas (drei's `portal`), which mounts once and never changes. A pod's name stays mounted and fades, so hovering never remounts a label.
- **Adaptive quality that counts real changes.** [`nextQuality`](../../apps/web/src/features/integration-map/hooks/use-adaptive-quality.ts) steps between high quality (pixel ratio up to 2, the blur and multisampling) and low quality (ratio 1, neither). It counts only changes of direction, and a device that changes direction more than three times settles on low.
- **Soft shadows from PCF's radius.** In r186, PCF samples a Vogel disk scaled by `shadow.radius`, so `shadows="percentage"` with a radius of 5 gives soft edges. An invisible ground catches the shadows, as the fallback still's floor does.

Smaller decisions made with these:

- The healthy state is "connected", because Teams, DingTalk and OA never sync employee data and "synced" would be false for them.
- A platform holds six pods, problems first. Its label says how many more systems the list beside the scene has.
- Each model part carries its node's transform, because the quantised geometry from [ADR 0020](0020-3d-assets-without-wasm-decoders.md) keeps its dequantisation scale on the node.

## Consequences

### Positive

- One stage serves both themes and matches the cards around it.
- The still frame under reduced motion draws at full quality without a black stage.
- A fast device keeps full quality for as long as the page is open.
- The glass draws no second pass of the scene each frame, which transmission would.

### Negative

- Tilt-shift blurs by height on the screen, not by depth, so near and far objects at the same height share the blur. At the strength used, the difference is not visible.
- The glass does not refract.
- The label layer depends on how drei's `Html` picks its mount point. A drei upgrade is checked against it (every label visible in both themes and languages).
- `nextQuality` repeats part of drei's logic, because drei's own fallback cannot tell a fast device from a struggling one.

## Alternatives considered

| Alternative                                     | Why not                                                                                                   |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| An opaque canvas with the card colour behind it | ACES and the effects shift it, so the stage is a different colour from the card                           |
| A background inverse-tone-mapped to the card    | White needs a value of about 25 before ACES, and bloom then lights the whole stage                        |
| DepthOfField over an opaque canvas              | Brings back the mismatched stage                                                                          |
| Transmission glass over an opaque stage         | The same mismatch, and transmission renders the scene a second time each frame                            |
| drei's `flipflops` and `onFallback`             | Locked a fast device to low quality within ten seconds                                                    |
| React Bits GlassSurface for the panels          | A second WebGL context and frame loop beside the scene ([React Bits usage](../design/reactbits-usage.md)) |
