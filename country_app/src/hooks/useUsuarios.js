// src/hooks/useUsuarios.js
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import useAutoRefresh from './useAutoRefresh';

const API_URL = 'https://elrefugiocountryclub.com/api/api/users';

// Evita re-renderizar toda la tabla cuando el auto-refresh devuelve lo mismo.
const mismaLista = (a, b) =>
  a.length === b.length && JSON.stringify(a) === JSON.stringify(b);

const useUsuarios = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * `silencioso: true` no toca `loading`. El auto-refresh cada 30s (y el que
   * salta al volver a la pestaña) usaba el loading normal: eso deshabilitaba
   * todos los inputs de la vista y hacía perder el foco mientras se escribía,
   * que era lo que se sentía como "la página se recarga sola".
   */
  const obtenerUsuarios = useCallback(async ({ silencioso = false } = {}) => {
    if (!silencioso) setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get(`${API_URL}/all`);
      const lista = Array.isArray(data) ? data : [];
      setUsuarios((prev) => (mismaLista(prev, lista) ? prev : lista));
    } catch (err) {
      console.error(err);
      setError('Error al obtener usuarios de la base de datos');
    } finally {
      if (!silencioso) setLoading(false);
    }
  }, []);

  const recargarSilencioso = useCallback(
    () => obtenerUsuarios({ silencioso: true }),
    [obtenerUsuarios]
  );

  useEffect(() => { obtenerUsuarios(); }, [obtenerUsuarios]);
  const { isRefreshing } = useAutoRefresh(recargarSilencioso, { interval: 30000 });

  const crearUsuario = useCallback(async (nuevoUsuario) => {
    setLoading(true);
    setError(null);
    try {
      // Siempre /register para este formulario (register-cliente es solo para
      // Contabilidad, donde además se manejan pagos).
      const { data } = await axios.post(`${API_URL}/register`, nuevoUsuario);
      await obtenerUsuarios({ silencioso: true });
      return {
        success: true,
        message: data.message,
        credentials: data.credentials || null,
        username: data.username,
        password: data.password,
        id: data.id,
        rol: data.rol
      };
    } catch (err) {
      console.error(err);
      return { success: false, message: err.response?.data?.error || 'Error al registrar usuario' };
    } finally {
      setLoading(false);
    }
  }, [obtenerUsuarios]);

  const actualizarCorreo = useCallback(async (id, nuevoEmail) => {
    try {
      const { data } = await axios.patch(`${API_URL}/update-email/${id}`, { email: nuevoEmail });
      await obtenerUsuarios({ silencioso: true });
      return { success: true, message: data.message || 'Correo actualizado correctamente' };
    } catch (err) {
      console.error(err);
      return { success: false, message: err.response?.data?.error || 'Error al actualizar correo' };
    }
  }, [obtenerUsuarios]);

  const actualizarPassword = useCallback(async (id, nuevaPassword) => {
    try {
      const { data } = await axios.patch(`${API_URL}/update-password/${id}`, { password: nuevaPassword });
      await obtenerUsuarios({ silencioso: true });
      return { success: true, message: data.message || 'Contraseña actualizada correctamente' };
    } catch (err) {
      console.error(err);
      return { success: false, message: err.response?.data?.error || 'Error al actualizar contraseña' };
    }
  }, [obtenerUsuarios]);

  return {
    usuarios,
    loading,
    error,
    isRefreshing,
    crearUsuario,
    actualizarCorreo,
    actualizarPassword,
    recargarSilencioso,
    cargarUsuarios: obtenerUsuarios,
  };
};

export default useUsuarios;
