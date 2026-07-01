// Métricas y gráficas de caballos para el dashboard (admin e instructores).
import express from 'express';
import db from '../server/db.js';

const router = express.Router();

// GET /api/metricas/caballos?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
// Devuelve conteos de estado y series para las gráficas. El rango de fechas
// aplica sólo a las gráficas basadas en reservas (frecuencia y por clase).
router.get('/caballos', async (req, res) => {
  try {
    const { desde, hasta } = req.query;

    // --- Conteos de estado (no dependen del rango) ---
    const [[conteos]] = await db.query(`
      SELECT
        SUM(disponibilidad = 'disponible')        AS disponibles,
        SUM(disponibilidad = 'no_disponible')     AS no_disponibles,
        SUM(estatus = 'renta')                    AS en_renta,
        SUM(estatus = 'media_renta')              AS media_renta,
        SUM(propietario_id IS NOT NULL)           AS con_propietario,
        SUM(estatus = 'publico')                  AS publicos,
        SUM(estatus = 'privado')                  AS privados,
        SUM(disponibilidad = 'no_disponible')     AS no_disponibles_clases,
        COUNT(*)                                  AS total
      FROM caballos
    `);

    // --- Filtro de fechas para las gráficas ---
    const condFechas = [];
    const params = [];
    if (desde) { condFechas.push('r.fecha >= ?'); params.push(desde); }
    if (hasta) { condFechas.push('r.fecha <= ?'); params.push(hasta); }
    const whereFechas = condFechas.length ? `AND ${condFechas.join(' AND ')}` : '';

    // Gráfica 1: caballos que salen con frecuencia (total de salidas por caballo)
    const [frecuencia] = await db.query(`
      SELECT c.id, c.nombre, COUNT(r.id) AS salidas
      FROM caballos c
      LEFT JOIN reservas r ON r.caballo_id = c.id
        AND r.estatus IN ('confirmada','completada') ${whereFechas}
      GROUP BY c.id, c.nombre
      ORDER BY salidas DESC
    `, params);

    // Gráfica 2: caballos que salen más por clase (salidas por caballo + clase)
    const [porClase] = await db.query(`
      SELECT c.id AS caballo_id, c.nombre AS caballo, cl.nombre AS clase,
             COUNT(r.id) AS salidas
      FROM reservas r
      JOIN caballos c ON c.id = r.caballo_id
      JOIN clases cl ON cl.id = r.clase_id
      WHERE r.estatus IN ('confirmada','completada') ${whereFechas}
      GROUP BY c.id, c.nombre, cl.nombre
      ORDER BY salidas DESC
    `, params);

    // Gráfica 3: caballos con propietario
    const [conPropietario] = await db.query(`
      SELECT c.id, c.nombre,
             CONCAT(u.nombre, ' ', u.apellido) AS propietario
      FROM caballos c
      JOIN usuarios u ON u.id = c.propietario_id
      ORDER BY c.nombre ASC
    `);

    res.json({
      conteos: {
        disponibles: Number(conteos.disponibles) || 0,
        no_disponibles: Number(conteos.no_disponibles) || 0,
        en_renta: Number(conteos.en_renta) || 0,
        media_renta: Number(conteos.media_renta) || 0,
        con_propietario: Number(conteos.con_propietario) || 0,
        publicos: Number(conteos.publicos) || 0,
        privados: Number(conteos.privados) || 0,
        no_disponibles_clases: Number(conteos.no_disponibles_clases) || 0,
        total: Number(conteos.total) || 0
      },
      graficas: {
        frecuencia,
        por_clase: porClase,
        con_propietario: conPropietario
      },
      rango: { desde: desde || null, hasta: hasta || null }
    });
  } catch (err) {
    console.error('Error obteniendo métricas de caballos:', err);
    res.status(500).json({ error: 'Error obteniendo métricas de caballos' });
  }
});

