import { createClient } from '@supabase/supabase-js';
import Chart from 'chart.js/auto';
import './app.css';

// ── Supabase ──────────────────────────────────────────────────────────────────
const sb = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'https://qoauvsouetyuqqplbfak.supabase.co',
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_gPLFAn4uk3YzcbPiMbBPYA_bGRvncMz'
);

// ── State ─────────────────────────────────────────────────────────────────────
const state = {
  user: null,
  isAdmin: false,
  rawData: [],
  processedData: [],
  viewData: [],
  chartModes: { energia: 'bar', precio: 'line' },
  charts: {},
  lang: 'es',
};

// ── i18n ──────────────────────────────────────────────────────────────────────
const MONTHS = {
  es: ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'],
  en: ['January','February','March','April','May','June','July','August','September','October','November','December'],
};
const T = {
  es: { deleteConfirm:'¿Eliminar registro?', noData:'Sin datos.', admin:'Administrador', observer:'Observador', error:'Error', saving:'Subiendo...', connecting:'Conectando...' },
  en: { deleteConfirm:'Delete record?', noData:'No data.', admin:'Administrator', observer:'Observer', error:'Error', saving:'Uploading...', connecting:'Connecting...' },
};
const t = (k) => T[state.lang][k] || k;
const monthName = (idx) => MONTHS[state.lang][(idx||1)-1] || '';

// ── Formatters ────────────────────────────────────────────────────────────────
const fCOP = (v) => new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(v||0);
const fDec = (v,d=2) => parseFloat(v||0).toFixed(d);
const fKwh = (v) => `${fDec(v,1)} kWh`;
const fPct = (v) => `${fDec(v,1)}%`;
const debounce = (fn,ms) => { let t; return (...a) => { clearTimeout(t); t=setTimeout(()=>fn(...a),ms); }; };

// ── Database ──────────────────────────────────────────────────────────────────
async function fetchData() {
  const { data } = await sb.from('solar_readings').select('*');
  if (!data) return;
  state.rawData = data.sort((a,b) => a.year!==b.year ? a.year-b.year : (a.monthIdx||0)-(b.monthIdx||0));
}

async function upsertRecord(rec) {
  const { data, error } = await sb.from('solar_readings').upsert(rec).select();
  if (error) throw error;
  return data;
}

async function deleteRecord(id, fecha) {
  let query = sb.from('solar_readings').delete();
  
  if (id && id !== 'undefined') {
    const res = await query.eq('id', id).select();
    if (!res.error && res.data && res.data.length > 0) return;
  }
  
  if (fecha && fecha !== 'undefined') {
    const res = await sb.from('solar_readings').delete().eq('fecha', fecha).select();
    if (res.error) throw res.error;
    if (!res.data || res.data.length === 0) throw new Error('No se pudo eliminar. Verifica permisos o existencia.');
    return;
  }

  throw new Error('ID y fecha inválidos para eliminar.');
}

async function getUserRole(email) {
  const { data } = await sb.from('user_roles').select('role').eq('email', email).single();
  return data?.role || null;
}

async function getSolarConfig(userId) {
  const { data, error } = await sb.from('config_solar').select('*').eq('user_id', userId).single();
  if (error && error.code !== 'PGRST116') return null;
  return data;
}

async function upsertConfig(cfg) {
  const { error } = await sb.from('config_solar').upsert(cfg, { onConflict:'user_id' });
  if (error) throw error;
}

// ── Data Processing ───────────────────────────────────────────────────────────
function processData() {
  const raw = state.rawData;
  if (!raw || raw.length < 2) { state.processedData = []; return; }
  const out = [];
  for (let i = 1; i < raw.length; i++) {
    const prev = raw[i-1], curr = raw[i];
    const consumoRed = (curr.lecturaRed||0) - (prev.lecturaRed||0);
    const prodBruta  = (curr.lecturaSolar||0) - (prev.lecturaSolar||0);
    const consumoTotal = consumoRed + prodBruta;
    const precioKw = curr.precioKw||0;
    const prevPrecio = prev.precioKw||0;
    const incPrecio = prevPrecio > 0 ? ((precioKw-prevPrecio)/prevPrecio)*100 : 0;
    const autonomia = consumoTotal > 0 ? (prodBruta/consumoTotal)*100 : 0;
    const ahorroReal = prodBruta * precioKw;
    const label = `${monthName(curr.monthIdx).substring(0,3)} ${curr.year}`;
    out.push({ ...curr, label, consumoRed, prodBruta, consumoTotal, autonomia, incPrecio, ahorroReal, prevPrecio });
  }
  state.processedData = out;
}

