# Interactive room editor

Open `/room-editor`, upload a private room photograph and create an editor project. Add illustrative demo furniture or select a real marketplace product. The room photo is the background; added furniture remains separate editable overlays with product links where applicable. Existing furniture baked into a photo or AI image is not an independently selectable object and cannot be deleted by removing an overlay.

## Editing

Select an overlay to move, resize or rotate it. Labeled X/Y position, width, height and angle controls provide precise numeric editing without requiring drag gestures. `Mebeli sil` removes the selected overlay. `Geri al` and `İrəli al` undo/redo changes in the current editing session. Touch dragging and transform handles support phone/tablet editing; property controls provide an alternative when handles are small or precision is difficult.

Use `Saxla` to persist the background reference and overlay layout. Editor projects belong to their authenticated creator. Server ownership checks protect project reads/writes and private image access. Saved documents carry a version; a stale write is rejected instead of silently overwriting a newer save. Reload the latest saved version before retrying a conflict. Undo/redo is session state rather than an unlimited server history.

## What the editor represents

This is a 2D composition tool. The original CC0 SVG demo illustrations in `public/editor-assets` have transparent backgrounds. Catalog overlays use illustrative generic assets linked to real product records; they are not exact product photography or validated 3D placement. Positions and sizes are canvas coordinates, not calibrated room measurements. There is no camera calibration, automatic occlusion, architectural fit guarantee or product fidelity claim.

Editor actions do not invoke OpenAI or any paid image API. Private photo uploads are validated and stored through the application's existing secure image pipeline. The local AI studio is a separate image-generation feature; its output can be viewed as a baked image, while this editor manipulates separate overlays.

## Verification

Browser coverage checks adding overlays, property changes, undo/redo, saving/reloading and owner access boundaries. The final QA report records the commands actually executed. Tests use isolated private room images and remove only their own fixtures.

Verified on the development server: focused Playwright editor workflow passed, including real pointer hover/selection/drag, numeric edits, undo/redo, save/reload, product-linked overlays, cart persistence, deletion, stale-version rejection and foreign-owner denial. A 390px touch browser selected a layer and displayed its saved properties with no horizontal overflow. Request monitoring recorded no generation endpoint or OpenAI requests. Desktop/mobile screenshots use a plain test image and are saved in `test-results/room-editor-desktop.png` and `test-results/room-editor-mobile.png`. Unit suite passed 22 tests at this stage; all seven SVG files decoded successfully and have transparent corner pixels.

For the preconfigured local hackathon workstation, `npm run demo -- --editor` opens an authenticated demo browser. Editor mode does not start the AI service or worker.
