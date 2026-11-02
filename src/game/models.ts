import * as THREE from 'three';
import {
  createDesertCamoTexture,
  createYemenStoneTexture,
  createHazardBarrelTexture,
  createContainerTexture,
  createContactShadowTexture
} from './materials.ts';

/**
 * 3D Procedural Composite Models.
 * Follows the 3-12 part composite rule: Multi-part hierarchical groups with varied
 * roughness/metalness, grounded bottom-center pivots, and realistic proportions.
 */

// Global shared materials cache
let desertCamoTex: THREE.CanvasTexture | null = null;
let yemenStoneTex: THREE.CanvasTexture | null = null;
let barrelTex: THREE.CanvasTexture | null = null;
let containerBlueTex: THREE.CanvasTexture | null = null;
let containerGreenTex: THREE.CanvasTexture | null = null;
let shadowTex: THREE.CanvasTexture | null = null;

export function resetSharedTextures() {
  if (desertCamoTex) desertCamoTex.dispose();
  if (yemenStoneTex) yemenStoneTex.dispose();
  if (barrelTex) barrelTex.dispose();
  if (containerBlueTex) containerBlueTex.dispose();
  if (containerGreenTex) containerGreenTex.dispose();
  if (shadowTex) shadowTex.dispose();

  desertCamoTex = null;
  yemenStoneTex = null;
  barrelTex = null;
  containerBlueTex = null;
  containerGreenTex = null;
  shadowTex = null;
}

function initSharedTextures() {
  if (!desertCamoTex) {
    desertCamoTex = createDesertCamoTexture();
    desertCamoTex.userData.isShared = true;
  }
  if (!yemenStoneTex) {
    yemenStoneTex = createYemenStoneTexture();
    yemenStoneTex.userData.isShared = true;
  }
  if (!barrelTex) {
    barrelTex = createHazardBarrelTexture();
    barrelTex.userData.isShared = true;
  }
  if (!containerBlueTex) {
    containerBlueTex = createContainerTexture('#1e3a8a');
    containerBlueTex.userData.isShared = true;
  }
  if (!containerGreenTex) {
    containerGreenTex = createContainerTexture('#2d4030');
    containerGreenTex.userData.isShared = true;
  }
  if (!shadowTex) {
    shadowTex = createContactShadowTexture();
    shadowTex.userData.isShared = true;
  }
}

/**
 * Procedural Commando Soldier (12+ part composite hierarchy)
 */
export interface CommandoModel {
  root: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  weaponGroup: THREE.Group;
  muzzlePoint: THREE.Vector3;
  setAnimation: (action: 'idle' | 'run' | 'aim' | 'crouch' | 'roll', progress: number) => void;
  updateCustomization?: (customization: {
    camo: 'desert' | 'coastal' | 'canyon';
    visorTint: 'emerald' | 'amber' | 'cobalt';
    sightOptic: 'holo' | 'acog' | 'thermal';
  }) => void;
}

