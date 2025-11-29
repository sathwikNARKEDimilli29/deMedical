'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useWeb3 } from './Web3Provider';

const AuthContext = createContext();

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const { account } = useWeb3();

  useEffect(() => {
    // Load token from localStorage
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
      loadUser(storedToken);
    } else {
      setLoading(false);
    }
  }, [loadUser]);

  useEffect(() => {
    if (account && token) {
      loadUser(token);
    }
  }, [account, token, loadUser]);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('walletAddress');
  }, []);

  const loadUser = useCallback(async (authToken) => {
    try {
      const walletAddress = account || localStorage.getItem('walletAddress');
      if (!walletAddress) {
        setLoading(false);
        return;
      }

      const response = await axios.get(`${API_URL}/auth/profile/${walletAddress}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      
      setUser(response.data);
    } catch (error) {
      console.error('Failed to load user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  }, [account, logout]);

  const login = async (walletAddress) => {
    try {
      const response = await axios.post(`${API_URL}/auth/login/wallet`, {
        walletAddress,
      });
      
      const { token: newToken, user: userData } = response.data;
      
      setToken(newToken);
      setUser(userData);
      localStorage.setItem('token', newToken);
      localStorage.setItem('walletAddress', walletAddress);
      
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const register = async (userData) => {
    try {
      const response = await axios.post(`${API_URL}/auth/register`, userData);
      
      const { token: newToken, user: newUser } = response.data;
      
      setToken(newToken);
      setUser(newUser);
      localStorage.setItem('token', newToken);
      localStorage.setItem('walletAddress', userData.walletAddress);
      
      return true;
    } catch (error) {
      console.error('Registration failed:', error);
      return false;
    }
  };



  const updateProfile = async (profileData) => {
    try {
      const response = await axios.put(
        `${API_URL}/auth/profile/${account}`,
        profileData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setUser(response.data);
      return true;
    } catch (error) {
      console.error('Profile update failed:', error);
      return false;
    }
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
