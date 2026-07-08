# Planeador Diario — Manual de uso

Esta app organiza tu día según prioridad, con rutina fija, citas, objetivos con pasos, y
notificaciones locales. Corre en tu navegador, sin depender de ningún servidor externo.

---

## 1. Instalación (una sola vez)

1. Abre la URL de la app (te la da GitHub Pages, algo como `https://usuario.github.io/repo/`) en **Chrome**, en tu celular Android.
2. Toca el menú (⋮, arriba a la derecha) → **"Instalar app"** o **"Agregar a pantalla de inicio"**.
3. Ábrela desde el ícono que aparece en tu pantalla de inicio (no desde Chrome directo), para que las notificaciones funcionen mejor.
4. Ve a la pestaña **Config** → toca **"Activar notificaciones"** → acepta el permiso que te pida el navegador.
5. En **Config**, revisa/ajusta tu ventana de horas de trabajo (por defecto 7:30am–7:30pm), duración por defecto de una tarea, y minutos de aviso antes de la siguiente actividad. Guarda.

---

## 2. Conceptos básicos

La app organiza todo alrededor de 5 tipos de cosas:

| Tipo | Qué es | ¿Compite por prioridad? |
|---|---|---|
| **Tarea** | Algo pendiente por hacer, con importancia y urgencia | Sí |
| **Rutina** | Algo que haces todos los días a la misma hora | No, tiene horario fijo |
| **Cita** | Algo con fecha y hora exacta, una sola vez | No, tiene horario fijo |
| **Objetivo** | Un resultado compuesto de varios pasos, cada paso ligado a una tarea | Indirectamente |
| **Historial/Snapshot** | El registro de lo que pasó cada día | — |

### Cómo se calcula la prioridad de una tarea
Cada tarea tiene **importancia** (1 a 5) y **urgencia** (1 a 5). Se multiplican:

```
coeficiente = importancia × urgencia
```

**Entre más bajo el coeficiente, más prioridad tiene.** Una tarea con importancia 1 y
urgencia 1 (coeficiente 1) se hace antes que una con importancia 5 y urgencia 5
(coeficiente 25).

### Urgencia automática por fecha límite (deadline)
Si le pones una fecha límite a una tarea en vez de urgencia manual, la app la calcula sola:

| Días para el deadline | Urgencia |
|---|---|
| Vencida o ≤1 día | 1 (máxima) |
| ≤3 días | 2 |
| ≤1 semana | 3 |
| ≤15 días | 4 |
| Más de 1 mes | 5 (mínima) |

---

## 3. Pestaña "Plan" — tu día a día

Es la pantalla principal. Arriba tienes una barra de fecha:
- **‹ ›** para moverte un día atrás/adelante.
- El calendario para saltar a cualquier fecha.
- **"Hoy"** para regresar rápido al día actual.

**Si la fecha es hoy o futura → modo Planeación (editable):**
- La app llena automáticamente tu ventana de horas: primero coloca tus rutinas y citas de
  ese día en su horario fijo, y con el tiempo que sobra mete tus tareas pendientes,
  empezando por la de menor coeficiente (mayor prioridad), respetando cuánto dura cada una.
- Botones disponibles en cada tarea del plan:
  - **✓ Hecho** — la marca como completada (se pone verde con un check, como recompensa).
  - **⇄ Cambiar** — la sustituye por otra tarea del pool en ese mismo espacio.
  - **✓ Agendar** — fija esa tarea en ese horario para ese día; ya no se recalcula ni se
    sugiere en otros días hasta que la completes o la quites.
  - **✎ Editar** — abre el formulario completo de la tarea.
- Botones generales arriba de la lista:
  - **+ Tarea** — mete una tarea nueva del pool en el primer espacio libre que quede ese
    día, aunque ya hayas agendado el resto.
  - **+ Cita** — agrega una cita ese mismo día.
  - **✓ Agendar todo** — fija el plan completo del día tal como está mostrado.
  - **↻ Regenerar** — descarta cualquier ajuste manual y vuelve a calcular el día desde cero
    por prioridad.
- Las rutinas también tienen botón **✓ Hecho** (independiente cada día — hoy sí, mañana se
  vuelve a preguntar).
- Las tareas ya agendadas muestran **✕ Quitar del día** por si te arrepientes.

**Si la fecha es pasada → modo Reporte (solo lectura):**
- Muestra la fotografía guardada de ese día: qué se planeó y qué se marcó como hecho.
- Si nunca abriste la app ese día, no habrá datos para mostrar — la app solo guarda el
  reporte de los días en que estuvo en uso.

---

## 4. Pestaña "Pool" — todas tus tareas pendientes

