import { useState, useEffect, createContext } from "react";
import { useNavigate } from "react-router-dom";
import LoginPage from "./pages/Login";
import DashboardPage from "./pages/Dashboard";
import { getAuthToken, setAuthToken, removeAuthToken } from "./lib/api";

interface AuthContextType {
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

function AppContent() {
  const [token, setToken] = useState<string | null>(null);
  const [justLoggedIn, setJustLoggedIn] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const stored = getAuthToken();
    if (stored) setToken(stored);
  }, []);

  useEffect(() => {
    if (justLoggedIn && token) {
      setJustLoggedIn(false);
      navigate("/developer/dashboard");
    }
  }, [justLoggedIn, token, navigate]);

  const login = (t: string) => {
    setAuthToken(t);
    setToken(t);
    setJustLoggedIn(true);
  };

  const logout = () => {
    removeAuthToken();
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ token, login, logout }}>
      {token ? (
        <DashboardPage />
      ) : (
        <LoginPage onLogin={login} />
      )}
    </AuthContext.Provider>
  );
}

export default function App() {
  return <AppContent />;
}