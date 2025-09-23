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

const LandingPageHeader: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isSignupOpen, setIsSignupOpen] = useState(false);

  const handleSignIn = () => {
    console.log('🔍 DEBUG: Sign In button clicked - Opening modal');
    setIsLoginOpen(true);
  };

  const handleSignUp = () => {
    console.log('🔍 DEBUG: Sign Up button clicked - Opening modal');
    setIsSignupOpen(true);
  };

  const handleAuthSuccess = () => {
    console.log('🔍 DEBUG: Auth success - Closing modals and navigating');
    setIsLoginOpen(false);
    setIsSignupOpen(false);
    navigate('/dashboard');
  };

  const handleSwitchToSignup = () => {
    console.log('🔍 DEBUG: Switching from login to signup');
    setIsLoginOpen(false);
    setIsSignupOpen(true);
  };

  const handleSwitchToLogin = () => {
    console.log('🔍 DEBUG: Switching from signup to login');
    setIsSignupOpen(false);
    setIsLoginOpen(true);
  };

  const handleDashboard = () => {
    console.log('🔍 DEBUG: Dashboard button clicked - Navigating to dashboard');
    navigate('/dashboard');
  };

  const handleLogout = async () => {
    console.log('🔍 DEBUG: Logout button clicked');
    try {
      await logout();
      console.log('✅ DEBUG: Logout successful');
    } catch (error) {
      console.error('❌ DEBUG: Logout failed:', error);
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
      <Dialog open={isLoginOpen} onOpenChange={setIsLoginOpen}>
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
      <Dialog open={isSignupOpen} onOpenChange={setIsSignupOpen}>
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