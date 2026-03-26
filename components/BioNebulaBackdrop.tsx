'use client';

import { useEffect, useRef } from 'react';

type Cell = {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  phase: number;
  tone: string;
};

type Anchor = {
  x: number;
  y: number;
  radius: number;
  color: string;
};

type Strand = {
  from: number;
  to: number;
  width: number;
  color: string;
};

const CELL_COUNT = 42;

const createCells = () =>
  Array.from({ length: CELL_COUNT }).map(
    (): Cell => ({
      x: Math.random(),
      y: Math.random(),
      radius: Math.random() * 4.4 + 1.2,
      vx: (Math.random() - 0.5) * 0.00045,
      vy: (Math.random() - 0.5) * 0.00045,
      phase: Math.random() * Math.PI * 2,
      tone:
        Math.random() > 0.65
          ? 'rgba(110, 255, 62, 0.08)'
          : Math.random() > 0.35
            ? 'rgba(210, 0, 0, 0.1)'
            : 'rgba(110, 24, 24, 0.08)'
    })
  );

const anchors: Anchor[] = [
  { x: 0.5, y: 0.46, radius: 210, color: 'rgba(202, 24, 24, 0.09)' },
  { x: 0.28, y: 0.34, radius: 150, color: 'rgba(112, 0, 34, 0.05)' },
  { x: 0.17, y: 0.62, radius: 104, color: 'rgba(76, 12, 12, 0.05)' },
  { x: 0.73, y: 0.64, radius: 168, color: 'rgba(62, 96, 34, 0.05)' },
  { x: 0.82, y: 0.3, radius: 118, color: 'rgba(90, 22, 18, 0.05)' },
  { x: 0.58, y: 0.82, radius: 138, color: 'rgba(120, 32, 18, 0.05)' }
];

const strands: Strand[] = [
  { from: 0, to: 1, width: 9, color: 'rgba(170, 16, 16, 0.18)' },
  { from: 0, to: 2, width: 7, color: 'rgba(146, 15, 15, 0.14)' },
  { from: 0, to: 3, width: 8, color: 'rgba(52, 96, 22, 0.12)' },
  { from: 0, to: 4, width: 6, color: 'rgba(177, 74, 32, 0.1)' },
  { from: 3, to: 5, width: 5, color: 'rgba(48, 92, 26, 0.1)' },
  { from: 1, to: 2, width: 4, color: 'rgba(110, 18, 56, 0.1)' },
  { from: 4, to: 3, width: 4, color: 'rgba(40, 56, 18, 0.09)' }
];

export default function BioNebulaBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const cellsRef = useRef<Cell[]>(createCells());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    const draw = (time: number) => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      context.clearRect(0, 0, width, height);

      anchors.forEach((anchor, index) => {
        const pulse = Math.sin(time * 0.00045 + index * 0.8) * 0.06 + 0.94;
        const gradient = context.createRadialGradient(
          width * anchor.x,
          height * anchor.y,
          0,
          width * anchor.x,
          height * anchor.y,
          anchor.radius * pulse
        );
        gradient.addColorStop(0, anchor.color);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        context.fillStyle = gradient;
        context.beginPath();
        context.arc(
          width * anchor.x,
          height * anchor.y,
          anchor.radius * pulse,
          0,
          Math.PI * 2
        );
        context.fill();
      });

      strands.forEach((strand, index) => {
        const from = anchors[strand.from];
        const to = anchors[strand.to];
        const startX = width * from.x;
        const startY = height * from.y;
        const endX = width * to.x;
        const endY = height * to.y;
        const deltaX = endX - startX;
        const deltaY = endY - startY;
        const wobble = Math.sin(time * 0.0012 + index * 1.7) * 32;

        context.beginPath();
        context.moveTo(startX, startY);
        context.bezierCurveTo(
          startX + deltaX * 0.32 + wobble,
          startY + deltaY * 0.08 - wobble * 0.3,
          startX + deltaX * 0.72 - wobble * 0.6,
          startY + deltaY * 0.88 + wobble * 0.24,
          endX,
          endY
        );
        context.strokeStyle = strand.color;
        context.lineWidth = strand.width;
        context.lineCap = 'round';
        context.shadowBlur = 18;
        context.shadowColor = strand.color;
        context.stroke();

        context.strokeStyle = 'rgba(255, 255, 255, 0.45)';
        context.lineWidth = Math.max(1, strand.width * 0.24);
        context.shadowBlur = 0;
        context.stroke();
      });

      cellsRef.current.forEach((cell) => {
        cell.x += cell.vx;
        cell.y += cell.vy;

        if (cell.x < -0.05 || cell.x > 1.05) cell.vx *= -1;
        if (cell.y < -0.05 || cell.y > 1.05) cell.vy *= -1;

        const cx = cell.x * width + Math.sin(time * 0.0008 + cell.phase) * 12;
        const cy = cell.y * height + Math.cos(time * 0.0007 + cell.phase) * 10;
        const rx = cell.radius + Math.sin(time * 0.002 + cell.phase) * 1.6;
        const ry =
          cell.radius * 0.7 + Math.cos(time * 0.002 + cell.phase) * 1.2;

        context.beginPath();
        context.ellipse(
          cx,
          cy,
          Math.max(0.4, rx),
          Math.max(0.4, ry),
          time * 0.00008 + cell.phase,
          0,
          Math.PI * 2
        );
        context.fillStyle = cell.tone;
        context.fill();
      });

      animationFrameRef.current = window.requestAnimationFrame(draw);
    };

    animationFrameRef.current = window.requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      if (animationFrameRef.current != null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      <canvas ref={canvasRef} className="bio-canvas" />
      <div className="bio-scanlines" />
      <div className="bio-hud">
        <p className="bio-hud-kicker">&gt; INITIALIZING_BIOMASS...</p>
        <h2 className="bio-hud-title" data-text="NEBULA_SYSTEM.exe">
          NEBULA_SYSTEM.exe
        </h2>
        <p className="bio-hud-warning">WARNING: ORGANIC CORRUPTION DETECTED</p>
      </div>
    </div>
  );
}
