'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import SubmarineCanvas from '@/components/SubmarineCanvas';
import VirtualControls from '@/components/VirtualControls';
import MultiplayerLobby from '@/components/MultiplayerLobby';
import LiveLeaderboard from '@/components/LiveLeaderboard';
import MultiplayerRaceBar from '@/components/MultiplayerRaceBar';
import GameOverModal from '@/components/GameOverModal';
import { Difficulty, DIFFICULTY_CONFIGS, GameRoom, PlayerStats } from '@/lib/types';
import { Compass, Play, Users, Sparkles } from 'lucide-react';

export default function HomePage() {
  // Oyuncu kimliği (Yerel hafızada saklanır - reconnection ve CRUD için)
  const [playerId, setPlayerId] = useState<string>('');
  const [playerName, setPlayerName] = useState<string>('Dalgıç Kaptan');
  
  // Oyun ayarları
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [gameMode, setGameMode] = useState<'menu' | 'lobby' | 'playing' | 'gameover'>('menu');
  const [currentSeed, setCurrentSeed] = useState<number>(100001);

  // Çok oyunculu durum
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [roomError, setRoomError] = useState<string | null>(null);

  // Oyun sonu ve kontroller
  const [finalStats, setFinalStats] = useState<PlayerStats | null>(null);
  const [controls, setControls] = useState({
    up: false,
    down: false,
    left: false,
    right: false,
    boost: false,
  });

  const lastSyncTimeRef = useRef<number>(0);

  // 1. Oyuncu Kimliğini Başlat
  useEffect(() => {
    let savedId = localStorage.getItem('aqua_player_id');
    if (!savedId) {
      savedId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      localStorage.setItem('aqua_player_id', savedId);
    }
    setPlayerId(savedId);

    const savedName = localStorage.getItem('aqua_player_name');
    if (savedName) {
      setPlayerName(savedName);
    }
  }, []);

  const handleUpdatePlayerName = (newName: string) => {
    setPlayerName(newName);
    localStorage.setItem('aqua_player_name', newName);
  };

  // 2. Klavye Kontrolleri (Desktop)
  useEffect(() => {
    if (gameMode !== 'playing') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (['arrowup', 'w'].includes(key)) setControls((prev) => ({ ...prev, up: true }));
      if (['arrowdown', 's'].includes(key)) setControls((prev) => ({ ...prev, down: true }));
      if (['arrowleft', 'a'].includes(key)) setControls((prev) => ({ ...prev, left: true }));
      if (['arrowright', 'd'].includes(key)) setControls((prev) => ({ ...prev, right: true }));
      if (key === ' ' || key === 'shift') setControls((prev) => ({ ...prev, boost: true }));
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (['arrowup', 'w'].includes(key)) setControls((prev) => ({ ...prev, up: false }));
      if (['arrowdown', 's'].includes(key)) setControls((prev) => ({ ...prev, down: false }));
      if (['arrowleft', 'a'].includes(key)) setControls((prev) => ({ ...prev, left: false }));
      if (['arrowright', 'd'].includes(key)) setControls((prev) => ({ ...prev, right: false }));
      if (key === ' ' || key === 'shift') setControls((prev) => ({ ...prev, boost: false }));
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameMode]);

  // 3. Çok Oyunculu SSE Dinleyicisi
  useEffect(() => {
    if (!room) return;

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`/api/realtime?room=${room.code}`);

      eventSource.addEventListener('room_updated', (e) => {
        const updatedRoom: GameRoom = JSON.parse(e.data);
        setRoom(updatedRoom);

        // Host oyunu başlattıysa odayı playing moduna al
        if (updatedRoom.status === 'playing' && gameMode === 'lobby') {
          setCurrentSeed(updatedRoom.seed);
          setDifficulty(updatedRoom.difficulty);
          setGameMode('playing');
        }
      });

      eventSource.addEventListener('room_progress', (e) => {
        const data = JSON.parse(e.data);
        setRoom((prev) => {
          if (!prev || !prev.players[data.playerId]) return prev;
          return {
            ...prev,
            players: {
              ...prev.players,
              [data.playerId]: {
                ...prev.players[data.playerId],
                score: data.score,
                progress: data.progress,
                finished: data.finished,
              },
            },
          };
        });
      });
    } catch {
      // SSE fallback
    }

    return () => {
      eventSource?.close();
    };
  }, [room?.code, gameMode]);

  // 4. İlerleme Güncellemesi (Saniyede en fazla 1 kez - Mesaj Bütçesi)
  const handleProgressUpdate = useCallback(
    async (stats: PlayerStats, progress: number) => {
      if (!room || gameMode !== 'playing') return;

      const now = Date.now();
      if (now - lastSyncTimeRef.current < 1000) {
        return; // Saniyede en fazla 1 mesaj kuralı
      }
      lastSyncTimeRef.current = now;

      try {
        await fetch('/api/rooms', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerId,
            roomCode: room.code,
            score: stats.score,
            progress,
            stats,
          }),
        });
      } catch {
        // Ağ kesintisi
      }
    },
    [room, gameMode, playerId]
  );

  // 5. Oyun Sonu
  const handleGameOver = (stats: PlayerStats) => {
    setFinalStats(stats);
    setGameMode('gameover');

    // Eğer oda içindeyse bitişi bildir
    if (room) {
      fetch('/api/rooms', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId,
          roomCode: room.code,
          score: stats.score,
          progress: 100,
          finished: true,
          stats,
        }),
      }).catch(() => {});
    }
  };

  // 6. Oda Oluşturma (Host)
  const handleCreateRoom = async () => {
    try {
      setIsCreatingRoom(true);
      setRoomError(null);

      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          hostId: playerId,
          hostName: playerName,
          difficulty,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setRoomError(data.error || 'Oda oluşturulamadı.');
        return;
      }

      setRoom(data.room);
      setGameMode('lobby');
    } catch (err) {
      console.error(err);
      setRoomError('Sunucuya bağlanılamadı.');
    } finally {
      setIsCreatingRoom(false);
    }
  };

  // 7. Odaya Katılma (Join)
  const handleJoinRoom = async () => {
    if (!joinCodeInput.trim()) return;

    try {
      setIsJoiningRoom(true);
      setRoomError(null);

      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'join',
          roomCode: joinCodeInput.trim().toUpperCase(),
          playerId,
          playerName,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setRoomError(data.error || 'Odaya katılınamadı.');
        return;
      }

      setRoom(data.room);
      setDifficulty(data.room.difficulty);
      setGameMode('lobby');
    } catch (err) {
      console.error(err);
      setRoomError('Odaya bağlanırken hata oluştu.');
    } finally {
      setIsJoiningRoom(false);
    }
  };

  // 8. Odayı Başlat (Host)
  const handleStartRoomGame = async () => {
    if (!room) return;
    try {
      await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'status',
          roomCode: room.code,
          status: 'playing',
          playerId,
        }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  // 9. Hazır Durumu Değiştirme
  const handleToggleReady = async (isReady: boolean) => {
    if (!room) return;
    try {
      await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'player_update',
          roomCode: room.code,
          playerId,
          isReady,
        }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  // 10. Odadan Ayrılma
  const handleLeaveRoom = async () => {
    if (room) {
      fetch(`/api/rooms?code=${room.code}&playerId=${playerId}`, { method: 'DELETE' }).catch(() => {});
    }
    setRoom(null);
    setGameMode('menu');
  };

  // 11. Tek Oyunculu Başlat
  const handleStartSolo = () => {
    setRoom(null);
    setCurrentSeed(Date.now());
    setGameMode('playing');
  };

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Arka Plan Su Kabarcığı Efektleri */}
      <div className="ocean-bubbles">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="bubble"
            style={{
              left: `${(i * 8.5) % 96}%`,
              width: `${12 + (i % 4) * 8}px`,
              height: `${12 + (i % 4) * 8}px`,
              animationDuration: `${7 + (i % 5) * 3}s`,
              animationDelay: `${(i * 1.2) % 6}s`,
            }}
          />
        ))}
      </div>

      {/* Header Bar */}
      <header
        style={{
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(0, 240, 255, 0.12)',
          background: 'rgba(3, 8, 17, 0.75)',
          backdropFilter: 'blur(12px)',
          zIndex: 40,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #00f0ff 0%, #0077ff 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(0, 240, 255, 0.5)',
            }}
          >
            <Compass size={22} color="#030811" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 900, letterSpacing: '0.5px', color: '#ffffff' }}>
              AQUA ABYSS
            </h1>
            <span style={{ fontSize: '0.7rem', color: 'var(--neon-cyan)', fontWeight: 700, letterSpacing: '1px' }}>
              ÇOK OYUNCULU DERİN DENİZALTI OPERASYONU
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {room && (
            <div className="badge badge-cyan" style={{ padding: '6px 12px' }}>
              <Users size={14} />
              <span>Oda: {room.code}</span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Kaptan:</span>
            <span style={{ fontWeight: 700, color: 'var(--neon-cyan)' }}>{playerName}</span>
          </div>
        </div>
      </header>

      {/* Ana İçerik */}
      <div style={{ flex: 1, padding: '20px', zIndex: 10, display: 'flex', flexDirection: 'column' }}>
        {/* ========================================= */}
        {/* MOD: MENÜ & OYUN BAŞLATMA                 */}
        {/* ========================================= */}
        {gameMode === 'menu' && (
          <div style={{ maxWidth: 960, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 32 }}>
            {/* Karşılama Kartı */}
            <div
              className="glass-panel"
              style={{
                padding: '36px',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 16px',
                  borderRadius: 20,
                  background: 'rgba(0, 240, 255, 0.1)',
                  border: '1px solid rgba(0, 240, 255, 0.3)',
                  color: 'var(--neon-cyan)',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  marginBottom: 16,
                }}
              >
                <Sparkles size={16} />
                <span>Gerçek Zamanlı Rekabet • Canlı Sıralama</span>
              </div>

              <h2
                style={{
                  fontSize: 'clamp(2rem, 4vw, 3rem)',
                  fontWeight: 900,
                  lineHeight: 1.15,
                  marginBottom: 12,
                  background: 'linear-gradient(135deg, #ffffff 30%, #00f0ff 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Derinliklere Dal, Hazineleri Topla!
              </h2>

              <p
                style={{
                  maxWidth: 620,
                  margin: '0 auto 28px',
                  color: 'var(--text-secondary)',
                  fontSize: '1rem',
                  lineHeight: 1.6,
                }}
              >
                Denizaltını yönlendir; tropik balıkları, ışıltılı incileri ve batık altın sandıklarını topla.
                Zehirli denizanalarına ve su altı mayınlarına dikkat et! Süre tükenmeden en yüksek skora ulaş.
              </p>

              {/* Kaptan Adı & Zorluk Seçimi */}
              <div
                style={{
                  maxWidth: 600,
                  margin: '0 auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 20,
                  background: 'rgba(5, 18, 38, 0.6)',
                  padding: 24,
                  borderRadius: 16,
                  border: '1px solid rgba(0, 240, 255, 0.15)',
                }}
              >
                <div style={{ textAlign: 'left' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, display: 'block', marginBottom: 6 }}>
                    KAPTAN ADINIZ
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={playerName}
                    onChange={(e) => handleUpdatePlayerName(e.target.value)}
                    maxLength={20}
                    placeholder="Örn: Kaptan Nemo"
                  />
                </div>

                <div style={{ textAlign: 'left' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, display: 'block', marginBottom: 6 }}>
                    ZORLUK DERECESİ
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                    {(['easy', 'medium', 'hard'] as const).map((diff) => {
                      const cfg = DIFFICULTY_CONFIGS[diff];
                      const isSelected = difficulty === diff;
                      return (
                        <button
                          key={diff}
                          onClick={() => setDifficulty(diff)}
                          style={{
                            padding: '12px 10px',
                            borderRadius: 12,
                            background: isSelected ? 'rgba(0, 240, 255, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                            border: isSelected ? '2px solid var(--neon-cyan)' : '1px solid rgba(255, 255, 255, 0.1)',
                            color: isSelected ? 'var(--neon-cyan)' : 'var(--text-primary)',
                            cursor: 'pointer',
                            textAlign: 'center',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{cfg.name.split(' ')[0]}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                            {cfg.duration}s • {cfg.scoreMultiplier}x
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Hata Bildirimi */}
                {roomError && (
                  <div
                    style={{
                      padding: '10px',
                      borderRadius: 10,
                      background: 'rgba(255, 42, 112, 0.15)',
                      border: '1px solid var(--neon-coral)',
                      color: 'var(--neon-coral)',
                      fontSize: '0.85rem',
                    }}
                  >
                    {roomError}
                  </div>
                )}

                {/* Başlatma / Katılma Butonları */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 8 }}>
                  <button onClick={handleStartSolo} className="btn-primary" style={{ padding: '14px' }}>
                    <Play size={18} fill="currentColor" />
                    <span>Tek Başına Oyna</span>
                  </button>

                  <button
                    onClick={handleCreateRoom}
                    disabled={isCreatingRoom}
                    className="btn-coral"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 10,
                      color: '#ffffff',
                      fontWeight: 700,
                      padding: '14px',
                      borderRadius: 12,
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <Users size={18} />
                    <span>{isCreatingRoom ? 'Oluşturuluyor...' : 'Yeni Oda Aç'}</span>
                  </button>
                </div>

                {/* Var olan odaya katıl */}
                <div
                  style={{
                    display: 'flex',
                    gap: 10,
                    alignItems: 'center',
                    paddingTop: 16,
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Oda Kodu (Örn: SUB-A1B2)"
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                    maxLength={10}
                    style={{ textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}
                  />
                  <button
                    onClick={handleJoinRoom}
                    disabled={isJoiningRoom || !joinCodeInput.trim()}
                    className="btn-secondary"
                    style={{ whiteSpace: 'nowrap', padding: '12px 20px' }}
                  >
                    {isJoiningRoom ? 'Katılınıyor...' : 'Odaya Katıl'}
                  </button>
                </div>
              </div>
            </div>

            {/* Canlı Liderlik Tablosu & "Benim Sıram" */}
            <LiveLeaderboard
              currentPlayerId={playerId}
              currentPlayerName={playerName}
              onUpdatePlayerName={handleUpdatePlayerName}
            />
          </div>
        )}

        {/* ========================================= */}
        {/* MOD: ÇOK OYUNCULU ODA LOBİSİ               */}
        {/* ========================================= */}
        {gameMode === 'lobby' && room && (
          <MultiplayerLobby
            room={room}
            currentPlayerId={playerId}
            onStartGame={handleStartRoomGame}
            onLeaveRoom={handleLeaveRoom}
            onToggleReady={handleToggleReady}
            onRefreshRoom={() => {
              fetch(`/api/rooms?code=${room.code}`)
                .then((r) => r.json())
                .then((d) => d.success && setRoom(d.room));
            }}
          />
        )}

        {/* ========================================= */}
        {/* MOD: OYUN EKRANI (Canvas)                 */}
        {/* ========================================= */}
        {(gameMode === 'playing' || gameMode === 'gameover') && (
          <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 110px)', width: '100%', maxWidth: 1200, margin: '0 auto' }}>
            {/* Kontrol İpucu & Çok oyunculu canlı yarış çubuğu */}
            {room && <MultiplayerRaceBar room={room} currentPlayerId={playerId} />}

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 14px',
                marginBottom: 8,
                borderRadius: 10,
                background: 'rgba(0, 240, 255, 0.06)',
                border: '1px solid rgba(0, 240, 255, 0.15)',
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <span>🎯 <b>Mouse / Mousepad:</b> 360° Hassas Dönüş & Yön</span>
                <span>⌨️ <b>WASD / Yön Tuşları:</b> İleri/Geri/Sağa/Sola Hareket</span>
                <span>🚀 <b>Space / Fare Tıkı:</b> Turbo İtiş</span>
              </div>
              <div className="badge badge-cyan" style={{ fontSize: '0.65rem', padding: '2px 8px' }}>
                Kompakt Sınıf Denizaltı
              </div>
            </div>

            <div style={{ flex: 1, position: 'relative', width: '100%', height: '100%' }}>
              <SubmarineCanvas
                seed={currentSeed}
                difficulty={difficulty}
                isMultiplayer={!!room}
                onProgressUpdate={handleProgressUpdate}
                onGameOver={handleGameOver}
                controls={controls}
              />

              {/* Mobil Sanal Kontroller */}
              <VirtualControls
                onControlChange={(key, state) => {
                  setControls((prev) => ({ ...prev, [key]: state }));
                }}
              />
            </div>
          </div>
        )}

        {/* ========================================= */}
        {/* MOD: OYUN SONU MODAL                      */}
        {/* ========================================= */}
        {gameMode === 'gameover' && finalStats && (
          <GameOverModal
            stats={finalStats}
            difficulty={difficulty}
            playerId={playerId}
            playerName={playerName}
            roomCode={room?.code}
            onPlayAgain={() => {
              if (room) {
                setGameMode('lobby');
              } else {
                setCurrentSeed(Date.now());
                setGameMode('playing');
              }
            }}
            onGoHome={() => {
              setRoom(null);
              setGameMode('menu');
            }}
            onScoreSubmitted={() => {
              // Skor başarıyla kaydedildi
            }}
          />
        )}
      </div>

      {/* Footer */}
      <footer
        style={{
          padding: '12px 24px',
          textAlign: 'center',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          background: 'rgba(2, 6, 13, 0.8)',
          zIndex: 20,
        }}
      >
        AQUA ABYSS • Next.js App Router • Vercel Ready • Rate Limited (1 msg/sec & 5s Cooldown Anti-Cheat)
      </footer>
    </main>
  );
}
