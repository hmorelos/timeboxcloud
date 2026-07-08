/* ====================== ESTADO ====================== */
const DEFAULTS = {
  tasks: [],       // {id,nombre,importancia,urgencia,autoUrg,deadline,duracion,categoria,estatus,createdAt,completedAt,agendadaEn,objetivoId,pasoClave}
  routines: [],    // {id,nombre,hora,duracion,categoria}
  citas: [],       // {id,nombre,fecha,hora,duracion,categoria}
  objetivos: [],   // {id,nombre,categoria,pasos:[{clave,nombre,dependeDe:[],tareaId}]}
  routineDone: {}, // { 'YYYY-MM-DD_routineId': true }
  planOverrides: {}, // { 'YYYY-MM-DD': [{tipo:'rutina'|'cita'|'tarea', id, start}] }
  snapshots: {},   // { 'YYYY-MM-DD': {ventana,bloques,resumen} }
  lastOpenDate: null,
  config: {
    inicio: "07:30",
    fin: "19:30",
    duracionDefault: 30,
    transicionMin: 10
  },
  firedAlerts: {}
};

let state = loadState();
let currentView = 'hoy';
let selectedDate = todayStr();

function loadState(){
  try{
    const raw = localStorage.getItem('plannerData');
    if(!raw) return structuredClone(DEFAULTS);
    const parsed = JSON.parse(raw);
    return Object.assign(structuredClone(DEFAULTS), parsed);
  }catch(e){
    console.error('Error cargando estado', e);
    return structuredClone(DEFAULTS);
  }
}

function saveState(){
  localStorage.setItem('plannerData', JSON.stringify(state));
}

function uid(){
  return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,7);
}

function todayStr(d = new Date()){
  return d.toISOString().slice(0,10);
}

function addDays(fechaStr, n){
  const d = new Date(fechaStr + 'T00:00:00');
  d.setDate(d.getDate()+n);
  return todayStr(d);
}

/* ====================== PRIORIDAD / URGENCIA ====================== */
function diasHasta(fechaStr){
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const f = new Date(fechaStr + 'T00:00:00');
  return Math.round((f - hoy) / 86400000);
}

function calcUrgenciaAuto(deadline){
  if(!deadline) return 5;
  const dias = diasHasta(deadline);
  if(dias < 0) return 1;
  if(dias <= 1) return 1;
  if(dias <= 3) return 2;
  if(dias <= 7) return 3;
  if(dias <= 15) return 4;
  return 5;
}

function urgenciaEfectiva(t){
  if(t.autoUrg) return calcUrgenciaAuto(t.deadline);
  return t.urgencia;
}

function coeficiente(t){
  return t.importancia * urgenciaEfectiva(t);
}

function estaVencida(t){
  return t.deadline && diasHasta(t.deadline) < 0 && t.estatus !== 'hecho';
}

function prioridadColor(t){
  if(estaVencida(t)) return 'var(--pr-overdue)';
  const c = coeficiente(t);
  if(c <= 5) return 'var(--pr-high)';
  if(c <= 15) return 'var(--pr-mid)';
  return 'var(--pr-low)';
}

/* ====================== OBJETIVOS: dependencias ====================== */
function pasoEstatus(objetivo, paso, visitados){
  visitados = visitados || new Set();
  if(visitados.has(paso.clave)) return 'bloqueado'; // ciclo, previene loop infinito
  visitados.add(paso.clave);
  const tarea = state.tasks.find(t=>t.id===paso.tareaId);
  if(tarea && tarea.estatus==='hecho') return 'hecho';
  const deps = paso.dependeDe || [];
  const depsListas = deps.every(clave=>{
    const dp = objetivo.pasos.find(p=>p.clave===clave);
    return dp && pasoEstatus(objetivo, dp, visitados) === 'hecho';
  });
  return depsListas ? 'disponible' : 'bloqueado';
}

function tareaBloqueadaPorObjetivo(taskId){
  for(const obj of state.objetivos){
    const paso = obj.pasos.find(p=>p.tareaId===taskId);
    if(paso){
      const est = pasoEstatus(obj, paso);
      return est === 'bloqueado';
    }
  }
  return false;
}

function objetivoProgreso(obj){
  const total = obj.pasos.length;
  if(total===0) return 0;
  const hechos = obj.pasos.filter(p=>pasoEstatus(obj,p)==='hecho').length;
  return Math.round((hechos/total)*100);
}

/* ====================== NAVEGACION ====================== */
function switchView(v){
  currentView = v;
  document.querySelectorAll('.view').forEach(el=>el.classList.remove('active'));
  document.getElementById('view-'+v).classList.add('active');
  document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active', b.dataset.view === v));

  const fab = document.getElementById('fabAdd');
  if(v==='pool'){
    fab.style.display='flex'; fab.classList.remove('fab-text'); fab.textContent='+';
    fab.onclick = ()=>openTaskModal();
  } else if(v==='rutina'){
    fab.style.display='flex'; fab.classList.add('fab-text'); fab.textContent='+ Cita';
    fab.onclick = ()=>openCitaModal();
  } else {
    fab.style.display='none';
  }

  const titles = {hoy:'Plan', pool:'Pool de tareas', rutina:'Agenda', objetivos:'Objetivos', historial:'Historial', config:'Configuración'};
  document.getElementById('headerTitle').textContent = titles[v];
  renderAll();
}

function closeModal(id){ document.getElementById(id).classList.remove('active'); }
function openModal(id){ document.getElementById(id).classList.add('active'); }

/* ====================== FECHA SELECCIONADA ====================== */
function cambiarDia(n){
  selectedDate = addDays(selectedDate, n);
  document.getElementById('selectedDateInput').value = selectedDate;
  renderAll();
}
function irHoy(){
  selectedDate = todayStr();
  document.getElementById('selectedDateInput').value = selectedDate;
  renderAll();
}
function onDateChange(){
  selectedDate = document.getElementById('selectedDateInput').value || todayStr();
  renderAll();
}

function esFechaPasada(fecha){
  return fecha < todayStr();
}

