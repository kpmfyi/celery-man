# Recorded performance sources

The short, muted performance loops in this fan homage are excerpts of **Celery Man**, performed by Paul Rudd in *Tim and Eric Awesome Show, Great Job!* Original sketch: [Adult Swim on YouTube](https://www.youtube.com/watch?v=a8K6QUPmv8Q). Tim & Eric / Adult Swim retain rights to the original performances. These are recorded excerpts, not generated likenesses or newly recorded performances, and their inclusion does not imply endorsement or an open license.

Only cropped performance pixels are shipped. Original window chrome, captions, backgrounds, and unrelated scene footage are excluded from the dancer atlases. The app contains no third-party media requests. The original footage's soft detail, compression, and low frame rate are intentional.

| Local atlas | Source | Preparation |
| --- | --- | --- |
| `celery.webp` | [Dance / Dancing, Tenor](https://tenor.com/view/dance-dancing-gif-10954427), [MP4](https://media.tenor.com/1iOUXZFLpBgAAAPo/dance-dancing.mp4) | 1.5 s, 30 frames at 20 fps; gray background removed with silhouette-aware matte. |
| `celery-face.webp` | [Celeryman / Celery, Tenor](https://tenor.com/view/celeryman-celery-man-paulrudd-paul-gif-4808594), [MP4](https://media.tenor.com/vt_SO9CRXxEAAAPo/celeryman-celery.mp4) | 1.5 s at 15 fps; source 500 × 280, crop (74, 64) to (249, 183), pink keyed out. |
| `oyster.webp` | [Celery Man / Oyster, Tenor](https://tenor.com/view/celery-man-oyster-paul-rud-tim-and-eric-headbang-gif-26056346), [MP4](https://media.tenor.com/2hOGL5qTEdQAAAPo/celery-man-oyster.mp4) | 2.7 s at 18 fps; source 640 × 550, crop (145, 80) to (525, 528), pastel backdrop removed; downsampled to 350 px tall. |
| `oyster-face.webp` | [Smiling / Smirk / Oyster, Tenor](https://tenor.com/view/smiling-smirk-paul-rudd-oyster-celery-man-gif-17327584), [MP4](https://media.tenor.com/LRaqOfJJOVYAAAPo/smiling-smirk.mp4) | Single final frame of the printed photograph, crop (197, 96) to (470, 260); paper keyed out. Used for portrait and print/smile commands. |
| `tayne.webp` | [Tayne / Dancing, Tenor](https://tenor.com/view/tayne-dancing-paul-rudd-silly-wacky-gif-6129047), [MP4](https://media.tenor.com/JkKYbvfWaBMAAAPo/tayne-dancing.mp4) | 0.8 s, 10 source frames at 12.5 fps; white backdrop removed; 350 px tall. |
| `tayne-face.webp` | [Paul Rudd / Dancing / Hat, Tenor](https://tenor.com/view/paul-rudd-dancing-hat-gif-11137511), [MP4](https://media.tenor.com/-jwpqNtyGDMAAAPo/paul-rudd-dancing.mp4) | 0.87 s at 15 fps, original 284 × 190 portrait; pink keyed out. Also used for the hat wobble. |
| `flarhgunnstow.webp` | [Flarhgunnstow / Paul Rudd, Tenor](https://tenor.com/view/flarhgunnstow-paul-rudd-tim-and-eric-celery-man-dance-gif-9194646) | 1.4 s, 14 frames at 10 fps; source 220 × 278, cropped to exclude terminal, teal keyed out, shoe overlap retained. |

Atlases are static WebP images with alpha, arranged in rows of eight frames (the Oyster portrait is one frame). `modules/video-assets.js` records dimensions, frame counts, and playback rates. The 2D renderer loops those frames inside the 3D monitor and is the only playback clock, keeping duplicate windows synchronized.

To reproduce the transformation, provide the named reference inputs to `scripts/prepare-video-assets.py --sources-root /path/to/clips`; it uses ffmpeg, Pillow, and numpy only during preparation. No media processing dependencies are shipped to the browser.
