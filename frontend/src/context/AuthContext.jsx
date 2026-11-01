import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('tj_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('tj_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      api.get('/user')
        .then((res) => {
          setUser(res.data.user);
          localStorage.setItem('tj_user', JSON.stringify(res.data.user));
        })
        .catch(() => {
          setToken(null);
          setUser(null);
          localStorage.removeItem('tj_token');
          localStorage.removeItem('tj_user');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (identifier, password) => {
    const res = await api.post('/login', {
      login: identifier,
      email: identifier,
      password,
    });
    setToken(res.data.token);
    setUser(res.data.user);
    localStorage.setItem('tj_token', res.data.token);
    localStorage.setItem('tj_user', JSON.stringify(res.data.user));
    return res.data;
  };

  const register = async (name, email, password, password_confirmation, initial_capital, username) => {
    const res = await api.post('/register', {
      name,
      username: username || undefined,
      email,
      password,
      password_confirmation,
      initial_capital,
    });
    setToken(res.data.token);
    setUser(res.data.user);
    localStorage.setItem('tj_token', res.data.token);
    localStorage.setItem('tj_user', JSON.stringify(res.data.user));
    return res.data;
  };

  const logout = async () => {
    try {
      if (token) {
        await api.post('/logout');
      }
    } catch (e) {
      // ignore
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem('tj_token');
      localStorage.removeItem('tj_user');
    }
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('tj_user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateUser, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
