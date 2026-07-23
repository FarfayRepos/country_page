# VPS — Acceso y Despliegue

Servidor: `212.227.238.213`  
Usuario: `root`  
Proyecto: `/root/country_page/`

---

## Entrar al VPS

```bash
ssh root@212.227.238.213
```

Te pide la contraseña de root. Una vez dentro:

```bash
ls          # verás country_page entre otras carpetas
cd country_page
ls          # Backend/  country_app/  node_modules/  ...
```

---

## Traer los últimos cambios (git pull)

Antes de compilar, hay que bajar el código actualizado desde el repositorio. Esto se hace desde la raíz del proyecto.

```bash
cd /root/country_page

# Ver en qué rama estás y si hay cambios locales
git status

# Bajar los últimos cambios de la rama de trabajo
git pull origin Modificaciones-back
```

**Si `git pull` da error por cambios locales en el VPS** (archivos modificados a mano), descártalos primero — normalmente en el servidor no debería haber cambios propios:

```bash
git checkout -- .   # descarta cambios en archivos ya versionados
git pull origin Modificaciones-back
```

Después de hacer `git pull`, continúa con el build del frontend o el reinicio del backend según lo que haya cambiado.

---

## Actualizar el Frontend

El frontend es una app Vite/React. Al hacer build se genera la carpeta `dist/` que Nginx sirve directamente.

```bash
cd /root/country_page/country_app

# Instalar dependencias si agregaste paquetes nuevos (opcional)
npm install

# Compilar
npm run build
```

Cuando termine verás la carpeta `dist/` actualizada. **No hay que reiniciar nada** — Nginx sirve los archivos estáticos automáticamente.

---

## Actualizar el Backend

El backend corre con PM2. PM2 está instalado vía nvm, así que hay que usar el path completo o cargarlo primero.

### Opción A — cargar nvm primero (recomendado)

```bash
source ~/.nvm/nvm.sh
cd /root/country_page/Backend

# Si agregaste dependencias nuevas
npm install

# Reiniciar todos los procesos PM2
pm2 restart all

# O recargar sin downtime
pm2 reload all
```

### Opción B — usar el path completo sin cargar nvm

```bash
/root/.nvm/versions/node/v24.11.1/bin/pm2 restart all
```

### Ver el estado de los procesos

```bash
pm2 list          # tabla de procesos activos
pm2 logs          # logs en tiempo real (Ctrl+C para salir)
pm2 logs --lines 50   # últimas 50 líneas de logs
```

---

## Actualizar Frontend + Backend juntos

```bash
source ~/.nvm/nvm.sh

# Frontend
cd /root/country_page/country_app
npm install       # solo si hay dependencias nuevas
npm run build

# Backend
cd /root/country_page/Backend
npm install       # solo si hay dependencias nuevas
pm2 restart all
```

---

## Estructura del proyecto en el VPS

```
/root/
└── country_page/
    ├── Backend/
    │   ├── server/
    │   │   └── index.js        ← entrada del servidor Node
    │   ├── routes/             ← todos los endpoints
    │   └── migrations/
    ├── country_app/
    │   ├── src/                ← código fuente React
    │   └── dist/               ← build compilado (lo que ve Nginx)
    └── package.json
```

---

## Notas

- **Nginx** sirve el `dist/` del frontend y hace proxy al backend en el puerto que levanta PM2.
- **PM2** mantiene el backend corriendo aunque se cierre la sesión SSH.
- Si PM2 no reconoce el comando `pm2`, siempre ejecuta `source ~/.nvm/nvm.sh` primero.
- Las migraciones SQL hay que aplicarlas manualmente en la base de datos (`212.227.238.213`, DB: `country_refugiodb`) — ver `docs/database.md`.
