import { z } from 'zod';
import { DIFFICULTY_CONFIGS, Difficulty } from './types';

// Zod Doğrulama Şemaları
export const scoreSubmissionSchema = z.object({
  playerId: z.string().min(3).max(64),
  playerName: z.string().trim().min(2, 'Oyuncu adı en az 2 karakter olmalıdır').max(24, 'Oyuncu adı en fazla 24 karakter olabilir'),
  difficulty: z.enum(['easy', 'medium', 'hard'] as const),
  score: z.number().int().min(0).max(50000),
  roomCode: z.string().optional(),
  durationPlayed: z.number().min(1).max(300),
  itemsSummary: z.object({
    fish: z.number().int().min(0).max(200),
    pearl: z.number().int().min(0).max(100),
    treasure: z.number().int().min(0).max(50),
    obstacles: z.number().int().min(0).max(100),
  }),
  clientChecksum: z.string().min(6), // Sahtecilik önleyici imza
});

export type ScoreSubmissionInput = z.infer<typeof scoreSubmissionSchema>;

export const roomCreateSchema = z.object({
  hostName: z.string().trim().min(2).max(24),
  hostId: z.string().min(3).max(64),
  difficulty: z.enum(['easy', 'medium', 'hard'] as const).default('easy'),
  roomName: z.string().trim().min(2).max(30).optional(),
});

export const roomJoinSchema = z.object({
  roomCode: z.string().trim().toUpperCase().min(4).max(10),
  playerName: z.string().trim().min(2).max(24),
  playerId: z.string().min(3).max(64),
});

export const playerUpdateSchema = z.object({
  playerId: z.string().min(3).max(64),
  name: z.string().trim().min(2).max(24).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

/**
 * Oyun kuralları doğrulaması (Anti-cheat)
 * Toplanan ögeler ile iddia edilen puanın uyumunu kontrol eder.
 */
export function validateGameRules(input: ScoreSubmissionInput): { valid: boolean; reason?: string } {
  const config = DIFFICULTY_CONFIGS[input.difficulty as Difficulty];
  if (!config) {
    return { valid: false, reason: 'Geçersiz zorluk derecesi.' };
  }

  // Süre kontrolü: Oynanan süre, konfigürasyondaki süre + toplanan incilerin verdiği maksimum ek süreden fazla olamaz.
  const maxPossibleDuration = config.duration + (input.itemsSummary.pearl * 4) + 10; // +10s tolerans
  if (input.durationPlayed > maxPossibleDuration) {
    return { valid: false, reason: 'Oynanan süre izin verilen maksimum süreyi aşıyor.' };
  }

  // Puan hesaplama doğrulaması:
  // Balık: 10, İnci: 25, Hazine: 100, Engel: -15
  const basePoints = 
    (input.itemsSummary.fish * 10) +
    (input.itemsSummary.pearl * 25) +
    (input.itemsSummary.treasure * 100) -
    (input.itemsSummary.obstacles * 15);
  
  const expectedScore = Math.max(0, Math.round(basePoints * config.scoreMultiplier));

  // %10 sapma / tolerans payı bırak (zaman bazlı ufak bonuslar vs. için)
  const maxAllowableScore = Math.max(50, Math.round(expectedScore * 1.15) + 30);

  if (input.score > maxAllowableScore) {
    return {
      valid: false,
      reason: `Skor doğrulaması başarısız! Toplanan nesneler (${basePoints} baz puan) ile iddia edilen skor (${input.score}) tutarsız.`,
    };
  }

  return { valid: true };
}
