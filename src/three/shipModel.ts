import * as THREE from 'three';

export interface EnterpriseComponents {
  root: THREE.Group;
  saucer: THREE.Group;
  secondaryHull: THREE.Group;
  deflectorDish: THREE.Mesh;
  deflectorGlow: THREE.PointLight;
  bussardLeft: THREE.Mesh;
  bussardRight: THREE.Mesh;
  bussardGlowLeft: THREE.PointLight;
  bussardGlowRight: THREE.PointLight;
  warpCoilsLeft: THREE.Mesh;
  warpCoilsRight: THREE.Mesh;
  impulseEngine: THREE.Mesh;
  impulseGlow: THREE.PointLight;
  shieldBubble: THREE.Mesh;
  phaserOriginLeft: THREE.Vector3;
  phaserOriginRight: THREE.Vector3;
  torpedoOrigin: THREE.Vector3;
  subsystemNodes: Map<string, THREE.Vector3>;
}

// Helper to draw text along a circular arc in 2D canvas with crisp rendering
function drawCurvedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  centerY: number,
  radius: number,
  angleCenter: number,
  letterSpacingAngle: number
) {
  const chars = text.split('');
  const totalAngle = (chars.length - 1) * letterSpacingAngle;
  let currentAngle = angleCenter - totalAngle / 2;

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    if (char !== ' ') {
      ctx.save();
      const x = centerX + Math.cos(currentAngle) * radius;
      const y = centerY + Math.sin(currentAngle) * radius;
      ctx.translate(x, y);
      // Align character upright along the circle tangent, tops pointing towards bridge, upright on screen
      ctx.rotate(currentAngle + Math.PI / 2);
      ctx.scale(1, -1);
      ctx.strokeText(char, 0, 0);
      ctx.fillText(char, 0, 0);
      ctx.restore();
    }
    currentAngle += letterSpacingAngle;
  }
}