function filterByYear(year) {
  if (year === 'all') return state.processedData;
  return state.processedData.filter(d => d.year === parseInt(year));
}

// ── Analytics ─────────────────────────────────────────────────────────────────
function calcProjections(data) {
  if (!data || data.length < 2) return { projectedPrice:'--', trend:'--', trendIcon:'fa-minus', trendColor:'text-slate-400', bestMonth:'--', co2:'--' };
  const n = data.length;
  let sx=0,sy=0,sxy=0,sx2=0;
  data.forEach((d,i)=>{ sx+=i; sy+=d.precioKw; sxy+=i*d.precioKw; sx2+=i*i; });
  const slope = (n*sxy-sx*sy)/(n*sx2-sx*sx);
  const intercept = (sy-slope*sx)/n;
  const proj = slope*n+intercept;
  const rising = slope>0;
  const best = data.reduce((m,d)=>d.prodBruta>m.prodBruta?d:m, data[0]);
  const co2 = (data.reduce((a,d)=>a+d.prodBruta,0)*0.38).toFixed(0);
  return {
    projectedPrice: fCOP(proj),
    trend: rising ? (state.lang==='es'?'En Alza':'Rising') : (state.lang==='es'?'A la Baja':'Falling'),
    trendIcon: rising?'fa-arrow-trend-up':'fa-arrow-trend-down',
    trendColor: rising?'text-red-400':'text-green-400',
    bestMonth: `${best.label} (${fDec(best.prodBruta,0)} kWh)`,
    co2: `${co2} kg`,
  };
}

function calcKPIs(viewData, allData) {
  if (!viewData||!viewData.length) return { savings:'--', gen:'--', autonomy:'--', varKw:'--', roi:'--', avgSavings:'--' };
  const totalSavings = viewData.reduce((a,d)=>a+(d.ahorroReal||0),0);
  const totalGen = viewData.reduce((a,d)=>a+(d.prodBruta||0),0);
  const avgAutonomy = viewData.reduce((a,d)=>a+(d.autonomia||0),0)/viewData.length;
  const avgVar = viewData.reduce((a,d)=>a+(d.incPrecio||0),0)/viewData.length;
  const investment = parseFloat(document.getElementById('roi-input-investment')?.value)||0;
  const installDate = localStorage.getItem('jfInstallDate')||'';
  let roi='--', avgSavings='--';
  if (allData?.length && installDate) {
    const [iY,iM] = installDate.split('-').map(Number);
    const valid = allData.filter(d=>d.year>iY||(d.year===iY&&(d.monthIdx||0)>=iM));
    if (valid.length) {
      const tot = valid.reduce((a,d)=>a+(d.ahorroReal||0),0);
      const avg = tot/valid.length;
      avgSavings = fCOP(avg);
      if (investment>0&&avg>0) roi=`${fDec(investment/(avg*12),1)} años`;
    }
  }
  return { savings:fCOP(totalSavings), gen:fKwh(totalGen), autonomy:fPct(avgAutonomy), varKw:`${avgVar>0?'+':''}${fDec(avgVar,2)}%`, roi, avgSavings };
}

// ── Charts ────────────────────────────────────────────────────────────────────
Chart.defaults.color='#64748b';
Chart.defaults.plugins.legend.labels.usePointStyle=true;

function renderEnergyChart(data) {
  const id='chart-energia'; if(state.charts[id]) state.charts[id].destroy();
  const ctx=document.getElementById(id); if(!ctx) return;
  const isLine=state.chartModes.energia==='line';
  state.charts[id]=new Chart(ctx,{
    type:state.chartModes.energia,
    data:{ labels:data.map(d=>d.label), datasets:[
      { label:state.lang==='es'?'Consumo Red':'Grid', data:data.map(d=>parseFloat(d.consumoRed)),
        backgroundColor:isLine?'rgba(244,63,94,.2)':'#F43F5E', borderColor:'#F43F5E', borderWidth:isLine?2:0, fill:isLine, tension:.4 },
      { label:'Solar', data:data.map(d=>parseFloat(d.prodBruta)),
        backgroundColor:isLine?'rgba(16,185,129,.2)':'#10B981', borderColor:'#10B981', borderWidth:isLine?2:0, fill:isLine, tension:.4 },
    ]},
    options:{ responsive:true, maintainAspectRatio:false,
      scales:{ x:{stacked:!isLine}, y:{stacked:!isLine, ticks:{callback:v=>`${v} kWh`}} },
      plugins:{ tooltip:{callbacks:{label:c=>`${c.dataset.label}: ${c.raw.toFixed(1)} kWh`}}, legend:{position:'top'} }
    }
  });
}

