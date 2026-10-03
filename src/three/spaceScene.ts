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
    getLiveTargetPos?: (enemyId: string) => THREE.Vector3 | null
  ) => void;
  firePhasers: (fromLeft: THREE.Vector3, fromRight: THREE.Vector3, targetPos: THREE.Vector3 | null, forwardDir: THREE.Vector3) => void;
  stopPhasers: () => void;
  launchTorpedo: (origin: THREE.Vector3, direction: THREE.Vector3, targetEnemyId?: string | null, targetStaticPos?: THREE.Vector3 | null) => void;
  triggerExplosion: (pos: THREE.Vector3, scale?: number) => void;
  destructTarget: (id: string) => void;
}

export function buildSpaceEnvironment(scene: THREE.Scene): SpaceEnvironment {
  // 1. Ambient & Lighting
  const spaceAmbient = new THREE.AmbientLight(0x1e293b, 1.4);
  scene.add(spaceAmbient);

  // Key Star Light
  const keySun = new THREE.DirectionalLight(0xfff7ed, 2.6);
  keySun.position.set(600, 450, 700);
  scene.add(keySun);

  const fillSun = new THREE.DirectionalLight(0x38bdf8, 1.2);
  fillSun.position.set(-600, -300, -500);
  scene.add(fillSun);

  // 2. High-density Starfield (5,000 stars distributed throughout quadrant)
  const starCount = 5000;
  const starGeo = new THREE.BufferGeometry();
  const starPositions = new Float32Array(starCount * 3);
  const starColors = new Float32Array(starCount * 3);

  const starColorPalette = [
    new THREE.Color(0xffffff),
    new THREE.Color(0x93c5fd),
    new THREE.Color(0xfde68a),
    new THREE.Color(0xfca5a5),
    new THREE.Color(0xc084fc),
  ];

  for (let i = 0; i < starCount; i++) {
    const radius = 1200 + Math.random() * 6000;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 2 - 1);

    starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    starPositions[i * 3 + 2] = radius * Math.cos(phi);

    const c = starColorPalette[Math.floor(Math.random() * starColorPalette.length)];
    starColors[i * 3] = c.r;
    starColors[i * 3 + 1] = c.g;
    starColors[i * 3 + 2] = c.b;
  }

  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

  const starMat = new THREE.PointsMaterial({
    size: 2.4,
    vertexColors: true,
    transparent: true,
    opacity: 0.92,
  });

  const starfield = new THREE.Points(starGeo, starMat);
  scene.add(starfield);

  // 3. Relativistic Warp Streaks / Warp Distortion Tunnel
  const warpStreakCount = 280;
  const warpGeo = new THREE.BufferGeometry();
  const warpLinePositions = new Float32Array(warpStreakCount * 6);

  for (let i = 0; i < warpStreakCount; i++) {
    const r = 24 + Math.random() * 110;
    const angle = Math.random() * Math.PI * 2;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    const z = (Math.random() - 0.5) * 800;

    warpLinePositions[i * 6] = x;
    warpLinePositions[i * 6 + 1] = y;
    warpLinePositions[i * 6 + 2] = z;

    warpLinePositions[i * 6 + 3] = x;
    warpLinePositions[i * 6 + 4] = y;
    warpLinePositions[i * 6 + 5] = z - (30 + Math.random() * 120);
  }

  warpGeo.setAttribute('position', new THREE.BufferAttribute(warpLinePositions, 3));
  const warpMat = new THREE.LineBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.0,
    linewidth: 2,
  });
  const warpTunnel = new THREE.LineSegments(warpGeo, warpMat);
  scene.add(warpTunnel);

  // 4. Build All Planets & Celestial Objects across all Solar Systems
  const targetMeshes = new Map<string, THREE.Object3D>();
  const allPlanets: PlanetData[] = [];

  for (const system of STAR_TREK_SOLAR_SYSTEMS) {
    for (const planet of system.planets) {
      allPlanets.push(planet);
      const planetGroup = new THREE.Group();
      planetGroup.position.set(planet.position[0], planet.position[1], planet.position[2]);

      if (planet.type === 'starbase') {
        // High-detail Starbase Spacedock facility
        const dockHubGeo = new THREE.CylinderGeometry(planet.radius * 0.9, planet.radius * 1.1, planet.radius * 0.6, 16);
        const dockHub = new THREE.Mesh(
          dockHubGeo,
          new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.75, roughness: 0.25 })
        );
        planetGroup.add(dockHub);

        // Circular docking bay ring
        const ringGeo = new THREE.TorusGeometry(planet.radius * 1.5, planet.radius * 0.12, 16, 32);
        const ringMesh = new THREE.Mesh(
          ringGeo,
          new THREE.MeshStandardMaterial({ color: 0x0284c7, emissive: 0x38bdf8, emissiveIntensity: 0.9 })
        );
        ringMesh.rotation.x = Math.PI / 2;
        planetGroup.add(ringMesh);

        // Antenna Spire
        const spire = new THREE.Mesh(
          new THREE.CylinderGeometry(planet.radius * 0.1, planet.radius * 0.04, planet.radius * 2.2, 16),
          new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9 })
        );
        spire.position.y = -planet.radius * 1.1;
        planetGroup.add(spire);

        const beacon = new THREE.PointLight(0x38bdf8, 2.2, planet.radius * 5);
        planetGroup.add(beacon);
      } else {
        // Natural Planet Sphere
        const tex = createPlanetTexture(planet.type, planet.textureColor);
        const sphereGeo = new THREE.SphereGeometry(planet.radius, 48, 36);
        const sphereMat = new THREE.MeshStandardMaterial({
          map: tex,
          roughness: planet.type === 'gas_giant' ? 0.9 : 0.6,
          metalness: 0.15,
        });
        const sphere = new THREE.Mesh(sphereGeo, sphereMat);
        planetGroup.add(sphere);

        // Atmospheric Glow Shell if applicable
        if (planet.atmosphereColor) {
          const atmoGeo = new THREE.SphereGeometry(planet.radius * 1.05, 32, 24);
          const atmoMat = new THREE.MeshBasicMaterial({
            color: new THREE.Color(planet.atmosphereColor),
            transparent: true,
            opacity: 0.22,
            side: THREE.BackSide,
          });
          const atmo = new THREE.Mesh(atmoGeo, atmoMat);
          planetGroup.add(atmo);
        }

        // Planetary Rings if applicable (e.g. Saturn, Ka'Thelan, Praxis)
        if (planet.hasRings && planet.ringInner && planet.ringOuter) {
          const ringGeo = new THREE.RingGeometry(planet.ringInner, planet.ringOuter, 64);
          const ringMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(planet.ringColor || '#fed7aa'),
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.7,
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

  // 5. Tactical Asteroids for Target Practice
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

  // 6. Particle Explosion System
  const explosionManager = new ParticleExplosionManager(scene);

  // 7. Weapons: Phaser Beams
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

  // 8. Weapons: Photon Torpedo Projectiles (Shared geometries, no dynamic point lights)
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
      // Small sparks on continuous phaser hit
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
    getLiveTargetPos?: (enemyId: string) => THREE.Vector3 | null
  ) => {
    // Rotate celestial bodies gently
    for (const [, mesh] of targetMeshes) {
      mesh.rotation.y += delta * 0.015;
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

      // LIVE Dynamic homing tracking the target enemy ship!
      if (p.targetEnemyId && getLiveTargetPos) {
        const livePos = getLiveTargetPos(p.targetEnemyId);
        if (livePos) {
          const toTarget = livePos.clone().sub(p.mesh.position).normalize();
          p.velocity.lerp(toTarget.multiplyScalar(300), delta * 6.5);
        }
      } else if (p.targetStaticPos) {
        const toTarget = p.targetStaticPos.clone().sub(p.mesh.position).normalize();
        p.velocity.lerp(toTarget.multiplyScalar(280), delta * 4.5);
      }

      p.mesh.position.addScaledVector(p.velocity, delta);

      // Check hit on enemy ships via swept continuous collision detection
      if (onCheckTorpedoHit && onCheckTorpedoHit(p.mesh.position, prevPos)) {
        scene.remove(p.mesh);
        projectiles.splice(i, 1);
        continue;
      }

      // Check collision with all celestial target meshes (planets, asteroids, starbases)
      let collided = false;
      for (const [id, tMesh] of targetMeshes) {
        // Radius based collision
        const dist = p.mesh.position.distanceTo(tMesh.position);
        const radius = id.startsWith('sol_earth') || id.includes('giant') ? 55 : 28;

        if (dist < radius) {
          // Epic particle explosion!
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
