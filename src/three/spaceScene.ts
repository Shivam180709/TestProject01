import * as THREE from 'three';
import { CelestialTarget, SolarSystem, PlanetData } from '../types/simulation';
import { STAR_TREK_SOLAR_SYSTEMS, createPlanetTexture } from './solarSystems';
import { ParticleExplosionManager } from './particleExplosion';

export interface WeaponProjectile {
  mesh: THREE.Mesh;
  prevPosition: THREE.Vector3;
  velocity: THREE.Vector3;
  targetEnemyId: string | null;
  targetStaticPos: THREE.Vector3 | null;
  life: number;
  maxLife: number;
  type: 'torpedo';
}

export interface SpaceEnvironment {
  scene: THREE.Scene;
  starfield: THREE.Points;
  warpTunnel: THREE.LineSegments;
  systems: SolarSystem[];
  planets: PlanetData[];
  targetMeshes: Map<string, THREE.Object3D>;
  explosionManager: ParticleExplosionManager;
  update: (
    delta: number,
    isWarping: boolean,
    warpFactor: number,
    shipPosition: THREE.Vector3,
    onCheckTorpedoHit?: (pos: THREE.Vector3, prevPos: THREE.Vector3) => boolean,
    getLiveTargetPos?: (enemyId?: string | null, currentPos?: THREE.Vector3) => THREE.Vector3 | null
  ) => void;
  firePhasers: (fromLeft: THREE.Vector3, fromRight: THREE.Vector3, targetPos: THREE.Vector3 | null, forwardDir: THREE.Vector3) => void;
  stopPhasers: () => void;
  launchTorpedo: (origin: THREE.Vector3, direction: THREE.Vector3, targetEnemyId?: string | null, targetStaticPos?: THREE.Vector3 | null) => void;
  triggerExplosion: (pos: THREE.Vector3, scale?: number) => void;
  destructTarget: (id: string) => void;
}

export function getSystemStarColor(systemId: string): number {
  if (systemId === 'sol_system') return 0xfef08a;
  if (systemId === 'vulcan_system') return 0xfdba74;
  if (systemId === 'andoria_system') return 0xffffff;
  if (systemId === 'kronos_system' || systemId === 'mempa_system') return 0xef4444;
  if (systemId === 'romulus_system' || systemId === 'krios_system') return 0x34d399;
  if (systemId === 'cardassia_system' || systemId === 'chintoka_system') return 0xf59e0b;
  if (systemId === 'bajor_system' || systemId === 'babel_system') return 0xfef08a;
  if (systemId === 'ferenginar_system' || systemId === 'briar_patch_sector') return 0xfbbf24;
  if (systemId === 'gorn_sector' || systemId === 'bolian_system' || systemId === 'cheron_system') return 0x60a5fa;
  if (systemId === 'mutara_sector' || systemId === 'tholian_sector') return 0xf97316;
  if (systemId === 'idran_system') return 0x818cf8;
  if (systemId === 'omarion_system') return 0xf472b6;
  if (systemId === 'delta_caretaker_system') return 0x06b6d4;
  if (systemId === 'borg_unicomplex_system') return 0x22c55e;
  if (systemId === 'galactic_barrier_sector') return 0xec4899;
  if (systemId === 'deneb_system') return 0xffffff;
  return 0xfde047;
}