export function createCommandoModel(isPlayer = true): CommandoModel {
  initSharedTextures();
  const root = new THREE.Group();

  // Material definitions
  const uniformMat = new THREE.MeshStandardMaterial({
    map: desertCamoTex!,
    roughness: 0.85,
    metalness: 0.1,
  });

  const vestMat = new THREE.MeshStandardMaterial({
    color: isPlayer ? 0x2e3528 : 0x42382c, // Olive tactical / Desert brown
    roughness: 0.75,
    metalness: 0.2,
  });

  const armorPlateMat = new THREE.MeshStandardMaterial({
    color: 0x1f2421,
    roughness: 0.6,
    metalness: 0.4,
  });

  const helmetMat = new THREE.MeshStandardMaterial({
    color: isPlayer ? 0x3d4334 : 0x5a4a35,
    roughness: 0.65,
    metalness: 0.3,
  });

  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xb58a63,
    roughness: 0.9,
    metalness: 0.05,
  });

  const visorMat = new THREE.MeshPhysicalMaterial({
    color: isPlayer ? 0x10b981 : 0xf97316, // Green NVG tint for player, Amber for hostile
    roughness: 0.15,
    metalness: 0.9,
    clearcoat: 1.0,
  });

  const weaponMat = new THREE.MeshStandardMaterial({
    color: 0x181a1b,
    roughness: 0.4,
    metalness: 0.85,
  });

  // Pelvis / Hips (Root anchor)
  const hips = new THREE.Group();
  hips.position.y = 0.9;
  root.add(hips);

  const pelvisMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.22, 0.28),
    uniformMat
  );
  pelvisMesh.castShadow = true;
  hips.add(pelvisMesh);

  // Torso & Tactical Armor Rig
  const torso = new THREE.Group();
  torso.position.y = 0.12;
  hips.add(torso);

  // Inner torso body
  const upperBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.44, 0.52, 0.3),
    uniformMat
  );
  upperBody.position.y = 0.26;
  upperBody.castShadow = true;
  torso.add(upperBody);

  // Tactical Plate Carrier (Front & Back)
  const plateCarrier = new THREE.Mesh(
    new THREE.BoxGeometry(0.46, 0.44, 0.34),
    vestMat
  );
  plateCarrier.position.y = 0.26;
  plateCarrier.castShadow = true;
  torso.add(plateCarrier);

  // Front ammo magazine pouches
  for (let i = -1; i <= 1; i++) {
    const pouch = new THREE.Mesh(
      new THREE.BoxGeometry(0.09, 0.15, 0.06),
      armorPlateMat
    );
    pouch.position.set(i * 0.12, 0.2, 0.19);
    pouch.castShadow = true;
    torso.add(pouch);
  }

  // Tactical backpack / radio comms with antenna
  const radioPack = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.32, 0.14),
    vestMat
  );
  radioPack.position.set(0, 0.3, -0.21);
  radioPack.castShadow = true;
  torso.add(radioPack);

  const antenna = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.008, 0.45, 6),
    weaponMat
  );
  antenna.position.set(0.1, 0.54, -0.23);
  antenna.rotation.z = -0.15;
  torso.add(antenna);

  // Head, Neck & Helmet
  const head = new THREE.Group();
  head.position.y = 0.58;
  torso.add(head);

  // Balaclava neck & head
  const neckMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.11, 0.14, 8),
    skinMat
  );
  neckMesh.position.y = 0.05;
  head.add(neckMesh);

  const headMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 12, 10),
    skinMat
  );
  headMesh.position.y = 0.18;
  headMesh.castShadow = true;
  head.add(headMesh);

  // FAST Tactical High-Cut Helmet
  const helmetMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.175, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.65),
    helmetMat
  );
  helmetMesh.position.y = 0.19;
  helmetMesh.castShadow = true;
  head.add(helmetMesh);

  // NVG Goggles / Tactical Eyewear Visor
  const visor = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.06, 0.08),
    visorMat
  );
  visor.position.set(0, 0.18, 0.13);
  head.add(visor);

  // Left Leg (Thigh, Knee, Boot)
  const leftLeg = new THREE.Group();
  leftLeg.position.set(0.14, -0.06, 0);
  hips.add(leftLeg);

  const leftThigh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.07, 0.42, 8),
    uniformMat
  );
  leftThigh.position.y = -0.21;
  leftThigh.castShadow = true;
  leftLeg.add(leftThigh);

  const leftKnee = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.12, 0.06),
    armorPlateMat
  );
  leftKnee.position.set(0, -0.38, 0.06);
  leftLeg.add(leftKnee);

  const leftBoot = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.22, 0.22),
    armorPlateMat
  );
  leftBoot.position.set(0, -0.68, 0.04);
  leftBoot.castShadow = true;
  leftLeg.add(leftBoot);

  // Right Leg (Thigh, Knee, Boot)
  const rightLeg = new THREE.Group();
  rightLeg.position.set(-0.14, -0.06, 0);
  hips.add(rightLeg);

  const rightThigh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.07, 0.42, 8),
    uniformMat
  );
  rightThigh.position.y = -0.21;
  rightThigh.castShadow = true;
  rightLeg.add(rightThigh);

  const rightKnee = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.12, 0.06),
    armorPlateMat
  );
  rightKnee.position.set(0, -0.38, 0.06);
  rightLeg.add(rightKnee);

  const rightBoot = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.22, 0.22),
    armorPlateMat
  );
  rightBoot.position.set(0, -0.68, 0.04);
  rightBoot.castShadow = true;
  rightLeg.add(rightBoot);

  // Left Arm & Forearm
  const leftArm = new THREE.Group();
  leftArm.position.set(0.28, 0.46, 0);
  torso.add(leftArm);

  const leftUpperArm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.06, 0.32, 8),
    uniformMat
  );
  leftUpperArm.position.y = -0.16;
  leftUpperArm.castShadow = true;
  leftArm.add(leftUpperArm);

  const leftForearm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.05, 0.28, 8),
    skinMat
  );
  leftForearm.position.y = -0.42;
  leftArm.add(leftForearm);

  // Right Arm (Weapon grip arm)
  const rightArm = new THREE.Group();
  rightArm.position.set(-0.28, 0.46, 0);
  torso.add(rightArm);

  const rightUpperArm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.06, 0.32, 8),
    uniformMat
  );
  rightUpperArm.position.y = -0.16;
  rightUpperArm.castShadow = true;
  rightArm.add(rightUpperArm);

  const rightForearm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.05, 0.28, 8),
    skinMat
  );
  rightForearm.position.y = -0.42;
  rightArm.add(rightForearm);

  // Tactical Rifle Weapon Model
  const weaponGroup = new THREE.Group();
  weaponGroup.position.set(0.08, -0.44, 0.26);
  rightArm.add(weaponGroup);

  // Rifle Receiver
  const rifleBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.12, 0.54),
    weaponMat
  );
  rifleBody.castShadow = true;
  weaponGroup.add(rifleBody);

  // Barrel & Handguard
  const rifleBarrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.015, 0.32, 8),
    weaponMat
  );
  rifleBarrel.rotation.x = Math.PI / 2;
  rifleBarrel.position.set(0, 0.02, 0.38);
  weaponGroup.add(rifleBarrel);

  // Curved Magazine
  const mag = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.16, 0.08),
    weaponMat
  );
  mag.position.set(0, -0.1, 0.06);
  mag.rotation.x = 0.2;
  weaponGroup.add(mag);

  // Holographic Optical Sight
  const sight = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.06, 0.12),
    armorPlateMat
  );
  sight.position.set(0, 0.09, 0.02);
  weaponGroup.add(sight);

  // Soft Contact Shadow Ground Plane
  const shadowMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1.4, 1.4),
    new THREE.MeshBasicMaterial({
      map: shadowTex!,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    })
  );
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = 0.02;
  root.add(shadowMesh);

  // Animation controller
  const muzzlePoint = new THREE.Vector3();

  const setAnimation = (action: 'idle' | 'run' | 'aim' | 'crouch' | 'roll', progress: number) => {
    switch (action) {
      case 'idle':
        const breath = Math.sin(progress * 2) * 0.02;
        torso.position.y = 0.12 + breath;
        torso.rotation.x = 0;
        head.rotation.x = -breath * 0.5;
        leftArm.rotation.set(0.6 + breath, 0.2, -0.2);
        rightArm.rotation.set(0.8 + breath, -0.3, 0.1);
        leftLeg.rotation.set(0, 0, 0.05);
        rightLeg.rotation.set(0, 0, -0.05);
        hips.position.y = 0.9;
        break;

      case 'run':
        const legAngle = Math.sin(progress * 10) * 0.65;
        const armAngle = -legAngle * 0.7;
        leftLeg.rotation.x = legAngle;
        rightLeg.rotation.x = -legAngle;
        leftArm.rotation.set(0.6 + armAngle, 0.2, -0.2);
        rightArm.rotation.set(0.8 - armAngle, -0.3, 0.1);
        torso.rotation.y = Math.sin(progress * 10) * 0.08;
        torso.rotation.x = 0.12; // Forward lean
        hips.position.y = 0.9 + Math.abs(Math.sin(progress * 10)) * 0.06;
        break;

      case 'aim':
        torso.rotation.set(0, -0.3, 0);
        head.rotation.set(0, 0.3, 0);
        rightArm.rotation.set(1.45, -0.35, 0.05);
        leftArm.rotation.set(1.35, 0.45, -0.2);
        leftLeg.rotation.set(0.1, 0, 0.08);
        rightLeg.rotation.set(-0.2, 0, -0.08);
        hips.position.y = 0.88;
        break;

      case 'crouch':
        hips.position.y = 0.55;
        torso.rotation.x = 0.25;
        leftLeg.rotation.set(1.2, 0, 0.2);
        rightLeg.rotation.set(0.6, 0, -0.3);
        rightArm.rotation.set(1.1, -0.2, 0.1);
        leftArm.rotation.set(0.9, 0.3, -0.1);
        break;

      case 'roll':
        hips.position.y = 0.45;
        root.rotation.x = progress * Math.PI * 2;
        break;
    }
  };

  const updateCustomization = (customization: {
    camo: 'desert' | 'coastal' | 'canyon';
    visorTint: 'emerald' | 'amber' | 'cobalt';
    sightOptic: 'holo' | 'acog' | 'thermal';
  }) => {
    // Visor color update
    if (customization.visorTint === 'emerald') visorMat.color.setHex(0x10b981);
    else if (customization.visorTint === 'amber') visorMat.color.setHex(0xf59e0b);
    else if (customization.visorTint === 'cobalt') visorMat.color.setHex(0x3b82f6);

    // Uniform Camo Tint update
    if (customization.camo === 'desert') uniformMat.color.setHex(0xffffff);
    else if (customization.camo === 'coastal') uniformMat.color.setHex(0x78909c);
    else if (customization.camo === 'canyon') uniformMat.color.setHex(0xbcaaa4);

    // Sight Optic update
    if (customization.sightOptic === 'holo') {
      sight.scale.set(1.0, 1.0, 1.0);
      armorPlateMat.color.setHex(0x1f2421);
    } else if (customization.sightOptic === 'acog') {
      sight.scale.set(1.1, 1.3, 1.6);
      armorPlateMat.color.setHex(0x27272a);
    } else if (customization.sightOptic === 'thermal') {
      sight.scale.set(1.2, 1.4, 1.4);
      armorPlateMat.color.setHex(0xd97706);
    }
  };

  return {
    root,
    torso,
    head,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    weaponGroup,
    muzzlePoint,
    setAnimation,
    updateCustomization,
  };
}

