# Celery Man

This is an ephemeral, static 3D parody and fan homage. Keep the focus on fidelity to the sketch, visual polish, playful commands, and smooth dancing. Avoid product growth features, persistence, telemetry, and unnecessary dependencies.

- Editable web source is `demo/dist/`; there is no framework build.
- `modules/entrance.js` plays the short live-action entrance, then hands off to the camera movement into the computer. Keep Skip and Replay usable; reduced-motion settings skip the film.
- `modules/room-model.js` builds the blue room and monitors. `modules/room-view.js` handles sit/stand transitions and projects the 1024 × 768 HTML desktop onto the monitor. Keep computer windows on that display and room controls outside it.
- `modules/stage.js` renders the characters with Canvas 2D using local WebP sprite loops with alpha masks. `modules/video-assets.js` owns media metadata. Preserve the fuzzy photographic aesthetic. The legacy `modules/dancer.js` is not used at runtime.
- Keep media provenance in `demo/dist/media/SOURCES.md` and `demo/dist/media/ENTRANCE-SOURCE.md`. Preserve the entrance's full frame and source watermark. Do not represent third-party footage as original work or as openly licensed.
- Music, computer speech, and computer noises remain synthesized in `modules/audio.js`.
- `modules/computer-fx.js` controls typing, disk activity, and screen sweep effects. `modules/app.js` owns commands, the tour, cascading windows, and terminal dancers.
- `npm run dev` serves the app locally. `npm run build` generates the self-contained `celery-man.html`, including runtime media for offline use. Generated downloads are not source files.
- Run `npm run check` for the existing lightweight syntax checks. Favor one browser interaction pass over expanding a test suite.
- Vendor modules and fonts are local; preserve their license files.
- Keep documentation portable. Never commit credentials, private infrastructure details, personal filesystem paths, deployment identifiers, or private access URLs. Review both staged files and commit metadata before publishing.
