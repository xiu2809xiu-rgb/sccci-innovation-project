import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group, MeshStandardMaterial } from 'three';

import coreUrl from '@/assets/3d/core.glb?url';

import { modelPart } from './model-part';
import type { SceneColours } from './scene-types';

/**
 * The HuiTong core: the faceted crystal turns slowly while its inner light
 * breathes. The glass is clear-coated and see-through rather than refractive:
 * transmission refracts what is behind it, and behind it is the transparent
 * stage, which it would show as black. It also spares a render pass a frame.
 */
export function CoreModel({ colours, animate }: { colours: SceneColours; animate: boolean }) {
  const { nodes } = useGLTF(coreUrl, false, false);
  const shell = modelPart(nodes.Core);
  const light = modelPart(nodes.CoreLight);
  const group = useRef<Group>(null);
  const glow = useRef<MeshStandardMaterial>(null);
  const baseGlow = light?.material.emissiveIntensity ?? 5;

  useFrame(({ clock }, delta) => {
    if (!animate) return;
    if (group.current) group.current.rotation.y += delta * 0.12;
    if (glow.current) glow.current.emissiveIntensity = baseGlow + Math.sin(clock.elapsedTime * 1.4);
  });

  if (!shell || !light) return null;
  return (
    <group ref={group} position={[0, 0.9, 0]} scale={0.85}>
      <mesh geometry={shell.geometry} {...shell.transform} castShadow>
        <meshPhysicalMaterial
          color={colours.core}
          roughness={shell.material.roughness}
          metalness={0}
          emissive={colours.core}
          emissiveIntensity={0.18}
          transparent
          opacity={0.42}
          clearcoat={1}
          clearcoatRoughness={0.04}
          envMapIntensity={1.6}
          flatShading
        />
      </mesh>
      <mesh geometry={light.geometry} {...light.transform}>
        <meshStandardMaterial
          ref={glow}
          color={colours.coreLight}
          emissive={colours.coreLight}
          emissiveIntensity={baseGlow}
          roughness={light.material.roughness}
        />
      </mesh>
    </group>
  );
}

useGLTF.preload(coreUrl, false, false);
