// src/components/RegistroUsuarios.jsx
// Vista de Gestión de Usuarios (rol "creadorcuentas").
// El formulario, la tabla, la API y los helpers viven en ./registro/.
import React, { useCallback, useMemo, useState } from "react";
import { AlertCircle, Loader, UserPlus, Users } from "lucide-react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "../CSS/AdminPanel.css";
import "../CSS/RegistroUsuarios.css";
import "../CSS/RegistroPanel.css";
import LogoutButton from "./LogoutBoton";
import FormularioUsuario from "./registro/FormularioUsuario";
import TablaUsuarios from "./registro/TablaUsuarios";
import useUsuarios from "../hooks/useUsuarios";
import useRoleGuard from "../hooks/useRoleGuard";

// Fuera del componente: si fuera un literal en línea, el efecto del guard se
// volvería a ejecutar en cada render.
const ROLES_PERMITIDOS = ["creadorcuentas"];

const GestionUsuarios = () => {
  useRoleGuard(ROLES_PERMITIDOS);

  const { usuarios, loading, error, isRefreshing, crearUsuario, recargarSilencioso } =
    useUsuarios();
  const [tabActiva, setTabActiva] = useState("registrar");

  const resumen = useMemo(() => {
    const clientes = usuarios.filter((u) => u.rol === "cliente").length;
    return {
      total: usuarios.length,
      clientes,
      personal: usuarios.length - clientes,
      sinCorreo: usuarios.filter((u) => !u.correo).length,
    };
  }, [usuarios]);

  const handleLogout = useCallback(() => {
    sessionStorage.clear();
    window.location.href = "/login";
  }, []);

  return (
    <div className="admin-container registro-container">
      <ToastContainer position="top-right" autoClose={3000} theme="light" />

      <div className="admin-logout">
        <LogoutButton
          userName="Admin"
          onLogout={handleLogout}
          size="normal"
          showUserName
        />
      </div>

      {/* Encabezado */}
      <div className="dashboard-header">
        <div className="header-content">
          <div>
            <h1 className="header-title">Gestión de Usuarios</h1>
            <p className="header-subtitle">
              Administre las cuentas de usuario de la plataforma Country Refugio
            </p>
          </div>
          {isRefreshing && (
            <div className="refresh-indicator">
              <Loader size={16} className="spin" />
              <span>Actualizando...</span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Resumen */}
      <div className="stats-grid registro-stats">
        <TarjetaResumen titulo="Total usuarios" valor={resumen.total} color="#c17b4a" />
        <TarjetaResumen titulo="Clientes" valor={resumen.clientes} color="#9caf88" />
        <TarjetaResumen titulo="Personal interno" valor={resumen.personal} color="#6b4423" />
        <TarjetaResumen titulo="Sin correo" valor={resumen.sinCorreo} color="#d4a574" />
      </div>

      {/* Pestañas */}
      <div className="tabs-container">
        <button
          type="button"
          className={`tab-button ${tabActiva === "registrar" ? "active" : ""}`}
          onClick={() => setTabActiva("registrar")}
        >
          <UserPlus size={20} />
          Registrar Usuario
        </button>
        <button
          type="button"
          className={`tab-button ${tabActiva === "usuarios" ? "active" : ""}`}
          onClick={() => setTabActiva("usuarios")}
        >
          <Users size={20} />
          Usuarios Registrados
        </button>
      </div>

      {/* Ambas pestañas quedan montadas: cambiar de pestaña no borra lo que ya
          se escribió en el formulario ni reinicia los filtros de la tabla. */}
      <div className={`tab-panel ${tabActiva === "registrar" ? "" : "oculto"}`}>
        <FormularioUsuario onCrearUsuario={crearUsuario} loading={loading} />
      </div>

      <div className={`tab-panel ${tabActiva === "usuarios" ? "" : "oculto"}`}>
        <TablaUsuarios
          usuarios={usuarios}
          loading={loading}
          onRecargar={recargarSilencioso}
        />
      </div>
    </div>
  );
};

const TarjetaResumen = ({ titulo, valor, color }) => (
  <div className="stat-card">
    <div className="stat-card-topline" style={{ background: color }} />
    <div className="stat-title">{titulo}</div>
    <div className="stat-value">{valor}</div>
  </div>
);

export default GestionUsuarios;
