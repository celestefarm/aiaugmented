import React from 'react';
import { useNavigate } from 'react-router-dom';

const LandingPageHeader: React.FC = () => {
  const navigate = useNavigate();

  const handleSignIn = () => {
    navigate('/auth');
  };

  const handleSignUp = () => {
    navigate('/auth');
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-transparent">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left Section - Company Name and Logo Placeholder */}
          <div className="flex items-center space-x-3">
            {/* Logo Placeholder */}
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" className="text-white">
                <path
                  d="M12 2 L20 12 L12 22 L4 12 Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  opacity="0.8"
                />
                <path
                  d="M12 5 L17 12 L12 19 L7 12 Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
            </div>
            
            {/* Company Name */}
            <h1 className="text-xl font-bold text-white">
              AI-Augmented
            </h1>
          </div>

          {/* Right Section - Navigation Links and Authentication Buttons */}
          <div className="flex items-center space-x-6">
            {/* Navigation Links */}
            <nav className="hidden md:flex items-center space-x-6">
              <a
                href="#about"
                className="text-white hover:text-gray-300 transition-colors duration-200 font-medium"
              >
                About
              </a>
              <a
                href="#ai-agent"
                className="text-white hover:text-gray-300 transition-colors duration-200 font-medium"
              >
                AI Agent
              </a>
            </nav>
            
            {/* Authentication Buttons */}
            <div className="flex items-center space-x-4">
              <button
                onClick={handleSignIn}
                className="text-white hover:text-gray-300 transition-colors duration-200 font-medium px-4 py-2"
              >
                Sign In
              </button>
              <button
                onClick={handleSignUp}
                className="bg-white/10 hover:bg-white/20 text-white font-medium px-6 py-2 rounded-lg border border-white/20 hover:border-white/30 transition-all duration-200 backdrop-blur-sm"
              >
                Sign Up
              </button>
            </div>
          </div>

          {/* Mobile Menu Button (for future mobile implementation) */}
          <div className="md:hidden">
            <button className="text-white hover:text-gray-300 transition-colors duration-200">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default LandingPageHeader;