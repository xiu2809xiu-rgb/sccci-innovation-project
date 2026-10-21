import { Environment, Lightformer, OrbitControls, PerformanceMonitor } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useMemo, useState } from 'react';

import { useAdaptiveQuality } from '../../hooks/use-adaptive-quality';
import { useCoarsePointer } from '../../hooks/use-coarse-pointer';
import { layoutClusters, type Cluster, type MapNode, type Vec3 } from '../../map-model';
import { CoreModel } from './core-model';
import { FlowArc } from './flow-arc';
import { RegionPlatform } from './region-platform';
import { SceneEffects } from './scene-effects';
import type { LabelLayer, SceneColours, SceneText } from './scene-types';
import { SystemPod } from './system-pod';

export interface ConstellationSceneProps {
  nodes: readonly MapNode[];
  /** False when paused, off-screen, in a hidden tab or with reduced motion: a still frame. */
  running: boolean;
  colours: SceneColours;
  text: SceneText;
  onOpen: (connectorId: string) => void;
}

/** Where each region's name sits: at the platform's front edge, or the back edge behind the core. */
const LABEL_AT: Readonly<Record<Cluster, Vec3>> = {
  SG: [0, 0.05, 1.95],
  CN: [0, 0.05, 1.95],
  OTHER: [0, 0.95, -1.95],
};

/** The invisible ground under the platforms: it only catches shadows, as the still's floor does. */
const GROUND_Y = -0.04;

/**
 * The integration constellation: the HuiTong core, a platform per region, a
 * pod per system with its flow to the core. It renders every frame only while
 * it runs; otherwise it draws on demand, so a still frame costs nothing. The
 * canvas is transparent, so the card's own colour is the stage in both themes,
 * and the labels sit in one layer over it.
 */
export function ConstellationScene({
  nodes,
  running,
  colours,
  text,
  onOpen,
}: ConstellationSceneProps) {
  const { quality, adapt } = useAdaptiveQuality();
  // The camera drifts until the person takes over by orbiting.
  const [drifting, setDrifting] = useState(true);
  const clusters = useMemo(() => layoutClusters(nodes), [nodes]);
  const [layer, setLayer] = useState<HTMLDivElement | null>(null);
  const labels = useMemo<LabelLayer | null>(() => (layer ? { current: layer } : null), [layer]);
  // On a touch screen a swipe over the stage scrolls the page: the controls listen on an element no
  // touch reaches, so only the drift remains. A mouse orbits, and the wheel always scrolls the page.
  const coarse = useCoarsePointer();
  const [inert, setInert] = useState<HTMLDivElement | null>(null);

  return (
    <div className="relative size-full">
      <Canvas
        flat
        shadows="percentage"
        dpr={quality === 'high' ? [1, 2] : 1}
        frameloop={running ? 'always' : 'demand'}
        camera={{ position: [0, 4.4, 9.8], fov: 40, near: 0.1, far: 60 }}
        gl={{ alpha: true, antialias: false, powerPreference: 'high-performance' }}
      >
        <PerformanceMonitor
          onDecline={() => {
            adapt('low');
          }}
          onIncline={() => {
            adapt('high');
          }}
        />
        {/* A studio-like light rig built in place: preset environments are fetched from a CDN the CSP blocks. */}
        <Environment resolution={128}>
          <Lightformer form="rect" intensity={2.4} position={[0, 6, -5]} scale={[12, 4, 1]} />
          <Lightformer
            form="rect"
            intensity={1.2}
            position={[-7, 3, 2]}
            rotation-y={Math.PI / 2}
            scale={[6, 3, 1]}
          />
          <Lightformer form="ring" intensity={1.6} position={[6, 4, 5]} scale={2.5} />
        </Environment>
        <ambientLight intensity={0.45} />
        <directionalLight
          castShadow
          position={[4, 9, 6]}
          intensity={1.5}
          shadow-mapSize={[1024, 1024]}
          shadow-radius={5}
          shadow-bias={-0.0005}
          shadow-camera-left={-9}
          shadow-camera-right={9}
          shadow-camera-top={9}
          shadow-camera-bottom={-9}
        />
        <mesh rotation-x={-Math.PI / 2} position-y={GROUND_Y} receiveShadow>
          <planeGeometry args={[40, 40]} />
          <shadowMaterial opacity={0.12} />
        </mesh>
        <CoreModel colours={colours} animate={running} />
        {clusters.map(({ cluster, centre, pods, hidden }) => (
          <group key={cluster}>
            <RegionPlatform
              position={centre}
              colour={colours.platform}
              rim={colours.rim}
              label={text.cluster[cluster]}
              note={hidden > 0 ? text.hidden(hidden) : null}
              labelAt={LABEL_AT[cluster]}
              labels={labels}
            />
            {pods.map((node) => (
              <group key={node.id}>
                <FlowArc
                  from={node.position}
                  state={node.state}
                  colour={colours.states[node.state]}
                  animate={running}
                />
                <SystemPod
                  node={node}
                  colours={colours}
                  name={text.names[node.id] ?? node.id}
                  stateLabel={text.state[node.state]}
                  labels={labels}
                  animate={running}
                  onOpen={onOpen}
                />
              </group>
            ))}
          </group>
        ))}
        {coarse && !inert ? null : (
          <OrbitControls
            makeDefault
            enablePan={false}
            enableZoom={false}
            enableDamping
            maxPolarAngle={Math.PI * 0.45}
            autoRotate={running && drifting}
            autoRotateSpeed={0.35}
            {...(coarse && inert ? { domElement: inert } : {})}
            onStart={() => {
              setDrifting(false);
            }}
          />
        )}
        <SceneEffects quality={quality} />
      </Canvas>
      <div ref={setLayer} className="pointer-events-none absolute inset-0 overflow-hidden" />
      {coarse ? <div ref={setInert} hidden /> : null}
    </div>
  );
}
