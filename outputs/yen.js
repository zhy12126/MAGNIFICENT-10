const driverPeriods={};
const chartSeries={
  cnyjpy:{pair:'CNY / JPY',description:'1人民币可以兑换多少日元；数值上升表示人民币换日元更划算。',color:'#1aa774',periods:{}},
  usdjpy:{pair:'USD / JPY',description:'1美元可以兑换多少日元；数值上升通常表示日元相对美元走弱。',color:'#d46b63',periods:{}},
  usdcny:{pair:'USD / CNY',description:'1美元可以兑换多少人民币；数值上升通常表示人民币相对美元走弱。',color:'#d7923e',periods:{}}
};
const periodLabels={30:'1个月',180:'6个月',365:'1年',1095:'3年',1825:'5年'};
let activePair='cnyjpy',activeChartPeriod='180',dataReady=false;
const signed=value=>`${value>=0?'+':'−'}${Math.abs(value).toFixed(2)}%`;
const setDirection=(element,value)=>{element.classList.toggle('positive',value>=0);element.classList.toggle('negative',value<0)};
const trendControlPanel=document.querySelector('.trend-controls');
const trendCard=document.querySelector('.trend-card');
if(trendControlPanel&&trendCard&&trendControlPanel.parentElement!==trendCard){trendCard.appendChild(trendControlPanel);trendControlPanel.classList.add('trend-controls-bottom')}

function renderDrivers(period){
  const data=driverPeriods[period];
  if(!data)return;
  const jpyValue=document.querySelector('#jpy-driver-value'),cnyValue=document.querySelector('#cny-driver-value'),totalValue=document.querySelector('#driver-total-value');
  jpyValue.textContent=signed(data.jpy);cnyValue.textContent=signed(data.cny);totalValue.textContent=signed(data.total);
  setDirection(jpyValue,data.jpy);setDirection(cnyValue,data.cny);setDirection(totalValue,data.total);
  document.querySelector('#jpy-driver-copy').textContent=data.jpy>=0?'日元相对美元走弱':'日元相对美元走强';
  document.querySelector('#cny-driver-copy').textContent=data.cny>=0?'人民币相对美元走强':'人民币相对美元走弱';
  document.querySelector('#driver-total-label').textContent=`过去${periodLabels[period]}人民币兑日元变化（对数）`;
  const scale=Math.max(Math.abs(data.jpy),Math.abs(data.cny),.01);
  const jpyBar=document.querySelector('#jpy-driver-bar'),cnyBar=document.querySelector('#cny-driver-bar');
  for(const [bar,value] of [[jpyBar,data.jpy],[cnyBar,data.cny]]){bar.style.width=`${Math.max(5,Math.abs(value)/scale*82)}%`;bar.classList.toggle('positive-fill',value>=0);bar.classList.toggle('negative-fill',value<0)}
}

document.querySelector('[data-toggle="method"]').addEventListener('click',event=>{const box=document.querySelector('#method-box');box.classList.toggle('hidden');event.currentTarget.textContent=box.classList.contains('hidden')?'查看计算方法⌄':'收起计算方法⌃'});

