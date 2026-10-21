"""A regional platform: the disc a cluster of systems stands on, with a glowing rim.

Objects (the web app looks them up by name):
- Platform: the disc, material PlatformBase (matte).
- PlatformRim: the rim, material PlatformRim (faintly emissive).
"""

import os
import sys

# Blender does not put a script's own folder on the import path.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy  # noqa: E402

from lib import bevel, export_glb, output_path, principled, reset_scene, shade  # noqa: E402

RADIUS = 1.6
THICKNESS = 0.06
RIM_TUBE = 0.018


def build() -> None:
    reset_scene()

    bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=RADIUS, depth=THICKNESS)
    disc = bpy.context.active_object
    disc.name = "Platform"
    shade(disc, smooth=True)
    bevel(disc, width=0.02, segments=3)
    disc.data.materials.append(principled("PlatformBase", base=(0.5, 0.5, 0.49), roughness=0.85))

    bpy.ops.mesh.primitive_torus_add(
        major_radius=RADIUS,
        minor_radius=RIM_TUBE,
        major_segments=128,
        minor_segments=8,
        location=(0.0, 0.0, THICKNESS / 2),
    )
    rim = bpy.context.active_object
    rim.name = "PlatformRim"
    shade(rim, smooth=True)
    rim.data.materials.append(
        principled(
            "PlatformRim",
            base=(0.2, 0.75, 0.62),
            roughness=0.4,
            emission=(0.2, 0.75, 0.62),
            emission_strength=1.2,
        )
    )

    export_glb(output_path())


build()
