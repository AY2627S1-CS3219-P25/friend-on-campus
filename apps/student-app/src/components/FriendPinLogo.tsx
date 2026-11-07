/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-11-07
 * Scope: Implemented Direction B (Crisp Modern Canvas) brand logo: crisp white squircle canvas with subtle border, featuring the vibrant sunset gradient 't.' with cheerful curved smile tail and campus location pin dot.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-11-07
 * Scope: Updated FriendPinLogo to Direction A Warm Campus Mango theme with vibrant tangerine/mango gradient (#FF5E3A -> #FF9500), pure white courier pin, warm sunlight face (#FFF7ED), rosy cheeks, and white motion trails.
 * Author review: <to be completed by yanhwee>
 *
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
  const markGradId = `foc-mark-${id}`;
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
        {/* Vibrant Tangerine / Mango Gradient */}
        <linearGradient id={markGradId} gradientUnits="userSpaceOnUse" x1="16" y1="12" x2="48" y2="48">
          <stop offset="0%" stopColor="#FF5E3A" />
          <stop offset="100%" stopColor="#FF9500" />
        </linearGradient>
        <filter id={shadowId} x="-15%" y="-15%" width="130%" height="130%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.12" floodColor="#7C2D12" />
        </filter>
      </defs>

      {/* Crisp Modern White Squircle Canvas with subtle border */}
      <rect x="2" y="2" width="60" height="60" rx="16" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1.5" />

      {/* Iconic 't.' Mark with Location Pin Dot in Vibrant Gradient */}
      <g filter={`url(#${shadowId})`}>
        {/* Lowercase 't' with a cheerful curved smile tail */}
        <path
          d="M27 14V34C27 41 31 45 37 45C39.5 45 42 44 43.5 43"
          stroke={`url(#${markGradId})`}
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Crossbar */}
        <path
          d="M19 24H37"
          stroke={`url(#${markGradId})`}
          strokeWidth="5"
          strokeLinecap="round"
        />
        {/* Location Pin Dot of 'tompang.' */}
        <path
          d="M45 15C42.2 15 40 17.2 40 20C40 23.5 44.5 27.5 45 28C45.5 27.5 50 23.5 50 20C50 17.2 47.8 15 45 15Z"
          fill={`url(#${markGradId})`}
        />
        <circle cx="45" cy="19.5" r="1.5" fill="#FFFFFF" />
      </g>
    </svg>
  );
}
