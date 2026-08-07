import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRedirectRoute } from '../utils/roleRedirect';
import { cerrarSesion, haySesion, obtenerUsuario } from '../utils/sesion';

export default function useRoleGuard(requiredRoles) {
  const navigate = useNavigate();

  useEffect(() => {
    // Sin token no sirve de nada mostrar la vista: el backend rechazaría
    // todas sus llamadas con 401.
    if (!haySesion()) {
      cerrarSesion();
      navigate('/login', { replace: true });
      return;
    }

    const user = obtenerUsuario();
    if (!user?.rol || !requiredRoles.includes(user.rol)) {
      // Redirigir al destino correcto según su rol
      navigate(getRedirectRoute(user?.rol), { replace: true });
    }
  }, [navigate, requiredRoles]);
}