/**
 * Procedural Yemen Mudbrick / Stone Watchtower (Iconic Multi-Tier Architecture)
 */
export function createYemenTower(height = 14, width = 6): THREE.Group {
  initSharedTextures();
  const tower = new THREE.Group();

  const stoneMat = new THREE.MeshStandardMaterial({
    map: yemenStoneTex!,
    roughness: 0.9,
    metalness: 0.05,
  });

  const trimMat = new THREE.MeshStandardMaterial({
    color: 0xf3ede2, // White gypsum lime trim
    roughness: 0.8,
    metalness: 0.1,
  });

  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x3d2716, // Dark cedar beams
    roughness: 0.9,
    metalness: 0.05,
  });

  // Base tier
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(width, height * 0.6, width),
    stoneMat
  );
  base.position.y = (height * 0.6) / 2;
  base.castShadow = true;
  base.receiveShadow = true;
  tower.add(base);

  // Stepped upper tier (Slightly narrower, authentic Sana'a high-rise style)
  const upperWidth = width * 0.82;
  const upperHeight = height * 0.4;
  const upperTier = new THREE.Mesh(
    new THREE.BoxGeometry(upperWidth, upperHeight, upperWidth),
    stoneMat
  );
  upperTier.position.y = height * 0.6 + upperHeight / 2;
  upperTier.castShadow = true;
  upperTier.receiveShadow = true;
  tower.add(upperTier);

  // White Gypsum Frieze Decorative Cornice
  const cornice = new THREE.Mesh(
    new THREE.BoxGeometry(upperWidth + 0.4, 0.5, upperWidth + 0.4),
    trimMat
  );
  cornice.position.y = height + 0.25;
  cornice.castShadow = true;
  tower.add(cornice);

  // Roof parapet crenellations / teeth
  const teethCount = 5;
  const toothW = upperWidth / (teethCount * 1.6);
  for (let side = 0; side < 4; side++) {
    const sideAngle = (side * Math.PI) / 2;
    for (let t = 0; t < teethCount; t++) {
      const tooth = new THREE.Mesh(
        new THREE.BoxGeometry(toothW, 0.8, 0.3),
        trimMat
      );
      const offset = (t - (teethCount - 1) / 2) * (toothW * 1.5);
      const dist = upperWidth / 2 + 0.1;

      if (side % 2 === 0) {
        tooth.position.set(offset, height + 0.65, side === 0 ? dist : -dist);
      } else {
        tooth.position.set(side === 1 ? dist : -dist, height + 0.65, offset);
        tooth.rotation.y = Math.PI / 2;
      }
      tooth.castShadow = true;
      tower.add(tooth);
    }
  }

  // Wooden support protruding beams (Mudaraj style)
  for (let b = 0; b < 6; b++) {
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, width + 1.2, 6),
      woodMat
    );
    beam.rotation.z = Math.PI / 2;
    beam.position.set(0, 3 + b * 1.8, (b % 2 === 0 ? 1 : -1) * (width / 2.5));
    tower.add(beam);
  }

  return tower;
}

/**
 * Procedural Sandbag Barricade
 */
export function createSandbagBunker(length = 4): THREE.Group {
  const bunker = new THREE.Group();
  const sandbagMat = new THREE.MeshStandardMaterial({
    color: 0x9c8362,
    roughness: 0.95,
    metalness: 0.0,
  });

  const bagWidth = 0.7;
  const bagHeight = 0.24;
  const bagDepth = 0.45;

  const layers = 4;
  for (let l = 0; l < layers; l++) {
    const y = l * bagHeight + bagHeight / 2;
    const bagsInRow = Math.floor(length / bagWidth);
    const offset = (l % 2) * (bagWidth / 2);

    for (let b = 0; b < bagsInRow; b++) {
      const x = b * bagWidth - (length / 2) + offset;
      const bag = new THREE.Mesh(
        new THREE.BoxGeometry(bagWidth * 0.94, bagHeight * 0.9, bagDepth),
        sandbagMat
      );
      bag.position.set(x, y, (Math.random() - 0.5) * 0.05);
      bag.rotation.y = (Math.random() - 0.5) * 0.08;
      bag.castShadow = true;
      bag.receiveShadow = true;
      bunker.add(bag);
    }
  }

  return bunker;
}

/**
 * Procedural Explosive Fuel Barrel
 */
export function createExplosiveBarrel(): THREE.Group {
  initSharedTextures();
  const barrel = new THREE.Group();

  const barrelMat = new THREE.MeshStandardMaterial({
    map: barrelTex!,
    roughness: 0.4,
    metalness: 0.7,
  });

  const rimMat = new THREE.MeshStandardMaterial({
    color: 0x27272a,
    roughness: 0.5,
    metalness: 0.8,
  });

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.38, 0.38, 1.1, 16),
    barrelMat
  );
  body.position.y = 0.55;
  body.castShadow = true;
  body.receiveShadow = true;
  barrel.add(body);

  // Top & bottom steel rims
  const topRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.39, 0.025, 8, 16),
    rimMat
  );
  topRim.rotation.x = Math.PI / 2;
  topRim.position.y = 1.08;
  barrel.add(topRim);

  const bottomRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.39, 0.025, 8, 16),
    rimMat
  );
  bottomRim.rotation.x = Math.PI / 2;
  bottomRim.position.y = 0.04;
  barrel.add(bottomRim);

  return barrel;
}

/**
 * Procedural Shipping Container
 */
export function createShippingContainer(isGreen = false): THREE.Group {
  initSharedTextures();
  const container = new THREE.Group();
  const texture = isGreen ? containerGreenTex! : containerBlueTex!;

  const containerMat = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.65,
    metalness: 0.6,
  });

  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x1f2937,
    roughness: 0.5,
    metalness: 0.8,
  });

  // Main container box (6m length x 2.4m height x 2.4m width)
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(6.0, 2.4, 2.4),
    containerMat
  );
  body.position.y = 1.2;
  body.castShadow = true;
  body.receiveShadow = true;
  container.add(body);

  // Corner cast corner reinforcements
  const cornerSize = 0.25;
  for (let x of [-2.9, 2.9]) {
    for (let y of [0.15, 2.25]) {
      for (let z of [-1.1, 1.1]) {
        const corner = new THREE.Mesh(
          new THREE.BoxGeometry(cornerSize, cornerSize, cornerSize),
          frameMat
        );
        corner.position.set(x, y, z);
        container.add(corner);
      }
    }
  }

  return container;
}

