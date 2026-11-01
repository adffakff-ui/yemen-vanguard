# Implementation Plan: 3D Asset Preloader & Mobile Optimization

This plan implements a robust asset preloader and caching system for 3D models (GLTF/OBJ procedural equivalents), textures, and audio assets in our tactical game, paired with an interactive loading screen to optimize mobile memory overhead and initial load performance.

## 1. Objectives & Scope
*   **Asset Management Service (`src/game/assetLoader.ts`)**:
    *   Centralized Three.js `LoadingManager` with `GLTFLoader`, `TextureLoader`, and `AudioLoader`.
    *   Progress tracking callback (`onProgress(loaded, total, percent)`) for accurate loading percentages.
    *   In-memory caching dictionary to prevent duplicate fetches and reduce mobile RAM footprint.
*   **Interactive Loading Screen (`src/components/LoadingScreen.tsx`)**:
    *   Sleek tactical UI showing percentage progress, current asset being loaded, and animated progress bar.
    *   Seamless transition into the gameplay loop once 100% loaded.
*   **Game Scene Integration**:
    *   Preload procedural 3D geometries, particle textures, and UI sound effects before rendering the tactical theater.

---

## 2. Technical Steps

### Step 1: Create `src/game/assetLoader.ts`
*   Implement singleton `AssetLoader` class.
*   Methods: `loadModel(url)`, `loadTexture(url)`, `loadAudio(url)`, `preloadAll(manifest, onProgress)`.
*   Handle fallback procedural generation for models/textures if external assets are offline or loading.

### Step 2: Create `src/components/LoadingScreen.tsx`
*   Display percentage counter, progress bar, tactical loading status messages, and game branding.

### Step 3: Integrate with `App.tsx` & `GameCanvas.tsx`
*   Show `LoadingScreen` when initializing game assets.
*   Trigger `AssetLoader.preloadAll` on startup and theater transitions.

---

## 3. Verification Plan
*   Run `compile_applet` to verify TypeScript types and imports.
*   Test initial app launch and verify smooth loading progress bar and successful asset initialization.
