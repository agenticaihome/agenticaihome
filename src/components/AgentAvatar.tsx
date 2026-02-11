import React from 'react';

interface AgentAvatarProps {
  address: string;
  size?: number;
}

const AgentAvatar: React.FC<AgentAvatarProps> = ({ address: rawAddress, size = 80 }) => {
  const address = rawAddress || 'unknown';
  // Deterministic hash function
  const hashString = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  };

  // Generate multiple hash values for different aspects
  const primaryHash = hashString(address);
  const secondaryHash = hashString(address + 'variant');
  const tertiaryHash = hashString(address + 'pattern');
  const quaternaryHash = hashString(address + 'shape');

  // Generate color scheme based on hash
  const colorSchemes = [
    ['#06b6d4', '#8b5cf6'], // cyan-purple
    ['#10b981', '#06b6d4'], // emerald-cyan
    ['#8b5cf6', '#ec4899'], // purple-pink
    ['#06b6d4', '#10b981'], // cyan-emerald
    ['#f59e0b', '#8b5cf6'], // amber-purple
    ['#ef4444', '#06b6d4'], // red-cyan
  ];

  const schemeIndex = primaryHash % colorSchemes.length;
  const [color1, color2] = colorSchemes[schemeIndex];

  // Generate background pattern
  const patternType = secondaryHash % 4;
  const patternDensity = 3 + (tertiaryHash % 5); // 3-7 elements

  // Generate central shape
  const shapeType = quaternaryHash % 5;
  const shapeSize = size * 0.4;
  const centerX = size / 2;
  const centerY = size / 2;

  // Generate circuit-like lines
  const generateCircuitLines = () => {
    const lines = [];
    const numLines = 4 + (primaryHash % 4);
    
    for (let i = 0; i < numLines; i++) {
      const lineHash = hashString(address + i);
      const x1 = (lineHash % size) * 0.8 + size * 0.1;
      const y1 = ((lineHash >> 8) % size) * 0.8 + size * 0.1;
      const x2 = ((lineHash >> 16) % size) * 0.8 + size * 0.1;
      const y2 = ((lineHash >> 24) % size) * 0.8 + size * 0.1;
      
      lines.push(
        <line
          key={`circuit-${i}`}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={color1}
          strokeWidth="1"
          opacity="0.3"
        />
      );
      
      // Add connection dots
      lines.push(
        <circle
          key={`dot-${i}`}
          cx={x1}
          cy={y1}
          r="1.5"
          fill={color2}
          opacity="0.6"
        />
      );
    }
    
    return lines;
  };

  // Generate geometric background pattern
  const generateBackgroundPattern = () => {
    const elements = [];
    
    for (let i = 0; i < patternDensity; i++) {
      const elemHash = hashString(address + 'bg' + i);
      const x = (elemHash % size) * 0.9 + size * 0.05;
      const y = ((elemHash >> 8) % size) * 0.9 + size * 0.05;
      const elemSize = 8 + (elemHash % 12);
      
      if (patternType === 0) {
        // Hexagons
        const points = [];
        for (let j = 0; j < 6; j++) {
          const angle = (j * Math.PI) / 3;
          const px = x + Math.cos(angle) * elemSize * 0.5;
          const py = y + Math.sin(angle) * elemSize * 0.5;
          points.push(`${px},${py}`);
        }
        elements.push(
          <polygon
            key={`hex-${i}`}
            points={points.join(' ')}
            fill="none"
            stroke={color1}
            strokeWidth="0.8"
            opacity="0.2"
          />
        );
      } else if (patternType === 1) {
        // Triangles
        const h = elemSize * 0.866;
        elements.push(
          <polygon
            key={`tri-${i}`}
            points={`${x},${y-h/2} ${x-elemSize/2},${y+h/2} ${x+elemSize/2},${y+h/2}`}
            fill="none"
            stroke={color2}
            strokeWidth="0.8"
            opacity="0.15"
          />
        );
      } else if (patternType === 2) {
        // Diamonds
        elements.push(
          <polygon
            key={`diamond-${i}`}
            points={`${x},${y-elemSize/2} ${x+elemSize/2},${y} ${x},${y+elemSize/2} ${x-elemSize/2},${y}`}
            fill={color1}
            opacity="0.08"
          />
        );
      } else {
        // Circles
        elements.push(
          <circle
            key={`circle-${i}`}
            cx={x}
            cy={y}
            r={elemSize * 0.3}
            fill="none"
            stroke={color2}
            strokeWidth="0.6"
            opacity="0.2"
          />
        );
      }
    }
    
    return elements;
  };

  // Generate central shape/icon
  const generateCentralShape = () => {
    switch (shapeType) {
      case 0:
        // Crystalline diamond
        return (
          <g>
            <polygon
              points={`${centerX},${centerY-shapeSize/2} ${centerX+shapeSize/3},${centerY-shapeSize/6} ${centerX+shapeSize/2},${centerY+shapeSize/6} ${centerX},${centerY+shapeSize/2} ${centerX-shapeSize/2},${centerY+shapeSize/6} ${centerX-shapeSize/3},${centerY-shapeSize/6}`}
              fill={`url(#gradient-${address.slice(-6)})`}
              stroke={color1}
              strokeWidth="2"
              opacity="0.9"
            />
            <line
              x1={centerX}
              y1={centerY - shapeSize/2}
              x2={centerX}
              y2={centerY + shapeSize/2}
              stroke={color2}
              strokeWidth="1"
              opacity="0.7"
            />
          </g>
        );
      case 1:
        // Tech hexagon
        const hexPoints = [];
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3;
          const px = centerX + Math.cos(angle) * shapeSize * 0.5;
          const py = centerY + Math.sin(angle) * shapeSize * 0.5;
          hexPoints.push(`${px},${py}`);
        }
        return (
          <g>
            <polygon
              points={hexPoints.join(' ')}
              fill={`url(#gradient-${address.slice(-6)})`}
              stroke={color1}
              strokeWidth="2"
              opacity="0.8"
            />
            <circle
              cx={centerX}
              cy={centerY}
              r={shapeSize * 0.2}
              fill={color2}
              opacity="0.9"
            />
          </g>
        );
      case 2:
        // Circuit board style
        return (
          <g>
            <rect
              x={centerX - shapeSize/2}
              y={centerY - shapeSize/2}
              width={shapeSize}
              height={shapeSize}
              fill={`url(#gradient-${address.slice(-6)})`}
              rx="8"
              opacity="0.8"
            />
            <line
              x1={centerX - shapeSize/3}
              y1={centerY}
              x2={centerX + shapeSize/3}
              y2={centerY}
              stroke={color1}
              strokeWidth="2"
            />
            <line
              x1={centerX}
              y1={centerY - shapeSize/3}
              x2={centerX}
              y2={centerY + shapeSize/3}
              stroke={color1}
              strokeWidth="2"
            />
            <circle cx={centerX - shapeSize/4} cy={centerY - shapeSize/4} r="3" fill={color2} />
            <circle cx={centerX + shapeSize/4} cy={centerY + shapeSize/4} r="3" fill={color2} />
          </g>
        );
      case 3:
        // Neural network node
        return (
          <g>
            <circle
              cx={centerX}
              cy={centerY}
              r={shapeSize/2}
              fill={`url(#gradient-${address.slice(-6)})`}
              stroke={color1}
              strokeWidth="2"
              opacity="0.8"
            />
            {[0, 1, 2, 3].map(i => {
              const angle = (i * Math.PI) / 2;
              const x = centerX + Math.cos(angle) * shapeSize * 0.7;
              const y = centerY + Math.sin(angle) * shapeSize * 0.7;
              return (
                <g key={i}>
                  <line
                    x1={centerX}
                    y1={centerY}
                    x2={x}
                    y2={y}
                    stroke={color2}
                    strokeWidth="1.5"
                    opacity="0.6"
                  />
                  <circle cx={x} cy={y} r="2" fill={color1} />
                </g>
              );
            })}
          </g>
        );
      default:
        // Digital fractal
        return (
          <g>
            <polygon
              points={`${centerX},${centerY-shapeSize/2} ${centerX+shapeSize/4},${centerY-shapeSize/4} ${centerX+shapeSize/2},${centerY} ${centerX+shapeSize/4},${centerY+shapeSize/4} ${centerX},${centerY+shapeSize/2} ${centerX-shapeSize/4},${centerY+shapeSize/4} ${centerX-shapeSize/2},${centerY} ${centerX-shapeSize/4},${centerY-shapeSize/4}`}
              fill={`url(#gradient-${address.slice(-6)})`}
              stroke={color1}
              strokeWidth="1.5"
              opacity="0.9"
            />
            <circle cx={centerX} cy={centerY} r={shapeSize * 0.15} fill={color2} opacity="0.8" />
          </g>
        );
    }
  };

  const gradientId = `gradient-${address.slice(-6)}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="rounded-lg"
      style={{ background: 'transparent' }}
    >
      <defs>
        <radialGradient id={gradientId} cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor={color2} stopOpacity="0.8" />
          <stop offset="100%" stopColor={color1} stopOpacity="0.4" />
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge> 
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {/* Dark background */}
      <rect 
        width={size} 
        height={size} 
        fill="#0f172a" 
        rx="8"
      />

      {/* Background pattern */}
      {generateBackgroundPattern()}

      {/* Circuit lines */}
      {generateCircuitLines()}

      {/* Central shape */}
      <g filter="url(#glow)">
        {generateCentralShape()}
      </g>

      {/* Overlay grid for tech aesthetic */}
      <defs>
        <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M 10 0 L 0 0 0 10" fill="none" stroke={color1} strokeWidth="0.3" opacity="0.1"/>
        </pattern>
      </defs>
      <rect width={size} height={size} fill="url(#grid)" />
    </svg>
  );
};

export default AgentAvatar;