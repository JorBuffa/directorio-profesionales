import { useEffect } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { supabase } from "./api/supabaseClient";
import Navbar from "./components/Navbar.jsx";
import Footer from "./components/Footer.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import AsistenteIA from "./components/AsistenteIA.jsx";

import Home from "./pages/Home.jsx";
import Buscar from "./pages/Buscar.jsx";
import SoyProfesional from "./pages/SoyProfesional.jsx";
import MiPerfil from "./pages/MiPerfil.jsx";
import EditarPerfil from "./pages/EditarPerfil.jsx";
import AdminLogin from "./pages/AdminLogin.jsx";
import Admin from "./pages/Admin.jsx";
import Terminos from "./pages/Terminos.jsx";
import NotFound from "./pages/NotFound.jsx";
import ActualizarContrasena from "./components/ActualizarContrasena.jsx";

export default function App() {
  const navigate = useNavigate();

  useEffect(() => {
    // Intercepta el token de recuperación y lo redirige limpiamente sin alterar el login
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "PASSWORD_RECOVERY") {
        navigate("/actualizar-contrasena", { replace: true });
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/buscar" element={<Buscar />} />
          <Route path="/soy-profesional" element={<SoyProfesional />} />
          <Route path="/mi-perfil" element={<MiPerfil />} />
          <Route path="/editar-perfil" element={<EditarPerfil />} />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/actualizar-contrasena" element={<ActualizarContrasena />} />
          <Route path="/terminos" element={<Terminos />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute role="admin">
                <Admin />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      {/* Componente del Asistente IA Flotante */}
      <AsistenteIA />
    </div>
  );
}