function renderPriceChart(data) {
  const id='chart-precio'; if(state.charts[id]) state.charts[id].destroy();
  const ctx=document.getElementById(id); if(!ctx) return;
  const isLine=state.chartModes.precio==='line';
  state.charts[id]=new Chart(ctx,{
    type:state.chartModes.precio,
    data:{ labels:data.map(d=>d.label), datasets:[
      { label:state.lang==='es'?'Precio kW':'kW Price', data:data.map(d=>d.precioKw),
        borderColor:'#F59E0B', backgroundColor:isLine?'rgba(245,158,11,.15)':'#F59E0B',
        borderWidth:isLine?2:0, fill:isLine, tension:.4, borderRadius:isLine?0:4 }
    ]},
    options:{ responsive:true, maintainAspectRatio:false,
      scales:{ y:{beginAtZero:true, ticks:{callback:v=>fCOP(v)}} },
      plugins:{ tooltip:{callbacks:{label:c=>`${c.dataset.label}: ${fCOP(c.raw)}`}}, legend:{position:'top'} }
    }
  });
}

function renderProjectionChart() {
  const id='chart-proyeccion'; if(state.charts[id]) state.charts[id].destroy();
  const ctx=document.getElementById(id); if(!ctx) return;
  
  const installDate = localStorage.getItem('jfInstallDate') || '';
  let validData = state.processedData || [];
  
  if (validData.length > 0 && installDate) {
    const [iY, iM] = installDate.split('-').map(Number);
    validData = validData.filter(d => d.year > iY || (d.year === iY && (d.monthIdx || 0) >= iM));
  }

  let currentGen = 0;
  let currentPrice = 0;
  
  if (validData.length > 0) {
    const last = validData[validData.length - 1];
    if (last && last.precioKw) currentPrice = last.precioKw;
    const totalGen = validData.reduce((a, d) => a + (d.prodBruta || 0), 0);
    currentGen = (totalGen / validData.length) * 12;
  } else if (state.processedData && state.processedData.length > 0) {
    const last = state.processedData[state.processedData.length-1];
    if (last && last.precioKw) currentPrice = last.precioKw;
    const totalGen = state.processedData.reduce((a,d)=>a+(d.prodBruta||0),0);
    currentGen = (totalGen / state.processedData.length) * 12;
  } else {
    currentGen = 9320;
    currentPrice = 950;
  }
  
  const labels = [];
  const genData = [];
  const anualAhorroData = [];
  const acumAhorroData = [];
  
  const deg = 0.004;
  const infl = 0.04;
  let acum = 0;
  
  const tableBody = document.getElementById('tabla-proyeccion-body');
  if (tableBody) tableBody.innerHTML = '';
  
  for (let i = 1; i <= 25; i++) {
    labels.push(i);
    genData.push(currentGen);
    const ahorro = currentGen * currentPrice;
    anualAhorroData.push(ahorro);
    acum += ahorro;
    acumAhorroData.push(acum);
    
    if (tableBody) {
      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
      tr.innerHTML = `
        <td style="padding:.5rem">${i}</td>
        <td style="text-align:right;padding:.5rem">${fDec(currentGen,0)}</td>
        <td style="text-align:right;padding:.5rem">${fCOP(ahorro)}</td>
        <td style="text-align:right;padding:.5rem;font-weight:bold;color:var(--solar)">${fCOP(acum)}</td>
      `;
      tableBody.appendChild(tr);
    }
    
    currentGen *= (1 - deg);
    currentPrice *= (1 + infl);
  }
  
  state.charts[id] = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: state.lang === 'es' ? 'Generación (kWh)' : 'Generation (kWh)',
          data: genData,
          borderColor: '#9333ea',
          backgroundColor: 'transparent',
          yAxisID: 'yGen',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.1
        },
        {
          label: state.lang === 'es' ? 'Ahorro Anual (COP)' : 'Annual Savings (COP)',
          data: anualAhorroData,
          borderColor: '#ef4444',
          backgroundColor: 'transparent',
          yAxisID: 'yAhorro',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.1
        },
        {
          label: state.lang === 'es' ? 'Ahorro Acumulado (COP)' : 'Cumulated Savings (COP)',
          data: acumAhorroData,
          borderColor: '#22c55e',
          backgroundColor: 'transparent',
          yAxisID: 'yAhorro',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: { title: { display: false } },
        yGen: {
          type: 'linear',
          display: true,
          position: 'left',
          title: { display: true, text: state.lang==='es'?'Generación (kWh)':'Generation (kWh)' },
          grid: { drawOnChartArea: true },
          ticks: { callback: v => fDec(v,0) }
        },
        yAhorro: {
          type: 'linear',
          display: true,
          position: 'right',
          title: { display: true, text: state.lang==='es'?'Ahorro (COP)':'Savings (COP)' },
          grid: { drawOnChartArea: false },
          ticks: { callback: v => '$' + (v / 1000000).toFixed(0) + 'M' }
        }
      },
      plugins: {
        legend: { position: 'top' },
        tooltip: {
          callbacks: {
            label: c => {
              if (c.dataset.yAxisID === 'yGen') return `${c.dataset.label}: ${fDec(c.raw,0)}`;
              return `${c.dataset.label}: ${fCOP(c.raw)}`;
            }
          }
        }
      }
    }
  });
}

