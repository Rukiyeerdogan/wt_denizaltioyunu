'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CollectibleItem, Difficulty, DIFFICULTY_CONFIGS, PlayerStats } from '@/lib/types';
import { createInitialSubmarine, generateGameWorld, SubmarineState } from '@/lib/gameEngine';

interface SubmarineCanvasProps {
  seed: number;
  difficulty: Difficulty;
  isMultiplayer: boolean;
  onProgressUpdate: (stats: PlayerStats, progress: number) => void;
  onGameOver: (finalStats: PlayerStats) => void;
  controls: {
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
    boost: boolean;
  };
}

interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}

export default function SubmarineCanvas({
  seed,
  difficulty,
  isMultiplayer,
  onProgressUpdate,
  onGameOver,
  controls,
}: SubmarineCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const subRef = useRef<SubmarineState>(createInitialSubmarine());
  const itemsRef = useRef<CollectibleItem[]>([]);
  const particlesRef = useRef<{ x: number; y: number; vx: number; vy: number; life: number; color: string; size: number }[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  
  const [remainingTime, setRemainingTime] = useState<number>(DIFFICULTY_CONFIGS[difficulty].duration);
  const remainingTimeRef = useRef<number>(DIFFICULTY_CONFIGS[difficulty].duration);
  const gameOverTriggeredRef = useRef(false);

  const statsRef = useRef<PlayerStats>({
    score: 0,
    fishCollected: 0,
    pearlsCollected: 0,
    treasuresCollected: 0,
    obstaclesHit: 0,
    remainingTime: DIFFICULTY_CONFIGS[difficulty].duration,
  });

  // Dünya nesnelerini başlat
  useEffect(() => {
    itemsRef.current = generateGameWorld(seed, difficulty);
    remainingTimeRef.current = DIFFICULTY_CONFIGS[difficulty].duration;
    setRemainingTime(remainingTimeRef.current);
    gameOverTriggeredRef.current = false;
  }, [seed, difficulty]);

  // Saniyede 1 kez progress senkronizasyonu (Gerçek zamanlı mesaj bütçesine uyum)
  useEffect(() => {
    const syncInterval = setInterval(() => {
      if (gameOverTriggeredRef.current) return;
      const initialDuration = DIFFICULTY_CONFIGS[difficulty].duration;
      const progress = Math.min(100, Math.max(0, Math.round(((initialDuration - remainingTimeRef.current) / initialDuration) * 100)));
      statsRef.current.remainingTime = Math.max(0, Math.round(remainingTimeRef.current));
      onProgressUpdate(statsRef.current, progress);
    }, 1000);

    return () => clearInterval(syncInterval);
  }, [difficulty, onProgressUpdate]);

  // Süre geri sayım döngüsü
  useEffect(() => {
    const timer = setInterval(() => {
      if (gameOverTriggeredRef.current) return;
      remainingTimeRef.current = Math.max(0, remainingTimeRef.current - 1);
      setRemainingTime(remainingTimeRef.current);

      if (remainingTimeRef.current <= 0 && !gameOverTriggeredRef.current) {
        gameOverTriggeredRef.current = true;
        statsRef.current.remainingTime = 0;
        onGameOver(statsRef.current);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [onGameOver]);

  const addFloatingText = useCallback((x: number, y: number, text: string, color: string) => {
    floatingTextsRef.current.push({
      id: Date.now() + Math.random(),
      x,
      y,
      text,
      color,
      life: 1.0,
    });
  }, []);

  // Mouse & Touchpad hassas kontrol durumu
  const mousePosRef = useRef<{ x: number; y: number; active: boolean; isDown: boolean }>({
    x: 0,
    y: 0,
    active: false,
    isDown: false,
  });

  // Canvas render & oyun motoru döngüsü
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let lastTime = performance.now();

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Mouse / Touchpad dinleyicileri
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mousePosRef.current.x = (e.clientX - rect.left) * window.devicePixelRatio;
      mousePosRef.current.y = (e.clientY - rect.top) * window.devicePixelRatio;
      mousePosRef.current.active = true;
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        mousePosRef.current.isDown = true;
      }
    };

    const handleMouseUp = () => {
      mousePosRef.current.isDown = false;
    };

    const handleMouseLeave = () => {
      mousePosRef.current.active = false;
      mousePosRef.current.isDown = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    const render = (currentTime: number) => {
      const dt = Math.min(0.1, (currentTime - lastTime) / 1000);
      lastTime = currentTime;

      const width = canvas.width;
      const height = canvas.height;
      const scale = width / 100;

      // 1. Denizaltı Kontrolleri & Hareketi
      const sub = subRef.current;
      const baseSpeed = controls.boost ? 40 : 25;
      let targetVx = 0;
      let targetVy = 0;

      let subScreenX = (sub.x / 100) * width;
      let subScreenY = (sub.y / 100) * height;

      // Mouse / Mousepad Açısı: İmlecin konumuna doğru ultra hassas dönüş
      const mouse = mousePosRef.current;
      if (mouse.active) {
        const dx = mouse.x - subScreenX;
        const dy = mouse.y - subScreenY;
        const distToMouse = Math.hypot(dx, dy);

        if (distToMouse > 15) {
          sub.targetAngle = Math.atan2(dy, dx);
        }

        // Mouse basılı tutulduğunda fareye doğru ileri itiş gücü (Mouse propulsion)
        if (mouse.isDown && distToMouse > 25) {
          targetVx += Math.cos(sub.targetAngle) * baseSpeed;
          targetVy += Math.sin(sub.targetAngle) * baseSpeed;
        }
      }

      // Klavye Yön Tuşları / WASD (Mouse ile entegre veya serbest yönlendirme)
      if (controls.up || controls.down || controls.left || controls.right) {
        let keyVx = 0;
        let keyVy = 0;

        if (controls.left) keyVx -= 1;
        if (controls.right) keyVx += 1;
        if (controls.up) keyVy -= 1;
        if (controls.down) keyVy += 1;

        const mag = Math.hypot(keyVx, keyVy);
        if (mag > 0) {
          keyVx /= mag;
          keyVy /= mag;
          targetVx += keyVx * baseSpeed;
          targetVy += keyVy * baseSpeed;

          // Eğer mouse aktif değilse klavye yönüne dön
          if (!mouse.active) {
            sub.targetAngle = Math.atan2(keyVy, keyVx);
          }
        }
      }

      // İvmelenme & Sürtünme (Pürüzsüz akıcı sürüş)
      sub.vx += (targetVx - sub.vx) * 7 * dt;
      sub.vy += (targetVy - sub.vy) * 7 * dt;

      sub.x += (sub.vx * dt * 100) / width;
      sub.y += (sub.vy * dt * 100) / height;

      // Sınırlar
      sub.x = Math.max(3, Math.min(97, sub.x));
      sub.y = Math.max(4, Math.min(96, sub.y));

      // En kısa açıdan pürüzsüz rotasyon (-PI to +PI normalizasyonu)
      let angleDiff = sub.targetAngle - sub.angle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      sub.angle += angleDiff * 14 * dt;

      // Güncel ekran koordinatları
      subScreenX = (sub.x / 100) * width;
      subScreenY = (sub.y / 100) * height;

      // 2. Arka Plan Çizimi (Derin okyanus katmanları)
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, '#0a2342');
      gradient.addColorStop(0.4, '#07162c');
      gradient.addColorStop(0.8, '#030b17');
      gradient.addColorStop(1, '#02050b');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Derinlik dalgaları ve akıntı çizgileri
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.05)';
      ctx.lineWidth = 2 * window.devicePixelRatio;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        const yOffset = (height / 5) * (i + 1) + Math.sin(currentTime * 0.002 + i) * 15;
        ctx.moveTo(0, yOffset);
        ctx.bezierCurveTo(width * 0.3, yOffset - 25, width * 0.7, yOffset + 25, width, yOffset);
        ctx.stroke();
      }

      // 3. Denizaltı Projektör Işığı (Fener Hüzmesi)
      ctx.save();
      ctx.translate(subScreenX, subScreenY);
      ctx.rotate(sub.angle);

      const lightDist = width * 0.35;
      const lightSpread = 0.55;
      const lightGrad = ctx.createRadialGradient(0, 0, 10, lightDist * 0.7, 0, lightDist);
      lightGrad.addColorStop(0, 'rgba(0, 240, 255, 0.35)');
      lightGrad.addColorStop(0.5, 'rgba(0, 240, 255, 0.12)');
      lightGrad.addColorStop(1, 'rgba(0, 240, 255, 0)');

      ctx.beginPath();
      ctx.moveTo(20, 0);
      ctx.arc(0, 0, lightDist, -lightSpread, lightSpread);
      ctx.closePath();
      ctx.fillStyle = lightGrad;
      ctx.fill();
      ctx.restore();

      // 4. Nesnelerin Çizimi ve Çarpışma Kontrolü
      const items = itemsRef.current;
      for (const item of items) {
        if (item.collected) continue;

        // Nesne yüzme animasyonu
        item.x += item.vx * dt * 25;
        item.y += item.vy * dt * 25;

        // Ekran kenarlarından sekme
        if (item.x < 5 || item.x > 95) item.vx *= -1;
        if (item.y < 8 || item.y > 92) item.vy *= -1;

        const ix = (item.x / 100) * width;
        const iy = (item.y / 100) * height;
        const iradius = item.radius * (width / 900);

        // Çarpışma kontrolü
        const dist = Math.hypot(subScreenX - ix, subScreenY - iy);
        const hitDistance = iradius + (sub.size * scale) * 0.45;

        if (dist < hitDistance && !gameOverTriggeredRef.current) {
          item.collected = true;

          if (item.type === 'fish') {
            statsRef.current.fishCollected += 1;
            statsRef.current.score += Math.round(item.points * DIFFICULTY_CONFIGS[difficulty].scoreMultiplier);
            addFloatingText(ix, iy, `+${item.points} Balık`, '#00f0ff');
          } else if (item.type === 'pearl') {
            statsRef.current.pearlsCollected += 1;
            statsRef.current.score += Math.round(item.points * DIFFICULTY_CONFIGS[difficulty].scoreMultiplier);
            remainingTimeRef.current += item.timeBonus;
            setRemainingTime(Math.round(remainingTimeRef.current));
            addFloatingText(ix, iy, `+${item.points} Puan & +${item.timeBonus}s Oksijen`, '#ffd166');
          } else if (item.type === 'treasure') {
            statsRef.current.treasuresCollected += 1;
            statsRef.current.score += Math.round(item.points * DIFFICULTY_CONFIGS[difficulty].scoreMultiplier);
            addFloatingText(ix, iy, `💎 +${item.points} HAZİNE!`, '#ff007f');
          } else if (item.type === 'mine' || item.type === 'jellyfish') {
            statsRef.current.obstaclesHit += 1;
            statsRef.current.score = Math.max(0, statsRef.current.score + item.points);
            remainingTimeRef.current = Math.max(0, remainingTimeRef.current + item.timeBonus);
            setRemainingTime(Math.round(remainingTimeRef.current));
            addFloatingText(ix, iy, `⚠️ ÇARPIŞMA! ${item.timeBonus}s`, '#ff2a70');
          }

          // Parçacık patlaması
          for (let p = 0; p < 8; p++) {
            particlesRef.current.push({
              x: ix,
              y: iy,
              vx: (Math.random() - 0.5) * 120,
              vy: (Math.random() - 0.5) * 120,
              life: 0.6,
              color: item.type === 'mine' ? '#ff2a70' : '#00f0ff',
              size: 3 + Math.random() * 4,
            });
          }
        }

        // Nesneleri Çiz
        ctx.save();
        ctx.translate(ix, iy);

        if (item.type === 'fish') {
          // Tropik Balık
          const fishDir = item.vx >= 0 ? 1 : -1;
          ctx.scale(fishDir, 1);
          const wiggle = Math.sin(currentTime * 0.015 + ix) * 3;
          
          ctx.fillStyle = '#00f0ff';
          ctx.beginPath();
          ctx.ellipse(0, 0, iradius, iradius * 0.55, 0, 0, Math.PI * 2);
          ctx.fill();

          // Kuyruk
          ctx.fillStyle = '#00ffaa';
          ctx.beginPath();
          ctx.moveTo(-iradius * 0.7, 0);
          ctx.lineTo(-iradius * 1.5, -iradius * 0.6 + wiggle);
          ctx.lineTo(-iradius * 1.5, iradius * 0.6 + wiggle);
          ctx.closePath();
          ctx.fill();

          // Parlak göz
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(iradius * 0.4, -iradius * 0.15, 2.5, 0, Math.PI * 2);
          ctx.fill();
        } else if (item.type === 'pearl') {
          // İstiridye & İnci
          ctx.fillStyle = '#3a506b';
          ctx.beginPath();
          ctx.arc(0, 3, iradius, Math.PI, 0);
          ctx.fill();

          // Parlak İnci
          const glowGrad = ctx.createRadialGradient(0, -2, 2, 0, -2, iradius * 0.6);
          glowGrad.addColorStop(0, '#ffffff');
          glowGrad.addColorStop(0.5, '#ffd166');
          glowGrad.addColorStop(1, 'rgba(255, 209, 102, 0.2)');
          ctx.fillStyle = glowGrad;
          ctx.beginPath();
          ctx.arc(0, -2, iradius * 0.5, 0, Math.PI * 2);
          ctx.fill();
        } else if (item.type === 'treasure') {
          // Batık Hazine Sandığı
          ctx.fillStyle = '#b7791f';
          ctx.fillRect(-iradius * 0.8, -iradius * 0.5, iradius * 1.6, iradius * 1.0);
          ctx.strokeStyle = '#ffd700';
          ctx.lineWidth = 2;
          ctx.strokeRect(-iradius * 0.8, -iradius * 0.5, iradius * 1.6, iradius * 1.0);

          // Mücevher ışıltısı
          const spark = (Math.sin(currentTime * 0.008) + 1) * 0.5;
          ctx.fillStyle = `rgba(255, 215, 0, ${0.4 + spark * 0.6})`;
          ctx.beginPath();
          ctx.arc(0, -iradius * 0.6, 5 * spark + 3, 0, Math.PI * 2);
          ctx.fill();
        } else if (item.type === 'mine') {
          // Dikenli Deniz Mayını
          ctx.fillStyle = '#1e293b';
          ctx.beginPath();
          ctx.arc(0, 0, iradius * 0.7, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ff2a70';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Dikenler
          for (let s = 0; s < 6; s++) {
            const spikeAngle = (s * Math.PI) / 3;
            ctx.beginPath();
            ctx.moveTo(Math.cos(spikeAngle) * iradius * 0.6, Math.sin(spikeAngle) * iradius * 0.6);
            ctx.lineTo(Math.cos(spikeAngle) * iradius * 1.1, Math.sin(spikeAngle) * iradius * 1.1);
            ctx.stroke();
          }

          // Yanıp sönen kırmızı uyarı ışığı
          const blink = (Math.sin(currentTime * 0.01) + 1) * 0.5;
          ctx.fillStyle = `rgba(255, 42, 112, ${blink})`;
          ctx.beginPath();
          ctx.arc(0, 0, 4, 0, Math.PI * 2);
          ctx.fill();
        } else if (item.type === 'jellyfish') {
          // Zehirli Denizanası
          const pulse = (Math.sin(currentTime * 0.005) + 1) * 0.2;
          ctx.fillStyle = 'rgba(255, 0, 127, 0.45)';
          ctx.beginPath();
          ctx.ellipse(0, -iradius * 0.2, iradius * (0.8 + pulse), iradius * 0.6, 0, Math.PI, 0);
          ctx.fill();

          // Dokunaçlar
          ctx.strokeStyle = 'rgba(255, 0, 127, 0.7)';
          ctx.lineWidth = 1.5;
          for (let t = -2; t <= 2; t++) {
            ctx.beginPath();
            ctx.moveTo(t * (iradius * 0.25), 0);
            ctx.quadraticCurveTo(
              t * (iradius * 0.3) + Math.sin(currentTime * 0.008 + t) * 6,
              iradius * 0.7,
              t * (iradius * 0.2),
              iradius * 1.2
            );
            ctx.stroke();
          }
        }

        ctx.restore();
      }

      // 5. Denizaltıyı Çiz (Submarine Render - Sarı & Altın Okyanus Teması, Kompakt Boyut)
      ctx.save();
      ctx.translate(subScreenX, subScreenY);
      ctx.rotate(sub.angle);

      const subLength = sub.size * scale * 1.8;
      const subHeight = sub.size * scale * 0.9;

      // Gövde (Derin Deniz Araştırma Sarısı & Altın Degrade)
      const bodyGrad = ctx.createLinearGradient(-subLength * 0.5, 0, subLength * 0.5, 0);
      bodyGrad.addColorStop(0, '#e85d04');
      bodyGrad.addColorStop(0.35, '#faa307');
      bodyGrad.addColorStop(0.7, '#ffba08');
      bodyGrad.addColorStop(1, '#ffdd00');

      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.ellipse(0, 0, subLength * 0.5, subHeight * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffe600';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Gövde Üzeri Turkuaz Güverte Şeridi
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-subLength * 0.35, 0);
      ctx.lineTo(subLength * 0.35, 0);
      ctx.stroke();

      // Kule (Periskop / Conning tower)
      ctx.fillStyle = '#d00000';
      ctx.fillRect(-subLength * 0.15, -subHeight * 0.75, subLength * 0.3, subHeight * 0.4);
      ctx.strokeStyle = '#faa307';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-subLength * 0.15, -subHeight * 0.75, subLength * 0.3, subHeight * 0.4);

      // Kule Tepe Uyarı Feneri
      const beaconFlicker = (Math.sin(currentTime * 0.01) + 1) * 0.5;
      ctx.fillStyle = `rgba(255, 42, 112, ${0.4 + beaconFlicker * 0.6})`;
      ctx.beginPath();
      ctx.arc(0, -subHeight * 0.85, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Cam Kubbe Kokpit (Neon Buz Mavisi)
      const glassGrad = ctx.createRadialGradient(
        subLength * 0.28,
        -subHeight * 0.12,
        1,
        subLength * 0.25,
        -subHeight * 0.08,
        subHeight * 0.3
      );
      glassGrad.addColorStop(0, '#ffffff');
      glassGrad.addColorStop(0.4, 'rgba(0, 240, 255, 0.9)');
      glassGrad.addColorStop(1, 'rgba(0, 119, 255, 0.75)');

      ctx.fillStyle = glassGrad;
      ctx.beginPath();
      ctx.arc(subLength * 0.26, -subHeight * 0.08, subHeight * 0.26, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Pervane (Altın Pirinç Kanatlar)
      const propAngle = currentTime * (controls.boost ? 0.07 : 0.035);
      ctx.fillStyle = '#ffd166';
      ctx.save();
      ctx.translate(-subLength * 0.54, 0);
      ctx.rotate(propAngle);
      ctx.fillRect(-2, -subHeight * 0.45, 4, subHeight * 0.9);
      ctx.restore();

      // Pervaneden çıkan hava kabarcıkları
      if (Math.abs(sub.vx) > 0.5 || Math.abs(sub.vy) > 0.5) {
        particlesRef.current.push({
          x: subScreenX - Math.cos(sub.angle) * subLength * 0.55,
          y: subScreenY - Math.sin(sub.angle) * subLength * 0.55,
          vx: -Math.cos(sub.angle) * (20 + Math.random() * 40) + (Math.random() - 0.5) * 10,
          vy: -Math.sin(sub.angle) * (20 + Math.random() * 40) - (Math.random() * 20),
          life: 0.45,
          color: 'rgba(255, 255, 255, 0.75)',
          size: 2 + Math.random() * 2.5,
        });
      }

      ctx.restore();

      // 6. Parçacıklar (Particles)
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt * 1.5;

        if (p.life <= 0) {
          particlesRef.current.splice(i, 1);
          continue;
        }

        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
      }

      // 7. Uçuşan Skor Metinleri (Floating Score Texts)
      for (let i = floatingTextsRef.current.length - 1; i >= 0; i--) {
        const ft = floatingTextsRef.current[i];
        ft.y -= dt * 35;
        ft.life -= dt * 1.2;

        if (ft.life <= 0) {
          floatingTextsRef.current.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.font = `bold ${Math.round(15 * window.devicePixelRatio)}px ${getComputedStyle(document.body).fontFamily}`;
        ctx.fillStyle = ft.color;
        ctx.shadowColor = ft.color;
        ctx.shadowBlur = 8;
        ctx.globalAlpha = Math.max(0, ft.life);
        ctx.fillText(ft.text, ft.x - 30, ft.y);
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [controls, difficulty, addFloatingText]);

  const config = DIFFICULTY_CONFIGS[difficulty];
  const timeProgress = Math.max(0, Math.min(100, (remainingTime / config.duration) * 100));

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 16, overflow: 'hidden' }}>
      {/* HUD (Oyun İçi Canlı Gösterge) */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          right: 12,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pointerEvents: 'none',
          zIndex: 20,
        }}
      >
        {/* Skor & Oksijen */}
        <div className="glass-panel" style={{ padding: '8px 16px', display: 'flex', gap: 16, alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Skor</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--neon-cyan)' }}>
              {statsRef.current.score}
            </div>
          </div>
          <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: 16 }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Oksijen / Süre</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: remainingTime <= 10 ? 'var(--neon-coral)' : '#ffd166' }}>
              {remainingTime}s
            </div>
          </div>
        </div>

        {/* Toplanan Nesneler Rozetleri */}
        <div className="glass-panel" style={{ padding: '8px 14px', display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.9rem', fontWeight: 700 }}>
            <span>🐠</span> {statsRef.current.fishCollected}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.9rem', fontWeight: 700 }}>
            <span>🦪</span> {statsRef.current.pearlsCollected}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.9rem', fontWeight: 700 }}>
            <span>💎</span> {statsRef.current.treasuresCollected}
          </div>
        </div>
      </div>

      {/* Oksijen İlerleme Çubuğu */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
          height: 6,
          background: 'rgba(255, 255, 255, 0.1)',
          zIndex: 25,
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${timeProgress}%`,
            background: remainingTime <= 10 ? 'var(--neon-coral)' : 'var(--neon-cyan)',
            boxShadow: `0 0 10px ${remainingTime <= 10 ? 'var(--neon-coral)' : 'var(--neon-cyan)'}`,
            transition: 'width 1s linear',
          }}
        />
      </div>

      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          cursor: 'crosshair',
        }}
      />
    </div>
  );
}