function emptyChart(message){
  const canvas=document.querySelector('#fx-trend-chart'),ctx=canvas.getContext('2d'),dpr=window.devicePixelRatio||1,box=canvas.getBoundingClientRect(),width=Math.max(1,box.width),height=canvas.clientHeight||310;
  canvas.width=width*dpr;canvas.height=height*dpr;ctx.scale(dpr,dpr);ctx.clearRect(0,0,width,height);ctx.fillStyle='#87938d';ctx.font='12px Manrope';ctx.textAlign='center';ctx.fillText(message,width/2,height/2);
}
function hoverLabel(period,index){return period.dates?.[index]||'—'}
function drawFxChart(pair,hoverIndex=null){
  activePair=pair;const series=chartSeries[pair],period=series.periods[activeChartPeriod];
  if(!dataReady||!period){emptyChart('等待真实汇率数据');return}
  const canvas=document.querySelector('#fx-trend-chart'),ctx=canvas.getContext('2d'),dpr=window.devicePixelRatio||1,box=canvas.getBoundingClientRect(),width=Math.max(1,box.width),height=canvas.clientHeight||310;
  canvas.width=width*dpr;canvas.height=height*dpr;ctx.scale(dpr,dpr);ctx.clearRect(0,0,width,height);
  const pad={left:16,right:62,top:18,bottom:24},values=period.values,minValue=Math.min(...values),maxValue=Math.max(...values),range=Math.max(maxValue-minValue,.001),min=minValue-range*.16,max=maxValue+range*.16;
  const point=(value,index)=>({x:pad.left+(width-pad.left-pad.right)*index/(values.length-1),y:pad.top+(max-value)/(max-min)*(height-pad.top-pad.bottom)});
  ctx.font='10px DM Mono';ctx.textAlign='right';ctx.textBaseline='middle';
  for(let index=0;index<4;index++){const y=pad.top+(height-pad.top-pad.bottom)*index/3,value=max-(max-min)*index/3;ctx.beginPath();ctx.moveTo(pad.left,y);ctx.lineTo(width-pad.right,y);ctx.strokeStyle='#e7ece9';ctx.lineWidth=1;ctx.stroke();ctx.fillStyle='#8a958f';ctx.fillText(pair==='usdcny'?value.toFixed(3):value.toFixed(2),width-8,y)}
  const gradient=ctx.createLinearGradient(0,pad.top,0,height-pad.bottom);gradient.addColorStop(0,`${series.color}35`);gradient.addColorStop(1,`${series.color}00`);
  ctx.beginPath();values.forEach((value,index)=>{const p=point(value,index);index?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y)});const last=point(values.at(-1),values.length-1);ctx.lineTo(last.x,height-pad.bottom);ctx.lineTo(pad.left,height-pad.bottom);ctx.closePath();ctx.fillStyle=gradient;ctx.fill();
  ctx.beginPath();values.forEach((value,index)=>{const p=point(value,index);index?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y)});ctx.strokeStyle=series.color;ctx.lineWidth=2.7;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();
  ctx.beginPath();ctx.arc(last.x,last.y,4.5,0,Math.PI*2);ctx.fillStyle=series.color;ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();
  const tooltip=document.querySelector('#fx-chart-tooltip');
  if(Number.isInteger(hoverIndex)&&hoverIndex>=0&&hoverIndex<values.length){const selected=point(values[hoverIndex],hoverIndex),relative=(values[hoverIndex]/values[0]-1)*100,decimals=pair==='usdjpy'?2:4;ctx.beginPath();ctx.moveTo(selected.x,pad.top);ctx.lineTo(selected.x,height-pad.bottom);ctx.strokeStyle='#86938d';ctx.lineWidth=1;ctx.setLineDash([4,4]);ctx.stroke();ctx.setLineDash([]);ctx.beginPath();ctx.arc(selected.x,selected.y,5,0,Math.PI*2);ctx.fillStyle=series.color;ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=2.5;ctx.stroke();tooltip.innerHTML=`<b>${series.pair} · ${hoverLabel(period,hoverIndex)}</b><strong>${values[hoverIndex].toFixed(decimals)}</strong><span>相对周期起点</span><em class="${relative>=0?'positive':'negative'}">${signed(relative)}</em>`;tooltip.style.left=`${selected.x}px`;tooltip.style.top=`${selected.y}px`;tooltip.classList.toggle('flip',selected.x>width*.68);tooltip.classList.remove('hidden')}else tooltip.classList.add('hidden');
  document.querySelector('#trend-pair').textContent=series.pair;document.querySelector('#trend-current').textContent=series.current;
  const label=periodLabels[activeChartPeriod],change=document.querySelector('#trend-change');change.textContent=`过去${label} ${signed(period.change)}`;setDirection(change,period.change);
  document.querySelector('#trend-title').textContent=`过去${label}汇率走势`;document.querySelector('#chart-period-start').textContent=period.dates[0];document.querySelector('#trend-description').textContent=series.description;canvas.setAttribute('aria-label',`过去${label}${series.pair}走势图`);
}

document.querySelectorAll('[data-chart-pair]').forEach(button=>button.addEventListener('click',()=>{if(!dataReady)return;document.querySelectorAll('[data-chart-pair]').forEach(item=>item.classList.toggle('active',item===button));drawFxChart(button.dataset.chartPair)}));
document.querySelectorAll('[data-chart-period]').forEach(button=>button.addEventListener('click',()=>{if(!dataReady)return;activeChartPeriod=button.dataset.chartPeriod;document.querySelectorAll('[data-chart-period]').forEach(item=>item.classList.toggle('active',item===button));drawFxChart(activePair);renderDrivers(activeChartPeriod)}));
let chartResizeTimer;window.addEventListener('resize',()=>{clearTimeout(chartResizeTimer);chartResizeTimer=setTimeout(()=>drawFxChart(activePair),100)});
const trendCanvas=document.querySelector('#fx-trend-chart');
trendCanvas.addEventListener('pointermove',event=>{if(!dataReady)return;const rect=trendCanvas.getBoundingClientRect(),period=chartSeries[activePair].periods[activeChartPeriod],plotLeft=16,plotRight=62,plotWidth=Math.max(1,rect.width-plotLeft-plotRight),x=Math.min(plotWidth,Math.max(0,event.clientX-rect.left-plotLeft)),index=Math.round(x/plotWidth*(period.values.length-1));drawFxChart(activePair,index)});
trendCanvas.addEventListener('pointerleave',()=>drawFxChart(activePair));trendCanvas.addEventListener('pointercancel',()=>drawFxChart(activePair));

