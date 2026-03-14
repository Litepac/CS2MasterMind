# Workspace Layout

## Primary Project

- [skybox-light](C:/Users/rasmu/cs2_highlights/skybox-light)
  - Prototype frontend / UX exploration track.
  - Keep this as replay UI research and reference material.
  - Do not treat this as the long-term parser foundation.

## Parser-First Reboot

- [mastermind-go](C:/Users/rasmu/cs2_highlights/mastermind-go)
  - Clean parser-first reboot.
  - This is the new main engineering direction.
  - Goal: parse `.dem` with `demoinfocs-golang` and emit one clean replay format.

- [demoinfocs-parser](C:/Users/rasmu/cs2_highlights/demoinfocs-parser)
  - Upstream `demoinfocs-golang` clone for reference/examples.
  - Use this to understand capabilities and examples, not as the product repo itself.

## Legacy Prototype

- [legacy-prototype](C:/Users/rasmu/cs2_highlights/legacy-prototype)
  - Old Python + standalone HTML prototype.
  - Keep this as reference for parsing logic, event ideas, and the old 2D viewer.

## Rule of Thumb

- Build new parser/export work in `mastermind-go`.
- Only touch `skybox-light` when you need UI/reference behavior.
- Only touch `legacy-prototype` when you need reference logic or migration data.
