# Interactive Start Screen & Commando Customizer

An immersive, cinematic 3D start screen for the Yemeni tactical shooter featuring a panoramic camera orbit over Sana'a citadel, full commando loadout customizer, theater briefing selector, and audio controls.

> [!IMPORTANT] User Preferences Confirmed
> - **Visual Aesthetic**: Cinematic 3D camera pan over Yemeni citadel with real-time military HUD overlay.
> - **Interactive Capabilities**: Full commando loadout customizer (primary rifle, optic sight, camo skin, NVG visor tint), theater selector (Sana'a Citadel, Bab-el-Mandeb, Hadramaut Canyon), difficulty mode, and Web Audio master/SFX controls.

---

## 1. Overview & Core Concept

The start screen acts as the operational headquarters briefing hub. Instead of static 2D menus, it renders an active 3D scene where the camera smoothly orbits the highland citadel while a tactical glassmorphic HUD overlays operation details.

Players can:
1. **Customize Commando Loadout**: Toggle weapon sights (Holographic / Thermal), uniform camo patterns (Highland Desert / Coastal Azure / Canyon Brown), and NVG visor tint (Emerald Green / Amber Gold).
2. **Select Operation Theater**: Inspect 3D preview metrics for Sana'a Citadel, Bab-el-Mandeb Coastal Ramparts, or Hadramaut Canyon Trench Fortress.
3. **Configure Audio & Settings**: Adjust sound effects volume, toggle background radio chatter, and set combat difficulty (Standard / Elite Veteran).
4. **Deploy to Mission**: Smooth camera transition into 1st/3rd person tactical combat mode.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Title Arrival**: Player opens the applet and sees a sweeping 3D camera orbit over the mountain fortress under a clear high-noon sky, accompanied by tactical radio squelch feedback.
2. **Commando Customization**: Player clicks "تخصيص العتاد" (Customize Loadout) in the bottom dock to adjust primary rifle attachments and visor color, seeing instant real-time updates on the 3D commando model.
3. **Theater Briefing**: Player selects an operational theater card to view threat levels, sector breakdown, and coordinates.
4. **Operation Launch**: Clicking "بدء المداهمة" (Deploy Mission) triggers an audio alert, locks pointer, and transitions into combat.

### Visual Identity & Theme
- **Color Palette**: Dark slate backdrop (`#0f172a`), emerald tactical accents (`#10b981`), amber warning highlights (`#f59e0b`), glassmorphic containers (`rgba(15, 23, 42, 0.75)` with `1px solid rgba(255,255,255,0.1)`).
- **Typography**: Clean display typography (`Cairo` / `Tajawal` for Arabic, `Plus Jakarta Sans` for English metrics).
- **Control Layout**: Collapsible bottom dock housing loadout swatches and theater tabs, keeping 100% of the central 3D viewport visible.

---

## 3. Key Product Decisions & Trade-Offs

### 1. 3D Scene Persistence
- **Chosen Approach**: Reuse the same Three.js engine and scene for both the start screen and live combat.
- **Why**: Zero loading screens, zero WebGL context recreation, and seamless camera animation from orbital pan into third-person shoulder view upon pressing Deploy.

### 2. Loadout Customization Scope
- **Chosen Approach**: Live 3D mesh mutation on the player's model (`CommandoModel`). Changing sights or visor color instantly modifies material properties and geometry visibilities without unmounting the canvas.

---

## 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       START SCREEN & COMMANDO HUB                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌──────────────────────┐              ┌───────────────────────────────┐   │
│   │  Start Screen View   │─────────────►│   3D Orbit Camera Controller  │   │
│   │   (App.tsx / HUD)    │              │      (YemenCombatEngine)      │   │
│   └──────────┬───────────┘              └───────────────┬───────────────┘   │
│              │                                          │                   │
│              ▼                                          ▼                   │
│   ┌──────────────────────┐              ┌───────────────────────────────┐   │
│   │ Loadout Customizer   │─────────────►│ Commando Mesh Material        │   │
│   │ Modal / Bottom Dock  │              │ & Attachment Mutations        │   │
│   └──────────┬───────────┘              └───────────────┬───────────────┘   │
│              │                                          │                   │
│              ▼                                          ▼                   │
│   ┌──────────────────────┐              ┌───────────────────────────────┐   │
│   │ Theater Selection &  │─────────────►│ Switch War Theater Assets &   │   │
│   │ Audio Volume Control │              │ Sound System Master Gain      │   │
│   └──────────────────────┘              └───────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Structure
1. `/src/components/StartScreen.tsx`:
   - Glassmorphic top bar with operation title and audio mute toggle.
   - Central 3D viewport presentation.
   - Tabbed bottom dock: Operation Theaters, Loadout Customizer, Audio & Controls.
   - Primary "DEPLOY / بدء المداهمة" action button.
2. `/src/components/LoadoutCustomizer.tsx`:
   - Interactive options for rifle optics (Holo / ACOG / Thermal), camo patterns, visor glow tint, and grenade loadout.
3. `/src/game/engine.ts`:
   - `setLoadoutCustomization(options)`: Live update function for player mesh materials.
   - Title screen orbital camera pan pacing.

---

## 5. Verification Plan

1. **Type Check & Lint**: Run `lint_applet` to ensure standard TypeScript compliance.
2. **Compilation**: Run `compile_applet` to verify build success.
3. **In-Game Verification**:
   - Verify smooth 3D camera orbit on title launch.
   - Test changing camo pattern and visor tint in the Loadout Customizer to confirm real-time 3D model updating.
   - Test switching war theaters and clicking DEPLOY to confirm smooth transition into combat.
