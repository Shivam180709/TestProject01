import * as THREE from 'three';
import { EnemyShipState, EnemyFaction, CombatWaveState, AdaptiveCombatMetrics, PlayerProgression } from '../types/simulation';
import { ParticleExplosionManager } from './particleExplosion';
import { soundEffects } from '../audio/soundEffects';

export interface EnemyProjectile {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  damage: number;
  life: number;
  maxLife: number;
  isTorpedo?: boolean;
}

export class EnemyShip {
  public id: string;
  public name: string;
  public faction: EnemyFaction;
  public shipClass: string;
  public isMothership: boolean;
  public mesh: THREE.Group;
  public shieldPercent: number = 100;
  public hullPercent: number = 100;
  public maxShield: number = 100;
  public maxHull: number = 100;
  public isAlive: boolean = true;
  public state: 'patrol' | 'engaging' | 'evading' = 'patrol';

  // AI & flight dynamics
  public velocity: THREE.Vector3 = new THREE.Vector3();
  public forward: THREE.Vector3 = new THREE.Vector3(0, 0, -1);
  public patrolAnchor: THREE.Vector3;
  public fireCooldown: number = 2.0;
  public torpedoCooldown: number = 4.0;
  public rank: string = 'Vanguard';
  public isElite: boolean = false;
  public isCloaked: boolean = false;
  public tacticalRole: 'vanguard' | 'flanker' = 'vanguard';
  public flankSign: number = 1;
  private cloakTimer: number = 0;
  private evadeTimer: number = 0;
  private lastHitExplosionTime: number = 0;
  private lastDamageTime: number = 0;
  private shieldMesh?: THREE.Mesh;
  private shieldFlareTimer: number = 0;

  public waveLevel: number = 1;

  constructor(
    id: string,
    name: string,
    faction: EnemyFaction,
    shipClass: string,
    initialPosition: THREE.Vector3,
    isMothership: boolean = false,
    waveLevel: number = 1,
    tacticalRole: 'vanguard' | 'flanker' = 'vanguard',
    flankSign: number = 1
  ) {
    this.id = id;
    this.name = name;
    this.faction = faction;
    this.shipClass = shipClass;
    this.isMothership = isMothership;
    this.waveLevel = waveLevel;
    this.tacticalRole = tacticalRole;
    this.flankSign = flankSign;
    this.patrolAnchor = initialPosition.clone();

    // Substantial progressive level scaling (+55% armor/shields per level)
    const scaleFactor = 1.0 + (waveLevel - 1) * 0.55;
    this.isElite = waveLevel >= 3 && !isMothership && Math.random() > 0.4;

    // Ranks based on threat level
    if (isMothership) {
      this.rank = faction === 'klingon' ? 'Imperial Fleet Commander' : (faction === 'romulan' ? 'Praetor' : 'Supreme Warlord');
    } else if (this.isElite) {
      this.rank = faction === 'klingon' ? 'Elite Dahar Master' : (faction === 'romulan' ? 'Sub-Commander' : 'Veteran Marauder');
    } else if (waveLevel >= 2) {
      this.rank = faction === 'klingon' ? 'Battle Commander' : (faction === 'romulan' ? 'Centurion' : 'Raider');
    } else {
      this.rank = 'Vanguard Scout';
    }

    // Health configuration with meaningful challenge
    if (isMothership) {
      // Flagship Dreadnought Boss
      this.maxShield = Math.round(680 * scaleFactor);
      this.maxHull = Math.round(920 * scaleFactor);
    } else if (shipClass.includes("Bird-of-Prey") || shipClass.includes("Scout")) {
      // Fast attack craft
      this.maxShield = Math.round((this.isElite ? 160 : 125) * scaleFactor);
      this.maxHull = Math.round((this.isElite ? 180 : 145) * scaleFactor);
    } else if (shipClass.includes("D7") || shipClass.includes("Cruiser") || shipClass.includes("Warbird")) {
      // Heavy capital warship
      this.maxShield = Math.round((this.isElite ? 290 : 230) * scaleFactor);
      this.maxHull = Math.round((this.isElite ? 340 : 270) * scaleFactor);
    } else {
      // Standard escort
      this.maxShield = Math.round(200 * scaleFactor);
      this.maxHull = Math.round(230 * scaleFactor);
    }

    this.shieldPercent = 100;
    this.hullPercent = 100;

    this.mesh = this.buildModel(faction, isMothership);
    this.mesh.position.copy(initialPosition);
    this.mesh.rotation.y = Math.random() * Math.PI * 2;
  }

  // Visual model builder reflecting exact requested faction color schemes:
  // - Romulan: Emerald Green with predator wings
  // - Klingon: Reddish Yellow / Orange-Red with aggressive cruiser styling
  // - Gorn: Dark Deep Blue with monolithic heavy armor
  private buildModel(faction: EnemyFaction, isMothership: boolean): THREE.Group {
    const group = new THREE.Group();

    if (faction === 'klingon') {
      // Klingon Empire: Reddish-Yellow & Rust-Orange Battle Armor with crimson accents
      const armorColor = isMothership ? 0xd97706 : 0xb45309; // Warm reddish-yellow armor
      const accentColor = 0x991b1b; // Dark crimson accent
      const hullMat = new THREE.MeshStandardMaterial({
        color: armorColor,
        metalness: 0.7,
        roughness: 0.3,
      });
      const crimsonMat = new THREE.MeshStandardMaterial({
        color: accentColor,
        metalness: 0.85,
        roughness: 0.25,
      });
      const exhaustMat = new THREE.MeshBasicMaterial({ color: 0xef4444 }); // Fiery red plasma

      const scale = isMothership ? 2.3 : 1.0;

      // Forward command bulb / battle beak
      const headGeo = new THREE.ConeGeometry(3.2 * scale, 6.0 * scale, 6);
      const head = new THREE.Mesh(headGeo, crimsonMat);
      head.rotation.x = Math.PI / 2;
      head.position.set(0, 0, 8.5 * scale);
      group.add(head);

      // Slender neck boom
      const neckGeo = new THREE.BoxGeometry(1.2 * scale, 1.0 * scale, 7.5 * scale);
      const neck = new THREE.Mesh(neckGeo, hullMat);
      neck.position.set(0, 0, 3.2 * scale);
      group.add(neck);

      // Engineering hull
      const engGeo = new THREE.BoxGeometry(6.5 * scale, 2.6 * scale, 5.5 * scale);
      const eng = new THREE.Mesh(engGeo, hullMat);
      eng.position.set(0, 0, -2.5 * scale);
      group.add(eng);

      if (isMothership) {
        // Mothership dorsal command tower & heavy armor plate
        const towerGeo = new THREE.BoxGeometry(4.0 * scale, 2.2 * scale, 4.0 * scale);
        const tower = new THREE.Mesh(towerGeo, crimsonMat);
        tower.position.set(0, 2.0 * scale, -2.0 * scale);
        group.add(tower);
      }

      // Swept battle wings
      for (const side of [-1, 1]) {
        const wingSpan = isMothership ? 12.0 : 8.5;
        const wingGeo = new THREE.BoxGeometry(wingSpan * scale, 0.45 * scale, 4.2 * scale);
        const wing = new THREE.Mesh(wingGeo, hullMat);
        wing.position.set(side * (wingSpan * 0.75) * scale, -1.0 * scale, -2.5 * scale);
        wing.rotation.z = side * -0.22;
        wing.rotation.y = side * 0.15;
        group.add(wing);

        // Wingtip heavy disruptor cannon
        const cannonGeo = new THREE.CylinderGeometry(0.35 * scale, 0.4 * scale, 3.8 * scale, 8);
        const cannon = new THREE.Mesh(cannonGeo, crimsonMat);
        cannon.rotation.x = Math.PI / 2;
        cannon.position.set(side * (wingSpan * 1.25) * scale, -2.0 * scale, -2.0 * scale);
        group.add(cannon);

        // Fiery red engine exhaust
        const glow = new THREE.Mesh(
          new THREE.BoxGeometry(2.2 * scale, 0.8 * scale, 0.3 * scale),
          exhaustMat
        );
        glow.position.set(side * 2.5 * scale, 0, -5.3 * scale);
        group.add(glow);
      }

    } else if (faction === 'romulan') {
      // Romulan Star Empire: Predominant Emerald Green with viridian wings & neon-green plasma
      const greenColor = isMothership ? 0x059669 : 0x047857; // Vibrant emerald
      const darkViridian = 0x064e3b;
      const hullMat = new THREE.MeshStandardMaterial({
        color: greenColor,
        metalness: 0.72,
        roughness: 0.28,
      });
      const wingMat = new THREE.MeshStandardMaterial({
        color: darkViridian,
        metalness: 0.65,
        roughness: 0.35,
      });
      const neonPlasmaMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });

