import React from 'react';
import FloatingObject, { ObjectType, SpeedLayer } from './FloatingObject';

export type OrbitSpeed = 'slow' | 'medium' | 'fast';
export type RingSize = 'ring-1' | 'ring-2' | 'ring-3';

interface OrbitPathProps {
  ringSize: RingSize;
  speed: OrbitSpeed;
  objects: Array<{
    type: ObjectType;
    angle: number;
    animationDelay?: number;
    speedLayer?: SpeedLayer;
    twinkleDelay?: number;
  }>;
  radius: number;
}

const OrbitPath: React.FC<OrbitPathProps> = ({
  ringSize,
  speed,
  objects,
  radius
}) => {
  const speedClass = `orbit-ring-${speed}`;

  return (
    <div className={`orbit-path ${ringSize} ${speedClass} absolute left-1/2 top-1/2`}>
      <div className="orbit-object-container">
        {objects.map((obj, index) => (
          <FloatingObject
            key={index}
            type={obj.type}
            angle={obj.angle}
            radius={radius}
            animationDelay={obj.animationDelay}
            speedLayer={obj.speedLayer}
            twinkleDelay={obj.twinkleDelay}
          />
        ))}
      </div>
    </div>
  );
};

export default OrbitPath;