function applyPayload(payload){
  if(!payload||payload.schemaVersion!==1||!payload.periods||!payload.attribution)throw new Error('invalid yen-rate payload');
  for(const key of Object.keys(chartSeries)){
    const periods=payload.periods[key];if(!periods)throw new Error(`missing ${key}`);
    chartSeries[key].current=Number(payload.latest[key]).toFixed(key==='usdjpy'?2:4);
    for(const period of Object.keys(periodLabels)){const raw=periods[period];if(!raw?.points?.length)throw new Error(`missing ${key}/${period}`);chartSeries[key].periods[period]={change:Number(raw.change),values:raw.points.map(point=>Number(point.value)),dates:raw.points.map(point=>point.date)}}
  }
  for(const period of Object.keys(periodLabels)){const raw=payload.attribution[period];driverPeriods[period]={jpy:Number(raw.jpyContribution),cny:Number(raw.cnyContribution),total:Number(raw.totalLogChange),dominant:raw.dominant}}
  const provider=String(payload.source?.provider||'官方日频数据'),shortProvider=provider.includes('European Central Bank')?'ECB':'FRED';
  const latest=new Date(`${payload.latestCommonDate}T00:00:00Z`),today=new Date(),cursor=new Date(latest);let businessLag=0;
  while(cursor<today){cursor.setUTCDate(cursor.getUTCDate()+1);const day=cursor.getUTCDay();if(day!==0&&day!==6&&cursor<=today)businessLag++}
  const stale=businessLag>3,status=document.querySelector('[data-status-label]'),dot=document.querySelector('.demo-dot');
  status.textContent=stale?`${shortProvider} 数据延迟`:`${shortProvider} 日频数据`;dot?.classList.toggle('stale',stale);
  const generatedAt=new Date(payload.generatedAt),japanUpdated=Number.isNaN(generatedAt.getTime())?'—':new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(generatedAt).replaceAll('/','-');
  const updatedElement=document.querySelector('[data-updated]');updatedElement.textContent=japanUpdated;updatedElement.title=`汇率数据截至最近共同交易日 ${payload.latestCommonDate}`;
  dataReady=true;document.querySelector('#chart-data-source').textContent=`${shortProvider} 日频参考汇率 · 同日对齐`;renderDrivers('180');drawFxChart('cnyjpy');
}

async function loadRates(){
  emptyChart('正在加载真实汇率数据…');
  try{const response=await fetch('data/yen-rates.json',{cache:'no-cache'});if(!response.ok)throw new Error(`HTTP ${response.status}`);applyPayload(await response.json())}
  catch(error){console.error('Yen-rate data unavailable',error);document.querySelector('[data-status-label]').textContent='等待真实数据';document.querySelector('[data-updated]').textContent='尚未生成';document.querySelector('#trend-current').textContent='—';document.querySelector('#trend-change').textContent='等待日频数据';document.querySelector('#trend-description').textContent='首次运行汇率数据更新任务后，这里将显示官方真实历史序列。';emptyChart('真实汇率数据尚未生成')}
}
loadRates();

const eventLabels={
  country:{cn:['中国','cn-tag'],jp:['日本','jp-tag'],us:['美国','us-tag']},
  impact:{cny:['人民币侧',''],jpy:['日元侧',''],both:['两侧','both']}
};
const escapeHtml=value=>String(value).replace(/[&<>'"]/g,character=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[character]);
function renderEventCalendar(payload){
  if(!payload||payload.schemaVersion!==1||!Array.isArray(payload.events))throw new Error('invalid yen-event payload');
  const calendar=document.querySelector('#future-calendar');
  document.querySelector('.calendar-window').textContent=`未来${payload.windowDays||30}天`;
  if(!payload.events.length){calendar.innerHTML='<p class="calendar-empty">未来30天暂无已确认的重要官方日程。</p>';return}
  const weekdays=['周日','周一','周二','周三','周四','周五','周六'];
  calendar.innerHTML=payload.events.map(event=>{
    const datePart=String(event.datetime).slice(0,10),parts=datePart.split('-').map(Number),localDate=new Date(parts[0],parts[1]-1,parts[2]);
    const country=eventLabels.country[event.country]||['其他',''],impact=eventLabels.impact[event.impact]||['关注',''];
    return `<article${event.major?' class="calendar-major"':''}><time datetime="${escapeHtml(event.datetime)}"><span>${parts[1]}月</span><b>${parts[2]}</b><small>${weekdays[localDate.getDay()]}</small></time><div class="calendar-line"></div><div class="calendar-content"><div><span class="country-tag ${country[1]}">${country[0]}</span><em>${escapeHtml(event.timeLabel)}</em></div><h3><a href="${escapeHtml(event.sourceUrl)}" target="_blank" rel="noopener">${escapeHtml(event.title)}</a></h3><p>${escapeHtml(event.summary)}</p></div><span class="impact ${impact[1]}">${impact[0]}</span></article>`;
  }).join('');
}
async function loadEventCalendar(){
  try{const response=await fetch('data/yen-events.json',{cache:'no-cache'});if(!response.ok)throw new Error(`HTTP ${response.status}`);renderEventCalendar(await response.json())}
  catch(error){console.error('Yen event calendar unavailable',error);document.querySelector('#future-calendar').innerHTML='<p class="calendar-empty">事件日历暂时无法加载，请稍后刷新。</p>'}
}
loadEventCalendar();
