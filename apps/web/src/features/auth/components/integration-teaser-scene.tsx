import { Line } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { Vector3, type Group, type Mesh } from 'three';

export interface TeaserColors {
  hub: string;
  link: string;
  pulse: string;
  /** One colour per live system, cycled. */
  nodes: readonly string[];
  /** The Excel master being retired: dimmed and dashed. */
  retired: string;
}

const SYSTEMS = 6;
const RADIUS = 2.4;
const RETIRED = 3;
const ORIGIN = new Vector3(0, 0, 0);

/** Systems on a gently undulating ring around the hub. */
function ringPositions(): Vector3[] {
  return Array.from({ length: SYSTEMS }, (_, index) => {
    const angle = (index / SYSTEMS) * Math.PI * 2;
    return new Vector3(
      Math.cos(angle) * RADIUS,
      Math.sin(angle * 2) * 0.35,
      Math.sin(angle) * RADIUS,
    );
  });
}

/** A data packet travelling from a system to the hub, looping. Still at mid-route when motion is reduced. */
function Pulse({
  from,
  color,
  offset,
  animate,
}: {
  from: Vector3;
  color: string;
  offset: number;
  animate: boolean;
}) {
  const ref = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    const progress = animate ? (clock.elapsedTime * 0.35 + offset) % 1 : 0.5;
    ref.current?.position.lerpVectors(from, ORIGIN, progress);
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.06, 12, 12]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

function Constellation({ colors, animate }: { colors: TeaserColors; animate: boolean }) {
  const group = useRef<Group>(null);
  const positions = useMemo(() => ringPositions(), []);

  useFrame((_, delta) => {
    if (animate && group.current) group.current.rotation.y += delta * 0.12;
  });

  return (
    <group ref={group} rotation={[0.35, 0, 0]}>
      <mesh>
        <icosahedronGeometry args={[0.55, 1]} />
        <meshStandardMaterial
          color={colors.hub}
          emissive={colors.hub}
          emissiveIntensity={0.35}
          flatShading
        />
      </mesh>
      {positions.map((position, index) => {
        const retired = index === RETIRED;
        const tone = retired
          ? colors.retired
          : (colors.nodes[index % colors.nodes.length] ?? colors.link);
        return (
          <group key={index}>
            <Line
              points={[position, ORIGIN]}
              color={retired ? colors.retired : colors.link}
              lineWidth={1}
              dashed={retired}
              dashSize={0.12}
              gapSize={0.08}
              transparent
              opacity={retired ? 0.3 : 0.65}
            />
            <mesh position={position}>
              <sphereGeometry args={[0.22, 24, 24]} />
              <meshStandardMaterial color={tone} transparent opacity={retired ? 0.4 : 1} />
            </mesh>
            {retired ? null : (
              <Pulse
                from={position}
                color={colors.pulse}
                offset={index / SYSTEMS}
                animate={animate}
              />
            )}
          </group>
        );
      })}
    </group>
  );
}

/**
 * The landing page's 3D teaser of the integration map: HuiTong at the centre,
 * connected systems around it, data packets flowing in. Renders only while on
 * screen (`active`); one still frame when motion is reduced.
 */
export function IntegrationTeaserScene({
  colors,
  animate,
  active,
}: {
  colors: TeaserColors;
  animate: boolean;
  active: boolean;
}) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 1.6, 6.4], fov: 40 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      frameloop={active && animate ? 'always' : 'demand'}
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[3, 4, 5]} intensity={1.1} />
      <Constellation colors={colors} animate={animate} />
    </Canvas>
  );
}
