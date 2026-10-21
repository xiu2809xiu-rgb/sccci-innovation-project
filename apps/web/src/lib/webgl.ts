/**
 * Whether the browser can create a WebGL context. A 3D scene checks this
 * before loading, and shows its still image or drawing when it cannot. The
 * probe's context is released at once: browsers keep only a few contexts
 * alive, and a page that probes on every visit would otherwise pile them up
 * beside the scene's own.
 */
export function supportsWebGl(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return gl !== null;
  } catch {
    return false;
  }
}
