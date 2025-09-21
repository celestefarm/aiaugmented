import React from 'react';

const RadialBurst: React.FC = () => {
  // Generate 80 radial lines at different angles with varied lengths
  const lines = Array.from({ length: 80 }, (_, index) => {
    const angle = (index * 4.5); // 360 / 80 = 4.5 degrees apart
    
    // Create varied line lengths from 250px to 800px using mathematical distribution
    // Start further from center to avoid central glow
    const baseLength = 250;
    const maxLength = 800;
    const lengthRange = maxLength - baseLength;
    
    // Use a combination of sine and cosine for natural variation
    const variation1 = Math.sin(index * 0.3) * 0.4;
    const variation2 = Math.cos(index * 0.7) * 0.3;
    const variation3 = Math.sin(index * 1.1) * 0.3;
    const combinedVariation = (variation1 + variation2 + variation3) / 3;
    
    // Normalize to 0-1 range and apply to length
    const normalizedVariation = (combinedVariation + 1) / 2;
    const actualLength = baseLength + (lengthRange * normalizedVariation);
    
    return {
      id: index,
      angle,
      length: actualLength,
      // Add slight randomness for more natural distribution
      opacity: 0.3 + (Math.sin(index * 0.5) * 0.2),
    };
  });

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      {lines.map((line) => (
        <div
          key={line.id}
          className="radial-line"
          style={{
            height: `${line.length}px`,
            transform: `rotate(${line.angle}deg)`,
            left: '50%',
            top: '50%',
            transformOrigin: 'bottom center',
            marginLeft: '-0.25px', // Center the 0.5px wide line
            marginTop: `-${line.length - 50}px`, // Start 50px away from center to avoid central glow
            opacity: line.opacity,
            animationDelay: `${(line.id * 0.05)}s`, // Staggered animation
          }}
        />
      ))}
    </div>
  );
};

export default RadialBurst;