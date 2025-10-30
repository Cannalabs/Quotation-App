import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@/api/entities';
import { CONFIG } from '@/config/constants';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const currentUser = await User.me();
      // Check if user is logged in (not the default demo user)
      const isLoggedIn = currentUser && currentUser.id !== 'user-1';
      setUser(currentUser);
      setIsAuthenticated(isLoggedIn);
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      // First try hardcoded credentials for demo
      const validCredentials = [
        { email: 'admin@example.com', password: 'admin123', user: { id: 'admin-1', full_name: 'Admin User', email: 'admin@example.com', role: 'admin', profile_picture_url: '' } },
        { email: 'user@example.com', password: 'user123', user: { id: 'user-2', full_name: 'Regular User', email: 'user@example.com', role: 'user', profile_picture_url: '' } },
        { email: 'demo@example.com', password: 'demo123', user: { id: 'demo-1', full_name: 'Demo User', email: 'demo@example.com', role: 'admin', profile_picture_url: '' } }
      ];

      const credential = validCredentials.find(c => c.email === email && c.password === password);
      
      if (credential) {
        // Store user in localStorage
        localStorage.setItem('current_user', JSON.stringify(credential.user));
        setUser(credential.user);
        setIsAuthenticated(true);
        return { success: true, user: credential.user };
      }

          // If not found in hardcoded credentials, try to verify with database
          try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/users/verify-login`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ email, password })
            });
            
            if (response.ok) {
              const dbUser = await response.json();
              const userData = {
                id: dbUser.id.toString(),
                full_name: dbUser.full_name,
                email: dbUser.email,
                role: dbUser.role,
                profile_picture_url: dbUser.profile_picture_url || ''
              };
              
              // Store user in localStorage
              localStorage.setItem('current_user', JSON.stringify(userData));
              setUser(userData);
              setIsAuthenticated(true);
              return { success: true, user: userData };
            }
            // Silently handle 401 errors - don't log them to console
          } catch (dbError) {
            // Silently handle network errors - don't log them to console
          }

      return { success: false, error: 'Invalid email or password' };
    } catch (error) {
      console.error('Login failed:', error);
      return { success: false, error: 'Login failed. Please try again.' };
    }
  };

  const logout = async () => {
    try {
      await User.logout();
      setUser(null);
      setIsAuthenticated(false);
      return { success: true };
    } catch (error) {
      console.error('Logout failed:', error);
      return { success: false, error: 'Logout failed. Please try again.' };
    }
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    checkAuthStatus
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
