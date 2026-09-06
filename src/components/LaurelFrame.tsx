'use client';

import React from 'react';

type LaurelFrameProps = {
  frameId: string;
  size?: number;
  children?: React.ReactNode;
  className?: string;
};

const TIER_COLORS: Record<string, { primary: string; secondary: string; glow: string }> = {
  'none': { primary: '', secondary: '', glow: '' },
  'laurel_bronze': { primary: '#cd7f32', secondary: '#a0622d', glow: 'rgba(205,127,50,0.3)' },
  'laurel_silver': { primary: '#c0c0c0', secondary: '#9a9a9a', glow: 'rgba(192,192,192,0.3)' },
  'laurel_gold': { primary: '#ffd700', secondary: '#daa520', glow: 'rgba(255,215,0,0.4)' },
  'laurel_rainbow': { primary: '#a78bfa', secondary: '#c084fc', glow: 'rgba(168,85,247,0.3)' },
  'laurel_neon': { primary: '#00ffcc', secondary: '#00cc99', glow: 'rgba(0,255,204,0.4)' },
  'laurel_diamond': { primary: '#b9f2ff', secondary: '#7dd3fc', glow: 'rgba(185,242,255,0.4)' },
  'laurel_flame': { primary: '#ff4500', secondary: '#ff6a00', glow: 'rgba(255,69,0,0.4)' },
  'admin_tech': { primary: '#00d4ff', secondary: '#0066ff', glow: 'rgba(0,212,255,0.4)' },
};

// Simple circle frame with border
function SimpleCircleFrame({ frameId, size = 80, children, className }: LaurelFrameProps) {
  const colors = TIER_COLORS[frameId];
  if (!colors || frameId === 'none') {
    return <div className={className}>{children}</div>;
  }

  const r = size / 2;
  const strokeWidth = frameId === 'laurel_gold' || frameId === 'laurel_flame' ? 3 : 2;
  const gap = 4;

  // Unique gradient ID per frame to avoid SVG conflicts
  const gradId = `grad-${frameId}`;
  const glowId = `glow-${frameId}`;

  return (
    <div className={`relative inline-flex items-center justify-center ${className || ''}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.primary} />
            <stop offset="100%" stopColor={colors.secondary} />
          </linearGradient>
          <filter id={glowId}>
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Main ring */}
        <circle
          cx={r}
          cy={r}
          r={r - gap}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={strokeWidth}
          filter={`url(#${glowId})`}
        />

        {/* Decorative dots on the ring (for gold, flame, diamond) */}
        {(frameId === 'laurel_gold' || frameId === 'laurel_flame' || frameId === 'laurel_diamond') && (
          <>
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
              const rad = (angle * Math.PI) / 180;
              const x = r + Math.cos(rad) * (r - gap);
              const y = r + Math.sin(rad) * (r - gap);
              return <circle key={angle} cx={x} cy={y} r={2} fill={colors.primary} opacity={0.8} />;
            })}
          </>
        )}

        {/* Double ring for neon and rainbow */}
        {(frameId === 'laurel_neon' || frameId === 'laurel_rainbow') && (
          <circle
            cx={r}
            cy={r}
            r={r - gap - 4}
            fill="none"
            stroke={colors.secondary}
            strokeWidth={1}
            opacity={0.5}
          />
        )}

        {/* Dashed ring for silver */}
        {frameId === 'laurel_silver' && (
          <circle
            cx={r}
            cy={r}
            r={r - gap - 3}
            fill="none"
            stroke={colors.secondary}
            strokeWidth={1}
            strokeDasharray="4 3"
            opacity={0.5}
          />
        )}
      </svg>
      {children}
    </div>
  );
}

// Admin tech frame — simple circuit ring
function AdminTechFrame({ size = 80, children, className }: { size?: number; children: React.ReactNode; className?: string }) {
  const r = size / 2;
  return (
    <div className={`relative inline-flex items-center justify-center ${className || ''}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0">
        <defs>
          <linearGradient id="admin-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00d4ff" />
            <stop offset="100%" stopColor="#0066ff" />
          </linearGradient>
          <filter id="admin-glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Main ring */}
        <circle cx={r} cy={r} r={r - 4} fill="none" stroke="url(#admin-grad)" strokeWidth="2.5" filter="url(#admin-glow)" />
        {/* Circuit nodes */}
        {[0, 90, 180, 270].map((angle) => {
          const rad = (angle * Math.PI) / 180;
          const x = r + Math.cos(rad) * (r - 4);
          const y = r + Math.sin(rad) * (r - 4);
          return <circle key={angle} cx={x} cy={y} r={3} fill="#00d4ff" />;
        })}
      </svg>
      {/* Admin badge */}
      <div
        className="absolute flex items-center justify-center rounded-full border-2 border-white dark:border-ink-800"
        style={{
          bottom: -2,
          right: -2,
          width: 18,
          height: 18,
          background: 'linear-gradient(135deg, #00d4ff, #0066ff)',
          fontSize: 10,
          color: '#fff',
          lineHeight: 1,
        }}
      >
        ⚙
      </div>
      {children}
    </div>
  );
}

export function LaurelFrame({ frameId, size = 80, children, className }: LaurelFrameProps) {
  if (frameId === 'none' || !frameId) {
    return <div className={className}>{children}</div>;
  }
  if (frameId === 'admin_tech') {
    return <AdminTechFrame size={size} className={className}>{children}</AdminTechFrame>;
  }
  return (
    <SimpleCircleFrame frameId={frameId} size={size} className={className}>
      {children}
    </SimpleCircleFrame>
  );
}

// Small version for shop/settings preview
export function LaurelFramePreview({ frameId, size = 64 }: { frameId: string; size?: number }) {
  if (frameId === 'none' || !frameId) {
    return (
      <div
        className="rounded-full bg-ink-200 dark:bg-ink-600"
        style={{ width: size * 0.6, height: size * 0.6 }}
      />
    );
  }
  return (
    <LaurelFrame frameId={frameId} size={size}>
      <div
        className="rounded-full bg-ink-200 dark:bg-ink-600"
        style={{ width: size * 0.6, height: size * 0.6 }}
      />
    </LaurelFrame>
  );
}
