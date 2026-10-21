"""The integration map's still image, shown when the browser has no WebGL.

It composes the three built models the way the live scene does (Singapore's
systems on the left, China HQ's on the right, arcs to the core), every system
connected except the Excel master on its way out, and renders it with a
transparent background so it sits on either theme.

Run after the models are built:  blender -b --factory-startup -P fallback.py -- <out.webp>
"""

import math
import os
import sys

# Blender does not put a script's own folder on the import path.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402

from lib import output_path, principled, reset_scene  # noqa: E402

MODELS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../apps/web/src/assets/3d")

# The web scene's layout (three.js is Y up; Blender is Z up, so (x, y, z) becomes (x, -z, y)).
# Pods stand in id order, the first at the front, as map-model.ts places them.
CLUSTERS = {"SG": (-3.4, -0.4), "CN": (3.4, -0.4)}
PODS = {
    "SG": [("excel-master", "retiring"), ("sg-hr", "connected"), ("teams", "connected")],
    "CN": [("cn-hq", "connected"), ("dingtalk", "connected"), ("oa", "connected")],
}
POD_LIFT = 0.35
POD_RADIUS = 1.05
# The core floats at the arcs' meeting point, a little smaller than its model (core-model.tsx).
CORE_CENTRE = (0.0, 0.0, 0.9)
CORE_SCALE = 0.85

# The live scene's state colours in linear RGB: the light theme's --success, oklch(0.5 0.11 152),
# for connected, and a muted grey for retiring. Rings and arcs both take the state's colour.
STATE_COLOUR = {"connected": (0.019, 0.177, 0.055), "retiring": (0.45, 0.45, 0.43)}


def import_model(name: str, location) -> list:
    bpy.ops.import_scene.gltf(filepath=os.path.join(MODELS, f"{name}.glb"))
    objects = list(bpy.context.selected_objects)
    for obj in objects:
        if obj.parent is None:
            obj.location = Vector(location) + obj.location
    return objects


def tint(objects, material_name: str, colour, strength: float) -> None:
    """Gives one material of the imported objects the node's state colour, as the web app does."""
    for obj in objects:
        for slot in obj.material_slots:
            if slot.material and slot.material.name.startswith(material_name):
                material = slot.material.copy()
                slot.material = material
                bsdf = material.node_tree.nodes.get("Principled BSDF")
                if bsdf:
                    bsdf.inputs["Base Color"].default_value = (*colour, 1.0)
                    bsdf.inputs["Emission Color"].default_value = (*colour, 1.0)
                    bsdf.inputs["Emission Strength"].default_value = strength


def arc(start, end, colour, alpha: float) -> None:
    """A thin glowing tube from a pod to the core, rising between them like the web scene's arcs."""
    middle = ((start[0] + end[0]) / 2, (start[1] + end[1]) / 2, max(start[2], end[2]) + 1.6)
    curve = bpy.data.curves.new("Arc", "CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = 0.012
    spline = curve.splines.new("BEZIER")
    spline.bezier_points.add(1)
    for point, position in zip(spline.bezier_points, (start, end)):
        point.co = position
        point.handle_left_type = point.handle_right_type = "FREE"
    # Quadratic to cubic: both handles sit two thirds of the way to the middle point.
    spline.bezier_points[0].handle_right = tuple(s + (m - s) * 2 / 3 for s, m in zip(start, middle))
    spline.bezier_points[1].handle_left = tuple(e + (m - e) * 2 / 3 for e, m in zip(end, middle))
    obj = bpy.data.objects.new("Arc", curve)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(
        principled("ArcGlow", base=colour, emission=colour, emission_strength=3.0 * alpha)
    )


def build() -> None:
    reset_scene()
    scene = bpy.context.scene

    for obj in import_model("core", CORE_CENTRE):
        if obj.parent is None:
            obj.scale = obj.scale * CORE_SCALE
    for cluster, (cx, cy) in CLUSTERS.items():
        import_model("platform", (cx, cy, 0.0))
        members = PODS[cluster]
        for index, (_, state) in enumerate(members):
            angle = index / len(members) * math.pi * 2 + math.pi / 2
            # three.js z becomes Blender -y.
            position = (cx + math.cos(angle) * POD_RADIUS, cy - math.sin(angle) * POD_RADIUS, POD_LIFT)
            pod = import_model("node-pod", position)
            colour = STATE_COLOUR[state]
            live = state == "connected"
            tint(pod, "PodStatus", colour, 2.5 if live else 0.4)
            arc(position, CORE_CENTRE, colour, 1.0 if live else 0.25)

    # A shadow catcher grounds the scene; the rest of the image stays transparent.
    bpy.ops.mesh.primitive_plane_add(size=40.0, location=(0.0, 0.0, -0.04))
    bpy.context.active_object.is_shadow_catcher = True

    world = bpy.data.worlds.new("World")
    scene.world = world
    # A world always has nodes in Blender 5 (use_nodes is deprecated).
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.35

    for name, location, energy in (
        ("Key", (4.0, -6.0, 7.0), 900.0),
        ("Fill", (-6.0, -4.0, 4.0), 350.0),
        ("Rim", (0.0, 6.0, 5.0), 500.0),
    ):
        light = bpy.data.lights.new(name, "AREA")
        light.energy = energy
        light.size = 4.0
        obj = bpy.data.objects.new(name, light)
        obj.location = location
        obj.rotation_euler = (Vector((0.0, 0.0, 0.5)) - Vector(location)).to_track_quat("-Z", "Y").to_euler()
        scene.collection.objects.link(obj)

    camera_data = bpy.data.cameras.new("Camera")
    # Close to the web camera's view, framed a little tighter for a still.
    camera_data.lens = 34
    camera = bpy.data.objects.new("Camera", camera_data)
    camera.location = (0.0, -9.8, 4.4)
    camera.rotation_euler = (Vector((0.0, 0.0, 0.3)) - camera.location).to_track_quat("-Z", "Y").to_euler()
    scene.collection.objects.link(camera)
    scene.camera = camera

    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 96
    scene.cycles.use_denoising = True
    scene.render.film_transparent = True
    scene.view_settings.view_transform = "AgX"
    scene.render.resolution_x = 1280
    scene.render.resolution_y = 720
    scene.render.image_settings.file_format = "WEBP"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.quality = 82
    scene.render.filepath = output_path()
    bpy.ops.render.render(write_still=True)


build()
