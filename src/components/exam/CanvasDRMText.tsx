'use client';

import React, { useEffect, useRef } from 'react';

interface CanvasDRMTextProps {
  text: string;
  className?: string;
  fontSize?: number;
  color?: string;
  isBlackout?: boolean;
}

export const CanvasDRMText: React.FC<CanvasDRMTextProps> = ({
  text,
  fontSize = 16,
  color = '#0f172a',
  isBlackout = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high-DPI crisp text
    const dpr = window.devicePixelRatio || 1;
    const font = `700 ${fontSize}px sans-serif`;

    ctx.font = font;
    const metrics = ctx.measureText(text || '');
    const width = Math.max(metrics.width + 20, 200);
    const height = fontSize * 1.6;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(dpr, dpr);

    if (isBlackout) {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);
      return;
    }

    // Render Canvas Text under DRM Protection
    ctx.clearRect(0, 0, width, height);
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 5, height / 2);
  }, [text, fontSize, color, isBlackout]);

  if (isBlackout) {
    return <div className="w-full h-8 bg-black rounded-lg animate-pulse" />;
  }

  return (
    <canvas
      ref={canvasRef}
      className="inline-block pointer-events-none select-none"
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
    />
  );
};
