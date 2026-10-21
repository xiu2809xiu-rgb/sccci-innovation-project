# 3D assets for the integration map

The source of the three models the integration map (`/integration-map`, Phase 7) draws. Each one is a parametric Blender Python script, built headless and exported as GLB:

| Script                       | Model            | Objects and materials the web app relies on                                                           |
| ---------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------- |
| [`core.py`](core.py)         | The HuiTong core | `Core` (material `CoreGlass`, transmissive and faceted), `CoreLight` (material `CoreLight`, emissive) |
| [`node-pod.py`](node-pod.py) | A system node    | `Pod` (material `PodShell`), `PodRing` (material `PodStatus`, emissive: tinted by the sync state)     |
| [`platform.py`](platform.py) | A regional disc  | `Platform` (material `PlatformBase`), `PlatformRim` (material `PlatformRim`, faintly emissive)        |

[`fallback.py`](fallback.py) composes the three built models the way the live scene does and renders the still image the page shows when the browser has no WebGL (Cycles, with a transparent background and a shadow catcher, so it sits on either theme).

Shared helpers are in [`lib.py`](lib.py). The names in the table are a contract: the web app finds objects and materials by name, so a rename here needs the same rename there.

## Build

```sh
pnpm assets:3d
```

[`build.mjs`](build.mjs) runs each script with `blender -b --factory-startup` and optimises the result with glTF Transform (dedup, prune, weld, quantize). It writes the models, and then the still rendered from them, to `apps/web/src/assets/3d/`. It fails if together they exceed the 1.5 MB budget.

If Blender is not on the `PATH`, give its executable in `BLENDER`, for example on Windows:

```sh
BLENDER="C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" pnpm assets:3d
```

The models in the repository were built with Blender 5.2.1 LTS. Commit the rebuilt models with the script change that produced them.

## Why the models look the way they do

- **Colour comes from the design tokens.** The materials carry the physical look (roughness, metalness, transmission, emission). The web app sets their colours from `tokens.css` at runtime, so one file serves the light and the dark theme. There are no textures. If one is added, compress it to WebP.
- **No Draco or Meshopt.** Both need WebAssembly, which the web app's Content Security Policy does not allow, so the geometry is quantised instead ([ADR 0020](../../docs/adr/0020-3d-assets-without-wasm-decoders.md)).
- **Bevels and facets.** Bevelled edges catch the light; the core's flat-shaded facets read as cut crystal.
