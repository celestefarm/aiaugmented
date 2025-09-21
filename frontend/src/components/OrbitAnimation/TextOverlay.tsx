import React from 'react';

const TextOverlay: React.FC = () => {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="text-overlay-container">
        {/* "HUMAN / COMPETENCE" text positioned on the left - 2 lines */}
        <div className="text-3d understand-text">
          <span className="text-word">Human</span>
          <span className="text-word">Competence</span>
        </div>
        
        {/* "AI CORE / INTELLIGENCE" text positioned on the right - 2 lines */}
        <div className="text-3d universe-text">
          <span className="text-word">AI Core</span>
          <span className="text-word">Intelligence</span>
        </div>
      </div>
    </div>
  );
};

export default TextOverlay;