# Original Mongsangnyeo web avatar

The original Blender character replaces the procedural bob-haired avatar after
loading, preserving the Seoul map, village, dog, progression, collision and saved
settings. The former character remains as an explicitly labelled loading/error
fallback with a retry button.

The recovered animation source and later cinematic checkpoint have identical base
mesh vertex indices. Active V006/V007 profile and rim shape-key geometry from the
checkpoint is applied to the matching character before web reduction. Original
packed base-color images are used. Source projects, reference images, private
identifiers and regeneration workspace paths are not published.

## Bounded asset format

`public/world-assets/mongsangnyeo/avatar.json` describes two ordered binary parts.
Base batches contain xyz/normal/UV/RGBA (12 float32 components per expanded triangle
vertex); poses contain xyz/normal (six components). All offsets and counts are
validated. Total: 11,968 triangles / 35,904 vertices, fourteen poses (idle, twelve
walk samples, riding), three textures, 13,787,136 binary bytes.

The steady corrected in-place walk is interpolated; pose transitions ease rather
than snap. Only one current surface is uploaded with bufferSubData, and settled
idle/ride poses stop uploading. Model coordinates are Y-up, +Z forward with the
world's 0.415 scale. Named GPU resources and CPU bitmaps survive context loss and
are disposed at teardown. Loading is abortable, fixed to same-origin safe filenames
and bounded byte sizes/image dimensions.

Avatar surfaces preserve perspective UVs, smooth normals and linear filtering
without the environment's PS1 snapping/dither. Lighting is still the lightweight
game shader, not a reproduction of Blender's full PBR/reflections/shadow pipeline.
Public source/license credits are linked from settings in `CREDITS.txt`.

## Verification and limits

The exported binary was reconstructed and rendered in Blender at idle, walking
and riding poses, including front and side views. Finite data, unit normals,
bounded topology and exact offsets were checked. Regression tests and focused
world type checking cover loader behavior and mocked GPU resource lifecycle.
Mocked WebGL does not establish actual GPU shader correctness or performance.

Full-repository TypeScript has 73 errors also reproduced at the unchanged base
commit, involving unrelated Supabase types and optional UI dependencies. Production
build uses placeholder localhost service settings, not production credentials.
The cloud browser cannot create WebGL; in-game lighting, physical-phone performance
and exact rider/dog seat alignment remain unverified in a capable browser.
