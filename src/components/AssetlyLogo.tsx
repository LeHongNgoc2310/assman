import React from 'react';

interface AssetlyLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

export default function AssetlyLogo({ className = '', size = 'md', showText = false }: AssetlyLogoProps) {
  // Define dimensions based on size
  let dims = { width: 44, height: 44 };
  if (size === 'sm') dims = { width: 28, height: 28 };
  else if (size === 'lg') dims = { width: 72, height: 72 };
  else if (size === 'xl') dims = { width: 140, height: 140 };

  return (
    <div className={`flex flex-col items-center justify-center select-none ${className}`}>
      <svg
        width={dims.width}
        height={dims.height}
        viewBox="0 0 240 240"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        <defs>
          {/* Exact premium gradients representing the high-res logo */}
          <linearGradient id="left-pillar-grad" x1="40" y1="180" x2="130" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#10b981" /> {/* Emerald-550 */}
            <stop offset="50%" stopColor="#14b8a6" /> {/* Teal-500 */}
            <stop offset="100%" stopColor="#0d9488" /> {/* Teal-600 */}
          </linearGradient>

          <linearGradient id="right-pillar-grad" x1="185" y1="180" x2="135" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1d4ed8" /> {/* Blue-700 */}
            <stop offset="60%" stopColor="#2563eb" /> {/* Blue-600 */}
            <stop offset="100%" stopColor="#0ea5e9" /> {/* Sky-500 */}
          </linearGradient>

          <linearGradient id="trend-arrow-grad" x1="90" y1="170" x2="170" y2="80" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#0ea5e9" />
          </linearGradient>

          <linearGradient id="coin-ring-grad" x1="150" y1="40" x2="200" y2="90" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#93c5fd" />
            <stop offset="100%" stopColor="#1e40af" />
          </linearGradient>

          <filter id="premium-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#000" floodOpacity="0.45" />
          </filter>
        </defs>

        {/* --- Left Curve Pillar of 'A' (Teal/Emerald Gradient) --- */}
        <path
          d="M 120 42
             C 120 42, 105 82, 85 130
             C 74 152, 60 172, 45 185
             H 90
             C 102 168, 112 150, 120 130
             C 130 102, 137 72, 138 42
             Z"
          fill="url(#left-pillar-grad)"
          filter="url(#premium-shadow)"
        />

        {/* --- Connecting Swooshing Crescent at bottom --- */}
        <path
          d="M 45 185
             C 70 185, 115 174, 145 145
             C 155 135, 164 120, 168 102
             L 150 102
             C 145 116, 136 130, 124 140
             C 102 158, 70 166, 45 166
             Z"
          fill="url(#left-pillar-grad)"
          filter="url(#premium-shadow)"
        />

        {/* --- Right Pillar of 'A' (Blue Gradient) --- */}
        <path
          d="M 142 42
             C 142 42, 148 70, 156 95
             C 164 120, 178 152, 195 185
             H 158
             L 144 140
             C 138 115, 136 85, 134 42
             Z"
          fill="url(#right-pillar-grad)"
          filter="url(#premium-shadow)"
        />

        {/* --- 5 Financial Candlesticks in Ascending Pattern --- */}
        {/* Candle 1 (Green) */}
        <line x1="90" y1="150" x2="90" y2="182" stroke="#10b981" strokeWidth="2.2" strokeLinecap="round" />
        <rect x="86" y="158" width="8" height="16" rx="2" fill="#10b981" />

        {/* Candle 2 (Red) */}
        <line x1="106" y1="138" x2="106" y2="172" stroke="#f43f5e" strokeWidth="2.2" strokeLinecap="round" />
        <rect x="102" y="145" width="8" height="18" rx="2" fill="#f43f5e" />

        {/* Candle 3 (Green) */}
        <line x1="122" y1="118" x2="122" y2="162" stroke="#10b981" strokeWidth="2.2" strokeLinecap="round" />
        <rect x="118" y="125" width="8" height="26" rx="2" fill="#10b981" />

        {/* Candle 4 (Red) */}
        <line x1="138" y1="108" x2="138" y2="148" stroke="#f43f5e" strokeWidth="2.2" strokeLinecap="round" />
        <rect x="134" y="114" width="8" height="23" rx="2" fill="#f43f5e" />

        {/* Candle 5 (Green) */}
        <line x1="154" y1="88" x2="154" y2="138" stroke="#10b981" strokeWidth="2.2" strokeLinecap="round" />
        <rect x="150" y="96" width="8" height="30" rx="2" fill="#10b981" />

        {/* --- Sweeping Upward Trend Trendline Arrow --- */}
        <path
          d="M 94 172 Q 134 154, 172 100"
          stroke="url(#trend-arrow-grad)"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
        />
        {/* Arrowhead */}
        <path
          d="M 156 104 L 174 98 L 168 118"
          stroke="url(#trend-arrow-grad)"
          strokeWidth="5.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* --- Metallic Dollar Coin Badge --- */}
        <g transform="translate(178, 54)" filter="url(#premium-shadow)">
          <circle cx="14" cy="14" r="21" fill="url(#coin-ring-grad)" stroke="#60a5fa" strokeWidth="3" />
          <circle cx="14" cy="14" r="16" fill="#1e3a8a" />
          <text
            x="14"
            y="22"
            fill="#67e8f9"
            fontSize="21"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontWeight="bold"
            textAnchor="middle"
          >
            $
          </text>
        </g>
      </svg>
      {showText && (
        <AssetlyText className="text-xl uppercase mt-2" />
      )}
    </div>
  );
}

export function AssetlyText({ className = "" }: { className?: string }) {
  return (
    <span className={`font-sans font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-400 to-blue-500 ${className}`}>
      Assetly
    </span>
  );
}

