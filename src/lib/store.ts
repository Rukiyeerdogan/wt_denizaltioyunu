import { GameRoom, ScoreRecord, RoomPlayer, Difficulty, RealtimeSyncPayload } from './types';
import fs from 'fs';
import path from 'path';

// Bellek içi durum (In-memory singleton state)
declare global {
  // eslint-disable-next-line no-var
  var __subGameRooms: Map<string, GameRoom> | undefined;
  // eslint-disable-next-line no-var
  var __subGameScores: ScoreRecord[] | undefined;
  // eslint-disable-next-line no-var
  var __subLastSubmissionMap: Map<string, number> | undefined;
  // eslint-disable-next-line no-var
  var __subLastSyncMap: Map<string, number> | undefined;
  // eslint-disable-next-line no-var
  var __subSseClients: Set<(data: { type: string; payload: unknown; room?: string }) => void> | undefined;
}

const rooms: Map<string, GameRoom> = globalThis.__subGameRooms || new Map();
globalThis.__subGameRooms = rooms;

const lastSubmissionMap: Map<string, number> = globalThis.__subLastSubmissionMap || new Map();
globalThis.__subLastSubmissionMap = lastSubmissionMap;

const lastSyncMap: Map<string, number> = globalThis.__subLastSyncMap || new Map();
globalThis.__subLastSyncMap = lastSyncMap;

const sseClients: Set<(data: { type: string; payload: unknown; room?: string }) => void> = globalThis.__subSseClients || new Set();
globalThis.__subSseClients = sseClients;

// Kalıcı depolama dosyası
const DATA_DIR = path.join(process.cwd(), '.data');
const SCORES_FILE = path.join(DATA_DIR, 'scores.json');

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.error('Data directory create error:', err);
  }
}

