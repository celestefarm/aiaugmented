import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import LoginForm from './auth/LoginForm';
import SignupForm from './auth/SignupForm';

interface LandingPageHeaderProps {
  isLoginOpen?: boolean;
  isSignupOpen?: boolean;
  onLoginOpen?: () => void;
  onSignupOpen?: () => void;
  onLoginClose?: () => void;
  onSignupClose?: () => void;
}

const LandingPageHeader: React.FC<LandingPageHeaderProps> = ({
  isLoginOpen: externalIsLoginOpen,
  isSignupOpen: externalIsSignupOpen,
  onLoginOpen,
  onSignupOpen,
  onLoginClose,
  onSignupClose
}) => {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const [internalIsLoginOpen, setInternalIsLoginOpen] = useState(false);
  const [internalIsSignupOpen, setInternalIsSignupOpen] = useState(false);

  // Use external state if provided, otherwise use internal state
  const isLoginOpen = externalIsLoginOpen !== undefined ? externalIsLoginOpen : internalIsLoginOpen;
  const isSignupOpen = externalIsSignupOpen !== undefined ? externalIsSignupOpen : internalIsSignupOpen;

  const handleSignIn = () => {
    if (onLoginOpen) {
      onLoginOpen();
    } else {
      setInternalIsLoginOpen(true);
    }
  };

  const handleSignUp = () => {
    if (onSignupOpen) {
      onSignupOpen();
    } else {
      setInternalIsSignupOpen(true);
    }
  };

  const handleAuthSuccess = () => {
    if (onLoginClose && onSignupClose) {
      onLoginClose();
      onSignupClose();
    } else {
      setInternalIsLoginOpen(false);
      setInternalIsSignupOpen(false);
    }
    navigate('/dashboard');
  };

  const handleSwitchToSignup = () => {
    if (onLoginClose && onSignupOpen) {
      onLoginClose();
      onSignupOpen();
    } else {
      setInternalIsLoginOpen(false);
      setInternalIsSignupOpen(true);
    }
  };

  const handleSwitchToLogin = () => {
    if (onSignupClose && onLoginOpen) {
      onSignupClose();
      onLoginOpen();
    } else {
      setInternalIsSignupOpen(false);
      setInternalIsLoginOpen(true);
    }
  };

  const handleLoginClose = () => {
    if (onLoginClose) {
      onLoginClose();
    } else {
      setInternalIsLoginOpen(false);
    }
  };

  const handleSignupClose = () => {
    if (onSignupClose) {
      onSignupClose();
    } else {
      setInternalIsSignupOpen(false);
    }
  };

  const handleDashboard = () => {
    navigate('/dashboard');
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/5 backdrop-blur-md border-b border-white/10 shadow-lg">
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
            <button
              onClick={() => navigate('/')}
              className="text-xl font-bold text-white hover:text-gray-300 transition-colors duration-200 cursor-pointer"
            >
              AI-Augmented
            </button>
          </div>

          {/* Right Section - Navigation Links and Authentication Buttons */}
          <div className="flex items-center space-x-6">
            {/* Navigation Links */}
            <nav className="hidden md:flex items-center space-x-6">
              <button
                onClick={() => navigate('/about')}
                className="text-white hover:text-gray-300 transition-colors duration-200 font-medium"
              >
                About
              </button>
              <button
                onClick={() => navigate('/ai-agent')}
                className="text-white hover:text-gray-300 transition-colors duration-200 font-medium"
              >
                AI Agent
              </button>
            </nav>
            
            {/* Authentication/User Section */}
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                // Authenticated user content
                <>
                  <div className="hidden sm:flex items-center space-x-3">
                    <div className="text-white text-sm">
                      Welcome, <span className="font-medium">{user?.name}</span>
                    </div>
                  </div>
                  <button
                    onClick={handleDashboard}
                    className="bg-[#6B6B3A] hover:bg-[#6B6B3A]/80 text-black font-medium px-6 py-2 rounded-lg transition-all duration-200"
                  >
                    Dashboard
                  </button>
                  <button
                    onClick={handleLogout}
                    className="text-white hover:text-gray-300 transition-colors duration-200 font-medium px-4 py-2"
                  >
                    Logout
                  </button>
                </>
              ) : (
                // Unauthenticated user content
                <>
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
                </>
              )}
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

      {/* Login Modal */}
      <Dialog open={isLoginOpen} onOpenChange={handleLoginClose}>
        <DialogContent className="sm:max-w-md bg-[#1A1A1A] border-[#333333]">
          <DialogHeader>
            <DialogTitle className="text-[#E5E7EB]">Welcome Back</DialogTitle>
          </DialogHeader>
          <LoginForm
            onSwitchToSignup={handleSwitchToSignup}
            onSuccess={handleAuthSuccess}
          />
        </DialogContent>
      </Dialog>

      {/* Signup Modal */}
      <Dialog open={isSignupOpen} onOpenChange={handleSignupClose}>
        <DialogContent className="sm:max-w-md bg-[#1A1A1A] border-[#333333]">
          <DialogHeader>
            <DialogTitle className="text-[#E5E7EB]">Create Account</DialogTitle>
          </DialogHeader>
          <SignupForm
            onSwitchToLogin={handleSwitchToLogin}
            onSuccess={handleAuthSuccess}
          />
        </DialogContent>
      </Dialog>
    </header>
  );
};

export default LandingPageHeader;