# Implementation Plan - Tactical Satellite Map Database, Custom Map Editor & Heatmap System

Building a dynamic Satellite Reconnaissance Map database, an interactive Custom Battlefield Terrain Generator & Editor, and a tactical overlay system featuring animated weather effects, enemy patrol heatmaps, and customizable drop zone coordinates.

## User Preferences & Decisions
- **Satellite Recon Presentation**: High-tech tactical 2D satellite map interface with live animated cloud/fog weather overlays, topographic grid lines, and interactive drop zone waypoint markers.
- **Custom Map Editor**: Full in-game terrain generator allowing players to modify elevation profiles (mountains vs coastal dunes), set custom paratrooper drop zone coordinates, adjust threat levels, and place vehicle/loot caches.
- **Satellite Tactical Overlay**: Heatmaps highlighting high-risk combat zones, sniper roosts, enemy patrol vectors, and loot density indexes.

## Proposed Architecture & File Changes

### 1. `src/components/SatelliteMapSelector.tsx`
- Interactive satellite map UI component for level selection and briefing.
- Displays animated weather overlays (radar precipitation sweeps, moving cloud textures, sandstorm/snow particle pulses).
- Heatmap canvas layer displaying hostile density heat gradients, sniper sightlines, and patrol route vectors.
- Interactive drop zone pin selector where players tap or drag to set their paratrooper touchdown point.

### 2. `src/components/MapEditorModal.tsx`
- Custom map creation interface:
  - Sliders for Elevation Roughness, Water Table, Vegetation/Dunes, and Threat Density.
  - Interactive canvas/grid for setting custom drop coordinates (Lat/Lng), air drops, and vehicle buggy spawns.
  - Save custom map configurations into localStorage / session state database.

### 3. `src/game/theater.ts` & `src/types/game.ts`
- Extend `WarTheaterConfig` to include heatmap data arrays, enemy patrol route vectors, and custom terrain generation parameters.
- Support runtime generated custom theaters built by the Map Editor.

### 4. `src/components/ReconBriefing.tsx` & `src/App.tsx`
- Integrate `SatelliteMapSelector` and `MapEditorModal` into the briefing and level selection flow.
- Pass player-chosen drop coordinates into the engine's `DescentSystem`.

## Verification Plan
1. **Compilation & Syntax**: Execute `compile_applet` and `lint_applet` to confirm clean build.
2. **Interactive Flow**: Test level selection with satellite heatmap toggles, custom map generation, and custom drop coordinate paratrooper landings.
