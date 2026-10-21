import type { Cluster, NodeState } from '../../map-model';

/** The scene's colours, resolved from the design tokens outside the canvas (hex strings). */
export interface SceneColours {
  core: string;
  coreLight: string;
  shell: string;
  platform: string;
  rim: string;
  states: Readonly<Record<NodeState, string>>;
}

/**
 * The words the scene shows, translated outside the canvas: drei's `Html`
 * renders into its own React root, where the translation context is absent.
 */
export interface SceneText {
  cluster: Readonly<Record<Cluster, string>>;
  state: Readonly<Record<NodeState, string>>;
  /** Each node's name in the reader's language, by connector id. */
  names: Readonly<Record<string, string>>;
  /** The note on a platform whose systems do not all fit on it. */
  hidden: (count: number) => string;
}

/**
 * The one element the scene's HTML labels mount in. drei's `Html` remounts a
 * label whenever its mount point changes, which loses the label under React
 * 19, so the scene gives every label this fixed layer over the canvas.
 */
export interface LabelLayer {
  current: HTMLElement;
}
