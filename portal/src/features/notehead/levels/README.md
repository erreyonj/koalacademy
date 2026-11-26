# Notehead levels

Level files authored in the level editor live here, one per level:

```
<level-id>.level.json
```

Author a level at `/toolkit/games/notehead/levels/` while running `npm run dev`
(the editor is dev-only). Use **Export JSON** to download `<id>.level.json`,
then commit the file here. **Import** loads a file back into the editor.

Coordinates are logical (900 x 1600, +y up). The game does not read these files
yet. `src/features/levels/tests/persist.test.ts` validates every file in this
folder, so a bad export fails the test run.
