import { Html, useGLTF } from '@react-three/drei';

import platformUrl from '@/assets/3d/platform.glb?url';

import type { Vec3 } from '../../map-model';
import { modelPart } from './model-part';
import type { LabelLayer } from './scene-types';

/**
 * A region's disc with its glowing rim, and the region's name beside it, with
 * a note when the list holds systems the platform has no room for.
 */
export function RegionPlatform({
  position,
  colour,
  rim,
  label,
  note,
  labelAt,
  labels,
}: {
  position: Vec3;
  colour: string;
  rim: string;
  label: string;
  note: string | null;
  labelAt: Vec3;
  labels: LabelLayer | null;
}) {
  const { nodes } = useGLTF(platformUrl, false, false);
  const disc = modelPart(nodes.Platform);
  const edge = modelPart(nodes.PlatformRim);

  if (!disc || !edge) return null;
  return (
    <group position={position}>
      <mesh geometry={disc.geometry} {...disc.transform} receiveShadow>
        <meshStandardMaterial
          color={colour}
          roughness={disc.material.roughness}
          metalness={disc.material.metalness}
        />
      </mesh>
      <mesh geometry={edge.geometry} {...edge.transform}>
        <meshStandardMaterial
          color={rim}
          emissive={rim}
          emissiveIntensity={Math.max(edge.material.emissiveIntensity, 1)}
          roughness={edge.material.roughness}
        />
      </mesh>
      {labels ? (
        <Html
          portal={labels}
          center
          position={[...labelAt]}
          className="pointer-events-none select-none"
        >
          <span className="rounded-md border border-glass-border bg-glass px-2 py-0.5 text-xs font-medium whitespace-nowrap text-foreground backdrop-blur-sm">
            {label}
            {note ? <span className="font-normal text-muted-foreground"> · {note}</span> : null}
          </span>
        </Html>
      ) : null}
    </group>
  );
}

useGLTF.preload(platformUrl, false, false);
