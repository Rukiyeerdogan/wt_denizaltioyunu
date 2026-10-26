export type Difficulty = 'easy' | 'medium' | 'hard';

export interface DifficultyConfig {
  id: Difficulty;
  name: string;
  duration: number; // saniye
  spawnRate: number;
  obstacleCount: number;
  scoreMultiplier: number;
  description: string;
}

export const DIFFICULTY_CONFIGS: Record<Difficulty, DifficultyConfig> = {
  easy: {
    id: 'easy',
    name: 'Sığ Resif (Kolay)',
    duration: 60,
    spawnRate: 1.2,
    obstacleCount: 3,
    scoreMultiplier: 1.0,
    description: '60 saniye süre, bol tropik balık ve sakin akıntılar.',
  },
  medium: {
    id: 'medium',
    name: 'Batık Vadisi (Orta)',
    duration: 45,
    spawnRate: 1.0,
    obstacleCount: 6,
    scoreMultiplier: 1.5,
    description: '45 saniye süre, hareketli akıntılar ve zehirli denizanaları.',
  },
  hard: {
    id: 'hard',
    name: 'Mariana Çukuru (Zor)',
    duration: 30,
    spawnRate: 0.8,
    obstacleCount: 10,
    scoreMultiplier: 2.2,
    description: '30 saniye süre, karanlık derinlik feneri, mayınlar ve 2.2x skor bonusu.',
  },
};

export type ItemType = 'fish' | 'pearl' | 'treasure' | 'mine' | 'jellyfish';

export interface CollectibleItem {
  id: string;
  type: ItemType;
  x: number; // 0-100 normalleştirilmiş koordinat
  y: number; // 0-100 normalleştirilmiş koordinat
  vx: number;
  vy: number;
  points: number;
  timeBonus: number; // Pozitif: süre kazancı, Negatif: süre cezası
  collected: boolean;
  radius: number;
}

export interface PlayerStats {
  score: number;
  fishCollected: number;
  pearlsCollected: number;
  treasuresCollected: number;
  obstaclesHit: number;
  remainingTime: number;
}

export interface RoomPlayer {
  id: string;
  name: string;
  color: string;
  isReady: boolean;
  isHost: boolean;
  lastPing: number;
  score: number;
  progress: number; // 0-100
  finished: boolean;
  stats?: PlayerStats;
}

export type RoomStatus = 'waiting' | 'starting' | 'playing' | 'finished';

export interface GameRoom {
  code: string;
  name: string;
  difficulty: Difficulty;
  hostId: string;
  status: RoomStatus;
  seed: number;
  createdAt: number;
  players: Record<string, RoomPlayer>;
}

export interface ScoreRecord {
  id: string;
  playerId: string;
  playerName: string;
  score: number;
  difficulty: Difficulty;
  roomCode?: string;
  itemsSummary: {
    fish: number;
    pearl: number;
    treasure: number;
    obstacles: number;
  };
  durationPlayed: number;
  createdAt: string;
}

export interface RealtimeSyncPayload {
  playerId: string;
  roomCode: string;
  score: number;
  progress: number;
  isReady?: boolean;
  finished?: boolean;
  stats?: PlayerStats;
}
