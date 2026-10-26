import { CollectibleItem, Difficulty, DIFFICULTY_CONFIGS, ItemType } from './types';

// Sözde rastgele sayı üreteci (Seed-based PRNG)
export function createPRNG(seed: number) {
  let s = seed;
  return function () {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export function generateGameWorld(seed: number, difficulty: Difficulty): CollectibleItem[] {
  const rng = createPRNG(seed);
  const config = DIFFICULTY_CONFIGS[difficulty];
  const items: CollectibleItem[] = [];

  // Nesne sayıları
  const fishCount = Math.floor(25 * config.spawnRate);
  const pearlCount = Math.floor(10 * config.spawnRate);
  const treasureCount = Math.floor(4 * config.spawnRate);
  const obstacleCount = config.obstacleCount;

  let currentId = 0;

  // 1. Tropik Balıklar (+10 Puan)
  for (let i = 0; i < fishCount; i++) {
    items.push({
      id: `item-${++currentId}`,
      type: 'fish',
      x: 10 + rng() * 80,
      y: 10 + rng() * 80,
      vx: (rng() - 0.5) * 0.4,
      vy: (rng() - 0.5) * 0.2,
      points: 10,
      timeBonus: 0,
      collected: false,
      radius: 14,
    });
  }

  // 2. İstiridye & İnci (+25 Puan, +3 saniye süre)
  for (let i = 0; i < pearlCount; i++) {
    items.push({
      id: `item-${++currentId}`,
      type: 'pearl',
      x: 12 + rng() * 76,
      y: 35 + rng() * 55, // Daha derinlerde
      vx: 0,
      vy: 0,
      points: 25,
      timeBonus: 3,
      collected: false,
      radius: 16,
    });
  }

  // 3. Batık Hazine Sandıkları (+100 Puan)
  for (let i = 0; i < treasureCount; i++) {
    items.push({
      id: `item-${++currentId}`,
      type: 'treasure',
      x: 15 + rng() * 70,
      y: 65 + rng() * 28, // En dipte
      vx: 0,
      vy: 0,
      points: 100,
      timeBonus: 0,
      collected: false,
      radius: 20,
    });
  }

  // 4. Mayınlar (-15 Puan, -5 saniye süre)
  for (let i = 0; i < obstacleCount; i++) {
    const isJelly = rng() > 0.5;
    items.push({
      id: `item-${++currentId}`,
      type: isJelly ? 'jellyfish' : 'mine',
      x: 15 + rng() * 70,
      y: 20 + rng() * 70,
      vx: (rng() - 0.5) * 0.2,
      vy: (rng() - 0.5) * 0.3,
      points: -15,
      timeBonus: -4,
      collected: false,
      radius: isJelly ? 18 : 22,
    });
  }

  return items;
}

export interface SubmarineState {
  x: number; // 0-100 koordinat
  y: number;
  vx: number;
  vy: number;
  angle: number; // radyan
  targetAngle: number;
  speed: number;
  size: number;
  health: number; // 0-100
  lightFlicker: number;
}

export function createInitialSubmarine(): SubmarineState {
  return {
    x: 50,
    y: 20,
    vx: 0,
    vy: 0,
    angle: 0,
    targetAngle: 0,
    speed: 0,
    size: 13, // Yarı yarıya küçültülmüş boyut
    health: 100,
    lightFlicker: 1,
  };
}

export function generateClientChecksum(playerId: string, score: number, duration: number): string {
  let hash = 0;
  const str = `${playerId}_${score}_${duration}_ocean_secret_salt`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}
