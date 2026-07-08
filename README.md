# Planeador Diario — Guía de instalación y uso

## 1. Cómo ponerla en tu celular (Android)

Esta app es una **PWA** (Progressive Web App). Para instalarla necesita estar servida por
HTTPS — abrir el archivo directamente (`file://`) no permite instalar ni usar
notificaciones correctamente. La forma más simple y gratuita:

### Opción recomendada: GitHub Pages (gratis, 10 min una sola vez)
1. Crea una cuenta en github.com si no tienes una.
2. Crea un repositorio nuevo, por ejemplo `planeador`.
3. Sube estos archivos (`index.html`, `app.js`, `manifest.json`, `sw.js`, `icon-192.png`, `icon-512.png`) a la raíz del repositorio.
4. Ve a **Settings → Pages**, selecciona la rama `main` y carpeta `/root`, guarda.
5. GitHub te da una URL tipo `https://tuusuario.github.io/planeador/`.
6. Abre esa URL en Chrome en tu Android.
7. Toca el menú (⋮) → **"Agregar a pantalla de inicio"** / **"Instalar app"**.
8. Listo — queda como un ícono más en tu celular, se abre en pantalla completa.

### Alternativas si prefieres no usar GitHub
- Netlify Drop (netlify.com/drop): arrastras la carpeta y te da una URL al instante, gratis.
- Cualquier hosting estático gratuito (Vercel, Cloudflare Pages, Firebase Hosting).

## 2. Primer uso
1. Al abrir la app, ve a **Config** y confirma tu ventana horaria (por defecto 7:30–19:30),
   duración por defecto de tareas (30 min) y minutos de aviso de transición (10 min).
2. Toca **"Activar notificaciones"** y acepta el permiso que pida el navegador.
3. Ve a **Rutina** y agrega tus tareas fijas diarias (hora + duración + categoría).
4. Ve a **Pool** y agrega tus tareas, o usa **"+ Carga masiva"** para pegar una lista completa.
5. Ve a **Hoy** para ver el plan del día armado automáticamente.

## 3. Formato de carga masiva
Una tarea por línea, separada por `|`:
```
nombre | importancia(1-5) | urgencia(1-5) o fecha AAAA-MM-DD | duración_min | categoria
```
Ejemplo:
```
Cotizar bomba de riego | 2 | 2026-07-10 | 45 | agro
Pagar Servicio OSPRI | 1 | 2026-07-08 | 15 | agro
Revisar diseño sorter | 3 | 4 | 90 | agro
```
Categorías válidas: `agro`, `solar`, `airbnb`, `personal`, `otro`.
Si el tercer campo es una fecha (AAAA-MM-DD), la urgencia se calcula automáticamente
por deadline. Si es un número 1-5, se usa como urgencia manual.

Cuando le pidas a Claude que te genere una lista semanal de tareas, pídele que te la
entregue en este formato exacto para pegarla directo.

## 4. Cómo funciona la prioridad
`coeficiente = importancia × urgencia`. **Menor coeficiente = mayor prioridad.**
El plan del día llena tus horas libres (fuera de rutina) con las tareas de menor
coeficiente primero, respetando la duración estimada de cada una.

Urgencia automática por deadline:
- 1 día o menos → urgencia 1
- hasta 3 días → urgencia 2
- hasta 1 semana → urgencia 3
- hasta 15 días → urgencia 4
- más de 1 mes → urgencia 5
- vencida → se trata como urgencia 1 y se marca en rojo

## 5. Notificaciones — limitación importante
La app manda dos tipos de aviso: (1) el día que vence una tarea, (2) 10 minutos antes
de que inicie tu siguiente actividad programada.

Estas notificaciones son **locales** (sin servidor externo), lo cual es más simple y
privado, pero tiene un límite real de Android: si la app lleva muchas horas totalmente
cerrada (no en segundo plano), el sistema puede no ejecutar la revisión periódica a
tiempo. Para que sea confiable:
- Ábrela al menos una vez en la mañana (revisa avisos pendientes al abrir).
- Evita que el "ahorro de batería" de tu celular restrinja la app en segundo plano
  (Ajustes → Apps → Planeador → Batería → Sin restricciones).

Si en el futuro esto no es suficientemente confiable para ti, el siguiente nivel es
agregar un pequeño servidor que mande notificaciones push reales — lo podemos evaluar
más adelante si hace falta.

## 6. Nuevo: navegación por fechas, citas y agendar

- En **Plan**, usa las flechas ‹ › o el calendario para moverte a cualquier fecha.
  - Fecha pasada → modo **Reporte** (solo lectura, basado en el snapshot guardado ese día).
  - Hoy o futuro → modo **Planeación** (editable, sugerido por prioridad).
- En **Agenda** puedes crear **Citas**: fecha y hora fija, una sola vez, no compiten por prioridad.
- En el plan de un día, el botón **"Agendar"** fija una tarea sugerida en su horario para
  esa fecha (ya no se recalcula ni se sugiere en otros días). **"Agendar todo"** hace lo
  mismo con el plan completo del día.
- Cada vez que abres la app en un día distinto al último que la abriste, guarda
  automáticamente una "foto" (snapshot) del plan de los días intermedios, para que el
  modo Reporte siempre tenga algo que mostrar.

## 7. Objetivos

Los objetivos se diseñan en un chat aparte con Claude (nombre, pasos, de qué tarea depende
cada paso, y qué pasos dependen de otros). Claude te entrega un bloque JSON que pegas en
**Objetivos → + Importar**. Cada paso se vincula a una tarea del pool; cuando la marcas
"hecha", el paso se marca solo. Un paso con dependencias sin cumplir aparece "bloqueado"
y su tarea no se sugiere en el plan del día hasta desbloquearse.

## 8. Historial y seguimiento con Claude
En la pestaña **Historial** puedes exportar un archivo `.json` con tus tareas, rutinas
y configuración. Tráelo a un chat con Claude para que analice tu avance y te dé
sugerencias de ajuste al plan. También puedes importar un `.json` para restaurar datos
o mover tu información a otro celular.
