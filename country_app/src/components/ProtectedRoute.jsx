import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { cerrarSesion, haySesion, obtenerUsuario } from '../utils/sesion';

const ProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const checkAuth = () => {
      // Se exige usuario Y token: una sesión sin token no puede hablar con el
      // backend, así que vale lo mismo que no tener sesión.
      if (!haySesion()) {
        cerrarSesion();
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      const user = obtenerUsuario();
      if (user?.id && user?.nombre) {
        setIsAuthenticated(true);
      } else {
        cerrarSesion();
        setIsAuthenticated(false);
      }
      setIsLoading(false);
    };

    // Verificar inmediatamente
    checkAuth();

    // Escuchar cambios en sessionStorage (cuando se hace logout desde otra pestaña)
    const handleStorageChange = (e) => {
      if (e.key === 'user' || e.key === null) {
        console.log('Cambio en sessionStorage detectado');
        checkAuth();
      }
    };

    // Escuchar cuando la ventana vuelve a tener foco
    const handleFocus = () => {
      console.log('Ventana recuperó el foco, verificando autenticación');
      checkAuth();
    };

    // Escuchar cambios de visibilidad de la página
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('Página visible, verificando autenticación');
        checkAuth();
      }
    };

    // Solución para navegadores: recargar si la página se muestra desde el historial y no hay sesión
    const handlePageShow = (event) => {
      if (!haySesion() && event.persisted) {
        // Si no hay sesión y la página viene del historial, recargar
        window.location.reload();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [location.pathname]);

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '1.2rem',
        color: '#666',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div>Verificando sesión...</div>
        <div style={{ fontSize: '0.9rem', color: '#999' }}>
          Ruta: {location.pathname}
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Forzar limpieza completa antes de redirigir
    cerrarSesion();
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
};

export default ProtectedRoute; 