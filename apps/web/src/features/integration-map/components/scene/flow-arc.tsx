import { QuadraticBezierLine } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { QuadraticBezierCurve3, Vector3, type Mesh } from 'three';

import { arcMidpoint, type NodeState, type Vec3 } from '../../map-model';

/** Where every arc meets the core: its centre, just above the ground. */
const CORE: Vec3 = [0, 0.9, 0];

/** Packets per arc and their speed: a running sync lights its flow up (story A-6). */
const FLOW: Readonly<Record<NodeState, { packets: number; speed: number; opacity: number }>> = {
  connected: { packets: 1, speed: 0.16, opacity: 0.55 },
  syncing: { packets: 4, speed: 0.55, opacity: 0.95 },
  degraded: { packets: 1, speed: 0.08, opacity: 0.6 },
  error: { packets: 0, speed: 0, opacity: 0.8 },
  idle: { packets: 0, speed: 0, opacity: 0.25 },
  retiring: { packets: 0, speed: 0, opacity: 0.2 },
};

/**
 * The flow from a system to the core: an arc in the state's colour, dashed
 * when it is broken or fading, with packets travelling along it. Still, the
 * packets wait evenly spaced along the arc.
 */
export function FlowArc({
  from,
  state,
  colour,
  animate,
}: {
  from: Vec3;
  state: NodeState;
  colour: string;
  animate: boolean;
}) {
  const middle = useMemo(() => arcMidpoint(from, CORE), [from]);
  const curve = useMemo(
    () =>
      new QuadraticBezierCurve3(new Vector3(...from), new Vector3(...middle), new Vector3(...CORE)),
    [from, middle],
  );
  const { packets, speed, opacity } = FLOW[state];
  const meshes = useRef<(Mesh | null)[]>([]);

  useFrame(({ clock }) => {
    meshes.current.forEach((mesh, index) => {
      if (!mesh) return;
      const offset = index / packets;
      const progress = animate ? (clock.elapsedTime * speed + offset) % 1 : offset + 0.5 / packets;
      curve.getPoint(progress, mesh.position);
    });
  });

  const broken = state === 'error' || state === 'retiring';
  return (
    <>
      <QuadraticBezierLine
        start={[...from]}
        end={[...CORE]}
        mid={[...middle]}
        color={colour}
        lineWidth={state === 'syncing' ? 2.2 : 1.3}
        transparent
        opacity={opacity}
        dashed={broken}
        dashSize={0.18}
        gapSize={0.12}
      />
      {Array.from({ length: packets }, (_, index) => (
        <mesh
          key={index}
          ref={(mesh) => {
            meshes.current[index] = mesh;
          }}
        >
          <sphereGeometry args={[0.055, 16, 16]} />
          <meshBasicMaterial color={colour} toneMapped={false} />
        </mesh>
      ))}
    </>
  );
}
