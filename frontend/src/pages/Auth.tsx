import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import LoginForm from '../components/auth/LoginForm';
import SignupForm from '../components/auth/SignupForm';
import { useAuth } from '../contexts/AuthContext';

const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const { isAuthenticated, isLoading } = useAuth();

  // If user is already authenticated, redirect to main app
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-[#E5E7EB] text-lg">Loading...</div>
      </div>
    );
  }

  const handleAuthSuccess = () => {
    // Navigation will be handled by the Navigate component above
    // when isAuthenticated becomes true
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {isLogin ? (
          <LoginForm
            onSwitchToSignup={() => setIsLogin(false)}
            onSuccess={handleAuthSuccess}
          />
        ) : (
          <SignupForm
            onSwitchToLogin={() => setIsLogin(true)}
            onSuccess={handleAuthSuccess}
          />
        )}
      </div>
    </div>
  );
};

export default Auth;