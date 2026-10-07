#!/usr/bin/env python3
"""Prepare fuzzy, alpha-matted performance atlases from the reference clips.

Requires ffmpeg, Pillow, and numpy at preparation time only. Reference inputs
are named in SOURCES.md and are deliberately not included in the web app.
"""
import argparse
import json
import math
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'demo/dist/media'
MANIFEST = ROOT / 'demo/dist/modules/video-assets.js'
PREVIEW_DEST = None


def decode(path, fps=None):
    stream = json.loads(subprocess.check_output([
        'ffprobe', '-v', 'quiet', '-show_streams', '-of', 'json', str(path)
    ]))['streams'][0]
    w, h = stream['width'], stream['height']
    command = ['ffmpeg', '-v', 'error', '-i', str(path)]
    if fps:
        command += ['-vf', f'fps={fps}']
    command += ['-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']
    data = subprocess.check_output(command)
    frames = np.frombuffer(data, dtype=np.uint8).reshape((-1, h, w, 3))
    return [Image.fromarray(frame) for frame in frames]


def matte(frame, kind):
    rgb = np.asarray(frame).astype(np.float32)
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    if kind == 'teal':
        candidate = (g > 70) & (b > 70) & (r < g * .77) & (r < b * .73)
    elif kind == 'pink':
        candidate = (r > 150) & (b > 100) & (g < r * .76) & (g < b * .83)
    elif kind == 'pastel':
        candidate = (g > 160) & (b > 110) & ((r - g) < 35)
    else:
        candidate = (rgb.min(axis=2) > 178) & ((rgb.max(axis=2) - rgb.min(axis=2)) < 69)
    # Only key the backdrop connected to the perimeter. Interior whites (the
    # silver suit and shirt) remain opaque instead of becoming punched holes.
    if kind == 'suit':
        # Close tiny highlight gaps around collar/lapel before flooding; a
        # bright shirt must remain part of the performance's silhouette.
        blocked = Image.fromarray((~candidate).astype(np.uint8)*255)
        blocked = blocked.filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.MinFilter(7))
        candidate = np.asarray(blocked) < 128
    work = Image.fromarray(np.pad(candidate.astype(np.uint8) * 255, 1, constant_values=255)).copy()
    ImageDraw.floodfill(work, (0, 0), 128)
    alpha = np.where(np.asarray(work)[1:-1, 1:-1] == 128, 0, 255).astype(np.uint8)
    if kind in ('teal', 'pink'):
        alpha[candidate] = 0
    if kind == 'teal':
        # His shoes overlap the original terminal's title bar. Keep the shoes
        # and remove that bar, including the unconnected text fragments.
        alpha[209:][(rgb.max(axis=2)[209:] - rgb.min(axis=2)[209:] < 35) & (rgb.mean(axis=2)[209:] > 82)] = 0
        solid = Image.fromarray(alpha).copy()
        row = np.flatnonzero(alpha[100] > 0)
        if len(row):
            ImageDraw.floodfill(solid, (int(row[len(row)//2]),100), 128)
            alpha = np.where(np.asarray(solid) == 128, 255, 0).astype(np.uint8)
        alpha[-3:] = 0
    mask = Image.fromarray(alpha).filter(ImageFilter.GaussianBlur(.35))
    result = frame.convert('RGBA')
    result.putalpha(mask)
    return result


def atlas(name, frames, fps, portrait=None, target_height=None, crop_union=True):
    if crop_union:
        boxes = [frame.getbbox() for frame in frames]
        boxes = [box for box in boxes if box]
        x0, y0 = min(box[0] for box in boxes), min(box[1] for box in boxes)
        x1, y1 = max(box[2] for box in boxes), max(box[3] for box in boxes)
        padding = 3
        box = (max(0, x0-padding), max(0, y0-padding), min(frames[0].width, x1+padding), min(frames[0].height, y1+padding))
        frames = [frame.crop(box) for frame in frames]
        if portrait:
            portrait = dict(portrait, x=portrait['x']-box[0], y=portrait['y']-box[1])
    scale = min(1, target_height / frames[0].height) if target_height else 1
    if scale < 1:
        size = (round(frames[0].width*scale), round(frames[0].height*scale))
        frames = [frame.resize(size, Image.Resampling.LANCZOS) for frame in frames]
        if portrait:
            portrait = {key: round(value*scale, 2) for key, value in portrait.items()}
    w, h = frames[0].size
    if portrait:
        portrait['x'] = max(0, portrait['x'])
        portrait['y'] = max(0, portrait['y'])
        portrait['width'] = min(portrait['width'], w-portrait['x'])
        portrait['height'] = min(portrait['height'], h-portrait['y'])
    columns = min(8, len(frames))
    sheet = Image.new('RGBA', (columns*w, math.ceil(len(frames)/columns)*h))
    for index, frame in enumerate(frames):
        sheet.paste(frame, ((index % columns)*w, (index // columns)*h))
    sheet.save(DEST / f'{name}.webp', quality=88, method=6, alpha_quality=100)
    record = dict(src=f'media/{name}.webp', frameWidth=w, frameHeight=h, columns=columns, frames=len(frames), fps=fps)
    if portrait:
        record['portrait'] = portrait
    if PREVIEW_DEST:
        preview = Image.new('RGB', (w*min(5,len(frames)), h), '#e9e7e4')
        for idx, frame in enumerate(frames[::max(1,len(frames)//5)][:5]):
            preview.paste(frame, (idx*w, 0), frame)
        preview.save(PREVIEW_DEST / f'{name}-matte-preview.png')
    print(name, record, (DEST / f'{name}.webp').stat().st_size)
    return record


def main():
    global PREVIEW_DEST
    parser = argparse.ArgumentParser()
    parser.add_argument('--sources-root', type=Path, required=True)
    parser.add_argument('--preview-dir', type=Path, help='Optional directory for matte preview images')
    args = parser.parse_args()
    PREVIEW_DEST = args.preview_dir
    if PREVIEW_DEST:
        PREVIEW_DEST.mkdir(parents=True, exist_ok=True)
    DEST.mkdir(parents=True, exist_ok=True)
    clips = {}
    celery = [matte(frame, 'suit') for frame in decode(args.sources_root/'celery-body-source.mp4', 20)]
    clips['celery'] = atlas('celery', celery, 20, dict(x=21,y=0,width=90,height=88), 300)
    celery_faces = [matte(frame.crop((74,64,249,183)), 'pink') for frame in decode(args.sources_root/'celery-original-source.mp4',15)]
    clips['celeryFace'] = atlas('celery-face', celery_faces, 15, crop_union=False)
    tayne = [matte(frame, 'white') for frame in decode(args.sources_root/'tayne-ref.mp4')]
    clips['tayne'] = atlas('tayne', tayne, 12.5, dict(x=83,y=0,width=189,height=185), 350)
    # Portrait has substantially more useful detail than a crop after scaling
    # the full body. Keep its original pixels in a dedicated atlas.
    faces = [matte(frame, 'pink') for frame in decode(args.sources_root/'tayne-portrait-source.mp4',15)]
    clips['tayneFace'] = atlas('tayne-face', faces, 15, crop_union=False)
    clips['hat'] = dict(clips['tayneFace'], kind='portrait')
    oyster = [matte(frame.crop((145,80,525,528)), 'pastel') for frame in decode(args.sources_root/'oyster-ref.mp4',18)]
    clips['oyster'] = atlas('oyster', oyster, 18, dict(x=113,y=5,width=155,height=155), 350)
    flar = [matte(frame.crop((0,0,220,222)), 'teal') for frame in decode(args.sources_root/'flarhgunnstow-ref.gif')]
    clips['flarhgunnstow'] = atlas('flarhgunnstow', flar, 10, dict(x=88,y=4,width=82,height=75), 300)
    # The printer's final sheet gives Oyster a clear, original face portrait.
    smile = decode(args.sources_root/'oyster-smile-source.mp4')[-1].crop((197,96,470,260))
    smile = matte(smile, 'white')
    clips['oysterFace'] = atlas('oyster-face', [smile], 1, crop_union=False)
    clips['oysterSmile'] = clips['oysterFace']
    MANIFEST.write_text('// Recorded performances, cropped and alpha-matted. See media/SOURCES.md.\nexport const CLIPS = '+json.dumps(clips, indent=2)+';\n')


if __name__ == '__main__':
    main()