      const scale = isMothership ? 2.4 : 1.0;

      // Prow beak / nose
      const beakGeo = new THREE.ConeGeometry(3.6 * scale, 7.5 * scale, 5);
      const beak = new THREE.Mesh(beakGeo, hullMat);
      beak.rotation.x = Math.PI / 2;
      beak.position.set(0, 0, 7.5 * scale);
      group.add(beak);

      // Double crescent wing loops
      for (const side of [-1, 1]) {
        const wingRadius = isMothership ? 12.0 : 8.0;
        const upWingGeo = new THREE.TorusGeometry(wingRadius * scale, 1.0 * scale, 8, 16, Math.PI);
        const upWing = new THREE.Mesh(upWingGeo, wingMat);
        upWing.position.set(0, side * 3.5 * scale, 0);
        upWing.rotation.x = side > 0 ? 0 : Math.PI;
        group.add(upWing);

        // Heavy warp nacelle
        const nacGeo = new THREE.CylinderGeometry(1.0 * scale, 1.2 * scale, 9.0 * scale, 8);
        const nac = new THREE.Mesh(nacGeo, hullMat);
        nac.rotation.x = Math.PI / 2;
        nac.position.set(side * 9.0 * scale, 0, -1.5 * scale);
        group.add(nac);

        // Radiant green plasma intake conduit
        const glow = new THREE.Mesh(
          new THREE.BoxGeometry(0.3 * scale, 0.5 * scale, 8.5 * scale),
          neonPlasmaMat
        );
        glow.position.set(side * 9.0 * scale, 0.6 * scale, -1.5 * scale);
        group.add(glow);
      }

