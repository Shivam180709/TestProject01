import * as THREE from 'three';

export interface BridgeInteriorComponents {
  root: THREE.Group;
  overheadDomeLight: THREE.PointLight;
  alertRedLight: THREE.PointLight;
  viewscreenMesh: THREE.Mesh;
  viewscreenGroup: THREE.Group;
  captainChair: THREE.Group;
  helmConsole: THREE.Group;
  update: (delta: number, isRedAlert: boolean, isWarping: boolean) => void;
}

export function buildBridgeInterior(): BridgeInteriorComponents {
  const root = new THREE.Group();
  root.name = 'BridgeInterior';

  // Scale: 1 unit ~ 0.5 meter. Bridge diameter ~ 18 units, height ~ 6 units.
  const bridgeRadius = 14;
  const bridgeHeight = 6.5;

  // Materials
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.8,
    metalness: 0.2,
  });

  const upperWallMat = new THREE.MeshStandardMaterial({
    color: 0xd6d3d1,
    roughness: 0.6,
    metalness: 0.1,
  });

  const consoleMat = new THREE.MeshStandardMaterial({
    color: 0x292524,
    roughness: 0.4,
    metalness: 0.6,
  });

  const leatherBlackMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.5,
  });

  const chairWoodMat = new THREE.MeshStandardMaterial({
    color: 0x78350f,
    roughness: 0.3,
  });

  const railingMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    metalness: 0.8,
    roughness: 0.2,
  });

  // 1. Bridge Floor (circular with stepped command pit)
  const outerFloorGeo = new THREE.CylinderGeometry(bridgeRadius, bridgeRadius, 0.4, 48);
  const outerFloor = new THREE.Mesh(outerFloorGeo, floorMat);
  outerFloor.position.y = -0.2;
  root.add(outerFloor);

  // Center sunken command circle
  const sunkenFloorGeo = new THREE.CylinderGeometry(5.8, 5.8, 0.25, 32);
  const sunkenFloor = new THREE.Mesh(sunkenFloorGeo, new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.7,
  }));
  sunkenFloor.position.y = 0.05;
  root.add(sunkenFloor);

  // 2. Circular Outer Walls
  const wallGeo = new THREE.CylinderGeometry(bridgeRadius, bridgeRadius, bridgeHeight, 48, 1, true);
  const wallMesh = new THREE.Mesh(wallGeo, upperWallMat);
  wallMesh.position.y = bridgeHeight / 2;
  wallMesh.material.side = THREE.BackSide;
  root.add(wallMesh);

  // 3. Ceiling Dome & Skylight Ring
  const ceilingGeo = new THREE.CylinderGeometry(0.5, bridgeRadius, 1.8, 48, 1, true);
  const ceiling = new THREE.Mesh(ceilingGeo, upperWallMat);
  ceiling.material.side = THREE.BackSide;
  ceiling.position.y = bridgeHeight + 0.9;
  root.add(ceiling);

  const overheadDomeGeo = new THREE.CylinderGeometry(3.5, 3.5, 0.4, 32);
  const overheadDomeMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfde047,
    emissiveIntensity: 1.2,
    roughness: 0.2,
  });
  const domeLightMesh = new THREE.Mesh(overheadDomeGeo, overheadDomeMat);
  domeLightMesh.position.y = bridgeHeight + 0.4;
  root.add(domeLightMesh);

  // Bridge Lighting
  const overheadDomeLight = new THREE.PointLight(0xffedd5, 1.8, 25);
  overheadDomeLight.position.set(0, bridgeHeight - 0.5, 0);
  root.add(overheadDomeLight);

  const alertRedLight = new THREE.PointLight(0xef4444, 0.0, 30);
  alertRedLight.position.set(0, bridgeHeight - 0.8, 0);
  root.add(alertRedLight);

  // 4. Upper LCARS Display Monitor Ring (circumference screens)
  const lcarsRingCount = 10;
  for (let i = 0; i < lcarsRingCount; i++) {
    const angle = (i / lcarsRingCount) * Math.PI * 2;
    // Don't put screen directly where the main viewscreen is (forward angle)
    if (Math.abs(angle - Math.PI) < 0.35) continue;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, 256, 128);

    // LCARS blocks
    const colors = ['#f59e0b', '#0284c7', '#ef4444', '#10b981', '#a855f7'];
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(10, 10, 60, 20);
    ctx.fillRect(10, 35, 120, 14);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(`SYS-${10 + i}`, 80, 26);

    ctx.fillStyle = '#475569';
    for (let l = 0; l < 4; l++) {
      ctx.fillRect(10, 60 + l * 14, 230, 8);
    }

    const screenTex = new THREE.CanvasTexture(canvas);
    const screenGeo = new THREE.BoxGeometry(3.6, 1.4, 0.15);
    const screenMat = new THREE.MeshStandardMaterial({
      map: screenTex,
      emissive: 0xffffff,
      emissiveMap: screenTex,
      emissiveIntensity: 0.8,
    });
    const screenMesh = new THREE.Mesh(screenGeo, screenMat);
    screenMesh.position.set(
      Math.sin(angle) * (bridgeRadius - 0.25),
      bridgeHeight - 1.2,
      Math.cos(angle) * (bridgeRadius - 0.25)
    );
    screenMesh.rotation.y = angle + Math.PI;
    root.add(screenMesh);
  }

  // 5. Main Forward Viewscreen Frame (Facing Z = -bridgeRadius)
  const viewscreenGroup = new THREE.Group();
  viewscreenGroup.position.set(0, 2.6, -(bridgeRadius - 0.4));

  // Frame outer bezel
  const bezelGeo = new THREE.BoxGeometry(11.2, 4.8, 0.4);
  const bezelMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.8,
    roughness: 0.3,
  });
  const bezelMesh = new THREE.Mesh(bezelGeo, bezelMat);
  viewscreenGroup.add(bezelMesh);

  // Inner display screen (window looking out into space)
  const viewscreenGeo = new THREE.PlaneGeometry(10.2, 4.0);
  const viewscreenMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.05, // Transparent so the 3D space scene behind it is visible through the screen!
  });
  const viewscreenMesh = new THREE.Mesh(viewscreenGeo, viewscreenMat);
  viewscreenMesh.position.z = 0.22;
  viewscreenGroup.add(viewscreenMesh);

  // Viewscreen Starfleet Chevron emblem on top
  const chevronGeo = new THREE.ConeGeometry(0.3, 0.6, 3);
  const chevronMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.9, roughness: 0.1 });
  const chevron = new THREE.Mesh(chevronGeo, chevronMat);
  chevron.position.set(0, 2.2, 0.25);
  chevron.rotation.z = Math.PI;
  viewscreenGroup.add(chevron);

  root.add(viewscreenGroup);

  // 6. Captain's Command Chair (Kirk's Center Chair)
  const captainChair = new THREE.Group();
  captainChair.position.set(0, 0.1, 0.8);

  // Pedestal base
  const chairBaseGeo = new THREE.CylinderGeometry(0.6, 0.8, 0.4, 16);
  const chairBase = new THREE.Mesh(chairBaseGeo, railingMat);
  chairBase.position.y = 0.2;
  captainChair.add(chairBase);

  // Seat cushion
  const seatGeo = new THREE.BoxGeometry(1.4, 0.25, 1.4);
  const seat = new THREE.Mesh(seatGeo, leatherBlackMat);
  seat.position.y = 0.5;
  captainChair.add(seat);

  // Backrest with headrest
  const backGeo = new THREE.BoxGeometry(1.3, 1.5, 0.2);
  const back = new THREE.Mesh(backGeo, leatherBlackMat);
  back.position.set(0, 1.3, 0.6);
  captainChair.add(back);

  // Wooden armrests with command consoles
  const armLeftGeo = new THREE.BoxGeometry(0.3, 0.4, 1.2);
  const armLeft = new THREE.Mesh(armLeftGeo, chairWoodMat);
  armLeft.position.set(-0.8, 0.85, 0.1);
  captainChair.add(armLeft);

  const armRight = armLeft.clone();
  armRight.position.x = 0.8;
  captainChair.add(armRight);

  // Armrest control button strips
  const btnGeo = new THREE.BoxGeometry(0.18, 0.05, 0.35);
  const btnMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
  const btnLeft = new THREE.Mesh(btnGeo, btnMat);
  btnLeft.position.set(-0.8, 1.08, 0.15);
  captainChair.add(btnLeft);

  const btnRight = new THREE.Mesh(btnGeo, new THREE.MeshBasicMaterial({ color: 0xef4444 }));
  btnRight.position.set(0.8, 1.08, 0.15);
  captainChair.add(btnRight);

  root.add(captainChair);

  // 7. Forward Helm & Navigation Console (Sulu & Chekov console)
  const helmConsole = new THREE.Group();
  helmConsole.position.set(0, 0.1, -4.2);

  // Curved dual console desk
  const deskGeo = new THREE.BoxGeometry(5.4, 1.1, 1.8);
  const desk = new THREE.Mesh(deskGeo, consoleMat);
  desk.position.y = 0.55;
  helmConsole.add(desk);

  // Slanted control surfaces
  const surfGeo = new THREE.BoxGeometry(2.4, 0.1, 1.2);
  const surfMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    emissive: 0x0284c7,
    emissiveIntensity: 0.5,
  });

  const helmLeftSurf = new THREE.Mesh(surfGeo, surfMat);
  helmLeftSurf.position.set(-1.4, 1.15, 0.1);
  helmLeftSurf.rotation.x = -0.28;
  helmConsole.add(helmLeftSurf);

  const navRightSurf = new THREE.Mesh(surfGeo, surfMat);
  navRightSurf.position.set(1.4, 1.15, 0.1);
  navRightSurf.rotation.x = -0.28;
  helmConsole.add(navRightSurf);

  // Center Astrogator Viewer Sphere
  const astrogatorGeo = new THREE.SphereGeometry(0.45, 16, 16);
  const astrogatorMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 1.5,
    metalness: 0.9,
  });
  const astrogator = new THREE.Mesh(astrogatorGeo, astrogatorMat);
  astrogator.position.set(0, 1.25, 0.1);
  helmConsole.add(astrogator);

  // Helm & Nav Seating (two swivel chairs)
  for (const xOffset of [-1.4, 1.4]) {
    const chairGroup = new THREE.Group();
    chairGroup.position.set(xOffset, 0, 1.4);

    const cBase = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 0.35, 16), railingMat);
    cBase.position.y = 0.17;
    chairGroup.add(cBase);

    const cSeat = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.15, 1.0), leatherBlackMat);
    cSeat.position.y = 0.4;
    chairGroup.add(cSeat);

    const cBack = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.15), leatherBlackMat);
    cBack.position.set(0, 0.9, 0.45);
    chairGroup.add(cBack);

    helmConsole.add(chairGroup);
  }

  root.add(helmConsole);

  // 8. Peripheral Consoles (Science, Communications, Engineering, Tactical)
  const stationConfigs = [
    { angle: Math.PI * 0.4, name: 'Science Station (Spock)' },
    { angle: Math.PI * 0.65, name: 'Communications (Uhura)' },
    { angle: -Math.PI * 0.4, name: 'Tactical & Defense' },
    { angle: -Math.PI * 0.65, name: 'Engineering & Damage Control' },
  ];

  for (const config of stationConfigs) {
    const stGroup = new THREE.Group();
    const stRadius = bridgeRadius - 1.6;
    stGroup.position.set(
      Math.sin(config.angle) * stRadius,
      0,
      Math.cos(config.angle) * stRadius
    );
    stGroup.rotation.y = config.angle + Math.PI;

    // Console Desk
    const cDesk = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.2, 1.4), consoleMat);
    cDesk.position.y = 0.6;
    stGroup.add(cDesk);

    // Spock's hooded viewer if science station
    if (config.name.includes('Science')) {
      const hoodGeo = new THREE.CylinderGeometry(0.25, 0.35, 0.7, 16);
      const hood = new THREE.Mesh(hoodGeo, new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        emissive: 0x38bdf8,
        emissiveIntensity: 1.2,
      }));
      hood.rotation.x = Math.PI / 4;
      hood.position.set(0, 1.5, 0.1);
      stGroup.add(hood);
    }

    // Chair
    const sChair = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.6, 16), leatherBlackMat);
    sChair.position.set(0, 0.3, 1.2);
    stGroup.add(sChair);

    root.add(stGroup);
  }

  // 9. Aft Turbolift Doors (Curved Red Doors at Z = bridgeRadius - 0.2)
  const turboGroup = new THREE.Group();
  turboGroup.position.set(0, 0, bridgeRadius - 0.3);

  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(3.2, 4.4, 0.4), upperWallMat);
  doorFrame.position.y = 2.2;
  turboGroup.add(doorFrame);

  const doorLeft = new THREE.Mesh(new THREE.BoxGeometry(1.2, 4.0, 0.15), new THREE.MeshStandardMaterial({
    color: 0xb91c1c,
    roughness: 0.4,
    metalness: 0.3,
  }));
  doorLeft.position.set(-0.65, 2.0, 0.1);
  turboGroup.add(doorLeft);

  const doorRight = doorLeft.clone();
  doorRight.position.x = 0.65;
  turboGroup.add(doorRight);

  root.add(turboGroup);

  // 10. Update function for animations & alert lighting
  const update = (delta: number, isRedAlert: boolean, isWarping: boolean) => {
    // Red alert cycling light
    if (isRedAlert) {
      overheadDomeLight.intensity = 0.3;
      alertRedLight.intensity = 2.8 + Math.sin(Date.now() * 0.008) * 1.5;
    } else {
      overheadDomeLight.intensity = isWarping ? 2.2 : 1.8;
      alertRedLight.intensity = 0.0;
    }

    // Astrogator sphere rotation
    astrogator.rotation.y += delta * 1.5;
  };

  return {
    root,
    overheadDomeLight,
    alertRedLight,
    viewscreenMesh,
    viewscreenGroup,
    captainChair,
    helmConsole,
    update,
  };
}
