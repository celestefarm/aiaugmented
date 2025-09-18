import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useAuth } from '../../contexts/AuthContext';

interface LoginFormProps {
  onSwitchToSignup: () => void;
  onSuccess?: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToSignup, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, isLoading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      await login(email, password);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-[#1A1A1A] rounded-lg border border-[#333333]">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-[#E5E7EB] mb-2">Welcome Back</h2>
        <p className="text-[#9CA3AF]">Sign in to your account</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-[#E5E7EB]">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            className="bg-[#0A0A0A] border-[#333333] text-[#E5E7EB] placeholder-[#6B7280] focus:border-[#3B82F6]"
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-[#E5E7EB]">
            Password
          </Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            className="bg-[#0A0A0A] border-[#333333] text-[#E5E7EB] placeholder-[#6B7280] focus:border-[#3B82F6]"
            disabled={isLoading}
          />
        </div>

        {error && (
          <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-md">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <Button
          type="submit"
          className="w-full bg-[#3B82F6] hover:bg-[#2563EB] text-white"
          disabled={isLoading}
        >
          {isLoading ? 'Signing in...' : 'Sign In'}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-[#9CA3AF]">
          Don't have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToSignup}
            className="text-[#3B82F6] hover:text-[#2563EB] font-medium"
            disabled={isLoading}
          >
            Sign up
          </button>
        </p>
      </div>
    </div>
  );
};

export default LoginForm;