// High-resolution procedural texture generator for the Primary Saucer Dorsal Hull
// Faithfully recreates the authentic studio model as shown in the Star Trek reference schematic:
// - Arched "U.S.S. ENTERPRISE" curved along forward hull
// - Arched bold "NCC-1701" curved concentric to ship name along outer forward hull
// - Concentric Aztec plating rings & radial seam lines
// - Starfleet red speed pennants with gold command deltas
// - Teardrop bridge deck plate & sensor calibration markings
function createSaucerDorsalTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 2048;
  const ctx = canvas.getContext('2d')!;

  const centerX = 1024;
  const centerY = 1024;

  // Starfleet pearlescent hull base
  ctx.fillStyle = '#dce5ef';
  ctx.fillRect(0, 0, 2048, 2048);

  // 1. Concentric Aztec Plating Rings
  const rings = 22;
  for (let r = 1; r <= rings; r++) {
    const radius = r * 44;
    const segments = r * 10;
    for (let s = 0; s < segments; s++) {
      if ((s + r) % 2 === 0) {
        ctx.beginPath();
        const a1 = (s / segments) * Math.PI * 2;
        const a2 = ((s + 0.94) / segments) * Math.PI * 2;
        ctx.arc(centerX, centerY, radius, a1, a2);
        ctx.arc(centerX, centerY, radius - 36, a2, a1, true);
        ctx.closePath();
        ctx.fillStyle = (s * r) % 3 === 0 ? '#cbd6e2' : '#bcc8d6';
        ctx.fill();
      }
    }
  }

  // 2. Radial Seam Lines & Panel Divisions
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1.8;
  for (let i = 0; i < 48; i++) {
    const angle = (i / 48) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(centerX + Math.cos(angle) * 140, centerY + Math.sin(angle) * 140);
    ctx.lineTo(centerX + Math.cos(angle) * 980, centerY + Math.sin(angle) * 980);
    ctx.stroke();
  }

  // 3. Concentric Panel Rings
  ctx.lineWidth = 2.2;
  for (const pr of [240, 420, 560, 720, 860, 960]) {
    ctx.beginPath();
    ctx.arc(centerX, centerY, pr, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 4. Starfleet Perimeter Sensor Rectangles (from attached reference image)
  ctx.fillStyle = '#f8fafc';
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2;
  for (const angleDeg of [45, 135, 225, 315]) {
    const a = (angleDeg * Math.PI) / 180;
    const px = centerX + Math.cos(a) * 880;
    const py = centerY + Math.sin(a) * 880;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(a + Math.PI / 2);
    ctx.fillRect(-28, -14, 56, 28);
    ctx.strokeRect(-28, -14, 56, 28);
    ctx.restore();
  }

  // 5. Starfleet Red Pennant Banners (Speed Stripes with Arrowhead Delta Insignia)
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(side * (Math.PI * 0.28));

    // Red speed chevron stripe
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.moveTo(-18, -260);
    ctx.lineTo(18, -260);
    ctx.lineTo(34, -760);
    ctx.lineTo(-34, -760);
    ctx.closePath();
    ctx.fill();

    // White border outline
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Golden Starfleet Command Arrowhead Delta
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(0, -680);
    ctx.lineTo(16, -630);
    ctx.lineTo(0, -645);
    ctx.lineTo(-16, -630);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  // 6. Forward Teardrop Bridge Base & Sensor Ports (matching attached image)
  ctx.fillStyle = '#d3dde9';
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(centerX, centerY - 130, 150, 220, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Amber inspection sensor squares on forward teardrop
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(centerX - 36, centerY - 250, 22, 22);
  ctx.fillRect(centerX + 14, centerY - 250, 22, 22);

  // 7. ICONIC ARCHED TEXT: "U.S.S. ENTERPRISE" (matching attached image)
  // Arched text around forward quadrant concentric to outer registry
  ctx.fillStyle = '#050914';
  ctx.strokeStyle = '#050914';
  ctx.lineWidth = 2.5;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 56px "Arial", "Helvetica", sans-serif';

  drawCurvedText(
    ctx,
    'U.S.S. ENTERPRISE',
    centerX,
    centerY,
    600,
    -Math.PI / 2,
    0.046
  );

  // 8. ICONIC ARCHED REGISTRY NUMBER: "NCC-1701" (matching attached image)
  // Large bold Starfleet block lettering curved along the outer forward saucer
  ctx.font = '900 124px "Arial Black", "Arial", "Impact", sans-serif';
  ctx.lineWidth = 3.5;
  drawCurvedText(
    ctx,
    'NCC-1701',
    centerX,
    centerY,
    780,
    -Math.PI / 2,
    0.092
  );

  // 9. Phaser Bank Targeting Emplacements (Dorsal forward port & starboard)
  for (const side of [-1, 1]) {
    const px = centerX + side * 360;
    const py = centerY - 320;
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(px, py, 42, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(px, py, 16, 0, Math.PI * 2);
    ctx.fill();
  }

  // 10. Bridge Module Base Ring & Maintenance Markings
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(centerX, centerY, 190, 0, Math.PI * 2);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 16;
  texture.needsUpdate = true;
  return texture;
}

// Ventral Saucer Texture with Planetary Sensor Grid & Underside Registry
function createSaucerVentralTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  const centerX = 512;
  const centerY = 512;

  ctx.fillStyle = '#d8e1ec';
  ctx.fillRect(0, 0, 1024, 1024);

  // Concentric Sensor Grid
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 2;
  for (let r = 80; r < 480; r += 50) {
    ctx.beginPath();
    ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(centerX + Math.cos(a) * 90, centerY + Math.sin(a) * 90);
    ctx.lineTo(centerX + Math.cos(a) * 460, centerY + Math.sin(a) * 460);
    ctx.stroke();
  }

  // Underside Registry
  ctx.font = '900 64px "Arial Black", "Arial", sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.save();
  ctx.translate(centerX, centerY + 300);
  ctx.scale(1, -1);
  ctx.fillText('NCC - 1701', 0, 0);
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 16;
  texture.needsUpdate = true;
  return texture;
}

// High-resolution Starfleet warp nacelle outboard pennant texture
function createNacellePennantTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 1024, 128);

  // Red speed chevron pennant stripe (pointing forward towards right)
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.moveTo(30, 24);
  ctx.lineTo(960, 48);
  ctx.lineTo(960, 80);
  ctx.lineTo(30, 104);
  ctx.closePath();
  ctx.fill();

  // White border pinstripe
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Golden Starfleet Command Arrowhead Delta at forward tip
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.moveTo(980, 64);
  ctx.lineTo(935, 36);
  ctx.lineTo(948, 64);
  ctx.lineTo(935, 92);
  ctx.closePath();
  ctx.fill();

  // Crisp bold white NCC-1701 registry text along the pennant
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 50px "Arial Black", "Arial", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('NCC - 1701', 500, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 16;
  texture.needsUpdate = true;
  return texture;
}

// Secondary Hull Texture with Starfleet Pennants & Plating
function createHullTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#c5cfdc';
  ctx.fillRect(0, 0, 1024, 1024);

  // Hull Plating Grid
  ctx.strokeStyle = '#788699';
  ctx.lineWidth = 2;
  for (let y = 0; y < 1024; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y);
    ctx.stroke();
  }
  for (let x = 0; x < 1024; x += 96) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 1024);
    ctx.stroke();
  }

  // Starfleet Pennant Banners along hull sides
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.moveTo(80, 360);
  ctx.lineTo(580, 420);
  ctx.lineTo(80, 480);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 38px sans-serif';
  ctx.fillText('NCC - 1701', 130, 432);

  // Gold delta
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.moveTo(560, 420);
  ctx.lineTo(530, 400);
  ctx.lineTo(540, 420);
  ctx.lineTo(530, 440);
  ctx.closePath();
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 16;
  texture.needsUpdate = true;
  return texture;
}