// ── Table ─────────────────────────────────────────────────────────────────────
function renderTable(data) {
  const tbody=document.getElementById('table-body'); if(!tbody) return;
  tbody.innerHTML='';
  if(!data||!data.length){ tbody.innerHTML=`<tr><td colspan="7" style="text-align:center;padding:2rem;color:#64748b">${t('noData')}</td></tr>`; return; }
  data.forEach(row=>{
    const inc=parseFloat(row.incPrecio);
    const ic=inc>0?'text-red-400 fa-arrow-trend-up':inc<0?'text-green-400 fa-arrow-trend-down':'text-slate-400 fa-minus';
    const cc=inc>0?'color:#f87171':inc<0?'color:#4ade80':'color:#64748b';

    const tr=document.createElement('tr');
    tr.onclick=()=>document.getElementById(`det-${row.id}`)?.classList.toggle('hidden');
    tr.innerHTML=`
      <td class="py-3 px-4"><p class="font-bold text-accent">${row.label}</p><p class="text-xs text-muted">${row.fecha}</p></td>
      <td class="py-3 px-4 text-center text-xs text-muted">${(row.lecturaRed||0).toFixed(0)} <span style="opacity:.3">|</span> ${(row.lecturaSolar||0).toFixed(0)}</td>
      <td class="py-3 px-4 text-center font-bold">${fDec(row.consumoRed,1)} <span class="text-xs text-muted">kWh</span></td>
      <td class="py-3 px-4 text-center text-solar font-bold">${fDec(row.prodBruta,1)} <span class="text-xs text-muted">kWh</span></td>
      <td class="py-3 px-4 text-right">
        <div>${fCOP(row.precioKw||0)}</div>
        <div class="text-xs" style="${cc}"><i class="fa-solid ${ic} mr-1"></i>${Math.abs(inc).toFixed(1)}%</div>
      </td>
      <td class="py-3 px-4 text-right text-solar font-bold">${fCOP(row.ahorroReal)}</td>
      <td class="py-3 px-4 text-center admin-only${state.isAdmin?'':' hidden-auth'}">
        <button class="edit-btn" data-id="${row.id}" title="Editar" style="color:#64748b;background:none;border:none;cursor:pointer;margin-right:.5rem"><i class="fa-solid fa-pen"></i></button>
        <button class="del-btn" data-id="${row.id}" data-fecha="${row.fecha}" title="Eliminar" style="color:#64748b;background:none;border:none;cursor:pointer"><i class="fa-solid fa-trash"></i></button>
      </td>`;
    tbody.appendChild(tr);

    // detail row
    const dc=inc>0?'#f87171':inc<0?'#4ade80':'#64748b';
    const det=document.createElement('tr');
    det.id=`det-${row.id}`; det.className='hidden detail-row';
    det.innerHTML=`<td colspan="7"><div class="detail-inner">
      <div class="detail-section"><p style="color:var(--accent);font-weight:700;font-size:.65rem;text-transform:uppercase;margin-bottom:.25rem">Eficiencia</p>
        <p>Total: <span style="color:#fff">${fDec(row.consumoTotal,1)} kWh</span></p>
        <p>Autonomía: <span style="color:#a78bfa;font-weight:700">${fDec(row.autonomia,1)}%</span></p></div>
      <div class="detail-section"><p style="font-weight:700;font-size:.65rem;text-transform:uppercase;margin-bottom:.25rem">Prom. Diario</p>
        <p>Red: <span style="color:#fff">${fDec((row.consumoRed||0)/30,1)} kWh/d</span></p>
        <p>Sol: <span style="color:var(--solar)">${fDec((row.prodBruta||0)/30,1)} kWh/d</span></p></div>
      <div class="detail-section"><p style="font-weight:700;font-size:.65rem;text-transform:uppercase;margin-bottom:.25rem">Fluctuación</p>
        <p>Ant: <span>${fCOP(row.prevPrecio)}</span></p>
        <p>Dif: <span style="color:${dc}">${row.precioKw>=(row.prevPrecio||0)?'+':''}${fCOP((row.precioKw||0)-(row.prevPrecio||0))}</span></p></div>
    </div></td>`;
    tbody.appendChild(det);
  });

  if(state.isAdmin) {
    tbody.querySelectorAll('.edit-btn').forEach(btn=>btn.addEventListener('click',e=>{e.stopPropagation();openModal('edit',btn.dataset.id);}));
    tbody.querySelectorAll('.del-btn').forEach(btn=>btn.addEventListener('click',async e=>{
      e.stopPropagation();
      if(!confirm(t('deleteConfirm'))) return;
      
      const origHtml = btn.innerHTML;
      btn.innerHTML = `<i class="fa-solid fa-circle-notch spin"></i>`;
      btn.disabled = true;
      
      try {
        await deleteRecord(btn.dataset.id, btn.dataset.fecha);
        await fetchData(); processData(); render();
      } catch (err) {
        alert(`${t('error')}: ${err.message || 'No se pudo eliminar'}`);
        btn.innerHTML = origHtml;
        btn.disabled = false;
      }
    }));
  }
}

