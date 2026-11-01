import * as THREE from 'three';
import { createCommandoModel, resetSharedTextures } from './models.ts';
import { soundManager } from './audio.ts';

export interface AssetLoadProgress {
  progress: number; // 0 to 100
  currentItem: string;
  loadedCount: number;
  totalCount: number;
}

class AssetLoader {
  private isLoaded: boolean = false;
  private cache: Map<string, any> = new Map();

  public async preloadAll(onProgress?: (progress: AssetLoadProgress) => void): Promise<void> {
    if (this.isLoaded) {
      if (onProgress) {
        onProgress({ progress: 100, currentItem: 'Ready', loadedCount: 5, totalCount: 5 });
      }
      return;
    }

    const items = [
      { name: 'Audio Sound Synthesis Engine', load: async () => { soundManager.init(); } },
      { name: 'Shared Textures & Materials', load: async () => { resetSharedTextures(); } },
      { name: 'Procedural Commando Models (Player)', load: async () => { const m = createCommandoModel(true); this.cache.set('playerModel', m); } },
      { name: 'Procedural Commando Models (Enemy AI)', load: async () => { const m = createCommandoModel(false); this.cache.set('enemyModel', m); } },
      { name: 'Terrain Shaders & Voxel Buffers', load: async () => { await new Promise((r) => setTimeout(r, 150)); } },
    ];

    const total = items.length;
    for (let i = 0; i < total; i++) {
      const item = items[i];
      if (onProgress) {
        onProgress({
          progress: Math.round(((i) / total) * 100),
          currentItem: item.name,
          loadedCount: i,
          totalCount: total,
        });
      }
      try {
        await item.load();
      } catch (err) {
        console.warn(`AssetLoader warning loading ${item.name}:`, err);
      }
      await new Promise((r) => setTimeout(r, 80)); // Smooth visual pacing
    }

    if (onProgress) {
      onProgress({ progress: 100, currentItem: 'Tactical Theater Ready', loadedCount: total, totalCount: total });
    }

    this.isLoaded = true;
  }

  public getCached(key: string): any {
    return this.cache.get(key);
  }

  public isPreloaded(): boolean {
    return this.isLoaded;
  }
}

export const assetLoader = new AssetLoader();