      if (isMothership) {
        // Scimitar command spine
        const spineGeo = new THREE.BoxGeometry(3.2 * scale, 4.0 * scale, 8.0 * scale);
        const spine = new THREE.Mesh(spineGeo, hullMat);
        spine.position.set(0, 1.2 * scale, -1.0 * scale);
        group.add(spine);
      }

    } else {
      // Gorn Hegemony: Dark Deep Blue Metallic monolithic armor with cyan plasma ports
      const deepBlue = isMothership ? 0x1e3a8a : 0x172554; // Dark deep blue
      const cobaltPlate = 0x1e40af;
      const hullMat = new THREE.MeshStandardMaterial({
        color: deepBlue,
        metalness: 0.88,
        roughness: 0.22,
      });
      const darkMat = new THREE.MeshStandardMaterial({
        color: cobaltPlate,
        metalness: 0.9,
        roughness: 0.3,
      });
      const cyanGlowMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });

      const scale = isMothership ? 2.3 : 1.0;

      // Heavy ramming prow
      const prowGeo = new THREE.BoxGeometry(5.4 * scale, 4.2 * scale, 9.5 * scale);
      const prow = new THREE.Mesh(prowGeo, hullMat);
      prow.position.set(0, 0, 5.0 * scale);
      group.add(prow);

      // Armored citadel block
      const citGeo = new THREE.BoxGeometry(8.8 * scale, 3.4 * scale, 8.5 * scale);
      const cit = new THREE.Mesh(citGeo, darkMat);
      cit.position.set(0, 0.8 * scale, -2.5 * scale);
      group.add(cit);

      if (isMothership) {
        // Dominator Dreadnought heavy fortress superstructure
        const fortGeo = new THREE.BoxGeometry(6.5 * scale, 3.0 * scale, 6.0 * scale);
        const fort = new THREE.Mesh(fortGeo, hullMat);
        fort.position.set(0, 2.8 * scale, -2.5 * scale);
        group.add(fort);
      }

      // Cyan plasma cannon ports
      for (const side of [-1.8, 1.8]) {
        const port = new THREE.Mesh(
          new THREE.CylinderGeometry(0.7 * scale, 0.7 * scale, 1.4 * scale, 12),
          cyanGlowMat
        );
        port.rotation.x = Math.PI / 2;
        port.position.set(side * scale, 0, 10.0 * scale);
        group.add(port);
      }
    }

    return group;
  }

  // Trigger visible glowing 3D shield bubble flare around enemy ship
  public triggerShieldFlare() {
    if (!this.shieldMesh) {
      const radius = this.isMothership ? 24 : 9.5;
      const geo = new THREE.SphereGeometry(radius, 16, 12);
      const color = this.faction === 'klingon' ? 0xf97316 : (this.faction === 'romulan' ? 0x10b981 : 0x06b6d4);
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.65,
        wireframe: true,
      });
      this.shieldMesh = new THREE.Mesh(geo, mat);
      this.mesh.add(this.shieldMesh);
    }
    this.shieldFlareTimer = 0.45;
    if (this.shieldMesh) {
      this.shieldMesh.visible = true;
      (this.shieldMesh.material as THREE.MeshBasicMaterial).opacity = 0.75;
    }
  }

  // Damage with direct shield spillover into hull & antimatter torpedo shield bonus
  public takeDamage(amount: number, isTorpedo: boolean = false): boolean {
    if (!this.isAlive) return false;
    this.lastDamageTime = performance.now();

    // If cloaked and hit, break cloak
    if (this.isCloaked) {
      this.isCloaked = false;
      this.mesh.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mat = (child as THREE.Mesh).material as THREE.Material;
          if (mat) {
            mat.opacity = 1.0;
            mat.transparent = false;
          }
        }
      });
      soundEffects.playDecloakSound(this.mesh.position);
    }

    // Antimatter warheads (Photon Torpedoes) exert a devastating disruption shockwave against hostile deflector shields!
    let shieldDmgPct: number;
    let hullDmgPct: number;

    if (isTorpedo) {
      // Antimatter warhead (Photon Torpedo) deals massive, targeted shock to shields
      if (this.isMothership) {
        shieldDmgPct = 32;
        hullDmgPct = 24;
      } else if (this.shipClass.includes("Bird-of-Prey") || this.shipClass.includes("Scout")) {
        shieldDmgPct = 70;
        hullDmgPct = 65;
      } else {
        // Cruisers & Warbirds
        shieldDmgPct = 50;
        hullDmgPct = 42;
      }
    } else {
      // Continuous phaser beam damage
      shieldDmgPct = (amount / this.maxShield) * 100;
      hullDmgPct = (amount / this.maxHull) * 100;
    }

    if (this.shieldPercent > 0) {
      this.triggerShieldFlare();
      if (shieldDmgPct >= this.shieldPercent) {
        const overflowPct = shieldDmgPct - this.shieldPercent;
        this.shieldPercent = 0;
        soundEffects.playShieldHit(this.mesh.position);
        // Spill remaining overflow directly into hull
        this.hullPercent = Math.max(0, this.hullPercent - overflowPct * 0.85);
      } else {
        this.shieldPercent = Math.max(0, this.shieldPercent - shieldDmgPct);
        soundEffects.playShieldHit(this.mesh.position);
      }
    } else {
      this.hullPercent = Math.max(0, this.hullPercent - hullDmgPct);
    }

    if (this.hullPercent <= 0) {
      this.hullPercent = 0;
      this.isAlive = false;
      if (this.shieldMesh) {
        this.shieldMesh.visible = false;
      }
      return true; // Destroyed!
    }
    return false;
  }

  public canTriggerHitExplosion(): boolean {
    const now = performance.now();
    if (now - this.lastHitExplosionTime > 280) {
      this.lastHitExplosionTime = now;
      return true;
    }
    return false;
  }

  public updateAI(
    delta: number,
    playerPos: THREE.Vector3,
    playerVelocity: THREE.Vector3,
    canFireNow: boolean,
    onFireProjectile: (origin: THREE.Vector3, dir: THREE.Vector3, color: number) => void,
    onFireTorpedo?: (origin: THREE.Vector3, dir: THREE.Vector3) => void,
    fleetIntelligenceLevel: number = 1,
    predictiveLeadAim: boolean = false
  ) {
    if (!this.isAlive) return;

    this.fireCooldown = Math.max(0, this.fireCooldown - delta);
    this.torpedoCooldown = Math.max(0, this.torpedoCooldown - delta);
    this.evadeTimer = Math.max(0, this.evadeTimer - delta);

    // Fade shield bubble flare
    if (this.shieldFlareTimer > 0) {
      this.shieldFlareTimer = Math.max(0, this.shieldFlareTimer - delta);
      if (this.shieldMesh) {
        (this.shieldMesh.material as THREE.MeshBasicMaterial).opacity = (this.shieldFlareTimer / 0.45) * 0.75;
        if (this.shieldFlareTimer <= 0) {
          this.shieldMesh.visible = false;
        }
      }
    }

    // Mothership active shield harmonics (recharges 4% per second after 4s without taking hits)
    if (this.isMothership && this.shieldPercent > 0 && this.shieldPercent < 100) {
      if (performance.now() - this.lastDamageTime > 4000) {
        this.shieldPercent = Math.min(100, this.shieldPercent + delta * 4.2);
      }
    }

    // Bird of Prey cloaking ambush tactical maneuver
    const isBirdOfPrey = this.shipClass.includes("Bird-of-Prey") || this.shipClass.includes("Scout");
    if (isBirdOfPrey && this.waveLevel >= 3) {
      if (!this.isCloaked && this.shieldPercent < 35 && this.cloakTimer <= 0) {
        this.isCloaked = true;
        this.cloakTimer = 4.5;
        this.mesh.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mat = (child as THREE.Mesh).material as THREE.Material;
            if (mat) {
              mat.transparent = true;
              mat.opacity = 0.18;
            }
          }
        });
        soundEffects.playCloakSound(this.mesh.position);
      } else if (this.isCloaked) {
        this.cloakTimer -= delta;
        if (this.cloakTimer <= 0) {
          this.isCloaked = false;
          this.mesh.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mat = (child as THREE.Mesh).material as THREE.Material;
              if (mat) {
                mat.opacity = 1.0;
                mat.transparent = false;
              }
            }
          });
          soundEffects.playDecloakSound(this.mesh.position);
          this.fireCooldown = 0.2; // Immediate decloak ambush strike!
        }
      }
    }

    const distToPlayer = this.mesh.position.distanceTo(playerPos);

    if (distToPlayer < 1300) {
      // Engaging player in dynamic tactical dogfight
      this.state = (this.shieldPercent < 15 && this.evadeTimer <= 0 && !this.isMothership) ? 'evading' : 'engaging';

      const toPlayer = playerPos.clone().sub(this.mesh.position).normalize();

      if (this.state === 'engaging') {
        const turnRate = (this.isMothership ? 1.4 : 2.5) + Math.min(1.4, (this.waveLevel - 1) * 0.3) + (fleetIntelligenceLevel * 0.2);
        
        let aimTarget = toPlayer;

        // Adaptive Coordinated Pincer / Flanking algorithm: flankers bank around to Enterprise's sides and rear
        if (this.tacticalRole === 'flanker' && fleetIntelligenceLevel >= 3 && distToPlayer > 180 && !this.isMothership) {
          const sideOffset = new THREE.Vector3(this.flankSign * 1.4, 0.3, -0.5).applyQuaternion(this.mesh.quaternion).normalize();
          aimTarget = toPlayer.clone().add(sideOffset.multiplyScalar(0.85)).normalize();
        } else if (distToPlayer < 170 && !this.isMothership) {
          // If within close flyby range (< 170 units), bank and sweep past in a strafe
          const sideDir = new THREE.Vector3(1, 0.3, 0).applyQuaternion(this.mesh.quaternion).normalize();
          aimTarget = toPlayer.clone().add(sideDir.multiplyScalar(0.75)).normalize();
        }

        const targetQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), aimTarget);
        this.mesh.quaternion.slerp(targetQuat, delta * turnRate);

        // Adaptive high-G corkscrew evasive weaving when under sustained combat
        if (fleetIntelligenceLevel >= 2 && !this.isMothership && distToPlayer < 400) {
          this.mesh.rotateZ(delta * 0.8 * this.flankSign);
        }

        // Forward flight speed: always dynamic forward motion (no awkward reversing)
        let forwardSpeed = 42 + Math.min(26, (this.waveLevel - 1) * 5) + (fleetIntelligenceLevel * 2.5);
        if (this.isMothership) {
          forwardSpeed = distToPlayer > 350 ? 30 : (distToPlayer < 200 ? 15 : 22);
        } else {
          // Scouts & battlecruisers close the distance with combat urgency
          forwardSpeed = distToPlayer > 400 ? (60 + (this.waveLevel - 1) * 5) : (distToPlayer < 160 ? 50 : 42);
        }
        this.mesh.translateZ(forwardSpeed * delta);

        if (canFireNow && distToPlayer < 750 && this.fireCooldown <= 0 && !this.isCloaked) {
          // Relentless firing cadence at higher war levels
          const baseCd = this.isMothership
            ? Math.max(0.85, 1.7 - (this.waveLevel - 1) * 0.22 - (fleetIntelligenceLevel * 0.08))
            : Math.max(1.0, 2.4 - (this.waveLevel - 1) * 0.32 - (fleetIntelligenceLevel * 0.12));
          this.fireCooldown = baseCd + Math.random() * (this.isMothership ? 0.5 : 0.8);
          
          // Disruptor bolt color matching faction
          const beamColor = this.faction === 'klingon' ? 0xef4444 : (this.faction === 'romulan' ? 0x10b981 : 0x06b6d4);
          const launchPos = this.mesh.position.clone().add(toPlayer.clone().multiplyScalar(this.isMothership ? 24 : 12));
          
          // Adaptive Predictive Lead-Aiming: hostiles calculate player velocity lead!
          let fireDirection = toPlayer;
          if (predictiveLeadAim && distToPlayer > 80 && playerVelocity.lengthSq() > 10) {
            const bulletSpeed = 250;
            const leadSeconds = Math.min(1.8, distToPlayer / bulletSpeed);
            const predictedPos = playerPos.clone().add(playerVelocity.clone().multiplyScalar(leadSeconds));
            fireDirection = predictedPos.sub(launchPos).normalize();
          }

          onFireProjectile(launchPos, fireDirection, beamColor);
          if (this.isMothership) {
            soundEffects.playHeavyDisruptor(launchPos);
          } else {
            soundEffects.playEnemyDisruptor(launchPos);
          }

          // Mothership dual broadside salvo
          if (this.isMothership) {
            const flankOffset = new THREE.Vector3(1, 0, 0).applyQuaternion(this.mesh.quaternion).multiplyScalar(15);
            onFireProjectile(launchPos.clone().add(flankOffset), fireDirection, beamColor);
          }

          // Heavy Capital Ship / Flagship Torpedo Launch
          const canFireTorpedo = (this.isMothership || this.shipClass.includes("Cruiser") || this.shipClass.includes("D7") || this.shipClass.includes("Warbird")) && this.waveLevel >= 2;
          if (canFireTorpedo && this.torpedoCooldown <= 0 && distToPlayer < 650 && onFireTorpedo) {
            this.torpedoCooldown = Math.max(4.5, 7.5 - (fleetIntelligenceLevel * 0.6) + Math.random() * 2.5);
            onFireTorpedo(launchPos, fireDirection);
          }
        }
      } else {
        // Evasive tactical maneuver: bank away and burn thrusters
        const awayFromPlayer = this.mesh.position.clone().sub(playerPos).normalize();
        const evadeQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), awayFromPlayer);
        this.mesh.quaternion.slerp(evadeQuat, delta * 3.2);
        this.mesh.translateZ(64 * delta);
        if (distToPlayer > 450) {
          this.evadeTimer = 2.5;
        }
      }
    } else {
      // Re-acquire combat zone when drifting too far
      this.state = 'patrol';
      const toAnchor = playerPos.clone().sub(this.mesh.position).normalize();
      const targetQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), toAnchor);
      this.mesh.quaternion.slerp(targetQuat, delta * 2.2);
      this.mesh.translateZ(46 * delta);
    }
  }

  public toState(playerPos: THREE.Vector3): EnemyShipState {
    return {
      id: this.id,
      name: this.name,
      faction: this.faction,
      shipClass: this.shipClass,
      position: [this.mesh.position.x, this.mesh.position.y, this.mesh.position.z],
      distanceToPlayer: Math.round(this.mesh.position.distanceTo(playerPos)),
      shieldPercent: Math.round(this.shieldPercent),
      hullPercent: Math.round(this.hullPercent),
      isAlive: this.isAlive,
      isHostile: true,
      state: this.state,
      isMothership: this.isMothership,
      rank: this.rank,
      isElite: this.isElite,
      isCloaked: this.isCloaked,
    };
  }
}

