import * as THREE from 'three';
import { WarTheaterConfig, WarTheaterId } from '../types/game.ts';
import {
  createYemenTower,
  createSandbagBunker,
  createExplosiveBarrel,
  createShippingContainer,
  createTrenchSegment,
  createSniperNest,
  createAntiVehicleObstacle,
  createDestructibleCrateMesh,
} from './models.ts';
import { createDesertTerrainTexture } from './materials.ts';

export interface DestructiblePropObject {
  id: string;
  type: 'crate' | 'sandbag';
  group: THREE.Group;
  position: THREE.Vector3;
  health: number;
  maxHealth: number;
  isDestroyed: boolean;
  boundingRadius: number;
  sector: 'alpha' | 'bravo' | 'charlie';
}

export interface TheaterBuildResult {
  groundMesh: THREE.Mesh;
  colliders: { box: THREE.Box3; type: 'wall' | 'barrel' | 'cover'; entity?: any }[];
  barrelObjects: { group: THREE.Group; position: THREE.Vector3; health: number; isExploded: boolean }[];
  destructibleProps: DestructiblePropObject[];
  enemySpawnPoints: THREE.Vector3[];
  playerSpawnPoint: THREE.Vector3;
  propsGroup: THREE.Group;
}

export const WAR_THEATERS: WarTheaterConfig[] = [
  {
    id: 'sanaa',
    nameAr: 'حصن صنعاء الجبلي والخنادق',
    nameEn: "Sana'a Citadel & Trench Complex",
    regionAr: 'المرتفعات الجبلية - صنعاء',
    regionEn: "Highland Mountains, Sana'a",
    descriptionAr: 'حصن تاريخي شاهق محاط بخنادق الميدان المجهزة وأعشاش القناصة في الأبراج الصخرية.',
    descriptionEn: 'High-altitude mountain citadel surrounded by field trenches and elevated tower sniper nests.',
    skyColor: 0x87ceeb, // Clear high-noon sky
    fogColor: 0xbae6fd,
    sunColor: 0xfff8ee,
    groundColor: 0xb59265,
    accentColor: '#f59e0b',
    objectiveAr: 'طهّر خنادق القطاع واقتحم أعشاش القناصة في الأبراج العلوية',
    objectiveEn: 'Clear perimeter trench sector and neutralize elevated tower snipers',
    enemyCount: 8,
    barrelCount: 6,
    coordinates: { lat: "15°21'N", lng: "44°12'E" },
    threatLevel: 'HIGH',
  },
  {
    id: 'mandeeb',
    nameAr: 'قاعدة باب المندب والستار الساحلي',
    nameEn: 'Bab-el-Mandeb Coastal Ramparts',
    regionAr: 'مضيق باب المندب - الساحل الغربي',
    regionEn: 'Bab-el-Mandeb Strait, Red Sea Coast',
    descriptionAr: 'ميناء استراتيجي مليء بممرات الملاحة ودشم المراقبة الخرسانية وموانع المدرعات الساحلية.',
    descriptionEn: 'Strategic coastal naval post with shipping container corridors, pillboxes, and anti-vehicle barriers.',
    skyColor: 0x38bdf8, // High-noon coastal azure sky
    fogColor: 0xbae6fd,
    sunColor: 0xffffff,
    groundColor: 0xd1b98c,
    accentColor: '#0ea5e9',
    objectiveAr: 'اخترق ممرات الحاويات وحيّد دشم المراقبة والزعيم المدرع',
    objectiveEn: 'Breach container corridors and neutralize pillbox defenses',
    enemyCount: 9,
    barrelCount: 8,
    coordinates: { lat: "12°35'N", lng: "43°20'E" },
    threatLevel: 'EXTREME',
  },
  {
    id: 'hadramaut',
    nameAr: 'وادي حضرموت ومجمع الخنادق',
    nameEn: 'Hadramaut Canyon Trench Fortress',
    regionAr: 'الوادي الصحراوي - حضرموت',
    regionEn: 'Desert Canyon Plateau, Hadramaut',
    descriptionAr: 'هضاب صخرية ووديان عميقة تضم شبكات خنادق سفلية وأبراج قنص محصنة وموانع مدرعات.',
    descriptionEn: 'Deep desert sandstone gorges bordered by fortified trench networks, sniper pillboxes, and roadblocks.',
    skyColor: 0x7dd3fc, // High-noon desert clear blue
    fogColor: 0xe0f2fe,
    sunColor: 0xfff0c4,
    groundColor: 0xc49b68,
    accentColor: '#f97316',
    objectiveAr: 'اقتحم شبكة الخنادق العميقة وحيّد رماة القناصة والزعيم',
    objectiveEn: 'Assault deep canyon trench network and eliminate sniper teams',
    enemyCount: 10,
    barrelCount: 8,
    coordinates: { lat: "15°55'N", lng: "48°47'E" },
    threatLevel: 'CRITICAL',
  },
];

