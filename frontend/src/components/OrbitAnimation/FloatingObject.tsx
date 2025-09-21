import React from 'react';

export type ObjectType = 'small-square' | 'large-square' | 'rectangle' | 'dot';
export type SpeedLayer = 'slow' | 'medium' | 'fast';

interface FloatingObjectProps {
  type: ObjectType;
  angle: number;
  radius: number;
  animationDelay?: number;
  speedLayer?: SpeedLayer;
  twinkleDelay?: number;
}

const FloatingObject: React.FC<FloatingObjectProps> = ({
  type,
  angle,
  radius,
  animationDelay = 0,
  speedLayer = 'medium',
  twinkleDelay = 0
}) => {
  // Calculate position based on angle and radius
  const x = Math.cos((angle * Math.PI) / 180) * radius;
  const y = Math.sin((angle * Math.PI) / 180) * radius;

  // Generate random scale variation for depth layering
  const scaleVariation = 0.8 + (Math.random() * 0.7); // 0.8 to 1.5 scale range

  return (
    <div
      className={`floating-object ${type} speed-${speedLayer}`}
      style={{
        left: '50%',
        top: '50%',
        transform: `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${scaleVariation})`,
        animationDelay: `${animationDelay}s, ${twinkleDelay}s`,
        zIndex: Math.floor(scaleVariation * 10), // Depth layering based on scale
      }}
    />
  );
};

export default FloatingObject;