// Adaptive Difficulty Scaling System
// Tracks player success rate against hostiles (kills, TTK, accuracy, damage ratio, dodges, win streaks)
// Dynamically adjusts hostile damage output, predictive lead aiming, and fleet intelligence of subsequent waves
export class AdaptiveDifficultyTracker {
  public combatRating: number = 100; // Baseline rating
  public playerSuccessRate: number = 100; // 0 to 100% computed success rate
  public skillTier: 'Cadet' | 'Officer' | 'Veteran' | 'Ace' | 'Legendary' = 'Cadet';
  public winStreak: number = 0;
  public wavesAttempted: number = 0;
  public wavesCleared: number = 0;
  public playerDefeats: number = 0;
  public totalKills: number = 0;
  public scoutsDestroyed: number = 0;
  public cruisersDestroyed: number = 0;
  public mothershipsDestroyed: number = 0;
  public totalDamageDealt: number = 0;
  public totalDamageTaken: number = 0;

  // Starfleet Officer Level & Threat Progression
  public playerLevel: number = 1;
  public playerXp: number = 0;
  public nextLevelXp: number = 500;
  public playerRank: 'Ensign' | 'Lieutenant' | 'Lt Commander' | 'Commander' | 'Captain' | 'Fleet Captain' | 'Admiral' = 'Ensign';

  public torpedoesFired: number = 0;
  public torpedoesHit: number = 0;
  public enemyTorpedoesDodged: number = 0;
  public enemyTorpedoesSpawned: number = 0;
  public waveStartTime: number = performance.now();
  public waveInitialDamageTaken: number = 0;
  public waveInitialKills: number = 0;
  public waveInitialXp: number = 0;
  public waveInitialScouts: number = 0;
  public waveInitialCruisers: number = 0;
  public waveInitialMotherships: number = 0;
  public waveClearTimes: number[] = [];

  // Dynamically adjusted difficulty parameters for subsequent waves
  public adaptiveDamageMultiplier: number = 1.0;
  public fleetIntelligenceTier: 'Standard' | 'Tactical' | 'Coordinated' | 'Predictive' | 'Apex Swarm' = 'Standard';
  public fleetIntelligenceLevel: number = 1;
  public flankingAggression: number = 1.0;
  public predictiveLeadAim: boolean = false;

  public addXp(
    amount: number,
    onLogEvent?: (
      category: 'WEAPONS' | 'DEFENSE' | 'TACTICAL' | 'NAVIGATION' | 'DAMAGE' | 'SECTOR',
      type: 'info' | 'warning' | 'critical' | 'success' | 'combat',
      message: string,
      details?: string
    ) => void
  ) {
    this.playerXp += amount;
    const oldLevel = this.playerLevel;
    const thresholds = [0, 500, 1300, 2500, 4200, 6800, 10500, 16000];
    const ranks: Array<'Ensign' | 'Lieutenant' | 'Lt Commander' | 'Commander' | 'Captain' | 'Fleet Captain' | 'Admiral'> = [
      'Ensign', 'Lieutenant', 'Lt Commander', 'Commander', 'Captain', 'Fleet Captain', 'Admiral'
    ];

    let newLevel = 1;
    for (let i = 1; i < thresholds.length; i++) {
      if (this.playerXp >= thresholds[i]) {
        newLevel = i + 1;
      } else {
        break;
      }
    }

    this.playerLevel = Math.min(7, newLevel);
    this.playerRank = ranks[Math.min(ranks.length - 1, this.playerLevel - 1)];
    this.nextLevelXp = thresholds[Math.min(thresholds.length - 1, this.playerLevel)] || (this.playerLevel * 2500);

    if (this.playerLevel > oldLevel) {
      soundEffects.playPromotionChime();
      onLogEvent?.(
        'TACTICAL',
        'success',
        `STARFLEET PROMOTION: ${this.playerRank.toUpperCase()}`,
        `Congratulations, Officer! Promoted to Level ${this.playerLevel} (${this.playerRank}). Hostile forces escalate to counter your command prowess.`
      );
    }
  }

  public recordDamageDealt(amount: number) {
    this.totalDamageDealt += amount;
    this.recomputeLiveMetrics();
  }

  public recordDamageTaken(amount: number) {
    this.totalDamageTaken += amount;
    this.recomputeLiveMetrics();
  }

  public recordTorpedoFired() {
    this.torpedoesFired++;
    this.recomputeLiveMetrics();
  }

  public recordTorpedoHit() {
    this.torpedoesHit++;
    this.recomputeLiveMetrics();
  }

  public recordTorpedoSpawned() {
    this.enemyTorpedoesSpawned++;
  }

  public recordTorpedoDodged() {
    this.enemyTorpedoesDodged++;
    this.recomputeLiveMetrics();
  }

  public recordKill(
    shipClass: string = '',
    isMothership: boolean = false,
    onLogEvent?: (
      category: 'WEAPONS' | 'DEFENSE' | 'TACTICAL' | 'NAVIGATION' | 'DAMAGE' | 'SECTOR',
      type: 'info' | 'warning' | 'critical' | 'success' | 'combat',
      message: string,
      details?: string
    ) => void
  ) {
    this.totalKills++;
    let xpGain = 160;
    if (isMothership) {
      this.mothershipsDestroyed++;
      xpGain = 850;
    } else if (shipClass.includes("Bird-of-Prey") || shipClass.includes("Scout")) {
      this.scoutsDestroyed++;
      xpGain = 180;
    } else {
      this.cruisersDestroyed++;
      xpGain = 340;
    }
    this.addXp(xpGain, onLogEvent);
    this.recomputeLiveMetrics();
  }

  public recordWaveAttempted() {
    this.wavesAttempted++;
    this.waveStartTime = performance.now();
    this.waveInitialDamageTaken = this.totalDamageTaken;
    this.waveInitialKills = this.totalKills;
    this.waveInitialXp = this.playerXp;
    this.waveInitialScouts = this.scoutsDestroyed;
    this.waveInitialCruisers = this.cruisersDestroyed;
    this.waveInitialMotherships = this.mothershipsDestroyed;
    this.recomputeLiveMetrics();
  }

  public recomputeLevelFromXp() {
    const thresholds = [0, 500, 1300, 2500, 4200, 6800, 10500, 16000];
    const ranks: Array<'Ensign' | 'Lieutenant' | 'Lt Commander' | 'Commander' | 'Captain' | 'Fleet Captain' | 'Admiral'> = [
      'Ensign', 'Lieutenant', 'Lt Commander', 'Commander', 'Captain', 'Fleet Captain', 'Admiral'
    ];

    let newLevel = 1;
    for (let i = 1; i < thresholds.length; i++) {
      if (this.playerXp >= thresholds[i]) {
        newLevel = i + 1;
      } else {
        break;
      }
    }

    this.playerLevel = Math.min(7, newLevel);
    this.playerRank = ranks[Math.min(ranks.length - 1, this.playerLevel - 1)];
    this.nextLevelXp = thresholds[Math.min(thresholds.length - 1, this.playerLevel)] || (this.playerLevel * 2500);
  }

  public rollbackToWaveStart() {
    this.playerXp = this.waveInitialXp;
    this.totalKills = this.waveInitialKills;
    this.scoutsDestroyed = this.waveInitialScouts;
    this.cruisersDestroyed = this.waveInitialCruisers;
    this.mothershipsDestroyed = this.waveInitialMotherships;
    this.totalDamageTaken = this.waveInitialDamageTaken;
    this.recomputeLevelFromXp();
    this.recomputeLiveMetrics();
  }

