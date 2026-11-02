import React, { useState, useRef, useEffect, useCallback } from 'react';

interface JoystickProps {
  onMove: (data: { x: number; y: number }) => void;
  onEnd: () => void;
}

export const Joystick: React.FC<JoystickProps> = ({ onMove, onEnd }) => {
  const baseRef = useRef<HTMLDivElement>(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const touchId = useRef<number | null>(null);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!baseRef.current) return;

    const base = baseRef.current.getBoundingClientRect();
    const centerX = base.left + base.width / 2;
    const centerY = base.top + base.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxDistance = base.width / 2;

    const angle = Math.atan2(dy, dx);
    const clampedDistance = Math.min(distance, maxDistance);

    const x = Math.cos(angle) * clampedDistance;
    const y = Math.sin(angle) * clampedDistance;

    setKnobPos({ x, y });
    onMove({ x: x / maxDistance, y: y / maxDistance });
  }, [onMove]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (dragging) return;
    const touch = e.touches[0];
    touchId.current = touch.identifier;
    setDragging(true);
    handleMove(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragging) return;
    const touch = Array.from(e.touches).find(t => t.identifier === touchId.current);
    if (touch) handleMove(touch.clientX, touch.clientY);
  };

  const handleTouchEnd = () => {
    setDragging(false);
    setKnobPos({ x: 0, y: 0 });
    onEnd();
    touchId.current = null;
  };

  return (
    <div
      ref={baseRef}
      className="relative w-32 h-32 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center touch-none shadow-lg"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="w-16 h-16 rounded-full bg-white/40 shadow-inner border border-white/30 transition-transform"
        style={{
          transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
        }}
      />
    </div>
  );
};
