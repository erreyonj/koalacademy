# Notehead levels

Level files authored in the level editor live here, one per level:

```
<level-id>.level.json
```

A route (several levels flown in sequence) can also be exported as one route
file, `{version, id, origin, levels}`. The `origin` is the level the route
begins on (set with **Set Origin** in the editor):

```
<first-level-id>.route.json
```

Author at `/toolkit/games/notehead/levels/` while running `npm run dev` (the
editor is dev-only). **Export JSON** downloads the open level as
`<id>.level.json`; **Export route** downloads every level in the list as one
array. Commit the files here.

**Import** takes a level file, an array file, or several files at once (select
many in the picker). They join in the order given and replace the editor's
route. A bad file, or two levels with the same id, rejects the whole import.
The level id should match the file name, so rename the id in the editor rather
than the file.

An exit can lead to another level: its `to` field is that level's id. Exits with
a target are always open, whatever has been collected. An exit without `to` is a
dead end that clears the level once every Borealis is collected. Set targets in
the editor's Route section, or by hand:

```json
{ "id": "exit-1", "facing": "up", "x0": 280, "x1": 646, "y0": 1600, "y1": 1600, "to": "stairs1" }
```

Coordinates are logical (900 x 1600, +y up). The game plays route files from
`../routes/` (see `../routes/registry.ts`); what happens in each level beyond
flying through it lives in `../routes/events/`, keyed by route id and level id.
The `*.level.json` files here are editor sources only. `src/features/levels/tests/persist.test.ts` validates every file in this
folder and loads the whole folder as one route, so a bad export or a repeated
id fails the test run.