/**
 * Procedural Armored Combat Technical Boss Vehicle (14+ part composite hierarchy)
 */
export interface ArmoredBossModel {
  root: THREE.Group;
  turret: THREE.Group;
  cannons: THREE.Group;
  wheels: THREE.Mesh[];
  telegraphLaser: THREE.Line;
  getMuzzlePosition: () => THREE.Vector3;
  setAimTarget: (targetPos: THREE.Vector3, dt: number) => void;
}

export function createArmoredBossVehicle(): ArmoredBossModel {
  initSharedTextures();
  const root = new THREE.Group();

  const armorSteelMat = new THREE.MeshStandardMaterial({
    color: 0x474238, // Weathered desert armor drab
    roughness: 0.65,
    metalness: 0.7,
  });

  const heavyPlateMat = new THREE.MeshStandardMaterial({
    color: 0x27272a, // Dark reinforced carbon steel
    roughness: 0.5,
    metalness: 0.85,
  });

  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.9,
    metalness: 0.1,
  });

  const rimMat = new THREE.MeshStandardMaterial({
    color: 0x71717a,
    roughness: 0.4,
    metalness: 0.9,
  });

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x0f172a,
    roughness: 0.1,
    metalness: 0.9,
    clearcoat: 1.0,
  });

  // Main Vehicle Chassis (Length: 5.2m, Height: 1.1m, Width: 2.4m)
  const chassis = new THREE.Mesh(
    new THREE.BoxGeometry(5.2, 0.9, 2.3),
    armorSteelMat
  );
  chassis.position.y = 1.0;
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  root.add(chassis);

  // Armored Driver Cab (Front)
  const cab = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 1.2, 2.2),
    armorSteelMat
  );
  cab.position.set(0.9, 1.9, 0);
  cab.castShadow = true;
  cab.receiveShadow = true;
  root.add(cab);

  // Sloped Armored Hood / Engine Bay
  const hood = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.7, 2.1),
    armorSteelMat
  );
  hood.position.set(2.4, 1.35, 0);
  hood.rotation.z = -0.08;
  hood.castShadow = true;
  root.add(hood);

  // Armored Windshield Slits
  const windshield = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.35, 1.8),
    glassMat
  );
  windshield.position.set(2.0, 1.95, 0);
  root.add(windshield);

  // Heavy Front Bull-Bar / Ramming Grille
  const bullBar = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.9, 2.4),
    heavyPlateMat
  );
  bullBar.position.set(3.2, 0.9, 0);
  bullBar.castShadow = true;
  root.add(bullBar);

  // Rear Flatbed Armored Side Barricades
  const bedWallLeft = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.7, 0.15),
    heavyPlateMat
  );
  bedWallLeft.position.set(-1.3, 1.7, 1.05);
  bedWallLeft.castShadow = true;
  root.add(bedWallLeft);

  const bedWallRight = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.7, 0.15),
    heavyPlateMat
  );
  bedWallRight.position.set(-1.3, 1.7, -1.05);
  bedWallRight.castShadow = true;
  root.add(bedWallRight);

  // 4 Heavy Off-Road Tires
  const wheels: THREE.Mesh[] = [];
  const wheelPositions = [
    { x: 1.8, z: 1.25 },
    { x: 1.8, z: -1.25 },
    { x: -1.7, z: 1.25 },
    { x: -1.7, z: -1.25 },
  ];

  wheelPositions.forEach((wp) => {
    const wheelGroup = new THREE.Group();
    wheelGroup.position.set(wp.x, 0.55, wp.z);

    const tire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.55, 0.45, 14),
      tireMat
    );
    tire.rotation.x = Math.PI / 2;
    tire.castShadow = true;
    wheelGroup.add(tire);

    const rim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.32, 0.46, 8),
      rimMat
    );
    rim.rotation.x = Math.PI / 2;
    wheelGroup.add(rim);

    root.add(wheelGroup);
    wheels.push(tire);
  });

  // Heavy 360-Degree Rotating Autocannon Roof/Flatbed Turret
  const turret = new THREE.Group();
  turret.position.set(-1.1, 1.8, 0); // Flatbed mounted
  root.add(turret);

  // Turret Base Pedestal
  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.65, 0.75, 0.5, 12),
    heavyPlateMat
  );
  pedestal.position.y = 0.25;
  pedestal.castShadow = true;
  turret.add(pedestal);

  // Gunner Station & Armored Gun Mantlet
  const mantlet = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.8, 1.1),
    armorSteelMat
  );
  mantlet.position.set(0, 0.75, 0);
  mantlet.castShadow = true;
  turret.add(mantlet);

  // Front Angled Gun Shield
  const gunShield = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 1.1, 1.6),
    heavyPlateMat
  );
  gunShield.position.set(0.65, 0.9, 0);
  gunShield.castShadow = true;
  turret.add(gunShield);

  // Dual Heavy Autocannon Barrels Assembly
  const cannons = new THREE.Group();
  cannons.position.set(0.65, 0.85, 0);
  turret.add(cannons);

  for (let s of [-0.22, 0.22]) {
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.055, 2.2, 8),
      heavyPlateMat
    );
    barrel.rotation.z = -Math.PI / 2;
    barrel.position.set(1.1, 0, s);
    barrel.castShadow = true;
    cannons.add(barrel);

    // Muzzle Brake
    const brake = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.12, 0.12),
      heavyPlateMat
    );
    brake.position.set(2.2, 0, s);
    cannons.add(brake);
  }

  // Ammo Drum Box
  const ammoDrum = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.35, 0.5, 10),
    heavyPlateMat
  );
  ammoDrum.position.set(-0.3, 0.85, -0.75);
  ammoDrum.rotation.z = Math.PI / 2;
  turret.add(ammoDrum);

  // Red Aiming Telegraph Laser Line
  const laserGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(30, 0, 0),
  ]);
  const laserMat = new THREE.LineDashedMaterial({
    color: 0xef4444,
    dashSize: 0.6,
    gapSize: 0.3,
    transparent: true,
    opacity: 0,
  });
  const telegraphLaser = new THREE.Line(laserGeo, laserMat);
  telegraphLaser.computeLineDistances();
  cannons.add(telegraphLaser);

  const getMuzzlePosition = (): THREE.Vector3 => {
    const muzzle = new THREE.Vector3();
    cannons.getWorldPosition(muzzle);
    muzzle.y += 0.1;
    return muzzle;
  };

  const setAimTarget = (targetPos: THREE.Vector3, dt: number) => {
    // World turret position
    const turretWorld = new THREE.Vector3();
    turret.getWorldPosition(turretWorld);

    const toTarget = new THREE.Vector3().subVectors(targetPos, turretWorld);
    const targetAngleY = Math.atan2(toTarget.z, toTarget.x);

    // Smoothly rotate turret
    turret.rotation.y = THREE.MathUtils.damp(
      turret.rotation.y,
      -targetAngleY + Math.PI / 2,
      5,
      dt
    );

    // Pitch cannons up/down
    const distH = Math.hypot(toTarget.x, toTarget.z);
    const targetPitch = Math.atan2(toTarget.y, distH);
    cannons.rotation.z = THREE.MathUtils.damp(
      cannons.rotation.z,
      THREE.MathUtils.clamp(targetPitch, -0.3, 0.3),
      5,
      dt
    );
  };

  return {
    root,
    turret,
    cannons,
    wheels,
    telegraphLaser,
    getMuzzlePosition,
    setAimTarget,
  };
}

