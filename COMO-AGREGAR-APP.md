# Cómo agregar una app a la landing

> Workflow real usado con **App de Reseñas Vendedores** (2026-09-24).
> Repetir igual para la **App de Clientes** y cualquier PWA futura.
> La landing **no tiene docs propios**: este archivo es la fuente.

---

## Arquitectura de serving (no confundir)

| URL | Qué sirve |
|---|---|
| `https://quantumhive.com.ar/` (apex y `www`) | **Worker** `pagina-web-landing-quantumhive` (static assets, `wrangler deploy`) |
| `https://pagina-web-landing-quantumhive.pages.dev/` | Proyecto Pages homónimo (existe, **no** es el apex) |
| `https://quantumhive.com.ar/vendedores/` | Subcarpeta dentro del Worker/Pages de la landing |
| `https://vendedores.quantumhive.com.ar` | **Pages propio** de la app (`app-resenas-vendedores`) |
| `https://app-resenas-vendedores.pages.dev` | Idem, dominio por defecto |

**Apex ≠ Pages de la landing.** Si sólo haces `wrangler pages deploy`, el dominio principal no se actualiza. Hay que hacer **ambos**:

```bash
# 1) Worker (apex + www) — desde la carpeta de la landing
npx wrangler deploy

# 2) Pages de la landing (backup / pages.dev)
npx wrangler pages deploy . --project-name=pagina-web-landing-quantumhive
```

---

## 0. Requisitos

- Node + `npx wrangler` (OAuth con `pages:write` y `zone:read`)
- App Vite que compile a `dist/`
- Si la app usa Supabase Auth: actualizar `site_url` y `uri_allow_list`

---

## 1. La app debe construir con rutas RELATIVAS

Si la app vive en `https://quantumhive.com.ar/<subcarpeta>/`, los assets absolutos (`/assets/...`) resuelven a la raíz de la landing y la pantalla queda **blanca**.

Checklist en el repo de la app:

| Archivo | Cambio |
|---|---|
| `vite.config.ts` | `base: './'` |
| `index.html` (raíz) | `href="./manifest.webmanifest"`, `href="./icon.svg"`, etc. |
| `public/manifest.webmanifest` | `id`, `start_url`, `scope` → `"./"`; icons → `"./icon.svg"` |
| `public/sw.js` | `STATIC_ASSETS` → `'./'`, `'./index.html'`, `'./manifest.webmanifest'`, `'./icon.svg'` |
| `src/main.tsx` | `navigator.serviceWorker.register('./sw.js')` |

Build y verificar que `dist/index.html` tenga `src="./assets/..."` (con punto, sin barra inicial).

```bash
npm run build
```

---

## 2. Deploy de la app como Pages propio (opcional pero recomendado)

En la raíz del repo de la app:

```jsonc
// wrangler.jsonc
{
  "name": "app-resenas-vendedores",          // nombre del proyecto Pages
  "compatibility_date": "2026-09-18",
  "pages_build_output_dir": "./dist",
  "not_found_handling": "single-page-application"
}
```

```bash
# Primera vez: crear proyecto y deployar
npx wrangler pages deploy dist --project-name=app-resenas-vendedores

# Actualizaciones
npx wrangler pages deploy dist --project-name=app-resenas-vendedores
```

Dominio custom (ej. `vendedores.quantumhive.com.ar`):

```bash
npx wrangler pages project list   # verificar que el dominio figure
```

En dashboard Cloudflare → Pages → proyecto → Custom domains → Add.
CNAME: `vendedores` → `app-resenas-vendedores.pages.dev` (proxied).
La validación puede tardar minutos; el estado en `wrangler pages project list` pasa a activo cuando termina.

---

## 3. Copiar el `dist` dentro de la landing

```powershell
# Desde la app
$app = "C:\Users\sergio\Desktop\QUANTUMHIVE FEDERADO\APP DE RESEÑAS VENDEDORES"
$landing = "C:\Users\sergio\Desktop\QUANTUMHIVE FEDERADO\pagina-web-landing-quantumhive"

# Para clientes, el destino sería: $landing\clientes\
Remove-Item -Recurse -Force "$landing\vendedores" -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path "$landing\vendedores" | Out-Null
Copy-Item -Recurse "$app\dist\*" "$landing\vendedores\"
```

Estructura esperada en la landing:

```
pagina-web-landing-quantumhive/
  vendedores/
    index.html
    assets/
      index-XXXX.js
      index-XXXX.css
    manifest.webmanifest
    sw.js
    icon.svg
    ...
```