  // Wipes all career progress (XP, kills by class, officer ranks, battle ratings) to virgin starting state
  public resetAllProgress() {
    this.combatRating = 100;
    this.playerSuccessRate = 100;
    this.skillTier = 'Cadet';
    this.winStreak = 0;
    this.wavesAttempted = 0;
    this.wavesCleared = 0;
    this.playerDefeats = 0;
    this.totalKills = 0;
    this.scoutsDestroyed = 0;
    this.cruisersDestroyed = 0;
    this.mothershipsDestroyed = 0;
    this.totalDamageDealt = 0;
    this.totalDamageTaken = 0;

    // Starfleet Officer Level & Threat Progression reset to Cadet / Ensign
    this.playerLevel = 1;
    this.playerXp = 0;
    this.nextLevelXp = 500;
    this.playerRank = 'Ensign';

    this.torpedoesFired = 0;
    this.torpedoesHit = 0;
    this.enemyTorpedoesDodged = 0;
    this.enemyTorpedoesSpawned = 0;
    this.waveStartTime = performance.now();
    this.waveInitialDamageTaken = 0;
    this.waveInitialKills = 0;
    this.waveInitialXp = 0;
    this.waveInitialScouts = 0;
    this.waveInitialCruisers = 0;
    this.waveInitialMotherships = 0;
    this.waveClearTimes = [];

    // Dynamically adjusted difficulty parameters reset to baseline
    this.adaptiveDamageMultiplier = 1.0;
    this.fleetIntelligenceTier = 'Standard';
    this.fleetIntelligenceLevel = 1;
    this.flankingAggression = 1.0;
    this.predictiveLeadAim = false;

    this.recomputeLiveMetrics();
  }

  public recordPlayerDefeat(
    onLogEvent?: (
      category: 'WEAPONS' | 'DEFENSE' | 'TACTICAL' | 'NAVIGATION' | 'DAMAGE' | 'SECTOR',
      type: 'info' | 'warning' | 'critical' | 'success' | 'combat',
      message: string,
      details?: string
    ) => void
  ) {
    this.playerDefeats++;
    this.winStreak = 0;
    // Slight recalibration of combat rating upon critical defeat
    this.combatRating = Math.max(90, Math.round(this.combatRating * 0.88));
    this.recomputeLiveMetrics();

    onLogEvent?.(
      'TACTICAL',
      'warning',
      'TACTICAL RECALIBRATION: HOSTILE PRESSURE EASED',
      `Enterprise emergency reset recorded. Hostile battlegroups maintaining baseline patrols (Rating: ${this.combatRating} · Tier: ${this.skillTier}).`
    );
  }

  public onWaveStarted(waveLevel: number) {
    this.recordWaveAttempted();
  }

  private recomputeLiveMetrics() {
    const accuracy = this.torpedoesFired > 0
      ? Math.min(100, Math.round((this.torpedoesHit / this.torpedoesFired) * 100))
      : 80;
    const waveClearRatio = this.wavesAttempted > 0
      ? Math.min(100, (this.wavesCleared / this.wavesAttempted) * 100)
      : 100;
    const evasionRatio = this.enemyTorpedoesSpawned > 0
      ? Math.min(100, Math.round((this.enemyTorpedoesDodged / this.enemyTorpedoesSpawned) * 100))
      : 85;

    // Comprehensive Player Success Rate (0 - 100%)
    const rawSuccessRate = (waveClearRatio * 0.45) + (accuracy * 0.25) + (evasionRatio * 0.15) + (Math.min(100, this.combatRating / 2.2) * 0.15);
    this.playerSuccessRate = Math.min(100, Math.max(15, Math.round(rawSuccessRate)));
  }

  public onWaveCleared(
    waveLevel: number,
    onLogEvent?: (
      category: 'WEAPONS' | 'DEFENSE' | 'TACTICAL' | 'NAVIGATION' | 'DAMAGE' | 'SECTOR',
      type: 'info' | 'warning' | 'critical' | 'success' | 'combat',
      message: string,
      details?: string
    ) => void
  ) {
    this.winStreak++;
    this.wavesCleared++;
    this.addXp(450, onLogEvent);
    const waveDurationSec = Math.max(1, (performance.now() - this.waveStartTime) / 1000);
    this.waveClearTimes.push(waveDurationSec);
    const waveDamageTaken = Math.max(0, this.totalDamageTaken - this.waveInitialDamageTaken);
    const waveKills = Math.max(1, this.totalKills - this.waveInitialKills);
    const timeToKill = waveDurationSec / waveKills;

    // 1. Defense evaluation: how well the player defended their ship
    let defenseScore = 0;
    if (waveDamageTaken <= 20) defenseScore = 32;       // Flawless shield harmonics
    else if (waveDamageTaken <= 60) defenseScore = 20;  // Strong defense
    else if (waveDamageTaken <= 110) defenseScore = 8;
    else defenseScore = -8;                             // Heavy shield and hull damage

    // 2. Kill Speed & Efficiency (TTK per enemy)
    let speedScore = 0;
    if (timeToKill <= 8) speedScore = 28;               // Blistering tactical dominance
    else if (timeToKill <= 16) speedScore = 16;
    else if (timeToKill <= 24) speedScore = 6;
    else speedScore = -4;

    // 3. Accuracy Evaluation
    const accuracy = this.torpedoesFired > 0
      ? Math.min(100, Math.round((this.torpedoesHit / this.torpedoesFired) * 100))
      : 75;
    let accuracyScore = 0;
    if (accuracy >= 80) accuracyScore = 18;
    else if (accuracy >= 60) accuracyScore = 10;
    else accuracyScore = 2;

    // 4. Consecutive Wave Streak Mastery
    const streakBonus = Math.min(30, (this.winStreak - 1) * 7);

    // Compute updated Combat Rating (blended towards target rating)
    const targetRating = 100 + defenseScore + speedScore + accuracyScore + streakBonus;
    this.combatRating = Math.max(85, Math.min(270, Math.round(this.combatRating * 0.30 + targetRating * 0.70)));

    // Categorize Skill Tier
    if (this.combatRating >= 210) {
      this.skillTier = 'Legendary';
    } else if (this.combatRating >= 170) {
      this.skillTier = 'Ace';
    } else if (this.combatRating >= 138) {
      this.skillTier = 'Veteran';
    } else if (this.combatRating >= 110) {
      this.skillTier = 'Officer';
    } else {
      this.skillTier = 'Cadet';
    }

    // Adaptive Damage Multiplier for next waves (1.0x to 2.4x based dynamically on player success rate and rating)
    const ratingSurplus = Math.max(0, (this.combatRating - 100) / 100);
    const streakSurplus = Math.min(0.40, this.winStreak * 0.08);
    this.adaptiveDamageMultiplier = Number(
      Math.min(2.40, 1.0 + (ratingSurplus * 0.90) + streakSurplus).toFixed(2)
    );

    // Adaptive Fleet Intelligence Level (1 to 5)
    // Directly driven by player combat rating and success rate
    if (this.combatRating >= 195 || (this.playerSuccessRate >= 90 && this.winStreak >= 3)) {
      this.fleetIntelligenceLevel = 5;
      this.fleetIntelligenceTier = 'Apex Swarm';
    } else if (this.combatRating >= 160 || (this.playerSuccessRate >= 80 && this.winStreak >= 2)) {
      this.fleetIntelligenceLevel = 4;
      this.fleetIntelligenceTier = 'Predictive';
    } else if (this.combatRating >= 130 || this.playerSuccessRate >= 70) {
      this.fleetIntelligenceLevel = 3;
      this.fleetIntelligenceTier = 'Coordinated';
    } else if (this.combatRating >= 108 || this.playerSuccessRate >= 58) {
      this.fleetIntelligenceLevel = 2;
      this.fleetIntelligenceTier = 'Tactical';
    } else {
      this.fleetIntelligenceLevel = 1;
      this.fleetIntelligenceTier = 'Standard';
    }

    this.predictiveLeadAim = this.fleetIntelligenceLevel >= 4;
    this.flankingAggression = Number((1.0 + (this.fleetIntelligenceLevel - 1) * 0.35).toFixed(2));

    this.recomputeLiveMetrics();

    const dmgBoostPct = Math.round((this.adaptiveDamageMultiplier - 1) * 100);
    onLogEvent?.(
      'TACTICAL',
      'critical',
      `HOSTILE FLEET ADAPTATION: ${this.fleetIntelligenceTier.toUpperCase()}`,
      `Enemy battle computers analyzed Starfleet combat telemetry (Success Rate: ${this.playerSuccessRate}% · Rating: ${this.combatRating} · Tier: ${this.skillTier}). Subsequent waves counter-scaled: +${dmgBoostPct}% firepower${this.predictiveLeadAim ? ', predictive velocity lead aiming' : ''}, and Tier ${this.fleetIntelligenceLevel} pincer tactics.`
    );
  }

