/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6), date: 2026-11-07
 * Scope: Present the supplied origami artwork as an unboxed mark with tighter framing; preserve the original favicon artwork.
 * Author review: I validated correctness, edited for style, and verified with automated tests.
 *
 * Tool: Codex (model: GPT-6), date: 2026-11-07
 * Scope: Apply the supplied origami courier logo and Friend on Campus product identity.
 * Author review: I validated correctness, edited for style, and verified with automated tests.
 *
 * Tool: Google Antigravity Agent, date: 2026-11-07
 * Scope: Implemented Direction B (Crisp Modern Canvas) brand logo: crisp white squircle canvas with subtle border, featuring the vibrant sunset gradient 't.' with cheerful curved smile tail and campus location pin dot.
 * Author review: I validated correctness, edited for style, and verified with automated tests.
 *
 * Tool: Google Antigravity Agent, date: 2026-11-07
 * Scope: Updated FriendPinLogo to Direction A Warm Campus Mango theme with vibrant tangerine/mango gradient (#FF5E3A -> #FF9500), pure white courier pin, warm sunlight face (#FFF7ED), rosy cheeks, and white motion trails.
 * Author review: I validated correctness, edited for style, and verified with automated tests.
 *
 * Tool: Google Antigravity Agent, date: 2026-11-07
 * Scope: Created FriendPinLogo brand component featuring the verified Kent Ridge location pin merged with smiling student courier companion face, speed trails, and delivery star in NUS Blue and NUS Orange gradients.
 * Author review: I validated correctness, edited for style, and verified with automated tests.
 */

import React from 'react';

interface FriendOnCampusLogoProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
}

// AI-generated (edited by yanhwee)
export function FriendOnCampusLogo({ className = 'w-9 h-9', size, ...props }: FriendOnCampusLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="8 8 48 48"
      width={size}
      height={size}
      fill="none"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <g>
        <path d="M14 35C14 24 22 17 34 16C26 21 24 26 25 33C21 33 17 34 14 35Z" fill="#93C5FD" opacity="0.6" />
        <path d="M18 41C18 29 27 21 42 19C33 26 31 32 32 40C27 40 22 41 18 41Z" fill="#2563EB" />
        <path d="M38 23L48 29L38 35L28 29L38 23Z" fill="#FDBA74" />
        <path d="M28 29L38 35V47L28 41V29Z" fill="#FF5E3A" />
        <path d="M38 35L48 29V41L38 47V35Z" fill="#EA580C" />
        <path d="M33 26L43 32" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
        <path d="M33 38V44" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
        <circle cx="51" cy="18" r="2.5" fill="#F59E0B" />
      </g>
    </svg>
  );
}