// GET /api/metricas/inicio
// Resumen para el panel de inicio del administrador: reservas de los últimos
// 7 días, clases por instructora del mes en curso, tendencia de reservas de los
// últimos 6 meses, ranking de caballos más utilizados y disponibilidad actual.
router.get('/inicio', async (req, res) => {
  try {
    const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    // --- Reservas de los últimos 7 días (incluye hoy) ---
    const [reservasDias] = await db.query(`
      SELECT DATE(r.fecha) AS dia, COUNT(*) AS total
      FROM reservas r
      WHERE r.estatus <> 'cancelada'
        AND r.fecha >= CURDATE() - INTERVAL 6 DAY
        AND r.fecha <= CURDATE()
      GROUP BY DATE(r.fecha)
    `);
    const reservasMap = new Map(
      reservasDias.map(row => [new Date(row.dia).toDateString(), Number(row.total)])
    );
    const hoy = new Date();
    const reservas_semana = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(hoy);
      d.setDate(hoy.getDate() - i);
      reservas_semana.push({
        dia: DIAS[d.getDay()],
        total: reservasMap.get(d.toDateString()) || 0,
      });
    }

    // --- Clases impartidas por instructora en el mes en curso ---
    const [instructoras] = await db.query(`
      SELECT CONCAT(i.nombre, ' ', i.apellido) AS nombre, COUNT(r.id) AS total
      FROM instructoras i
      JOIN reservas r ON r.instructora_id = i.id
        AND r.estatus IN ('confirmada', 'completada')
        AND YEAR(r.fecha) = YEAR(CURDATE())
        AND MONTH(r.fecha) = MONTH(CURDATE())
      GROUP BY i.id, i.nombre, i.apellido
      ORDER BY total DESC
    `);

    // --- Tendencia de reservas de los últimos 6 meses ---
    const [tendenciaRows] = await db.query(`
      SELECT YEAR(r.fecha) AS anio, MONTH(r.fecha) AS mes, COUNT(*) AS total
      FROM reservas r
      WHERE r.estatus IN ('confirmada', 'completada')
        AND r.fecha >= DATE_FORMAT(CURDATE() - INTERVAL 5 MONTH, '%Y-%m-01')
      GROUP BY YEAR(r.fecha), MONTH(r.fecha)
    `);
    const tendenciaMap = new Map(
      tendenciaRows.map(row => [`${row.anio}-${row.mes}`, Number(row.total)])
    );
    const tendencia = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      tendencia.push({
        mes: MESES[d.getMonth()],
        total: tendenciaMap.get(`${d.getFullYear()}-${d.getMonth() + 1}`) || 0,
      });
    }

    // --- Ranking de caballos más utilizados ---
    const [caballos_ranking] = await db.query(`
      SELECT c.nombre, COUNT(r.id) AS salidas
      FROM caballos c
      LEFT JOIN reservas r ON r.caballo_id = c.id
        AND r.estatus IN ('confirmada', 'completada')
      GROUP BY c.id, c.nombre
      ORDER BY salidas DESC
      LIMIT 8
    `);

    // --- Disponibilidad actual de caballos ---
    const [[disp]] = await db.query(`
      SELECT
        SUM(disponibilidad = 'disponible') AS disponibles,
        COUNT(*)                           AS total
      FROM caballos
    `);

    res.json({
      reservas_semana,
      instructoras: instructoras.map(i => ({ nombre: i.nombre, total: Number(i.total) })),
      tendencia,
      caballos_ranking: caballos_ranking.map(c => ({ nombre: c.nombre, salidas: Number(c.salidas) })),
      disponibilidad: {
        disponibles: Number(disp.disponibles) || 0,
        total: Number(disp.total) || 0,
      },
    });
  } catch (err) {
    console.error('Error obteniendo métricas de inicio:', err);
    res.status(500).json({ error: 'Error obteniendo métricas de inicio' });
  }
});

// GET /api/metricas/caballos-avanzado?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
// Métricas avanzadas para la toma de decisiones logísticas (Fase 1):
// uso real del plantel, cobertura de datos, oferta vs demanda por nivel,
// caballos inactivos y conteos de estado. El rango por defecto son los
// últimos 60 días e impacta el uso, la cobertura y la demanda.
const NIVELES = [
  { nivel: 'Iniciación', clase: 'iniciacion', apt: "especialidad LIKE '%iniciacion%' OR especialidad LIKE '%mixto%'" },
  { nivel: 'Intermedio', clase: 'intermedio', apt: "especialidad LIKE '%intermedio%' OR especialidad LIKE '%mixto%'" },
  { nivel: 'Avanzado',   clase: 'avanzado',   apt: "especialidad LIKE '%avanzado%'" },
  { nivel: 'Ponyclub',   clase: 'pony',       apt: "nombre LIKE '%pony%'" },
];

