'use client';

import React from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Zap } from 'lucide-react';

interface VirtualControlsProps {
  onControlChange: (key: 'up' | 'down' | 'left' | 'right' | 'boost', state: boolean) => void;
}

export default function VirtualControls({ onControlChange }: VirtualControlsProps) {
  const handleTouch = (key: 'up' | 'down' | 'left' | 'right' | 'boost', state: boolean) => (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    onControlChange(key, state);
  };

  return (
    <div className="touch-controls">
      {/* Sanal Yön D-pad */}
      <div
        className="glass-panel touch-dpad"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 48px)',
          gridTemplateRows: 'repeat(3, 48px)',
          gap: 4,
          padding: 8,
          borderRadius: 24,
          background: 'rgba(5, 18, 38, 0.85)',
        }}
      >
        <div />
        <button
          className="btn-secondary"
          style={{ padding: 0 }}
          onTouchStart={handleTouch('up', true)}
          onTouchEnd={handleTouch('up', false)}
          onMouseDown={handleTouch('up', true)}
          onMouseUp={handleTouch('up', false)}
          aria-label="Yukarı"
        >
          <ArrowUp size={24} />
        </button>
        <div />

        <button
          className="btn-secondary"
          style={{ padding: 0 }}
          onTouchStart={handleTouch('left', true)}
          onTouchEnd={handleTouch('left', false)}
          onMouseDown={handleTouch('left', true)}
          onMouseUp={handleTouch('left', false)}
          aria-label="Sol"
        >
          <ArrowLeft size={24} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--neon-cyan)' }} />
        </div>
        <button
          className="btn-secondary"
          style={{ padding: 0 }}
          onTouchStart={handleTouch('right', true)}
          onTouchEnd={handleTouch('right', false)}
          onMouseDown={handleTouch('right', true)}
          onMouseUp={handleTouch('right', false)}
          aria-label="Sağ"
        >
          <ArrowRight size={24} />
        </button>

        <div />
        <button
          className="btn-secondary"
          style={{ padding: 0 }}
          onTouchStart={handleTouch('down', true)}
          onTouchEnd={handleTouch('down', false)}
          onMouseDown={handleTouch('down', true)}
          onMouseUp={handleTouch('down', false)}
          aria-label="Aşağı"
        >
          <ArrowDown size={24} />
        </button>
        <div />
      </div>

      {/* Turbo Boost Butonu */}
      <div className="touch-actions">
        <button
          className="btn-primary touch-boost"
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.75rem',
            background: 'linear-gradient(135deg, #ff007f 0%, #7928ca 100%)',
            boxShadow: '0 0 20px rgba(255, 0, 127, 0.5)',
          }}
          onTouchStart={handleTouch('boost', true)}
          onTouchEnd={handleTouch('boost', false)}
          onMouseDown={handleTouch('boost', true)}
          onMouseUp={handleTouch('boost', false)}
          aria-label="Hızlandırıcı Turbo"
        >
          <Zap size={28} />
          <span>BOOST</span>
        </button>
      </div>
    </div>
  );
}
