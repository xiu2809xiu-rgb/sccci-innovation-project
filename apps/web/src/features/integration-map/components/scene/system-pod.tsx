import { Html, useCursor, useGLTF } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useRef, useState } from 'react';
import type { Group } from 'three';

import podUrl from '@/assets/3d/node-pod.glb?url';
import { cn } from '@/lib/utils';

import type { PlacedNode } from '../../map-model';
import { modelPart } from './model-part';
import type { LabelLayer, SceneColours } from './scene-types';
import { springStep } from './spring';

/** How brightly each state's ring glows: a running sync stands out, a retiring system barely. */
const RING_GLOW = {
  connected: 1.6,
  syncing: 3.2,
  degraded: 2,
  error: 2.4,
  idle: 0.5,
  retiring: 0.3,
} as const;

/** How far a hovered pod rises, and how stiff its spring is (it settles in about 0.4 s). */
const HOVER_LIFT = 0.18;
const HOVER_STIFFNESS = 16;

/** How far, in pixels, the pointer may move between press and release for it still to be a click. */
const CLICK_SLOP = 4;

/**
 * One system's pod with its status ring. Hovering lifts it on a spring and
 * names it with its state; clicking opens the connector. While the scene is
 * still (paused, or reduced motion), the pod rises without moving through the
 * air. The name stays mounted and only fades, so hovering never remounts it.
 */
export function SystemPod({
  node,
  colours,
  name,
  stateLabel,
  labels,
  animate,
  onOpen,
}: {
  node: PlacedNode;
  colours: SceneColours;
  name: string;
  stateLabel: string;
  labels: LabelLayer | null;
  animate: boolean;
  onOpen: (connectorId: string) => void;
}) {
  const { nodes } = useGLTF(podUrl, false, false);
  const shell = modelPart(nodes.Pod);
  const ring = modelPart(nodes.PodRing);
  const group = useRef<Group>(null);
  const velocity = useRef(0);
  const [hovered, setHovered] = useState(false);
  // A still scene draws only on demand, so a hover asks for the frame that shows it.
  const invalidate = useThree((state) => state.invalidate);
  useCursor(hovered);

  useFrame((_, delta) => {
    const current = group.current;
    if (!current) return;
    const target = node.position[1] + (hovered ? HOVER_LIFT : 0);
    if (!animate) {
      current.position.y = target;
      velocity.current = 0;
      return;
    }
    const next = springStep(
      { position: current.position.y, velocity: velocity.current },
      target,
      HOVER_STIFFNESS,
      delta,
    );
    current.position.y = next.position;
    velocity.current = next.velocity;
  });

  if (!shell || !ring) return null;
  const retiring = node.state === 'retiring';
  const colour = colours.states[node.state];
  return (
    <group
      ref={group}
      position={node.position}
      onPointerOver={(event) => {
        event.stopPropagation();
        setHovered(true);
        invalidate();
      }}
      onPointerOut={() => {
        setHovered(false);
        invalidate();
      }}
      onClick={(event) => {
        event.stopPropagation();
        // R3F reports a click on the pod a drag started on, however far it went: that was an orbit.
        if (event.delta > CLICK_SLOP) return;
        onOpen(node.id);
      }}
    >
      <mesh geometry={shell.geometry} {...shell.transform} castShadow>
        {/* Less metallic than the Blender material: this light rig is darker than the still's
            world, and a strongly metallic shell would mirror it as near black. */}
        <meshStandardMaterial
          color={colours.shell}
          roughness={0.4}
          metalness={0.15}
          transparent={retiring}
          opacity={retiring ? 0.4 : 1}
        />
      </mesh>
      <mesh geometry={ring.geometry} {...ring.transform}>
        <meshStandardMaterial
          color={colour}
          emissive={colour}
          emissiveIntensity={RING_GLOW[node.state]}
          roughness={ring.material.roughness}
        />
      </mesh>
      {labels ? (
        <Html
          portal={labels}
          center
          position={[0, 0.7, 0]}
          className="pointer-events-none select-none"
        >
          <span
            className={cn(
              'flex flex-col rounded-md border border-glass-border bg-glass px-2.5 py-1.5 text-xs whitespace-nowrap text-foreground shadow-md backdrop-blur-md motion-safe:transition-opacity motion-safe:duration-150',
              hovered ? 'opacity-100' : 'opacity-0',
            )}
          >
            <span className="font-medium">{name}</span>
            <span className="text-muted-foreground">{stateLabel}</span>
          </span>
        </Html>
      ) : null}
    </group>
  );
}

useGLTF.preload(podUrl, false, false);
