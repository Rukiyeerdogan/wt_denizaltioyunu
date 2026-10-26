'use client';

import React from 'react';
import { GameRoom } from '@/lib/types';

interface MultiplayerRaceBarProps {
  room: GameRoom;
  currentPlayerId: string;
}

export default function MultiplayerRaceBar({ room, currentPlayerId }: MultiplayerRaceBarProps) {
  const players = Object.values(room.players).sort((a, b) => b.score - a.score);

  return (
    <div
      className="glass-panel"
      style={{
        padding: '10px 16px',
        marginBottom: 12,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 16,
        background: 'rgba(5, 18, 38, 0.85)',
      }}
    >
      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
        Canlı Yarış Durumu
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, flex: 1 }}>
        {players.map((p, idx) => {
          const isMe = p.id === currentPlayerId;
          return (
            <div
              key={p.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: isMe ? 'rgba(0, 240, 255, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                padding: '4px 10px',
                borderRadius: 10,
                border: isMe ? '1px solid var(--neon-cyan)' : '1px solid transparent',
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: p.color || '#00f0ff',
                }}
              />
              <span style={{ fontSize: '0.8rem', fontWeight: isMe ? 800 : 600 }}>
                #{idx + 1} {p.name} {isMe && '(Siz)'}
              </span>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--neon-gold)', marginLeft: 4 }}>
                {p.score}p
              </span>
              {p.finished && (
                <span className="badge badge-emerald" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                  Bitti
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