// ── Render ────────────────────────────────────────────────────────────────────
function render() {
  const year=document.getElementById('year-filter')?.value||'all';
  state.viewData=filterByYear(year);

  // table shows current year or all
  const curYear=new Date().getFullYear();
  const tableYear=year==='all'?curYear:parseInt(year);
  const tableData=state.processedData.filter(d=>d.year===tableYear);

  renderEnergyChart(state.viewData);
  renderPriceChart(state.viewData);
  renderProjectionChart();
  renderTable(tableData);

  const kpis=calcKPIs(state.viewData, state.processedData);
  setText('kpi-ahorro',kpis.savings);
  setText('kpi-produccion',kpis.gen);
  setText('kpi-autonomia',kpis.autonomy);
  setText('kpi-var-kw',kpis.varKw);
  setText('roi-time',kpis.roi);
  setText('roi-avg-savings',kpis.avgSavings);

  const proj=calcProjections(state.viewData);
  setText('ai-precio-futuro',proj.projectedPrice);
  setText('ai-mejor-mes',proj.bestMonth);
  setText('ai-co2',proj.co2);
  const tEl=document.getElementById('ai-tendencia');
  if(tEl) tEl.innerHTML=`<span class="${proj.trendColor}"><i class="fa-solid ${proj.trendIcon}"></i> ${proj.trend}</span>`;

  updateChartIcons();
}

const setText=(id,val)=>{ const el=document.getElementById(id); if(el) el.innerText=val; };

