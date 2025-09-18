import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useAuth } from '../../contexts/AuthContext';

interface SignupFormProps {
  onSwitchToLogin: () => void;
  onSuccess?: () => void;
}

const SignupForm: React.FC<SignupFormProps> = ({ onSwitchToLogin, onSuccess }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const { signup, isLoading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    try {
      await signup(email, password, name);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-[#1A1A1A] rounded-lg border border-[#333333]">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-[#E5E7EB] mb-2">Create Account</h2>
        <p className="text-[#9CA3AF]">Sign up to get started</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-[#E5E7EB]">
            Full Name
          </Label>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your full name"
            className="bg-[#0A0A0A] border-[#333333] text-[#E5E7EB] placeholder-[#6B7280] focus:border-[#3B82F6]"
            disabled={isLoading}
          />
        </div>

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

        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-[#E5E7EB]">
            Confirm Password
          </Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm your password"
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
          {isLoading ? 'Creating account...' : 'Create Account'}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-[#9CA3AF]">
          Already have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-[#3B82F6] hover:text-[#2563EB] font-medium"
            disabled={isLoading}
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
};

export default SignupForm;