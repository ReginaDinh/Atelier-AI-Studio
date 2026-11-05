import React, { useId } from 'react';
import { cn } from '../lib/utils';

export type AtelierLogoStyle = 'quantum';

interface AtelierLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  styleVariant?: AtelierLogoStyle;
  showWordmark?: boolean;
  showBadge?: boolean;
  isEditorial?: boolean;
  isMidnight?: boolean;
  className?: string;
  onClick?: () => void;
  allowCycleOnClick?: boolean;
}

export const AtelierLogo: React.FC<AtelierLogoProps> = ({
  size = 'md',
  showWordmark = true,
  showBadge = false,
  isEditorial = false,
  className,
  onClick,
}) => {
  const uid = useId().replace(/:/g, '');
  let iconPx = 30;
  let wordmarkClass = 'text-base font-semibold';
  let badgeClass = 'text-[9px] px-1.5 py-0.5';

  if (typeof size === 'number') {
    iconPx = size;
  } else {
    switch (size) {
      case 'xs':
        iconPx = 22;
        wordmarkClass = 'text-xs font-semibold';
        badgeClass = 'text-[9px] px-1.5 py-0.5';
        break;
      case 'sm':
        iconPx = 26;
        wordmarkClass = 'text-sm font-semibold';
        badgeClass = 'text-[9px] px-1.5 py-0.5';
        break;
      case 'md':
        iconPx = 30;
        wordmarkClass = 'text-[15px] font-semibold';
        badgeClass = 'text-[10px] px-1.5 py-0.5';
        break;
      case 'lg':
        iconPx = 42;
        wordmarkClass = 'text-lg font-semibold';
        badgeClass = 'text-[10px] px-2 py-0.5';
        break;
      case 'xl':
        iconPx = 54;
        wordmarkClass = 'text-xl font-bold';
        badgeClass = 'text-xs px-2.5 py-0.5';
        break;
    }
  }

  const containerSize = iconPx + 8;
  const borderRadius = Math.max(6, Math.round(containerSize * 0.26));
  const gradId = `quantumGrad-${uid}`;
  const ringGradId = `quantumRing-${uid}`;

  return (
    <div
      onClick={onClick}
      title="Atelier AI"
      className={cn(
        'inline-flex items-center gap-2.5 select-none transition-colors duration-200',
        onClick ? 'cursor-pointer' : '',
        className
      )}
    >
      {/* Signature Quantum Squircle — Uniform 4-edge border, zero outer shadow */}
      <div
        className={cn(
          'relative flex items-center justify-center shrink-0 overflow-hidden transition-colors duration-200 border',
          isEditorial
            ? 'bg-[#ffffff] border-[#e4e4e7]'
            : 'bg-[#121215] border-[#27272a]'
        )}
        style={{
          width: containerSize,
          height: containerSize,
          borderRadius: `${borderRadius}px`,
        }}
      >
        <svg
          width={iconPx}
          height={iconPx}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative z-10"
        >
          <defs>
            <linearGradient id={gradId} x1="12" y1="8" x2="54" y2="56" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={isEditorial ? '#0284c7' : '#38bdf8'} />
              <stop offset="50%" stopColor={isEditorial ? '#4f46e5' : '#818cf8'} />
              <stop offset="100%" stopColor={isEditorial ? '#9333ea' : '#c084fc'} />
            </linearGradient>
            <linearGradient id={ringGradId} x1="12" y1="8" x2="52" y2="56" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={isEditorial ? '#0ea5e9' : '#38bdf8'} />
              <stop offset="100%" stopColor={isEditorial ? '#8b5cf6' : '#a855f7'} />
            </linearGradient>
          </defs>

          {/* Isometric Hexagonal Quantum Nest */}
          <path
            d="M32 8L52 20V44L32 56L12 44V20L32 8Z"
            stroke={`url(#${ringGradId})`}
            strokeWidth="2.4"
            opacity={isEditorial ? '0.45' : '0.42'}
          />

          {/* Quantum Tri-Prism "A" Core */}
          <path
            d="M32 14L46 42H36L32 33L28 42H18L32 14Z"
            fill={`url(#${gradId})`}
          />

          {/* Inner Negative Aperture */}
          <path
            d="M26 35H38L32 23L26 35Z"
            fill={isEditorial ? '#ffffff' : '#121215'}
          />

          {/* Signature Quantum Vertex Nodes */}
          <circle cx="32" cy="14" r="2" fill={isEditorial ? '#0284c7' : '#e0f2fe'} />
          <circle cx="18" cy="42" r="2" fill={isEditorial ? '#4f46e5' : '#38bdf8'} />
          <circle cx="46" cy="42" r="2" fill={isEditorial ? '#9333ea' : '#c084fc'} />
        </svg>
      </div>

      {/* Wordmark */}
      {showWordmark && (
        <div className="flex items-center gap-1.5 leading-none">
          <div className="flex items-baseline gap-1">
            <span
              className={cn(
                'tracking-tight transition-colors',
                wordmarkClass,
                isEditorial ? 'text-[#18181b]' : 'text-[#f4f4f5]'
              )}
            >
              Atelier
            </span>
            <span
              className={cn(
                'font-semibold tracking-tight bg-clip-text text-transparent bg-gradient-to-r',
                wordmarkClass,
                isEditorial
                  ? 'from-[#0284c7] via-[#4f46e5] to-[#9333ea]'
                  : 'from-[#38bdf8] via-[#818cf8] to-[#c084fc]'
              )}
            >
              AI
            </span>
          </div>

          {showBadge && (
            <span
              className={cn(
                'font-mono uppercase tracking-wider font-medium rounded border leading-none',
                badgeClass,
                isEditorial
                  ? 'bg-[#f4f4f5] text-[#52525b] border-[#e4e4e7]'
                  : 'bg-[#18181b] text-[#a1a1aa] border-[#27272a]'
              )}
            >
              Studio
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default AtelierLogo;