function loadInitialScores(): ScoreRecord[] {
  try {
    ensureDataDir();
    if (fs.existsSync(SCORES_FILE)) {
      const data = fs.readFileSync(SCORES_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Scores load error:', err);
  }

  // Varsayılan zengin liderlik tablosu kayıtları
  return [
    {
      id: 'score-seed-1',
      playerId: 'captain-nemo',
      playerName: 'Kaptan Nemo',
      score: 1850,
      difficulty: 'hard',
      itemsSummary: { fish: 18, pearl: 12, treasure: 4, obstacles: 1 },
      durationPlayed: 30,
      createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    },
    {
      id: 'score-seed-2',
      playerId: 'poseidon-diver',
      playerName: 'Derin Dalgıç',
      score: 1420,
      difficulty: 'medium',
      itemsSummary: { fish: 24, pearl: 8, treasure: 2, obstacles: 2 },
      durationPlayed: 45,
      createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    },
    {
      id: 'score-seed-3',
      playerId: 'aqua-queen',
      playerName: 'Aqua Melike',
      score: 1100,
      difficulty: 'easy',
      itemsSummary: { fish: 30, pearl: 6, treasure: 1, obstacles: 0 },
      durationPlayed: 60,
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    },
  ];
}

const scores: ScoreRecord[] = globalThis.__subGameScores || loadInitialScores();
globalThis.__subGameScores = scores;

function persistScores() {
  try {
    ensureDataDir();
    fs.writeFileSync(SCORES_FILE, JSON.stringify(scores, null, 2), 'utf-8');
  } catch (err) {
    console.error('Scores persist error:', err);
  }
}

// ============================================
// REALTIME SSE EVENT HUB
// ============================================

export function registerSseClient(listener: (data: { type: string; payload: unknown; room?: string }) => void) {
  sseClients.add(listener);
  return () => {
    sseClients.delete(listener);
  };
}

export function broadcastEvent(type: string, payload: unknown, room?: string) {
  for (const listener of sseClients) {
    try {
      listener({ type, payload, room });
    } catch (err) {
      console.error('Broadcast error:', err);
    }
  }
}

// ============================================
// RATE LIMITING & SECURITY (KURAL: 5 Saniye Anti-Cheat)
// ============================================

/**
 * Aynı oyuncudan 5 saniye içinde gelen ikinci skoru reddeder.
 */
export function checkRateLimit(playerId: string): { allowed: boolean; waitSeconds?: number } {
  const now = Date.now();
  const lastTime = lastSubmissionMap.get(playerId);
  const COOLDOWN_MS = 5000;

  if (lastTime && now - lastTime < COOLDOWN_MS) {
    const remainingMs = COOLDOWN_MS - (now - lastTime);
    return {
      allowed: false,
      waitSeconds: Math.ceil(remainingMs / 1000),
    };
  }

  lastSubmissionMap.set(playerId, now);
  return { allowed: true };
}

/**
 * Gerçek zamanlı mesaj bütçesi kontrolü:
 * Oyuncu başına saniyede en fazla 1 güncelleme gönderilebilir.
 */
export function checkRealtimeSyncBudget(playerId: string): boolean {
  const now = Date.now();
  const lastSync = lastSyncMap.get(playerId);
  const MIN_INTERVAL_MS = 950; // Saniyede en fazla 1 güncelleme (küçük ağ toleransı)

  if (lastSync && now - lastSync < MIN_INTERVAL_MS) {
    return false; // Bütçe aşıldı, bu ara paketi yoksay
  }

  lastSyncMap.set(playerId, now);
  return true;
}

// ============================================
// CRUD: ROOMS (ODALAR)
// ============================================

export function createRoom(hostId: string, hostName: string, difficulty: Difficulty, roomName?: string): GameRoom {
  // Rastgele 6 haneli oda kodu üret
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const fullCode = `SUB-${code}`;

  const colors = ['#00f0ff', '#39ff14', '#ff007f', '#ffe600', '#bf00ff', '#00ffaa'];
  const playerColor = colors[Math.floor(Math.random() * colors.length)];

  const room: GameRoom = {
    code: fullCode,
    name: roomName || `${hostName}'in Deniz Seferi`,
    difficulty,
    hostId,
    status: 'waiting',
    seed: Math.floor(Math.random() * 1000000),
    createdAt: Date.now(),
    players: {
      [hostId]: {
        id: hostId,
        name: hostName,
        color: playerColor,
        isReady: true,
        isHost: true,
        lastPing: Date.now(),
        score: 0,
        progress: 0,
        finished: false,
      },
    },
  };

  rooms.set(fullCode, room);
  broadcastEvent('room_updated', room, fullCode);
  return room;
}

export function getRoom(code: string): GameRoom | undefined {
  const room = rooms.get(code.toUpperCase());
  if (room) {
    // 60 saniyeden uzun süre yanıt vermeyen oyuncuları temizle (disconnect resilience)
    const now = Date.now();
    let changed = false;
    for (const [pid, p] of Object.entries(room.players)) {
      if (now - p.lastPing > 60000 && !p.isHost) {
        delete room.players[pid];
        changed = true;
      }
    }
    if (changed) {
      broadcastEvent('room_updated', room, room.code);
    }
  }
  return room;
}

export function joinRoom(code: string, playerId: string, playerName: string): { success: boolean; room?: GameRoom; message?: string } {
  const room = getRoom(code);
  if (!room) {
    return { success: false, message: 'Oda bulunamadı.' };
  }

  if (room.status === 'playing' && !room.players[playerId]) {
    return { success: false, message: 'Oyun şu anda devam ediyor. Lobiye katılamazsınız.' };
  }

  const existingPlayerCount = Object.keys(room.players).length;
  if (existingPlayerCount >= 8 && !room.players[playerId]) {
    return { success: false, message: 'Oda dolu (Maksimum 8 oyuncu).' };
  }

  const colors = ['#00f0ff', '#39ff14', '#ff007f', '#ffe600', '#bf00ff', '#00ffaa'];
  const playerColor = colors[existingPlayerCount % colors.length];

  if (!room.players[playerId]) {
    room.players[playerId] = {
      id: playerId,
      name: playerName,
      color: playerColor,
      isReady: false,
      isHost: false,
      lastPing: Date.now(),
      score: 0,
      progress: 0,
      finished: false,
    };
  } else {
    // Yeniden bağlanma (reconnect)
    room.players[playerId].lastPing = Date.now();
    room.players[playerId].name = playerName;
  }

  broadcastEvent('room_updated', room, room.code);
  return { success: true, room };
}

export function updateRoomPlayer(code: string, playerId: string, updates: Partial<RoomPlayer>): GameRoom | undefined {
  const room = getRoom(code);
  if (!room || !room.players[playerId]) return undefined;

  room.players[playerId] = {
    ...room.players[playerId],
    ...updates,
    lastPing: Date.now(),
  };

  broadcastEvent('room_updated', room, room.code);
  return room;
}

export function syncPlayerProgress(payload: RealtimeSyncPayload): boolean {
  if (!checkRealtimeSyncBudget(payload.playerId)) {
    return false; // Mesaj bütçesi kontrolü
  }

  const room = getRoom(payload.roomCode);
  if (!room || !room.players[payload.playerId]) return false;

  const player = room.players[payload.playerId];
  player.score = payload.score;
  player.progress = payload.progress;
  player.lastPing = Date.now();
  if (payload.finished !== undefined) player.finished = payload.finished;
  if (payload.stats) player.stats = payload.stats;

  // Tüm oyuncular bittiyse odayı bitir
  const allFinished = Object.values(room.players).every((p) => p.finished);
  if (allFinished && room.status === 'playing') {
    room.status = 'finished';
  }

  broadcastEvent('room_progress', {
    roomCode: room.code,
    playerId: payload.playerId,
    score: payload.score,
    progress: payload.progress,
    finished: player.finished,
  }, room.code);

  return true;
}

export function setRoomStatus(code: string, status: 'waiting' | 'starting' | 'playing' | 'finished'): GameRoom | undefined {
  const room = getRoom(code);
  if (!room) return undefined;

  room.status = status;
  if (status === 'starting' || status === 'playing') {
    // Oyuncuların skorlarını sıfırla
    for (const p of Object.values(room.players)) {
      p.score = 0;
      p.progress = 0;
      p.finished = false;
    }
  }

  broadcastEvent('room_updated', room, room.code);
  return room;
}

export function leaveRoom(code: string, playerId: string): boolean {
  const room = getRoom(code);
  if (!room) return false;

  delete room.players[playerId];

  // Eğer odada kimse kalmadıysa odayı sil
  if (Object.keys(room.players).length === 0) {
    rooms.delete(code.toUpperCase());
    return true;
  }

  // Host çıktıysa yeni bir host ata
  if (room.hostId === playerId) {
    const remainingIds = Object.keys(room.players);
    if (remainingIds.length > 0) {
      room.hostId = remainingIds[0];
      room.players[room.hostId].isHost = true;
    }
  }

  broadcastEvent('room_updated', room, room.code);
  return true;
}

// ============================================
// CRUD: SCORES (SKOR TABLOSU & SIRALAMA)
// ============================================

export function addScoreRecord(record: Omit<ScoreRecord, 'id' | 'createdAt'>): ScoreRecord {
  const newRecord: ScoreRecord = {
    ...record,
    id: `score-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date().toISOString(),
  };

  scores.push(newRecord);

  // En yüksek skordan düşüğe sırala
  scores.sort((a, b) => b.score - a.score);

  // Kalıcı dosyaya kaydet
  persistScores();

  // Canlı skor yayını yap
  broadcastEvent('leaderboard_updated', newRecord);

  return newRecord;
}

export function getLeaderboard(options?: {
  difficulty?: Difficulty;
  timeframe?: 'all' | 'today' | 'week';
  limit?: number;
  playerId?: string;
}) {
  let list = [...scores];

  if (options?.difficulty) {
    list = list.filter((s) => s.difficulty === options.difficulty);
  }

  if (options?.timeframe === 'today') {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    list = list.filter((s) => new Date(s.createdAt).getTime() >= oneDayAgo);
  } else if (options?.timeframe === 'week') {
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    list = list.filter((s) => new Date(s.createdAt).getTime() >= oneWeekAgo);
  }

  list.sort((a, b) => b.score - a.score);

  // Oyuncunun kendi sırasını (My Rank) hesapla
  let myRank: { rank: number; record: ScoreRecord } | null = null;
  if (options?.playerId) {
    const index = list.findIndex((s) => s.playerId === options.playerId);
    if (index !== -1) {
      myRank = {
        rank: index + 1,
        record: list[index],
      };
    }
  }

  const limit = options?.limit || 50;
  const paginated = list.slice(0, limit);

  return {
    records: paginated,
    total: list.length,
    myRank,
  };
}

export function deleteScoreRecord(id: string, playerId: string): boolean {
  const index = scores.findIndex((s) => s.id === id && s.playerId === playerId);
  if (index === -1) {
    return false;
  }

  scores.splice(index, 1);
  persistScores();
  broadcastEvent('leaderboard_updated', { deletedId: id });
  return true;
}

export function updatePlayerNameInScores(playerId: string, newName: string): number {
  let count = 0;
  for (const s of scores) {
    if (s.playerId === playerId) {
      s.playerName = newName;
      count++;
    }
  }
  if (count > 0) {
    persistScores();
    broadcastEvent('leaderboard_updated', { updatedPlayerId: playerId, newName });
  }
  return count;
}