// ── Modal ─────────────────────────────────────────────────────────────────────
function openModal(action='new', id=null) {
  const modal=document.getElementById('add-record-modal'); if(!modal) return;
  document.getElementById('add-record-form')?.reset();
  const editId=document.getElementById('edit-id');
  if(editId) editId.value='';

  const esTitle=document.getElementById('modal-title-es');
  const enTitle=document.getElementById('modal-title-en');
  if(action==='new') {
    if(esTitle) esTitle.innerText='Nuevo Registro Cloud';
    if(enTitle) enTitle.innerText='New Cloud Record';
  } else if(action==='edit'&&id) {
    if(esTitle) esTitle.innerText='Editar Registro';
    if(enTitle) enTitle.innerText='Edit Record';
    const rec=state.rawData.find(d=>d.id===id);
    if(rec&&editId) {
      editId.value=rec.id;
      const f=document.getElementById('new-fecha'); if(f) f.value=rec.fecha;
      const lr=document.getElementById('new-lectura-red'); if(lr) lr.value=rec.lecturaRed||0;
      const ls=document.getElementById('new-lectura-solar'); if(ls) ls.value=rec.lecturaSolar||0;
      const p=document.getElementById('new-precio'); if(p) p.value=rec.precioKw||0;
    }
  }
  modal.classList.remove('hidden');
}

const closeModal=()=>document.getElementById('add-record-modal')?.classList.add('hidden');

// ── Chart icon toggle ─────────────────────────────────────────────────────────
function updateChartIcons() {
  const ei=document.getElementById('icon-chart-energia');
  const pi=document.getElementById('icon-chart-precio');
  if(ei) ei.className=`fa-solid ${state.chartModes.energia==='bar'?'fa-chart-area':'fa-chart-bar'}`;
  if(pi) pi.className=`fa-solid ${state.chartModes.precio==='line'?'fa-chart-bar':'fa-chart-line'}`;
}

// ── Language ──────────────────────────────────────────────────────────────────
function setLang(lang, flagCode, text) {
  state.lang=lang;
  document.body.setAttribute('data-lang',lang);
  const flagEl=document.getElementById('current-flag');
  const txtEl=document.getElementById('current-lang-text');
  if(flagEl) flagEl.innerHTML=`<img src="https://flagcdn.com/w20/${flagCode}.png" class="flag-img">`;
  if(txtEl) txtEl.innerText=text;
  document.activeElement?.blur();
  if(state.processedData.length) { processData(); render(); }
}

// ── Config Save (debounced) ───────────────────────────────────────────────────
const saveConfig=debounce(async()=>{
  if(!state.user) return;
  const inv=document.getElementById('roi-input-investment')?.value||'0';
  let dt=document.getElementById('roi-input-date')?.value||'';
  if(dt&&dt.length===7) dt+='-01';
  try {
    await upsertConfig({ user_id:state.user.id, inversion_cop:parseInt(inv)||0, fecha_instalacion:dt, updated_at:new Date().toISOString() });
    localStorage.setItem('jfInvestment',inv);
    localStorage.setItem('jfInstallDate',dt);
    ['roi-investment-saved','roi-date-saved'].forEach(id=>{ const el=document.getElementById(id); if(el){el.classList.remove('hidden');setTimeout(()=>el.classList.add('hidden'),2000);} });
    const si=document.getElementById('roi-status-indicator');
    if(si){si.innerText=state.lang==='es'?'(Guardado)':'(Saved)';si.style.color='#4ade80';setTimeout(()=>{si.innerText='';si.style.color='';},2000);}
    render();
  } catch(e){ alert('Error guardando configuración'); }
},1000);

// ── Load solar config ─────────────────────────────────────────────────────────
async function loadConfig() {
  if(!state.user) return;
  const cfg=await getSolarConfig(state.user.id);
  const invEl=document.getElementById('roi-input-investment');
  const dtEl=document.getElementById('roi-input-date');
  const si=document.getElementById('roi-status-indicator');
  if(cfg) {
    if(invEl) invEl.value=cfg.inversion_cop;
    if(dtEl) dtEl.value=cfg.fecha_instalacion?cfg.fecha_instalacion.substring(0,7):'';
    localStorage.setItem('jfInvestment',cfg.inversion_cop);
    localStorage.setItem('jfInstallDate',cfg.fecha_instalacion?cfg.fecha_instalacion.substring(0,7):'');
    if(si) si.innerText='';
  } else {
    if(invEl) invEl.value=0;
    if(dtEl) dtEl.value=new Date().toISOString().substring(0,7);
    if(si){ si.innerText=state.lang==='es'?'(Ingresa datos de inversión)':'(Enter investment data)'; si.style.color='#fb923c'; }
  }
}