/**
 * Procedural Trench Segment (Revetted earthwork, timber planks, and sandbag firing parapet)
 */
export function createTrenchSegment(length = 10, width = 3.2, depth = 1.8, withRoof = false): THREE.Group {
  initSharedTextures();
  const group = new THREE.Group();

  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x5c4033,
    roughness: 0.9,
    metalness: 0.05,
  });

  const dirtMat = new THREE.MeshStandardMaterial({
    color: 0x8b6b4f,
    roughness: 0.95,
  });

  const tinMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    metalness: 0.7,
    roughness: 0.4,
  });

  // Trench Floor Wooden Planks (Duckboards)
  const floorGeo = new THREE.BoxGeometry(width - 0.4, 0.12, length);
  const floor = new THREE.Mesh(floorGeo, woodMat);
  floor.position.set(0, -depth + 0.06, 0);
  floor.receiveShadow = true;
  group.add(floor);

  // Left & Right Timber Revetment Walls
  const wallGeo = new THREE.BoxGeometry(0.2, depth, length);
  const leftWall = new THREE.Mesh(wallGeo, woodMat);
  leftWall.position.set(-width / 2 + 0.1, -depth / 2, 0);
  leftWall.castShadow = true;
  leftWall.receiveShadow = true;
  group.add(leftWall);

  const rightWall = new THREE.Mesh(wallGeo, woodMat);
  rightWall.position.set(width / 2 - 0.1, -depth / 2, 0);
  rightWall.castShadow = true;
  rightWall.receiveShadow = true;
  group.add(rightWall);

  // Vertical Support Posts
  const postGeo = new THREE.CylinderGeometry(0.1, 0.1, depth + 0.4, 6);
  const numPosts = Math.floor(length / 2.5);
  for (let i = 0; i <= numPosts; i++) {
    const z = -length / 2 + (i / numPosts) * length;
    const p1 = new THREE.Mesh(postGeo, woodMat);
    p1.position.set(-width / 2 + 0.2, -depth / 2 + 0.2, z);
    p1.castShadow = true;
    group.add(p1);

    const p2 = new THREE.Mesh(postGeo, woodMat);
    p2.position.set(width / 2 - 0.2, -depth / 2 + 0.2, z);
    p2.castShadow = true;
    group.add(p2);
  }

  // Top Sandbag Lip Parapet
  const parapet1 = createSandbagBunker(length);
  parapet1.position.set(-width / 2 - 0.5, 0, 0);
  parapet1.rotation.y = Math.PI / 2;
  group.add(parapet1);

  const parapet2 = createSandbagBunker(length);
  parapet2.position.set(width / 2 + 0.5, 0, 0);
  parapet2.rotation.y = Math.PI / 2;
  group.add(parapet2);

  // Corrugated Roof Shelter (optional)
  if (withRoof) {
    const roof = new THREE.Mesh(new THREE.BoxGeometry(width + 0.8, 0.08, length * 0.6), tinMat);
    roof.position.set(0, 0.4, 0);
    roof.rotation.z = 0.08; // Slight rain slope
    roof.castShadow = true;
    group.add(roof);
  }

  return group;
}

/**
 * Procedural Fortified Sniper Nest / Pillbox Tower
 */
export function createSniperNest(height = 6, width = 4): THREE.Group {
  initSharedTextures();
  const group = new THREE.Group();

  const stoneMat = new THREE.MeshStandardMaterial({
    map: yemenStoneTex!,
    roughness: 0.9,
  });

  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x4a3525,
    roughness: 0.85,
  });

  // Base Octagonal Stone Pillbox Structure
  const baseGeo = new THREE.CylinderGeometry(width / 2, width * 0.6 / 2, height, 8);
  const base = new THREE.Mesh(baseGeo, stoneMat);
  base.position.y = height / 2;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  // Elevated Firing Platform Deck
  const deck = new THREE.Mesh(new THREE.CylinderGeometry(width * 0.7 / 2, width * 0.7 / 2, 0.3, 8), woodMat);
  deck.position.y = height + 0.15;
  deck.castShadow = true;
  group.add(deck);

  // Sandbag Embrasures around platform rim
  for (let i = 0; i < 8; i++) {
    if (i === 0) continue; // Door / entrance slit gap
    const angle = (i / 8) * Math.PI * 2;
    const r = width * 0.6 / 2;
    const bag = createSandbagBunker(1.4);
    bag.position.set(Math.cos(angle) * r, height + 0.3, Math.sin(angle) * r);
    bag.rotation.y = -angle + Math.PI / 2;
    group.add(bag);
  }

  // Roof Canopy
  const roof = new THREE.Mesh(new THREE.ConeGeometry(width * 0.8 / 2, 1.2, 8), woodMat);
  roof.position.y = height + 2.2;
  roof.castShadow = true;
  group.add(roof);

  return group;
}

/**
 * Procedural Anti-Vehicle Defense (Concrete Dragon's Teeth & Blast Barrier)
 */
export function createAntiVehicleObstacle(): THREE.Group {
  const group = new THREE.Group();

  const concreteMat = new THREE.MeshStandardMaterial({
    color: 0x78716c,
    roughness: 0.95,
  });

  // Concrete Dragon's Teeth Pyramids
  for (let x = -1.8; x <= 1.8; x += 1.2) {
    const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.1, 4), concreteMat);
    tooth.position.set(x, 0.55, 0);
    tooth.rotation.y = Math.PI / 4;
    tooth.castShadow = true;
    tooth.receiveShadow = true;
    group.add(tooth);
  }

  return group;
}

/**
 * Procedural Destructible Wooden Supply Crate
 */
