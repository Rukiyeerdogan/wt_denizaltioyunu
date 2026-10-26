'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ScoreRecord, Difficulty, DIFFICULTY_CONFIGS } from '@/lib/types';
import { Trophy, Medal, Trash2, Edit3, Check, Search } from 'lucide-react';

interface LiveLeaderboardProps {
  currentPlayerId: string;
  currentPlayerName: string;
  onUpdatePlayerName: (newName: string) => void;
}

export default function LiveLeaderboard({
  currentPlayerId,
  currentPlayerName,
  onUpdatePlayerName,
}: LiveLeaderboardProps) {
  const [scores, setScores] = useState<ScoreRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | 'all'>('all');
  const [selectedTimeframe, setSelectedTimeframe] = useState<'all' | 'today' | 'week'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [myRank, setMyRank] = useState<{ rank: number; record: ScoreRecord } | null>(null);

  // Düzenleme durumu
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(currentPlayerName);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchScores = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedDifficulty !== 'all') params.set('difficulty', selectedDifficulty);
      if (selectedTimeframe !== 'all') params.set('timeframe', selectedTimeframe);
      if (currentPlayerId) params.set('playerId', currentPlayerId);

      const res = await fetch(`/api/scores?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setScores(data.records);
        setMyRank(data.myRank);
      }
    } catch (err) {
      console.error('Fetch scores error:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDifficulty, selectedTimeframe, currentPlayerId]);

  useEffect(() => {
    fetchScores();
  }, [fetchScores]);

  // Gerçek zamanlı SSE dinleyicisi
  useEffect(() => {
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/realtime');
      eventSource.addEventListener('leaderboard_updated', () => {
        fetchScores();
      });
    } catch {
      // SSE desteklenmiyorsa
    }

    return () => {
      eventSource?.close();
    };
  }, [fetchScores]);

  // CRUD: Delete Skor
  const handleDeleteScore = async (id: string) => {
    if (!confirm('Bu skoru sıralamadan kaldırmak istediğinizden emin misiniz?')) return;
    try {
      setDeletingId(id);
      const res = await fetch(`/api/scores?id=${id}&playerId=${currentPlayerId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        fetchScores();
      } else {
        alert(data.error || 'Silme işlemi başarısız');
      }
    } catch (err) {
      console.error('Delete score error:', err);
    } finally {
      setDeletingId(null);
    }
  };

  // CRUD: Update Oyuncu Adı
  const handleSaveName = async () => {
    if (!nameInput.trim() || nameInput.trim().length < 2) return;
    try {
      const res = await fetch('/api/scores', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: currentPlayerId, newName: nameInput.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        onUpdatePlayerName(nameInput.trim());
        setIsEditingName(false);
        fetchScores();
      }
    } catch (err) {
      console.error('Update name error:', err);
    }
  };

  // Arama filtresi
  const filteredScores = scores.filter((s) =>
    s.playerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="glass-panel" style={{ padding: '24px', width: '100%', maxWidth: 840, margin: '0 auto' }}>
      {/* Başlık & Oyuncu Profil Düzenleme */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          paddingBottom: 18,
          borderBottom: '1px solid rgba(0, 240, 255, 0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #ffd166 0%, #ff007f 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 16px rgba(255, 209, 102, 0.4)',
            }}
          >
            <Trophy size={24} color="#030811" />
          </div>
          <div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Okyanus Liderlik Tablosu</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              En cesur denizaltı kaptanlarının canlı rekorları
            </p>
          </div>
        </div>

        {/* Oyuncu Adı Düzenleme (CRUD: Update) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isEditingName ? (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                type="text"
                className="input-field"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                maxLength={20}
                style={{ width: 140, padding: '6px 10px', fontSize: '0.85rem' }}
                autoFocus
              />
              <button onClick={handleSaveName} className="btn-primary" style={{ padding: '6px 10px' }}>
                <Check size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setNameInput(currentPlayerName);
                setIsEditingName(true);
              }}
              className="btn-secondary"
              style={{ padding: '8px 12px', fontSize: '0.85rem' }}
            >
              <span>{currentPlayerName}</span>
              <Edit3 size={14} color="var(--neon-cyan)" />
            </button>
          )}
        </div>
      </div>

      {/* "Benim Sıram" (My Rank) Kartı */}
      {myRank && (
        <div
          className="glass-panel"
          style={{
            margin: '20px 0',
            padding: '16px 20px',
            background: 'linear-gradient(90deg, rgba(0, 240, 255, 0.12) 0%, rgba(121, 40, 202, 0.12) 100%)',
            borderColor: 'var(--neon-cyan)',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'var(--neon-cyan)',
                color: '#030811',
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.1rem',
              }}
            >
              #{myRank.rank}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>{myRank.record.playerName} (Kendi Sıranız)</span>
                <span className="badge badge-cyan">{DIFFICULTY_CONFIGS[myRank.record.difficulty]?.name}</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                🐠 {myRank.record.itemsSummary.fish} Balık • 🦪 {myRank.record.itemsSummary.pearl} İnci • 💎 {myRank.record.itemsSummary.treasure} Hazine
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--neon-gold)' }}>
                {myRank.record.score}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Puan</div>
            </div>

            <button
              onClick={() => handleDeleteScore(myRank.record.id)}
              disabled={deletingId === myRank.record.id}
              className="btn-secondary"
              style={{ padding: '6px 10px', color: 'var(--neon-coral)', borderColor: 'rgba(255, 42, 112, 0.3)' }}
              title="Kendi rekorunu sil (CRUD: Delete)"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Filtreler ve Arama */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'center',
          justifyContent: 'space-between',
          margin: '20px 0 16px 0',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {/* Zorluk Filtresi */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 3 }}>
            {(['all', 'easy', 'medium', 'hard'] as const).map((diff) => (
              <button
                key={diff}
                onClick={() => setSelectedDifficulty(diff)}
                style={{
                  background: selectedDifficulty === diff ? 'var(--neon-cyan)' : 'transparent',
                  color: selectedDifficulty === diff ? '#030811' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: 8,
                  padding: '6px 12px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {diff === 'all' ? 'Tüm Zorluklar' : DIFFICULTY_CONFIGS[diff].name.split(' ')[0]}
              </button>
            ))}
          </div>

          {/* Zaman Filtresi */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 3 }}>
            {(['all', 'today', 'week'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setSelectedTimeframe(tf)}
                style={{
                  background: selectedTimeframe === tf ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  color: selectedTimeframe === tf ? '#ffffff' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: 8,
                  padding: '6px 12px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {tf === 'all' ? 'Tüm Zamanlar' : tf === 'today' ? 'Bugün' : 'Bu Hafta'}
              </button>
            ))}
          </div>
        </div>

        {/* Arama */}
        <div style={{ position: 'relative', width: 180 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: 12, color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="input-field"
            placeholder="Kaptan ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: 30, paddingRight: 10, paddingBottom: 6, paddingTop: 6, fontSize: '0.8rem' }}
          />
        </div>
      </div>

      {/* Sıralama Tablosu */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: 'var(--text-secondary)' }}>
              <th style={{ padding: '10px 8px', width: 50 }}>#</th>
              <th style={{ padding: '10px 8px' }}>Kaptan</th>
              <th style={{ padding: '10px 8px' }}>Zorluk</th>
              <th style={{ padding: '10px 8px' }}>Toplananlar</th>
              <th style={{ padding: '10px 8px', textAlign: 'right' }}>Skor</th>
              <th style={{ padding: '10px 8px', width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  Yükleniyor...
                </td>
              </tr>
            ) : filteredScores.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  Kayıt bulunamadı. İlk rekoru siz kırın!
                </td>
              </tr>
            ) : (
              filteredScores.map((record, index) => {
                const isMe = record.playerId === currentPlayerId;
                const isTop3 = index < 3;
                const rankColor = index === 0 ? '#ffd166' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : 'var(--text-secondary)';

                return (
                  <tr
                    key={record.id}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      background: isMe ? 'rgba(0, 240, 255, 0.04)' : 'transparent',
                      transition: 'background 0.2s ease',
                    }}
                  >
                    <td style={{ padding: '12px 8px', fontWeight: 800, color: rankColor }}>
                      {isTop3 ? (
                        <Medal size={18} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                      ) : null}
                      {index + 1}
                    </td>

                    <td style={{ padding: '12px 8px' }}>
                      <div style={{ fontWeight: 700, color: isMe ? 'var(--neon-cyan)' : 'var(--text-primary)' }}>
                        {record.playerName} {isMe && <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>(Siz)</span>}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {new Date(record.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                      </div>
                    </td>

                    <td style={{ padding: '12px 8px' }}>
                      <span className="badge" style={{ background: 'rgba(255,255,255,0.06)', fontSize: '0.7rem' }}>
                        {DIFFICULTY_CONFIGS[record.difficulty]?.name.split(' ')[0]}
                      </span>
                    </td>

                    <td style={{ padding: '12px 8px', fontSize: '0.8rem' }}>
                      🐠 {record.itemsSummary.fish} • 🦪 {record.itemsSummary.pearl} • 💎 {record.itemsSummary.treasure}
                    </td>

                    <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 800, fontSize: '1rem', color: 'var(--neon-gold)' }}>
                      {record.score}
                    </td>

                    <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                      {isMe && (
                        <button
                          onClick={() => handleDeleteScore(record.id)}
                          disabled={deletingId === record.id}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--neon-coral)',
                            cursor: 'pointer',
                            padding: 4,
                            opacity: 0.7,
                          }}
                          title="Bu skoru sil (CRUD: Delete)"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
