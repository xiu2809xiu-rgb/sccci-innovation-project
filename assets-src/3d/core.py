"""The HuiTong core: a faceted crystal with a light inside.

Objects (the web app looks them up by name):
- Core: the crystal shell, material CoreGlass (transmissive, faceted).
- CoreLight: the inner light, material CoreLight (emissive).
"""

import os
import sys

# Blender does not put a script's own folder on the import path.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy  # noqa: E402

from lib import bevel, export_glb, output_path, principled, reset_scene, shade  # noqa: E402

RADIUS = 1.0
FACETS = 1  # icosphere subdivisions: 1 is the icosahedron, 20 crisp facets
INNER = 0.3


def build() -> None:
    reset_scene()

    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=FACETS, radius=RADIUS)
    shell = bpy.context.active_object
    shell.name = "Core"
    # Taller than wide, like a cut gem standing on its point (Blender's up axis is Z).
    shell.scale = (0.86, 0.86, 1.08)
    shade(shell, smooth=False)
    bevel(shell, width=0.025, segments=2)
    shell.data.materials.append(
        principled(
            "CoreGlass",
            base=(0.72, 0.9, 0.85),
            roughness=0.06,
            transmission=1.0,
            ior=1.5,
        )
    )

    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=INNER)
    light = bpy.context.active_object
    light.name = "CoreLight"
    shade(light, smooth=True)
    light.data.materials.append(
        principled(
            "CoreLight",
            base=(0.2, 0.75, 0.62),
            roughness=0.4,
            emission=(0.2, 0.75, 0.62),
            emission_strength=6.0,
        )
    )

    export_glb(output_path())


build()