export function createDestructibleCrateMesh(width = 1.2, height = 1.2, depth = 1.2): THREE.Group {
  const crate = new THREE.Group();

  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x8b5a2b, // Cedar wood brown
    roughness: 0.85,
    metalness: 0.05,
  });

  const strapMat = new THREE.MeshStandardMaterial({
    color: 0x27272a, // Dark steel reinforcement
    roughness: 0.5,
    metalness: 0.8,
  });

  // Main Crate Body
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    woodMat
  );
  body.position.y = height / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  crate.add(body);

  // Metal Corner Straps & Cross-Bracing
  const strapThickness = 0.06;
  const topFrame = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.04, strapThickness, depth + 0.04),
    strapMat
  );
  topFrame.position.y = height - strapThickness / 2;
  topFrame.castShadow = true;
  crate.add(topFrame);

  const bottomFrame = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.04, strapThickness, depth + 0.04),
    strapMat
  );
  bottomFrame.position.y = strapThickness / 2;
  bottomFrame.castShadow = true;
  crate.add(bottomFrame);

  // Diagonal Wood Cross-Brace Slats
  const brace1 = new THREE.Mesh(
    new THREE.BoxGeometry(width * 1.2, 0.08, 0.04),
    woodMat
  );
  brace1.position.set(0, height / 2, depth / 2 + 0.02);
  brace1.rotation.z = Math.PI / 4;
  crate.add(brace1);

  const brace2 = new THREE.Mesh(
    new THREE.BoxGeometry(width * 1.2, 0.08, 0.04),
    woodMat
  );
  brace2.position.set(0, height / 2, -depth / 2 - 0.02);
  brace2.rotation.z = -Math.PI / 4;
  crate.add(brace2);

  return crate;
}

/**
 * Procedural Floating Tactical Loot Pickup (Ammo Clip / Armor Plate)
 */
export function createTacticalPickupMesh(type: 'ammo' | 'armor'): THREE.Group {
  const pickup = new THREE.Group();

  if (type === 'ammo') {
    // Twin Ammo Magazines Clipped Together
    const magMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7, // Cyan blue tactical finish
      metalness: 0.8,
      roughness: 0.3,
    });

    const bulletMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15, // Brass brass tips
      metalness: 0.9,
      roughness: 0.2,
    });

    for (let offset of [-0.08, 0.08]) {
      const mag = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.42, 0.22),
        magMat
      );
      mag.position.set(offset, 0.3, 0);
      mag.rotation.z = 0.15;
      mag.castShadow = true;
      pickup.add(mag);

      // Brass bullet tips showing at top
      const tip = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 0.08, 6),
        bulletMat
      );
      tip.position.set(offset + 0.02, 0.52, 0.06);
      pickup.add(tip);
    }

    // Glowing Halo Ring
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.7,
    });
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.35, 0.02, 8, 16),
      ringMat
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.3;
    pickup.add(ring);

  } else {
    // Tactical Armor Plate Carrier Vest
    const armorMat = new THREE.MeshStandardMaterial({
      color: 0x10b981, // Emerald green armor finish
      metalness: 0.6,
      roughness: 0.4,
    });

    const plateMat = new THREE.MeshStandardMaterial({
      color: 0x064e3b, // Dark kevlar
      metalness: 0.8,
      roughness: 0.3,
    });

    const vest = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.45, 0.16),
      armorMat
    );
    vest.position.y = 0.35;
    vest.castShadow = true;
    pickup.add(vest);

    const plate = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.35, 0.2),
      plateMat
    );
    plate.position.y = 0.35;
    pickup.add(plate);

    // Glowing Halo Ring
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x34d399,
      wireframe: true,
      transparent: true,
      opacity: 0.7,
    });
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.35, 0.02, 8, 16),
      ringMat
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.35;
    pickup.add(ring);
  }

  return pickup;
}

/**
 * 3D High-Tech Tactical Recon Drone (Composite Quadcopter Model)
 */
export interface TacticalDroneModel {
  root: THREE.Group;
  rotors: THREE.Mesh[];
  spotlight: THREE.Mesh;
  cameraGimbal: THREE.Group;
  tickAnimation: (dt: number) => void;
}

export function createDroneModel(): TacticalDroneModel {
  const root = new THREE.Group();

  const chassisMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.8,
    roughness: 0.2,
  });

  const armMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.9,
    roughness: 0.3,
  });

  const rotorMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.5,
    roughness: 0.5,
    transparent: true,
    opacity: 0.85,
  });

  const lensMat = new THREE.MeshPhysicalMaterial({
    color: 0x10b981, // Emerald optics glow
    metalness: 0.9,
    roughness: 0.1,
    clearcoat: 1.0,
    emissive: 0x059669,
    emissiveIntensity: 0.6,
  });

  const spotlightMat = new THREE.MeshBasicMaterial({
    color: 0x10b981,
    transparent: true,
    opacity: 0.18,
    side: THREE.DoubleSide,
  });

  // Central Hub Fuselage Body
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.42, 0.18, 8),
    chassisMat
  );
  body.castShadow = true;
  root.add(body);

  // Top GPS Dome Disc
  const gpsDisc = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.22, 0.08, 12),
    new THREE.MeshStandardMaterial({ color: 0x3b82f6, metalness: 0.7, roughness: 0.3 })
  );
  gpsDisc.position.y = 0.13;
  root.add(gpsDisc);

  // 4 Carbon Fiber Quad Rotor Arms & Motor Pods
  const armAngles = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4];
  const armLength = 0.75;
  const rotors: THREE.Mesh[] = [];

  armAngles.forEach((angle) => {
    const armGroup = new THREE.Group();
    armGroup.rotation.y = angle;

    const armBar = new THREE.Mesh(
      new THREE.BoxGeometry(armLength, 0.04, 0.06),
      armMat
    );
    armBar.position.x = armLength / 2;
    armBar.castShadow = true;
    armGroup.add(armBar);

    // Motor Pod
    const motor = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.12, 12),
      chassisMat
    );
    motor.position.x = armLength;
    motor.position.y = 0.05;
    motor.castShadow = true;
    armGroup.add(motor);

    // Propeller Rotor Blade
    const rotor = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.008, 0.04),
      rotorMat
    );
    rotor.position.x = armLength;
    rotor.position.y = 0.12;
    armGroup.add(rotor);
    rotors.push(rotor);

    // LED Beacon Lights (Red on front arms, Green on rear arms)
    const isFront = Math.cos(angle) > 0;
    const ledMat = new THREE.MeshBasicMaterial({
      color: isFront ? 0xef4444 : 0x10b981,
    });
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), ledMat);
    led.position.set(armLength, -0.05, 0);
    armGroup.add(led);

    root.add(armGroup);
  });

  // Gimbal Camera Pod
  const cameraGimbal = new THREE.Group();
  cameraGimbal.position.y = -0.15;

  const gimbalMount = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 12, 12),
    chassisMat
  );
  cameraGimbal.add(gimbalMount);

  const cameraLens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.07, 0.1, 12),
    lensMat
  );
  cameraLens.rotation.x = Math.PI / 2;
  cameraLens.position.z = 0.08;
  cameraGimbal.add(cameraLens);

  root.add(cameraGimbal);

  // Downward Tactical Surveillance Spotlight Beam
  const spotlightGeo = new THREE.ConeGeometry(3.5, 12, 16, 1, true);
  spotlightGeo.translate(0, -6, 0);
  const spotlight = new THREE.Mesh(spotlightGeo, spotlightMat);
  spotlight.position.y = -0.2;
  root.add(spotlight);

  const tickAnimation = (dt: number) => {
    // Spin propellers at high velocity
    rotors.forEach((r, idx) => {
      r.rotation.y += dt * 35 * (idx % 2 === 0 ? 1 : -1);
    });
    // Subtle float tilt bobbing
    cameraGimbal.rotation.x = Math.sin(Date.now() * 0.003) * 0.08;
  };

  return {
    root,
    rotors,
    spotlight,
    cameraGimbal,
    tickAnimation,
  };
}
/**
 * Procedural C-130 Hercules style Transport Plane (14+ part composite)
 */
