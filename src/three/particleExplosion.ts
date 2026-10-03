import * as THREE from 'three';

export interface ExplosionInstance {
  group: THREE.Group;
  sparks: THREE.Points;
  sparkVelocities: Float32Array;
  debris: THREE.Points;
  debrisVelocities: Float32Array;
  shockwave: THREE.Mesh;
  coreFlash: THREE.Mesh;
  age: number;
  maxAge: number;
}

export class ParticleExplosionManager {
  private scene: THREE.Scene;
  private explosions: ExplosionInstance[] = [];
  private lastExplosionTime: number = 0;
  private maxActiveExplosions = 5;

  // Shared reusable geometries and materials for instant zero-allocation performance
  private flashGeo = new THREE.SphereGeometry(1.0, 12, 10);
  private shockGeo = new THREE.RingGeometry(0.8, 3.2, 24);
  private sparkMat = new THREE.PointsMaterial({
    size: 3.5,
    vertexColors: true,
    transparent: true,
    opacity: 1.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  private debrisMat = new THREE.PointsMaterial({
    size: 4.0,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });
  private shockMat = new THREE.MeshBasicMaterial({
    color: 0xff6600,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  private flashMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 1.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public triggerExplosion(position: THREE.Vector3, scale: number = 1.0) {
    const now = performance.now();
    // Throttle explosions to prevent stacking massive particle bursts
    if (now - this.lastExplosionTime < 65 && this.explosions.length >= 2) {
      return;
    }
    this.lastExplosionTime = now;

    // Prune oldest if at maximum active explosions
    if (this.explosions.length >= this.maxActiveExplosions) {
      const oldest = this.explosions.shift()!;
      this.scene.remove(oldest.group);
      oldest.sparks.geometry.dispose();
      oldest.debris.geometry.dispose();
    }

    const group = new THREE.Group();
    group.position.copy(position);

    // 1. Core Plasma Flash (expanding additive glow sphere)
    const coreFlash = new THREE.Mesh(this.flashGeo, this.flashMat.clone());
    coreFlash.scale.setScalar(3.2 * scale);
    group.add(coreFlash);

    // 2. Fiery Shockwave Ring
    const shockwave = new THREE.Mesh(this.shockGeo, this.shockMat.clone());
    shockwave.scale.setScalar(scale);
    shockwave.rotation.x = Math.random() * Math.PI;
    shockwave.rotation.y = Math.random() * Math.PI;
    group.add(shockwave);

    // 3. High-velocity Sparks (optimized to 60 bright particles)
    const sparkCount = 60;
    const sparkGeo = new THREE.BufferGeometry();
    const sparkPositions = new Float32Array(sparkCount * 3);
    const sparkVelocities = new Float32Array(sparkCount * 3);
    const sparkColors = new Float32Array(sparkCount * 3);

    for (let i = 0; i < sparkCount; i++) {
      sparkPositions[i * 3] = 0;
      sparkPositions[i * 3 + 1] = 0;
      sparkPositions[i * 3 + 2] = 0;

      const speed = (28 + Math.random() * 52) * scale;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      sparkVelocities[i * 3] = speed * Math.sin(phi) * Math.cos(theta);
      sparkVelocities[i * 3 + 1] = speed * Math.sin(phi) * Math.sin(theta);
      sparkVelocities[i * 3 + 2] = speed * Math.cos(phi);

      const isHot = Math.random() > 0.35;
      sparkColors[i * 3] = 1.0;
      sparkColors[i * 3 + 1] = isHot ? 0.85 : 0.45;
      sparkColors[i * 3 + 2] = isHot ? 0.25 : 0.08;
    }

    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
    sparkGeo.setAttribute('color', new THREE.BufferAttribute(sparkColors, 3));
    const sparks = new THREE.Points(sparkGeo, this.sparkMat);
    group.add(sparks);

    // 4. Secondary Hull Debris Particles (optimized to 25 particles)
    const debrisCount = 25;
    const debrisGeo = new THREE.BufferGeometry();
    const debrisPositions = new Float32Array(debrisCount * 3);
    const debrisVelocities = new Float32Array(debrisCount * 3);
    const debrisColors = new Float32Array(debrisCount * 3);

    for (let i = 0; i < debrisCount; i++) {
      debrisPositions[i * 3] = (Math.random() - 0.5) * 2;
      debrisPositions[i * 3 + 1] = (Math.random() - 0.5) * 2;
      debrisPositions[i * 3 + 2] = (Math.random() - 0.5) * 2;

      const speed = (12 + Math.random() * 24) * scale;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      debrisVelocities[i * 3] = speed * Math.sin(phi) * Math.cos(theta);
      debrisVelocities[i * 3 + 1] = speed * Math.sin(phi) * Math.sin(theta);
      debrisVelocities[i * 3 + 2] = speed * Math.cos(phi);

      debrisColors[i * 3] = 0.9;
      debrisColors[i * 3 + 1] = 0.35;
      debrisColors[i * 3 + 2] = 0.12;
    }

    debrisGeo.setAttribute('position', new THREE.BufferAttribute(debrisPositions, 3));
    debrisGeo.setAttribute('color', new THREE.BufferAttribute(debrisColors, 3));
    const debris = new THREE.Points(debrisGeo, this.debrisMat);
    group.add(debris);

    this.scene.add(group);

    this.explosions.push({
      group,
      sparks,
      sparkVelocities,
      debris,
      debrisVelocities,
      shockwave,
      coreFlash,
      age: 0,
      maxAge: 1.2,
    });
  }

  public update(delta: number) {
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const exp = this.explosions[i];
      exp.age += delta;
      const progress = exp.age / exp.maxAge;

      if (progress >= 1.0) {
        this.scene.remove(exp.group);
        exp.sparks.geometry.dispose();
        exp.debris.geometry.dispose();
        (exp.coreFlash.material as THREE.Material).dispose();
        (exp.shockwave.material as THREE.Material).dispose();
        this.explosions.splice(i, 1);
        continue;
      }

      // 1. Expand core flash rapidly and fade out in first 0.25s
      if (exp.age < 0.25) {
        const flashScale = 1.0 + exp.age * 18;
        exp.coreFlash.scale.setScalar(flashScale);
        (exp.coreFlash.material as THREE.MeshBasicMaterial).opacity = 1.0 - exp.age / 0.25;
      } else {
        exp.coreFlash.visible = false;
      }

      // 2. Expand shockwave ring
      const shockScale = 1.0 + exp.age * 30;
      exp.shockwave.scale.setScalar(shockScale);
      (exp.shockwave.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (1.0 - progress) * 0.85);

      // 3. Move Sparks outward
      const sparkPos = exp.sparks.geometry.attributes.position;
      for (let k = 0; k < sparkPos.count; k++) {
        exp.sparkVelocities[k * 3] *= 0.96;
        exp.sparkVelocities[k * 3 + 1] *= 0.96;
        exp.sparkVelocities[k * 3 + 2] *= 0.96;

        sparkPos.setXYZ(
          k,
          sparkPos.getX(k) + exp.sparkVelocities[k * 3] * delta,
          sparkPos.getY(k) + exp.sparkVelocities[k * 3 + 1] * delta,
          sparkPos.getZ(k) + exp.sparkVelocities[k * 3 + 2] * delta
        );
      }
      sparkPos.needsUpdate = true;

      // 4. Move Debris
      const debrisPos = exp.debris.geometry.attributes.position;
      for (let m = 0; m < debrisPos.count; m++) {
        exp.debrisVelocities[m * 3] *= 0.97;
        exp.debrisVelocities[m * 3 + 1] *= 0.97;
        exp.debrisVelocities[m * 3 + 2] *= 0.97;

        debrisPos.setXYZ(
          m,
          debrisPos.getX(m) + exp.debrisVelocities[m * 3] * delta,
          debrisPos.getY(m) + exp.debrisVelocities[m * 3 + 1] * delta,
          debrisPos.getZ(m) + exp.debrisVelocities[m * 3 + 2] * delta
        );
      }
      debrisPos.needsUpdate = true;
    }
  }

  public dispose() {
    for (const exp of this.explosions) {
      this.scene.remove(exp.group);
      exp.sparks.geometry.dispose();
      exp.debris.geometry.dispose();
      (exp.coreFlash.material as THREE.Material).dispose();
      (exp.shockwave.material as THREE.Material).dispose();
    }
    this.explosions = [];
    this.flashGeo.dispose();
    this.shockGeo.dispose();
    this.sparkMat.dispose();
    this.debrisMat.dispose();
    this.shockMat.dispose();
    this.flashMat.dispose();
  }
}
