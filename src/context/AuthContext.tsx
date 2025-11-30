// src/context/AuthContext.tsx
import React, { createContext, useState, useEffect, useContext } from "react";

interface User {
  id: string | number;  // ✅ FIX: Allow both string and number
  staff_id: string;
  name: string;
  email: string;
  department?: string;
  employee_type?: string;
  role?: string;
  contact_number?: string;
  photo_url?: string;
  avatarUrl?: string | null;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
}

interface AuthContextProps {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextProps>({
  user: null,
  token: null,
  isLoading: true,
  login: () => {},
  logout: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    
    if (storedToken && storedUser) {
      try {
        // ✅ Validate token is not expired before restoring
        const payload = JSON.parse(atob(storedToken.split('.')[1]));
        const expiresAt = payload.exp * 1000; // Convert to milliseconds
        
        if (Date.now() >= expiresAt) {
          // Token expired, clear storage
          console.log("Token expired, clearing auth state");
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setIsLoading(false);
          return;
        }
        
        // Token still valid, restore session
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("Failed to restore auth state:", error);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }
    setIsLoading(false);
  }, []);

  const login = (jwt: string, userData: User) => {
    // ✅ Ensure id is preserved as-is (number or string)
    const userToStore = {
      ...userData,
      id: userData.id  // Don't convert, keep as-is
    };
    
    localStorage.setItem("token", jwt);
    localStorage.setItem("user", JSON.stringify(userToStore));
    setToken(jwt);
    setUser(userToStore);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);