export interface TransportPlaneModel {
  root: THREE.Group;
  propellers: THREE.Mesh[];
  cargoDoor: THREE.Group;
  tickAnimation: (dt: number) => void;
}

export function createTransportPlaneModel(): TransportPlaneModel {
  const root = new THREE.Group();

  const fuselageMat = new THREE.MeshStandardMaterial({
    color: 0x4b5563, // Tactical gray
    roughness: 0.6,
    metalness: 0.4,
  });

  const propellerMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.8,
    metalness: 0.2,
    transparent: true,
    opacity: 0.8,
  });

  // Main Fuselage (Length: 30m)
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(2, 2.2, 24, 12),
    fuselageMat
  );
  body.rotation.x = Math.PI / 2;
  root.add(body);

  // Cockpit Nose
  const nose = new THREE.Mesh(
    new THREE.SphereGeometry(2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    fuselageMat
  );
  nose.position.z = 12;
  nose.rotation.x = Math.PI / 2;
  root.add(nose);

  // Tail Section
  const tail = new THREE.Mesh(
    new THREE.CylinderGeometry(2.2, 0.5, 8, 12),
    fuselageMat
  );
  tail.position.z = -16;
  tail.rotation.x = Math.PI / 2;
  root.add(tail);

  // Horizontal Stabilizers
  const hStab = new THREE.Mesh(
    new THREE.BoxGeometry(8, 0.2, 2.5),
    fuselageMat
  );
  hStab.position.set(0, 0, -18);
  root.add(hStab);

  // Vertical Fin
  const vFin = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 4.5, 3.5),
    fuselageMat
  );
  vFin.position.set(0, 2.2, -18);
  root.add(vFin);

  // Main Wings (Wingspan: 40m)
  const wing = new THREE.Mesh(
    new THREE.BoxGeometry(38, 0.4, 4.5),
    fuselageMat
  );
  wing.position.set(0, 0.5, 2);
  root.add(wing);

  // 4 Engine Nacelles & Propellers
  const propellers: THREE.Mesh[] = [];
  const enginePos = [-12, -6, 6, 12];
  
  enginePos.forEach((x) => {
    const nacelle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 0.7, 3, 8),
      fuselageMat
    );
    nacelle.position.set(x, 0, 3.5);
    nacelle.rotation.x = Math.PI / 2;
    root.add(nacelle);

    const prop = new THREE.Mesh(
      new THREE.BoxGeometry(4.5, 0.2, 0.1),
      propellerMat
    );
    prop.position.set(x, 0, 5);
    root.add(prop);
    propellers.push(prop);
  });

  // Cargo Ramp Door
  const cargoDoor = new THREE.Group();
  cargoDoor.position.set(0, -1.8, -12);
  root.add(cargoDoor);

  const doorMesh = new THREE.Mesh(
    new THREE.BoxGeometry(3, 0.2, 6),
    fuselageMat
  );
  doorMesh.position.z = -3;
  cargoDoor.add(doorMesh);

  const tickAnimation = (dt: number) => {
    propellers.forEach((p) => {
      p.rotation.z += dt * 40;
    });
  };

  return {
    root,
    propellers,
    cargoDoor,
    tickAnimation,
  };
}

/**
 * Procedural Tactical Parachute Canopy
 */
export function createParachuteModel(): THREE.Group {
  const root = new THREE.Group();

  const canopyMat = new THREE.MeshStandardMaterial({
    color: 0x4b5563, // Gray / Olive
    roughness: 0.8,
    metalness: 0.1,
    side: THREE.DoubleSide,
  });

  const cordMat = new THREE.MeshBasicMaterial({
    color: 0xd1d5db,
  });

  // Main Canopy Dome (Semi-spherical)
  const canopy = new THREE.Mesh(
    new THREE.SphereGeometry(3.5, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    canopyMat
  );
  canopy.position.y = 8;
  canopy.rotation.x = Math.PI;
  root.add(canopy);

  // Suspension Cords
  const cordCount = 12;
  const radius = 3.4;
  for (let i = 0; i < cordCount; i++) {
    const angle = (i / cordCount) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    const cordGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(x, 8, z),
    ]);
    const cord = new THREE.Line(cordGeo, cordMat);
    root.add(cord);
  }

  return root;
}

/**
 * Procedural 3D Tactical Loot Crate
 * High-detail composite military crate (8+ parts) with metallic latches,
 * corner bumpers, stencil stripes, and tier-colored glowing lock beacon.
 */
export function createLootCrateMesh(
  type: 'tactical_box' | 'air_drop' | 'military_locker' = 'tactical_box',
  tier: 'common' | 'rare' | 'epic' | 'legendary' = 'rare'
): THREE.Group {
  const root = new THREE.Group();

  const tierColors: Record<string, number> = {
    common: 0x94a3b8, // Slate Silver
    rare: 0x38bdf8,   // Cyan
    epic: 0xa855f7,   // Purple
    legendary: 0xf59e0b, // Gold Amber
  };
  const glowColor = tierColors[tier] || 0xf59e0b;

  const crateMat = new THREE.MeshStandardMaterial({
    color: type === 'air_drop' ? 0x991b1b : type === 'military_locker' ? 0x1e293b : 0x2e3c28,
    roughness: 0.7,
    metalness: 0.35,
  });

  const metalTrimMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.4,
    metalness: 0.85,
  });

  const beaconMat = new THREE.MeshBasicMaterial({
    color: glowColor,
  });

  if (type === 'air_drop') {
    // Air-drop supply container (1.8m x 1.8m x 1.4m)
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.4, 1.8), crateMat);
    body.position.y = 0.7;
    body.castShadow = true;
    body.receiveShadow = true;
    root.add(body);

    // Pallet base
    const pallet = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.2, 2.0), metalTrimMat);
    pallet.position.y = 0.1;
    pallet.castShadow = true;
    root.add(pallet);

    // Yellow hazard straps
    const strapMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.5 });
    const strapX = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.1, 0.1), strapMat);
    strapX.position.set(0, 0.7, 0.91);
    root.add(strapX);

    // Smoke Flare Beacon on top
    const flareCan = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.4, 8), metalTrimMat);
    flareCan.position.set(0, 1.6, 0);
    root.add(flareCan);

    const flareGlow = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), beaconMat);
    flareGlow.position.set(0, 1.82, 0);
    root.add(flareGlow);
  } else {
    // Standard Tactical Weapon Case (1.4m x 0.5m x 0.8m)
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.45, 0.8), crateMat);
    body.position.y = 0.25;
    body.castShadow = true;
    body.receiveShadow = true;
    root.add(body);

    // Lid Rim
    const lid = new THREE.Mesh(new THREE.BoxGeometry(1.44, 0.1, 0.84), metalTrimMat);
    lid.position.y = 0.48;
    root.add(lid);

    // Corner Protectors (4x)
    const cornerGeo = new THREE.BoxGeometry(0.12, 0.5, 0.12);
    [
      [-0.68, -0.38],
      [0.68, -0.38],
      [-0.68, 0.38],
      [0.68, 0.38],
    ].forEach(([cx, cz]) => {
      const corner = new THREE.Mesh(cornerGeo, metalTrimMat);
      corner.position.set(cx, 0.26, cz);
      root.add(corner);
    });

    // Dual front latches
    const latchGeo = new THREE.BoxGeometry(0.12, 0.16, 0.04);
    const latch1 = new THREE.Mesh(latchGeo, metalTrimMat);
    latch1.position.set(-0.35, 0.35, 0.41);
    root.add(latch1);
    const latch2 = new THREE.Mesh(latchGeo, metalTrimMat);
    latch2.position.set(0.35, 0.35, 0.41);
    root.add(latch2);

    // Central Glowing Status Indicator (Shows Rarity Tier)
    const beacon = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.03), beaconMat);
    beacon.position.set(0, 0.36, 0.41);
    root.add(beacon);
  }

  // Soft Ground Contact Shadow
  const shadowGeo = new THREE.PlaneGeometry(2.0, 1.4);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
  });
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.01;
  root.add(shadow);

  return root;
}