router.get('/caballos-avanzado', async (req, res) => {
  try {
    const desde = req.query.desde || null;
    const hasta = req.query.hasta || null;
    // Filtro opcional por instructora: acota las métricas basadas en reservas
    // (uso, cobertura, demanda, tendencia, mapa de calor). El plantel es global.
    const instructoraId = req.query.instructora_id || null;
    const filtroInst = instructoraId ? ' AND r.instructora_id = ?' : '';
    // Rango efectivo (con valores por defecto resueltos en SQL).
    const RANGO = 'COALESCE(?, CURDATE() - INTERVAL 60 DAY) AND COALESCE(?, CURDATE())';
    const rangoBase = [desde, hasta];
    const rangoParams = instructoraId ? [desde, hasta, instructoraId] : [desde, hasta];

    const [[rango]] = await db.query(
      `SELECT COALESCE(?, CURDATE() - INTERVAL 60 DAY) AS desde, COALESCE(?, CURDATE()) AS hasta`,
      rangoBase
    );

    // --- Conteos de estado del plantel ---
    const [[conteos]] = await db.query(`
      SELECT
        SUM(disponibilidad = 'disponible')    AS disponibles,
        SUM(disponibilidad = 'no_disponible') AS no_disponibles,
        SUM(estatus = 'publico')              AS publicos,
        SUM(estatus = 'privado')              AS privados,
        SUM(estatus = 'renta')                AS en_renta,
        SUM(estatus = 'media_renta')          AS media_renta,
        SUM(propietario_id IS NOT NULL)       AS con_propietario,
        COUNT(*)                              AS total
      FROM caballos
    `);

    // --- Uso por caballo en el rango (salidas confirmadas/completadas) ---
    const [usoRows] = await db.query(`
      SELECT c.id, c.nombre, c.estatus, c.disponibilidad,
             COUNT(r.id) AS salidas
      FROM caballos c
      LEFT JOIN reservas r ON r.caballo_id = c.id
        AND r.estatus IN ('confirmada','completada')
        AND r.fecha BETWEEN ${RANGO}${filtroInst}
      GROUP BY c.id, c.nombre, c.estatus, c.disponibilidad
      ORDER BY salidas DESC, c.nombre ASC
    `, rangoParams);

    const conSalidas = usoRows.filter(c => Number(c.salidas) > 0);
    const sinSalidas = usoRows.filter(c => Number(c.salidas) === 0);

    // --- Cobertura de datos: % de reservas con caballo asignado ---
    const [[cob]] = await db.query(`
      SELECT COUNT(*) AS total, SUM(caballo_id IS NOT NULL) AS con_caballo
      FROM reservas r
      WHERE r.estatus IN ('confirmada','completada')
        AND r.fecha BETWEEN ${RANGO}${filtroInst}
    `, rangoParams);
    const reservasTotal = Number(cob.total) || 0;
    const reservasConCaballo = Number(cob.con_caballo) || 0;

    // --- Oferta vs demanda por nivel ---
    const oferta_demanda = [];
    for (const n of NIVELES) {
      const [[d]] = await db.query(`
        SELECT COUNT(*) AS demanda
        FROM reservas r JOIN clases cl ON cl.id = r.clase_id
        WHERE r.estatus IN ('confirmada','completada')
          AND r.fecha BETWEEN ${RANGO}${filtroInst}
          AND cl.nombre LIKE ?
      `, [...rangoParams, `%${n.clase}%`]);
      const [[a]] = await db.query(`
        SELECT COUNT(*) AS aptos FROM caballos
        WHERE disponibilidad = 'disponible' AND (${n.apt})
      `);
      const demanda = Number(d.demanda) || 0;
      const aptos = Number(a.aptos) || 0;
      oferta_demanda.push({
        nivel: n.nivel,
        demanda,
        aptos,
        ratio: aptos > 0 ? Math.round((demanda / aptos) * 10) / 10 : null,
      });
    }

    // --- Tendencia de actividad por semana (reservas confirmadas/completadas) ---
    const [tendenciaRows] = await db.query(`
      SELECT DATE(r.fecha - INTERVAL WEEKDAY(r.fecha) DAY) AS semana, COUNT(*) AS total
      FROM reservas r
      WHERE r.estatus IN ('confirmada','completada')
        AND r.fecha BETWEEN ${RANGO}${filtroInst}
      GROUP BY semana
      ORDER BY semana ASC
    `, rangoParams);

    // --- Mapa de calor: reservas por día de la semana y hora ---
    const [heatRows] = await db.query(`
      SELECT DAYOFWEEK(r.fecha) AS dow, HOUR(r.hora_inicio) AS hora, COUNT(*) AS total
      FROM reservas r
      WHERE r.estatus IN ('confirmada','completada')
        AND r.hora_inicio IS NOT NULL
        AND r.fecha BETWEEN ${RANGO}${filtroInst}
      GROUP BY dow, hora
    `, rangoParams);

    res.json({
      rango: { desde: rango.desde, hasta: rango.hasta },
      conteos: {
        total: Number(conteos.total) || 0,
        disponibles: Number(conteos.disponibles) || 0,
        no_disponibles: Number(conteos.no_disponibles) || 0,
        publicos: Number(conteos.publicos) || 0,
        privados: Number(conteos.privados) || 0,
        en_renta: Number(conteos.en_renta) || 0,
        media_renta: Number(conteos.media_renta) || 0,
        con_propietario: Number(conteos.con_propietario) || 0,
      },
      uso: {
        activos: conSalidas.length,
        inactivos: sinSalidas.length,
        reservas_total: reservasTotal,
        reservas_con_caballo: reservasConCaballo,
        cobertura_pct: reservasTotal > 0 ? Math.round((reservasConCaballo / reservasTotal) * 100) : 0,
        carga: conSalidas.map(c => ({ id: c.id, nombre: c.nombre, salidas: Number(c.salidas) })),
        inactivos_lista: sinSalidas.map(c => ({ id: c.id, nombre: c.nombre, estatus: c.estatus, disponibilidad: c.disponibilidad })),
      },
      oferta_demanda,
      tendencia: tendenciaRows.map(t => ({ semana: t.semana, total: Number(t.total) })),
      heatmap: heatRows.map(h => ({ dow: Number(h.dow), hora: Number(h.hora), total: Number(h.total) })),
    });
  } catch (err) {
    console.error('Error obteniendo métricas avanzadas de caballos:', err);
    res.status(500).json({ error: 'Error obteniendo métricas avanzadas de caballos' });
  }
});