export function buildSpaceEnvironment(scene: THREE.Scene): SpaceEnvironment {
  // 1. Ambient & Galactic Illumination
  const spaceAmbient = new THREE.AmbientLight(0x1e293b, 1.8);
  scene.add(spaceAmbient);

  // Key Galaxy Core Sun
  const keySun = new THREE.DirectionalLight(0xfff7ed, 2.5);
  keySun.position.set(2400, 3200, 1800);
  scene.add(keySun);

  // Rim Fill Light
  const fillSun = new THREE.DirectionalLight(0x38bdf8, 1.2);
  fillSun.position.set(-3000, -1500, -2500);
  scene.add(fillSun);

  // Dynamic Primary Stellar Point Light (Smoothly tracks and illuminates whichever star system Enterprise/camera is closest to)
  const localStellarLight = new THREE.PointLight(0xfef08a, 3.4, 8500);
  scene.add(localStellarLight);

  // 2. Vast Deep-Space Starfield (16,000 stars spanning up to 48,000 km)
  const starCount = 16000;
  const starGeo = new THREE.BufferGeometry();
  const starPositions = new Float32Array(starCount * 3);
  const starColors = new Float32Array(starCount * 3);

  const starColorPalette = [
    new THREE.Color(0xffffff), // Pure white
    new THREE.Color(0xdbeafe), // Cool A-type
    new THREE.Color(0x93c5fd), // Blue-white O/B
    new THREE.Color(0xfef08a), // Yellow dwarf G-type
    new THREE.Color(0xfdba74), // Orange K-type
    new THREE.Color(0xfca5a5), // Red M-type
    new THREE.Color(0xc084fc), // Rare ultraviolet flare
  ];

  for (let i = 0; i < starCount; i++) {
    const radius = 2400 + Math.random() * 46000;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 2 - 1);

    starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta) * 0.42; // Galactic disc distribution
    starPositions[i * 3 + 2] = radius * Math.cos(phi);

    const c = starColorPalette[Math.floor(Math.random() * starColorPalette.length)];
    starColors[i * 3] = c.r;
    starColors[i * 3 + 1] = c.g;
    starColors[i * 3 + 2] = c.b;
  }

  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

  const starMat = new THREE.PointsMaterial({
    size: 2.8,
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    sizeAttenuation: true,
  });

  const starfield = new THREE.Points(starGeo, starMat);
  scene.add(starfield);

  // 3. Distant Volumetric Cosmic Gas Clouds (10 Nebulae clusters, 3 lobes each for reduced fillrate)
  const nebulaeColors = [0x9333ea, 0x0284c7, 0xea580c, 0x10b981, 0xec4899, 0x38bdf8, 0xa855f7];
  for (let i = 0; i < 10; i++) {
    const cloudAngle = (i / 10) * Math.PI * 2 + 0.2;
    const cloudDist = 18000 + Math.random() * 26000;
    const cx = Math.cos(cloudAngle) * cloudDist;
    const cy = (Math.random() - 0.5) * 8000;
    const cz = Math.sin(cloudAngle) * cloudDist;

    const cloudGroup = new THREE.Group();
    cloudGroup.position.set(cx, cy, cz);

    const cloudColor = nebulaeColors[i % nebulaeColors.length];
    for (let lobe = 0; lobe < 3; lobe++) {
      const lobeGeo = new THREE.SphereGeometry(2200 + Math.random() * 1600, 12, 12);
      const lobeMat = new THREE.MeshBasicMaterial({
        color: cloudColor,
        transparent: true,
        opacity: 0.04,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
      });
      const lobeMesh = new THREE.Mesh(lobeGeo, lobeMat);
      lobeMesh.position.set(
        (Math.random() - 0.5) * 1400,
        (Math.random() - 0.5) * 1400,
        (Math.random() - 0.5) * 1400
      );
      cloudGroup.add(lobeMesh);
    }
    scene.add(cloudGroup);
  }

  // 4. Relativistic Warp Tunnel / Warp Distortion Streaks
  const warpStreakCount = 340;
  const warpGeo = new THREE.BufferGeometry();
  const warpLinePositions = new Float32Array(warpStreakCount * 6);

  for (let i = 0; i < warpStreakCount; i++) {
    const r = 24 + Math.random() * 120;
    const angle = Math.random() * Math.PI * 2;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    const z = (Math.random() - 0.5) * 900;

    warpLinePositions[i * 6] = x;
    warpLinePositions[i * 6 + 1] = y;
    warpLinePositions[i * 6 + 2] = z;

    warpLinePositions[i * 6 + 3] = x;
    warpLinePositions[i * 6 + 4] = y;
    warpLinePositions[i * 6 + 5] = z - (40 + Math.random() * 160);
  }

  warpGeo.setAttribute('position', new THREE.BufferAttribute(warpLinePositions, 3));
  const warpMat = new THREE.LineBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.0,
    linewidth: 2.2,
  });
  const warpTunnel = new THREE.LineSegments(warpGeo, warpMat);
  scene.add(warpTunnel);

  // 5. Build Primary Stars, Planets, Space Stations, Nebulae & Anomalies across all 23 Systems
  const targetMeshes = new Map<string, THREE.Object3D>();
  const animatedAnomalies: { mesh: THREE.Object3D; speed: number; type: string }[] = [];
  const allPlanets: PlanetData[] = [];

  for (const system of STAR_TREK_SOLAR_SYSTEMS) {
    // 5A. Build Central Primary Star at system.centerCoordinates
    const starColor = getSystemStarColor(system.id);

    const starGroup = new THREE.Group();
    starGroup.position.set(system.centerCoordinates[0], system.centerCoordinates[1], system.centerCoordinates[2]);

    const starRadius = system.spectralType.includes('Supergiant')
      ? 68
      : system.spectralType.includes('Giant')
      ? 58
      : system.spectralType.includes('Dwarf')
      ? 42
      : 50;

    // Star Core (Clean, crisp, radiant primary sun)
    const starCoreGeo = new THREE.SphereGeometry(starRadius, 24, 18);
    const starCoreMat = new THREE.MeshBasicMaterial({
      color: starColor,
    });
    const starCoreMesh = new THREE.Mesh(starCoreGeo, starCoreMat);
    starGroup.add(starCoreMesh);

    // 5A.2. Planetary Orbit Trajectory Guides
    for (const planet of system.planets) {
      if (planet.type === 'moon') continue;
      const dx = planet.position[0] - system.centerCoordinates[0];
      const dz = planet.position[2] - system.centerCoordinates[2];
      const orbitR = Math.hypot(dx, dz);
      if (orbitR > 70) {
        const orbitCurve = new THREE.EllipseCurve(0, 0, orbitR, orbitR, 0, 2 * Math.PI, false, 0);
        const orbitPoints = orbitCurve.getPoints(36);
        const orbitGeo = new THREE.BufferGeometry().setFromPoints(
          orbitPoints.map((pt) => new THREE.Vector3(pt.x, 0, pt.y))
        );
        const orbitMat = new THREE.LineBasicMaterial({
          color: 0x334155,
          transparent: true,
          opacity: 0.35,
          depthWrite: false,
        });
        const orbitLine = new THREE.Line(orbitGeo, orbitMat);
        orbitLine.rotation.x = Math.PI / 2;
        starGroup.add(orbitLine);
      }
    }

    scene.add(starGroup);
    targetMeshes.set(system.id + '_primary_star', starGroup);

    // 5B. Build Planetary Bodies, Stations, Rings, Nebulae & Wormholes (Moons removed for vast open space)
    for (const planet of system.planets) {
      if (planet.type === 'moon') continue;
      allPlanets.push(planet);
      const planetGroup = new THREE.Group();
      planetGroup.position.set(planet.position[0], planet.position[1], planet.position[2]);

      if (planet.type === 'starbase') {
        if (planet.id === 'deep_space_nine') {
          // Authentic Nor-Class Space Station (Deep Space 9 / Terok Nor)
          const hubCore = new THREE.Mesh(
            new THREE.CylinderGeometry(planet.radius * 0.45, planet.radius * 0.45, planet.radius * 1.4, 20),
            new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.3 })
          );
          planetGroup.add(hubCore);

          // Outer Docking Ring
          const outerRing = new THREE.Mesh(
            new THREE.TorusGeometry(planet.radius * 1.7, planet.radius * 0.12, 16, 40),
            new THREE.MeshStandardMaterial({ color: 0x64748b, emissive: 0x0284c7, emissiveIntensity: 0.4 })
          );
          outerRing.rotation.x = Math.PI / 2;
          planetGroup.add(outerRing);

          // Inner Habitat Ring
          const innerRing = new THREE.Mesh(
            new THREE.TorusGeometry(planet.radius * 0.95, planet.radius * 0.1, 16, 32),
            new THREE.MeshStandardMaterial({ color: 0x475569, emissive: 0x38bdf8, emissiveIntensity: 0.6 })
          );
          innerRing.rotation.x = Math.PI / 2;
          planetGroup.add(innerRing);

          // 3 Upper Docking Pylons & 3 Lower Docking Pylons
          for (let pIdx = 0; pIdx < 3; pIdx++) {
            const angle = (pIdx / 3) * Math.PI * 2;

            // Upper pylon
            const upPylon = new THREE.Mesh(
              new THREE.CylinderGeometry(planet.radius * 0.08, planet.radius * 0.06, planet.radius * 1.6, 12),
              new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85 })
            );
            upPylon.position.set(Math.cos(angle) * (planet.radius * 1.35), planet.radius * 0.75, Math.sin(angle) * (planet.radius * 1.35));
            upPylon.rotation.z = Math.cos(angle) * 0.35;
            upPylon.rotation.x = Math.sin(angle) * 0.35;
            planetGroup.add(upPylon);

            // Lower pylon
            const downPylon = upPylon.clone();
            downPylon.position.y = -planet.radius * 0.75;
            downPylon.rotation.z = -Math.cos(angle) * 0.35;
            downPylon.rotation.x = -Math.sin(angle) * 0.35;
            planetGroup.add(downPylon);
          }

          const ds9Beacon = new THREE.Mesh(
            new THREE.SphereGeometry(planet.radius * 0.12, 10, 8),
            new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
          );
          planetGroup.add(ds9Beacon);
        } else if (planet.id.includes('spacedock')) {
          // Iconic Mushroom-Spacedock (Earth Spacedock One & Starbase 74)
          const domeRadius = planet.radius * 1.6;
          const domeGeo = new THREE.SphereGeometry(domeRadius, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.55);
          const domeMat = new THREE.MeshStandardMaterial({
            color: 0x94a3b8,
            metalness: 0.85,
            roughness: 0.25,
          });
          const dome = new THREE.Mesh(domeGeo, domeMat);
          dome.position.y = planet.radius * 0.4;
          planetGroup.add(dome);

          // Lower cylindrical docking column
          const colGeo = new THREE.CylinderGeometry(planet.radius * 0.7, planet.radius * 0.85, planet.radius * 1.8, 20);
          const colMesh = new THREE.Mesh(colGeo, new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 }));
          colMesh.position.y = -planet.radius * 0.7;
          planetGroup.add(colMesh);

          // Internal illuminated docking bay slit
          const gateRingGeo = new THREE.TorusGeometry(planet.radius * 1.25, planet.radius * 0.1, 12, 28);
          const gateRing = new THREE.Mesh(
            gateRingGeo,
            new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
          );
          gateRing.rotation.x = Math.PI / 2;
          gateRing.position.y = planet.radius * 0.2;
          planetGroup.add(gateRing);

          const dockBeacon = new THREE.Mesh(
            new THREE.SphereGeometry(planet.radius * 0.14, 10, 8),
            new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
          );
          dockBeacon.position.y = planet.radius * 1.5;
          planetGroup.add(dockBeacon);
        } else {
          // Standard Starbase Spacedock facility
          const dockHubGeo = new THREE.CylinderGeometry(planet.radius * 0.9, planet.radius * 1.1, planet.radius * 0.6, 16);
          const dockHub = new THREE.Mesh(
            dockHubGeo,
            new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.75, roughness: 0.25 })
          );
          planetGroup.add(dockHub);

          const ringGeo = new THREE.TorusGeometry(planet.radius * 1.5, planet.radius * 0.12, 12, 28);
          const ringMesh = new THREE.Mesh(
            ringGeo,
            new THREE.MeshStandardMaterial({ color: 0x0284c7, emissive: 0x38bdf8, emissiveIntensity: 0.9 })
          );
          ringMesh.rotation.x = Math.PI / 2;
          planetGroup.add(ringMesh);

          const spire = new THREE.Mesh(
            new THREE.CylinderGeometry(planet.radius * 0.1, planet.radius * 0.04, planet.radius * 2.2, 12),
            new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9 })
          );
          spire.position.y = -planet.radius * 1.1;
          planetGroup.add(spire);

          const beacon = new THREE.Mesh(
            new THREE.SphereGeometry(planet.radius * 0.12, 10, 8),
            new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
          );
          beacon.position.y = planet.radius * 0.9;
          planetGroup.add(beacon);
        }
      } else if (planet.type === 'wormhole') {
        // The Celestial Temple / Bajoran Wormhole to the Gamma Quadrant
        const discRadius = planet.radius * 2.2;
        const outerDiscGeo = new THREE.RingGeometry(planet.radius * 0.4, discRadius, 36);
        const outerDiscMat = new THREE.MeshBasicMaterial({
          color: 0xa855f7,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.75,
          blending: THREE.AdditiveBlending,
        });
        const outerDisc = new THREE.Mesh(outerDiscGeo, outerDiscMat);
        outerDisc.rotation.x = Math.PI * 0.45;
        planetGroup.add(outerDisc);

        const innerDiscGeo = new THREE.RingGeometry(planet.radius * 0.1, planet.radius * 1.2, 28);
        const innerDiscMat = new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.9,
          blending: THREE.AdditiveBlending,
        });
        const innerDisc = new THREE.Mesh(innerDiscGeo, innerDiscMat);
        innerDisc.rotation.x = Math.PI * 0.45;
        planetGroup.add(innerDisc);

        const coreFlareGeo = new THREE.SphereGeometry(planet.radius * 0.5, 16, 16);
        const coreFlare = new THREE.Mesh(coreFlareGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
        planetGroup.add(coreFlare);

        animatedAnomalies.push({ mesh: outerDisc, speed: 0.8, type: 'wormhole_outer' });
        animatedAnomalies.push({ mesh: innerDisc, speed: -1.2, type: 'wormhole_inner' });
      } else if (planet.type === 'nebula') {
        // Volumetric Gas Nebula Cloud (Mutara / Badlands / Briar Patch)
        const cloudRadius = planet.radius * 1.8;
        const nebColor = new THREE.Color(planet.textureColor || '#9333ea');

        for (let lobe = 0; lobe < 4; lobe++) {
          const lGeo = new THREE.SphereGeometry(cloudRadius * (0.6 + (lobe % 3) * 0.25), 14, 12);
          const lMat = new THREE.MeshBasicMaterial({
            color: nebColor,
            transparent: true,
            opacity: 0.22,
            blending: THREE.AdditiveBlending,
            side: THREE.BackSide,
          });
          const lMesh = new THREE.Mesh(lGeo, lMat);
          lMesh.position.set(
            (Math.random() - 0.5) * (cloudRadius * 0.7),
            (Math.random() - 0.5) * (cloudRadius * 0.7),
            (Math.random() - 0.5) * (cloudRadius * 0.7)
          );
          planetGroup.add(lMesh);
        }

        // Particle Ion Dust Swarm
        const partCount = 100;
        const partGeo = new THREE.BufferGeometry();
        const partPos = new Float32Array(partCount * 3);
        for (let pIdx = 0; pIdx < partCount; pIdx++) {
          partPos[pIdx * 3] = (Math.random() - 0.5) * cloudRadius * 2.4;
          partPos[pIdx * 3 + 1] = (Math.random() - 0.5) * cloudRadius * 2.4;
          partPos[pIdx * 3 + 2] = (Math.random() - 0.5) * cloudRadius * 2.4;
        }
        partGeo.setAttribute('position', new THREE.BufferAttribute(partPos, 3));
        const partMat = new THREE.PointsMaterial({
          color: planet.atmosphereColor ? new THREE.Color(planet.atmosphereColor) : nebColor,
          size: 4.5,
          transparent: true,
          opacity: 0.85,
          blending: THREE.AdditiveBlending,
        });
        const particles = new THREE.Points(partGeo, partMat);
        planetGroup.add(particles);

        animatedAnomalies.push({ mesh: planetGroup, speed: 0.05, type: 'nebula' });
      } else if (planet.id === 'caretaker_array') {
        // The Caretaker Array Megastructure (Nacene Displacement Emitter)
        const coreGeo = new THREE.CylinderGeometry(planet.radius * 0.4, planet.radius * 0.6, planet.radius * 1.5, 16);
        const coreMat = new THREE.MeshStandardMaterial({ color: 0x0891b2, metalness: 0.85, roughness: 0.2 });
        const coreMesh = new THREE.Mesh(coreGeo, coreMat);
        planetGroup.add(coreMesh);

        // 3 Radial Collector Pylons
        for (let a = 0; a < 3; a++) {
          const ang = (a / 3) * Math.PI * 2;
          const armGeo = new THREE.BoxGeometry(planet.radius * 1.4, planet.radius * 0.15, planet.radius * 0.25);
          const armMat = new THREE.MeshStandardMaterial({ color: 0x0e7490, metalness: 0.8 });
          const arm = new THREE.Mesh(armGeo, armMat);
          arm.position.set(Math.cos(ang) * planet.radius * 0.7, 0, Math.sin(ang) * planet.radius * 0.7);
          arm.rotation.y = ang;
          planetGroup.add(arm);
        }

        // Tetryon Displacement Emitter Ring
        const ringGeo = new THREE.TorusGeometry(planet.radius * 1.2, planet.radius * 0.08, 12, 32);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = Math.PI / 2;
        planetGroup.add(ringMesh);

        const emitterBeacon = new THREE.Mesh(
          new THREE.SphereGeometry(planet.radius * 0.18, 10, 8),
          new THREE.MeshBasicMaterial({ color: 0x22d3ee })
        );
        planetGroup.add(emitterBeacon);
      } else if (planet.id === 'borg_unicomplex') {
        // Borg Unicomplex Central Node: Cluster of Cybernetic Cubes & Green Conduits
        for (let c = 0; c < 5; c++) {
          const cSize = planet.radius * (0.35 + (c % 3) * 0.15);
          const cGeo = new THREE.BoxGeometry(cSize, cSize, cSize);
          const cMat = new THREE.MeshStandardMaterial({
            color: 0x0f172a,
            metalness: 0.9,
            roughness: 0.35,
          });
          const cMesh = new THREE.Mesh(cGeo, cMat);
          const ang = (c / 5) * Math.PI * 2;
          const dist = (c === 0 ? 0 : planet.radius * 0.65);
          cMesh.position.set(Math.cos(ang) * dist, ((c % 3) - 1) * planet.radius * 0.3, Math.sin(ang) * dist);
          planetGroup.add(cMesh);
        }

        // Borg Green Shield Grid Shell
        const shieldGeo = new THREE.SphereGeometry(planet.radius * 1.15, 18, 14);
        const shieldMat = new THREE.MeshBasicMaterial({
          color: 0x22c55e,
          wireframe: true,
          transparent: true,
          opacity: 0.45,
        });
        const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
        planetGroup.add(shieldMesh);
      } else if (planet.id === 'galactic_barrier_rift') {
        // The Great Galactic Barrier: Shimmering Energetic Tachyon Veil
        const veilGeo = new THREE.CylinderGeometry(planet.radius * 1.5, planet.radius * 1.8, planet.radius * 2.5, 24, 1, true);
        const veilMat = new THREE.MeshBasicMaterial({
          color: 0xec4899,
          transparent: true,
          opacity: 0.45,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
        });
        const veilMesh = new THREE.Mesh(veilGeo, veilMat);
        veilMesh.rotation.z = Math.PI / 4;
        planetGroup.add(veilMesh);
      } else {
        // Natural Planet Sphere
        const tex = createPlanetTexture(planet.type, planet.textureColor);
        const isGasGiant = planet.type === 'gas_giant';
        const sphereGeo = new THREE.SphereGeometry(planet.radius, isGasGiant ? 32 : 26, isGasGiant ? 24 : 18);
        const sphereMat = new THREE.MeshStandardMaterial({
          map: tex,
          roughness: isGasGiant ? 0.9 : planet.type === 'ocean' ? 0.3 : 0.6,
          metalness: planet.type === 'ocean' ? 0.25 : 0.12,
        });
        const sphere = new THREE.Mesh(sphereGeo, sphereMat);
        planetGroup.add(sphere);

        // Planetary Rings if applicable (e.g. Saturn, Ka'Thelan, Praxis, Ba'ku)
        if (planet.hasRings && planet.ringInner && planet.ringOuter) {
          const ringGeo = new THREE.RingGeometry(planet.ringInner, planet.ringOuter, 40);
          const ringMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(planet.ringColor || '#fed7aa'),
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.72,
            roughness: 0.8,
          });
          const ring = new THREE.Mesh(ringGeo, ringMat);
          ring.rotation.x = Math.PI * 0.42;
          ring.rotation.y = Math.PI * 0.12;
          planetGroup.add(ring);
        }
      }

      scene.add(planetGroup);
      targetMeshes.set(planet.id, planetGroup);
    }
  }

  // 6. Tactical Asteroids for Target Practice & Combat Drill
  const asteroidId = 'asteroid_target_alpha';
  const astGroup = new THREE.Group();
  astGroup.position.set(-180, 45, -340);

  const rockGeo = new THREE.DodecahedronGeometry(22, 2);
  const posAttr = rockGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i);
    const vy = posAttr.getY(i);
    const vz = posAttr.getZ(i);
    const noise = 1 + (Math.sin(vx * 0.35) + Math.cos(vy * 0.35)) * 0.15;
    posAttr.setXYZ(i, vx * noise, vy * noise, vz * noise);
  }
  rockGeo.computeVertexNormals();

  const rockMesh = new THREE.Mesh(
    rockGeo,
    new THREE.MeshStandardMaterial({
      color: 0x71717a,
      roughness: 0.95,
      metalness: 0.2,
    })
  );
  astGroup.add(rockMesh);
  scene.add(astGroup);
  targetMeshes.set(asteroidId, astGroup);

  // 7. Particle Explosion System
  const explosionManager = new ParticleExplosionManager(scene);

  // 8. Weapons: Phaser Beams
  const phaserLineMat = new THREE.LineBasicMaterial({
    color: 0xf97316,
    linewidth: 4,
    transparent: true,
    opacity: 0.0,
  });

  const phaserLeftGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const phaserRightGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);

  const phaserLeftBeam = new THREE.Line(phaserLeftGeo, phaserLineMat.clone());
  const phaserRightBeam = new THREE.Line(phaserRightGeo, phaserLineMat.clone());

  scene.add(phaserLeftBeam);
  scene.add(phaserRightBeam);

  const phaserImpactGeo = new THREE.SphereGeometry(2.0, 16, 16);
  const phaserImpactMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
  const phaserImpact = new THREE.Mesh(phaserImpactGeo, phaserImpactMat);
  phaserImpact.visible = false;
  scene.add(phaserImpact);

  // 9. Weapons: Photon Torpedo Projectiles
  const sharedTorpedoGeo = new THREE.SphereGeometry(1.2, 10, 10);
  const sharedTorpedoMat = new THREE.MeshBasicMaterial({ color: 0xff3300 });
  const projectiles: WeaponProjectile[] = [];

  const launchTorpedo = (
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    targetEnemyId?: string | null,
    targetStaticPos?: THREE.Vector3 | null
  ) => {
    const torpedoMesh = new THREE.Mesh(sharedTorpedoGeo, sharedTorpedoMat);
    torpedoMesh.position.copy(origin);
    scene.add(torpedoMesh);

    const forward = direction.clone().normalize();
    projectiles.push({
      mesh: torpedoMesh,
      prevPosition: origin.clone(),
      velocity: forward.multiplyScalar(280),
      targetEnemyId: targetEnemyId || null,
      targetStaticPos: targetStaticPos ? targetStaticPos.clone() : null,
      life: 0,
      maxLife: 4.5,
      type: 'torpedo',
    });
  };

  const triggerExplosion = (pos: THREE.Vector3, scale: number = 1.0) => {
    explosionManager.triggerExplosion(pos, scale);
  };

  const firePhasers = (
    fromLeft: THREE.Vector3,
    fromRight: THREE.Vector3,
    targetPos: THREE.Vector3 | null,
    forwardDir: THREE.Vector3
  ) => {
    const end = targetPos
      ? targetPos.clone()
      : fromLeft.clone().add(forwardDir.clone().normalize().multiplyScalar(400));

    phaserLeftGeo.setFromPoints([fromLeft, end]);
    phaserRightGeo.setFromPoints([fromRight, end]);

    (phaserLeftBeam.material as THREE.LineBasicMaterial).opacity = 0.95;
    (phaserRightBeam.material as THREE.LineBasicMaterial).opacity = 0.95;

    if (targetPos) {
      phaserImpact.visible = true;
      phaserImpact.position.copy(targetPos);
      phaserImpact.scale.setScalar(1 + Math.random() * 0.8);
      if (Math.random() > 0.6) {
        explosionManager.triggerExplosion(targetPos, 0.4);
      }
    }
  };

  const stopPhasers = () => {
    (phaserLeftBeam.material as THREE.LineBasicMaterial).opacity = 0.0;
    (phaserRightBeam.material as THREE.LineBasicMaterial).opacity = 0.0;
    phaserImpact.visible = false;
  };

  const destructTarget = (id: string) => {
    const obj = targetMeshes.get(id);
    if (obj) {
      triggerExplosion(obj.position, 2.5);
      obj.scale.multiplyScalar(0.7);
    }
  };

  // Main Tick
  const update = (
    delta: number,
    isWarping: boolean,
    warpFactor: number,
    shipPosition: THREE.Vector3,
    onCheckTorpedoHit?: (pos: THREE.Vector3, prevPos: THREE.Vector3) => boolean,
    getLiveTargetPos?: (enemyId?: string | null, currentPos?: THREE.Vector3) => THREE.Vector3 | null
  ) => {
    // Dynamically position primary stellar light at closest star system to ship
    const sx = shipPosition.x;
    const sy = shipPosition.y;
    const sz = shipPosition.z;
    let closestSystem = STAR_TREK_SOLAR_SYSTEMS[0];
    let minSq = Infinity;
    for (let sIdx = 0; sIdx < STAR_TREK_SOLAR_SYSTEMS.length; sIdx++) {
      const sys = STAR_TREK_SOLAR_SYSTEMS[sIdx];
      const dx = sys.centerCoordinates[0] - sx;
      const dy = sys.centerCoordinates[1] - sy;
      const dz = sys.centerCoordinates[2] - sz;
      const dSq = dx * dx + dy * dy + dz * dz;
      if (dSq < minSq) {
        minSq = dSq;
        closestSystem = sys;
      }
    }
    localStellarLight.position.set(
      closestSystem.centerCoordinates[0],
      closestSystem.centerCoordinates[1],
      closestSystem.centerCoordinates[2]
    );
    localStellarLight.color.setHex(getSystemStarColor(closestSystem.id));
    const distToStar = Math.sqrt(minSq);
    localStellarLight.intensity = distToStar < 4500 ? 3.4 : Math.max(1.2, 3.4 * (1 - (distToStar - 4500) / 25000));

    // Rotate nearby celestial bodies gently (within 9000 units of ship)
    for (const [, mesh] of targetMeshes) {
      const dx = mesh.position.x - sx;
      const dz = mesh.position.z - sz;
      if (dx * dx + dz * dz < 81000000) {
        mesh.rotation.y += delta * 0.012;
      }
    }

    // Animate wormholes and nebulae
    for (const anom of animatedAnomalies) {
      if (anom.type === 'wormhole_outer' || anom.type === 'wormhole_inner') {
        anom.mesh.rotation.z += delta * anom.speed;
      } else if (anom.type === 'corona') {
        anom.mesh.rotation.y += delta * anom.speed;
      }
    }

    // Warp Streaks Animation
    if (isWarping) {
      const warpSpeedMult = Math.min(warpFactor * 1.5, 14);
      warpMat.opacity = THREE.MathUtils.lerp(warpMat.opacity, 0.88, delta * 4);
      warpTunnel.position.copy(shipPosition);

      const posAttr = warpGeo.attributes.position;
      for (let i = 0; i < warpStreakCount; i++) {
        let z1 = posAttr.getZ(i * 2);
        let z2 = posAttr.getZ(i * 2 + 1);

        z1 += delta * 520 * warpSpeedMult;
        z2 += delta * 520 * warpSpeedMult;

        if (z1 > 350) {
          z1 -= 800;
          z2 -= 800;
        }

        posAttr.setZ(i * 2, z1);
        posAttr.setZ(i * 2 + 1, z2);
      }
      posAttr.needsUpdate = true;
    } else {
      warpMat.opacity = THREE.MathUtils.lerp(warpMat.opacity, 0.0, delta * 6);
    }

    // Update active torpedoes & collision detection
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      p.life += delta;

      const prevPos = p.prevPosition.clone();
      p.prevPosition.copy(p.mesh.position);

      if (getLiveTargetPos) {
        const livePos = getLiveTargetPos(p.targetEnemyId, p.mesh.position);
        if (livePos) {
          const toTarget = livePos.clone().sub(p.mesh.position).normalize();
          p.velocity.lerp(toTarget.multiplyScalar(320), delta * 7.5);
        } else if (p.targetStaticPos) {
          const toTarget = p.targetStaticPos.clone().sub(p.mesh.position).normalize();
          p.velocity.lerp(toTarget.multiplyScalar(280), delta * 5.0);
        }
      } else if (p.targetStaticPos) {
        const toTarget = p.targetStaticPos.clone().sub(p.mesh.position).normalize();
        p.velocity.lerp(toTarget.multiplyScalar(280), delta * 4.5);
      }

      p.mesh.position.addScaledVector(p.velocity, delta);

      // Check hit on enemy ships
      if (onCheckTorpedoHit && onCheckTorpedoHit(p.mesh.position, prevPos)) {
        scene.remove(p.mesh);
        projectiles.splice(i, 1);
        continue;
      }

      // Check collision with nearby celestial target meshes (< 600 km)
      let collided = false;
      const px = p.mesh.position.x;
      const py = p.mesh.position.y;
      const pz = p.mesh.position.z;
      for (const [id, tMesh] of targetMeshes) {
        const dx = tMesh.position.x - px;
        const dy = tMesh.position.y - py;
        const dz = tMesh.position.z - pz;
        const dSq = dx * dx + dy * dy + dz * dz;
        if (dSq > 360000) continue; // 600^2

        const dist = Math.sqrt(dSq);
        const radius = id.startsWith('sol_earth') || id.includes('giant') ? 55 : 28;

        if (dist < radius) {
          triggerExplosion(p.mesh.position, 1.8);
          scene.remove(p.mesh);
          projectiles.splice(i, 1);
          collided = true;
          break;
        }
      }

      if (!collided && p.life >= p.maxLife) {
        scene.remove(p.mesh);
        projectiles.splice(i, 1);
      }
    }

    // Update particle explosions
    explosionManager.update(delta);
  };

  return {
    scene,
    starfield,
    warpTunnel,
    systems: STAR_TREK_SOLAR_SYSTEMS,
    planets: allPlanets,
    targetMeshes,
    explosionManager,
    update,
    firePhasers,
    stopPhasers,
    launchTorpedo,
    triggerExplosion,
    destructTarget,
  };
}
