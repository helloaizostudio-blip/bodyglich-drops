"""Builds ep24/scene.js from scene_src.js + cast_ep24.js."""
import os
here = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(here, 'scene_src.js')).read()
src = src.replace('/*@CAST@*/', open(os.path.join(here, 'cast_ep24.js')).read())
open(os.path.join(here, 'scene.js'), 'w').write(src)
print('wrote scene.js')