export function buildWarTheater(theaterId: WarTheaterId, scene: THREE.Scene, groundTexture?: THREE.CanvasTexture): TheaterBuildResult {
  const config = WAR_THEATERS.find((t) => t.id === theaterId) || WAR_THEATERS[0];
  const propsGroup = new THREE.Group();
  scene.add(propsGroup);

  const colliders: { box: THREE.Box3; type: 'wall' | 'barrel' | 'cover'; entity?: any }[] = [];
  const barrelObjects: { group: THREE.Group; position: THREE.Vector3; health: number; isExploded: boolean }[] = [];
  const destructibleProps: DestructiblePropObject[] = [];
  const enemySpawnPoints: THREE.Vector3[] = [];
  const playerSpawnPoint = new THREE.Vector3(0, 0, 32);

  // Ground plane (140m x 140m)
  const terrainTex = groundTexture || createDesertTerrainTexture(
    '#' + config.groundColor.toString(16).padStart(6, '0')
  );
  const groundGeo = new THREE.PlaneGeometry(160, 160, 32, 32);
  const groundMat = new THREE.MeshStandardMaterial({
    map: terrainTex,
    roughness: 0.95,
    metalness: 0.05,
  });

  const groundMesh = new THREE.Mesh(groundGeo, groundMat);
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.receiveShadow = true;
  propsGroup.add(groundMesh);

  // Natural Perimeter: Cliffs, sandstone boulders, and perimeter defenses
  // Per Three.js skill: Never box scenes in bare indoor walls; use natural barriers extending beyond playfield
  const rockMat = new THREE.MeshStandardMaterial({
    color: config.groundColor,
    roughness: 0.9,
    metalness: 0.1,
  });

  // Perimeter cliffs encircling the arena
  const perimeterRadius = 55;
  const numPerimeterRocks = 26;
  for (let i = 0; i < numPerimeterRocks; i++) {
    const angle = (i / numPerimeterRocks) * Math.PI * 2;
    const x = Math.cos(angle) * perimeterRadius + (Math.random() - 0.5) * 8;
    const z = Math.sin(angle) * perimeterRadius + (Math.random() - 0.5) * 8;
    const rockHeight = 12 + Math.random() * 10;
    const rockWidth = 14 + Math.random() * 8;

    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(rockWidth * 0.5, 1),
      rockMat
    );
    rock.scale.set(1, rockHeight / (rockWidth * 0.5), 1);
    rock.position.set(x, rockHeight * 0.35, z);
    rock.rotation.set(Math.random() * 0.4, Math.random() * Math.PI, Math.random() * 0.4);
    rock.castShadow = true;
    rock.receiveShadow = true;
    propsGroup.add(rock);

    const box = new THREE.Box3().setFromObject(rock);
    colliders.push({ box, type: 'wall' });
  }

  // --- Theater Specific Architecture & Cover Objects ---

  if (theaterId === 'sanaa') {
    // SANA'A CITADEL: Iconic multi-tiered Yemen watchtowers & trench complex
    const towerCoords = [
      { x: -22, z: -20, h: 18, w: 7 },
      { x: 22, z: -20, h: 20, w: 8 },
      { x: -26, z: 12, h: 15, w: 6 },
      { x: 26, z: 12, h: 16, w: 6.5 },
      { x: 0, z: -32, h: 22, w: 9 }, // Central high citadel fortress
    ];

    towerCoords.forEach((coord) => {
      const tower = createYemenTower(coord.h, coord.w);
      tower.position.set(coord.x, 0, coord.z);
      propsGroup.add(tower);
      colliders.push({ box: new THREE.Box3().setFromObject(tower), type: 'wall' });
    });

    // Sector Alpha: Underground Field Trenches (Frontline Zig-Zag)
    const trench1 = createTrenchSegment(12, 3.2, 1.8, true);
    trench1.position.set(-8, 0, 16);
    propsGroup.add(trench1);
    colliders.push({ box: new THREE.Box3().setFromObject(trench1), type: 'cover' });

    const trench2 = createTrenchSegment(12, 3.2, 1.8, false);
    trench2.position.set(8, 0, 16);
    propsGroup.add(trench2);
    colliders.push({ box: new THREE.Box3().setFromObject(trench2), type: 'cover' });

    // Sector Bravo: Elevated Fortified Sniper Nests
    const sniperNest1 = createSniperNest(6, 4.2);
    sniperNest1.position.set(-16, 0, 2);
    propsGroup.add(sniperNest1);
    colliders.push({ box: new THREE.Box3().setFromObject(sniperNest1), type: 'wall' });

    const sniperNest2 = createSniperNest(6, 4.2);
    sniperNest2.position.set(16, 0, 2);
    propsGroup.add(sniperNest2);
    colliders.push({ box: new THREE.Box3().setFromObject(sniperNest2), type: 'wall' });

    // Sector Charlie: Anti-Vehicle Gate Obstacles
    const teeth = createAntiVehicleObstacle();
    teeth.position.set(0, 0, -10);
    propsGroup.add(teeth);
    colliders.push({ box: new THREE.Box3().setFromObject(teeth), type: 'cover' });

    // Connecting stone walls & archway
    const wallGeo = new THREE.BoxGeometry(16, 4.5, 1.8);
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x9e7c56,
      roughness: 0.9,
    });

    const wall1 = new THREE.Mesh(wallGeo, wallMat);
    wall1.position.set(-10, 2.25, -20);
    wall1.castShadow = true;
    wall1.receiveShadow = true;
    propsGroup.add(wall1);
    colliders.push({ box: new THREE.Box3().setFromObject(wall1), type: 'wall' });

    const wall2 = new THREE.Mesh(wallGeo, wallMat);
    wall2.position.set(10, 2.25, -20);
    wall2.castShadow = true;
    wall2.receiveShadow = true;
    propsGroup.add(wall2);
    colliders.push({ box: new THREE.Box3().setFromObject(wall2), type: 'wall' });

    // Sandbag tactical positions
    const sandbagCoords = [
      { x: -8, z: 8, l: 4.5, rot: 0.2 },
      { x: 8, z: 8, l: 4.5, rot: -0.2 },
      { x: 0, z: 0, l: 6.0, rot: 0 },
      { x: -14, z: -6, l: 4.0, rot: Math.PI / 2 },
      { x: 14, z: -6, l: 4.0, rot: -Math.PI / 2 },
      { x: 0, z: -18, l: 5.0, rot: 0 },
    ];

    sandbagCoords.forEach((s) => {
      const bunker = createSandbagBunker(s.l);
      bunker.position.set(s.x, 0, s.z);
      bunker.rotation.y = s.rot;
      propsGroup.add(bunker);
      colliders.push({ box: new THREE.Box3().setFromObject(bunker), type: 'cover' });
    });

    // Enemy spawn points across trench networks and sniper nests
    enemySpawnPoints.push(
      new THREE.Vector3(-16, 0, 2),  // Sniper Nest 1
      new THREE.Vector3(16, 0, 2),   // Sniper Nest 2
      new THREE.Vector3(-8, 0, 16),  // Trench 1
      new THREE.Vector3(8, 0, 16),   // Trench 2
      new THREE.Vector3(-18, 0, -12),
      new THREE.Vector3(18, 0, -12),
      new THREE.Vector3(-6, 0, -4),
      new THREE.Vector3(6, 0, -4),
      new THREE.Vector3(0, 0, -22)
    );

  } else if (theaterId === 'mandeeb') {
    // BAB-EL-MANDEB COASTAL OUTPOST: Cargo containers, naval radar, fuel depot
    const containerLayout = [
      { x: -12, z: 12, rot: 0, green: false },
      { x: -12, z: 9.2, rot: 0, green: true },
      { x: 14, z: 12, rot: 0.1, green: true },
      { x: 14, z: 14.8, rot: 0.1, green: false },
      { x: -18, z: -4, rot: Math.PI / 2, green: true },
      { x: -18, z: 2.4, rot: Math.PI / 2, green: false },
      { x: 18, z: -6, rot: -Math.PI / 2, green: false },
      { x: 18, z: 0.4, rot: -Math.PI / 2, green: true },
      { x: -4, z: -16, rot: 0.3, green: false },
      { x: 8, z: -16, rot: -0.2, green: true },
      { x: 0, z: -26, rot: 0, green: false },
    ];

    containerLayout.forEach((c) => {
      const cont = createShippingContainer(c.green);
      cont.position.set(c.x, 0, c.z);
      cont.rotation.y = c.rot;
      propsGroup.add(cont);
      colliders.push({ box: new THREE.Box3().setFromObject(cont), type: 'wall' });
    });

    // Central Radar Mast
    const radarTower = new THREE.Group();
    const mastMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.3 });
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.6, 16, 8), mastMat);
    mast.position.y = 8;
    mast.castShadow = true;
    radarTower.add(mast);

    const dish = new THREE.Mesh(new THREE.SphereGeometry(2.4, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.4), mastMat);
    dish.position.set(0, 15, 0);
    dish.rotation.x = Math.PI * 0.7;
    radarTower.add(dish);

    radarTower.position.set(0, 0, -8);
    propsGroup.add(radarTower);
    colliders.push({ box: new THREE.Box3().setFromObject(radarTower), type: 'wall' });

    // Sandbag defenses
    const sandbagCoords = [
      { x: -5, z: 4, l: 4, rot: 0.4 },
      { x: 5, z: 4, l: 4, rot: -0.4 },
      { x: 0, z: -10, l: 6, rot: 0 },
    ];
    sandbagCoords.forEach((s) => {
      const bunker = createSandbagBunker(s.l);
      bunker.position.set(s.x, 0, s.z);
      bunker.rotation.y = s.rot;
      propsGroup.add(bunker);
      colliders.push({ box: new THREE.Box3().setFromObject(bunker), type: 'cover' });
    });

    enemySpawnPoints.push(
      new THREE.Vector3(-14, 0, 16),
      new THREE.Vector3(16, 0, 16),
      new THREE.Vector3(-14, 0, -2),
      new THREE.Vector3(14, 0, -2),
      new THREE.Vector3(-6, 0, -12),
      new THREE.Vector3(6, 0, -12),
      new THREE.Vector3(0, 0, -22),
      new THREE.Vector3(-2, 0, -2)
    );

  } else {
    // HADRAMAUT CANYON GORGE: Deep sandstone cliffs, military checkpoints, watchtowers
    const watchtower1 = createYemenTower(14, 5.5);
    watchtower1.position.set(-18, 0, -15);
    propsGroup.add(watchtower1);
    colliders.push({ box: new THREE.Box3().setFromObject(watchtower1), type: 'wall' });

    const watchtower2 = createYemenTower(14, 5.5);
    watchtower2.position.set(18, 0, -15);
    propsGroup.add(watchtower2);
    colliders.push({ box: new THREE.Box3().setFromObject(watchtower2), type: 'wall' });

    // Canyon stone boulders flanking the main road
    const boulderCoords = [
      { x: -10, z: 12, s: 3.5 },
      { x: 12, z: 14, s: 4.0 },
      { x: -14, z: 0, s: 5.0 },
      { x: 15, z: -2, s: 4.5 },
      { x: -8, z: -24, s: 6.0 },
      { x: 10, z: -24, s: 6.0 },
    ];
    boulderCoords.forEach((b) => {
      const boulder = new THREE.Mesh(
        new THREE.DodecahedronGeometry(b.s, 1),
        rockMat
      );
      boulder.position.set(b.x, b.s * 0.8, b.z);
      boulder.castShadow = true;
      boulder.receiveShadow = true;
      propsGroup.add(boulder);
      colliders.push({ box: new THREE.Box3().setFromObject(boulder), type: 'wall' });
    });

    // Checkpoint gate barricades
    const gateBarricade = createSandbagBunker(7);
    gateBarricade.position.set(0, 0, 2);
    propsGroup.add(gateBarricade);
    colliders.push({ box: new THREE.Box3().setFromObject(gateBarricade), type: 'cover' });

    const gateBarricadeBack = createSandbagBunker(6);
    gateBarricadeBack.position.set(0, 0, -12);
    propsGroup.add(gateBarricadeBack);
    colliders.push({ box: new THREE.Box3().setFromObject(gateBarricadeBack), type: 'cover' });

    enemySpawnPoints.push(
      new THREE.Vector3(-14, 0, 8),
      new THREE.Vector3(14, 0, 8),
      new THREE.Vector3(-6, 0, -2),
      new THREE.Vector3(6, 0, -2),
      new THREE.Vector3(-12, 0, -16),
      new THREE.Vector3(12, 0, -16),
      new THREE.Vector3(0, 0, -18),
      new THREE.Vector3(-18, 0, -10),
      new THREE.Vector3(18, 0, -10)
    );
  }

  // --- Explosive Red Barrels Placement ---
  const barrelLocations = [
    new THREE.Vector3(-7, 0, 5),
    new THREE.Vector3(7, 0, 5),
    new THREE.Vector3(-15, 0, -8),
    new THREE.Vector3(15, 0, -8),
    new THREE.Vector3(-4, 0, -18),
    new THREE.Vector3(4, 0, -18),
    new THREE.Vector3(0, 0, -14),
    new THREE.Vector3(-11, 0, 14),
  ].slice(0, config.barrelCount);

  barrelLocations.forEach((pos) => {
    const barrel = createExplosiveBarrel();
    barrel.position.copy(pos);
    propsGroup.add(barrel);

    const barrelObj = {
      group: barrel,
      position: pos.clone(),
      health: 25,
      isExploded: false,
    };
    barrelObjects.push(barrelObj);
    colliders.push({
      box: new THREE.Box3().setFromObject(barrel),
      type: 'barrel',
      entity: barrelObj,
    });
  });

  // --- Destructible Wooden Supply Crates Placement ---
  const crateLocations = [
    { pos: new THREE.Vector3(-6, 0, 10), sector: 'alpha' as const },
    { pos: new THREE.Vector3(6, 0, 10), sector: 'alpha' as const },
    { pos: new THREE.Vector3(-10, 0, 2), sector: 'bravo' as const },
    { pos: new THREE.Vector3(10, 0, 2), sector: 'bravo' as const },
    { pos: new THREE.Vector3(-4, 0, -8), sector: 'charlie' as const },
    { pos: new THREE.Vector3(4, 0, -8), sector: 'charlie' as const },
  ];

  crateLocations.forEach((c, idx) => {
    const crateGroup = createDestructibleCrateMesh(1.2, 1.2, 1.2);
    crateGroup.position.copy(c.pos);
    propsGroup.add(crateGroup);

    const propObj: DestructiblePropObject = {
      id: `crate_${idx}_${Date.now()}`,
      type: 'crate',
      group: crateGroup,
      position: c.pos.clone(),
      health: 35,
      maxHealth: 35,
      isDestroyed: false,
      boundingRadius: 0.9,
      sector: c.sector,
    };

    destructibleProps.push(propObj);
    colliders.push({
      box: new THREE.Box3().setFromObject(crateGroup),
      type: 'cover',
      entity: propObj,
    });
  });

  return {
    groundMesh,
    colliders,
    barrelObjects,
    destructibleProps,
    enemySpawnPoints,
    playerSpawnPoint,
    propsGroup,
  };
}
