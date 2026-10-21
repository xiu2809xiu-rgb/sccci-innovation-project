"""Shared helpers for the integration map's Blender scripts.

Each script builds one asset from parameters, then exports it as GLB. The
materials carry the physical look (roughness, metalness, transmission,
emission); the web app sets their colours from the design tokens at runtime,
so one file serves the light and the dark theme.

Run a script headless:  blender -b --factory-startup -P <script>.py -- <out.glb>
"""

import sys

import bpy


def output_path() -> str:
    """The GLB path given after `--` on the command line."""
    argv = sys.argv
    if "--" not in argv or argv.index("--") + 1 >= len(argv):
        raise SystemExit("usage: blender -b --factory-startup -P <script>.py -- <out.glb>")
    return argv[argv.index("--") + 1]


def reset_scene() -> None:
    """An empty scene in metres, so every asset starts from the same state."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.unit_settings.system = "METRIC"


def principled(
    name: str,
    *,
    base=(0.8, 0.8, 0.8),
    metallic: float = 0.0,
    roughness: float = 0.5,
    transmission: float = 0.0,
    ior: float = 1.45,
    emission=(0.0, 0.0, 0.0),
    emission_strength: float = 0.0,
):
    """A Principled BSDF material; the glTF exporter maps each input to a glTF PBR property."""
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    bsdf = material.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*base, 1.0)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Transmission Weight"].default_value = transmission
    bsdf.inputs["IOR"].default_value = ior
    bsdf.inputs["Emission Color"].default_value = (*emission, 1.0)
    bsdf.inputs["Emission Strength"].default_value = emission_strength
    return material


def bevel(obj, width: float, segments: int = 3) -> None:
    """Rounds hard edges so highlights catch them; applied on export."""
    modifier = obj.modifiers.new("Bevel", "BEVEL")
    modifier.width = width
    modifier.segments = segments
    modifier.limit_method = "ANGLE"


def shade(obj, *, smooth: bool) -> None:
    """Flat shading keeps facets crisp; smooth shading suits rounded parts."""
    for polygon in obj.data.polygons:
        polygon.use_smooth = smooth


def export_glb(path: str) -> None:
    """GLB with modifiers applied and Y up, as three.js expects. Compression happens later, in build.mjs."""
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        export_apply=True,
        export_yup=True,
        export_materials="EXPORT",
        export_cameras=False,
        export_lights=False,
        export_draco_mesh_compression_enable=False,
    )
