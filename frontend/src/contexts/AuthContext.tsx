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
  updateUser: (data: { name?: string }) => Promise<void>;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider props
interface AuthProviderProps {
  children: ReactNode;
}

// Auth provider component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = apiClient.isAuthenticated() && user !== null;

  // Initialize auth state on mount
  useEffect(() => {
    initializeAuth();
  }, []);

  // Initialize authentication state
  const initializeAuth = async () => {
    try {
      setIsLoading(true);
      console.log('=== AUTH CONTEXT INIT DEBUG ===');
      console.log('Is authenticated:', apiClient.isAuthenticated());
      console.log('Token exists:', !!localStorage.getItem('auth_token'));
      
      if (apiClient.isAuthenticated()) {
        console.log('Fetching current user...');
        const currentUser = await apiClient.getCurrentUser();
        console.log('Current user:', currentUser);
        setUser(currentUser);
      } else {
        console.log('Not authenticated, setting user to null');
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      setUser(null);
      apiClient.clearAuth();
    } finally {
      setIsLoading(false);
      console.log('Auth initialization complete. User:', user);
    }
  };

  // Login function
  const login = async (email: string, password: string): Promise<void> => {
    try {
      setIsLoading(true);
      console.log('=== LOGIN DEBUG ===');
      console.log('Attempting login for:', email);
      
      const response = await apiClient.login({ email, password });
      console.log('Login successful, token stored:', !!localStorage.getItem('auth_token'));
      console.log('User data:', response.user);
      
      setUser(response.user);
    } catch (error) {
      console.error('Login failed:', error);
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

  // Update user profile
  const updateUser = async (data: { name?: string }): Promise<void> => {
    try {
      setIsLoading(true);
      console.log('=== UPDATE USER DEBUG ===');
      console.log('Updating user with data:', data);
      
      const updatedUser = await apiClient.updateProfile(data);
      console.log('User update successful:', updatedUser);
      
      // Fix user data structure mismatch: backend returns "_id" but frontend expects "id"
      if (updatedUser && updatedUser._id && !updatedUser.id) {
        (updatedUser as any).id = updatedUser._id;
      }
      
      setUser(updatedUser);
      console.log('User state updated successfully');
    } catch (error) {
      console.error('Failed to update user:', error);
      throw error;
    } finally {
      setIsLoading(false);
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
    updateUser,
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