/**
 * AI Assistance Disclosure:
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
  const bgGradId = `foc-bg-${id}`;
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
        {/* Vibrant Warm Sunset / Tangerine Gradient */}
        <linearGradient id={bgGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF5E3A" />
          <stop offset="100%" stopColor="#FF9500" />
        </linearGradient>
        <filter id={shadowId} x="-15%" y="-15%" width="130%" height="130%">
          <feDropShadow dx="0" dy="2.5" stdDeviation="2" floodOpacity="0.25" floodColor="#8B2500" />
        </filter>
      </defs>

      {/* Bright, Playful Warm Squircle */}
      <rect x="2" y="2" width="60" height="60" rx="16" fill={`url(#${bgGradId})`} />

      {/* Pure White Pin Courier */}
      <g filter={`url(#${shadowId})`}>
        {/* Campus Pin Silhouette in Crisp Pure White */}
        <path
          d="M32 12C23.16 12 16 19.16 16 28C16 38.5 29.5 50.2 30.6 51.1C31.4 51.8 32.6 51.8 33.4 51.1C34.5 50.2 48 38.5 48 28C48 19.16 40.84 12 32 12Z"
          fill="#FFFFFF"
        />

        {/* Inner Face in Warm Sunlight */}
        <circle cx="32" cy="27" r="9.5" fill="#FFF7ED" />

        {/* Cute Smiling Eyes: ^ _ ^ in Friendly Slate */}
        <path
          d="M26.8 26C27.6 24.2 29.4 24.2 30.2 26"
          stroke="#1E293B"
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M33.8 26C34.6 24.2 36.4 24.2 37.2 26"
          stroke="#1E293B"
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
        />

        {/* Rosy Cheek Dots */}
        <circle cx="25.5" cy="28.5" r="1.5" fill="#FF8A65" opacity="0.9" />
        <circle cx="38.5" cy="28.5" r="1.5" fill="#FF8A65" opacity="0.9" />

        {/* Big Happy Smile */}
        <path
          d="M29 29.5C30.2 31.8 33.8 31.8 35 29.5"
          stroke="#1E293B"
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
        />

        {/* Small Coral Delivery Cap / Accent */}
        <path d="M32 17L34 20H30L32 17Z" fill="#FF5E3A" />
      </g>

      {/* Speed Motion Trails */}
      <path
        d="M9 25H13M7 31H12M10 37H14"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.9"
      />
      {/* Delivery Sparkle Star */}
      <circle cx="53" cy="14" r="2.2" fill="#FFFFFF" />
    </svg>
  );
}
