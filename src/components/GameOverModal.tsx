'use client';

import React, { useState } from 'react';
import { Difficulty, DIFFICULTY_CONFIGS, PlayerStats, ScoreRecord } from '@/lib/types';
import { generateClientChecksum } from '@/lib/gameEngine';
import { Trophy, RefreshCw, Send, AlertTriangle, CheckCircle, Home } from 'lucide-react';

interface GameOverModalProps {
  stats: PlayerStats;
  difficulty: Difficulty;
  playerId: string;
  playerName: string;
  roomCode?: string;
  onPlayAgain: () => void;
  onGoHome: () => void;
  onScoreSubmitted: (record: ScoreRecord) => void;
}

export default function GameOverModal({
  stats,
  difficulty,
  playerId,
  playerName,
  roomCode,
  onPlayAgain,
  onGoHome,
  onScoreSubmitted,
}: GameOverModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const config = DIFFICULTY_CONFIGS[difficulty];
  const durationPlayed = config.duration - stats.remainingTime;

  const handleSubmitScore = async () => {
    try {
      setSubmitting(true);
      setErrorMessage(null);

      // İstemci sağlama kodu (Anti-cheat client checksum)
      const clientChecksum = generateClientChecksum(playerId, stats.score, Math.max(1, durationPlayed));

      const payload = {
        playerId,
        playerName,
        difficulty,
        score: stats.score,
        roomCode,
        durationPlayed: Math.max(1, durationPlayed),
        itemsSummary: {
          fish: stats.fishCollected,
          pearl: stats.pearlsCollected,
          treasure: stats.treasuresCollected,
          obstacles: stats.obstaclesHit,
        },
        clientChecksum,
      };

      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || 'Skor kaydedilemedi.');
        return;
      }

      setSubmitted(true);
      onScoreSubmitted(data.record);
    } catch (err) {
      console.error('Score submit error:', err);
      setErrorMessage('Ağ hatası oluştu. Lütfen tekrar deneyin.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(2, 6, 13, 0.85)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        zIndex: 100,
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: 520,
          padding: 32,
          textAlign: 'center',
          border: '1px solid var(--neon-cyan)',
          boxShadow: '0 0 40px rgba(0, 240, 255, 0.3)',
          animation: 'fadeIn 0.3s ease',
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            margin: '0 auto 16px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #00f0ff 0%, #ff007f 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 25px rgba(0, 240, 255, 0.5)',
          }}
        >
          <Trophy size={36} color="#ffffff" />
        </div>

        <h2 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: 4 }}>
          Dalış Tamamlandı!
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 24 }}>
          Okyanusun derinliklerinde harika bir keşif yaptınız.
        </p>

        {/* Skor Kartı */}
        <div
          style={{
            background: 'rgba(0, 240, 255, 0.08)',
            border: '1px solid rgba(0, 240, 255, 0.25)',
            borderRadius: 16,
            padding: '20px',
            marginBottom: 24,
          }}
        >
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
            Toplam Kazanılan Puan
          </div>
          <div style={{ fontSize: '3rem', fontWeight: 900, color: 'var(--neon-gold)', lineHeight: 1.1, margin: '8px 0' }}>
            {stats.score}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--neon-cyan)', fontWeight: 700 }}>
            {config.name} • {config.scoreMultiplier}x Çarpan
          </div>
        </div>

        {/* İstatistikler */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 10,
            marginBottom: 24,
          }}
        >
          <div className="glass-panel" style={{ padding: '10px 4px' }}>
            <div style={{ fontSize: '1.2rem' }}>🐠</div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{stats.fishCollected}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Balık</div>
          </div>
          <div className="glass-panel" style={{ padding: '10px 4px' }}>
            <div style={{ fontSize: '1.2rem' }}>🦪</div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{stats.pearlsCollected}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>İnci</div>
          </div>
          <div className="glass-panel" style={{ padding: '10px 4px' }}>
            <div style={{ fontSize: '1.2rem' }}>💎</div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{stats.treasuresCollected}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Hazine</div>
          </div>
          <div className="glass-panel" style={{ padding: '10px 4px' }}>
            <div style={{ fontSize: '1.2rem' }}>⚠️</div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--neon-coral)' }}>{stats.obstaclesHit}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Engel</div>
          </div>
        </div>

        {/* Hata veya Başarı Bildirimi */}
        {errorMessage && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              background: 'rgba(255, 42, 112, 0.15)',
              border: '1px solid var(--neon-coral)',
              color: 'var(--neon-coral)',
              fontSize: '0.85rem',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              textAlign: 'left',
            }}
          >
            <AlertTriangle size={18} />
            <span>{errorMessage}</span>
          </div>
        )}

        {submitted && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              background: 'rgba(0, 245, 155, 0.15)',
              border: '1px solid var(--neon-emerald)',
              color: 'var(--neon-emerald)',
              fontSize: '0.85rem',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              textAlign: 'left',
            }}
          >
            <CheckCircle size={18} />
            <span>Skorunuz sunucu tarafından doğrulandı ve sıralamaya kaydedildi!</span>
          </div>
        )}

        {/* Aksiyon Butonları */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {!submitted ? (
            <button
              onClick={handleSubmitScore}
              disabled={submitting}
              className="btn-primary"
              style={{ width: '100%', padding: '14px' }}
            >
              <Send size={18} />
              <span>{submitting ? 'Doğrulanıyor...' : 'Skorumu Sıralamaya Kaydet'}</span>
            </button>
          ) : null}

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button
              onClick={onPlayAgain}
              className="btn-secondary"
              style={{ flex: 1, padding: '12px' }}
            >
              <RefreshCw size={16} />
              <span>Tekrar Dalış Yap</span>
            </button>
            <button
              onClick={onGoHome}
              className="btn-secondary"
              style={{ flex: 1, padding: '12px' }}
            >
              <Home size={16} />
              <span>Ana Menü & Liderlik</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
