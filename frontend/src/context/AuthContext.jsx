import { createContext, useContext, useEffect, useState } from "react";
import api from "../api/client.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("co_user");
    return raw ? JSON.parse(raw) : null;
  });

  useEffect(() => {
    if (user) localStorage.setItem("co_user", JSON.stringify(user));
    else localStorage.removeItem("co_user");
  }, [user]);

  async function loginAdmin(email, password) {
    const { data } = await api.post("/auth/admin-login", { email, password });
    localStorage.setItem("co_token", data.token);
    setUser(data.user);
    return data.user;
  }

  async function loginProfesional(email, password) {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("co_token", data.token);
    setUser(data.user);
    return data.user;
  }

  function logout() {
    localStorage.removeItem("co_token");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loginAdmin, loginProfesional, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
