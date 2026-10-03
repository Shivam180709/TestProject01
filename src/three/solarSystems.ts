import * as THREE from 'three';
import { SolarSystem, PlanetData } from '../types/simulation';

// Procedural Canvas Texture Builders for High-Fidelity Planets
export function createPlanetTexture(type: PlanetData['type'], baseColor: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 1024, 512);

  if (type === 'terran') {
    // Ocean base
    ctx.fillStyle = '#1e40af';
    ctx.fillRect(0, 0, 1024, 512);

    // Continents
    ctx.fillStyle = '#15803d';
    for (let i = 0; i < 20; i++) {
      const cx = (i * 51 + 73) % 1024;
      const cy = 120 + ((i * 37) % 270);
      const r = 40 + (i % 7) * 15;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

      // Sub-blobs for coastlines
      ctx.fillStyle = '#166534';
      ctx.beginPath();
      ctx.arc((cx + 35) % 1024, cy - 20, r * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#15803d';
    }

    // Polar ice caps
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, 1024, 45);
    ctx.fillRect(0, 467, 1024, 45);

    // Cloud swirls
    ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
    for (let c = 0; c < 35; c++) {
      const y = 50 + (c * 12);
      const x = (c * 67) % 1024;
      ctx.fillRect(x, y, 160 + (c % 5) * 40, 18);
    }
  } else if (type === 'gas_giant') {
    // Jupiter/Saturn storm bands
    const bands = 40;
    for (let b = 0; b < bands; b++) {
      const y = (b / bands) * 512;
      const h = 512 / bands;
      ctx.fillStyle = b % 2 === 0 ? baseColor : '#d97706';
      if (b % 5 === 0) ctx.fillStyle = '#b45309';
      if (b % 7 === 0) ctx.fillStyle = '#fed7aa';
      ctx.fillRect(0, y, 1024, h);
    }
    // Great red spot / giant storm
    ctx.fillStyle = '#991b1b';
    ctx.beginPath();
    ctx.ellipse(380, 310, 65, 38, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 4;
    ctx.stroke();
  } else if (type === 'desert' || type === 'volcanic') {
    // Vulcan / Mars / Qo'noS terrain
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 1024, 512);

    ctx.fillStyle = type === 'volcanic' ? '#7f1d1d' : '#9a3412';
    for (let i = 0; i < 30; i++) {
      const cx = (i * 71) % 1024;
      const cy = 60 + (i * 14) % 392;
      ctx.beginPath();
      ctx.arc(cx, cy, 25 + (i % 6) * 12, 0, Math.PI * 2);
      ctx.fill();
    }
    // Craggy fissures
    ctx.strokeStyle = type === 'volcanic' ? '#ef4444' : '#c2410c';
    ctx.lineWidth = 3;
    for (let i = 0; i < 15; i++) {
      ctx.beginPath();
      ctx.moveTo((i * 68) % 1024, (i * 32) % 512);
      ctx.lineTo(((i * 68) % 1024) + 120, ((i * 32) % 512) + 60);
      ctx.stroke();
    }
  } else if (type === 'ice') {
    // Andorian glacial cracks
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(0, 0, 1024, 512);
    ctx.fillStyle = '#e0f2fe';
    for (let i = 0; i < 25; i++) {
      ctx.fillRect((i * 45) % 1024, (i * 20) % 512, 140, 24);
    }
    ctx.strokeStyle = '#bae6fd';
    ctx.lineWidth = 2;
    for (let i = 0; i < 20; i++) {
      ctx.beginPath();
      ctx.moveTo((i * 53) % 1024, (i * 27) % 512);
      ctx.lineTo(((i * 53) % 1024) + 80, ((i * 27) % 512) + 40);
      ctx.stroke();
    }
  } else if (type === 'moon' || type === 'anomaly') {
    // Craters & highlands
    ctx.fillStyle = '#64748b';
    ctx.fillRect(0, 0, 1024, 512);
    ctx.fillStyle = '#334155';
    for (let i = 0; i < 40; i++) {
      const cx = (i * 89) % 1024;
      const cy = (i * 47) % 512;
      const r = 8 + (i % 8) * 6;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // Starbase / Outpost metallic hull plates
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 0, 1024, 512);
    ctx.fillStyle = '#475569';
    for (let i = 0; i < 60; i++) {
      ctx.beginPath();
      ctx.arc((i * 43) % 1024, (i * 23) % 512, 5 + (i % 5) * 8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

export const STAR_TREK_SOLAR_SYSTEMS: SolarSystem[] = [
  {
    id: 'sol_system',
    name: 'Sol System (Sector 001)',
    quadrant: 'Alpha Quadrant',
    primaryStar: 'Sol (Yellow Dwarf G2V)',
    spectralType: 'Class G',
    centerCoordinates: [0, 0, 0],
    territory: 'federation',
    affiliation: 'United Federation of Planets',
    description: 'Capital sector of the United Federation of Planets and Starfleet Command Headquarters.',
    planets: [
      {
        id: 'sol_earth',
        name: 'Earth (Class-M)',
        systemId: 'sol_system',
        type: 'terran',
        radius: 46,
        position: [0, 0, -450],
        textureColor: '#1e40af',
        atmosphereColor: '#60a5fa',
        description: 'Birthplace of humanity, seat of the Federation Council and Starfleet Command.',
      },
      {
        id: 'sol_spacedock',
        name: 'Earth Spacedock One',
        systemId: 'sol_system',
        type: 'starbase',
        radius: 18,
        position: [85, 30, -420],
        textureColor: '#94a3b8',
        description: 'Massive orbital starbase providing repair, refit, and launch slips for Federation starships.',
      },
      {
        id: 'sol_luna',
        name: 'Luna (Earth Moon)',
        systemId: 'sol_system',
        type: 'moon',
        radius: 14,
        position: [-130, 20, -470],
        textureColor: '#64748b',
        description: 'New Berlin and Copernicus orbital research complexes.',
      },
      {
        id: 'sol_mars',
        name: 'Mars (Class-N)',
        systemId: 'sol_system',
        type: 'desert',
        radius: 34,
        position: [420, 60, -880],
        textureColor: '#c2410c',
        atmosphereColor: '#fb923c',
        description: 'Home of the Utopia Planitia Fleet Yards, where many starships are constructed.',
      },
      {
        id: 'sol_jupiter',
        name: 'Jupiter (Class-J Gas Giant)',
        systemId: 'sol_system',
        type: 'gas_giant',
        radius: 92,
        position: [-950, 140, -1650],
        textureColor: '#ea580c',
        atmosphereColor: '#fed7aa',
        description: 'Colossal gas giant with the Great Red Spot and deep hydrogen atmosphere.',
      },
      {
        id: 'sol_saturn',
        name: 'Saturn (Ringed Jewel)',
        systemId: 'sol_system',
        type: 'gas_giant',
        radius: 80,
        position: [1150, -110, -2200],
        textureColor: '#ca8a04',
        atmosphereColor: '#fef08a',
        hasRings: true,
        ringInner: 110,
        ringOuter: 190,
        ringColor: '#fef08a',
        description: 'Spectacular planetary ring system composed of billions of water-ice fragments.',
      },
    ],
  },
  {
    id: 'vulcan_system',
    name: '40 Eridani / Vulcan System',
    quadrant: 'Alpha Quadrant',
    primaryStar: '40 Eridani A (Orange Dwarf K1V)',
    spectralType: 'Class K',
    centerCoordinates: [2600, 320, -3400],
    territory: 'federation',
    affiliation: 'United Federation of Planets',
    description: 'Founding member world of the Federation, homeworld of the logical Vulcan species.',
    planets: [
      {
        id: 'vulcan_prime',
        name: 'Vulcan (Class-M)',
        systemId: 'vulcan_system',
        type: 'desert',
        radius: 48,
        position: [2600, 320, -3400],
        textureColor: '#b45309',
        atmosphereColor: '#f59e0b',
        description: 'Arid, mountainous world with higher gravity and thinner atmosphere than Earth.',
      },
      {
        id: 'vulcan_tkhut',
        name: "T'Khut (Sister Planet)",
        systemId: 'vulcan_system',
        type: 'volcanic',
        radius: 54,
        position: [2820, 410, -3280],
        textureColor: '#78350f',
        atmosphereColor: '#f97316',
        description: "Massive geologically active companion planet dominating Vulcan's red-orange sky.",
      },
      {
        id: 'vulcan_outpost',
        name: 'Vulcan Science Academy Array',
        systemId: 'vulcan_system',
        type: 'starbase',
        radius: 16,
        position: [2480, 290, -3450],
        textureColor: '#e2e8f0',
        description: 'High-precision subspace observatory studying graviton fluxes and cosmic strings.',
      },
    ],
  },
  {
    id: 'andoria_system',
    name: 'Procyon / Andorian System',
    quadrant: 'Beta Quadrant',
    primaryStar: 'Procyon (Luminous Subgiant F5)',
    spectralType: 'Class F',
    centerCoordinates: [-3200, -380, -2900],
    territory: 'federation',
    affiliation: 'United Federation of Planets',
    description: 'Home territory of the passionate Andorian Imperial Guard and founding Federation member.',
    planets: [
      {
        id: 'andoria_gas_giant',
        name: "Ka'Thelan (Ringed Giant)",
        systemId: 'andoria_system',
        type: 'gas_giant',
        radius: 88,
        position: [-3200, -380, -2900],
        textureColor: '#0284c7',
        atmosphereColor: '#38bdf8',
        hasRings: true,
        ringInner: 115,
        ringOuter: 175,
        ringColor: '#7dd3fc',
        description: 'Majestic turquoise gas giant orbited by inhabited ice moon Andoria.',
      },
      {
        id: 'andoria_moon',
        name: 'Andoria (Class-P Ice World)',
        systemId: 'andoria_system',
        type: 'ice',
        radius: 42,
        position: [-3040, -320, -2820],
        textureColor: '#0369a1',
        atmosphereColor: '#bae6fd',
        description: 'Glacial moon with underground geothermal cities fueled by subterranean heat veins.',
      },
    ],
  },
  {
    id: 'kronos_system',
    name: "Qo'noS / Klingon Imperial Territory",
    quadrant: 'Beta Quadrant Combat Zone',
    primaryStar: "Klingon Prime (Volcanic Star)",
    spectralType: 'Class K (Klingon Territory)',
    centerCoordinates: [4400, 650, -5800],
    isWarZone: true,
    territory: 'non_federation',
    affiliation: 'Klingon Empire',
    description: 'Sovereign heart of the Klingon Empire. Hostile Birds-of-Prey and Negh\'Var Flagships patrol this frontier and aggressively engage Federation intruders.',
    planets: [
      {
        id: 'qonos_prime',
        name: "Qo'noS (Klingon Homeworld)",
        systemId: 'kronos_system',
        type: 'volcanic',
        radius: 54,
        position: [4400, 650, -5800],
        textureColor: '#b45309',
        atmosphereColor: '#f97316',
        description: 'Seat of the Klingon High Council and the Great Houses, defended by Imperial battlecruisers.',
      },
      {
        id: 'praxis_remnant',
        name: 'Praxis (Shattered Moon)',
        systemId: 'kronos_system',
        type: 'moon',
        radius: 22,
        position: [4560, 720, -5680],
        textureColor: '#78350f',
        hasRings: true,
        ringInner: 30,
        ringOuter: 60,
        ringColor: '#d97706',
        description: 'Shattered dilithium mining moon surrounded by radioactive planetary rings.',
      },
    ],
  },
  {
    id: 'romulus_system',
    name: 'Romulus / Romulan Star Empire',
    quadrant: 'Beta Quadrant Combat Zone',
    primaryStar: 'Romulan Binary Sun',
    spectralType: 'Class F Binary',
    centerCoordinates: [4800, 750, -6200],
    isWarZone: true,
    territory: 'non_federation',
    affiliation: 'Romulan Star Empire',
    description: 'Guarded frontier of the Romulan Star Empire. Cloaked Warbirds and Scimitar Dreadnought Motherships strike without warning.',
    planets: [
      {
        id: 'romulus_prime',
        name: 'Romulus (Ch\'Rihan)',
        systemId: 'romulus_system',
        type: 'terran',
        radius: 50,
        position: [4800, 750, -6200],
        textureColor: '#065f46',
        atmosphereColor: '#34d399',
        description: 'Emerald twin homeworld of the Romulan people and the Senate Imperial Palace.',
      },
      {
        id: 'remus_prime',
        name: 'Remus (Ch\'Havran)',
        systemId: 'romulus_system',
        type: 'desert',
        radius: 40,
        position: [4980, 810, -6080],
        textureColor: '#1e293b',
        atmosphereColor: '#10b981',
        description: 'Tidally locked harsh world of dilithium mining pits and heavy defense stations.',
      },
    ],
  },
  {
    id: 'gorn_sector',
    name: 'Gorn Hegemony / Cestus Expanse',
    quadrant: 'Beta / Alpha Border',
    primaryStar: 'Gornar Prime (Deep Blue Giant)',
    spectralType: 'Class B Giant',
    centerCoordinates: [3600, -320, -6600],
    isWarZone: true,
    territory: 'non_federation',
    affiliation: 'Gorn Hegemony',
    description: 'Hostile territory claimed by the reptilian Gorn Hegemony. Enormous deep-blue Dominator Dreadnoughts defend these border outposts.',
    planets: [
      {
        id: 'gornar_homeworld',
        name: 'Gornar (Class-M Reptilian World)',
        systemId: 'gorn_sector',
        type: 'volcanic',
        radius: 56,
        position: [3600, -320, -6600],
        textureColor: '#1e3a8a',
        atmosphereColor: '#38bdf8',
        description: 'Sweltering jungle and craggy fortress world inhabited by the formidable Gorn military.',
      },
      {
        id: 'cestus_outpost',
        name: 'Cestus III Border Planetoid',
        systemId: 'gorn_sector',
        type: 'desert',
        radius: 36,
        position: [3820, -260, -6480],
        textureColor: '#172554',
        atmosphereColor: '#0ea5e9',
        description: 'Border planetoid site of historical clashes between Starfleet and Gorn landing forces.',
      },
    ],
  },
  {
    id: 'mutara_sector',
    name: 'Mutara Sector & Genesis Range',
    quadrant: 'Alpha Quadrant',
    primaryStar: 'Mutara Nebula Center',
    spectralType: 'Class B Stellar Nursery',
    centerCoordinates: [-1900, 780, -4900],
    territory: 'non_federation',
    affiliation: 'Contested Neutral Zone',
    description: 'Dense subspace nebula containing intense electromagnetic discharges and the Genesis testing ground.',
    planets: [
      {
        id: 'regula_planetoid',
        name: 'Regula (Class-D Planetoid)',
        systemId: 'mutara_sector',
        type: 'desert',
        radius: 28,
        position: [-1900, 780, -4900],
        textureColor: '#475569',
        atmosphereColor: '#94a3b8',
        description: 'Lifeless astronomical rock selected for secret Federation terraforming experimentation.',
      },
      {
        id: 'regula_one_station',
        name: 'Regula I Orbital Laboratory',
        systemId: 'mutara_sector',
        type: 'starbase',
        radius: 16,
        position: [-1830, 810, -4850],
        textureColor: '#cbd5e1',
        description: 'Advanced Federation science outpost where Dr. Carol Marcus developed Project Genesis.',
      },
      {
        id: 'genesis_planet',
        name: 'Genesis World (Prototype)',
        systemId: 'mutara_sector',
        type: 'terran',
        radius: 44,
        position: [-2150, 710, -5050],
        textureColor: '#059669',
        atmosphereColor: '#6ee7b7',
        description: 'Vibrant rapidly evolving experimental paradise world formed by Genesis Matrix reaction.',
      },
    ],
  },
];
