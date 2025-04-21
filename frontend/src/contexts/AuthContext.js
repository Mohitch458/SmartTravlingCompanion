import React, { createContext, useState, useContext, useEffect } from 'react';
import AuthService from '../services/auth.service';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      AuthService.setAuthToken(token);
      loadUser();
    } else {
      setLoading(false);
    }
  }, []);

  const loadUser = async () => {
    try {
      const userData = await AuthService.getProfile();
      setUser(userData);
    } catch (error) {
      console.error('Failed to load user:', error);
      AuthService.logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    const response = await AuthService.login(credentials);
    setUser(response.user);
    return response;
  };

  const register = async (userData) => {
    const response = await AuthService.register(userData);
    setUser(response.user);
    return response;
  };

  const logout = () => {
    AuthService.logout();
    setUser(null);
  };

  const updateProfile = async (profileData) => {
    const updatedUser = await AuthService.updateProfile(profileData);
    setUser(updatedUser);
    return updatedUser;
  };

  const uploadProfilePicture = async (file) => {
    const response = await AuthService.uploadProfilePicture(file);
    setUser(prev => ({ ...prev, profilePictureUrl: response.profilePictureUrl }));
    return response;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        updateProfile,
        uploadProfilePicture,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
