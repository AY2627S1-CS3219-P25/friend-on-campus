/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-11-07
 * Scope: Created FriendPinLogo brand component featuring the verified Kent Ridge location pin merged with smiling student courier companion face, speed trails, and delivery star in NUS Blue and NUS Orange gradients.
 * Author review: <to be completed by yanhwee>
 */

import React, { useId } from 'react';

interface FriendPinLogoProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number;
}

export function FriendPinLogo({ className = 'w-9 h-9', size, ...props }: FriendPinLogoProps) {
  const id = useId().replace(/:/g, '');
  const bgGradId = `foc-bg-${id}`;
  const orangePinId = `foc-pin-${id}`;
  const shadowId = `foc-shadow-${id}`;

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <defs>
        <linearGradient id={bgGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#003D7C" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>
        <linearGradient id={orangePinId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF9800" />
          <stop offset="100%" stopColor="#EF7C00" />
        </linearGradient>
        <filter id={shadowId} x="-15%" y="-15%" width="130%" height="130%">
          <feDropShadow dx="0" dy="2.5" stdDeviation="2" floodOpacity="0.25" floodColor="#001840" />
        </filter>
      </defs>

      {/* Background Squircle */}
      <rect x="2" y="2" width="60" height="60" rx="16" fill={`url(#${bgGradId})`} />

      {/* The Friend on Campus / tompang Smiling Courier Pin */}
      <g filter={`url(#${shadowId})`}>
        {/* Campus Pin Silhouette in Warm Orange */}
        <path
          d="M32 12C23.16 12 16 19.16 16 28C16 38.5 29.5 50.2 30.6 51.1C31.4 51.8 32.6 51.8 33.4 51.1C34.5 50.2 48 38.5 48 28C48 19.16 40.84 12 32 12Z"
          fill={`url(#${orangePinId})`}
        />

        {/* Pure White Inner Friend Face */}
        <circle cx="32" cy="27" r="10" fill="#FFFFFF" />

        {/* Cute Smiling Eyes: ^ _ ^ */}
        <path
          d="M26.5 26C27.5 24 29.5 24 30.5 26"
          stroke="#003D7C"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M33.5 26C34.5 24 36.5 24 37.5 26"
          stroke="#003D7C"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />

        {/* Big Happy Smile */}
        <path
          d="M29 29.5C30.2 31.5 33.8 31.5 35 29.5"
          stroke="#003D7C"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />

        {/* Little Pin Accent */}
        <path d="M32 17.5L34 20.5H30L32 17.5Z" fill="#FFFFFF" />
      </g>

      {/* Speed / Motion Trails */}
      <path
        d="M9 25H13M7 31H12M10 37H14"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.85"
      />
      {/* Delivery Sparkle Star */}
      <circle cx="53" cy="14" r="2.2" fill="#FDE047" />
    </svg>
  );
}