/* ====================== HELPERS ====================== */
function catLabel(c){
  return {agro:'Agro',solar:'Solar',airbnb:'Airbnb',personal:'Personal',otro:'Otro',rutina:'Rutina',cita:'Cita'}[c] || c;
}
function minsToHHMM(mins){
  const h = Math.floor(mins/60).toString().padStart(2,'0');
  const m = (mins%60).toString().padStart(2,'0');
  return `${h}:${m}`;
}
function hhmmToMins(hhmm){
  const [h,m] = hhmm.split(':').map(Number);
  return h*60+m;
}
function escapeHtml(str){
  return (str||'').replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
function clamp15(v){
  v = parseInt(v);
  if(isNaN(v)) return 3;
  return Math.min(5, Math.max(1, v));
}

/* ====================== CONSTRUCCION DEL PLAN (para cualquier fecha) ====================== */
function construirPlanDelDia(fecha){
  const cfg = state.config;
  const inicio = hhmmToMins(cfg.inicio);
  const fin = hhmmToMins(cfg.fin);
  const override = state.planOverrides[fecha];
  const citasHoy = state.citas.filter(c=>c.fecha===fecha).sort((a,b)=>hhmmToMins(a.hora)-hhmmToMins(b.hora));

  let bloques = [];

  if(override){
    override.forEach(item=>{
      if(item.tipo === 'rutina'){
        const r = state.routines.find(x=>x.id===item.id);
        if(!r) return;
        const start = (item.start !== undefined && item.start !== null) ? item.start : hhmmToMins(r.hora);
        bloques.push({start, end: start + r.duracion, type:'routine', ref:r});
      } else if(item.tipo === 'cita'){
        return; // las citas se agregan siempre abajo, no dependen de overrides
      } else {
        const t = state.tasks.find(x=>x.id===item.id);
        if(!t) return;
        bloques.push({start: item.start, end: item.start + t.duracion, type:'task', ref:t});
      }
    });
  } else {
    const rutinasHoy = state.routines.slice().sort((a,b)=>hhmmToMins(a.hora)-hhmmToMins(b.hora));
    rutinasHoy.forEach(r=>{
      const start = hhmmToMins(r.hora);
      bloques.push({start, end: start + r.duracion, type:'routine', ref:r});
    });

    citasHoy.forEach(c=>{
      const start = hhmmToMins(c.hora);
      bloques.push({start, end: start + c.duracion, type:'cita', ref:c});
    });

    bloques.sort((a,b)=>a.start-b.start);
    let huecos = [];
    let cursor = inicio;
    bloques.forEach(b=>{
      if(b.start > cursor) huecos.push({start:cursor, end:Math.min(b.start,fin)});
      cursor = Math.max(cursor, b.end);
    });
    if(cursor < fin) huecos.push({start:cursor, end:fin});
    huecos = huecos.filter(h=>h.end > h.start);

    const pendientes = state.tasks
      .filter(t=>t.estatus!=='hecho' && !t.agendadaEn && !tareaBloqueadaPorObjetivo(t.id))
      .slice()
      .sort((a,b)=> coeficiente(a) - coeficiente(b));

    let ti = 0;
    for(let h of huecos){
      let cur = h.start;
      while(ti < pendientes.length && cur < h.end){
        const t = pendientes[ti];
        const dur = t.duracion || state.config.duracionDefault;
        if(cur + dur > h.end) break;
        bloques.push({start:cur, end:cur+dur, type:'task', ref:t});
        cur += dur;
        ti++;
      }
    }
  }

  // las citas del dia siempre se incluyen, incluso si hay override (capa fija)
  if(override){
    citasHoy.forEach(c=>{
      const start = hhmmToMins(c.hora);
      bloques.push({start, end: start + c.duracion, type:'cita', ref:c});
    });
  }

  bloques.sort((a,b)=>a.start-b.start);
  return bloques;
}

/* ====================== RENDER: PLAN ====================== */
function renderHoy(){
  document.getElementById('selectedDateInput').value = selectedDate;
  const d = new Date(selectedDate + 'T00:00:00');
  document.getElementById('headerSub').textContent = d.toLocaleDateString('es-MX',{weekday:'long', day:'numeric', month:'long'});

  const pasada = esFechaPasada(selectedDate);
  document.getElementById('planTitle').textContent = pasada ? 'Reporte del día' : 'Plan del día';
  document.getElementById('btnAgendarTodo').style.display = pasada ? 'none' : 'inline';
  document.getElementById('btnAgregarTarea').style.display = pasada ? 'none' : 'inline';
  document.getElementById('btnAgregarCita').style.display = pasada ? 'none' : 'inline';

  const bannerEl = document.getElementById('hoyBanner');
  let bannerHtml = '';

  if(pasada){
    const snap = state.snapshots[selectedDate];
    if(!snap){
      document.getElementById('planList').innerHTML = '<div class="empty">No hay snapshot guardado para esta fecha (no se abrió la app ese día o es anterior a que empezaste a usarla).</div>';
      document.getElementById('statPend').textContent = '—';
      document.getElementById('statHoras').textContent = '—';
      document.getElementById('statLibre').textContent = '—';
      bannerEl.innerHTML = '';
      return;
    }
    document.getElementById('statPend').textContent = snap.resumen.pendientes;
    document.getElementById('statPendLbl').textContent = 'sin terminar';
    document.getElementById('statHoras').textContent = snap.resumen.horasOcupadas+'h';
    document.getElementById('statLibre').textContent = snap.resumen.horasLibres+'h';
    bannerEl.innerHTML = `<div class="banner info">📋 Reporte guardado: ${snap.resumen.hechas}/${snap.resumen.totalBloques} completadas.</div>`;

    document.getElementById('planList').innerHTML = snap.bloques.map(b=>{
      const cat = b.categoria;
      const done = b.estatusFinal === 'hecho';
      return `
      <div class="timeline-slot">
        <div class="timeline-time">${b.horaInicio}</div>
        <div class="card ${done?'done':''}" style="border-left-color:${done?'':'var(--cat-'+cat+')'}">
          <div class="card-top">
            <div>
              <h3>${escapeHtml(b.nombre)}</h3>
              <div class="meta">
                <span class="tag ${cat}">${catLabel(cat)}</span>
                &nbsp;${b.duracionMin} min
                ${b.tipo!=='cita' ? `&nbsp;· ${done?'✓ hecha':'✗ no terminada'}` : ''}
              </div>
            </div>
          </div>
        </div>
      </div>`;
    }).join('');
    return;
  }

  // modo planeacion (hoy o futuro)
  const plan = construirPlanDelDia(selectedDate);
  const cfg = state.config;
  const totalMin = hhmmToMins(cfg.fin) - hhmmToMins(cfg.inicio);
  const ocupadoMin = plan.reduce((s,b)=>s+(b.end-b.start),0);

  document.getElementById('statPendLbl').textContent = 'pendientes';
  document.getElementById('statPend').textContent = state.tasks.filter(t=>t.estatus!=='hecho' && !tareaBloqueadaPorObjetivo(t.id)).length;
  document.getElementById('statHoras').textContent = (ocupadoMin/60).toFixed(1)+'h';
  document.getElementById('statLibre').textContent = Math.max(0,(totalMin-ocupadoMin)/60).toFixed(1)+'h';

  const vencidas = state.tasks.filter(t=>estaVencida(t));
  if(vencidas.length>0){
    bannerHtml += `<div class="banner crit">⚠ Tienes ${vencidas.length} tarea(s) vencida(s) en el pool.</div>`;
  }
  bannerEl.innerHTML = bannerHtml;

  const list = document.getElementById('planList');
  if(plan.length===0){
    list.innerHTML = '<div class="empty">No hay nada agendado. Agrega tareas al pool, rutinas o citas.</div>';
    return;
  }

  list.innerHTML = plan.map((b,idx)=>{
    const isRoutine = b.type==='routine';
    const isCita = b.type==='cita';
    const ref = b.ref;
    const cat = isRoutine ? (ref.categoria||'rutina') : (isCita ? ref.categoria : ref.categoria);
    const borderColor = isRoutine ? 'var(--cat-rutina)' : (isCita ? 'var(--cat-cita)' : prioridadColor(ref));
    const overdueClass = (!isRoutine && !isCita && estaVencida(ref)) ? 'overdue' : '';
    const doneTask = (!isRoutine && !isCita) && ref.estatus === 'hecho';
    const doneRoutine = isRoutine && rutinaHecha(ref.id, selectedDate);
    const done = doneTask || doneRoutine;
    const agendada = (!isRoutine && !isCita) && !!ref.agendadaEn;
    return `
      <div class="timeline-slot">
        <div class="timeline-time">${minsToHHMM(b.start)}</div>
        <div class="card ${overdueClass} ${done?'done':''}" style="border-left-color:${done?'':borderColor}">
          <div class="card-top">
            <div>
              <h3>${escapeHtml(ref.nombre)}</h3>
              <div class="meta">
                <span class="tag ${isCita?'cita':cat}">${isCita?'Cita':catLabel(cat)}</span>
                ${agendada ? '&nbsp;<span class="tag locked">🔒 agendada</span>' : ''}
                &nbsp;${b.end-b.start} min
                ${!isRoutine && !isCita ? `&nbsp;· coef ${coeficiente(ref)}` : ''}
              </div>
            </div>
          </div>
          <div class="actions">
            <button class="btn small" onclick="moverTarea(${idx},-1)" title="Programar más temprano">⬆</button>
            <button class="btn small" onclick="moverTarea(${idx},1)" title="Programar más tarde">⬇</button>
            ${!isRoutine && !isCita ? `<button class="btn small" onclick="toggleEstatus('${ref.id}')">${doneTask?'↺ Pendiente':'✓ Hecho'}</button>` : ''}
            ${isRoutine ? `<button class="btn small" onclick="toggleRoutineEstatus('${ref.id}','${selectedDate}')">${doneRoutine?'↺ Pendiente':'✓ Hecho'}</button>` : ''}
            ${!isRoutine && !isCita && !agendada ? `<button class="btn small" onclick="openSwap(${idx})">⇄ Cambiar</button>` : ''}
            ${!isRoutine && !isCita && !agendada ? `<button class="btn small" onclick="agendarUno(${idx})">✓ Agendar</button>` : ''}
            ${!isRoutine && !isCita && agendada ? `<button class="btn small" onclick="quitarDelDia('${ref.id}')">✕ Quitar del día</button>` : ''}
            <button class="btn small" onclick="${isRoutine?`openRoutineModal('${ref.id}')`:(isCita?`openCitaModal('${ref.id}')`:`openTaskModal('${ref.id}')`)}">✎ Editar</button>
          </div>
        </div>
      </div>`;
  }).join('');
}

function toggleEstatus(id){
  const t = state.tasks.find(x=>x.id===id);
  if(!t) return;
  if(t.estatus === 'hecho'){
    t.estatus = 'pendiente';
    t.completedAt = null;
  } else {
    t.estatus = 'hecho';
    t.completedAt = new Date().toISOString();
  }
  saveState();
  renderAll();
}

function rutinaHecha(routineId, fecha){
  return !!state.routineDone[`${fecha}_${routineId}`];
}

function toggleRoutineEstatus(routineId, fecha){
  const key = `${fecha}_${routineId}`;
  state.routineDone[key] = !state.routineDone[key];
  saveState();
  renderAll();
}

function regenerarPlan(){
  delete state.planOverrides[selectedDate];
  // desagenda las tareas que estaban fijas solo para esta fecha
  state.tasks.forEach(t=>{ if(t.agendadaEn === selectedDate) t.agendadaEn = null; });
  saveState();
  renderAll();
}

/* ====================== HUECOS LIBRES / AGREGAR DESPUES DE AGENDAR ====================== */
function huecosLibres(fecha){
  const cfg = state.config;
  const inicio = hhmmToMins(cfg.inicio);
  const fin = hhmmToMins(cfg.fin);
  const plan = construirPlanDelDia(fecha).slice().sort((a,b)=>a.start-b.start);
  let huecos = [];
  let cursor = inicio;
  plan.forEach(b=>{
    if(b.start > cursor) huecos.push({start:cursor, end:Math.min(b.start,fin)});
    cursor = Math.max(cursor, b.end);
  });
  if(cursor < fin) huecos.push({start:cursor, end:fin});
  return huecos.filter(h=>h.end > h.start);
}

function asegurarOverride(fecha){
  if(!state.planOverrides[fecha]){
    const planActual = construirPlanDelDia(fecha).filter(b=>b.type!=='cita');
    state.planOverrides[fecha] = planActual.map(b=>
      b.type==='routine' ? {tipo:'rutina', id:b.ref.id} : {tipo:'tarea', id:b.ref.id, start:b.start}
    );
  }
  return state.planOverrides[fecha];
}

function openAddTaskModal(){
  const disponibles = state.tasks.filter(t=>t.estatus!=='hecho' && !t.agendadaEn && !tareaBloqueadaPorObjetivo(t.id))
    .slice().sort((a,b)=>coeficiente(a)-coeficiente(b));
  const list = document.getElementById('addTaskList');
  if(disponibles.length===0){
    list.innerHTML = '<div class="empty">No hay tareas libres en el pool para agregar.</div>';
  } else {
    list.innerHTML = disponibles.map(t=>`
      <div class="card" style="border-left-color:${prioridadColor(t)};cursor:pointer" onclick="agregarTareaAlDia('${t.id}')">
        <h3>${escapeHtml(t.nombre)}</h3>
        <div class="meta"><span class="tag ${t.categoria}">${catLabel(t.categoria)}</span>&nbsp;coef ${coeficiente(t)}&nbsp;· ${t.duracion} min</div>
      </div>`).join('');
  }
  openModal('modalAgregarTarea');
}

function agregarTareaAlDia(taskId){
  const t = state.tasks.find(x=>x.id===taskId);
  if(!t) return;
  const dur = t.duracion || state.config.duracionDefault;
  const hueco = huecosLibres(selectedDate).find(h => (h.end - h.start) >= dur);
  if(!hueco){
    alert('No hay espacio libre suficiente ese día para esta tarea (necesita ' + dur + ' min).');
    return;
  }
  const override = asegurarOverride(selectedDate);
  override.push({tipo:'tarea', id:t.id, start:hueco.start});
  t.agendadaEn = selectedDate;
  saveState();
  closeModal('modalAgregarTarea');
  renderAll();
}

function quitarDelDia(taskId){
  const t = state.tasks.find(x=>x.id===taskId);
  if(!t) return;
  t.agendadaEn = null;
  if(state.planOverrides[selectedDate]){
    state.planOverrides[selectedDate] = state.planOverrides[selectedDate].filter(o => !(o.tipo==='tarea' && o.id===taskId));
  }
  saveState();
  renderAll();
}

/* ====================== AGENDAR ====================== */
function agendarUno(idx){
  const plan = construirPlanDelDia(selectedDate);
  const slot = plan[idx];
  if(!slot || slot.type !== 'task') return;
  const t = slot.ref;
  t.agendadaEn = selectedDate;

  let override = state.planOverrides[selectedDate] || plan
    .filter(b=>b.type!=='cita')
    .map(b=> b.type==='routine' ? {tipo:'rutina', id:b.ref.id} : {tipo:'tarea', id:b.ref.id, start:b.start});

  if(!override.find(o=>o.tipo==='tarea' && o.id===t.id)){
    override.push({tipo:'tarea', id:t.id, start:slot.start});
  }
  state.planOverrides[selectedDate] = override;
  saveState();
  renderAll();
}

function agendarTodo(){
  const plan = construirPlanDelDia(selectedDate);
  const override = plan.filter(b=>b.type!=='cita').map(b=>{
    if(b.type==='routine') return {tipo:'rutina', id:b.ref.id};
    b.ref.agendadaEn = selectedDate;
    return {tipo:'tarea', id:b.ref.id, start:b.start};
  });
  state.planOverrides[selectedDate] = override;
  saveState();
  renderAll();
  alert('Plan del día agendado. Estas tareas ya no se moverán ni se sugerirán en otras fechas.');
}

let swapSlotIndex = null;
function openSwap(idx){
  swapSlotIndex = idx;
  const pool = state.tasks.filter(t=>t.estatus!=='hecho' && !t.agendadaEn && !tareaBloqueadaPorObjetivo(t.id)).slice().sort((a,b)=>coeficiente(a)-coeficiente(b));
  const list = document.getElementById('swapList');
  if(pool.length===0){
    list.innerHTML = '<div class="empty">No hay más tareas disponibles en el pool.</div>';
  } else {
    list.innerHTML = pool.map(t=>`
      <div class="card" style="border-left-color:${prioridadColor(t)};cursor:pointer" onclick="doSwap('${t.id}')">
        <h3>${escapeHtml(t.nombre)}</h3>
        <div class="meta"><span class="tag ${t.categoria}">${catLabel(t.categoria)}</span>&nbsp;coef ${coeficiente(t)}&nbsp;· ${t.duracion} min</div>
      </div>`).join('');
  }
  openModal('modalSwap');
}

function doSwap(newTaskId){
  const plan = construirPlanDelDia(selectedDate);
  const slot = plan[swapSlotIndex];
  if(!slot || slot.type !== 'task'){ closeModal('modalSwap'); return; }

  const tareaVieja = slot.ref;
  const tareaNueva = state.tasks.find(t=>t.id===newTaskId);

  const override = plan.filter(b=>b.type!=='cita').map((b)=>{
    if(b===slot){
      return {tipo:'tarea', id:newTaskId, start:b.start};
    }
    if(b.type==='routine') return {tipo:'rutina', id:b.ref.id};
    return {tipo:'tarea', id:b.ref.id, start:b.start};
  });

  // la tarea nueva queda fija ese dia (ya no se sugiere en otras fechas);
  // la tarea que sale del slot se libera de vuelta al pool flotante.
  if(tareaNueva) tareaNueva.agendadaEn = selectedDate;
  if(tareaVieja && tareaVieja.agendadaEn === selectedDate) tareaVieja.agendadaEn = null;

  state.planOverrides[selectedDate] = override;
  saveState();
  closeModal('modalSwap');
  renderAll();
}

/* ====================== MOVER TAREA (flechas) ====================== */
function moverTarea(idx, direccion){
  const plan = construirPlanDelDia(selectedDate);
  const slot = plan[idx];
  if(!slot) return;
  const nuevaPos = idx + direccion;
  if(nuevaPos < 0 || nuevaPos >= plan.length) return; // ya esta en el extremo

  const nuevoPlan = plan.slice();
  [nuevoPlan[idx], nuevoPlan[nuevaPos]] = [nuevoPlan[nuevaPos], nuevoPlan[idx]];

  // reempaqueta todo el dia en el nuevo orden, uno tras otro sin huecos
  const cfg = state.config;
  let cursor = hhmmToMins(cfg.inicio);
  const nuevoOverride = [];

  nuevoPlan.forEach(b=>{
    const dur = b.end - b.start;
    const start = cursor;
    if(b.type==='routine'){
      // solo cambia la hora de la rutina PARA ESTE DIA; su horario base no se toca
      nuevoOverride.push({tipo:'rutina', id:b.ref.id, start});
    } else if(b.type==='cita'){
      // una cita es de un solo uso: mover equivale a reprogramar su hora directamente
      b.ref.hora = minsToHHMM(start);
    } else {
      nuevoOverride.push({tipo:'tarea', id:b.ref.id, start});
      b.ref.agendadaEn = selectedDate;
    }
    cursor += dur;
  });

  state.planOverrides[selectedDate] = nuevoOverride;
  saveState();
  renderAll();
}

/* ====================== RENDER: POOL ====================== */
function renderPool(){
  const list = document.getElementById('poolList');
  const pendientes = state.tasks.filter(t=>t.estatus!=='hecho').sort((a,b)=>coeficiente(a)-coeficiente(b));
  if(pendientes.length===0){
    list.innerHTML = '<div class="empty">Pool vacío. Toca "+" para agregar una tarea, o usa carga masiva.</div>';
    return;
  }
  list.innerHTML = pendientes.map(t=>{
    const bloqueada = tareaBloqueadaPorObjetivo(t.id);
    const overdueClass = estaVencida(t) ? 'overdue' : '';
    return `
    <div class="card ${overdueClass} ${bloqueada?'blocked':''}" style="border-left-color:${prioridadColor(t)}">
      <div class="card-top">
        <div>
          <h3>${escapeHtml(t.nombre)}</h3>
          <div class="meta">
            <span class="tag ${t.categoria}">${catLabel(t.categoria)}</span>
            ${t.agendadaEn ? `&nbsp;<span class="tag locked">🔒 ${t.agendadaEn}</span>` : ''}
            ${bloqueada ? `&nbsp;<span class="tag locked">🔗 bloqueada por objetivo</span>` : ''}
            &nbsp;I${t.importancia} × U${urgenciaEfectiva(t)} = <b>${coeficiente(t)}</b>
            &nbsp;· ${t.duracion} min
            ${t.deadline ? `&nbsp;· vence ${t.deadline}` : ''}
          </div>
        </div>
      </div>
      <div class="actions">
        <button class="btn small" onclick="toggleEstatus('${t.id}')">✓ Hecho</button>
        <button class="btn small" onclick="openTaskModal('${t.id}')">✎ Editar</button>
      </div>
    </div>`;
  }).join('');
}

/* ====================== RENDER: RUTINA / CITAS ====================== */
function renderRutina(){
  const list = document.getElementById('rutinaList');
  const rs = state.routines.slice().sort((a,b)=>hhmmToMins(a.hora)-hhmmToMins(b.hora));
  list.innerHTML = rs.length===0 ? '<div class="empty">Sin rutinas todavía.</div>' : rs.map(r=>`
    <div class="card" style="border-left-color:var(--cat-rutina)">
      <div class="card-top">
        <div>
          <h3>${escapeHtml(r.nombre)}</h3>
          <div class="meta"><span class="tag ${r.categoria||'rutina'}">${catLabel(r.categoria||'rutina')}</span>&nbsp;${r.hora} · ${r.duracion} min</div>
        </div>
      </div>
      <div class="actions"><button class="btn small" onclick="openRoutineModal('${r.id}')">✎ Editar</button></div>
    </div>`).join('');

  const listC = document.getElementById('citasList');
  const cs = state.citas.filter(c=>c.fecha >= todayStr()).slice().sort((a,b)=> (a.fecha+a.hora).localeCompare(b.fecha+b.hora));
  listC.innerHTML = cs.length===0 ? '<div class="empty">Sin citas próximas.</div>' : cs.map(c=>`
    <div class="card" style="border-left-color:var(--cat-cita)">
      <div class="card-top">
        <div>
          <h3>${escapeHtml(c.nombre)}</h3>
          <div class="meta"><span class="tag cita">Cita</span>&nbsp;<span class="tag ${c.categoria}">${catLabel(c.categoria)}</span>&nbsp;${c.fecha} ${c.hora} · ${c.duracion} min</div>
        </div>
      </div>
      <div class="actions"><button class="btn small" onclick="openCitaModal('${c.id}')">✎ Editar</button></div>
    </div>`).join('');
}

/* ====================== RENDER: OBJETIVOS ====================== */
function renderObjetivos(){
  const list = document.getElementById('objetivosList');
  if(state.objetivos.length===0){
    list.innerHTML = '<div class="empty">Sin objetivos importados. Diséñalo con Claude en un chat y usa "+ Importar".</div>';
    return;
  }
  list.innerHTML = state.objetivos.map(obj=>{
    const pct = objetivoProgreso(obj);
    const pasosHtml = obj.pasos.map(p=>{
      const est = pasoEstatus(obj,p);
      const tarea = state.tasks.find(t=>t.id===p.tareaId);
      return `<div class="paso-row"><div class="paso-dot ${est}"></div><div>${escapeHtml(p.nombre)} ${tarea?`<span style="color:var(--text-dim)">— ${escapeHtml(tarea.nombre)}</span>`:''}</div></div>`;
    }).join('');
    return `
    <div class="card" style="border-left-color:var(--cat-${obj.categoria})">
      <div class="card-top">
        <div style="width:100%">
          <h3>${escapeHtml(obj.nombre)}</h3>
          <div class="meta"><span class="tag ${obj.categoria}">${catLabel(obj.categoria)}</span>&nbsp;${pct}% completado</div>
          <div class="progressbar"><div style="width:${pct}%"></div></div>
          ${pasosHtml}
          <div class="actions">
            <button class="btn small" onclick="editarObjetivo('${obj.id}')">✎ Editar</button>
            <button class="btn small danger" onclick="eliminarObjetivo('${obj.id}')">🗑 Eliminar</button>
          </div>
        </div>
      </div>
    </div>`;
  }).join('');
}

/* ====================== RENDER: HISTORIAL ====================== */
function renderHistorial(){
  const list = document.getElementById('historialList');
  const hechas = state.tasks.filter(t=>t.estatus==='hecho').sort((a,b)=> new Date(b.completedAt) - new Date(a.completedAt));
  if(hechas.length===0){
    list.innerHTML = '<div class="empty">Aún no hay tareas completadas.</div>';
    return;
  }
  list.innerHTML = hechas.map(t=>`
    <div class="card" style="border-left-color:var(--cat-${t.categoria})">
      <div class="card-top">
        <div>
          <h3>${escapeHtml(t.nombre)}</h3>
          <div class="meta">
            <span class="tag ${t.categoria}">${catLabel(t.categoria)}</span>
            &nbsp;completada: ${new Date(t.completedAt).toLocaleDateString('es-MX')}
          </div>
        </div>
      </div>
      <div class="actions"><button class="btn small" onclick="toggleEstatus('${t.id}')">↺ Reabrir</button></div>
    </div>`).join('');
}

/* ====================== RENDER GLOBAL ====================== */
function renderAll(){
  renderHoy();
  renderPool();
  renderRutina();
  renderObjetivos();
  renderHistorial();
  actualizarNotifStatus();
}

/* ====================== MODAL TAREA ====================== */
function toggleUrgMode(){
  const auto = document.getElementById('tAutoUrg').checked;
  document.getElementById('urgManualBox').style.display = auto ? 'none' : 'block';
}

function openTaskModal(id){
  document.getElementById('btnDeleteTask').style.display = id ? 'inline-block' : 'none';
  document.getElementById('modalTareaTitle').textContent = id ? 'Editar tarea' : 'Nueva tarea';
  if(id){
    const t = state.tasks.find(x=>x.id===id);
    document.getElementById('tId').value = t.id;
    document.getElementById('tNombre').value = t.nombre;
    document.getElementById('tImportancia').value = t.importancia;
    document.getElementById('tCategoria').value = t.categoria;
    document.getElementById('tAutoUrg').checked = t.autoUrg;
    document.getElementById('tUrgencia').value = t.urgencia || 3;
    document.getElementById('tDeadline').value = t.deadline || '';
    document.getElementById('tDuracion').value = t.duracion;
  } else {
    document.getElementById('tId').value = '';
    document.getElementById('tNombre').value = '';
    document.getElementById('tImportancia').value = 3;
    document.getElementById('tCategoria').value = 'agro';
    document.getElementById('tAutoUrg').checked = true;
    document.getElementById('tUrgencia').value = 3;
    document.getElementById('tDeadline').value = '';
    document.getElementById('tDuracion').value = state.config.duracionDefault;
  }
  toggleUrgMode();
  openModal('modalTarea');
}

function saveTask(){
  const id = document.getElementById('tId').value;
  const nombre = document.getElementById('tNombre').value.trim();
  if(!nombre){ alert('Falta el nombre de la tarea'); return; }
  const importancia = clamp15(document.getElementById('tImportancia').value);
  const autoUrg = document.getElementById('tAutoUrg').checked;
  const urgencia = clamp15(document.getElementById('tUrgencia').value);
  const deadline = document.getElementById('tDeadline').value || null;
  const categoria = document.getElementById('tCategoria').value;
  const duracion = parseInt(document.getElementById('tDuracion').value) || state.config.duracionDefault;

  if(id){
    const t = state.tasks.find(x=>x.id===id);
    Object.assign(t, {nombre, importancia, autoUrg, urgencia, deadline, categoria, duracion});
  } else {
    state.tasks.push({
      id: uid(), nombre, importancia, autoUrg, urgencia, deadline, categoria, duracion,
      estatus:'pendiente', createdAt: new Date().toISOString(), completedAt:null,
      agendadaEn:null
    });
  }
  saveState();
  closeModal('modalTarea');
  renderAll();
}

function deleteTaskFromModal(){
  const id = document.getElementById('tId').value;
  if(!id) return;
  if(!confirm('¿Eliminar esta tarea permanentemente?')) return;
  state.tasks = state.tasks.filter(x=>x.id!==id);
  saveState();
  closeModal('modalTarea');
  renderAll();
}

/* ====================== MODAL RUTINA ====================== */
function openRoutineModal(id){
  document.getElementById('btnDeleteRoutine').style.display = id ? 'inline-block' : 'none';
  document.getElementById('modalRutinaTitle').textContent = id ? 'Editar rutina' : 'Nueva rutina';
  if(id){
    const r = state.routines.find(x=>x.id===id);
    document.getElementById('rId').value = r.id;
    document.getElementById('rNombre').value = r.nombre;
    document.getElementById('rHora').value = r.hora;
    document.getElementById('rDuracion').value = r.duracion;
    document.getElementById('rCategoria').value = r.categoria || 'rutina';
  } else {
    document.getElementById('rId').value = '';
    document.getElementById('rNombre').value = '';
    document.getElementById('rHora').value = '08:00';
    document.getElementById('rDuracion').value = 30;
    document.getElementById('rCategoria').value = 'rutina';
  }
  openModal('modalRutina');
}

function saveRoutine(){
  const id = document.getElementById('rId').value;
  const nombre = document.getElementById('rNombre').value.trim();
  if(!nombre){ alert('Falta el nombre'); return; }
  const hora = document.getElementById('rHora').value;
  const duracion = parseInt(document.getElementById('rDuracion').value) || 30;
  const categoria = document.getElementById('rCategoria').value;

  if(id){
    const r = state.routines.find(x=>x.id===id);
    Object.assign(r, {nombre, hora, duracion, categoria});
  } else {
    state.routines.push({id: uid(), nombre, hora, duracion, categoria});
  }
  delete state.planOverrides[selectedDate];
  saveState();
  closeModal('modalRutina');
  renderAll();
}

function deleteRoutineFromModal(){
  const id = document.getElementById('rId').value;
  if(!id) return;
  if(!confirm('¿Eliminar esta rutina?')) return;
  state.routines = state.routines.filter(x=>x.id!==id);
  delete state.planOverrides[selectedDate];
  saveState();
  closeModal('modalRutina');
  renderAll();
}

/* ====================== MODAL CITA ====================== */
function openCitaModal(id){
  document.getElementById('btnDeleteCita').style.display = id ? 'inline-block' : 'none';
  document.getElementById('modalCitaTitle').textContent = id ? 'Editar cita' : 'Nueva cita';
  if(id){
    const c = state.citas.find(x=>x.id===id);
    document.getElementById('cId').value = c.id;
    document.getElementById('cNombre').value = c.nombre;
    document.getElementById('cFecha').value = c.fecha;
    document.getElementById('cHora').value = c.hora;
    document.getElementById('cDuracion').value = c.duracion;
    document.getElementById('cCategoria').value = c.categoria;
  } else {
    document.getElementById('cId').value = '';
    document.getElementById('cNombre').value = '';
    document.getElementById('cFecha').value = selectedDate;
    document.getElementById('cHora').value = '10:00';
    document.getElementById('cDuracion').value = 60;
    document.getElementById('cCategoria').value = 'agro';
  }
  openModal('modalCita');
}

function saveCita(){
  const id = document.getElementById('cId').value;
  const nombre = document.getElementById('cNombre').value.trim();
  if(!nombre){ alert('Falta el nombre'); return; }
  const fecha = document.getElementById('cFecha').value;
  const hora = document.getElementById('cHora').value;
  if(!fecha || !hora){ alert('Falta fecha u hora'); return; }
  const duracion = parseInt(document.getElementById('cDuracion').value) || 60;
  const categoria = document.getElementById('cCategoria').value;

  if(id){
    const c = state.citas.find(x=>x.id===id);
    Object.assign(c, {nombre, fecha, hora, duracion, categoria});
  } else {
    state.citas.push({id: uid(), nombre, fecha, hora, duracion, categoria});
  }
  saveState();
  closeModal('modalCita');
  renderAll();
}

function deleteCitaFromModal(){
  const id = document.getElementById('cId').value;
  if(!id) return;
  if(!confirm('¿Eliminar esta cita?')) return;
  state.citas = state.citas.filter(x=>x.id!==id);
  saveState();
  closeModal('modalCita');
  renderAll();
}

/* ====================== IMPORT TAREAS / OBJETIVOS ====================== */
function openImport(){
  document.getElementById('importText').value = '';
  openModal('modalImport');
}

function procesarImport(){
  const raw = document.getElementById('importText').value;
  const lineas = raw.split('\n').map(l=>l.trim()).filter(Boolean);
  let agregadas = 0;
  lineas.forEach(linea=>{
    const partes = linea.split('|').map(p=>p.trim());
    if(partes.length < 1 || !partes[0]) return;
    const nombre = partes[0];
    const importancia = clamp15(partes[1] || 3);
    const campoUrg = partes[2] || '';
    const duracion = parseInt(partes[3]) || state.config.duracionDefault;
    let categoria = (partes[4] || 'otro').toLowerCase();
    if(!['agro','solar','airbnb','personal','otro'].includes(categoria)) categoria = 'otro';

    let autoUrg = false, urgencia = 3, deadline = null;
    if(/^\d{4}-\d{2}-\d{2}$/.test(campoUrg)){
      autoUrg = true; deadline = campoUrg;
    } else if(campoUrg){
      autoUrg = false; urgencia = clamp15(campoUrg);
    } else {
      autoUrg = false; urgencia = 3;
    }

    state.tasks.push({
      id: uid(), nombre, importancia, autoUrg, urgencia, deadline, categoria, duracion,
      estatus:'pendiente', createdAt: new Date().toISOString(), completedAt:null, agendadaEn:null
    });
    agregadas++;
  });
  saveState();
  closeModal('modalImport');
  renderAll();
  alert(agregadas + ' tarea(s) agregadas al pool.');
}

let editingObjetivoId = null;

function openImportObjetivo(){
  editingObjetivoId = null;
  document.getElementById('importObjetivoText').value = '';
  document.getElementById('modalImportObjetivoTitle').textContent = 'Importar objetivo';
  document.getElementById('btnCargarObjetivo').textContent = 'Cargar objetivo';
  openModal('modalImportObjetivo');
}

function exportObjetivoToJSON(obj){
  return {
    objetivo: {
      nombre: obj.nombre,
      categoria: obj.categoria,
      pasos: obj.pasos.map(p=>{
        const t = state.tasks.find(x=>x.id===p.tareaId);
        let tarea = null;
        if(t){
          tarea = { nombre: t.nombre, importancia: t.importancia, categoria: t.categoria, duracion: t.duracion };
          if(t.autoUrg) tarea.deadline = t.deadline;
          else tarea.urgencia = t.urgencia;
        }
        return { clave: p.clave, nombre: p.nombre, dependeDe: p.dependeDe, tarea };
      })
    }
  };
}

function editarObjetivo(id){
  const obj = state.objetivos.find(x=>x.id===id);
  if(!obj) return;
  editingObjetivoId = id;
  document.getElementById('importObjetivoText').value = JSON.stringify(exportObjetivoToJSON(obj), null, 2);
  document.getElementById('modalImportObjetivoTitle').textContent = 'Editar objetivo';
  document.getElementById('btnCargarObjetivo').textContent = 'Guardar cambios';
  openModal('modalImportObjetivo');
}

function eliminarObjetivo(id){
  const obj = state.objetivos.find(x=>x.id===id);
  if(!obj) return;
  if(!confirm('¿Eliminar este objetivo y sus tareas ligadas del pool?')) return;

  const idsDelObjetivo = obj.pasos.map(p=>p.tareaId).filter(Boolean);
  state.objetivos = state.objetivos.filter(x=>x.id!==id);

  // si alguna de esas tareas sigue ligada a OTRO objetivo que quede, no se borra
  const idsUsadosEnOtros = new Set();
  state.objetivos.forEach(o=> o.pasos.forEach(p=>{ if(p.tareaId) idsUsadosEnOtros.add(p.tareaId); }));
  const idsABorrar = idsDelObjetivo.filter(tid => !idsUsadosEnOtros.has(tid));

  state.tasks = state.tasks.filter(t => !idsABorrar.includes(t.id));
  Object.keys(state.planOverrides).forEach(fecha=>{
    state.planOverrides[fecha] = state.planOverrides[fecha].filter(o => !(o.tipo==='tarea' && idsABorrar.includes(o.id)));
  });

  saveState();
  renderAll();
}

function procesarImportObjetivo(){
  const raw = document.getElementById('importObjetivoText').value;
  let data;
  try{ data = JSON.parse(raw); }catch(e){ alert('JSON inválido: '+e.message); return; }
  const src = data.objetivo || data;
  if(!src || !src.nombre || !Array.isArray(src.pasos)){ alert('Formato inválido: falta nombre o pasos.'); return; }

  const objExistente = editingObjetivoId ? state.objetivos.find(x=>x.id===editingObjetivoId) : null;
  const pasos = [];

  src.pasos.forEach(p=>{
    let tareaId = null;
    const pasoPrevio = objExistente ? objExistente.pasos.find(pp=>pp.clave===p.clave) : null;

    if(pasoPrevio && pasoPrevio.tareaId && state.tasks.find(t=>t.id===pasoPrevio.tareaId)){
      // paso ya existia en este objetivo: actualiza la misma tarea en vez de crear otra
      tareaId = pasoPrevio.tareaId;
      if(p.tarea){
        const t = state.tasks.find(x=>x.id===tareaId);
        Object.assign(t, {
          nombre: p.tarea.nombre || t.nombre,
          importancia: clamp15(p.tarea.importancia || t.importancia),
          categoria: p.tarea.categoria || t.categoria,
          duracion: p.tarea.duracion || t.duracion
        });
        if(p.tarea.deadline){ t.autoUrg = true; t.deadline = p.tarea.deadline; }
        else if(p.tarea.urgencia){ t.autoUrg = false; t.urgencia = clamp15(p.tarea.urgencia); }
      }
    } else if(p.tarea){
      const existente = state.tasks.find(t=> t.nombre.toLowerCase() === (p.tarea.nombre||'').toLowerCase());
      if(existente){
        tareaId = existente.id;
      } else {
        const nueva = {
          id: uid(), nombre: p.tarea.nombre, importancia: clamp15(p.tarea.importancia||3),
          autoUrg: !!p.tarea.deadline, urgencia: clamp15(p.tarea.urgencia||3),
          deadline: p.tarea.deadline || null, categoria: p.tarea.categoria || (src.categoria||'otro'),
          duracion: p.tarea.duracion || state.config.duracionDefault,
          estatus:'pendiente', createdAt:new Date().toISOString(), completedAt:null, agendadaEn:null
        };
        state.tasks.push(nueva);
        tareaId = nueva.id;
      }
    }
    pasos.push({ clave: p.clave || uid(), nombre: p.nombre || p.clave, dependeDe: p.dependeDe || [], tareaId });
  });

  if(objExistente){
    objExistente.nombre = src.nombre;
    objExistente.categoria = src.categoria || objExistente.categoria;
    objExistente.pasos = pasos;
    editingObjetivoId = null;
    saveState();
    closeModal('modalImportObjetivo');
    renderAll();
    alert('Objetivo "' + objExistente.nombre + '" actualizado.');
    return;
  }

  const obj = { id: uid(), nombre: src.nombre, categoria: (src.categoria||'otro'), pasos };
  state.objetivos.push(obj);
  saveState();
  closeModal('modalImportObjetivo');
  renderAll();
  alert('Objetivo "' + obj.nombre + '" importado con ' + obj.pasos.length + ' paso(s).');
}

/* ====================== EXPORT / IMPORT JSON GENERAL ====================== */
function exportarJSON(){
  const payload = {
    exportedAt: new Date().toISOString(),
    tasks: state.tasks,
    routines: state.routines,
    citas: state.citas,
    objetivos: state.objetivos,
    snapshots: state.snapshots,
    config: state.config
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `planeador_${todayStr()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function importarJSON(evt){
  const file = evt.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = (e)=>{
    try{
      const data = JSON.parse(e.target.result);
      if(!confirm('Esto reemplazará tus datos actuales por los del archivo. ¿Continuar?')) return;
      if(data.tasks) state.tasks = data.tasks;
      if(data.routines) state.routines = data.routines;
      if(data.citas) state.citas = data.citas;
      if(data.objetivos) state.objetivos = data.objetivos;
      if(data.snapshots) state.snapshots = data.snapshots;
      if(data.config) state.config = Object.assign(state.config, data.config);
      state.planOverrides = {};
      saveState();
      renderAll();
      alert('Importación completada.');
    }catch(err){
      alert('Archivo inválido: ' + err.message);
    }
  };
  reader.readAsText(file);
  evt.target.value = '';
}

/* ====================== CONFIG ====================== */
function cargarConfigUI(){
  document.getElementById('cfgInicio').value = state.config.inicio;
  document.getElementById('cfgFin').value = state.config.fin;
  document.getElementById('cfgDuracion').value = state.config.duracionDefault;
  document.getElementById('cfgTransicion').value = state.config.transicionMin;
}

function guardarConfig(){
  state.config.inicio = document.getElementById('cfgInicio').value || '07:30';
  state.config.fin = document.getElementById('cfgFin').value || '19:30';
  state.config.duracionDefault = parseInt(document.getElementById('cfgDuracion').value) || 30;
  const trans = document.getElementById('cfgTransicion').value;
  state.config.transicionMin = trans === '' ? 10 : parseInt(trans);
  state.planOverrides = {};
  saveState();
  renderAll();
  alert('Configuración guardada.');
}

/* ====================== NOTIFICACIONES ====================== */
function actualizarNotifStatus(){
  const el = document.getElementById('notifStatus');
  if(!('Notification' in window)){
    el.textContent = 'Este navegador no soporta notificaciones.';
    return;
  }
  const perm = Notification.permission;
  const txt = {
    granted: '✓ Notificaciones activadas.',
    denied: '✗ Notificaciones bloqueadas. Actívalas en la configuración del navegador/app.',
    default: 'Notificaciones no activadas todavía.'
  }[perm];
  el.textContent = txt + ' Nota: en Android, para que los avisos lleguen incluso con la app cerrada por horas, es más confiable si abres la app periódicamente o la dejas en segundo plano; esto usa un mecanismo local sin servidor externo.';
}

function pedirPermisoNotif(){
  if(!('Notification' in window)){ alert('No soportado en este navegador'); return; }
  Notification.requestPermission().then(()=>{ actualizarNotifStatus(); });
}

function lanzarNotificacion(titulo, cuerpo){
  if(Notification.permission !== 'granted') return;
  if(navigator.serviceWorker && navigator.serviceWorker.controller){
    navigator.serviceWorker.ready.then(reg=>{
      reg.showNotification(titulo, {body:cuerpo, icon:'icon-192.png', badge:'icon-192.png'});
    });
  } else {
    new Notification(titulo, {body:cuerpo, icon:'icon-192.png'});
  }
}

function chequearAlertas(){
  const fecha = todayStr();
  const ahora = new Date();
  const minsAhora = ahora.getHours()*60 + ahora.getMinutes();

  state.tasks.forEach(t=>{
    if(t.estatus==='hecho' || !t.deadline) return;
    if(t.deadline === fecha){
      const key = `${fecha}_${t.id}_deadline`;
      if(!state.firedAlerts[key]){
        lanzarNotificacion('Vence hoy: ' + t.nombre, `Categoría: ${catLabel(t.categoria)} · Prioridad coef ${coeficiente(t)}`);
        state.firedAlerts[key] = true;
        saveState();
      }
    }
  });

  const plan = construirPlanDelDia(fecha);
  const transicion = state.config.transicionMin;
  for(let i=0;i<plan.length-1;i++){
    const siguiente = plan[i+1];
    const disparoEn = siguiente.start - transicion;
    if(minsAhora === disparoEn){
      const key = `${fecha}_${i}_${siguiente.start}_transicion`;
      if(!state.firedAlerts[key]){
        lanzarNotificacion('Siguiente en ' + transicion + ' min', siguiente.ref.nombre);
        state.firedAlerts[key] = true;
        saveState();
      }
    }
  }
}

function limpiarAlertasViejas(){
  const hoy = todayStr();
  Object.keys(state.firedAlerts).forEach(k=>{ if(!k.startsWith(hoy)) delete state.firedAlerts[k]; });
  saveState();
}

/* ====================== SNAPSHOT AUTOMATICO ====================== */
function guardarSnapshot(fecha){
  const plan = construirPlanDelDia(fecha);
  const bloques = plan.map(b=>{
    if(b.type==='routine') return {tipo:'rutina', nombre:b.ref.nombre, categoria:b.ref.categoria||'rutina', horaInicio:minsToHHMM(b.start), horaFin:minsToHHMM(b.end), duracionMin:b.end-b.start, estatusFinal: rutinaHecha(b.ref.id, fecha) ? 'hecho' : 'pendiente'};
    if(b.type==='cita') return {tipo:'cita', nombre:b.ref.nombre, categoria:b.ref.categoria, horaInicio:minsToHHMM(b.start), horaFin:minsToHHMM(b.end), duracionMin:b.end-b.start};
    const t=b.ref;
    return {tipo:'tarea', nombre:t.nombre, categoria:t.categoria, horaInicio:minsToHHMM(b.start), horaFin:minsToHHMM(b.end), duracionMin:b.end-b.start, importancia:t.importancia, urgencia:urgenciaEfectiva(t), coeficiente:coeficiente(t), agendada: !!t.agendadaEn, estatusFinal: t.estatus};
  });
  const totalMin = hhmmToMins(state.config.fin)-hhmmToMins(state.config.inicio);
  const ocupado = bloques.reduce((s,b)=>s+b.duracionMin,0);
  const hechas = bloques.filter(b=>b.estatusFinal==='hecho').length;
  const pendientes = bloques.filter(b=>b.tipo==='tarea' && b.estatusFinal!=='hecho').length;
  const porCategoria = {};
  bloques.forEach(b=>{ porCategoria[b.categoria]=+((porCategoria[b.categoria]||0)+b.duracionMin/60).toFixed(2); });
  state.snapshots[fecha] = {
    ventana:{inicio:state.config.inicio, fin:state.config.fin},
    bloques,
    resumen:{totalBloques:bloques.length, hechas, pendientes, horasOcupadas:+(ocupado/60).toFixed(2), horasLibres:+((totalMin-ocupado)/60).toFixed(2), porCategoria}
  };
}

function chequearCambioDeDia(){
  const hoy = todayStr();
  if(state.lastOpenDate && state.lastOpenDate !== hoy){
    let d = state.lastOpenDate;
    let guard = 0;
    while(d < hoy && guard < 60){
      if(!state.snapshots[d]) guardarSnapshot(d);
      d = addDays(d,1);
      guard++;
    }
  }
  state.lastOpenDate = hoy;
  saveState();
}

/* ====================== INIT ====================== */
window.addEventListener('load', ()=>{
  chequearCambioDeDia();
  cargarConfigUI();
  limpiarAlertasViejas();
  document.getElementById('fabAdd').style.display = 'none'; // Plan no usa fab
  renderAll();
  actualizarNotifStatus();

  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('sw.js').catch(err=>console.error('SW error', err));
  }

  setInterval(chequearAlertas, 30000);
  chequearAlertas();
});
