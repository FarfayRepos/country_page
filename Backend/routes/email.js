import "../server/env.js";
import express from "express";
import { Resend } from "resend";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const router = express.Router();
const resend = new Resend(process.env.RESEND_API_KEY);

// CSS de los correos en archivo aparte (email.css). Se lee una sola vez al
// iniciar el servidor y se inyecta en el <style> de cada plantilla.
const EMAIL_STYLES = fs.readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "email.css"),
  "utf8"
);

// Funcion helper para formatear fechas correctamente evitando problemas de zona horaria
function formatearFecha(fechaReserva) {
  if (!fechaReserva) return '';

  if (/^\d{4}-\d{2}-\d{2}$/.test(fechaReserva)) {
    const [year, month, day] = fechaReserva.split('-').map(Number);
    const fecha = new Date(year, month - 1, day, 12, 0, 0);
    return fecha.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  if (fechaReserva instanceof Date) {
    return fechaReserva.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  const fechaStr = String(fechaReserva).split('T')[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(fechaStr)) {
    const [year, month, day] = fechaStr.split('-').map(Number);
    const fecha = new Date(year, month - 1, day, 12, 0, 0);
    return fecha.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  const fecha = new Date(fechaReserva);
  return fecha.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// -- Helpers de template reutilizables --

function emailWrapper(preheaderText, content) {
  return `<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light only">
  <title>EL REFUGIO</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
${EMAIL_STYLES}
  </style>
</head>
<body class="body" style="margin:0; padding:0; background-color:#f0ece7; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif; -webkit-font-smoothing:antialiased; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%;">
  <!-- Preheader -->
  <div style="display:none; max-height:0; overflow:hidden; mso-hide:all;">
    ${preheaderText}
    ${'&nbsp;&zwnj;'.repeat(30)}
  </div>

  <table width="100%" cellspacing="0" cellpadding="0" class="email-bg" style="background-color:#f0ece7; padding:20px 12px;" role="presentation">
    <tr>
      <td align="center">
        <table width="540" cellspacing="0" cellpadding="0" class="email-container card-bg" style="background-color:#ffffff; border-radius:12px; overflow:hidden; max-width:100%;" role="presentation">
          ${content}
        </table>

        <table width="540" cellspacing="0" cellpadding="0" class="email-container" style="max-width:100%;" role="presentation">
          <tr>
            <td style="padding:14px 24px 8px; text-align:center;">
              <p style="margin:0; color:#a09484; font-size:11px; line-height:1.5;">
                Este correo fue enviado automaticamente. No respondas a este mensaje.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function emailHeader() {
  return `
<!-- Header -->
<tr>
  <td class="header-padding" style="background: linear-gradient(160deg, #7a5e3e 0%, #8b6f4e 40%, #a68968 100%); padding:24px 28px; text-align:center;">
    <img src="https://elrefugiocountryclub.com/El_refugio_logo.png"
         alt="El Refugio"
         width="44"
         style="display:block; margin:0 auto 8px;">
    <h1 style="margin:0; color:#ffffff; font-size:18px; font-weight:800; letter-spacing:1.5px; text-transform:uppercase; font-family:Georgia,'Times New Roman',serif;">
      EL REFUGIO
    </h1>
    <p style="margin:2px 0 0; color:rgba(255,255,255,0.65); font-size:9px; font-weight:500; letter-spacing:2px; text-transform:uppercase;">
      Country Club
    </p>
  </td>
</tr>`;
}

function emailFooter() {
  return `
<!-- Footer -->
<tr>
  <td style="padding:0;">
    <div style="height:2px; background:linear-gradient(90deg, #8b6f4e, #bfa47e, #8b6f4e);"></div>
    <table width="100%" cellspacing="0" cellpadding="0" class="footer-bg" style="background-color:#1f1f1f;" role="presentation">
      <tr>
        <td class="footer-text" style="padding:16px 24px; text-align:center;">
          <p style="margin:0 0 2px 0; color:rgba(255,255,255,0.6); font-size:11px; font-weight:600; letter-spacing:1px;">
            EL REFUGIO
          </p>
          <p style="margin:0; color:rgba(255,255,255,0.3); font-size:10px;">
            &copy; ${new Date().getFullYear()} &middot; elrefugiocountryclub.com
          </p>
        </td>
      </tr>
    </table>
  </td>
</tr>`;
}

// Iconos SVG hospedados en el dominio (igual que el logo)
// Los archivos estan en country_app/public/icons/ y se sirven desde el dominio
const ICON_BASE = 'https://elrefugiocountryclub.com/icons';
const icons = {
  calendar:      `${ICON_BASE}/calendar.svg`,
  clock:         `${ICON_BASE}/clock.svg`,
  user:          `${ICON_BASE}/user.svg`,
  award:         `${ICON_BASE}/award.svg`,
  tag:           `${ICON_BASE}/tag.svg`,
  lock:          `${ICON_BASE}/lock.svg`,
  key:           `${ICON_BASE}/key.svg`,
  checkCircle:   `${ICON_BASE}/check-circle.svg`,
  xCircle:       `${ICON_BASE}/x-circle.svg`,
  alertTriangle: `${ICON_BASE}/alert.svg`,
  shield:        `${ICON_BASE}/shield.svg`,
  message:       `${ICON_BASE}/message.svg`,
};

// Mapa de iconos por label para auto-asignar
const iconForLabel = {
  'Nivel': icons.award,
  'Tipo': icons.tag,
  'Tipo de Reserva': icons.tag,
  'Fecha': icons.calendar,
  'Fecha de la Clase': icons.calendar,
  'Horario': icons.clock,
  'Instructor(a)': icons.user,
  'Usuario': icons.user,
  'Contrasena Temporal': icons.lock,
  'Contrasena': icons.lock,
  'Nueva Contrasena': icons.key,
  'Motivo': icons.message,
};

function detailRow(label, value, opts = {}) {
  const { strike = false, borderBottom = true, icon } = opts;
  const valueStyle = strike
    ? 'color:#1a1a1a; font-size:15px; font-weight:600; text-decoration:line-through; opacity:0.6;'
    : 'color:#1a1a1a; font-size:15px; font-weight:600;';
  const capitalize = label === 'Fecha' ? ' text-transform:capitalize;' : '';
  const iconSrc = icon || iconForLabel[label] || null;
  const iconHtml = iconSrc
    ? `<img src="${iconSrc}" alt="" width="16" height="16" style="display:inline-block; vertical-align:middle; margin-right:6px;">`
    : '';
  return `
  <table width="100%" cellspacing="0" cellpadding="0" style="${borderBottom ? 'border-bottom:1px solid #ebe5dd; margin-bottom:10px; padding-bottom:10px;' : ''}">
    <tr>
      <td>
        <span style="color:#999; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:1px; display:block; margin-bottom:3px;">${iconHtml}${label}</span>
        <span style="${valueStyle}${capitalize}">${value}</span>
      </td>
    </tr>
  </table>`;
}

// Boton "bulletproof": VML para Outlook (que ignora border-radius y padding en <a>)
// y un <a> normal para el resto de clientes.
function ctaButton(text, href = 'https://elrefugiocountryclub.com/login') {
  return `
<table width="100%" cellspacing="0" cellpadding="0" role="presentation" style="margin:22px 0 4px;">
  <tr>
    <td align="center">
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${href}" style="height:46px; v-text-anchor:middle; width:270px;" arcsize="18%" stroke="f" fillcolor="#8b6f4e">
        <w:anchorlock/>
        <center style="color:#ffffff; font-family:Arial,sans-serif; font-size:14px; font-weight:bold; letter-spacing:0.3px;">${text}</center>
      </v:roundrect>
      <![endif]-->
      <!--[if !mso]><!-- -->
      <a href="${href}" class="cta-btn" style="display:inline-block; background-color:#8b6f4e; color:#ffffff !important; text-decoration:none; padding:14px 38px; border-radius:8px; font-size:14px; font-weight:700; letter-spacing:0.3px; text-align:center;">
        ${text}
      </a>
      <!--<![endif]-->
    </td>
  </tr>
</table>`;
}

// -- Bloques de composicion --

// Encabezado de contenido: etiqueta pequena + titulo + filete dorado + bajada
function contentHeading(eyebrow, title, subtitle = '') {
  return `
<p style="margin:0 0 6px 0; color:#a68968; font-size:10px; font-weight:700; letter-spacing:2px; text-transform:uppercase; text-align:center;">
  ${eyebrow}
</p>
<h2 style="margin:0 0 12px 0; color:#1a1a1a; font-size:21px; font-weight:700; line-height:1.3; text-align:center; font-family:Georgia,'Times New Roman',serif;">
  ${title}
</h2>
<table cellspacing="0" cellpadding="0" role="presentation" align="center" style="margin:0 auto 14px;">
  <tr>
    <td style="width:40px; height:2px; background-color:#c9b394; font-size:0; line-height:2px;">&nbsp;</td>
  </tr>
</table>
${subtitle ? `<p style="margin:0 0 22px 0; color:#7a7a7a; font-size:13px; text-align:center; line-height:1.6;">${subtitle}</p>` : ''}`;
}

// Un campo de credencial (etiqueta + valor destacado en monoespaciada)
function credentialField(label, value, iconSrc, opts = {}) {
  const { last = false } = opts;
  const iconHtml = iconSrc
    ? `<img src="${iconSrc}" alt="" width="12" height="12" style="display:inline-block; vertical-align:middle; margin-right:5px;">`
    : '';
  return `
<table width="100%" cellspacing="0" cellpadding="0" role="presentation" style="${last ? '' : 'margin-bottom:14px;'}">
  <tr>
    <td>
      <span style="color:#8b6f4e; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:1.2px; display:block; margin-bottom:7px;">
        ${iconHtml}${label}
      </span>
      <table width="100%" cellspacing="0" cellpadding="0" role="presentation" class="cred-value" style="background-color:#ffffff; border:1px solid #e4ddd3; border-radius:8px;">
        <tr>
          <td class="cred-value-box" style="padding:15px 18px; text-align:center;">
            <span class="cred-mono unstyled-link" style="font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,Courier,monospace; color:#1a1a1a; font-size:18px; font-weight:700; letter-spacing:1px; word-break:break-all;">
              ${value}
            </span>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

// Tarjeta que agrupa las credenciales, con su pastilla de titulo
function credentialsCard(badgeText, fieldsHtml, hint = '') {
  return `
<table width="100%" cellspacing="0" cellpadding="0" role="presentation" class="cred-box" style="background-color:#faf8f5; border:1px solid #e8e0d6; border-radius:12px; margin-bottom:16px;">
  <tr>
    <td class="cred-inner" style="padding:22px 22px 20px;">
      <p style="margin:0 0 18px 0; text-align:center;">
        <span style="display:inline-block; background-color:#8b6f4e; color:#ffffff; font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:1.6px; padding:5px 16px; border-radius:20px;">
          ${badgeText}
        </span>
      </p>
      ${fieldsHtml}
      ${hint ? `<p style="margin:14px 0 0 0; color:#a89c8c; font-size:11px; text-align:center; line-height:1.5;">${hint}</p>` : ''}
    </td>
  </tr>
</table>`;
}

// Caja de nota: 'warn' (dorado) u 'ok' (verde)
function noteBox(html, tone = 'warn') {
  const t = tone === 'ok'
    ? { cls: 'note-ok', bg: '#f0f8f0', border: '#c8e6c8', color: '#2e7d32' }
    : { cls: 'note-warn', bg: '#fef9ef', border: '#f5e6c4', color: '#8b6f4e' };
  return `
<table width="100%" cellspacing="0" cellpadding="0" role="presentation">
  <tr>
    <td class="${t.cls}" style="background-color:${t.bg}; border:1px solid ${t.border}; border-radius:8px; padding:13px 15px;">
      <p style="margin:0; color:${t.color}; font-size:12px; line-height:1.55;">
        ${html}
      </p>
    </td>
  </tr>
</table>`;
}

// Lista numerada de primeros pasos
function stepsList(title, steps) {
  const rows = steps.map((step, i) => `
    <tr>
      <td width="24" valign="top" style="padding:${i === 0 ? '0' : '10px'} 10px 0 0;">
        <table cellspacing="0" cellpadding="0" role="presentation">
          <tr>
            <td width="20" height="20" align="center" valign="middle" style="width:20px; height:20px; background-color:#8b6f4e; border-radius:10px; color:#ffffff; font-size:11px; font-weight:700; line-height:20px;">
              ${i + 1}
            </td>
          </tr>
        </table>
      </td>
      <td valign="top" style="padding:${i === 0 ? '2px' : '12px'} 0 0 0; color:#5a5248; font-size:12.5px; line-height:1.5;">
        ${step}
      </td>
    </tr>`).join('');

  return `
<table width="100%" cellspacing="0" cellpadding="0" role="presentation" class="steps-box" style="background-color:#ffffff; border:1px solid #ebe5dd; border-radius:10px; margin-top:16px;">
  <tr>
    <td class="steps-inner" style="padding:16px 18px;">
      <p style="margin:0 0 12px 0; color:#8b6f4e; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:1.4px;">
        ${title}
      </p>
      <table width="100%" cellspacing="0" cellpadding="0" role="presentation">
        ${rows}
      </table>
    </td>
  </tr>
</table>`;
}

// -- Endpoints --

router.post("/send-credentials", async (req, res) => {
  try {
    const usuarioData = req.body;
    console.log("Enviando credenciales por email a:", usuarioData.email);

    if (!usuarioData.email) {
      return res
        .status(400)
        .json({ error: "El correo electronico es requerido" });
    }

    const htmlContent = emailWrapper(
      `Bienvenido a EL REFUGIO, ${usuarioData.nombre}. Aqui estan tus credenciales de acceso.`,
      `
      ${emailHeader()}

      <tr>
        <td class="email-padding" style="padding:30px 30px 26px;">
          ${contentHeading(
            'Cuenta creada',
            `Bienvenido(a), ${usuarioData.nombre}`,
            `Tu acceso a la plataforma de EL REFUGIO ya esta listo con el rol de <strong style="color:#8b6f4e;">${usuarioData.rol}</strong>.`
          )}

          ${credentialsCard(
            'Credenciales de Acceso',
            credentialField('Usuario', usuarioData.username, icons.user) +
            credentialField('Contrasena Temporal', usuarioData.password, icons.lock, { last: true }),
            'Manten este correo a la mano hasta que cambies tu contrasena.'
          )}

          ${noteBox(
            `<img src="${icons.shield}" alt="" width="14" height="14" style="display:inline-block; vertical-align:middle; margin-right:5px;"><strong>Por tu seguridad:</strong> cambia tu contrasena temporal en tu primer inicio de sesion y no compartas estos datos con nadie.`
          )}

          ${ctaButton('Acceder a la Plataforma')}

          ${stepsList('Primeros pasos', [
            'Ingresa a la plataforma con el usuario y la contrasena temporal.',
            'Cambia tu contrasena por una personal y segura.',
            'Completa tu perfil y comienza a gestionar tus reservas.',
          ])}
        </td>
      </tr>

      ${emailFooter()}
      `
    );

    const response = await resend.emails.send({
      from: "EL REFUGIO <noreply@elrefugiocountryclub.com>",
      to: usuarioData.email,
      subject: "Bienvenido a EL REFUGIO - Tus credenciales de acceso",
      html: htmlContent,
    });

    console.log("Email enviado exitosamente:", response);
    res.json({ success: true, data: response });
  } catch (error) {
    console.error("Error al enviar email:", error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para enviar credenciales actualizadas
router.post("/send-updated-credentials", async (req, res) => {
  try {
    const { email, nombre, username, newPassword } = req.body;
    console.log("Enviando credenciales actualizadas por email a:", email);

    if (!email || !nombre || !username || !newPassword) {
      return res
        .status(400)
        .json({ error: "Todos los campos son requeridos (email, nombre, username, newPassword)" });
    }

    const htmlContent = emailWrapper(
      `Hola ${nombre}, tu contrasena ha sido actualizada exitosamente.`,
      `
      ${emailHeader()}

      <tr>
        <td class="email-padding" style="padding:30px 30px 26px;">
          ${contentHeading(
            'Seguridad de la cuenta',
            'Contrasena Actualizada',
            `Hola <strong style="color:#8b6f4e;">${nombre}</strong>, tu contrasena fue actualizada correctamente. Estas son tus credenciales vigentes.`
          )}

          ${credentialsCard(
            'Credenciales Actualizadas',
            credentialField('Usuario', username, icons.user) +
            credentialField('Nueva Contrasena', newPassword, icons.key, { last: true }),
            'Te recomendamos eliminar este correo despues de guardar tus datos.'
          )}

          ${noteBox(
            `<img src="${icons.checkCircle}" alt="" width="14" height="14" style="display:inline-block; vertical-align:middle; margin-right:5px;"><strong>Cambio confirmado.</strong> Si no solicitaste esta actualizacion, contacta a la administracion del club de inmediato.`,
            'ok'
          )}

          ${ctaButton('Acceder a la Plataforma')}
        </td>
      </tr>

      ${emailFooter()}
      `
    );

    const response = await resend.emails.send({
      from: "EL REFUGIO <noreply@elrefugiocountryclub.com>",
      to: email,
      subject: "Contrasena actualizada - EL REFUGIO",
      html: htmlContent,
    });

    console.log("Email de credenciales actualizadas enviado exitosamente:", response);
    res.json({ success: true, data: response });
  } catch (error) {
    console.error("Error al enviar email de credenciales actualizadas:", error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para confirmar reserva
router.post("/send-reservation-confirmation", async (req, res) => {
  try {
    const { email, nombre, fechaReserva, horaInicio, horaFin, instructor, tipoReserva, nivel } = req.body;
    console.log("Enviando confirmacion de reserva por email a:", email);

    if (!email || !nombre || !fechaReserva || !horaInicio || !horaFin) {
      return res
        .status(400)
        .json({ error: "Campos requeridos: email, nombre, fechaReserva, horaInicio, horaFin" });
    }

    const fechaFormateada = formatearFecha(fechaReserva);

    // Capitalizar nivel
    const nivelFormateado = nivel ? nivel.charAt(0).toUpperCase() + nivel.slice(1).toLowerCase() : null;

    const tipoReservaAmigable = tipoReserva === 'propietario' ? 'Propietario' :
                                tipoReserva === 'renta' ? 'Renta' :
                                tipoReserva === 'media_renta' ? 'Media Renta' :
                                'Clase Regular';

    const htmlContent = emailWrapper(
      `Hola ${nombre}, tu reserva para el ${fechaFormateada} ha sido confirmada.`,
      `
      ${emailHeader()}

      <tr>
        <td class="email-padding" style="padding:24px 28px 20px;">
          <!-- Badge confirmado -->
          <div style="text-align:center; margin-bottom:16px;">
            <span class="note-ok" style="display:inline-block; background-color:#e8f5e9; color:#2e7d32; font-size:12px; font-weight:700; padding:6px 18px; border-radius:20px; border:1px solid #c8e6c8;">
              <img src="${icons.checkCircle}" alt="" width="14" height="14" style="display:inline-block; vertical-align:middle; margin-right:4px;">Reserva Confirmada
            </span>
          </div>

          <p style="margin:0 0 20px 0; color:#666; font-size:14px; text-align:center; line-height:1.5;">
            Hola <strong style="color:#8b6f4e;">${nombre}</strong>, tu reserva ha sido confirmada.
          </p>

          <!-- Detalles -->
          <table width="100%" cellspacing="0" cellpadding="0" class="detail-bg" style="background-color:#faf8f5; border:1px solid #e8e0d6; border-radius:10px; margin-bottom:16px;" role="presentation">
            <tr>
              <td class="cred-inner" style="padding:16px 18px;">
                ${nivelFormateado ? detailRow('Nivel', nivelFormateado) : ''}
                ${tipoReserva ? detailRow('Tipo', tipoReservaAmigable) : ''}
                ${detailRow('Fecha', fechaFormateada)}
                ${detailRow('Horario', `${horaInicio} - ${horaFin}`, { borderBottom: !!instructor })}
                ${instructor ? detailRow('Instructor(a)', instructor, { borderBottom: false }) : ''}
              </td>
            </tr>
          </table>

          <!-- Nota cancelacion -->
          <table width="100%" cellspacing="0" cellpadding="0" role="presentation">
            <tr>
              <td class="note-warn" style="background-color:#fef9ef; border:1px solid #f5e6c4; border-radius:8px; padding:10px 14px;">
                <p style="margin:0; color:#8b6f4e; font-size:11px; line-height:1.5;">
                  <img src="${icons.alertTriangle}" alt="" width="14" height="14" style="display:inline-block; vertical-align:middle; margin-right:4px;"><strong>Cancelacion:</strong> Si necesitas cancelar, hazlo con al menos 2 horas de anticipacion.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      ${emailFooter()}
      `
    );

    const response = await resend.emails.send({
      from: "EL REFUGIO <noreply@elrefugiocountryclub.com>",
      to: email,
      subject: "Reserva Confirmada - EL REFUGIO",
      html: htmlContent,
    });

    console.log("Email de confirmacion de reserva enviado exitosamente:", response);
    res.json({ success: true, data: response });
  } catch (error) {
    console.error("Error al enviar email de confirmacion de reserva:", error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para cancelacion de reserva
router.post("/send-cancellation-notification", async (req, res) => {
  try {
    const { email, nombre, fechaReserva, horaInicio, horaFin, instructor, motivoCancelacion } = req.body;
    console.log("Enviando notificacion de cancelacion por email a:", email);

    if (!email || !nombre || !fechaReserva || !horaInicio || !horaFin) {
      return res
        .status(400)
        .json({ error: "Campos requeridos: email, nombre, fechaReserva, horaInicio, horaFin" });
    }

    const fechaFormateada = formatearFecha(fechaReserva);

    const htmlContent = emailWrapper(
      `Hola ${nombre}, tu reserva del ${fechaFormateada} ha sido cancelada.`,
      `
      ${emailHeader()}

      <tr>
        <td class="email-padding" style="padding:24px 28px 20px;">
          <!-- Badge cancelado -->
          <div style="text-align:center; margin-bottom:16px;">
            <span style="display:inline-block; background-color:#fdecea; color:#c0392b; font-size:12px; font-weight:700; padding:6px 18px; border-radius:20px; border:1px solid #f5c6cb;">
              <img src="${icons.xCircle}" alt="" width="14" height="14" style="display:inline-block; vertical-align:middle; margin-right:4px;">Reserva Cancelada
            </span>
          </div>

          <p style="margin:0 0 20px 0; color:#666; font-size:14px; text-align:center; line-height:1.5;">
            Hola <strong style="color:#8b6f4e;">${nombre}</strong>, tu reserva ha sido cancelada.
          </p>

          <!-- Detalles -->
          <table width="100%" cellspacing="0" cellpadding="0" class="detail-bg" style="background-color:#faf8f5; border:1px solid #e8e0d6; border-radius:10px; margin-bottom:16px;" role="presentation">
            <tr>
              <td class="cred-inner" style="padding:16px 18px;">
                ${detailRow('Fecha', fechaFormateada, { strike: true })}
                ${detailRow('Horario', `${horaInicio} - ${horaFin}`, { strike: true, borderBottom: !!(instructor || motivoCancelacion) })}
                ${instructor ? detailRow('Instructor(a)', instructor, { borderBottom: !!motivoCancelacion }) : ''}
                ${motivoCancelacion ? detailRow('Motivo', motivoCancelacion, { borderBottom: false }) : ''}
              </td>
            </tr>
          </table>

          <!-- Nota -->
          <table width="100%" cellspacing="0" cellpadding="0" role="presentation">
            <tr>
              <td class="note-warn" style="background-color:#fef9ef; border:1px solid #f5e6c4; border-radius:8px; padding:10px 14px;">
                <p style="margin:0; color:#8b6f4e; font-size:11px; line-height:1.5;">
                  Puedes hacer una nueva reserva desde la plataforma o contactarnos para reprogramar.
                </p>
              </td>
            </tr>
          </table>

          ${ctaButton('Hacer Nueva Reserva')}
        </td>
      </tr>

      ${emailFooter()}
      `
    );

    const response = await resend.emails.send({
      from: "EL REFUGIO <noreply@elrefugiocountryclub.com>",
      to: email,
      subject: "Reserva Cancelada - EL REFUGIO",
      html: htmlContent,
    });

    console.log("Email de cancelacion enviado exitosamente:", response);
    res.json({ success: true, data: response });
  } catch (error) {
    console.error("Error al enviar email de cancelacion:", error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para recordatorio de reserva (2 horas antes de la clase)
router.post("/send-reminder", async (req, res) => {
  try {
    const { email, nombre, fechaReserva, horaInicio, horaFin, instructor } = req.body;
    console.log("Enviando recordatorio de reserva por email a:", email);

    if (!email || !nombre || !fechaReserva || !horaInicio || !horaFin) {
      return res
        .status(400)
        .json({ error: "Campos requeridos: email, nombre, fechaReserva, horaInicio, horaFin" });
    }

    const fechaFormateada = formatearFecha(fechaReserva);

    const htmlContent = emailWrapper(
      `Hola ${nombre}, te recordamos tu clase de hoy a las ${horaInicio}.`,
      `
      ${emailHeader()}

      <tr>
        <td class="email-padding" style="padding:24px 28px 20px;">
          <div style="text-align:center; margin-bottom:16px;">
            <span style="display:inline-block; background-color:#fef9ef; color:#8b6f4e; font-size:12px; font-weight:700; padding:6px 18px; border-radius:20px; border:1px solid #f5e6c4;">
              <img src="${icons.clock}" alt="" width="14" height="14" style="display:inline-block; vertical-align:middle; margin-right:4px;">Recordatorio de Clase
            </span>
          </div>

          <p style="margin:0 0 20px 0; color:#666; font-size:14px; text-align:center; line-height:1.5;">
            Hola <strong style="color:#8b6f4e;">${nombre}</strong>, tu clase comienza en aproximadamente <strong>2 horas</strong>. Por favor confirma tu asistencia.
          </p>

          <table width="100%" cellspacing="0" cellpadding="0" class="detail-bg" style="background-color:#faf8f5; border:1px solid #e8e0d6; border-radius:10px; margin-bottom:16px;" role="presentation">
            <tr>
              <td class="cred-inner" style="padding:16px 18px;">
                ${detailRow('Fecha', fechaFormateada)}
                ${detailRow('Horario', `${horaInicio} - ${horaFin}`, { borderBottom: !!instructor })}
                ${instructor ? detailRow('Instructor(a)', instructor, { borderBottom: false }) : ''}
              </td>
            </tr>
          </table>

          <table width="100%" cellspacing="0" cellpadding="0" role="presentation">
            <tr>
              <td class="note-warn" style="background-color:#fef9ef; border:1px solid #f5e6c4; border-radius:8px; padding:10px 14px;">
                <p style="margin:0; color:#8b6f4e; font-size:11px; line-height:1.5;">
                  <img src="${icons.alertTriangle}" alt="" width="14" height="14" style="display:inline-block; vertical-align:middle; margin-right:4px;"><strong>Importante:</strong> Si no puedes asistir, cancela desde la plataforma para liberar tu espacio.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      ${emailFooter()}
      `
    );

    const response = await resend.emails.send({
      from: "EL REFUGIO <noreply@elrefugiocountryclub.com>",
      to: email,
      subject: "Recordatorio de tu clase - EL REFUGIO",
      html: htmlContent,
    });

    console.log("Email de recordatorio enviado exitosamente:", response);
    res.json({ success: true, data: response });
  } catch (error) {
    console.error("Error al enviar email de recordatorio:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
