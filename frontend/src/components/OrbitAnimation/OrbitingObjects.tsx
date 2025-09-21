import React from 'react';
import { ObjectType } from './FloatingObject';

const OrbitingObjects: React.FC = () => {
  // Generate objects positioned along radial lines at various distances
  const radialObjects = Array.from({ length: 45 }, (_, index) => {
    // Use specific angles that align with some of the radial lines
    const angleStep = 8; // Every 8 degrees to create a nice distribution
    const angle = index * angleStep;
    
    // Vary the distance from center (150px to 500px) - increased minimum to avoid center
    const minDistance = 150;
    const maxDistance = 500;
    const distanceRange = maxDistance - minDistance;
    
    // Use mathematical functions to create natural distance variation
    const distanceVariation = Math.sin(index * 0.4) * 0.3 + Math.cos(index * 0.7) * 0.4 + Math.sin(index * 1.2) * 0.3;
    const normalizedVariation = (distanceVariation + 1) / 2; // Normalize to 0-1
    const distance = minDistance + (distanceRange * normalizedVariation);
    
    // Calculate position
    const x = Math.cos((angle * Math.PI) / 180) * distance;
    const y = Math.sin((angle * Math.PI) / 180) * distance;
    
    // Vary object types based on distance and index
    let objectType: ObjectType;
    if (distance < 200) {
      objectType = index % 3 === 0 ? 'dot' : 'small-square';
    } else if (distance < 350) {
      objectType = index % 4 === 0 ? 'rectangle' : (index % 3 === 0 ? 'large-square' : 'small-square');
    } else {
      objectType = index % 5 === 0 ? 'rectangle' : (index % 3 === 0 ? 'large-square' : 'dot');
    }
    
    return {
      id: index,
      type: objectType,
      x,
      y,
      distance,
      angle,
      animationDelay: index * 0.1,
      twinkleDelay: (index * 0.15) % 4,
    };
  });

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      {radialObjects.map((obj) => (
        <div
          key={obj.id}
          className={`floating-object ${obj.type} speed-medium`}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: `translate(${obj.x}px, ${obj.y}px) translate(-50%, -50%)`,
            animationDelay: `${obj.animationDelay}s, ${obj.twinkleDelay}s`,
            zIndex: Math.floor((obj.distance / 50) + 1),
          }}
        />
      ))}
    </div>
  );
};

export default OrbitingObjects;