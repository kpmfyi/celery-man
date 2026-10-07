# CINCO Identity Generator 2.5

An unofficial, interactive parody and fan homage to **Celery Man** from *Tim and Eric Awesome Show, Great Job!* Enter the blue chamber, sit at the computer, and give Celery Man, Oyster, and Tayne some very important instructions. A 3D room surrounds a retro desktop with fuzzy live-action dance loops, synthesized music, and computer noises.

This is an ephemeral internet toy: no backend, accounts, analytics, or saved data.

## Play

Open the generated **celery-man.html** in a recent browser, or run the source locally:

```sh
npm run dev
```

Visit **http://localhost:4173**. Development requires Node.js/npm and Python 3; no package installation is needed. Any static file server can also serve `demo/dist/`.

Choose **Enter the blue room** to watch Paul's short, silent entrance. The camera then moves into the interactive 3D monitor. **Skip** goes straight to the computer; **Replay entrance** starts the introduction again. Reduced-motion settings skip the film. Press **Esc** or **Stand up** to return to the room, then click the computer to sit down again.

WebGL is required for the room, and sound starts after a click. The standalone file includes the room, media, fonts, and synthesized soundtrack for offline play. Optional voice commands depend on browser speech-recognition support and may use the browser's speech provider; typed commands always work.

## Things to try

- Load Celery Man, Oyster, or the beta sequence Tayne.
- Kick up **4D3D3D3**, request a **hat wobble**, or let tiny Tayne perform **Flarhgunnstow** on the terminal.
- Ask Oyster to **smile**, then **print** his portrait.
- Request experimental Tayne, complete with a warning and censor effect. Ask for **more Celery Man** to fill the desktop.
- Drag, minimize, maximize, and close the beveled windows. Selecting a dancer restores its windows; `reset` restores the desktop.
- Choose **Run sketch** for a roughly 90-second sequence of references, interruptions, and increasingly unnecessary windows. A manual command stops the tour.

While seated, `1` / `2` / `3` select a dancer; `D` toggles dimensions; `H` requests a hat wobble; `F` requests Flarhgunnstow; `S` asks Oyster to smile; `P` prints Oyster; `Space` pauses; `M` mutes; `/` focuses the command line; `?` opens help. Use `↑` / `↓` in the command line to recall requests. `Esc` closes an open dialog before standing up. Standing up pauses playback.

## Source and builds

`demo/dist/` is the editable, directly deployable static app. There is no framework build.

| File | Purpose |
| --- | --- |
| `index.html`, `style.css` | Room controls and the 1024 × 768 retro desktop |
| `modules/app.js` | Commands, sketch tour, dialogs, and computer windows |
| `modules/entrance.js` | Entrance video, Skip/Replay, and camera handoff |
| `modules/room-model.js`, `modules/room-view.js` | Room geometry, camera transitions, and desktop projection |
| `modules/stage.js`, `modules/video-assets.js` | Canvas 2D character playback and media metadata |
| `modules/audio.js`, `modules/computer-fx.js` | Synthesized audio, typing, disk activity, and screen effects |
| `media/` | Local video, masked WebP loops, and provenance |
| `vendor/`, `fonts/` | Local dependencies and their licenses |

Run `npm run check` for lightweight JavaScript syntax checks. Run `npm run build` to generate the self-contained `celery-man.html`; the dependency-free bundler embeds runtime media for offline use. Keep generated downloads out of source commits. The legacy `modules/dancer.js` is retained for reference and is not used at runtime.

## Cloudflare hosting

`wrangler.jsonc` deploys `demo/dist/` directly to Cloudflare Workers Static Assets at **https://celeryman.vaporware.gripe**. No application Worker, framework build, or running development server is needed. Forks should change the Worker name and custom domain before deploying.

Authenticate with a Cloudflare account that owns the domain, then deploy:

```sh
npx wrangler@4.106.0 login
npm run deploy
```

Wrangler configures the custom domain and Cloudflare provisions its DNS record and HTTPS certificate. Resolve any existing record or Worker ownership conflict before replacing it. Credentials stay in Wrangler's user configuration; do not add account IDs, tokens, or local infrastructure details to this repository.

## Credits and intent

The original [Celery Man sketch](https://www.youtube.com/watch?v=a8K6QUPmv8Q) is by Tim and Eric, features Paul Rudd, and was released by Adult Swim. This project is not affiliated with or endorsed by Tim and Eric, Paul Rudd, or Adult Swim.

This is a parody and fan homage made with fair-use intent. Short excerpts of the original performance supply the fuzzy dancers, portraits, and entrance. The entrance retains its full frame and source watermark. Attribution, source links, and processing details are recorded in [performance sources](demo/dist/media/SOURCES.md) and [entrance source](demo/dist/media/ENTRANCE-SOURCE.md). The original footage remains subject to its owners' rights and is not offered under an open license.

The room, interface, and effects are recreated in code. Music, computer speech, and computer noises are synthesized; the app does not play the original sketch's audio. Preserve the separate license files for Three.js and the bundled fonts.
