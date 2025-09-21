import React from 'react';
import AnimationContainer from './OrbitAnimation/AnimationContainer';
import RadialBurst from './OrbitAnimation/RadialBurst';
import OrbitingObjects from './OrbitAnimation/OrbitingObjects';
import TextOverlay from './OrbitAnimation/TextOverlay';
import '../styles/orbit-animation.css';

const OrbitAnimation: React.FC = () => {
  return (
    <AnimationContainer>
      {/* Radial burst lines from center */}
      <RadialBurst />
      
      {/* Orbiting geometric objects */}
      <OrbitingObjects />
      
      {/* 3D Text overlay */}
      <TextOverlay />
    </AnimationContainer>
  );
};

export default OrbitAnimation;