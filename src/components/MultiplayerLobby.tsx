'use client';

import React, { useState, useEffect } from 'react';
import { GameRoom, Difficulty, DIFFICULTY_CONFIGS } from '@/lib/types';
import { Users, Copy, Check, Play, UserCheck, Shield, Sparkles, LogOut, RefreshCw } from 'lucide-react';

interface MultiplayerLobbyProps {
  room: GameRoom;
  currentPlayerId: string;
  onStartGame: () => void;
  onLeaveRoom: () => void;
  onToggleReady: (ready: boolean) => void;
  onRefreshRoom: () => void;
}

export default function MultiplayerLobby({
  room,
  currentPlayerId,
  onStartGame,
  onLeaveRoom,
  onToggleReady,
  onRefreshRoom,
}: MultiplayerLobbyProps) {
  const [copied, setCopied] = useState(false);
  const currentPlayer = room.players[currentPlayerId];
  const isHost = room.hostId === currentPlayerId;
  const playersList = Object.values(room.players);
  const allReady = playersList.length > 0 && playersList.every((p) => p.isReady || p.isHost);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const difficultyConfig = DIFFICULTY_CONFIGS[room.difficulty];

  return (
    <div className="glass-panel" style={{ padding: '28px', maxWidth: 760, margin: '0 auto', width: '100%' }}>
      {/* Üst Başlık & Oda Kodu */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          paddingBottom: 20,
          borderBottom: '1px solid rgba(0, 240, 255, 0.15)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {room.name}
            </h2>
            <span className="badge badge-cyan">{difficultyConfig.name}</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 4 }}>
            Tüm dalgıçlar hazır olduğunda oda lideri dalışı başlatabilir.
          </p>
        </div>

        {/* Oda Kodu Rozeti & Kopyalama */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: 'rgba(0, 240, 255, 0.08)',
            border: '1px solid var(--panel-border)',
            borderRadius: 14,
            padding: '8px 16px',
          }}
        >
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Oda Kodu</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, letterSpacing: 2, color: 'var(--neon-cyan)', fontFamily: 'var(--font-mono)' }}>
              {room.code}
            </div>
          </div>
          <button
            onClick={handleCopyCode}
            className="btn-secondary"
            style={{ padding: '8px 12px', fontSize: '0.8rem' }}
            title="Kodu Kopyala"
          >
            {copied ? <Check size={16} color="var(--neon-emerald)" /> : <Copy size={16} />}
            <span>{copied ? 'Kopyalandı' : 'Kopyala'}</span>
          </button>
        </div>
      </div>

      {/* Oyuncu Listesi (Lobi) */}
      <div style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: '1.05rem' }}>
            <Users size={20} color="var(--neon-cyan)" />
            <span>Mürettebat ({playersList.length}/8)</span>
          </div>
          <button
            onClick={onRefreshRoom}
            className="btn-secondary"
            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
          >
            <RefreshCw size={14} />
            <span>Yenile</span>
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
          {playersList.map((player) => {
            const isMe = player.id === currentPlayerId;
            return (
              <div
                key={player.id}
                className="glass-panel"
                style={{
                  padding: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  borderColor: isMe ? 'var(--neon-cyan)' : 'var(--panel-border)',
                  background: isMe ? 'rgba(0, 240, 255, 0.05)' : 'var(--panel-bg)',
                }}
              >
                {/* Denizaltı Renk İkonu */}
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: player.color || '#00f0ff',
                    boxShadow: `0 0 12px ${player.color || '#00f0ff'}88`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.2rem',
                  }}
                >
                  🚢
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {player.name}
                    </span>
                    {player.isHost && (
                      <span title="Oda Lideri">
                        <Shield size={14} color="#ffd166" />
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: isMe ? 'var(--neon-cyan)' : 'var(--text-secondary)' }}>
                    {isMe ? 'Siz' : 'Dalgıç'} • {player.isReady ? 'Hazır' : 'Bekliyor'}
                  </div>
                </div>

                {/* Durum Rozeti */}
                <div>
                  {player.isReady || player.isHost ? (
                    <span className="badge badge-emerald" style={{ padding: '4px 8px' }}>
                      <UserCheck size={12} />
                    </span>
                  ) : (
                    <span className="badge" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}>
                      Bekliyor
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Kontrol Butonları */}
      <div
        style={{
          marginTop: 32,
          paddingTop: 20,
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <button
          onClick={onLeaveRoom}
          className="btn-secondary"
          style={{ borderColor: 'rgba(255, 42, 112, 0.4)', color: 'var(--neon-coral)' }}
        >
          <LogOut size={16} />
          <span>Odadan Ayrıl</span>
        </button>

        <div style={{ display: 'flex', gap: 12 }}>
          {!isHost && currentPlayer && (
            <button
              onClick={() => onToggleReady(!currentPlayer.isReady)}
              className={currentPlayer.isReady ? 'btn-secondary' : 'btn-primary'}
            >
              <Sparkles size={16} />
              <span>{currentPlayer.isReady ? 'Hazır Değilim' : 'Hazırım!'}</span>
            </button>
          )}

          {isHost && (
            <button
              onClick={onStartGame}
              disabled={!allReady}
              className="btn-primary"
              style={{
                background: allReady
                  ? 'linear-gradient(135deg, #00f59b 0%, #00b4d8 100%)'
                  : undefined,
              }}
            >
              <Play size={18} fill="currentColor" />
              <span>{allReady ? 'Dalışı Başlat!' : 'Oyuncuların Hazır Olması Bekleniyor'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
