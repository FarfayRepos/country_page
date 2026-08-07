// src/components/registro/FormularioUsuario.jsx
import React, { useCallback, useMemo, useState } from "react";
import { UserPlus, Loader, Copy, Check, X } from "lucide-react";
import { toast } from "react-toastify";
import useCredencialesPreview from "./useCredencialesPreview";
import { esEmailValido } from "./helpers";
import {
  ESPECIALIDADES,
  FORM_INICIAL,
  MIN_PASSWORD,
  ROLES,
  TIPOS_CLIENTE,
  TIPOS_NIVEL,
  TOAST_OPTS,
} from "./constants";

const FormularioUsuario = React.memo(({ onCrearUsuario, loading }) => {
  const [formData, setFormData] = useState(FORM_INICIAL);
  const [errores, setErrores] = useState({});
  const [sinCorreo, setSinCorreo] = useState(false);
  const [copiado, setCopiado] = useState(false);
  // Credenciales del último usuario creado con entrega manual: el formulario se
  // limpia al registrar, así que se conservan aparte para poder copiarlas.
  const [credencialesCreadas, setCredencialesCreadas] = useState(null);

  const esCliente = formData.rol === "cliente";
  // El personal interno nunca recibe correo: siempre credenciales manuales.
  const credencialesManuales = !esCliente || sinCorreo;

  const { credenciales, generando, setPassword, limpiar, sincronizar } =
    useCredencialesPreview({
      nombre: formData.nombre,
      apellido: formData.apellido,
      activo: credencialesManuales,
    });

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Actualización funcional: evita que handleChange se recree en cada tecla.
    setErrores((prev) => (prev[name] ? { ...prev, [name]: "" } : prev));
  }, []);

  // Cambiar de rol también decide si se pide correo (antes era un useEffect
  // extra que provocaba un render de más por cada cambio).
  const handleRolChange = useCallback(
    (e) => {
      const rol = e.target.value;
      setFormData((prev) => ({ ...prev, rol }));
      setSinCorreo(rol !== "cliente");
      if (rol === "cliente") limpiar();
    },
    [limpiar]
  );

  const handleSinCorreoChange = useCallback(
    (e) => {
      setSinCorreo(e.target.checked);
      if (!e.target.checked) limpiar();
    },
    [limpiar]
  );

  const passwordCorta =
    credenciales.password.length > 0 &&
    credenciales.password.length < MIN_PASSWORD;

  const validar = useCallback(() => {
    const nuevosErrores = {};

    if (!formData.nombre.trim()) nuevosErrores.nombre = "El nombre es requerido";
    if (!formData.apellido.trim())
      nuevosErrores.apellido = "El apellido es requerido";

    if (!sinCorreo) {
      if (!formData.email.trim()) {
        nuevosErrores.email = "El email es requerido";
      } else if (!esEmailValido(formData.email)) {
        nuevosErrores.email = "El email no es válido";
      }
    }

    if (credencialesManuales && passwordCorta) {
      nuevosErrores.password = `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres`;
      toast.error(nuevosErrores.password, TOAST_OPTS);
    }

    if (formData.rol === "instructora" && !formData.especialidad) {
      nuevosErrores.especialidad = "La especialidad es requerida";
    }

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  }, [formData, sinCorreo, credencialesManuales, passwordCorta]);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!validar()) return;

      // Confirmar el username contra el backend justo antes de registrar.
      const finales = credencialesManuales ? await sincronizar() : null;

      const datos = {
        ...formData,
        correo: formData.email,
        withoutEmail: credencialesManuales,
        ...(finales?.password && { customPassword: finales.password }),
        ...(!esCliente && {
          edad: null,
          tipo_cliente: null,
          nivel: null,
          tipo_nivel: null,
        }),
      };
      if (credencialesManuales) delete datos.correo;

      const resultado = await onCrearUsuario(datos);

      if (!resultado.success) {
        toast.error(resultado.message || "Error al crear usuario", {
          ...TOAST_OPTS,
          autoClose: 4000,
        });
        return;
      }

      if (!credencialesManuales) {
        setCredencialesCreadas(null);
        toast.success(
          `Usuario creado. Credenciales enviadas por email a ${formData.email}`,
          TOAST_OPTS
        );
      } else {
        setCredencialesCreadas({
          nombre: `${formData.nombre} ${formData.apellido}`.trim(),
          ...(resultado.credentials || finales),
        });
        toast.success(
          "Las credenciales NO se enviarán por correo. Cópialas y entrégalas personalmente.",
          { ...TOAST_OPTS, autoClose: 5000 }
        );
      }

      setFormData(FORM_INICIAL);
      setSinCorreo(false);
      setErrores({});
      limpiar();
    },
    [
      validar,
      credencialesManuales,
      sincronizar,
      formData,
      esCliente,
      onCrearUsuario,
      limpiar,
    ]
  );

  const handleCopiarTodo = useCallback(async () => {
    const finales = await sincronizar();
    await navigator.clipboard.writeText(
      `Username: ${finales.username}\nContraseña: ${finales.password}`
    );
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }, [sincronizar]);

  const textoBoton = useMemo(() => {
    if (!loading) return "Registrar Usuario";
    return credencialesManuales
      ? "Verificando credenciales y registrando..."
      : "Registrando...";
  }, [loading, credencialesManuales]);

  return (
    <div className="user-form-section">
      <div className="section-header">
        <h3>
          <UserPlus size={22} /> Registrar Nuevo Usuario
        </h3>
        <p>Complete el formulario para agregar un nuevo usuario al sistema</p>
      </div>

      <div className="auto-credentials-info">
        {esCliente ? (
          <>
            🔑 <strong>Clientes:</strong> las credenciales se generan
            automáticamente. Puedes enviarlas por email o copiarlas para
            entregarlas a mano.
          </>
        ) : (
          <>
            🔑 <strong>Personal interno:</strong> las credenciales se generan
            para copiarlas y entregarlas. La contraseña es editable antes de
            crear la cuenta.
          </>
        )}
      </div>

      {/* Credenciales del usuario recién creado (siguen disponibles aunque el
          formulario ya se haya limpiado). */}
      {credencialesCreadas && (
        <div className="credenciales-creadas">
          <div className="credentials-header">
            <h4 className="credentials-title">
              ✅ Credenciales de {credencialesCreadas.nombre}
            </h4>
            <div className="credenciales-creadas__acciones">
              <button
                type="button"
                className="copy-all-btn"
                onClick={() =>
                  navigator.clipboard.writeText(
                    `Username: ${credencialesCreadas.username}\nContraseña: ${credencialesCreadas.password}`
                  )
                }
              >
                <Copy size={14} /> Copiar
              </button>
              <button
                type="button"
                className="icon-btn icon-btn--danger"
                onClick={() => setCredencialesCreadas(null)}
                title="Ocultar credenciales"
              >
                <X size={14} />
              </button>
            </div>
          </div>
          <div className="credenciales-creadas__datos">
            <span>
              Usuario: <code>{credencialesCreadas.username}</code>
            </span>
            <span>
              Contraseña: <code>{credencialesCreadas.password}</code>
            </span>
          </div>
          <p className="credentials-tip credentials-tip--alerta">
            🔒 Guárdalas ahora: no se enviaron por correo.
          </p>
        </div>
      )}

      <form className="user-form-container" onSubmit={handleSubmit}>
        {/* 1. Tipo de usuario */}
        <div className="form-group">
          <label htmlFor="rol">Tipo de Usuario *</label>
          <select
            id="rol"
            name="rol"
            value={formData.rol}
            onChange={handleRolChange}
            className="form-input"
            disabled={loading}
          >
            {ROLES.map((rol) => (
              <option key={rol.value} value={rol.value}>
                {rol.label}
              </option>
            ))}
          </select>
          <p className="checkbox-description" style={{ marginTop: "5px" }}>
            {esCliente
              ? "Cliente: puede tener email para recibir sus credenciales"
              : "Personal interno: credenciales para copiar y entregar"}
          </p>
        </div>

        {/* 2. Datos personales */}
        {esCliente ? (
          <div className="form-row">
            <CampoTexto
              id="nombre"
              label="Nombre *"
              value={formData.nombre}
              error={errores.nombre}
              onChange={handleChange}
              disabled={loading}
              placeholder="Ingrese el nombre"
            />
            <CampoTexto
              id="apellido"
              label="Apellido *"
              value={formData.apellido}
              error={errores.apellido}
              onChange={handleChange}
              disabled={loading}
              placeholder="Ingrese el apellido"
            />
          </div>
        ) : (
          <div
            className={`form-row-${
              formData.rol === "instructora" ? "four" : "three"
            } personal-interno-row`}
          >
            <CampoTexto
              id="nombre"
              label="Nombre *"
              value={formData.nombre}
              error={errores.nombre}
              onChange={handleChange}
              disabled={loading}
              placeholder="Ingrese el nombre"
            />
            <CampoTexto
              id="apellido"
              label="Apellido *"
              value={formData.apellido}
              error={errores.apellido}
              onChange={handleChange}
              disabled={loading}
              placeholder="Ingrese el apellido"
            />
            <CampoTexto
              id="telefono"
              label="Teléfono"
              type="tel"
              value={formData.telefono}
              onChange={handleChange}
              disabled={loading}
              placeholder="Ej: 999123456"
              className="form-input input-medium input-center"
            />

            {formData.rol === "instructora" && (
              <div className="form-group">
                <label htmlFor="especialidad">Especialidad *</label>
                <select
                  id="especialidad"
                  name="especialidad"
                  value={formData.especialidad}
                  onChange={handleChange}
                  className={
                    errores.especialidad ? "form-input error" : "form-input"
                  }
                  disabled={loading}
                >
                  {ESPECIALIDADES.map((esp) => (
                    <option key={esp} value={esp}>
                      {esp === "iniciacion"
                        ? "Iniciación"
                        : esp.charAt(0).toUpperCase() + esp.slice(1)}
                    </option>
                  ))}
                </select>
                {errores.especialidad && (
                  <span className="error-message">{errores.especialidad}</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* 3. Datos exclusivos de cliente */}
        {esCliente && (
          <>
            <div className="form-row-compact">
              <CampoTexto
                id="edad"
                label="Edad"
                type="number"
                value={formData.edad}
                onChange={handleChange}
                disabled={loading}
                placeholder="Ej: 25"
                className="form-input input-small"
              />
              <CampoTexto
                id="telefono"
                label="Teléfono"
                type="tel"
                value={formData.telefono}
                onChange={handleChange}
                disabled={loading}
                placeholder="Ej: 999123456"
                className="form-input input-medium"
              />
              <div className="form-group">
                <label htmlFor="email">Email {!sinCorreo && "*"}</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={errores.email ? "form-input error" : "form-input"}
                  disabled={loading || sinCorreo}
                  placeholder={
                    sinCorreo ? "No se requiere email" : "correo@ejemplo.com"
                  }
                />
                {errores.email && (
                  <span className="error-message">{errores.email}</span>
                )}
                <div className="checkbox-container" style={{ marginTop: "4px" }}>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={sinCorreo}
                      onChange={handleSinCorreoChange}
                      disabled={loading}
                    />
                    <span>Crear cliente sin correo electrónico</span>
                  </label>
                  <p className="checkbox-description">
                    Las credenciales se mostrarán para copiar y entregar
                    manualmente
                  </p>
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="tipo_cliente">Tipo de Cliente</label>
                <select
                  id="tipo_cliente"
                  name="tipo_cliente"
                  value={formData.tipo_cliente}
                  onChange={handleChange}
                  className="form-input"
                  disabled={loading}
                >
                  <option value="">Seleccione un tipo</option>
                  {TIPOS_CLIENTE.map((tipo) => (
                    <option
                      key={tipo}
                      value={tipo}
                      style={{ textTransform: "capitalize" }}
                    >
                      {tipo.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="tipo_nivel">Nivel (Tipo Nivel)</label>
                <select
                  id="tipo_nivel"
                  name="tipo_nivel"
                  value={formData.tipo_nivel}
                  onChange={handleChange}
                  className="form-input"
                  disabled={loading}
                >
                  <option value="">Seleccione un nivel</option>
                  {TIPOS_NIVEL.map((nivel) => (
                    <option
                      key={nivel}
                      value={nivel}
                      style={{ textTransform: "capitalize" }}
                    >
                      {nivel}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </>
        )}

        {/* 4. Vista previa de credenciales */}
        {credencialesManuales && credenciales.username && (
          <div className="credentials-preview">
            <div className="credentials-header">
              <h4 className="credentials-title">⚠️ Credenciales a crear</h4>
              <button
                type="button"
                onClick={handleCopiarTodo}
                className="copy-all-btn"
              >
                {copiado ? <Check size={14} /> : <Copy size={14} />}
                {copiado ? "Copiadas" : "Copiar todo"}
              </button>
            </div>

            <div className="credentials-content">
              <div className="credentials-field">
                <div className="field-header">
                  <strong className="field-label">Username</strong>
                  <span className="field-badge">🔒 automático</span>
                </div>
                <div className="field-input">
                  {generando ? "Generando..." : credenciales.username}
                </div>
              </div>

              <div className="credentials-field">
                <div className="field-header">
                  <strong className="field-label">Contraseña</strong>
                  <span className="field-badge">✏️ editable</span>
                </div>
                <input
                  type="text"
                  value={credenciales.password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="field-input"
                  placeholder={`Mínimo ${MIN_PASSWORD} caracteres`}
                  minLength={MIN_PASSWORD}
                />
                {passwordCorta ? (
                  <p className="field-warning">
                    ⚠️ Contraseña muy corta ({credenciales.password.length}/
                    {MIN_PASSWORD} caracteres)
                  </p>
                ) : (
                  credenciales.password.length >= MIN_PASSWORD && (
                    <p className="field-success">
                      ✓ Contraseña válida ({credenciales.password.length}{" "}
                      caracteres)
                    </p>
                  )
                )}
              </div>
            </div>

            <p className="credentials-tip credentials-tip--alerta">
              🔒 Estas credenciales <b>NO</b> se enviarán por correo.
              <span>Debes copiarlas y entregarlas personalmente.</span>
            </p>
          </div>
        )}

        <button
          type="submit"
          className="rustic-button submit-btn"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader className="loading-spinner" size={18} /> {textoBoton}
            </>
          ) : (
            <>
              <UserPlus size={18} /> {textoBoton}
            </>
          )}
        </button>
      </form>
    </div>
  );
});

// Campo de texto simple del formulario (evita repetir el mismo bloque 6 veces).
const CampoTexto = ({
  id,
  label,
  value,
  onChange,
  error,
  disabled,
  placeholder,
  type = "text",
  className,
}) => (
  <div className="form-group">
    <label htmlFor={id}>{label}</label>
    <input
      type={type}
      id={id}
      name={id}
      value={value}
      onChange={onChange}
      className={error ? "form-input error" : className || "form-input"}
      disabled={disabled}
      placeholder={placeholder}
    />
    {error && <span className="error-message">{error}</span>}
  </div>
);

FormularioUsuario.displayName = "FormularioUsuario";

export default FormularioUsuario;