// Helpers de fecha (formato YYYY-MM-DD) para el análisis comparativo.
const ymd = (d) => (d instanceof Date ? d : new Date(d)).toISOString().slice(0, 10);
const addDays = (s, n) => { const dt = new Date(s + 'T00:00:00Z'); dt.setUTCDate(dt.getUTCDate() + n); return dt.toISOString().slice(0, 10); };
const diffDays = (a, b) => Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 86400000);
const deltaPct = (cur, prev) => (prev > 0 ? Math.round(((cur - prev) / prev) * 100) : (cur > 0 ? 100 : 0));

// GET /api/metricas/inicio-analisis?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
// Vista de análisis del panel de inicio: reservas, cancelación, actividad,
// demanda por nivel, carga por instructora y estado de caballos, todo con
// comparación automática contra el periodo anterior equivalente.
// (Lo de clientes/pagos lo aporta el frontend desde sus props.)
router.get('/inicio-analisis', async (req, res) => {
  try {
    // Resolver rango efectivo (default: mes en curso hasta hoy).
    const [[hoyRow]] = await db.query(`SELECT CURDATE() AS hoy, DATE_FORMAT(CURDATE(), '%Y-%m-01') AS ini_mes`);
    const hasta = req.query.hasta || ymd(hoyRow.hoy);
    const desde = req.query.desde || ymd(hoyRow.ini_mes);
    const dias = diffDays(desde, hasta) + 1;
    const aHasta = addDays(desde, -1);
    const aDesde = addDays(aHasta, -(dias - 1));

    // KPIs escalares de reservas para un rango dado.
    const kpisRango = async (d, h) => {
      const [[r]] = await db.query(`
        SELECT
          SUM(estatus <> 'cancelada')                                        AS reservas,
          SUM(estatus = 'cancelada')                                         AS canceladas,
          COUNT(*)                                                           AS total_all,
          COUNT(DISTINCT CASE WHEN estatus <> 'cancelada' THEN cliente_id END) AS clientes
        FROM reservas WHERE fecha BETWEEN ? AND ?
      `, [d, h]);
      const total = Number(r.total_all) || 0;
      return {
        reservas: Number(r.reservas) || 0,
        canceladas: Number(r.canceladas) || 0,
        clientes: Number(r.clientes) || 0,
        cancelacion_pct: total > 0 ? Math.round((Number(r.canceladas) / total) * 100) : 0,
      };
    };
    const cur = await kpisRango(desde, hasta);
    const prev = await kpisRango(aDesde, aHasta);

    // Tendencia diaria de reservas (rellenando días sin actividad).
    const [tendRows] = await db.query(`
      SELECT DATE(fecha) AS dia, COUNT(*) AS total
      FROM reservas WHERE estatus <> 'cancelada' AND fecha BETWEEN ? AND ?
      GROUP BY dia
    `, [desde, hasta]);
    const tendMap = new Map(tendRows.map(r => [ymd(r.dia), Number(r.total)]));
    const tendencia = [];
    for (let i = 0; i < dias; i++) {
      const d = addDays(desde, i);
      tendencia.push({ dia: d, total: tendMap.get(d) || 0 });
    }

    // Reservas por estatus.
    const [estatusRows] = await db.query(`
      SELECT estatus, COUNT(*) AS total FROM reservas
      WHERE fecha BETWEEN ? AND ? GROUP BY estatus
    `, [desde, hasta]);

    // Mapa de calor día × hora.
    const [heatRows] = await db.query(`
      SELECT DAYOFWEEK(fecha) AS dow, HOUR(hora_inicio) AS hora, COUNT(*) AS total
      FROM reservas
      WHERE estatus <> 'cancelada' AND hora_inicio IS NOT NULL AND fecha BETWEEN ? AND ?
      GROUP BY dow, hora
    `, [desde, hasta]);

    // Clases por instructora (ranking).
    const [instRows] = await db.query(`
      SELECT CONCAT(i.nombre, ' ', i.apellido) AS nombre, COUNT(r.id) AS total
      FROM instructoras i
      JOIN reservas r ON r.instructora_id = i.id
        AND r.estatus IN ('confirmada','completada') AND r.fecha BETWEEN ? AND ?
      GROUP BY i.id, i.nombre, i.apellido
      ORDER BY total DESC LIMIT 8
    `, [desde, hasta]);

    // Demanda por nivel (reservas por clase).
    const demanda_nivel = [];
    for (const n of NIVELES) {
      const [[d]] = await db.query(`
        SELECT COUNT(*) AS demanda
        FROM reservas r JOIN clases cl ON cl.id = r.clase_id
        WHERE r.estatus IN ('confirmada','completada') AND r.fecha BETWEEN ? AND ? AND cl.nombre LIKE ?
      `, [desde, hasta, `%${n.clase}%`]);
      demanda_nivel.push({ nivel: n.nivel, demanda: Number(d.demanda) || 0 });
    }

    // Estado de caballos (snapshot) y alertas operativas.
    const [[cab]] = await db.query(`
      SELECT SUM(disponibilidad = 'disponible') AS disponibles, COUNT(*) AS total FROM caballos
    `);
    const [[ops]] = await db.query(`
      SELECT COUNT(*) AS sin_instructora FROM reservas
      WHERE estatus <> 'cancelada' AND fecha BETWEEN ? AND ? AND instructora_id IS NULL
    `, [desde, hasta]);

    res.json({
      rango: { desde, hasta, dias },
      anterior: { desde: aDesde, hasta: aHasta },
      kpis: {
        reservas: cur.reservas,
        reservas_delta_pct: deltaPct(cur.reservas, prev.reservas),
        cancelacion_pct: cur.cancelacion_pct,
        cancelacion_delta_pts: cur.cancelacion_pct - prev.cancelacion_pct,
        clientes_con_reserva: cur.clientes,
        clientes_con_reserva_delta_pct: deltaPct(cur.clientes, prev.clientes),
      },
      tendencia,
      reservas_estatus: estatusRows.map(r => ({ estatus: r.estatus, total: Number(r.total) })),
      heatmap: heatRows.map(h => ({ dow: Number(h.dow), hora: Number(h.hora), total: Number(h.total) })),
      clases_instructora: instRows.map(r => ({ nombre: r.nombre, total: Number(r.total) })),
      demanda_nivel,
      caballos: { disponibles: Number(cab.disponibles) || 0, total: Number(cab.total) || 0 },
      operativas: { clases_sin_instructora: Number(ops.sin_instructora) || 0 },
    });
  } catch (err) {
    console.error('Error obteniendo análisis de inicio:', err);
    res.status(500).json({ error: 'Error obteniendo análisis de inicio' });
  }
});

export default router;
