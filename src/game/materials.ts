import * as THREE from 'three';

/**
 * Procedural PBR canvas textures and materials.
 * 100% code generated, zero external image 404 dependencies.
 */

// Procedural Desert Camo Texture
export function createDesertCamoTexture(width = 256, height = 256): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Base khaki
  ctx.fillStyle = '#bfa57c';
  ctx.fillRect(0, 0, width, height);

  // Digital camo blobs
  const colors = ['#917855', '#6e5a3c', '#d8c29d', '#483c2a'];
  for (let i = 0; i < 180; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const w = 12 + Math.random() * 28;
    const h = 12 + Math.random() * 28;
    ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
    ctx.fillRect(x, y, w, h);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Procedural Mudbrick & Sandstone Pattern (Traditional Yemeni architecture)
export function createYemenStoneTexture(width = 512, height = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Warm ochre stone base
  ctx.fillStyle = '#b8946e';
  ctx.fillRect(0, 0, width, height);

  // Brick lines
  const rows = 16;
  const rowHeight = height / rows;
  const cols = 8;
  const colWidth = width / cols;

  ctx.strokeStyle = '#6d543c';
  ctx.lineWidth = 3;

  for (let r = 0; r < rows; r++) {
    const y = r * rowHeight;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();

    const offset = (r % 2) * (colWidth / 2);
    for (let c = 0; c < cols + 1; c++) {
      const x = c * colWidth + offset;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + rowHeight);
      ctx.stroke();
    }
  }

  // Weathering noise
  for (let i = 0; i < 4000; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(70, 50, 30, 0.12)' : 'rgba(255, 240, 210, 0.1)';
    ctx.fillRect(x, y, 2, 2);
  }

  // White gypsum/lime decorative band (iconic Yemeni Qamariya / frieze trim)
  ctx.fillStyle = '#f8f6f0';
  ctx.fillRect(0, 0, width, 24);
  ctx.fillRect(0, height - 24, width, 24);

  // Chevron geometric pattern in white frieze
  ctx.strokeStyle = '#b8946e';
  ctx.lineWidth = 2;
  for (let i = 0; i < width; i += 16) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 8, 24);
    ctx.lineTo(i + 16, 0);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Procedural Explosive Barrel Hazard Texture
export function createHazardBarrelTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Bright military danger red
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(0, 0, 256, 256);

  // Yellow and black warning hazard chevron band
  const bandY = 90;
  const bandH = 76;
  ctx.fillStyle = '#facc15';
  ctx.fillRect(0, bandY, 256, bandH);

  ctx.fillStyle = '#18181b';
  for (let x = -50; x < 300; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, bandY);
    ctx.lineTo(x + 20, bandY);
    ctx.lineTo(x + 40, bandY + bandH);
    ctx.lineTo(x + 20, bandY + bandH);
    ctx.closePath();
    ctx.fill();
  }

  // Arabic & English explosive label
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('متفجرات', 128, 60);
  ctx.font = 'bold 18px monospace';
  ctx.fillText('EXPLOSIVE', 128, 210);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Procedural Shipping Container Corrugated Metal Texture
export function createContainerTexture(color = '#1e3a8a'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 256, 256);

  // Vertical corrugated ribs with highlights & shadows
  const ribWidth = 16;
  for (let x = 0; x < 256; x += ribWidth) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.fillRect(x, 0, ribWidth / 2, 256);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.fillRect(x + ribWidth / 2, 0, ribWidth / 2, 256);
  }

  // Stencil markings
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 20px monospace';
  ctx.fillText('YEMEN LOGISTICS', 20, 50);
  ctx.font = '14px monospace';
  ctx.fillText('PORT BAB-EL-MANDEB', 20, 80);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Procedural Terrain Ground Texture (Sand & Desert Pebbles)
export function createDesertTerrainTexture(color = '#c9a779'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 512, 512);

  // Sand ripples and noise
  for (let i = 0; i < 6000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const radius = Math.random() * 2 + 0.5;
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(80, 55, 30, 0.15)' : 'rgba(255, 245, 220, 0.12)';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(16, 16);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Soft radial contact shadow texture
export function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0.6)');
  gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.25)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}
