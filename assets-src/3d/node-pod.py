"""A system node: a bevelled hexagonal pod with a status ring around its waist.

Objects (the web app looks them up by name):
- Pod: the shell, material PodShell (satin metal).
- PodRing: the status ring, material PodStatus (emissive; tinted by the
  connector's state at runtime: synced, pending or error).
"""

import os
import sys

# Blender does not put a script's own folder on the import path.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy  # noqa: E402

from lib import bevel, export_glb, output_path, principled, reset_scene, shade  # noqa: E402

RADIUS = 0.32
HEIGHT = 0.42
RING_RADIUS = 0.4
RING_TUBE = 0.022


def build() -> None:
    reset_scene()

    bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=RADIUS, depth=HEIGHT)
    pod = bpy.context.active_object
    pod.name = "Pod"
    shade(pod, smooth=False)
    bevel(pod, width=0.03, segments=3)
    pod.data.materials.append(
        principled("PodShell", base=(0.78, 0.78, 0.76), metallic=0.55, roughness=0.32)
    )

    # The torus lies in the XY plane, so it circles the pod's waist (Blender is Z up; the export turns it to Y up).
    bpy.ops.mesh.primitive_torus_add(
        major_radius=RING_RADIUS,
        minor_radius=RING_TUBE,
        major_segments=48,
        minor_segments=12,
    )
    ring = bpy.context.active_object
    ring.name = "PodRing"
    shade(ring, smooth=True)
    ring.data.materials.append(
        principled(
            "PodStatus",
            base=(1.0, 1.0, 1.0),
            roughness=0.3,
            emission=(1.0, 1.0, 1.0),
            emission_strength=2.5,
        )
    )

    export_glb(output_path())


build()