  public getMetrics(): AdaptiveCombatMetrics {
    const accuracy = this.torpedoesFired > 0
      ? Math.min(100, Math.round((this.torpedoesHit / this.torpedoesFired) * 100))
      : 80;
    const dmgRatio = this.totalDamageTaken > 0
      ? Number((this.totalDamageDealt / this.totalDamageTaken).toFixed(1))
      : Number((this.totalDamageDealt / 20).toFixed(1));
    const avgTTK = this.waveClearTimes.length > 0
      ? Number((this.waveClearTimes.reduce((a, b) => a + b, 0) / Math.max(1, this.totalKills)).toFixed(1))
      : 12.0;
    const evasionEff = this.enemyTorpedoesSpawned > 0
      ? Math.min(100, Math.round((this.enemyTorpedoesDodged / this.enemyTorpedoesSpawned) * 100))
      : 85;

    return {
      combatRating: this.combatRating,
      playerSuccessRate: this.playerSuccessRate,
      skillTier: this.skillTier,
      winStreak: this.winStreak,
      totalKills: this.totalKills,
      playerAccuracyPercent: accuracy,
      damageEfficiencyRatio: dmgRatio,
      adaptiveDamageMultiplier: this.adaptiveDamageMultiplier,
      fleetIntelligenceTier: this.fleetIntelligenceTier,
      fleetIntelligenceLevel: this.fleetIntelligenceLevel,
      evasionEfficacyPercent: evasionEff,
      flankingAggression: this.flankingAggression,
      predictiveLeadAim: this.predictiveLeadAim,
      averageTimeToKill: avgTTK,
    };
  }

  public getProgression(): PlayerProgression {
    const activeThreat: 'Standard' | 'Elevated' | 'Severe' | 'Critical' | 'Extreme' | 'Lethal' =
      this.playerLevel <= 1 ? 'Standard' :
      this.playerLevel === 2 ? 'Elevated' :
      this.playerLevel === 3 ? 'Severe' :
      this.playerLevel === 4 ? 'Critical' :
      this.playerLevel === 5 ? 'Extreme' : 'Lethal';

    return {
      level: this.playerLevel,
      rank: this.playerRank,
      xp: this.playerXp,
      nextLevelXp: this.nextLevelXp,
      totalEnemiesDestroyed: this.totalKills,
      scoutsDestroyed: this.scoutsDestroyed,
      cruisersDestroyed: this.cruisersDestroyed,
      mothershipsDestroyed: this.mothershipsDestroyed,
      activeThreatLevel: activeThreat,
    };
  }
}

export class WarZoneCombatManager {
  private scene: THREE.Scene;
  private explosionManager: ParticleExplosionManager;
  public enemyShips: EnemyShip[] = [];
  public projectiles: EnemyProjectile[] = [];
  public adaptiveTracker: AdaptiveDifficultyTracker = new AdaptiveDifficultyTracker();
  public onLogEvent?: (
    category: 'WEAPONS' | 'DEFENSE' | 'TACTICAL' | 'NAVIGATION' | 'DAMAGE' | 'SECTOR',
    type: 'info' | 'warning' | 'critical' | 'success' | 'combat',
    message: string,
    details?: string
  ) => void;

  // War Level Progression & State
  public combatWave: number = 1;
  public totalHostilesDestroyed: number = 0;
  public waveStatus: 'active' | 'cleared' | 'standby' = 'standby';
  public reinforcementCountdown: number = 0;
  public activeFaction: EnemyFaction = 'klingon';
  public sectorStatusText: string = 'Territory Guard Active';
  public hasIncomingTorpedo: boolean = false;

  // Zero-allocation shared geometries and materials for disruptor bolts and torpedoes
  private boltGeo = new THREE.CylinderGeometry(0.35, 0.35, 3.2, 6);
  private redBoltMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
  private greenBoltMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
  private cyanBoltMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
  private enemyTorpedoGeo = new THREE.SphereGeometry(1.6, 8, 8);
  private enemyTorpedoMat = new THREE.MeshBasicMaterial({ color: 0xff4500 });

  constructor(scene: THREE.Scene, explosionManager: ParticleExplosionManager) {
    this.scene = scene;
    this.explosionManager = explosionManager;
  }

  // Determines faction strictly based on territory location:
  // - Kronos territory -> Klingon
  // - Romulus territory -> Romulan
  // - Gorn territory -> Gorn
  // - Neutral/default -> cycle single faction per wave
  public getFactionForLocation(systemId: string, wave: number): EnemyFaction {
    if (systemId === 'kronos_system') {
      return 'klingon';
    }
    if (systemId === 'romulus_system') {
      return 'romulan';
    }
    if (systemId === 'gorn_sector') {
      return 'gorn';
    }
    // Rotating single faction for neutral war zones
    const factions: EnemyFaction[] = ['klingon', 'romulan', 'gorn'];
    return factions[(wave - 1) % factions.length];
  }

  // Spawns a structured wave with SINGLE FACTION and STANDOFF DISTANCE (no spawning on top of player!)
  public spawnWave(
    playerPos: THREE.Vector3,
    systemId: string,
    waveLevel: number
  ) {
    // Clear any existing ships
    for (const ship of this.enemyShips) {
      this.scene.remove(ship.mesh);
    }
    this.enemyShips = [];

    this.combatWave = waveLevel;
    this.waveStatus = 'active';
    this.reinforcementCountdown = 0;

    // 1. Single faction per wave
    this.activeFaction = this.getFactionForLocation(systemId, waveLevel);

    // 2. Safe Standoff Anchor: 650 to 850 units away from player in space
    const standoffDist = 720;
    const angle = Math.random() * Math.PI * 2;
    const anchorCenter = playerPos.clone().add(new THREE.Vector3(
      Math.sin(angle) * standoffDist,
      (Math.random() - 0.5) * 120,
      -Math.cos(angle) * standoffDist
    ));

    // 3. Flagship / Mothership appears at Wave 3+ or every 2 waves
    const hasMothership = waveLevel >= 3 && (waveLevel % 2 !== 0 || waveLevel === 3);

    // Fleet composition of the single faction
    const fleetConfig: Array<{
      name: string;
      shipClass: string;
      offset: [number, number, number];
      isMothership?: boolean;
    }> = [];

    if (this.activeFaction === 'klingon') {
      if (hasMothership) {
        fleetConfig.push({
          name: "IKS Negh'Var Flagship",
          shipClass: "Negh'Var Imperial Mothership",
          offset: [0, 20, 0],
          isMothership: true,
        });
        fleetConfig.push({
          name: "IKS Klothos",
          shipClass: "D7 Battlecruiser",
          offset: [-160, -30, -60],
        });
        fleetConfig.push({
          name: "IKS Koraga",
          shipClass: "B'rel Bird-of-Prey",
          offset: [160, 40, 50],
        });
        if (waveLevel >= 5) {
          fleetConfig.push({
            name: "IKS Ch'Tang",
            shipClass: "B'rel Bird-of-Prey",
            offset: [0, -70, -140],
          });
        }
      } else {
        // Standard battle squadron
        const count = Math.min(2 + waveLevel, 5);
        for (let i = 0; i < count; i++) {
          const isD7 = i % 2 === 0;
          fleetConfig.push({
            name: isD7 ? `IKS Bortas ${i + 1}` : `IKS Vorn ${i + 1}`,
            shipClass: isD7 ? "D7 Battlecruiser" : "B'rel Bird-of-Prey",
            offset: [(i - count / 2) * 120, ((i % 3) - 1) * 40, (i % 2) * 80 - 40],
          });
        }
      }

    } else if (this.activeFaction === 'romulan') {
      if (hasMothership) {
        fleetConfig.push({
          name: "IRW Scimitar Flagship",
          shipClass: "Scimitar Dreadnought Mothership",
          offset: [0, 20, 0],
          isMothership: true,
        });
        fleetConfig.push({
          name: "IRW Haakona",
          shipClass: "D'deridex Warbird",
          offset: [-180, 50, -60],
        });
        fleetConfig.push({
          name: "IRW Terix",
          shipClass: "Romulan Bird-of-Prey",
          offset: [180, -30, 70],
        });
        if (waveLevel >= 5) {
          fleetConfig.push({
            name: "IRW Galorndon",
            shipClass: "Romulan Bird-of-Prey",
            offset: [0, -60, -120],
          });
        }
      } else {
        const count = Math.min(2 + waveLevel, 5);
        for (let i = 0; i < count; i++) {
          const isWarbird = i === 0;
          fleetConfig.push({
            name: isWarbird ? `IRW Decius ${i + 1}` : `IRW T'Met ${i + 1}`,
            shipClass: isWarbird ? "D'deridex Warbird" : "Romulan Bird-of-Prey",
            offset: [(i - count / 2) * 130, ((i % 2) - 0.5) * 60, (i % 2) * 90 - 45],
          });
        }
      }

    } else {
      // Gorn Hegemony
      if (hasMothership) {
        fleetConfig.push({
          name: "SS Gornar Dominator",
          shipClass: "Dominator Dreadnought Mothership",
          offset: [0, 20, 0],
          isMothership: true,
        });
        fleetConfig.push({
          name: "SS Sss'thar",
          shipClass: "Gorn Heavy Cruiser",
          offset: [-170, -40, -80],
        });
        fleetConfig.push({
          name: "SS Krassk",
          shipClass: "Gorn Heavy Cruiser",
          offset: [170, 50, 60],
        });
        if (waveLevel >= 5) {
          fleetConfig.push({
            name: "SS V'zzan",
            shipClass: "Gorn Heavy Cruiser",
            offset: [0, -60, -140],
          });
        }
      } else {
        const count = Math.min(2 + waveLevel, 4);
        for (let i = 0; i < count; i++) {
          fleetConfig.push({
            name: `SS Gorn Marauder ${i + 1}`,
            shipClass: "Gorn Heavy Cruiser",
            offset: [(i - count / 2) * 140, (i % 2 === 0 ? 40 : -40), (i % 2) * 70 - 35],
          });
        }
      }
    }

    // Instantiate and warp in ships with spatialized audio
    for (let idx = 0; idx < fleetConfig.length; idx++) {
      const cfg = fleetConfig[idx];
      const shipPos = anchorCenter.clone().add(new THREE.Vector3(...cfg.offset));
      const role: 'vanguard' | 'flanker' = idx === 0 ? 'vanguard' : (idx % 2 === 1 ? 'flanker' : 'vanguard');
      const flankSign = idx % 2 === 1 ? 1 : -1;
      const ship = new EnemyShip(
        `${this.activeFaction}_${waveLevel}_${Math.random().toString(36).substring(2, 7)}`,
        cfg.name,
        this.activeFaction,
        cfg.shipClass,
        shipPos,
        !!cfg.isMothership,
        waveLevel,
        role,
        flankSign
      );
      this.scene.add(ship.mesh);
      this.enemyShips.push(ship);

      // Standoff warp drop-in visual flash
      this.explosionManager.triggerExplosion(shipPos, cfg.isMothership ? 3.0 : 1.5);
    }

    this.adaptiveTracker.onWaveStarted(waveLevel);
    soundEffects.playReinforcementsAlert();
    this.sectorStatusText = `Level ${waveLevel} Wave Active · ${this.enemyShips.length} ${this.activeFaction.toUpperCase()} Vessels`;

    this.onLogEvent?.(
      'TACTICAL',
      'warning',
      `Hostile Squadron Detected: Level ${waveLevel}`,
      `${fleetConfig.length} ${this.activeFaction.toUpperCase()} warships dropping out of warp.`
    );

    if (hasMothership) {
      this.onLogEvent?.(
        'TACTICAL',
        'critical',
        `FLAGSHIP MOTHERSHIP DETECTED!`,
        `${fleetConfig[0].name} has entered firing range!`
      );
    }
  }

