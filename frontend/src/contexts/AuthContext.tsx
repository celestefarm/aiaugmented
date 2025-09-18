import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, apiClient } from '../lib/api';

// Auth context types
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider props
interface AuthProviderProps {
  children: ReactNode;
}

// Auth provider component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // TEMPORARY: Mock user for bypassing authentication
  const mockUser: User = {
    id: 'mock-user-id',
    email: 'demo@example.com',
    name: 'Demo User',
    created_at: new Date().toISOString(),
    last_login: new Date().toISOString(),
    is_active: true
  };

  const [user, setUser] = useState<User | null>(mockUser);
  const [isLoading, setIsLoading] = useState(false); // Set to false to skip loading

  // TEMPORARY: Always return true for authentication bypass
  const isAuthenticated = true;

  // Initialize auth state on mount - bypassed for demo
  useEffect(() => {
    // Skip initialization for demo mode
    setUser(mockUser);
    setIsLoading(false);
  }, []);

  // Initialize authentication state - bypassed
  const initializeAuth = async () => {
    // Bypassed for demo mode
    setUser(mockUser);
    setIsLoading(false);
  };

  // Login function
  const login = async (email: string, password: string): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await apiClient.login({ email, password });
      setUser(response.user);
    } catch (error) {
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Signup function
  const signup = async (email: string, password: string, name: string): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await apiClient.signup({ email, password, name });
      setUser(response.user);
    } catch (error) {
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      await apiClient.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setIsLoading(false);
    }
  };

  // Refresh user data
  const refreshUser = async (): Promise<void> => {
    try {
      if (apiClient.isAuthenticated()) {
        const currentUser = await apiClient.getCurrentUser();
        setUser(currentUser);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
      // If refresh fails, user might need to re-authenticate
      setUser(null);
      apiClient.clearAuth();
    }
  };

  // Context value
  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    signup,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Export context for advanced usage
export { AuthContext };