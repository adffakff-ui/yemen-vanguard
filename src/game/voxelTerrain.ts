import * as THREE from 'three';

export interface VoxelChunk {
  mesh: THREE.InstancedMesh;
  data: Int8Array; // 0: empty, 1: dirt, 2: stone
  size: number;
}

/**
 * VoxelTerrain: A prototype voxel-based ground system for tactical destruction.
 * Uses InstancedMesh for performance on mobile.
 */
export class VoxelTerrain {
  public group: THREE.Group;
  private chunks: VoxelChunk[] = [];
  private gridSize = 96; // 96x96 blocks
  private voxelSize = 1.2;
  private dummy = new THREE.Object3D();
  private blockGeo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
  private materials: THREE.Material[];

  constructor(groundColor: number) {
    this.group = new THREE.Group();
    
    // Materials for different voxel types
    this.materials = [
      new THREE.MeshStandardMaterial({ 
        color: groundColor, 
        roughness: 0.9, 
        metalness: 0.1 
      }),
      new THREE.MeshStandardMaterial({ 
        color: new THREE.Color(groundColor).multiplyScalar(0.7), 
        roughness: 1.0, 
        metalness: 0.05 
      })
    ];

    this.initGrid();
  }

  private initGrid() {
    // We'll create one big InstancedMesh for the top layer
    const count = this.gridSize * this.gridSize;
    const mesh = new THREE.InstancedMesh(this.blockGeo, this.materials[0], count);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const data = new Int8Array(count).fill(1);
    
    this.updateMesh(mesh, data);
    
    this.chunks.push({ mesh, data, size: this.gridSize });
    this.group.add(mesh);
    
    // Position the whole grid centered
    const offset = (this.gridSize * this.voxelSize) / 2;
    this.group.position.set(-offset, -0.6, -offset);
  }

  private updateMesh(mesh: THREE.InstancedMesh, data: Int8Array) {
    for (let z = 0; z < this.gridSize; z++) {
      for (let x = 0; x < this.gridSize; x++) {
        const i = z * this.gridSize + x;
        if (data[i] === 0) {
          // Hide by scaling to zero
          this.dummy.scale.set(0, 0, 0);
          this.dummy.position.set(0, -10, 0); // Move away just in case
        } else {
          this.dummy.scale.set(1, 1, 1);
          this.dummy.position.set(x * this.voxelSize, 0, z * this.voxelSize);
        }
        this.dummy.updateMatrix();
        mesh.setMatrixAt(i, this.dummy.matrix);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  /**
   * Remove voxels in a radius around a world position
   */
  public explode(worldPos: THREE.Vector3, radius: number): boolean {
    // Convert world position to local grid coordinates
    const local = this.group.worldToLocal(worldPos.clone());
    
    const gridX = Math.round(local.x / this.voxelSize);
    const gridZ = Math.round(local.z / this.voxelSize);
    const gridRadius = Math.ceil(radius / this.voxelSize);
    
    let changed = false;
    const chunk = this.chunks[0];
    
    for (let z = gridZ - gridRadius; z <= gridZ + gridRadius; z++) {
      for (let x = gridX - gridRadius; x <= gridX + gridRadius; x++) {
        if (x < 0 || x >= this.gridSize || z < 0 || z >= this.gridSize) continue;
        
        const dx = x - gridX;
        const dz = z - gridZ;
        const distSq = dx * dx + dz * dz;
        
        if (distSq <= gridRadius * gridRadius) {
          const i = z * this.gridSize + x;
          if (chunk.data[i] !== 0) {
            chunk.data[i] = 0;
            changed = true;
          }
        }
      }
    }
    
    if (changed) {
      this.updateMesh(chunk.mesh, chunk.data);
    }
    return changed;
  }

  public dispose() {
    this.blockGeo.dispose();
    this.materials.forEach(m => m.dispose());
    this.chunks.forEach(c => c.mesh.dispose());
  }
}