/**
 * Procedural Collapsed Ground Parachute
 * Draped canopy fabric resting flush on terrain after touchdown cutaway.
 */
export function createCollapsedParachuteModel(): THREE.Group {
  const root = new THREE.Group();

  const fabricMat = new THREE.MeshStandardMaterial({
    color: 0x475569, // Military Slate
    roughness: 0.9,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });

  // Flat wrinkled fabric mound
  const mound = new THREE.Mesh(
    new THREE.CylinderGeometry(1.8, 2.8, 0.22, 10),
    fabricMat
  );
  mound.position.y = 0.11;
  mound.rotation.y = Math.PI / 4;
  mound.castShadow = true;
  root.add(mound);

  // Folded pleats
  const pleatGeo = new THREE.CylinderGeometry(0.3, 0.5, 2.2, 6);
  for (let i = 0; i < 3; i++) {
    const pleat = new THREE.Mesh(pleatGeo, fabricMat);
    pleat.rotation.z = Math.PI / 2;
    pleat.rotation.y = (i * Math.PI) / 3;
    pleat.position.set((i - 1) * 0.4, 0.16, 0);
    root.add(pleat);
  }

  // Tapered cut cords
  const cordMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8 });
  for (let i = 0; i < 4; i++) {
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.05, 0),
      new THREE.Vector3(Math.cos(i) * 2.2, 0.02, Math.sin(i) * 2.2),
    ]);
    root.add(new THREE.Line(lineGeo, cordMat));
  }

  return root;
}

/**
 * Procedural Military Tactical Recon Buggy / Technical
 * Composite 10-part vehicular model with chunky all-terrain tires,
 * tubular steel roll-cage, headlights, hood, and rear supply bed.
 */
export function createTacticalBuggyModel(): THREE.Group {
  const root = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xb45309, // Desert Tan / Amber Brown
    roughness: 0.6,
    metalness: 0.4,
  });

  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b, // Dark Carbon Steel
    roughness: 0.35,
    metalness: 0.85,
  });

  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a, // Charcoal Rubber
    roughness: 0.9,
    metalness: 0.1,
  });

  const headlightMat = new THREE.MeshBasicMaterial({
    color: 0xfef08a, // Warm Yellow Beam
  });

  // 1. Lower Chassis
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.35, 4.4), bodyMat);
  chassis.position.y = 0.65;
  chassis.castShadow = true;
  root.add(chassis);

  // 2. Hood / Engine Bay
  const hood = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.4, 1.6), bodyMat);
  hood.position.set(0, 0.95, -1.2);
  hood.castShadow = true;
  root.add(hood);

  // 3. Cabin Floor & Seats
  const seatMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
  const seat1 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 0.7), seatMat);
  seat1.position.set(-0.55, 1.1, 0.2);
  root.add(seat1);
  const seat2 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 0.7), seatMat);
  seat2.position.set(0.55, 1.1, 0.2);
  root.add(seat2);

  // 4. Steering Wheel
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.04, 6, 12), frameMat);
  wheel.position.set(-0.55, 1.25, -0.3);
  wheel.rotation.x = Math.PI / 4;
  root.add(wheel);

  // 5. Tubular Roll-Cage Bars
  const rollBar1 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.4, 8), frameMat);
  rollBar1.position.set(-1.0, 1.5, -0.4);
  root.add(rollBar1);
  const rollBar2 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.4, 8), frameMat);
  rollBar2.position.set(1.0, 1.5, -0.4);
  root.add(rollBar2);
  const rollBar3 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.4, 8), frameMat);
  rollBar3.position.set(-1.0, 1.5, 1.0);
  root.add(rollBar3);
  const rollBar4 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.4, 8), frameMat);
  rollBar4.position.set(1.0, 1.5, 1.0);
  root.add(rollBar4);

  // Roll-Cage Roof Rail
  const roof = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.06, 1.5), frameMat);
  roof.position.set(0, 2.2, 0.3);
  root.add(roof);

  // 6. 4x All-Terrain Wheels
  const wheelGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.38, 14);
  wheelGeo.rotateZ(Math.PI / 2);
  const wheelPositions = [
    [-1.25, 0.48, -1.4],
    [1.25, 0.48, -1.4],
    [-1.25, 0.48, 1.4],
    [1.25, 0.48, 1.4],
  ];
  wheelPositions.forEach(([wx, wy, wz]) => {
    const tire = new THREE.Mesh(wheelGeo, tireMat);
    tire.position.set(wx, wy, wz);
    tire.castShadow = true;
    root.add(tire);

    // Rim Hubcap
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.4, 8), frameMat);
    rim.rotation.z = Math.PI / 2;
    rim.position.set(wx, wy, wz);
    root.add(rim);
  });

  // 7. Dual Headlights
  const lightL = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), headlightMat);
  lightL.position.set(-0.75, 0.95, -2.05);
  root.add(lightL);
  const lightR = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), headlightMat);
  lightR.position.set(0.75, 0.95, -2.05);
  root.add(lightR);

  // 8. Rear Bumper & Antenna
  const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.2, 0.2), frameMat);
  rearBumper.position.set(0, 0.6, 2.25);
  root.add(rearBumper);

  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.6, 4), frameMat);
  antenna.position.set(-1.0, 1.6, 2.1);
  root.add(antenna);

  return root;
}

