// src/components/registro/useCredencialesPreview.js
import { useCallback, useEffect, useRef, useState } from "react";
import { obtenerCredencialesPreview } from "./registroApi";
import { generarPasswordSegura, generarUsernamePreview } from "./helpers";

const VACIO = { username: "", password: "" };
const DEBOUNCE_MS = 600;

/**
 * Vista previa de credenciales (username + contraseña) mientras se escribe el
 * nombre y el apellido del nuevo usuario.
 *
 * IMPORTANTE — origen del bug que trababa la página:
 * el efecto solo depende de (nombre, apellido, activo). La contraseña vigente
 * se lee de un ref, NUNCA del array de dependencias. Antes la contraseña era
 * dependencia del efecto y el propio efecto la reescribía, así que cada
 * respuesta del servidor volvía a disparar el efecto: la vista quedaba pidiendo
 * /preview-credentials cada medio segundo de forma indefinida y además pisaba
 * la contraseña que el usuario estuviera escribiendo a mano.
 */
const useCredencialesPreview = ({ nombre, apellido, activo }) => {
  const [credenciales, setCredenciales] = useState(VACIO);
  const [generando, setGenerando] = useState(false);
  const passwordRef = useRef("");

  // Edición manual de la contraseña: se guarda en el ref para que la próxima
  // regeneración (al cambiar el nombre) la respete en lugar de descartarla.
  const setPassword = useCallback((password) => {
    passwordRef.current = password;
    setCredenciales((prev) => ({ ...prev, password }));
  }, []);

  const limpiar = useCallback(() => {
    passwordRef.current = "";
    setCredenciales((prev) => (prev.username || prev.password ? VACIO : prev));
  }, []);

  useEffect(() => {
    const nombreLimpio = nombre.trim();
    const apellidoLimpio = apellido.trim();

    if (!activo) {
      passwordRef.current = "";
      setCredenciales((prev) => (prev.username || prev.password ? VACIO : prev));
      return undefined;
    }

    if (!nombreLimpio || !apellidoLimpio) return undefined;

    let cancelado = false;
    setGenerando(true);

    const timeoutId = setTimeout(async () => {
      const password = passwordRef.current || generarPasswordSegura();
      const reales = await obtenerCredencialesPreview({
        nombre: nombreLimpio,
        apellido: apellidoLimpio,
        customPassword: password,
      });
      if (cancelado) return;

      // Si el backend no responde se usa la generación local como respaldo.
      const finales = reales || {
        username: generarUsernamePreview(nombreLimpio, apellidoLimpio),
        password,
      };
      passwordRef.current = finales.password;
      setCredenciales(finales);
      setGenerando(false);
    }, DEBOUNCE_MS);

    return () => {
      cancelado = true;
      clearTimeout(timeoutId);
    };
  }, [nombre, apellido, activo]);

  /**
   * Confirma contra el backend las credenciales justo antes de registrar, por
   * si el username quedó ocupado mientras se llenaba el formulario.
   */
  const sincronizar = useCallback(async () => {
    const nombreLimpio = nombre.trim();
    const apellidoLimpio = apellido.trim();
    if (!nombreLimpio || !apellidoLimpio) return credenciales;

    const reales = await obtenerCredencialesPreview({
      nombre: nombreLimpio,
      apellido: apellidoLimpio,
      customPassword: passwordRef.current || null,
    });
    if (!reales) return credenciales;

    passwordRef.current = reales.password;
    setCredenciales(reales);
    return reales;
  }, [nombre, apellido, credenciales]);

  return { credenciales, generando, setPassword, limpiar, sincronizar };
};

export default useCredencialesPreview;
