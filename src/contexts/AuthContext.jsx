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
    
    // Periodically check auth status to catch password changes from other browsers/devices
    // This ensures logout happens when password is changed elsewhere
    const authCheckInterval = setInterval(() => {
      checkAuthStatus();
    }, 30000); // Check every 30 seconds
    
    return () => clearInterval(authCheckInterval);
  }, []);

  const checkAuthStatus = async () => {
    try {
      const currentUser = await User.me();
      // Check if user is logged in (user must exist and have valid integer ID)
      const isLoggedIn = currentUser && !isNaN(parseInt(currentUser.id, 10));
      setUser(currentUser);
      setIsAuthenticated(isLoggedIn);
      
      // If User.me() returned null, it means token was invalidated (e.g., password changed)
      // Clear all auth state
      if (!currentUser) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('current_user');
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      // Clear all auth data on error
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('current_user');
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
        
        // Backend now returns: { access_token, refresh_token, token_type, user }
        const { refresh_token } = loginResponse;
        
        // Store user and tokens in localStorage
        localStorage.setItem('current_user', JSON.stringify(userData));
        localStorage.setItem('access_token', access_token);
        if (refresh_token) {
          localStorage.setItem('refresh_token', refresh_token);
        }
        
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
      // Clear user and tokens from localStorage
      localStorage.removeItem('current_user');
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setUser(null);
      setIsAuthenticated(false);
      return { success: true };
    } catch (error) {
      console.error('Logout failed:', error);
      // Still clear localStorage even if there's an error
      localStorage.removeItem('current_user');
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setUser(null);
      setIsAuthenticated(false);
      return { success: true };
    }
  };
  
  const refreshAccessToken = async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        return null;
      }
      
      const response = await fetch(`${CONFIG.API_BASE_URL}/api/users/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken })
      });
      
      if (response.ok) {
        const data = await response.json();
        const { access_token } = data;
        if (access_token) {
          localStorage.setItem('access_token', access_token);
          return access_token;
        }
      } else {
        // Refresh token invalid or expired - clear everything
        localStorage.removeItem('current_user');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setUser(null);
        setIsAuthenticated(false);
      }
      return null;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return null;
    }
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    checkAuthStatus,
    refreshAccessToken
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