Lista completa de tareas, ordenadas por prioridad. Desde aquí:
- Toca **"+"** (botón flotante) para crear una tarea nueva.
- Toca **"+ Carga masiva"** para pegar varias tareas de un jalón (una por línea):
  ```
  nombre | importancia(1-5) | urgencia(1-5) o fecha AAAA-MM-DD | duración_min | categoria
  ```
  Ejemplo:
  ```
  Cotizar bomba de riego | 2 | 2026-07-10 | 45 | agro
  Pagar servicio | 1 | 2026-07-08 | 15 | agro
  ```
  Categorías válidas: `agro`, `solar`, `airbnb`, `personal`, `otro` (ajusta estos nombres a
  tus propias categorías si vas a personalizar la app).
- Una tarea marcada **"🔒 agendada"** ya tiene día fijo asignado.
- Una tarea marcada **"🔗 bloqueada por objetivo"** no se puede trabajar todavía porque
  depende de otro paso sin terminar (ver sección de Objetivos).

---

## 5. Pestaña "Agenda" — Rutina y Citas

**Rutina diaria:** tareas que se repiten todos los días a la misma hora (ej. "Revisión de
invernadero, 7:30am, 30 min"). Toca **"+ Rutina"** para agregar una. Ocupan su horario por
defecto en el Plan, pero las puedes editar o mover manualmente cualquier día.

**Citas:** algo con fecha y hora exacta, una sola vez (ej. "Junta con proveedor, 15 de
agosto, 10:00am"). No compiten por prioridad — siempre aparecen en su horario. Toca
**"+ Cita"** para agregar una.

---

## 6. Pestaña "Objetivos" — resultados de varios pasos

Un objetivo es una meta compuesta de pasos, y cada paso se completa cuando marcas como
"hecha" la tarea que tiene ligada. Los pasos pueden depender unos de otros (en serie) o
ser independientes (en paralelo) — un paso bloqueado no se sugiere en tu plan diario hasta
que se desbloquee.

Los objetivos **no se crean a mano en la app**. Se diseñan en una conversación con Claude
(nombre del objetivo, pasos, de qué depende cada uno), y Claude te entrega un bloque de
texto JSON. Para cargarlo:
1. Toca **"+ Importar"**.
2. Pega el bloque completo.
3. Toca **"Cargar objetivo"**.

Verás la barra de progreso (% de pasos completados) y cada paso con un punto de color:
- 🟢 verde = hecho
- 🟡 amarillo = disponible, puedes trabajarlo
- ⚪ gris = bloqueado, depende de otro paso

---

## 7. Pestaña "Historial"

Muestra tus tareas completadas. Desde aquí:
- **⬇ Exportar JSON** — descarga un archivo con todas tus tareas, rutinas, citas,
  objetivos y los snapshots diarios guardados. Llévalo a un chat con Claude para que
  analice tu avance y te dé sugerencias.
- **⬆ Importar JSON** — restaura un archivo exportado anteriormente (por ejemplo si
  cambias de celular). Ojo: reemplaza todos los datos actuales.

---

## 8. Dónde vive tu información

Todo se guarda **localmente en el navegador de tu celular** (no en ningún servidor). Esto
significa:
- Solo existe en ese dispositivo, no se sincroniza solo con otro celular o computadora.
- Si borras los datos de navegación de Chrome para ese sitio, o desinstalas la app, se
  pierde. Por eso conviene exportar el JSON de vez en cuando como respaldo.
- Si algún día cambias la URL donde está alojada la app, los datos no se mueven solos —
  tendrías que exportar de la URL vieja e importar en la nueva.

---

## 9. Notificaciones — qué esperar

La app manda dos tipos de aviso, sin depender de ningún servidor:
1. El día que vence una tarea (una sola vez, ese día).
2. Unos minutos antes de que empiece tu siguiente actividad programada (configurable en
   Config, por defecto 10 min).

Estas notificaciones son locales al navegador. Si el celular tiene la app cerrada por
muchas horas seguidas, Android puede retrasarlas. Para que sean más confiables:
- Abre la app al menos una vez al empezar el día.
- Quítale restricciones de batería: Ajustes → Apps → (la app) → Batería → Sin
  restricciones.

---

## 10. Actualizar la app a una versión nueva

Si en el futuro se agregan más funciones:
1. Sube los archivos nuevos al mismo repositorio de GitHub (Add file → Upload files),
   reemplazando los que ya existen.
2. Espera 1-2 minutos a que GitHub Pages actualice el sitio.
3. En tu celular, abre la URL en Chrome (no el ícono instalado) una vez para forzar que
   descargue la versión nueva. Si no se actualiza, borra el caché del sitio en Chrome y
   vuelve a intentar — esto no borra los datos guardados de la app.
