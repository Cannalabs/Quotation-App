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
      // Check if user is logged in (user must exist and have valid integer ID)
      const isLoggedIn = currentUser && !isNaN(parseInt(currentUser.id, 10));
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
      // Verify credentials with database only
      const response = await fetch(`${CONFIG.API_BASE_URL}/api/users/verify-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password })
      });
      
      if (response.ok) {
        const loginResponse = await response.json();
        
        // Backend now returns: { access_token, token_type, user }
        const { access_token, user: dbUser } = loginResponse;
        
        if (!access_token || !dbUser) {
          console.error('Missing access_token or user in login response:', loginResponse);
          return { success: false, error: 'Invalid response from server' };
        }
        
        const userData = {
          id: dbUser.id.toString(),
          full_name: dbUser.full_name,
          email: dbUser.email,
          role: dbUser.role,
          profile_picture_url: dbUser.profile_picture_url || ''
        };
        
        // Store user and token in localStorage
        localStorage.setItem('current_user', JSON.stringify(userData));
        localStorage.setItem('access_token', access_token);
        
        // Update state immediately - don't call checkAuthStatus which would try to fetch from API
        setUser(userData);
        setIsAuthenticated(true);
        return { success: true, user: userData };
      } else {
        // Handle authentication failure
        const errorData = await response.json().catch(() => ({}));
        return { success: false, error: errorData.detail || 'Invalid email or password' };
      }
    } catch (error) {
      console.error('Login failed:', error);
      return { success: false, error: 'Login failed. Please try again.' };
    }
  };

  const logout = async () => {
    try {
      // Clear user and token from localStorage
      localStorage.removeItem('current_user');
      localStorage.removeItem('access_token');
      setUser(null);
      setIsAuthenticated(false);
      return { success: true };
    } catch (error) {
      console.error('Logout failed:', error);
      // Still clear localStorage even if there's an error
      localStorage.removeItem('current_user');
      localStorage.removeItem('access_token');
      setUser(null);
      setIsAuthenticated(false);
      return { success: true };
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
