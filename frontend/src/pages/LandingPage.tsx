import React from 'react';
import '../styles/landing.css';
import '../styles/orbit-animation.css';
import LandingPageHeader from '../components/LandingPageHeader';
import ThreeJsOrbitAnimation from '../components/ThreeJsOrbitAnimation';

const LandingPage: React.FC = () => {
  return (
    <>
      <LandingPageHeader />
      <div className="landing-container relative min-h-screen">
        {/* Three.js Orbit Animation Background */}
        <ThreeJsOrbitAnimation className="threejs-canvas" />
        
        {/* Text overlay on top of the 3D animation */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="text-overlay-container">
            {/* "HUMAN / COMPETENCE" text positioned on the left */}
            <div className="text-3d understand-text">
              <span className="text-word">Human</span>
              <span className="text-word">Competence</span>
            </div>
            
            {/* "AI CORE / INTELLIGENCE" text positioned on the right */}
            <div className="text-3d universe-text">
              <span className="text-word">AI Core</span>
              <span className="text-word">Intelligence</span>
            </div>
          </div>
        </div>
        
        <div className="landing-content relative z-20 flex flex-col items-center justify-center min-h-screen">
          {/* Additional content can be added here */}
        </div>
      </div>
    </>
  );
};

export default LandingPage;