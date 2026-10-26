import { NextRequest, NextResponse } from 'next/server';
import { scoreSubmissionSchema, validateGameRules } from '@/lib/validations';
import { addScoreRecord, checkRateLimit, deleteScoreRecord, getLeaderboard, updatePlayerNameInScores } from '@/lib/store';
import { Difficulty } from '@/lib/types';

// ============================================
// POST: SKOR YAZIMI (Sunucu Doğrulamalı)
// ============================================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Zod şeması ile girdi doğrulaması
    const parsed = scoreSubmissionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Geçersiz veri formatı.',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const input = parsed.data;

    // 2. Kural: Aynı oyuncudan 5 saniye içinde gelen ikinci skoru reddet (Rate limit)
    const rateCheck = checkRateLimit(input.playerId);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Çok hızlı skor gönderimi! Lütfen ${rateCheck.waitSeconds} saniye bekleyin.`,
          code: 'RATE_LIMIT_COOLDOWN',
        },
        { status: 429 }
      );
    }

    // 3. Oyun kuralları doğrulaması (Anti-cheat)
    const ruleCheck = validateGameRules(input);
    if (!ruleCheck.valid) {
      return NextResponse.json(
        {
          success: false,
          error: ruleCheck.reason || 'Oyun kuralları doğrulaması başarısız oldu.',
          code: 'CHEAT_DETECTED',
        },
        { status: 403 }
      );
    }

    // 4. Skor kaydını kalıcı depoya ekle
    const savedRecord = addScoreRecord({
      playerId: input.playerId,
      playerName: input.playerName,
      score: input.score,
      difficulty: input.difficulty as Difficulty,
      roomCode: input.roomCode,
      itemsSummary: input.itemsSummary,
      durationPlayed: input.durationPlayed,
    });

    return NextResponse.json({
      success: true,
      record: savedRecord,
      message: 'Tebrikler! Skorunuz başarıyla doğrulandı ve sıralamaya kaydedildi.',
    });
  } catch (err: unknown) {
    console.error('Score submission error:', err);
    return NextResponse.json(
      { success: false, error: 'Sunucu hatası oluştu.' },
      { status: 500 }
    );
  }
}

// ============================================
// GET: SKOR SIRALAMASI VE FİLTRELEME
// ============================================
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const difficulty = (searchParams.get('difficulty') || undefined) as Difficulty | undefined;
    const timeframe = (searchParams.get('timeframe') || 'all') as 'all' | 'today' | 'week';
    const playerId = searchParams.get('playerId') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const result = getLeaderboard({
      difficulty,
      timeframe,
      playerId,
      limit,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: unknown) {
    console.error('Leaderboard get error:', err);
    return NextResponse.json(
      { success: false, error: 'Skorlar yüklenirken hata oluştu.' },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE: SKOR SİLME (CRUD: Delete)
// ============================================
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const playerId = searchParams.get('playerId');

    if (!id || !playerId) {
      return NextResponse.json(
        { success: false, error: 'Skor ID ve Oyuncu ID gereklidir.' },
        { status: 400 }
      );
    }

    const success = deleteScoreRecord(id, playerId);
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Skor kaydı bulunamadı veya silme yetkiniz yok.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Skor kaydı başarıyla silindi.',
    });
  } catch (err: unknown) {
    console.error('Score delete error:', err);
    return NextResponse.json(
      { success: false, error: 'Silme işlemi sırasında hata oluştu.' },
      { status: 500 }
    );
  }
}

// ============================================
// PATCH: OYUNCU ADI GÜNCELLEME (CRUD: Update)
// ============================================
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { playerId, newName } = body;

    if (!playerId || !newName || typeof newName !== 'string' || newName.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: 'Geçerli bir oyuncu adı ve ID giriniz.' },
        { status: 400 }
      );
    }

    const updatedCount = updatePlayerNameInScores(playerId, newName.trim());

    return NextResponse.json({
      success: true,
      updatedCount,
      message: 'Oyuncu adı başarıyla güncellendi.',
    });
  } catch (err: unknown) {
    console.error('Player name update error:', err);
    return NextResponse.json(
      { success: false, error: 'Güncelleme işlemi sırasında hata oluştu.' },
      { status: 500 }
    );
  }
}
