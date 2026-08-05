'use client';

import React, { useEffect, useState } from 'react';

interface WatermarkOverlayProps {
  studentName?: string;
  studentId?: string;
  userIp?: string;
  opacity?: number;
}

export const WatermarkOverlay: React.FC<WatermarkOverlayProps> = ({
  studentName = 'Student',
  studentId = '100',
  userIp = '192.168.1.3',
  opacity = 0.15,
}) => {
  const [timeString, setTimeString] = useState('');

  useEffect(() => {
    const update = () => {
      setTimeString(new Date().toLocaleTimeString());
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const watermarkText = `${studentName} • ID: ${studentId} • ${timeString}`;
  const tiles = Array.from({ length: 24 });

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-30 overflow-hidden select-none flex flex-wrap items-center justify-around gap-12 p-8"
      style={{ opacity }}
    >
      {tiles.map((_, i) => (
        <div
          key={i}
          className="text-slate-500 font-mono font-black text-sm tracking-widest uppercase transform -rotate-12 whitespace-nowrap drop-shadow-md"
          style={{
            userSelect: 'none',
            WebkitUserSelect: 'none',
            color: 'rgba(148, 163, 184, 0.6)' // slate-400 with 60% opacity
          }}
        >
          {watermarkText}
        </div>
      ))}
    </div>
  );
};
