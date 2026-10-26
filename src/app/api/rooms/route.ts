import { NextRequest, NextResponse } from 'next/server';
import { roomCreateSchema, roomJoinSchema } from '@/lib/validations';
import { createRoom, getRoom, joinRoom, leaveRoom, setRoomStatus, syncPlayerProgress, updateRoomPlayer } from '@/lib/store';
import { Difficulty, RealtimeSyncPayload } from '@/lib/types';

// ============================================
// GET: ODA BİLGİSİ SORGULAMA
// ============================================
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Oda kodu gereklidir.' },
        { status: 400 }
      );
    }

    const room = getRoom(code);
    if (!room) {
      return NextResponse.json(
        { success: false, error: 'Oda bulunamadı.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      room,
    });
  } catch (err: unknown) {
    console.error('Room GET error:', err);
    return NextResponse.json(
      { success: false, error: 'Sunucu hatası.' },
      { status: 500 }
    );
  }
}

// ============================================
// POST: ODA OLUŞTURMA VEYA KATILMA
// ============================================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action || 'create';

    if (action === 'create') {
      const parsed = roomCreateSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { success: false, error: 'Geçersiz parametreler.', details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const { hostId, hostName, difficulty, roomName } = parsed.data;
      const room = createRoom(hostId, hostName, difficulty as Difficulty, roomName);

      return NextResponse.json({
        success: true,
        room,
      });
    }

    if (action === 'join') {
      const parsed = roomJoinSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { success: false, error: 'Geçersiz lobi bilgisi.', details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const { roomCode, playerId, playerName } = parsed.data;
      const result = joinRoom(roomCode, playerId, playerName);

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.message || 'Odaya katılınamadı.' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        room: result.room,
      });
    }

    if (action === 'status') {
      const { roomCode, status, playerId } = body;
      const room = getRoom(roomCode);
      if (!room) {
        return NextResponse.json({ success: false, error: 'Oda bulunamadı.' }, { status: 404 });
      }

      // Sadece host oyunu başlatabilir
      if (status === 'playing' && room.hostId !== playerId) {
        return NextResponse.json({ success: false, error: 'Sadece oda lideri oyunu başlatabilir.' }, { status: 403 });
      }

      const updated = setRoomStatus(roomCode, status);
      return NextResponse.json({ success: true, room: updated });
    }

    if (action === 'player_update') {
      const { roomCode, playerId, isReady, color } = body;
      const updated = updateRoomPlayer(roomCode, playerId, { isReady, color });
      return NextResponse.json({ success: true, room: updated });
    }

    return NextResponse.json({ success: false, error: 'Bilinmeyen işlem.' }, { status: 400 });
  } catch (err: unknown) {
    console.error('Room POST error:', err);
    return NextResponse.json({ success: false, error: 'Sunucu hatası.' }, { status: 500 });
  }
}

// ============================================
// PUT: OYUNCU İLERLEMESİ SENKRONİZASYONU (Saniyede max 1)
// ============================================
export async function PUT(req: NextRequest) {
  try {
    const body: RealtimeSyncPayload = await req.json();

    if (!body.playerId || !body.roomCode) {
      return NextResponse.json({ success: false, error: 'Eksik parametre.' }, { status: 400 });
    }

    // Rate-limited sync: Saniyede 1 mesaj sınırına uyum
    const synced = syncPlayerProgress(body);

    return NextResponse.json({
      success: synced,
      message: synced ? 'Senkronize edildi' : 'Mesaj bütçesi limiti: Paket atlandı',
    });
  } catch (err: unknown) {
    console.error('Room sync error:', err);
    return NextResponse.json({ success: false, error: 'Sunucu hatası.' }, { status: 500 });
  }
}

// ============================================
// DELETE: ODADAN AYRILMA (Leave room)
// ============================================
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const playerId = searchParams.get('playerId');

    if (!code || !playerId) {
      return NextResponse.json({ success: false, error: 'Oda kodu ve Oyuncu ID gereklidir.' }, { status: 400 });
    }

    const success = leaveRoom(code, playerId);
    return NextResponse.json({ success });
  } catch (err: unknown) {
    console.error('Room DELETE error:', err);
    return NextResponse.json({ success: false, error: 'Sunucu hatası.' }, { status: 500 });
  }
}
