import {
  Mesh,
  MeshStandardMaterial,
  type BufferGeometry,
  type Material,
  type Quaternion,
  type Vector3,
} from 'three';

/** One named mesh of a model: its geometry, its own material (read for its physical look) and its place. */
export interface ModelPart {
  geometry: BufferGeometry;
  material: MeshStandardMaterial;
  /**
   * The part's place in its model, spread onto the mesh that draws it. The
   * asset build quantizes positions (assets-src/3d/build.mjs), which stores
   * them as normalised integers and puts the scale and offset that restore
   * them on the part's node: drawn without it, a part has the wrong size.
   */
  transform: { position: Vector3; quaternion: Quaternion; scale: Vector3 };
}

/**
 * A named part of a model built in assets-src/3d, or null when the model
 * lacks it. The scene draws the geometry with its own materials, coloured from
 * the design tokens, so no shared material is ever changed. A part may copy
 * its Blender material's roughness, metalness or emission from `material`.
 */
export function modelPart(object: unknown): ModelPart | null {
  if (!(object instanceof Mesh)) return null;
  // `instanceof` on a generic class narrows to Mesh<any>; the model holds single-material meshes.
  const { geometry, material, position, quaternion, scale } = object as Mesh<
    BufferGeometry,
    Material
  >;
  return material instanceof MeshStandardMaterial
    ? { geometry, material, transform: { position, quaternion, scale } }
    : null;
}
