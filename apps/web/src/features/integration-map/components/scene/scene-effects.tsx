import { Bloom, EffectComposer, TiltShift, ToneMapping } from '@react-three/postprocessing';
import { KernelSize, ToneMappingMode } from 'postprocessing';

/**
 * Bloom on the emissive parts, a subtle depth of field, then ACES filmic tone
 * mapping (the canvas renders flat so this is the only one). The canvas is
 * transparent, which shapes two choices: the depth of field is a tilt-shift
 * blur, because postprocessing's DepthOfField keeps its blur amount in the
 * alpha channel and turns the stage black; and the vignette is the stage's CSS
 * gradient, because a shader vignette has nothing to darken. On a struggling
 * device the blur and multisampling go first.
 */
export function SceneEffects({ quality }: { quality: 'high' | 'low' }) {
  const high = quality === 'high';
  return (
    <EffectComposer multisampling={high ? 4 : 0}>
      <Bloom mipmapBlur intensity={0.55} luminanceThreshold={0.85} luminanceSmoothing={0.2} />
      {high ? <TiltShift focusArea={0.6} feather={0.3} kernelSize={KernelSize.SMALL} /> : <></>}
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}
