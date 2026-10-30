import React from 'react';

interface BrandShieldProps {
  className?: string;
  size?: number | string;
  opacity?: number;
  animated?: boolean;
}

export function BrandShield({ className = '', size = '100%', opacity = 1, animated = true }: BrandShieldProps) {
  return (
    <svg
      viewBox="0 0 400 450"
      width={size}
      height={size}
      style={{ opacity }}
      className={`select-none pointer-events-none drop-shadow-[0_10px_25px_rgba(0,0,0,0.5)] ${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Glowing Filters */}
        <filter id="neonGlowBlue" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="neonGlowGold" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Premium Gradients */}
        <linearGradient id="goldMetallic" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF1B0" />
          <stop offset="30%" stopColor="#D4AF37" />
          <stop offset="70%" stopColor="#AA7C11" />
          <stop offset="100%" stopColor="#FFF1B0" />
        </linearGradient>

        <linearGradient id="blueMetallic" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4A90E2" />
          <stop offset="50%" stopColor="#1B3B6F" />
          <stop offset="100%" stopColor="#0B1B3D" />
        </linearGradient>

        <linearGradient id="bordeauxGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#D22B43" />
          <stop offset="100%" stopColor="#7E1220" />
        </linearGradient>

        <linearGradient id="silverGlossy" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="50%" stopColor="#B3C5D7" />
          <stop offset="100%" stopColor="#7389A2" />
        </linearGradient>

        <linearGradient id="glowingLine" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3B82F6" stopOpacity="0" />
          <stop offset="50%" stopColor="#60A5FA" stopOpacity="1" />
          <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* AI NEURAL NETWORK BACKGROUND CONNECTIONS */}
      <g className={animated ? 'animate-pulse-blue' : ''}>
        {/* Lattice connection lines */}
        <line x1="200" y1="130" x2="140" y2="100" stroke="#3B82F6" strokeWidth="1" strokeOpacity="0.4" />
        <line x1="200" y1="130" x2="260" y2="100" stroke="#3B82F6" strokeWidth="1" strokeOpacity="0.4" />
        <line x1="200" y1="130" x2="120" y2="160" stroke="#3B82F6" strokeWidth="1" strokeOpacity="0.4" />
        <line x1="200" y1="130" x2="280" y2="160" stroke="#3B82F6" strokeWidth="1" strokeOpacity="0.4" />
        <line x1="200" y1="130" x2="150" y2="210" stroke="#3B82F6" strokeWidth="1" strokeOpacity="0.4" />
        <line x1="200" y1="130" x2="250" y2="210" stroke="#3B82F6" strokeWidth="1" strokeOpacity="0.4" />
        <line x1="200" y1="130" x2="200" y2="60" stroke="#3B82F6" strokeWidth="1.2" strokeOpacity="0.5" />

        <line x1="140" y1="100" x2="120" y2="160" stroke="#3B82F6" strokeWidth="1" strokeOpacity="0.4" />
        <line x1="260" y1="100" x2="280" y2="160" stroke="#3B82F6" strokeWidth="1" strokeOpacity="0.4" />
        <line x1="120" y1="160" x2="150" y2="210" stroke="#3B82F6" strokeWidth="1" strokeOpacity="0.4" />
        <line x1="280" y1="160" x2="250" y2="210" stroke="#3B82F6" strokeWidth="1" strokeOpacity="0.4" />
        <line x1="150" y1="210" x2="250" y2="210" stroke="#3B82F6" strokeWidth="1" strokeOpacity="0.3" />

        {/* Shimmering AI Nodes */}
        <circle cx="200" cy="60" r="5" fill="#60A5FA" filter="url(#neonGlowBlue)" className={animated ? 'animate-bounce' : ''} style={{ animationDuration: '3s' }} />
        <circle cx="140" cy="100" r="4.5" fill="#60A5FA" filter="url(#neonGlowBlue)" />
        <circle cx="260" cy="100" r="4.5" fill="#60A5FA" filter="url(#neonGlowBlue)" />
        <circle cx="120" cy="160" r="4.5" fill="#60A5FA" filter="url(#neonGlowBlue)" />
        <circle cx="280" cy="160" r="4.5" fill="#60A5FA" filter="url(#neonGlowBlue)" />
        <circle cx="150" cy="210" r="4.5" fill="#60A5FA" filter="url(#neonGlowBlue)" />
        <circle cx="250" cy="210" r="4.5" fill="#60A5FA" filter="url(#neonGlowBlue)" />
      </g>

      {/* OUTER NEON SHIELD CONTOUR (glowing blue border representing safety and confidence) */}
      <path
        d="M200,15 L350,70 L350,220 C350,330 250,390 200,420 C150,390 50,330 50,220 L50,70 Z"
        stroke="url(#blueMetallic)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#neonGlowBlue)"
        className={animated ? 'animate-pulse' : ''}
        style={{ animationDuration: '6s' }}
      />

      {/* METALLIC INNER SHIELD BEZEL (protection and security) */}
      <path
        d="M200,28 L334,78 L334,215 C334,313 245,368 200,395 C155,368 66,313 66,215 L66,78 Z"
        fill="url(#blueMetallic)"
        fillOpacity="0.85"
        stroke="url(#goldMetallic)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* SHIELD INNER FACETS FOR 3D EFFECT */}
      <path
        d="M200,28 L200,395 M200,28 L334,78 M200,28 L66,78 M200,395 L334,215 M200,395 L66,215"
        stroke="url(#goldMetallic)"
        strokeWidth="1"
        strokeOpacity="0.3"
      />

      {/* BOOK OF KNOWLEDGE (central symbol of education & pedagogy) */}
      <g transform="translate(0, 45)">
        {/* Book Outer Cover (Gold) */}
        <path
          d="M90,210 C140,210 180,230 200,240 C220,230 260,210 310,210 L310,135 C260,135 220,155 200,165 C180,155 140,135 90,135 Z"
          fill="url(#goldMetallic)"
          stroke="#4F3608"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* Book Pages (Silver/White Glossy) */}
        <path
          d="M95,203 C142,203 182,223 200,232 C218,223 258,203 305,203 L305,130 C258,130 218,150 200,159 C182,150 142,130 95,130 Z"
          fill="url(#silverGlossy)"
          stroke="#506275"
          strokeWidth="1"
          strokeLinejoin="round"
        />

        {/* Book Spine Centerline */}
        <path d="M200,159 L200,232" stroke="url(#goldMetallic)" strokeWidth="2.5" />

        {/* Left Page Writing Lines */}
        <path d="M110,148 C130,148 155,153 175,157" stroke="#4B5563" strokeWidth="1.5" strokeOpacity="0.75" />
        <path d="M110,160 C130,160 155,165 175,169" stroke="#4B5563" strokeWidth="1.5" strokeOpacity="0.75" />
        <path d="M110,172 C130,172 155,177 175,181" stroke="#4B5563" strokeWidth="1.5" strokeOpacity="0.75" />
        <path d="M110,184 C130,184 155,189 175,193" stroke="#4B5563" strokeWidth="1.5" strokeOpacity="0.75" />

        {/* Right Page Writing Lines */}
        <path d="M225,157 C245,153 270,148 290,148" stroke="#4B5563" strokeWidth="1.5" strokeOpacity="0.75" />
        <path d="M225,169 C245,165 270,160 290,160" stroke="#4B5563" strokeWidth="1.5" strokeOpacity="0.75" />
        <path d="M225,181 C245,177 270,172 290,172" stroke="#4B5563" strokeWidth="1.5" strokeOpacity="0.75" />
        <path d="M225,193 C245,189 270,184 290,184" stroke="#4B5563" strokeWidth="1.5" strokeOpacity="0.75" />
      </g>

      {/* CENTRAL BRAND INSIGNIA: "C" for Classium with Graduation Cap (Capelo) */}
      <g transform="translate(0, -10)">
        {/* "C" Insignia text/shapes centered */}
        <g transform="translate(170, 115)">
          {/* Elegant metallic gold letter "C" */}
          <path
            d="M 32,6 C 18,6 10,14 10,24 C 10,34 18,42 32,42 C 40,42 46,38 50,32 L 40,28 C 38,31 35,34 31,34 C 23,34 18,29 18,24 C 18,19 23,14 31,14 C 35,14 38,17 40,20 L 50,16 C 46,10 40,6 32,6 Z"
            fill="url(#goldMetallic)"
            stroke="#4F3608"
            strokeWidth="1"
            filter="url(#neonGlowGold)"
            className={animated ? 'animate-pulse-glow' : ''}
          />
        </g>

        {/* GRADUATION CAP (Capelo representing academic achievement) */}
        <g transform="translate(155, 62)">
          {/* Tassel (Pingente) */}
          <path
            d="M45,28 C45,36 50,42 55,44 C53,41 53,37 53,30 Z"
            fill="url(#goldMetallic)"
            stroke="#AA7C11"
            strokeWidth="0.5"
          />
          <line x1="45" y1="28" x2="45" y2="35" stroke="url(#goldMetallic)" strokeWidth="1.5" />

          {/* Under-cap Band/Cap Base (Bordeaux) */}
          <path
            d="M25,24 L25,32 C25,36 65,36 65,32 L65,24 Z"
            fill="url(#bordeauxGradient)"
            stroke="url(#goldMetallic)"
            strokeWidth="1"
          />

          {/* Diamond Top (Bandeja do Capelo - Bordeaux) */}
          <path
            d="M45,10 L85,22 L45,34 L5,22 Z"
            fill="url(#bordeauxGradient)"
            stroke="url(#goldMetallic)"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* Cap Button on center */}
          <ellipse cx="45" cy="22" rx="3.5" ry="2" fill="url(#goldMetallic)" />
        </g>
      </g>
    </svg>
  );
}