// ── Auth helpers ──────────────────────────────────────────────────────────────
function showDashboard() {
  document.getElementById('loader')?.classList.add('hidden');
  document.getElementById('login-modal')?.classList.add('hidden');
  document.getElementById('main-dashboard')?.classList.remove('hidden');

  setText('active-user-email', state.user?.email||'');
  const rb=document.getElementById('user-role-badge');
  if(rb) rb.innerText=state.isAdmin?t('admin'):t('observer');

  document.querySelectorAll('.admin-only').forEach(el=>{
    if(state.isAdmin){ el.classList.remove('hidden-auth'); el.removeAttribute('disabled'); }
    else { el.classList.add('hidden-auth'); el.setAttribute('disabled','true'); }
  });
}

async function initDashboard() {
  document.getElementById('loader')?.classList.remove('hidden');
  document.getElementById('login-modal')?.classList.add('hidden');
  const role=await getUserRole(state.user.email);
  state.isAdmin=role==='admin';
  await fetchData();
  await loadConfig();
  processData();
  showDashboard();
  render();
}

// ── Event Listeners ───────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Login form
  document.getElementById('login-form')?.addEventListener('submit', async e=>{
    e.preventDefault();
    const email=document.getElementById('email')?.value;
    const pass=document.getElementById('password')?.value;
    const btn=document.getElementById('btn-login');
    const orig=btn?.innerHTML;
    if(btn){btn.innerHTML=`<i class="fa-solid fa-circle-notch spin"></i> ${t('connecting')}`;btn.disabled=true;}
    const {data,error}=await sb.auth.signInWithPassword({email,password:pass});
    if(error||!data.user){ alert(`${t('error')}: Verifica tus credenciales`); if(btn){btn.innerHTML=orig;btn.disabled=false;} return; }
    state.user=data.user;
    await initDashboard();
    if(btn){btn.innerHTML=orig;btn.disabled=false;}
  });

  // Logout
  document.getElementById('logout-btn')?.addEventListener('click', async e=>{
    e.preventDefault();
    await sb.auth.signOut();
    location.reload();
  });

  // Year filter
  document.getElementById('year-filter')?.addEventListener('change', render);

  // ROI inputs
  document.getElementById('roi-input-investment')?.addEventListener('input', saveConfig);
  document.getElementById('roi-input-date')?.addEventListener('change', saveConfig);

  // Save record form
  document.getElementById('add-record-form')?.addEventListener('submit', async e=>{
    e.preventDefault();
    const editId=document.getElementById('edit-id')?.value;
    const fecha=document.getElementById('new-fecha')?.value;
    const [year,month]=fecha.split('-');
    const rec={
      id: editId||`${year}-${month}`,
      year:parseInt(year), monthIdx:parseInt(month), fecha,
      lecturaRed:parseFloat(document.getElementById('new-lectura-red')?.value),
      lecturaSolar:parseFloat(document.getElementById('new-lectura-solar')?.value),
      precioKw:parseFloat(document.getElementById('new-precio')?.value),
    };
    const btn=document.getElementById('btn-save');
    const orig=btn?.innerHTML;
    if(btn){btn.innerHTML=`<i class="fa-solid fa-circle-notch spin"></i> ${t('saving')}`;btn.disabled=true;}
    try {
      await upsertRecord(rec);
      closeModal();
      await fetchData(); processData(); render();
    } catch(err){ alert(`${t('error')}: No se pudo guardar el registro`); }
    if(btn){btn.innerHTML=orig;btn.disabled=false;}
  });

  // Check session
  const {data:{session}}=await sb.auth.getSession();
  if(session?.user){ state.user=session.user; await initDashboard(); }
  else { document.getElementById('loader')?.classList.add('hidden'); document.getElementById('login-modal')?.classList.remove('hidden'); }
});

// ── Global handlers (onclick in HTML) ────────────────────────────────────────
window.setLang=(lang,flagCode,text)=>setLang(lang,flagCode,text);
window.openModal=(action,id)=>openModal(action,id);
window.closeModal=closeModal;
window.toggleChartType=(type)=>{
  if(type==='energia'){ state.chartModes.energia=state.chartModes.energia==='bar'?'line':'bar'; renderEnergyChart(state.viewData); }
  else { state.chartModes.precio=state.chartModes.precio==='line'?'bar':'line'; renderPriceChart(state.viewData); }
  updateChartIcons();
};
