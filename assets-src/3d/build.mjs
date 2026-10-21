// Builds the integration map's 3D assets: runs each Blender script headless, optimises the GLBs,
// then renders the still image shown when the browser has no WebGL.
// Usage: pnpm assets:3d. Set BLENDER to Blender's executable if it is not on the PATH.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Logger, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, quantize, weld } from '@gltf-transform/functions';

const here = dirname(fileURLToPath(import.meta.url));
const output = join(here, '../../apps/web/src/assets/3d');
const ASSETS = ['core', 'node-pod', 'platform'];
/** Every 3D asset together, as the build prompt sets it (Phase 7). */
const BUDGET_BYTES = 1.5 * 1024 * 1024;

const blender = process.env.BLENDER ?? 'blender';
const work = mkdtempSync(join(tmpdir(), 'huitong-3d-'));
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

let total = 0;
try {
  for (const name of ASSETS) {
    const raw = join(work, `${name}.glb`);
    execFileSync(blender, ['-b', '--factory-startup', '-P', join(here, `${name}.py`), '--', raw], {
      stdio: ['ignore', 'ignore', 'inherit'],
    });
    const document = await io.read(raw);
    document.setLogger(new Logger(Logger.Verbosity.WARN));
    // Quantised geometry loads in three.js without a decoder. Draco and Meshopt need
    // WebAssembly, which the web app's Content Security Policy does not allow (ADR 0020).
    await document.transform(dedup(), prune(), weld(), quantize());
    const target = join(output, `${name}.glb`);
    await io.write(target, document);
    const size = statSync(target).size;
    total += size;
    console.log(`${name}.glb: ${kb(size)} (from ${kb(statSync(raw).size)})`);
  }
  // The still composes the optimised models, so it is rendered last.
  const still = join(output, 'integration-map-fallback.webp');
  execFileSync(blender, ['-b', '--factory-startup', '-P', join(here, 'fallback.py'), '--', still], {
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  const size = statSync(still).size;
  total += size;
  console.log(`integration-map-fallback.webp: ${kb(size)}`);
} finally {
  rmSync(work, { recursive: true, force: true });
}

console.log(`total: ${kb(total)} of the ${kb(BUDGET_BYTES)} budget`);
if (total > BUDGET_BYTES) {
  console.error('The 3D assets are over budget.');
  process.exit(1);
}
