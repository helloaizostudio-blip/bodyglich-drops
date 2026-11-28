"""Builds ep08/scene.js from scene_src.js + cast_ep08.js (the crew specs are inlined so the renderer only loads one scene file)."""
import os
here = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(here, 'scene_src.js')).read()
cast = open(os.path.join(here, 'cast_ep08.js')).read()
open(os.path.join(here, 'scene.js'), 'w').write(src.replace('/*@CAST@*/', cast))
print('wrote scene.js')