  public update(
    delta: number,
    playerPos: THREE.Vector3,
    playerVelocity: THREE.Vector3,
    systemId: string,
    onPlayerHit: (damage: number) => void
  ) {
    // 1. Victory & Standoff wave progression handling
    // When all ships are destroyed, the sector is completely cleared and safe!
    // Triggers adaptive difficulty tracking to analyze player success and scale subsequent waves
    if (this.enemyShips.length === 0 && this.waveStatus === 'active') {
      this.waveStatus = 'cleared';
      this.reinforcementCountdown = 0; // ZERO countdown, NO automatic respawn!
      this.sectorStatusText = `Level ${this.combatWave} Cleared! Sector Secure.`;
      soundEffects.playVictoryChime();

      // Recalibrate hostile difficulty for subsequent waves
      this.adaptiveTracker.onWaveCleared(this.combatWave, this.onLogEvent);

      this.onLogEvent?.(
        'SECTOR',
        'success',
        'Enemy Wave Destroyed',
        `Level ${this.combatWave} ${this.activeFaction.toUpperCase()} battlegroup eliminated. Hostile tactical database updated.`
      );
    }

    // 2. Throttle concurrent attackers dynamically scaling with wave level and fleet intelligence
    const intelLevel = this.adaptiveTracker.fleetIntelligenceLevel;
    const maxSimultaneousAttackers = Math.min(6, 2 + Math.floor((this.combatWave - 1) * 0.8) + Math.floor(intelLevel * 0.4));
    let activeAttackers = 0;
    this.hasIncomingTorpedo = false;

    for (let i = this.enemyShips.length - 1; i >= 0; i--) {
      const enemy = this.enemyShips[i];
      if (!enemy.isAlive) {
        // Spatialized ship explosion
        this.explosionManager.triggerExplosion(enemy.mesh.position, enemy.isMothership ? 4.8 : 2.8);
        soundEffects.playExplosion(enemy.mesh.position);
        this.scene.remove(enemy.mesh);
        this.enemyShips.splice(i, 1);
        continue;
      }

      const dist = enemy.mesh.position.distanceTo(playerPos);
      const canFireNow = dist < 750 && activeAttackers < maxSimultaneousAttackers && enemy.fireCooldown <= 0;
      if (canFireNow) {
        activeAttackers++;
      }

      enemy.updateAI(
        delta,
        playerPos,
        playerVelocity,
        canFireNow,
        (origin, dir, color) => {
          const mat = color === 0xef4444 ? this.redBoltMat : (color === 0x10b981 ? this.greenBoltMat : this.cyanBoltMat);
          const pMesh = new THREE.Mesh(this.boltGeo, mat);
          pMesh.position.copy(origin);
          pMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
          this.scene.add(pMesh);

          // Substantial scaling damage per wave level AND dynamic adaptive difficulty multiplier!
          const waveMult = 1.0 + (this.combatWave - 1) * 0.35;
          const adaptiveMult = this.adaptiveTracker.adaptiveDamageMultiplier;
          const baseDmg = (enemy.isMothership ? 14.0 : 8.0) * waveMult * adaptiveMult;
          this.projectiles.push({
            mesh: pMesh,
            velocity: dir.clone().multiplyScalar(260),
            damage: baseDmg + Math.random() * 3.5,
            life: 0,
            maxLife: 3.5,
          });
        },
        (origin, dir) => {
          // Launch tracking heavy plasma/quantum torpedo scaled by adaptive difficulty
          const tMesh = new THREE.Mesh(this.enemyTorpedoGeo, this.enemyTorpedoMat);
          tMesh.position.copy(origin);
          this.scene.add(tMesh);

          const adaptiveMult = this.adaptiveTracker.adaptiveDamageMultiplier;
          const torpDmg = (30 + this.combatWave * 6.0) * (enemy.isMothership ? 1.45 : 1.0) * adaptiveMult;
          this.projectiles.push({
            mesh: tMesh,
            velocity: dir.clone().multiplyScalar(195),
            damage: torpDmg,
            life: 0,
            maxLife: 6.5,
            isTorpedo: true,
          });

          this.adaptiveTracker.recordTorpedoSpawned();
          soundEffects.playTorpedoIncomingWarning();
          this.onLogEvent?.(
            'TACTICAL',
            'critical',
            'INCOMING HEAVY TORPEDO DETECTED!',
            `${enemy.name} launched a tracking torpedo! Maneuver or engage thruster boost.`
          );
        },
        intelLevel,
        this.adaptiveTracker.predictiveLeadAim
      );
    }

    // 3. Update enemy projectiles & check hits on Enterprise
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life += delta;

      if (p.isTorpedo) {
        this.hasIncomingTorpedo = true;
        // Torpedo homing guidance toward player
        const toPlayer = playerPos.clone().sub(p.mesh.position).normalize();
        p.velocity.lerp(toPlayer.multiplyScalar(215), delta * 1.7);
        p.mesh.rotation.y += delta * 10;
      }

      p.mesh.position.addScaledVector(p.velocity, delta);

      if (p.mesh.position.distanceTo(playerPos) < (p.isTorpedo ? 28 : 22)) {
        onPlayerHit(p.damage);
        if (p.isTorpedo) {
          this.explosionManager.triggerExplosion(p.mesh.position, 2.5);
          soundEffects.playTorpedoImpact(p.mesh.position);
        }
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
        continue;
      }

      if (p.life >= p.maxLife) {
        // Torpedo timed out without hitting Enterprise: player successfully dodged/evaded!
        if (p.isTorpedo) {
          this.adaptiveTracker.recordTorpedoDodged();
        }
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
      }
    }
  }

  // --- PHOTON TORPEDO DEVASTATION HIT DETECTION ---
  public checkTorpedoHits(
    torpedoPos: THREE.Vector3,
    prevPos?: THREE.Vector3,
    hitRadius: number = 65
  ): { hit: boolean; enemyId?: string; destroyed?: boolean; shieldPercent?: number } {
    for (const enemy of this.enemyShips) {
      if (!enemy.isAlive) continue;

      const ePos = enemy.mesh.position;
      const targetHitRadius = enemy.isMothership ? hitRadius * 1.8 : hitRadius;
      let dist = ePos.distanceTo(torpedoPos);

      // Swept line segment test if prevPos is provided
      if (prevPos && dist > targetHitRadius) {
        const seg = torpedoPos.clone().sub(prevPos);
        const segLenSq = seg.lengthSq();
        if (segLenSq > 0.001) {
          const t = Math.max(0, Math.min(1, ePos.clone().sub(prevPos).dot(seg) / segLenSq));
          const closestPoint = prevPos.clone().add(seg.multiplyScalar(t));
          dist = ePos.distanceTo(closestPoint);
        }
      }

      if (dist <= targetHitRadius) {
        // High-yield photon torpedo: antimatter disruption warhead impacts hostile deflector shields!
        const destroyed = enemy.takeDamage(150, true);
        enemy.triggerShieldFlare();
        this.adaptiveTracker.recordTorpedoHit();
        this.adaptiveTracker.recordDamageDealt(150);

        this.explosionManager.triggerExplosion(torpedoPos, enemy.isMothership ? 4.2 : 2.8);
        soundEffects.playTorpedoImpact(torpedoPos);

        if (enemy.shieldPercent > 0) {
          this.onLogEvent?.(
            'WEAPONS',
            'combat',
            `Torpedo Hit on Shields: ${enemy.name}`,
            `Antimatter warhead weakened ${enemy.shipClass} shields to ${Math.round(enemy.shieldPercent)}%!`
          );
        } else {
          this.onLogEvent?.(
            'WEAPONS',
            'critical',
            `Direct Torpedo Hull Breach: ${enemy.name}`,
            `Shields collapsed! Hull structural integrity at ${Math.round(enemy.hullPercent)}%.`
          );
        }

        if (destroyed) {
          this.totalHostilesDestroyed++;
          this.adaptiveTracker.recordKill(enemy.shipClass, enemy.isMothership, this.onLogEvent);
          soundEffects.playExplosion(enemy.mesh.position);
          this.onLogEvent?.(
            'DAMAGE',
            'critical',
            `Enemy Vessel Destroyed: ${enemy.name}`,
            `${enemy.shipClass} destroyed in catastrophic core breach.`
          );
        }

        return { hit: true, enemyId: enemy.id, destroyed, shieldPercent: enemy.shieldPercent };
      }
    }
    return { hit: false };
  }

  // Continuous Phaser beam damage (55/sec)
  public hitEnemy(enemyId: string, damage: number): boolean {
    const enemy = this.enemyShips.find((e) => e.id === enemyId);
    if (!enemy || !enemy.isAlive) return false;

    const destroyed = enemy.takeDamage(damage, false);
    this.adaptiveTracker.recordDamageDealt(damage);

    if (destroyed) {
      this.totalHostilesDestroyed++;
      this.adaptiveTracker.recordKill(enemy.shipClass, enemy.isMothership, this.onLogEvent);
      this.explosionManager.triggerExplosion(enemy.mesh.position, enemy.isMothership ? 4.5 : 2.6);
      soundEffects.playExplosion(enemy.mesh.position);
      this.onLogEvent?.(
        'DAMAGE',
        'critical',
        `Enemy Vessel Destroyed: ${enemy.name}`,
        `${enemy.shipClass} disintegrated by collimated phasers.`
      );
    } else if (enemy.canTriggerHitExplosion()) {
      this.explosionManager.triggerExplosion(enemy.mesh.position, 0.8);
      soundEffects.playShieldHit(enemy.mesh.position);
    }

    return destroyed;
  }

  public getEnemyStates(playerPos: THREE.Vector3): EnemyShipState[] {
    return this.enemyShips.map((e) => e.toState(playerPos));
  }

  public getCombatWaveState(): CombatWaveState {
    const mothership = this.enemyShips.find((e) => e.isMothership && e.isAlive);
    const progression = this.adaptiveTracker.getProgression();
    const threatLevel: 'Standard' | 'Elevated' | 'Severe' | 'Critical' | 'Extreme' | 'Lethal' =
      this.combatWave <= 1 ? 'Standard' :
      this.combatWave === 2 ? 'Elevated' :
      this.combatWave === 3 ? 'Severe' :
      this.combatWave === 4 ? 'Critical' :
      this.combatWave === 5 ? 'Extreme' : 'Lethal';

    const baseArmorMult = 1.0 + (this.combatWave - 1) * 0.55;
    const baseFirepowerMult = 1.0 + (this.combatWave - 1) * 0.35;
    const adaptiveMult = this.adaptiveTracker.adaptiveDamageMultiplier;
    const totalFirepowerMult = Number((baseFirepowerMult * adaptiveMult).toFixed(2));

    const armorPct = Math.round((baseArmorMult - 1) * 100);
    const firepowerPct = Math.round((totalFirepowerMult - 1) * 100);
    const metrics = this.adaptiveTracker.getMetrics();

    return {
      level: this.combatWave,
      status: this.waveStatus,
      activeFaction: this.activeFaction,
      countdown: Math.max(0, Math.ceil(this.reinforcementCountdown)),
      totalEnemiesInWave: this.enemyShips.length,
      enemiesAlive: this.enemyShips.filter((e) => e.isAlive).length,
      mothershipAlive: !!mothership,
      sectorStatusText: this.sectorStatusText,
      threatLevel,
      difficultyModifier: `Armor +${armorPct}% · Firepower +${firepowerPct}% (Adaptive x${adaptiveMult}) · AI: ${metrics.fleetIntelligenceTier}`,
      armorMultiplier: baseArmorMult,
      firepowerMultiplier: totalFirepowerMult,
      adaptiveDifficulty: metrics,
      progression,
    };
  }

  // Completely removes all enemy ships and active hostile projectiles from scene
  public clearAllHostiles() {
    for (const ship of this.enemyShips) {
      if (ship.mesh) {
        this.scene.remove(ship.mesh);
        ship.mesh.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.geometry?.dispose();
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((m) => m.dispose());
            } else if (mesh.material) {
              mesh.material.dispose();
            }
          }
        });
      }
    }
    this.enemyShips = [];

    for (const p of this.projectiles) {
      if (p.mesh) {
        this.scene.remove(p.mesh);
      }
    }
    this.projectiles = [];
    this.hasIncomingTorpedo = false;
  }

  // Resets to initial starting standby state (Sector 001 Earth peaceful exploration)
  public resetToInitialStandby() {
    this.clearAllHostiles();
    this.combatWave = 1;
    this.totalHostilesDestroyed = 0;
    this.waveStatus = 'standby';
    this.reinforcementCountdown = 0;
    this.hasIncomingTorpedo = false;
    this.sectorStatusText = 'Sector 001 Earth · Territory Secure';
    this.adaptiveTracker.resetAllProgress();
  }

  public retryWave() {
    this.clearAllHostiles();
    this.adaptiveTracker.rollbackToWaveStart();
    this.hasIncomingTorpedo = false;
  }

  public dispose() {
    for (const enemy of this.enemyShips) {
      this.scene.remove(enemy.mesh);
    }
    for (const p of this.projectiles) {
      this.scene.remove(p.mesh);
    }
    this.enemyShips = [];
    this.projectiles = [];
    this.boltGeo.dispose();
    this.redBoltMat.dispose();
    this.greenBoltMat.dispose();
    this.cyanBoltMat.dispose();
  }
}