**Ojo:** copiar `dist/*`, no `dist` dentro de la subcarpeta (no `vendedores/dist/`).

---

## 4. Link de navegación en la landing

`pagina-web-landing-quantumhive/index.html`, dentro de `<nav class="topnav">`:

```html
<a href="./vendedores/" class="nav-module" data-i18n="nav_vendedores">App Vendedores</a>
```

Siempre **relativo** (`./vendedores/`, no `/vendedores/`).

---

## 5. i18n en `script.js`

En `translations.es` (~línea 496):

```js
nav_vendedores: 'App Vendedores',
```

En `translations.en` (~línea 529):

```js
nav_vendedores: 'Sellers App',
```

Para App de Clientes: claves `nav_clientes` (es/en) + link `./clientes/`.

---

## 6. Redesplegar landing (Worker + Pages)

```powershell
Set-Location "C:\Users\sergio\Desktop\QUANTUMHIVE FEDERADO\pagina-web-landing-quantumhive"
npx wrangler deploy
npx wrangler pages deploy . --project-name=pagina-web-landing-quantumhive
```

Sin esto, el apex sigue sirviendo el HTML viejo.

---

## 7. Supabase Auth (si la app usa login)

Dashboard → Authentication → URL Configuration:

- **Site URL**: la URL principal de la app (ej. `https://vendedores.quantumhive.com.ar` o la de clientes)
- **Redirect URLs / allow list**: agregar todos los orígenes donde corre la app:

```
https://vendedores.quantumhive.com.ar/**
https://app-resenas-vendedores.pages.dev/**
https://pagina-web-landing-quantumhive.pages.dev/vendedores/**
http://localhost:5173/**
```

Para App de Clientes, agregar análogos `clientes.quantumhive.com.ar`, `app-*-clientes.pages.dev`, `/clientes/**`, etc.

Verificar login por API (no sólo UI):

```powershell
# login debe devolver access_token; 4xx = config o password mal
```

---

## 8. Verificación real (no declarar operativo sin esto)

```powershell
# HTML de la subcarpeta en el apex
Invoke-WebRequest "https://quantumhive.com.ar/vendedores/" -UseBasicParsing

# Primer asset del HTML debe ser 200 y application/javascript
# (extraer src= del HTML; si es /assets/... absoluto → build mal, volver al paso 1)

# Manifest, icon, sw
Invoke-WebRequest "https://quantumhive.com.ar/vendedores/manifest.webmanifest" -UseBasicParsing
Invoke-WebRequest "https://quantumhive.com.ar/vendedores/sw.js" -UseBasicParsing

# Dominio propio de la app
Invoke-WebRequest "https://vendedores.quantumhive.com.ar/" -UseBasicParsing

# Nav en el apex
(Invoke-WebRequest "https://quantumhive.com.ar/" -UseBasicParsing).Content -match "vendedores/"
```

Hard refresh en el navegador: **Ctrl+Shift+R** (no se puede purgar cache con el OAuth actual: 401).

---

## Trampas que ya costaron tiempo

1. **Pantalla blanca en `/subcarpeta/`** → assets absolutos. Fix: `base: './'` + rutas relativas en index/manifest/sw.
2. **Apex no cambia** → sólo se hizo Pages deploy. Fix: también `npx wrangler deploy` (Worker).
3. **Login falla en dominio nuevo** → `uri_allow_list` de Supabase sin ese host.
4. **Copiar mal el dist** → `vendedores/dist/` en vez de `vendedores/` con el contenido adentro.
5. **Declarar operativo sin probar** → siempre verificar HTTP 200 + content-type + login real.

---

## Checklist App de Clientes (mismo flujo, otro nombre)

- [ ] Repo/app con `base: './'` y rutas relativas
- [ ] `npm run build` → `dist/`
- [ ] `wrangler.jsonc` con nombre de proyecto Pages de clientes
- [ ] `npx wrangler pages deploy dist --project-name=<app-clientes>`
- [ ] Copiar `dist/*` → `pagina-web-landing-quantumhive\clientes\`
- [ ] Nav: `./clientes/` + `data-i18n="nav_clientes"`
- [ ] i18n es/en en `script.js`
- [ ] `wrangler deploy` + `wrangler pages deploy .` en la landing
- [ ] Supabase: site_url + allow list con hosts de clientes
- [ ] Verificar HTML/assets/nav/login con HTTP real
