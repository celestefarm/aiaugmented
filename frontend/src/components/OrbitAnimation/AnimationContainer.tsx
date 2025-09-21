import React from 'react';

interface AnimationContainerProps {
  children: React.ReactNode;
}

const AnimationContainer: React.FC<AnimationContainerProps> = ({ children }) => {
  return (
    <div className="orbit-animation-container absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
      <div className="orbit-3d-container relative w-full h-full flex items-center justify-center">
        {children}
      </div>
    </div>
  );
};

export default AnimationContainer;