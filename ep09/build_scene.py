"""Builds ep09/scene.js from scene_src.js + cast_ep09.js."""
import os
here = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(here, 'scene_src.js')).read()
open(os.path.join(here, 'scene.js'), 'w').write(src.replace('/*@CAST@*/', open(os.path.join(here, 'cast_ep09.js')).read()))
print('wrote scene.js')