// Builds planar top-down UV coordinates for circular saucer geometry so texture maps without pinch
function applyPlanarTopDownUVs(geo: THREE.BufferGeometry, radius: number) {
  const pos = geo.attributes.position;
  const uvs = new Float32Array(pos.count * 2);

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    // Orthographic top-down projection onto 0..1 UV coordinate space:
    // x: -radius .. +radius => u: 0.0 .. 1.0 (starboard +X is right, port -X is left)
    // z: -radius .. +radius => v: 0.0 .. 1.0 (forward +Z is top of canvas, aft -Z is bottom)
    uvs[i * 2] = (x / (2 * radius)) + 0.5;
    uvs[i * 2 + 1] = (z / (2 * radius)) + 0.5;
  }

  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
}

export function buildEnterpriseModel(): EnterpriseComponents {
  const root = new THREE.Group();
  root.name = 'USS_Enterprise_NCC1701';

  const subsystemNodes = new Map<string, THREE.Vector3>();

  const saucerDorsalTex = createSaucerDorsalTexture();
  const saucerVentralTex = createSaucerVentralTexture();
  const hullTex = createHullTexture();
  const nacellePennantTex = createNacellePennantTexture();

  // Starfleet Pearlescent Hull Materials
  const starfleetHullMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.28,
    roughness: 0.35,
  });

  const saucerDorsalMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: saucerDorsalTex,
    metalness: 0.28,
    roughness: 0.32,
  });

  const saucerVentralMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: saucerVentralTex,
    metalness: 0.28,
    roughness: 0.35,
  });

  const engineeringHullMat = new THREE.MeshStandardMaterial({
    color: 0xd8e1ec,
    map: hullTex,
    metalness: 0.32,
    roughness: 0.35,
  });

  const accentMetalMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.8,
    roughness: 0.25,
  });

  // Authentic TOS Copper/Amber Metallic Material for the Navigational Deflector
  const copperDeflectorMat = new THREE.MeshStandardMaterial({
    color: 0xd97706, // Rich copper/amber gold
    emissive: 0xb45309, // Glowing amber
    emissiveIntensity: 2.2,
    metalness: 0.92,
    roughness: 0.16,
  });

  const rcsGoldMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    metalness: 0.9,
    roughness: 0.2,
  });

  const windowMat = new THREE.MeshBasicMaterial({
    color: 0xfef08a, // Warm illuminated cabin light
  });

  // Navigation Beacon Materials
  const redBeaconMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
  const greenBeaconMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
  const whiteBeaconMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

  // ==========================================
  // 1. PRIMARY HULL (SAUCER SECTION)
  // ==========================================
  // Layout: Wide, flattened circular disk housing command deck and crew quarters.
  const saucerGroup = new THREE.Group();
  saucerGroup.position.set(0, 1.8, 4.2);

  const saucerRadius = 14.5;

  // Upper Saucer convex dome (shallow cone with smooth curvature)
  // Maps the high-resolution dorsal Aztec hull and arched U.S.S. ENTERPRISE NCC-1701 directly onto the 3D hull!
  const upperSaucerGeo = new THREE.CylinderGeometry(3.6, saucerRadius, 1.25, 96);
  applyPlanarTopDownUVs(upperSaucerGeo, saucerRadius);
  const upperSaucer = new THREE.Mesh(upperSaucerGeo, saucerDorsalMat);
  upperSaucer.position.y = 0.62;
  saucerGroup.add(upperSaucer);

  // Lower Saucer inverted convex dome with ventral planetary sensor grid & registry
  const lowerSaucerGeo = new THREE.CylinderGeometry(saucerRadius, 3.2, 1.5, 96);
  applyPlanarTopDownUVs(lowerSaucerGeo, saucerRadius);
  const lowerSaucer = new THREE.Mesh(lowerSaucerGeo, saucerVentralMat);
  lowerSaucer.position.y = -0.75;
  saucerGroup.add(lowerSaucer);

  // Smooth outer edge rim ring
  const saucerRimGeo = new THREE.CylinderGeometry(saucerRadius + 0.04, saucerRadius + 0.04, 0.42, 96);
  const saucerRim = new THREE.Mesh(saucerRimGeo, accentMetalMat);
  saucerRim.position.y = 0.0;
  saucerGroup.add(saucerRim);

  // Rim Windows: Linear rows of rectangular structural windows (48 illuminated ports)
  const windowCount = 48;
  for (let i = 0; i < windowCount; i++) {
    const angle = (i / windowCount) * Math.PI * 2;
    const winGeo = new THREE.BoxGeometry(0.35, 0.16, 0.08);
    const winMesh = new THREE.Mesh(winGeo, windowMat);
    winMesh.position.set(Math.sin(angle) * (saucerRadius - 0.02), 0.0, Math.cos(angle) * (saucerRadius - 0.02));
    winMesh.rotation.y = angle;
    saucerGroup.add(winMesh);
  }

  // Forward Observation Lounge Cluster (Upper rim cluster)
  for (let w = -4; w <= 4; w++) {
    const a = w * 0.035;
    const winGeo = new THREE.BoxGeometry(0.42, 0.32, 0.1);
    const loungeWin = new THREE.Mesh(winGeo, windowMat);
    loungeWin.position.set(Math.sin(a) * (saucerRadius - 0.25), 0.42, Math.cos(a) * (saucerRadius - 0.25));
    loungeWin.rotation.y = a;
    saucerGroup.add(loungeWin);
  }

  // Navigation Running Lights: Red Port, Green Starboard, White Strobes
  // Port (Left) Red Running Light
  const portNavBeacon = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 16), redBeaconMat);
  portNavBeacon.position.set(-saucerRadius - 0.08, 0.0, 0.0);
  saucerGroup.add(portNavBeacon);

  // Starboard (Right) Green Running Light
  const stbdNavBeacon = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 16), greenBeaconMat);
  stbdNavBeacon.position.set(saucerRadius + 0.08, 0.0, 0.0);
  saucerGroup.add(stbdNavBeacon);

  // White Dorsal & Aft Strobes
  const whiteAftStrobe = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), whiteBeaconMat);
  whiteAftStrobe.position.set(0, 0.5, -saucerRadius + 0.1);
  saucerGroup.add(whiteAftStrobe);

  // RCS Attitude Thruster Quads (4 quadrants at 45° angles)
  for (let q = 0; q < 4; q++) {
    const qAngle = (q * Math.PI / 2) + Math.PI / 4;
    const rcsGeo = new THREE.BoxGeometry(0.85, 0.42, 0.5);
    const rcs = new THREE.Mesh(rcsGeo, rcsGoldMat);
    rcs.position.set(Math.sin(qAngle) * (saucerRadius - 0.2), 0.0, Math.cos(qAngle) * (saucerRadius - 0.2));
    rcs.rotation.y = qAngle;
    saucerGroup.add(rcs);
  }

  // --- Bridge Dome ---
  // Prominent, raised circular dome centered on the dorsal surface with Deck 1 & 2 terraces
  const bridgeTerraceGeo = new THREE.CylinderGeometry(2.4, 3.8, 0.45, 32);
  const bridgeTerrace = new THREE.Mesh(bridgeTerraceGeo, starfleetHullMat);
  bridgeTerrace.position.y = 1.48;
  saucerGroup.add(bridgeTerrace);

  const bridgeBaseGeo = new THREE.CylinderGeometry(1.8, 2.5, 0.5, 32);
  const bridgeBase = new THREE.Mesh(bridgeBaseGeo, starfleetHullMat);
  bridgeBase.position.y = 1.95;
  saucerGroup.add(bridgeBase);

  // Raised Circular Command Bridge Dome
  const bridgeDomeGeo = new THREE.SphereGeometry(1.3, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
  const bridgeDome = new THREE.Mesh(bridgeDomeGeo, new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    metalness: 0.55,
    roughness: 0.2,
  }));
  bridgeDome.position.y = 2.2;
  saucerGroup.add(bridgeDome);

  // White Command Beacon atop Bridge Dome
  const bridgeBeacon = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), whiteBeaconMat);
  bridgeBeacon.position.set(0, 3.5, 0);
  saucerGroup.add(bridgeBeacon);

  // Aft Turbolift shaft elevator housing on Bridge
  const turboliftHumpGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.8, 16);
  const turboliftHump = new THREE.Mesh(turboliftHumpGeo, accentMetalMat);
  turboliftHump.position.set(0.35, 2.25, -1.1);
  saucerGroup.add(turboliftHump);

  subsystemNodes.set('bridge', new THREE.Vector3(0, 4.1, 4.2));

  // --- Deflector Dish / Planetary Sensor Array (Ventral Saucer) ---
  // Circular grid pattern and planetary sensor array housing centered on bottom
  const lowerSensorHousing = new THREE.Mesh(
    new THREE.CylinderGeometry(3.2, 2.4, 0.45, 32),
    accentMetalMat
  );
  lowerSensorHousing.position.y = -1.6;
  saucerGroup.add(lowerSensorHousing);

  const lowerSensorGeo = new THREE.SphereGeometry(2.1, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
  const lowerSensor = new THREE.Mesh(lowerSensorGeo, new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    emissive: 0x38bdf8,
    emissiveIntensity: 1.2,
    metalness: 0.85,
  }));
  lowerSensor.rotation.x = Math.PI;
  lowerSensor.position.y = -1.75;
  saucerGroup.add(lowerSensor);

  // Concentric glowing blue sensor ring
  const sensorRingGeo = new THREE.TorusGeometry(1.4, 0.12, 16, 32);
  const sensorRing = new THREE.Mesh(sensorRingGeo, new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
  sensorRing.rotation.x = Math.PI / 2;
  sensorRing.position.y = -2.2;
  saucerGroup.add(sensorRing);

  subsystemNodes.set('sensor_array', new THREE.Vector3(0, 0.15, 4.2));

  // --- Trailing Impulse Engines (saucer aft) ---
  const impulseHousingGeo = new THREE.BoxGeometry(4.2, 1.35, 2.6);
  const impulseHousing = new THREE.Mesh(impulseHousingGeo, accentMetalMat);
  impulseHousing.position.set(0, 0.45, -13.2);
  saucerGroup.add(impulseHousing);

  // Dual Impulse engine plasma crystal ports
  const impulseGlowGeo = new THREE.BoxGeometry(3.4, 0.65, 0.2);
  const impulseMat = new THREE.MeshStandardMaterial({
    color: 0xff3b30,
    emissive: 0xff2200,
    emissiveIntensity: 2.5,
  });
  const impulseEngine = new THREE.Mesh(impulseGlowGeo, impulseMat);
  impulseEngine.position.set(0, 0.45, -14.45);
  saucerGroup.add(impulseEngine);

  const impulseGlow = new THREE.PointLight(0xff3b30, 2.5, 18);
  impulseGlow.position.set(0, 0.45, -14.9);
  saucerGroup.add(impulseGlow);

  subsystemNodes.set('impulse_engines', new THREE.Vector3(0, 2.25, -9.0));

  // Twin Phaser Turret Emitters (Dorsal & Ventral)
  const phaserBankGeo = new THREE.CylinderGeometry(0.38, 0.52, 0.28, 16);
  const phaserBankLeft = new THREE.Mesh(phaserBankGeo, accentMetalMat);
  phaserBankLeft.position.set(-3.5, 1.25, 6.2);
  saucerGroup.add(phaserBankLeft);

  const phaserBankRight = new THREE.Mesh(phaserBankGeo, accentMetalMat);
  phaserBankRight.position.set(3.5, 1.25, 6.2);
  saucerGroup.add(phaserBankRight);

  const phaserOriginLeft = new THREE.Vector3(-3.5, 3.4, 10.4);
  const phaserOriginRight = new THREE.Vector3(3.5, 3.4, 10.4);
  subsystemNodes.set('phaser_banks', new THREE.Vector3(0, 3.4, 10.4));

  root.add(saucerGroup);

  // ==========================================
  // 2. DORSAL CONNECTING NECK
  // ==========================================
  // Swept-back neck connecting secondary hull to saucer
  const neckGroup = new THREE.Group();
  neckGroup.position.set(0, 0.3, 1.0);

  const neckGeo = new THREE.BoxGeometry(1.6, 2.7, 5.6);
  const neckMesh = new THREE.Mesh(neckGeo, engineeringHullMat);
  neckMesh.rotation.x = 0.18; // Swept back angle
  neckGroup.add(neckMesh);

  // Forward Photon Torpedo Launcher Bay at base of neck
  const torpedoTubesHousing = new THREE.Mesh(
    new THREE.BoxGeometry(2.1, 1.1, 1.9),
    accentMetalMat
  );
  torpedoTubesHousing.position.set(0, -0.65, 2.6);
  neckGroup.add(torpedoTubesHousing);

  // Twin launcher apertures
  const tubeLeft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.24, 0.45, 16),
    new THREE.MeshBasicMaterial({ color: 0xef4444 })
  );
  tubeLeft.rotation.x = Math.PI / 2;
  tubeLeft.position.set(-0.52, -0.65, 3.45);
  neckGroup.add(tubeLeft);

  const tubeRight = tubeLeft.clone();
  tubeRight.position.set(0.52, -0.65, 3.45);
  neckGroup.add(tubeRight);

  const torpedoOrigin = new THREE.Vector3(0, -0.35, 4.4);
  subsystemNodes.set('torpedo_bay', torpedoOrigin.clone());

  root.add(neckGroup);

  // ==========================================
  // 3. SECONDARY HULL (ENGINEERING BODY)
  // ==========================================
  // Layout: Elongated, tear-drop or cigar-shaped main body beneath saucer
  const secondaryHull = new THREE.Group();
  secondaryHull.position.set(0, -2.4, -3.2);

  // Main engineering hull tapered cigar/teardrop body (tapering from bow to stern)
  const secHullGeo = new THREE.CylinderGeometry(3.3, 2.1, 18.5, 32);
  const secHullMesh = new THREE.Mesh(secHullGeo, engineeringHullMat);
  secHullMesh.rotation.x = Math.PI / 2;
  secondaryHull.add(secHullMesh);

  // Arboretum panoramic illuminated windows on flanks
  for (const side of [-1, 1]) {
    const arboGeo = new THREE.BoxGeometry(0.1, 0.6, 4.8);
    const arboMesh = new THREE.Mesh(arboGeo, windowMat);
    arboMesh.position.set(side * 3.2, 0.1, 1.2);
    secondaryHull.add(arboMesh);
  }

  subsystemNodes.set('warp_core', new THREE.Vector3(0, -2.4, -3.2));

  // --- Navigational Deflector (Classic Amber / Copper Parabolic Dish) ---
  // Large, amber or copper-colored parabolic dish mounted at the front nose of secondary hull
  const deflectorHousingGeo = new THREE.CylinderGeometry(3.4, 3.3, 1.4, 32);
  const deflectorHousing = new THREE.Mesh(deflectorHousingGeo, accentMetalMat);
  deflectorHousing.rotation.x = Math.PI / 2;
  deflectorHousing.position.set(0, 0, 9.6);
  secondaryHull.add(deflectorHousing);

  // Iconic Parabolic Copper/Amber Dish
  const dishGeo = new THREE.SphereGeometry(2.5, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.45);
  const deflectorDish = new THREE.Mesh(dishGeo, copperDeflectorMat);
  deflectorDish.rotation.x = -Math.PI / 2;
  deflectorDish.position.set(0, 0, 10.1);
  secondaryHull.add(deflectorDish);

  // Bronze & Gold Deflector Bezel Ring
  const bezelGeo = new THREE.TorusGeometry(2.55, 0.16, 16, 32);
  const bezelMesh = new THREE.Mesh(bezelGeo, rcsGoldMat);
  bezelMesh.position.set(0, 0, 10.1);
  secondaryHull.add(bezelMesh);

  // Central copper emitter spike probe
  const spikeGeo = new THREE.ConeGeometry(0.42, 1.8, 16);
  const emitterSpike = new THREE.Mesh(spikeGeo, rcsGoldMat);
  emitterSpike.rotation.x = Math.PI / 2;
  emitterSpike.position.set(0, 0, 10.9);
  secondaryHull.add(emitterSpike);

  // Concentric emitter rings on copper dish
  const emitterInnerRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.2, 0.08, 16, 32),
    rcsGoldMat
  );
  emitterInnerRing.position.set(0, 0, 10.3);
  secondaryHull.add(emitterInnerRing);

  // Navigational Deflector Amber Glow PointLight
  const deflectorGlow = new THREE.PointLight(0xf59e0b, 3.8, 30);
  deflectorGlow.position.set(0, 0, 11.5);
  secondaryHull.add(deflectorGlow);

  subsystemNodes.set('deflector_dish', new THREE.Vector3(0, -2.4, 7.8));

  // --- Hangar Bay (Shuttlebay at Extreme Aft End) ---
  // Large double doors for shuttlecraft access with curved archway
  const shuttlebayArchGeo = new THREE.CylinderGeometry(2.35, 1.95, 2.8, 32, 1, false, 0, Math.PI);
  const shuttlebayDoors = new THREE.Mesh(shuttlebayArchGeo, accentMetalMat);
  shuttlebayDoors.rotation.x = Math.PI / 2;
  shuttlebayDoors.position.set(0, 0.4, -9.4);
  secondaryHull.add(shuttlebayDoors);

  // Double Clamshell Vertical Door Seam
  const doorSeamGeo = new THREE.BoxGeometry(0.08, 2.2, 0.08);
  const doorSeam = new THREE.Mesh(doorSeamGeo, new THREE.MeshBasicMaterial({ color: 0x0f172a }));
  doorSeam.position.set(0, 0.8, -10.8);
  secondaryHull.add(doorSeam);

  // Shuttlebay Observation Control Booth
  const boothGeo = new THREE.BoxGeometry(1.6, 0.45, 0.8);
  const boothMesh = new THREE.Mesh(boothGeo, windowMat);
  boothMesh.position.set(0, 2.1, -9.2);
  secondaryHull.add(boothMesh);

  // Approach flight deck runway guide lights (green & amber markers)
  for (let r = 0; r < 6; r++) {
    const runLightGeo = new THREE.BoxGeometry(0.12, 0.08, 0.35);
    const runLightMat = new THREE.MeshBasicMaterial({ color: r === 0 ? 0xf59e0b : 0x10b981 });
    const runLeft = new THREE.Mesh(runLightGeo, runLightMat);
    runLeft.position.set(-1.25, 0.35, -7.8 - r * 0.55);
    secondaryHull.add(runLeft);

    const runRight = runLeft.clone();
    runRight.position.x = 1.25;
    secondaryHull.add(runRight);
  }

  subsystemNodes.set('shuttlebay', new THREE.Vector3(0, -2.0, -12.4));

  root.add(secondaryHull);

  // ==========================================
  // 4. NACELLE SUPPORT PYLONS
  // ==========================================
  // Angled pylons sweeping upward and outward from rear sides of secondary hull
  const pylonMat = starfleetHullMat;
  const pylonGeo = new THREE.BoxGeometry(0.68, 8.8, 3.1);

  // Left (Port) Pylon
  const pylonLeft = new THREE.Mesh(pylonGeo, pylonMat);
  pylonLeft.position.set(-5.0, 1.3, -6.6);
  pylonLeft.rotation.z = -Math.PI * 0.25; // 45 degree upward/outward sweep
  pylonLeft.rotation.x = -0.16;
  root.add(pylonLeft);

  // Right (Starboard) Pylon
  const pylonRight = new THREE.Mesh(pylonGeo, pylonMat);
  pylonRight.position.set(5.0, 1.3, -6.6);
  pylonRight.rotation.z = Math.PI * 0.25; // 45 degree upward/outward sweep
  pylonRight.rotation.x = -0.16;
  root.add(pylonRight);

  // ==========================================
  // 5. TWIN WARP NACELLES (PORT & STARBOARD)
  // ==========================================
  // Layout: Two long, cylindrical engine pods with glowing Bussard collectors and linear exhaust grilles
  const nacelleRadius = 1.48;
  const nacelleLength = 27.0;

  const nacelleGeo = new THREE.CylinderGeometry(nacelleRadius, nacelleRadius * 0.88, nacelleLength, 32);

  // Bussard Collector Hemispherical Domes
  const bussardGeo = new THREE.SphereGeometry(nacelleRadius, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
  const bussardMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xf97316,
    emissiveIntensity: 2.8,
    roughness: 0.12,
  });

  // Inner Bussard rotating intake turbine vanes effect
  const turbineGeo = new THREE.CylinderGeometry(nacelleRadius * 0.72, nacelleRadius * 0.72, 0.4, 8);
  const turbineMat = new THREE.MeshStandardMaterial({
    color: 0xffedd5,
    emissive: 0xff7700,
    emissiveIntensity: 3.5,
  });

  // Linear Warp Field Exhaust Grilles (Inboard and Outboard)
  const coilGeo = new THREE.BoxGeometry(0.36, 0.95, nacelleLength * 0.70);
  const coilMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    emissive: 0x0ea5e9,
    emissiveIntensity: 2.2,
    roughness: 0.15,
  });

  // --- PORT NACELLE ---
  const nacelleLeftGroup = new THREE.Group();
  nacelleLeftGroup.position.set(-9.0, 4.4, -4.6);

  const nacelleLeftBody = new THREE.Mesh(nacelleGeo, engineeringHullMat);
  nacelleLeftBody.rotation.x = Math.PI / 2;
  nacelleLeftGroup.add(nacelleLeftBody);

  // Forward Bussard Collector Dome
  const bussardLeft = new THREE.Mesh(bussardGeo, bussardMat.clone());
  bussardLeft.rotation.x = Math.PI / 2;
  bussardLeft.position.set(0, 0, nacelleLength / 2);
  nacelleLeftGroup.add(bussardLeft);

  const turbineLeft = new THREE.Mesh(turbineGeo, turbineMat.clone());
  turbineLeft.rotation.x = Math.PI / 2;
  turbineLeft.position.set(0, 0, nacelleLength / 2 - 0.2);
  nacelleLeftGroup.add(turbineLeft);

  const bussardGlowLeft = new THREE.PointLight(0xf97316, 2.8, 20);
  bussardGlowLeft.position.set(0, 0, nacelleLength / 2 + 0.6);
  nacelleLeftGroup.add(bussardGlowLeft);

  // Outboard linear glowing grille
  const warpCoilsLeft = new THREE.Mesh(coilGeo, coilMat.clone());
  warpCoilsLeft.position.set(nacelleRadius * 0.96, 0, -1.2);
  nacelleLeftGroup.add(warpCoilsLeft);

  // Inboard linear glowing grille
  const warpCoilsLeftInner = new THREE.Mesh(coilGeo, coilMat.clone());
  warpCoilsLeftInner.position.set(-nacelleRadius * 0.96, 0, -1.2);
  nacelleLeftGroup.add(warpCoilsLeftInner);

  // Grille metallic ribs divider
  for (let rib = -6; rib <= 6; rib++) {
    const ribGeo = new THREE.BoxGeometry(0.38, 1.02, 0.12);
    const ribMesh = new THREE.Mesh(ribGeo, accentMetalMat);
    ribMesh.position.set(nacelleRadius * 0.96, 0, -1.2 + rib * 1.35);
    nacelleLeftGroup.add(ribMesh);

    const ribMeshIn = ribMesh.clone();
    ribMeshIn.position.x = -nacelleRadius * 0.96;
    nacelleLeftGroup.add(ribMeshIn);
  }

  // Aft Exhaust Caps & Intercoolers
  const aftCapGeo = new THREE.ConeGeometry(nacelleRadius * 0.88, 2.4, 24);
  const aftCapLeft = new THREE.Mesh(aftCapGeo, accentMetalMat);
  aftCapLeft.rotation.x = -Math.PI / 2;
  aftCapLeft.position.set(0, 0, -nacelleLength / 2 - 1.2);
  nacelleLeftGroup.add(aftCapLeft);

  // Port Nacelle Red Running Beacon
  const portNacelleBeacon = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), redBeaconMat);
  portNacelleBeacon.position.set(-nacelleRadius - 0.05, 0, nacelleLength / 2 - 1.0);
  nacelleLeftGroup.add(portNacelleBeacon);

  // Outboard Starfleet Pennant Banner with NCC-1701 & Delta on Port Nacelle
  const nacellePennantGeo = new THREE.PlaneGeometry(16.0, 1.35);
  const nacellePennantMat = new THREE.MeshStandardMaterial({
    map: nacellePennantTex,
    transparent: true,
    metalness: 0.25,
    roughness: 0.35,
    side: THREE.DoubleSide,
  });
  const nacellePennantLeft = new THREE.Mesh(nacellePennantGeo, nacellePennantMat);
  nacellePennantLeft.rotation.y = -Math.PI / 2;
  nacellePennantLeft.position.set(-nacelleRadius - 0.04, 0, 1.2);
  nacelleLeftGroup.add(nacellePennantLeft);

  // Aft control fin
  const finGeo = new THREE.BoxGeometry(0.24, 2.0, 2.4);
  const finLeft = new THREE.Mesh(finGeo, accentMetalMat);
  finLeft.position.set(0, 1.1, -nacelleLength / 2 - 0.5);
  nacelleLeftGroup.add(finLeft);

  root.add(nacelleLeftGroup);

  // --- STARBOARD NACELLE ---
  const nacelleRightGroup = new THREE.Group();
  nacelleRightGroup.position.set(9.0, 4.4, -4.6);

  const nacelleRightBody = new THREE.Mesh(nacelleGeo, engineeringHullMat);
  nacelleRightBody.rotation.x = Math.PI / 2;
  nacelleRightGroup.add(nacelleRightBody);

  // Forward Bussard Collector Dome
  const bussardRight = new THREE.Mesh(bussardGeo, bussardMat.clone());
  bussardRight.rotation.x = Math.PI / 2;
  bussardRight.position.set(0, 0, nacelleLength / 2);
  nacelleRightGroup.add(bussardRight);

  const turbineRight = new THREE.Mesh(turbineGeo, turbineMat.clone());
  turbineRight.rotation.x = Math.PI / 2;
  turbineRight.position.set(0, 0, nacelleLength / 2 - 0.2);
  nacelleRightGroup.add(turbineRight);

  const bussardGlowRight = new THREE.PointLight(0xf97316, 2.8, 20);
  bussardGlowRight.position.set(0, 0, nacelleLength / 2 + 0.6);
  nacelleRightGroup.add(bussardGlowRight);

  // Outboard linear glowing grille
  const warpCoilsRight = new THREE.Mesh(coilGeo, coilMat.clone());
  warpCoilsRight.position.set(nacelleRadius * 0.96, 0, -1.2);
  nacelleRightGroup.add(warpCoilsRight);

  // Inboard linear glowing grille
  const warpCoilsRightInner = new THREE.Mesh(coilGeo, coilMat.clone());
  warpCoilsRightInner.position.set(-nacelleRadius * 0.96, 0, -1.2);
  nacelleRightGroup.add(warpCoilsRightInner);

  // Grille metallic ribs divider
  for (let rib = -6; rib <= 6; rib++) {
    const ribGeo = new THREE.BoxGeometry(0.38, 1.02, 0.12);
    const ribMesh = new THREE.Mesh(ribGeo, accentMetalMat);
    ribMesh.position.set(nacelleRadius * 0.96, 0, -1.2 + rib * 1.35);
    nacelleRightGroup.add(ribMesh);

    const ribMeshIn = ribMesh.clone();
    ribMeshIn.position.x = -nacelleRadius * 0.96;
    nacelleRightGroup.add(ribMeshIn);
  }

  // Aft Exhaust Caps
  const aftCapRight = aftCapLeft.clone();
  nacelleRightGroup.add(aftCapRight);

  // Starboard Nacelle Green Running Beacon
  const stbdNacelleBeacon = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), greenBeaconMat);
  stbdNacelleBeacon.position.set(nacelleRadius + 0.05, 0, nacelleLength / 2 - 1.0);
  nacelleRightGroup.add(stbdNacelleBeacon);

  // Outboard Starfleet Pennant Banner with NCC-1701 & Delta on Starboard Nacelle
  const nacellePennantRight = new THREE.Mesh(nacellePennantGeo, nacellePennantMat);
  nacellePennantRight.rotation.y = Math.PI / 2;
  nacellePennantRight.position.set(nacelleRadius + 0.04, 0, 1.2);
  nacelleRightGroup.add(nacellePennantRight);

  const finRight = new THREE.Mesh(finGeo, accentMetalMat);
  finRight.position.set(0, 1.1, -nacelleLength / 2 - 0.5);
  nacelleRightGroup.add(finRight);

  root.add(nacelleRightGroup);

  subsystemNodes.set('port_nacelle', new THREE.Vector3(-9.0, 4.4, 0));
  subsystemNodes.set('starboard_nacelle', new THREE.Vector3(9.0, 4.4, 0));

  // ==========================================
  // 6. DEFLECTOR SHIELD BUBBLE
  // ==========================================
  const shieldGeo = new THREE.SphereGeometry(19.0, 32, 24);
  shieldGeo.scale(1.15, 0.65, 1.5);
  const shieldMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.45,
    transparent: true,
    opacity: 0.0,
    wireframe: true,
    roughness: 0.1,
  });
  const shieldBubble = new THREE.Mesh(shieldGeo, shieldMat);
  shieldBubble.position.set(0, 1.0, -1.0);
  root.add(shieldBubble);

  subsystemNodes.set('shields', new THREE.Vector3(0, 1.0, -1.0));

  return {
    root,
    saucer: saucerGroup,
    secondaryHull,
    deflectorDish,
    deflectorGlow,
    bussardLeft,
    bussardRight,
    bussardGlowLeft,
    bussardGlowRight,
    warpCoilsLeft,
    warpCoilsRight,
    impulseEngine,
    impulseGlow,
    shieldBubble,
    phaserOriginLeft,
    phaserOriginRight,
    torpedoOrigin,
    subsystemNodes,
  };
}
