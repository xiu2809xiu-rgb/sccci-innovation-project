# ADR 0020: 3D assets without WebAssembly decoders

- **Status:** Accepted
- **Date:** 2026-10-22
- **Traceability:** M4 (performance and security) · capability A (the integration map)

## Context

Phase 7 builds the integration map from three models authored as parametric Blender scripts ([`assets-src/3d/`](../../assets-src/3d/README.md)). The build prompt asks for them to be optimised with glTF Transform, "Draco + WebP", within 1.5 MB.

- **Draco and Meshopt decode in WebAssembly.** three.js's `DRACOLoader` and `MeshoptDecoder` compile a WebAssembly module in the browser.
- **The CSP does not allow it.** The web app's Content Security Policy is `script-src 'self'` ([ADR 0018](0018-web-csp-inline-styles.md)). Compiling WebAssembly needs `'wasm-unsafe-eval'` in `script-src`.
- **drei's default fetches from a CDN.** By default, drei's `useGLTF` fetches the Draco decoder from a Google CDN when a model needs it, and `connect-src 'self'` blocks that.
- **The models are small.** They are flat-coloured geometry with no textures: 172 KB together straight from Blender.

## Decision

- **Quantise instead of compressing.** The build quantises the geometry with glTF Transform (`KHR_mesh_quantization`, with dedup, prune and weld). three.js's `GLTFLoader` reads that natively, so no decoder is downloaded and the CSP does not change. The web app loads models with Draco off.
- **No textures.** Colour comes from the design tokens at runtime, so one model serves both themes. A texture added later is compressed to WebP, which browsers decode themselves (`EXT_texture_webp`).
- **A budget check.** The build fails if the models together pass 1.5 MB.

## Consequences

### Positive

- The CSP stays as strict as it is.
- No decoder is downloaded before the scene can draw.
- The models are a few kilobytes each.

### Negative

- Quantised geometry is larger than Draco's for big meshes. If the map ever needs detailed models, this decision is revisited.

## Alternatives considered

| Alternative                                                       | Why not                                                                                     |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Draco or Meshopt, with the decoder served from our own origin     | Needs `'wasm-unsafe-eval'` in `script-src`, which weakens the CSP for a saving of kilobytes |
| Draco's JavaScript decoder (no WebAssembly)                       | A larger download than the models it would decode                                           |
| Geometry built procedurally in three.js, with no Blender pipeline | The prompt prefers Blender when it is available, and here it is                             |
