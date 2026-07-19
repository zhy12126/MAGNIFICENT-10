const fallbackStocks=[
 {name:'NVIDIA',ticker:'NVDA',logo:'N',color:'#d5f4b4',ink:'#55a62f',cap:'4.17T',pe:'53.6',fpe:'36.1',peg:'0.82',ps:'26.8',pcf:'—',implied:'—',growth:'45%',price:'$171.28',note:'等待公司级财报模型更新。'},
 {name:'Apple',ticker:'AAPL',logo:'●',color:'#111',ink:'#fff',cap:'3.12T',pe:'31.4',fpe:'28.6',peg:'2.41',ps:'7.6',pcf:'—',implied:'—',growth:'6%',price:'$210.16',note:'等待公司级财报模型更新。'},
 {name:'Microsoft',ticker:'MSFT',logo:'▦',color:'#e9f2ff',ink:'#1676d2',cap:'3.78T',pe:'37.0',fpe:'30.8',peg:'2.11',ps:'13.2',pcf:'—',implied:'—',growth:'15%',price:'$507.89',note:'等待公司级财报模型更新。'},
 {name:'Alphabet',ticker:'GOOGL',logo:'G',color:'#fff5e7',ink:'#4285f4',cap:'2.18T',pe:'20.4',fpe:'18.8',peg:'1.32',ps:'6.1',pcf:'—',implied:'—',growth:'15%',price:'$179.42',note:'等待公司级财报模型更新。'},
 {name:'Amazon',ticker:'AMZN',logo:'a',color:'#fff0dc',ink:'#111',cap:'2.46T',pe:'37.2',fpe:'29.1',peg:'1.55',ps:'3.7',pcf:'—',implied:'—',growth:'12%',price:'$235.68',note:'等待公司级财报模型更新。'},
 {name:'Meta',ticker:'META',logo:'∞',color:'#eaf1ff',ink:'#1768df',cap:'1.80T',pe:'28.6',fpe:'23.2',peg:'1.13',ps:'8.9',pcf:'—',implied:'—',growth:'17%',price:'$718.63',note:'等待公司级财报模型更新。'},
 {name:'Tesla',ticker:'TSLA',logo:'T',color:'#ffe8e8',ink:'#d93232',cap:'1.03T',pe:'171.0',fpe:'93.7',peg:'4.82',ps:'11.5',pcf:'—',implied:'—',growth:'10%',price:'$332.91',note:'等待公司级财报模型更新。'},
 {name:'TSMC',ticker:'TSM',logo:'◌',color:'#eaf8fb',ink:'#20899b',cap:'1.16T',pe:'29.7',fpe:'22.5',peg:'0.76',ps:'14.5',pcf:'—',implied:'—',growth:'27%',price:'$218.77',note:'等待公司级财报模型更新。'},
 {name:'Micron',ticker:'MU',logo:'μ',color:'#e8f7ed',ink:'#16834c',cap:'145B',pe:'28.1',fpe:'13.7',peg:'0.31',ps:'4.4',pcf:'—',implied:'—',growth:'58%',price:'$124.55',note:'等待公司级财报模型更新。'},
 {name:'Broadcom',ticker:'AVGO',logo:'B',color:'#fff0ea',ink:'#d34b28',cap:'—',pe:'—',fpe:'—',peg:'—',ps:'—',pcf:'—',implied:'—',growth:'—',price:'等待日终更新',note:'等待 Alpha Vantage 日更数据。'},
 {name:'Oracle',ticker:'ORCL',logo:'O',color:'#fff0f0',ink:'#c74634',cap:'—',pe:'—',fpe:'—',peg:'—',ps:'—',pcf:'—',implied:'—',growth:'—',price:'等待日终更新',note:'等待 Alpha Vantage 日更数据。'},
 {name:'Palantir',ticker:'PLTR',logo:'P',color:'#eef2f6',ink:'#1f2a35',cap:'—',pe:'—',fpe:'—',peg:'—',ps:'—',pcf:'—',implied:'—',growth:'—',price:'等待日终更新',note:'等待 Alpha Vantage 日更数据。'}
];
let stocks=fallbackStocks,historyByTicker={},nasdaqData=null,activeIndex=0,activePeriod='3年',activeValuationPeriod='3年',activePricePeriod='1年',lastUpdated='等待日更数据',activeNasdaqMetrics=new Set(['pe','forwardPe','pb']),sortKey='cap',sortDirection=-1,chartMode='valuation',activeValuationMetric='pe';
const formatJapanTime=value=>{const date=new Date(value);if(Number.isNaN(date.getTime()))return value||'等待日更数据';return `${new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(date)} Asia/Japan`};
const rankingDirection={pe:1,fpe:1,peg:1,ps:1,pcf:1,evEbitda:1,growth:-1,epsGrowthCurrent:-1};
const metricNumber=(stock,key)=>{if(key==='cap'){const text=String(stock.cap||'');const value=Number.parseFloat(text);return Number.isFinite(value)?value*(text.includes('T')?1e3:1):null}if(key==='name')return null;const value=Number.parseFloat(String(stock[key]??'').replace(/[$,%>]/g,''));return Number.isFinite(value)?value:null};
const rankClass=(stock,key)=>{if(!(key in rankingDirection))return'';const value=metricNumber(stock,key);if(value===null)return'';const valid=stocks.filter(s=>metricNumber(s,key)!==null).sort((a,b)=>(metricNumber(a,key)-metricNumber(b,key))*rankingDirection[key]),ticker=stock.ticker;if(key==='growth'||key==='epsGrowthCurrent')return valid.slice(0,2).some(s=>s.ticker===ticker)?'rank-good':'';if(valid.length<4)return'';if(valid.slice(0,2).some(s=>s.ticker===ticker))return'rank-good';if(valid.slice(-2).some(s=>s.ticker===ticker))return'rank-bad';return''};
const formatChange=value=>{const n=Number.parseFloat(String(value??'').replace('%',''));if(!Number.isFinite(n))return{label:'—',className:''};return{label:`${n>0?'+':''}${n.toFixed(1)}%`,className:n>0?'positive':n<0?'negative':''}};
let concentrationData=null;
const renderShareMetric=(key,valueId,noteId)=>{const metric=concentrationData?.metrics?.[key],value=document.querySelector(valueId),note=document.querySelector(noteId),hasShare=metric?.share!==null&&metric?.share!==undefined&&metric?.share!==''&&Number.isFinite(Number(metric.share));if(value)value.textContent=hasShare?`${Number(metric.share).toFixed(1)}%`:'—';if(note){const hasDelta=metric?.dailyChangePp!==null&&metric?.dailyChangePp!==undefined&&Number.isFinite(Number(metric.dailyChangePp)),delta=Number(metric?.dailyChangePp);if(hasDelta){note.textContent=`较前一份持仓 ${delta>0?'+':''}${delta.toFixed(2)}pp`;note.className=delta>0?'positive':delta<0?'negative':''}else{note.textContent=hasShare?'首个快照，等待下一交易日':'等待 SPY 日持仓更新';note.className=''}}};
const renderMag7Share=()=>{renderShareMetric('mag7','#mag7-share','#mag7-share-note');renderShareMetric('aiHardware','#semi-share','#semi-share-note')};
const brandDomains={NVDA:'nvidia.com',AAPL:'apple.com',MSFT:'microsoft.com',GOOGL:'google.com',AMZN:'amazon.com',META:'meta.com',TSLA:'tesla.com',TSM:'tsmc.com',MU:'micron.com',AVGO:'broadcom.com',ORCL:'oracle.com',PLTR:'palantir.com'};
const logo=(s,large=false)=>s.ticker==='MU'?`<div class="logo micron-mark${large?' lg':''}" aria-label="Micron logo"><span>micron</span></div>`:s.ticker==='TSM'?`<div class="logo tsmc-mark${large?' lg':''}" aria-label="TSMC logo"><span>tsmc</span></div>`:`<div class="logo${large?' lg':''}" style="background:${s.color};color:${s.ink}"><img src="https://www.google.com/s2/favicons?domain=${brandDomains[s.ticker]||''}&sz=128" alt="${s.name} logo" onload="this.nextElementSibling.style.display='none'" onerror="this.remove()"><span>${s.logo}</span></div>`;
function renderStocks(){const ordered=stocks.map(stock=>({stock}));if(sortKey)ordered.sort((a,b)=>{if(sortKey==='name')return a.stock.name.localeCompare(b.stock.name)*sortDirection;const av=metricNumber(a.stock,sortKey),bv=metricNumber(b.stock,sortKey);if(av===null)return 1;if(bv===null)return-1;return(av-bv)*sortDirection});document.querySelector('#stock-rows').innerHTML=ordered.map(({stock:s})=>{const change=formatChange(s.change);return`<article class="stock-row" data-ticker="${s.ticker}"><div class="company">${logo(s)}<div><div class="company-name">${s.name}</div><div class="ticker">${s.ticker}</div></div></div><div class="quote-cell"><span>${s.price||'—'}</span><small class="change ${change.className}">${change.label}</small></div><div class="cell">$${s.cap}</div><div class="cell ${rankClass(s,'pe')}">${s.pe}</div><div class="cell ${rankClass(s,'fpe')}">${s.fpe}</div><div class="cell ${rankClass(s,'peg')}">${s.peg}</div><div class="cell ${rankClass(s,'ps')}">${s.ps}</div><div class="cell ${rankClass(s,'pcf')}">${s.pcf||'—'}</div><div class="cell ${rankClass(s,'evEbitda')}">${s.evEbitda||'—'}</div><div class="implied ${rankClass(s,'implied')}">${s.implied}</div><div class="grow ${rankClass(s,'growth')}">${s.growth}</div><div class="grow ${rankClass(s,'epsGrowthCurrent')}">${s.epsGrowthCurrent||'—'}</div><div class="row-arrow">›</div></article>`}).join('');document.querySelectorAll('.stock-row').forEach(row=>row.addEventListener('click',()=>openDetail(row.dataset.ticker)));document.querySelectorAll('.sort-header').forEach(button=>{const active=button.dataset.sort===sortKey;button.classList.toggle('active-sort',active);button.textContent=button.dataset.sort===sortKey?`${button.dataset.sort==='evEbitda'?'EV/EBITDA':button.textContent.replace(/[↑↓]$/,'')}${sortDirection===1?' ↑':' ↓'}`:button.textContent.replace(/[↑↓]$/,'')});renderNasdaq()}
function renderNasdaq(){const drawSingle=(id,points,key,color,label)=>{const svg=document.querySelector(id);if(!points||points.length<2){svg.innerHTML=`<line class="grid" x1="76" y1="188" x2="980" y2="188"/><text class="axis" x="520" y="184" text-anchor="middle">等待导入真实 ${label} 历史数据</text>`;return}const vals=points.map(p=>Number(p[key])).filter(Number.isFinite),min=Math.floor(Math.min(...vals)/5)*5,max=Math.ceil(Math.max(...vals)/5)*5||5;let grid='';for(let i=0;i<5;i++){const y=62+i*63,v=(max-(max-min)*i/4).toFixed(0);grid+=`<line class="grid" x1="76" y1="${y}" x2="980" y2="${y}"/><text class="axis" x="12" y="${y+4}">${v}${key==='concentration'?'%':''}</text>`}const path=points.map((p,i)=>{const x=76+904*i/(points.length-1),y=314-(Number(p[key])-min)/(max-min)*252;return `${i?'L':'M'}${x},${y}`}).join(' ');svg.innerHTML=`${grid}<path class="line" stroke="${color}" d="${path}"/><text class="axis" x="76" y="350">${points[0].date}</text><text class="axis" x="980" y="350" text-anchor="end">${points.at(-1).date}</text>`};const mergeValuation=()=>{if(Array.isArray(nasdaqData?.valuationHistory))return nasdaqData.valuationHistory.map(p=>({date:p.date,pe:Number(p.pe),forwardPe:Number(p.forwardPe??p.fpe),pb:Number(p.pb??p.priceToBook)}));const rows={};for(const [key,series] of Object.entries({pe:nasdaqData?.peHistory||[],forwardPe:nasdaqData?.forwardPeHistory||nasdaqData?.fpeHistory||[],pb:nasdaqData?.pbHistory||[]})){for(const p of series){if(!rows[p.date])rows[p.date]={date:p.date};rows[p.date][key]=Number(p[key]??p.fpe??p.priceToBook)}}return Object.values(rows).sort((a,b)=>a.date.localeCompare(b.date))};const valuation=mergeValuation(),concentration=nasdaqData?.concentrationHistory||[],latest=valuation.at(-1),latestC=concentration.at(-1);const value=(key)=>latest&&Number.isFinite(latest[key])?`${latest[key].toFixed(1)}x`:'等待数据';document.querySelector('#ndx-pe').textContent=value('pe');document.querySelector('#ndx-forward-pe').textContent=value('forwardPe');document.querySelector('#ndx-pb').textContent=value('pb');document.querySelector('#ndx-date').textContent=latest?.date||'—';const svg=document.querySelector('#ndx-valuation-chart'),shown=[['pe','var(--orange)','左'],['forwardPe','var(--teal)','左'],['pb','var(--violet)','右']].filter(([key])=>activeNasdaqMetrics.has(key));if(!shown.length){svg.innerHTML=`<text class="axis" x="520" y="184" text-anchor="middle">请至少勾选一个指标</text>`}else{const leftKeys=shown.filter(v=>v[2]==='左').map(v=>v[0]),rightKeys=shown.filter(v=>v[2]==='右').map(v=>v[0]);const numbers=keys=>valuation.flatMap(p=>keys.map(key=>p[key])).filter(Number.isFinite);const range=vals=>{const lo=Math.min(...vals),hi=Math.max(...vals),pad=Math.max((hi-lo)*.12,1);return[Math.max(0,lo-pad),hi+pad]};const left=leftKeys.length?range(numbers(leftKeys)):null,right=rightKeys.length?range(numbers(rightKeys)):null;const y=(n,r)=>314-(n-r[0])/(r[1]-r[0])*252;let markup='';for(let i=0;i<5;i++){const yy=62+i*63;markup+=`<line class="grid" x1="76" y1="${yy}" x2="980" y2="${yy}"/>`;if(left){const v=(left[1]-(left[1]-left[0])*i/4).toFixed(1);markup+=`<text class="axis" x="12" y="${yy+4}">${v}x</text>`}if(right){const v=(right[1]-(right[1]-right[0])*i/4).toFixed(1);markup+=`<text class="axis" x="1028" y="${yy+4}" text-anchor="end">${v}x</text>`}}for(const [key,color,axis] of shown){const values=valuation.filter(p=>Number.isFinite(p[key]));if(values.length>1){const r=axis==='左'?left:right;const path=values.map((p,i)=>{const x=76+904*i/(values.length-1);return `${i?'L':'M'}${x.toFixed(1)},${y(p[key],r).toFixed(1)}`}).join(' ');markup+=`<path class="line" stroke="${color}" d="${path}"/>`}}if(valuation.length>1)markup+=`<text class="axis" x="76" y="350">${valuation[0].date}</text><text class="axis" x="980" y="350" text-anchor="end">${valuation.at(-1).date}</text>`;if(!valuation.length||shown.every(([key])=>!valuation.some(p=>Number.isFinite(p[key]))))markup+=`<text class="axis" x="520" y="184" text-anchor="middle">等待导入已勾选指标的真实历史数据</text>`;svg.innerHTML=markup}drawSingle('#ndx-concentration-chart',concentration,'concentration','var(--green)','集中度')}
function linePath(points,key,min,max){const left=76,right=980,top=62,bottom=314;return points.map((p,i)=>{const x=left+(right-left)*i/Math.max(1,points.length-1),y=bottom-(Number(p[key])-min)/(max-min)*(bottom-top);return `${i?'L':'M'}${x.toFixed(1)},${y.toFixed(1)}`}).join(' ')}
const valuationMetrics=[['pe','市盈率（TTM）','var(--orange)','orange'],['pcf','市现率（TTM）','var(--teal)','teal'],['ps','市销率（TTM）','var(--violet)','violet']];
const selectedValuationMetric=()=>valuationMetrics.find(([key])=>key===activeValuationMetric)||valuationMetrics[0];
const valuationScale=(points,metric)=>{const values=points.map(point=>Number(point[metric[0]])).filter(Number.isFinite).sort((a,b)=>a-b),quantile=p=>{const pos=(values.length-1)*p,base=Math.floor(pos),next=Math.ceil(pos);return values[base]+(values[next]-values[base])*(pos-base)};const band=values.length?{low:quantile(.2),high:quantile(.8)}:null;if(!values.length)return{min:0,max:5,band:null};let min=Math.max(0,Math.floor(Math.min(...values)/5)*5),max=Math.ceil(Math.max(...values)/5)*5;if(max<=min)max=min+5;return{min,max,band}};
const syncValuationMetricControls=()=>document.querySelectorAll('[data-valuation-metric]').forEach(button=>{const selected=button.dataset.valuationMetric===activeValuationMetric;button.classList.toggle('active',selected);button.setAttribute('aria-pressed',String(selected))});
function historicalLinePath(points,key,min,max){const left=76,right=980,top=62,bottom=314;let drawing=false;return points.map((point,index)=>{if(!numericValue(point[key])){drawing=false;return ''}const x=left+(right-left)*index/Math.max(1,points.length-1),y=bottom-(Number(point[key])-min)/(max-min)*(bottom-top),command=drawing?'L':'M';drawing=true;return `${command}${x.toFixed(1)},${y.toFixed(1)}`}).filter(Boolean).join(' ')}
const numericValue=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value));
function filterToAvailablePeriod(values){
  const ordered=values.slice().sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  const years=Number.parseInt(activePeriod,10),latest=ordered.at(-1);
  if(!latest||!Number.isFinite(years))return ordered;
  // Anchor the range to the latest observation, rather than today. A data
  // source that has only three years must therefore display its real three
  // years for a five- or ten-year selection instead of a misleading blank.
  const cutoff=new Date(`${latest.date}T00:00:00Z`);
  cutoff.setUTCFullYear(cutoff.getUTCFullYear()-years);
  return ordered.filter(point=>new Date(`${point.date}T00:00:00Z`)>=cutoff);
}
function filteredHistory(ticker){return filterToAvailablePeriod((historyByTicker[ticker]||[]).filter(p=>['pe','pcf','ps'].some(key=>numericValue(p[key]))))}
function filteredPriceHistory(ticker){return filterToAvailablePeriod((historyByTicker[ticker]||[]).filter(point=>numericValue(point.price)))}
function drawChart(s){
  const allPoints=(historyByTicker[s.ticker]||[]).filter(p=>['pe','pcf','ps'].some(key=>numericValue(p[key]))).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  const points=filterToAvailablePeriod(allPoints),svg=document.querySelector('#chart'),tooltip=document.querySelector('#chart-tooltip');
  const metrics=valuationMetrics,selectedMetric=selectedValuationMetric();
  const latest=points.at(-1)||{};const display=(value,key)=>value&&value!=='—'?value:(numericValue(latest[key])?Number(latest[key]).toFixed(1):'—');
  const current=metrics.map(([key,label,,color])=>[label,display(s[key],key),color]);const statDate=latest.date?`截至 ${latest.date}`:'当前日终值';
  document.querySelector('#stats').innerHTML=current.map((v,index)=>{const key=metrics[index][0],selected=key===selectedMetric[0];return`<button class="stat valuation-stat-picker${selected?' active':''}" type="button" data-valuation-metric="${key}" aria-pressed="${selected}"><div class="stat-label"><i class="${v[2]}"></i>${v[0]}</div><div class="stat-value">${v[1]}<span class="stat-unit">${v[1]==='—'?'':'倍'}</span></div><div class="stat-sub stat-date">${statDate}</div></button>`}).join('');
  const availableYears=allPoints.length>1?(new Date(`${allPoints.at(-1).date}T00:00:00Z`)-new Date(`${allPoints[0].date}T00:00:00Z`))/(365.25*24*60*60*1000):0;
  const selectedYears=Number.parseInt(activePeriod,10),range=points.length?`${points[0].date} 至 ${points.at(-1).date}`:'暂无可用估值历史';
  const availability=allPoints.length>1?`可用估值历史约 ${availableYears.toFixed(1)} 年（${allPoints[0].date} 至 ${allPoints.at(-1).date}）。`:'';
  const limitNotice=Number.isFinite(selectedYears)&&availableYears<selectedYears-.05?'所选范围超过可用数据，已显示全部可用历史。':'已按所选范围筛选。';
  document.querySelector('.chart-hover-hint').textContent=`按历史日收盘价和当时已公开的滚动四季财报重建；当前显示 ${range}。当前曲线：${selectedMetric[1]}；虚线分别为该时间范围的低估区阈值（20% 分位）与高估区阈值（80% 分位）。${availability}${limitNotice}`;
  tooltip.classList.add('hidden');if(points.length<2){svg.innerHTML=`<line class="grid" x1="76" y1="188" x2="980" y2="188"/><text class="axis" x="520" y="184" text-anchor="middle">真实估值历史会从每日快照开始累积（当前 ${points.length} 个数据点）</text>`;return}
  const {min,max,band}=valuationScale(points,selectedMetric),yFor=value=>314-(value-min)/(max-min)*252;let grid='';
  for(let i=0;i<5;i++){const y=62+i*63,val=(max-(max-min)*i/4).toFixed(0);grid+=`<line class="grid" x1="76" y1="${y}" x2="980" y2="${y}"/><text class="axis" x="12" y="${y+4}">${val}</text>`}
  const labels=[points[0].date,points[Math.floor(points.length/2)].date,points.at(-1).date];labels.forEach((d,i)=>grid+=`<text class="axis" x="${76+i*452}" y="350">${d}</text>`);
  const availableCount=points.filter(point=>numericValue(point[selectedMetric[0]])).length;
  const lines=availableCount>1?`<path class="line" stroke="${selectedMetric[2]}" d="${historicalLinePath(points,selectedMetric[0],min,max)}"/>`:'';
  const bandMarkup=band?`<rect x="76" y="62" width="904" height="${Math.max(0,yFor(band.high)-62).toFixed(1)}" fill="#ee8b2d" opacity=".055"/><rect x="76" y="${yFor(band.low).toFixed(1)}" width="904" height="${Math.max(0,314-yFor(band.low)).toFixed(1)}" fill="#1aa774" opacity=".055"/><line x1="76" y1="${yFor(band.high).toFixed(1)}" x2="980" y2="${yFor(band.high).toFixed(1)}" stroke="#d66f18" stroke-width="1.25" stroke-dasharray="5 5" opacity=".82"/><line x1="76" y1="${yFor(band.low).toFixed(1)}" x2="980" y2="${yFor(band.low).toFixed(1)}" stroke="#16885f" stroke-width="1.25" stroke-dasharray="5 5" opacity=".82"/><text class="axis" x="976" y="${Math.max(72,yFor(band.high)-5).toFixed(1)}" text-anchor="end">高估区 · 80% 分位 ${band.high.toFixed(1)}x</text><text class="axis" x="976" y="${Math.min(308,yFor(band.low)-5).toFixed(1)}" text-anchor="end">低估区 · 20% 分位 ${band.low.toFixed(1)}x</text>`:'';
  const peGaps=[];let gapStart=null;if(selectedMetric[0]==='pe')points.forEach((point,index)=>{if(!numericValue(point.pe)&&gapStart===null)gapStart=index;if((numericValue(point.pe)||index===points.length-1)&&gapStart!==null){const end=numericValue(point.pe)?index-1:index;if(end-gapStart>=4)peGaps.push([gapStart,end]);gapStart=null}});
  const gapNotes=peGaps.map(([start,end])=>{const x=76+904*((start+end)/2)/Math.max(1,points.length-1);return `<g class="pe-loss-gap"><rect x="${(x-86).toFixed(1)}" y="69" width="172" height="28" rx="14" fill="#fff4e8" stroke="#f2c896" stroke-width="1"/><text x="${x.toFixed(1)}" y="87" text-anchor="middle" fill="#b46117" style="font:600 10px DM Mono,monospace">亏损期，市盈率（TTM）不适用</text></g>`}).join('');
  svg.innerHTML=`${grid}<line class="grid" x1="76" y1="314" x2="980" y2="314"/>${bandMarkup}${lines}${gapNotes}<rect class="chart-hover-overlay" x="76" y="62" width="904" height="252" fill="transparent"/><line class="hover-guide hover-guide-x" y1="62" y2="314" style="display:none"/><line class="hover-guide hover-guide-y" x1="76" x2="980" style="display:none"/><g class="hover-points"></g>`;
}
function modelInputs(s){const m=s.valuationModel;if(!m||m.status!=='ready')return `<p class="eyebrow">IMPLIED-GROWTH INPUTS</p><h3>公司级模型输入</h3><p>当前没有足够的公司公开财报数据，因此隐含增长率显示为“—”，不会以行业均值代替。</p>`;const pct=v=>`${(Number(v)*100).toFixed(1)}%`;return `<p class="eyebrow">IMPLIED-GROWTH INPUTS</p><h3>公司级模型输入</h3><div class="model-grid"><span>TTM 自由现金流率<b>${pct(m.fcfMarginTTM)}</b></span><span>三年中位数<b>${pct(m.fcfMargin3yMedian)}</b></span><span>归一化 FCF 率<b>${pct(m.normalizedFcfMargin)}</b></span><span>权益成本<b>${pct(m.costOfEquity)}</b></span><span>Beta<b>${Number(m.beta).toFixed(2)}</b></span><span>永续增长<b>${pct(m.terminalGrowth)}</b></span></div><p class="model-note">截止财报期：${m.fiscalPeriodEnd}。${m.rationale} 数据来源：${m.source}。</p>`}
function openDetail(ticker){const i=stocks.findIndex(stock=>stock.ticker===ticker);if(i<0)return;activeIndex=i;const s=stocks[i];document.querySelector('#overview').classList.add('hidden');document.querySelector('#detail').classList.remove('hidden');const detailLogo=document.querySelector('#detail-logo');if(detailLogo)detailLogo.outerHTML=logo(s,true).replace('<div class="','<div id="detail-logo" class="');document.querySelector('#detail-ticker').textContent=s.ticker+' · NASDAQ';document.querySelector('#detail-name').textContent=s.name;document.querySelector('#detail-price').textContent=`${s.price}  ·  ${s.change||'—'}  ·  市值 $${s.cap}`;document.querySelector('#chart-title').textContent=`${s.name} 估值历史（TTM 估算）`;document.querySelector('#insight-copy').textContent=s.note;document.querySelector('#model-inputs').innerHTML=modelInputs(s);drawChart(s);window.scrollTo({top:0,behavior:'smooth'})}
document.querySelector('#back').addEventListener('click',()=>{document.querySelector('#detail').classList.add('hidden');document.querySelector('#overview').classList.remove('hidden');window.scrollTo({top:0,behavior:'smooth'})});document.querySelectorAll('.periods button').forEach(b=>b.addEventListener('click',()=>{document.querySelector('.periods .active').classList.remove('active');b.classList.add('active');activePeriod=b.textContent;if(chartMode==='price')activePricePeriod=activePeriod;else activeValuationPeriod=activePeriod;drawSelectedChart(stocks[activeIndex])}));document.querySelectorAll('nav button').forEach(button=>button.addEventListener('click',()=>{const view=button.dataset.view;document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('nav-active',b===button));document.querySelector('#overview').classList.toggle('hidden',view!=='overview');document.querySelector('#nasdaq').classList.toggle('hidden',view!=='nasdaq');document.querySelector('#detail').classList.add('hidden');if(view==='nasdaq')renderNasdaq();window.scrollTo({top:0,behavior:'smooth'})}));
document.querySelectorAll('.sort-header').forEach(button=>button.addEventListener('click',()=>{const key=button.dataset.sort;if(sortKey===key)sortDirection*=-1;else{sortKey=key;sortDirection=key==='name'?1:-1}renderStocks()}));
// The SPY snapshot must load independently: a missing optional data file must
// never leave the two concentration cards blank.  The query parameter also
// ensures a newly deployed daily snapshot is not served from a stale CDN cache.
const loadConcentration=async()=>{try{const response=await fetch(`data/concentration.json?v=${Date.now()}`,{cache:'no-store'});if(!response.ok)throw new Error(`SPY snapshot HTTP ${response.status}`);const data=await response.json();if(!data?.metrics)throw new Error('Invalid SPY snapshot');concentrationData=data;renderMag7Share()}catch(error){console.warn('Unable to load SPY concentration snapshot',error);renderMag7Share()}};
Promise.all([fetch('data/stocks.json',{cache:'no-store'}),fetch('data/history.json',{cache:'no-store'}),fetch('data/nasdaq.json',{cache:'no-store'})]).then(async([market,history,nasdaq])=>{if(market.ok){const data=await market.json();if(Array.isArray(data.stocks)&&data.stocks.length){const fetched=data.stocks.filter(stock=>!['SPCX','SKHY'].includes(stock.ticker));const missing=fallbackStocks.filter(stock=>!fetched.some(item=>item.ticker===stock.ticker));stocks=[...fetched,...missing];lastUpdated=formatJapanTime(data.updatedAt)||lastUpdated;renderStocks();const stamp=document.querySelector('.updated b');if(stamp)stamp.textContent=lastUpdated}}if(history.ok){const data=await history.json();historyByTicker=data.stocks||{}}if(nasdaq.ok){nasdaqData=await nasdaq.json();renderNasdaq()}syncDetailRoute();if(!document.querySelector('#detail').classList.contains('hidden'))drawSelectedChart(stocks[activeIndex])}).catch(error=>console.warn('Unable to load primary market data',error));loadConcentration();renderStocks();renderNasdaq();
document.querySelectorAll('[data-ndx-metric]').forEach(input=>input.addEventListener('change',()=>{input.checked?activeNasdaqMetrics.add(input.dataset.ndxMetric):activeNasdaqMetrics.delete(input.dataset.ndxMetric);renderNasdaq()}));
const metricHelp={company:['公司与股票代码','公司名称对应主要交易证券，股票代码用于从数据源匹配公开市场数据。点击公司行可查看详情。'],price:['最新股价','来自 Alpha Vantage Global Quote 的最近可用日终价格；免费方案不保证盘中实时。'], 'market-cap':['市值','市值 = 最新股价 × 流通在外普通股股数。它代表普通股权益价值，不包含净债务。'],pe:['PE（TTM）','PE = 市值 ÷ 过去十二个月归母净利润。亏损公司没有有意义的 PE，通常显示为“—”。'],'forward-pe':['预期 PE','Forward PE = 当前市值 ÷ 未来十二个月预期净利润。它随分析师预测变化，免费数据源可能有延迟。'],peg:['PEG','PEG = PE ÷ 预期盈利增长率（%）。它适合将估值和增长一并比较，但不能单独作为投资判断。'],ps:['市销率（P/S）','P/S = 市值 ÷ 过去十二个月营业收入。高毛利、高现金转化率的业务通常能承受更高的 P/S。'],'ev-ebitda':['EV/EBITDA','EV/EBITDA = 企业价值 ÷ EBITDA。它考虑资本结构，适合比较不同负债水平的公司。'],'revenue-growth':['收入同比（最近）','收入同比 = （本季收入 ÷ 去年同期收入 − 1）× 100%。这是最近已披露数据，不是分析师预测。'],'implied-growth':['隐含增长率','这是公司级反向 FCFE 模型的情景推算，不再使用行业统一自由现金流率。每家公司使用自身最近四季收入、经营现金流、资本开支和过去三年现金流中位数；权益成本则由该股 Beta、无风险利率和股权风险溢价计算。<h3>计算逻辑</h3><div class="modal-formula">权益价值 = Σ[t=1..5] 收入₀(1+g)ᵗ × FCF率ₜ ÷ (1+Ke)ᵗ + 终值 ÷ (1+Ke)⁵</div><p>FCF率会从公司当前 TTM 值，逐年过渡到该公司自己的归一化现金流率；归一化值按该公司设定的权重结合 TTM 与三年中位数。Ke = 无风险利率 + Beta × 股权风险溢价，永续增长率为 2.5%。通过二分法求解 g，使模型权益价值等于当前市值。</p><p>资本开支快速上升的平台公司更重视当前现金流；汽车、晶圆厂和存储公司更重视自身三年中位数以降低周期影响。公开财报不足的公司显示“—”，不会套用行业数据。详情页会列出每家公司的实际输入、截止期与计算依据。</p>']};
const modal=document.querySelector('#metric-modal');const closeModal=()=>modal.classList.add('hidden');document.querySelectorAll('.help[data-metric],.detail-metric-help[data-metric]').forEach(link=>link.addEventListener('click',event=>{event.preventDefault();const [title,content]=metricHelp[link.dataset.metric]||metricHelp.company;document.querySelector('#modal-title').textContent=title;document.querySelector('#modal-content').innerHTML=content.includes('<')?content:`<p>${content}</p>`;modal.classList.remove('hidden')}));document.querySelector('#modal-close').addEventListener('click',closeModal);modal.addEventListener('click',event=>{if(event.target===modal)closeModal()});document.addEventListener('keydown',event=>{if(event.key==='Escape')closeModal()});
const drawNasdaq=renderNasdaq;renderNasdaq=()=>{drawNasdaq();const rows=nasdaqData?.valuationHistory||nasdaqData?.peHistory||[];if(!rows.length)document.querySelector('#ndx-valuation-chart').innerHTML='<text class="axis" x="520" y="184" text-anchor="middle">等待导入真实 PE、前瞻 PE 与市净率历史数据</text>'};renderNasdaq();
Object.assign(metricHelp,{
  company:['公司与股票代码',`<p class="plain-lead">这一列告诉你：表格里的数字属于哪家公司，以及该去哪里找到它的股票。</p><h3>怎么理解</h3><p>公司名是经营实体，股票代码则像它在交易所里的“身份证”。例如 Apple 的代码是 AAPL；买卖股票时输入的是代码，而不是中文公司名。</p><div class="beginner-tip">同一家公司可能在不同交易所拥有不同代码。本页会尽量使用主要上市证券，点击公司行可查看它的估值历史。</div>`],
  price:['最新股价',`<p class="plain-lead">买 1 股这家公司的股票，最近一个交易日大约要花多少钱。</p><h3>怎么理解</h3><p>股价是“单价”，不是公司大小。$1,000 的股票不一定比 $20 的股票贵：还要看它一共发行了多少股。</p><h3>怎么看</h3><p>下方的绿色或红色百分比，是相对上一个交易日收盘价的涨跌。免费行情以日终数据为主，休市日会保留最近一次收盘价。</p><div class="beginner-tip">想比较公司体量，请优先看右边的“市值”，不要只比较单股价格。</div>`],
  'market-cap':['市值',`<p class="plain-lead">把公司所有流通股票按当前价格加总后，市场给这家公司的“整体标价”。</p><h3>计算方式</h3><div class="modal-formula">市值 = 最新股价 × 流通在外股票数量</div><h3>怎么理解</h3><p>可以把它想成一套房子的总价；单股价格只是“每一块砖”的价格。市值越大，通常代表市场认为公司整体越值钱，但不等于公司账上有这么多现金。</p><div class="beginner-tip">市值只代表股东权益价值，不扣除债务也不加回现金；比较资本结构时可同时看 EV/EBITDA。</div>`],
  pe:['PE（TTM）',`<p class="plain-lead">市场愿意为公司已经赚到的每 1 元利润，支付多少元价格。</p><h3>计算方式</h3><div class="modal-formula">PE = 市值 ÷ 过去 12 个月净利润</div><h3>怎么理解</h3><p>PE 为 20 倍，可以粗略理解为：若利润永远不变、且全部归股东，市场给出的价格约相当于 20 年利润。它不是实际回本年限，但很适合快速感受“价格相对利润有多高”。</p><h3>怎么看</h3><p>PE 高，可能是市场预期利润会快速增长；也可能只是价格太高。PE 低，可能是便宜，也可能是市场担心利润会下降。</p><div class="beginner-tip">亏损公司没有有意义的 PE，所以显示“—”。跨不同行业直接比较 PE 也容易误导。</div>`],
  'forward-pe':['预期 PE',`<p class="plain-lead">市场用“未来可能赚到的利润”来衡量今天的价格，而不是只看已经发生的利润。</p><h3>计算方式</h3><div class="modal-formula">前瞻 PE = 当前市值 ÷ 未来 12 个月预期净利润</div><h3>怎么理解</h3><p>它像看一家餐厅明年的预计盈利，而不是只看去年账本。若前瞻 PE 明显低于当前 PE，通常表示市场预计利润会上升。</p><h3>注意</h3><p>“预期”来自分析师估计，会调整、也会出错。它不是公司承诺的业绩，更不是保证收益。</p><div class="beginner-tip">把 PE 和前瞻 PE 放在一起看，能帮助判断市场到底在期待多大的盈利改善。</div>`],
  peg:['PEG',`<p class="plain-lead">把“估值有多高”和“利润预计增长多快”放到同一个简单比值里。</p><h3>计算方式</h3><div class="modal-formula">PEG = PE ÷ 预期盈利增长率（%）</div><h3>怎么理解</h3><p>例如 PE 为 30 倍、预期盈利增长 30%，PEG 约为 1。它试图回答：为了增长速度付出的估值，是否过高？</p><h3>怎么看</h3><p>PEG 低于 1 常被视为“增长相对便宜”，但这不是买入信号；增长预测一旦下调，PEG 会迅速变差。</p><div class="beginner-tip">PEG 对“预期增长率”非常敏感，周期股、利润基数很低的公司尤其容易失真。</div>`],
  ps:['市销率（P/S）',`<p class="plain-lead">市场愿意为公司每 1 元营业收入支付多少元价格。</p><h3>计算方式</h3><div class="modal-formula">P/S = 市值 ÷ 过去 12 个月营业收入</div><h3>怎么理解</h3><p>收入是卖出去的总金额，不等于最终赚到的钱。P/S 特别适合利润暂时很低、但收入已经快速增长的公司。</p><h3>怎么看</h3><p>高 P/S 可能反映高毛利、强品牌或高增长，也可能说明市场定价激进。低 P/S 不一定便宜：如果利润率很差，低倍数也可能合理。</p><div class="beginner-tip">看 P/S 时最好同时看自由现金流、利润率和收入增长，不能只看收入规模。</div>`],
  'ev-ebitda':['EV/EBITDA',`<p class="plain-lead">把“买下整家公司要付出的总成本”和它的核心经营赚钱能力相比。</p><h3>计算方式</h3><div class="modal-formula">EV/EBITDA = 企业价值 ÷ EBITDA</div><h3>怎么理解</h3><p>企业价值（EV）可以粗略理解为市值再考虑债务与现金；EBITDA 则是扣除利息、税、折旧和摊销前的经营利润。它比只看市值更适合比较负债水平不同的公司。</p><h3>注意</h3><p>EBITDA 不是自由现金流，不能替代真正的现金流分析。资本开支很大的公司，即使 EBITDA 好看，也可能需要持续投入大量现金。</p><div class="beginner-tip">倍数高低仍需结合增长、负债、资本开支和行业周期一起判断。</div>`],
  'revenue-growth':['收入同比（现在）',`<p class="plain-lead">公司最近披露季度的销售额，比一年前同一季度增长或下降了多少。</p><h3>计算方式</h3><div class="modal-formula">收入同比 = （本季收入 ÷ 去年同期收入 − 1）× 100%</div><h3>怎么理解</h3><p>用“去年同一个季节”比较，可以避开节假日、旺季淡季造成的错觉。例如零售企业第四季度通常比第三季度高，直接环比很容易误判。</p><h3>注意</h3><p>这是已经发生的增长，不是未来预测。很高的同比也可能只是去年基数特别低。</p><div class="beginner-tip">增长率要结合收入规模看：10% 的巨额收入增长，可能比 80% 的小基数增长更有分量。</div>`],
  'forward-revenue-growth':['收入增长（未来预期）',`<p class="plain-lead">未来 12 个月收入相对过去 12 个月的预期增速，通常来自分析师一致预期。</p><h3>当前数据状态</h3><p>目前 Alpha Vantage 免费 OVERVIEW 接口不提供可靠的公司级未来收入一致预期，因此这里会显示“—”，而不会用历史收入增长或隐含增长率冒充分析师预期。</p><div class="beginner-tip">接入带有 revenue estimates 的数据源后，此处会显示实际预期值与对应的预测期间。</div>`],
  'eps-growth':['EPS 增长（现在）',`<p class="plain-lead">公司最近披露季度的每股收益（EPS），比去年同一季度增长或下降了多少。</p><h3>计算方式</h3><div class="modal-formula">EPS 同比 = （本季稀释后 EPS ÷ 去年同期稀释后 EPS − 1）× 100%</div><h3>怎么理解</h3><p>EPS 同时受到净利润和股份数量变化影响。公司回购股票会减少股数，因此 EPS 增长可能快于净利润增长。</p><div class="beginner-tip">如果去年同期 EPS 为负，百分比增长通常没有可比意义，页面会显示“—”。</div>`],
  'forward-eps-growth':['EPS 增长（未来预期）',`<p class="plain-lead">用当前 TTM PE 与 Forward PE 在同一股价下反推的未来 12 个月 EPS 增长率。</p><h3>计算方式</h3><div class="modal-formula">未来 EPS 增长 ≈ PE（TTM）÷ 预期 PE − 1</div><h3>怎么理解</h3><p>例如 TTM PE 为 30 倍、预期 PE 为 20 倍，则市场对应的前瞻 EPS 大约比 TTM 高 50%。Forward PE 的分母通常参考市场的前瞻盈利预期。</p><div class="beginner-tip">它反映估值数据隐含的前瞻盈利变化，不是公司管理层的业绩承诺；预期 PE 更新后，这个数也会随之变化。</div>`],
  'implied-growth':['隐含增长率',`<p class="plain-lead">不是分析师预测，而是反过来问：要让“今天的市值”显得合理，公司未来五年的收入平均每年需要增长多快？</p><h3>怎么理解</h3><p>把当前股价当成一道考试题。若隐含增长率是 25%，表示在本模型的现金流与风险假设下，公司需要大约连续五年每年增长 25%，才能支撑今天的定价。</p><h3>模型怎么做</h3><p>每家公司使用自己的最近四季收入、经营现金流、资本开支、三年现金流率中位数和 Beta；现金流率逐步从当前水平过渡到该公司的归一化水平。</p><div class="modal-formula">权益价值 = 未来自由现金流的折现值 + 终值<br>Ke = 无风险利率 + Beta × 股权风险溢价</div><h3>怎么看</h3><p>数值高，表示市场定价对未来增长要求高，兑现难度也更大；数值低，不代表一定便宜，可能只是市场担心业务、利润率或现金流。</p><div class="beginner-tip">它是“市场需要什么结果”的情景尺子，不是目标价或买卖建议。公开财报不足的公司会显示“—”，不会硬套行业平均数。</div>`]
});

// SVG children (paths, grid lines and the invisible overlay) can differ between
// browsers. Delegating from the document guarantees that any pointer movement
// within the plot produces the same tooltip.
document.addEventListener('pointermove',event=>{
  if(chartMode==='price')return;
  const svg=event.target instanceof Element?event.target.closest('#chart'):null;
  if(!svg||document.querySelector('#detail').classList.contains('hidden'))return;
  const points=filteredHistory(stocks[activeIndex].ticker);
  if(points.length<2)return;
  const tooltip=document.querySelector('#chart-tooltip'),rect=svg.getBoundingClientRect();
  const viewX=(event.clientX-rect.left)*1040/rect.width;
  if(viewX<76||viewX>980||event.clientY<rect.top+62*rect.height/400||event.clientY>rect.top+314*rect.height/400)return;
  const index=Math.max(0,Math.min(points.length-1,Math.round((viewX-76)/904*(points.length-1))));
  const point=points[index],x=76+904*index/Math.max(1,points.length-1);
  const guide=svg.querySelector('.hover-guide');
  if(guide){guide.setAttribute('x1',x);guide.setAttribute('x2',x);guide.style.display='block'}
  const metrics=[['pe','P/E GAAP','orange'],['pcf','Price / CF','teal'],['ps','Price / Sales','violet']];
  tooltip.innerHTML=`<b>${point.date}</b>${metrics.map(([key,label,color])=>numericValue(point[key])?`<span><i class="${color}"></i>${label} <strong>${Number(point[key]).toFixed(1)}x</strong></span>`:'').join('')}`;
  tooltip.style.left=`${Math.max(8,Math.min(rect.width-190,event.clientX-rect.left+12))}px`;
  tooltip.style.top=`${Math.max(8,event.clientY-rect.top+10)}px`;
  tooltip.classList.remove('hidden');
});

// Phones do not emit mousemove while a finger is on the chart. Translate the
// finger position into the existing hover interaction so the crosshair, dots
// and transparent data card work on both chart modes.
['touchstart','touchmove'].forEach(type=>document.addEventListener(type,event=>{
  const touch=event.touches[0],target=touch&&document.elementFromPoint(touch.clientX,touch.clientY);
  if(!(target instanceof Element)||!target.closest('#chart'))return;
  event.preventDefault();
  target.dispatchEvent(new MouseEvent('mousemove',{bubbles:true,clientX:touch.clientX,clientY:touch.clientY}));
},{passive:false}));
document.addEventListener('touchend',()=>{
  const svg=document.querySelector('#chart'),tooltip=document.querySelector('#chart-tooltip');
  if(!svg)return;
  svg.querySelectorAll('.hover-guide').forEach(guide=>guide.style.setProperty('display','none'));
  const points=svg.querySelector('.hover-points');
  if(points)points.innerHTML='';
  if(tooltip)tooltip.classList.add('hidden');
});
document.addEventListener('pointerout',event=>{
  const from=event.target instanceof Element?event.target.closest('#chart'):null;
  const to=event.relatedTarget instanceof Element?event.relatedTarget.closest('#chart'):null;
  if(from&&!to){const svg=document.querySelector('#chart'),tooltip=document.querySelector('#chart-tooltip');svg.querySelectorAll('.hover-guide').forEach(guide=>guide.style.setProperty('display','none'));const points=svg.querySelector('.hover-points');if(points)points.innerHTML='';tooltip.classList.add('hidden')}
});

// The historical series is calculated from trailing twelve-month GAAP profit.
// Keep labels in the dynamically rendered cards consistent with that definition.
const labelPeAsTtm=()=>document.querySelectorAll('#stats .stat-label').forEach(label=>{
  if(label.textContent.includes('P/E GAAP'))label.lastChild.nodeValue='PE（TTM）';
});
new MutationObserver(labelPeAsTtm).observe(document.querySelector('#stats'),{childList:true,subtree:true});
labelPeAsTtm();

// Use the chart container rather than individual SVG paths as the hit area.
// This also works in the blank space between lines and keeps the tooltip above
// the scrolling SVG rather than being clipped by it.
document.addEventListener('mousemove',event=>{
  if(chartMode==='price')return;
  const wrap=event.target instanceof Element?event.target.closest('.chart-wrap'):null;
  const detail=document.querySelector('#detail'),svg=wrap?.querySelector('#chart');
  if(!svg||detail.classList.contains('hidden'))return;
  const points=filteredHistory(stocks[activeIndex].ticker),rect=svg.getBoundingClientRect();
  const xInView=(event.clientX-rect.left)*1040/rect.width;
  const yInView=(event.clientY-rect.top)*400/rect.height;
  if(points.length<2||xInView<76||xInView>980||yInView<62||yInView>314)return;
  const index=Math.max(0,Math.min(points.length-1,Math.round((xInView-76)/904*(points.length-1))));
  const point=points[index],guide=svg.querySelector('.hover-guide');
  const guideX=76+904*index/Math.max(points.length-1,1);
  if(guide){guide.setAttribute('x1',guideX);guide.setAttribute('x2',guideX);guide.style.display='block'}
  const tooltip=document.querySelector('#chart-tooltip');
  const rows=[['pe','PE（TTM）','orange'],['pcf','Price / CF','teal'],['ps','Price / Sales','violet']]
    .filter(([key])=>numericValue(point[key]))
    .map(([key,label,color])=>`<span><i class="${color}"></i>${label}<strong>${Number(point[key]).toFixed(1)}x</strong></span>`).join('');
  tooltip.innerHTML=`<b>${point.date}</b>${rows}`;
  tooltip.style.left=`${Math.min(window.innerWidth-195,event.clientX+14)}px`;
  tooltip.style.top=`${Math.min(window.innerHeight-125,event.clientY+14)}px`;
  tooltip.classList.remove('hidden');
});

// SPY weight cards open their own history view.  These histories are built
// from daily State Street holdings snapshots, so a newly introduced basket may
// initially have only one observation.
const concentrationConfigs={
  mag7:{title:'MAG7 占标普 500 权重历史',subtitle:'以 SPY 每日持仓作为标普 500 代理；数值为 MAG7 在 SPY 中的合计权重。',color:'#1aa774'},
  aiHardware:{title:'AI 算力硬件指数占标普 500 权重历史',subtitle:'以 SPY 每日持仓作为标普 500 代理；覆盖芯片、设备、EDA、服务器、网络与基础设施。',color:'#5579d8'}
};
const concentrationModal=document.querySelector('#concentration-modal');
const closeConcentrationModal=()=>concentrationModal.classList.add('hidden');
const drawConcentrationHistory=key=>{
  const config=concentrationConfigs[key],wrap=document.querySelector('#concentration-chart-wrap');
  if(!config||!wrap)return;
  document.querySelector('#concentration-title').textContent=config.title;
  document.querySelector('#concentration-subtitle').textContent=config.subtitle;
  const points=(concentrationData?.history||[]).filter(item=>numericValue(item?.[key])).map(item=>({date:String(item.date),value:Number(item[key])})).sort((a,b)=>a.date.localeCompare(b.date));
  if(points.length<2){
    const current=points[0]?.value;
    wrap.innerHTML=`<div class="concentration-empty">${current===undefined?'暂无可用历史快照。':'当前快照为 '+current.toFixed(1)+'%。'}<br>需要至少两个交易日的 SPY 日持仓快照后才能绘制趋势线。</div>`;
    return;
  }
  const width=760,left=56,right=730,top=22,bottom=270,values=points.map(point=>point.value),rawMin=Math.min(...values),rawMax=Math.max(...values),padding=Math.max((rawMax-rawMin)*.18,.25),min=Math.max(0,rawMin-padding),max=rawMax+padding,range=max-min||1;
  const x=index=>left+(right-left)*index/(points.length-1),y=value=>bottom-(value-min)/range*(bottom-top);
  let grid='';
  for(let index=0;index<5;index++){const yy=top+(bottom-top)*index/4,value=max-(max-min)*index/4;grid+=`<line class="grid" x1="${left}" y1="${yy}" x2="${right}" y2="${yy}"/><text class="axis" x="4" y="${yy+4}">${value.toFixed(1)}%</text>`}
  const path=points.map((point,index)=>`${index?'L':'M'}${x(index).toFixed(1)},${y(point.value).toFixed(1)}`).join(' ');
  const last=points.at(-1),lastX=x(points.length-1),lastY=y(last.value);
  wrap.innerHTML=`<svg class="concentration-chart" viewBox="0 0 ${width} 312" role="img" aria-label="${config.title}">${grid}<path class="line" stroke="${config.color}" d="${path}"/><circle class="dot" cx="${lastX}" cy="${lastY}" r="5" fill="${config.color}"/><text class="axis" x="${left}" y="298">${points[0].date}</text><text class="axis" x="${right}" y="298" text-anchor="end">${last.date}</text><text class="axis" x="${Math.max(left,lastX-6)}" y="${Math.max(16,lastY-10)}" text-anchor="end">${last.value.toFixed(1)}%</text></svg>`;
};
document.querySelectorAll('[data-concentration-metric]').forEach(button=>button.addEventListener('click',()=>{drawConcentrationHistory(button.dataset.concentrationMetric);concentrationModal.classList.remove('hidden')}));
document.querySelector('#concentration-close').addEventListener('click',closeConcentrationModal);
concentrationModal.addEventListener('click',event=>{if(event.target===concentrationModal)closeConcentrationModal()});
document.addEventListener('keydown',event=>{if(event.key==='Escape')closeConcentrationModal()});
document.addEventListener('mouseout',event=>{
  const leaving=event.target instanceof Element?event.target.closest('.chart-wrap'):null;
  const entering=event.relatedTarget instanceof Element?event.relatedTarget.closest('.chart-wrap'):null;
  if(leaving&&!entering){const svg=document.querySelector('#chart');document.querySelector('#chart-tooltip').classList.add('hidden');svg.querySelectorAll('.hover-guide').forEach(guide=>guide.style.setProperty('display','none'));const points=svg.querySelector('.hover-points');if(points)points.innerHTML=''}
});

// Keep x-axis dates tied to the actual first, middle and last data points.
const alignHistoryAxisDates=()=>{
  const svg=document.querySelector('#chart'),points=chartMode==='price'?filteredPriceHistory(stocks[activeIndex].ticker):filteredHistory(stocks[activeIndex].ticker);
  if(!svg||points.length<2)return;
  const labels=[...svg.querySelectorAll('text.axis')].filter(node=>node.getAttribute('y')==='350');
  labels.forEach((node,index)=>{
    const point=points[Math.round(index/(Math.max(labels.length-1,1))*(points.length-1))];
    node.textContent=point.date;
    node.setAttribute('x',index===0?'76':index===labels.length-1?'980':String(76+904*index/(labels.length-1)));
    node.setAttribute('text-anchor',index===0?'start':index===labels.length-1?'end':'middle');
  });
};
new MutationObserver(alignHistoryAxisDates).observe(document.querySelector('#chart'),{childList:true});
alignHistoryAxisDates();

// Replace an old single-source disclosure left in existing stocks.json files.
const refreshInsightDisclosure=()=>{
  const detail=document.querySelector('#detail');
  if(detail.classList.contains('hidden'))return;
  document.querySelector('#insight-copy').textContent='数据口径：最新价格与部分基本面来自 Alpha Vantage；可用的历史估值以 SEC EDGAR 公开财报的 TTM 数据和历史日收盘价计算。隐含增长率是公司级 FCFE 反推，不是分析师预测、目标价或投行评级。';
};
new MutationObserver(refreshInsightDisclosure).observe(document.querySelector('#detail'),{attributes:true,attributeFilter:['class']});

// Detail-page growth metrics use the most recently reported quarter from the
// Alpha Vantage company overview, not a forward-estimate proxy.
const refreshGrowthPanels=()=>{
  const detail=document.querySelector('#detail');
  if(detail.classList.contains('hidden'))return;
  const stock=stocks[activeIndex];
  document.querySelector('#detail-revenue-current').textContent=stock.revenueGrowthCurrent||stock.growth||'—';
  document.querySelector('#detail-eps-current').textContent=stock.epsGrowthCurrent||'—';
};
new MutationObserver(refreshGrowthPanels).observe(document.querySelector('#detail'),{attributes:true,attributeFilter:['class']});

// Do not describe a model result on a page where that company has no displayed
// implied-growth value. The section returns automatically when valid data does.
const syncImpliedGrowthSection=()=>{
  const detail=document.querySelector('#detail');
  if(detail.classList.contains('hidden'))return;
  const stock=stocks[activeIndex],hasValue=stock.implied&&stock.implied!=='—'&&stock.valuationModel?.status==='ready';
  document.querySelector('#model-inputs').classList.toggle('hidden',!hasValue);
  document.querySelector('#insight-copy').textContent='数据口径：最新价格与部分基本面来自 Alpha Vantage；可用的历史估值以 SEC EDGAR 公开财报的 TTM 数据和历史日收盘价计算。';
};
new MutationObserver(syncImpliedGrowthSection).observe(document.querySelector('#detail'),{attributes:true,attributeFilter:['class']});

// Summary cards must use the same last point as the historical chart tooltip.
// The daily Alpha snapshot can be newer and follow a different vendor formula.
const syncHistorySummaryCards=()=>{
  if(chartMode==='price')return;
  const points=filteredHistory(stocks[activeIndex].ticker),latest=points.at(-1);
  if(!latest)return;
  const metrics=['pe','pcf','ps'];
  document.querySelectorAll('#stats .stat').forEach((card,index)=>{
    const value=Number(latest[metrics[index]]);
    if(!Number.isFinite(value))return;
    const label=['市盈率（TTM）','市现率（TTM）','市销率（TTM）'][index];
    card.querySelector('.stat-label').lastChild.nodeValue=label;
    card.querySelector('.stat-value').innerHTML=`${value.toFixed(1)}<span class="stat-unit">倍</span>`;
    const date=card.querySelector('.stat-date');
    if(date)date.textContent=`历史最新：${latest.date}`;
  });
};
new MutationObserver(syncHistorySummaryCards).observe(document.querySelector('#stats'),{childList:true});

const renderMobileStocks=()=>{
  const target=document.querySelector('#mobile-stock-rows');
  if(!target)return;
  const ordered=stocks.slice().sort((a,b)=>{
    if(!sortKey)return 0;
    if(sortKey==='name')return a.name.localeCompare(b.name)*sortDirection;
    const av=metricNumber(a,sortKey),bv=metricNumber(b,sortKey);
    if(av===null)return 1;
    if(bv===null)return-1;
    return(av-bv)*sortDirection;
  });
  const multiple=(value,suffix='x')=>value&&value!=='—'?`${value}${suffix}`:'—';
  target.innerHTML=ordered.map(stock=>{
    const change=formatChange(stock.change);
    return `<article class="mobile-stock-card" data-ticker="${stock.ticker}">
      <div class="mobile-card-top">
        <div class="mobile-company">${logo(stock)}<div><b>${stock.name}</b><small>${stock.ticker}</small></div></div>
        <div class="mobile-price"><b>${stock.price||'—'}</b><small class="change ${change.className}">${change.label}</small></div>
      </div>
      <div class="mobile-core-metrics"><span><small>市值 <button class="mobile-metric-help" data-metric="market-cap" aria-label="市值说明">?</button></small><b>$${stock.cap||'—'}</b></span><span><small>PE（TTM） <button class="mobile-metric-help" data-metric="pe" aria-label="PE说明">?</button></small><b class="${rankClass(stock,'pe')}">${multiple(stock.pe)}</b></span><span><small>预期 PE <button class="mobile-metric-help" data-metric="forward-pe" aria-label="预期PE说明">?</button></small><b class="${rankClass(stock,'fpe')}">${multiple(stock.fpe)}</b></span></div>
      <div class="mobile-card-actions"><button class="mobile-more" type="button" aria-expanded="false"><span>查看更多指标</span><span>⌄</span></button></div>
      <div class="mobile-more-grid"><span><small>PEG <button class="mobile-metric-help" data-metric="peg" aria-label="PEG说明">?</button></small><b class="${rankClass(stock,'peg')}">${multiple(stock.peg)}</b></span><span><small>市销率 <button class="mobile-metric-help" data-metric="ps" aria-label="市销率说明">?</button></small><b class="${rankClass(stock,'ps')}">${multiple(stock.ps)}</b></span><span><small>市现率 <button class="mobile-metric-help" data-metric="pcf" aria-label="市现率说明">?</button></small><b class="${rankClass(stock,'pcf')}">${multiple(stock.pcf)}</b></span><span><small>EV/EBITDA <button class="mobile-metric-help" data-metric="ev-ebitda" aria-label="EV EBITDA说明">?</button></small><b class="${rankClass(stock,'evEbitda')}">${multiple(stock.evEbitda)}</b></span><span><small>隐含增长率 <button class="mobile-metric-help" data-metric="implied-growth" aria-label="隐含增长率说明">?</button></small><b class="${rankClass(stock,'implied')}">${stock.implied||'—'}</b></span><span><small>收入同比 <button class="mobile-metric-help" data-metric="revenue-growth" aria-label="收入同比说明">?</button></small><b class="${rankClass(stock,'growth')}">${stock.growth||'—'}</b></span><span><small>EPS 增长 <button class="mobile-metric-help" data-metric="eps-growth" aria-label="EPS增长说明">?</button></small><b class="${rankClass(stock,'epsGrowthCurrent')}">${stock.epsGrowthCurrent||'—'}</b></span></div>
    </article>`;
  }).join('');
  target.querySelectorAll('.mobile-stock-card').forEach(card=>card.addEventListener('click',()=>openDetail(card.dataset.ticker)));
  target.querySelectorAll('.mobile-more').forEach(button=>button.addEventListener('click',event=>{
    event.stopPropagation();
    const card=button.closest('.mobile-stock-card');
    const expanded=card.classList.toggle('expanded');
    button.setAttribute('aria-expanded',String(expanded));
    button.querySelector('span').textContent=expanded?'收起指标':'查看更多指标';
  }));
  target.querySelectorAll('.mobile-metric-help').forEach(button=>button.addEventListener('click',event=>{
    event.stopPropagation();
    const [title,content]=metricHelp[button.dataset.metric]||metricHelp.company;
    document.querySelector('#modal-title').textContent=title;
    document.querySelector('#modal-content').innerHTML=content.includes('<')?content:`<p>${content}</p>`;
    modal.classList.remove('hidden');
  }));
};
new MutationObserver(renderMobileStocks).observe(document.querySelector('#stock-rows'),{childList:true});
renderMobileStocks();

// Keep the MAG7 concentration badge synchronized whenever the daily snapshot
// replaces the in-memory stock list.
const baseRenderStocks=renderStocks;
renderStocks=()=>{baseRenderStocks();renderMag7Share()};
renderMag7Share();

const drawPriceChart=stock=>{
  const allPoints=(historyByTicker[stock.ticker]||[]).filter(point=>numericValue(point.price)).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  const points=filterToAvailablePeriod(allPoints);
  const svg=document.querySelector('#chart');
  document.querySelector('#chart-tooltip').classList.add('hidden');
  document.querySelector('#chart-title').textContent=`${stock.name} 股价走势`;
  const range=points.length?`${points[0].date} 至 ${points.at(-1).date}`:'暂无可用价格历史';
  const availableYears=allPoints.length>1?(new Date(`${allPoints.at(-1).date}T00:00:00Z`)-new Date(`${allPoints[0].date}T00:00:00Z`))/(365.25*24*60*60*1000):0;
  const selectedYears=Number.parseInt(activePeriod,10);
  const availability=allPoints.length>1?`可用股价历史约 ${availableYears.toFixed(1)} 年（${allPoints[0].date} 至 ${allPoints.at(-1).date}）。`:'';
  const limitNotice=Number.isFinite(selectedYears)&&availableYears<selectedYears-.05?'所选范围超过可用数据，已显示全部可用历史。':'已按所选范围筛选。';
  document.querySelector('.chart-hover-hint').textContent=`历史日收盘价；当前显示 ${range}。${availability}${limitNotice}`;
  document.querySelector('#stats').innerHTML=`<div class="stat"><div class="stat-label"><i class="teal"></i>历史最新收盘价</div><div class="stat-value">${points.length?`$${Number(points.at(-1).price).toFixed(2)}`:'—'}</div><div class="stat-sub">${points.at(-1)?.date||'等待历史数据更新'}</div></div>`;
  if(points.length<2){svg.innerHTML='<line class="grid" x1="76" y1="188" x2="980" y2="188"/><text class="axis" x="520" y="184" text-anchor="middle">请运行 history 更新，以写入历史日收盘价</text>';return}
  const values=points.map(point=>Number(point.price));
  const low=Math.min(...values),high=Math.max(...values),padding=Math.max((high-low)*.1,1),min=Math.max(0,low-padding),max=high+padding;
  let grid='';
  for(let i=0;i<5;i++){const y=62+i*63,value=(max-(max-min)*i/4).toFixed(2);grid+=`<line class="grid" x1="76" y1="${y}" x2="980" y2="${y}"/><text class="axis" x="12" y="${y+4}">$${value}</text>`}
  const labels=[points[0].date,points[Math.floor(points.length/2)].date,points.at(-1).date];
  labels.forEach((date,index)=>grid+=`<text class="axis" x="${76+index*452}" y="350">${date}</text>`);
  svg.innerHTML=`${grid}<path class="line" stroke="var(--teal)" d="${linePath(points,'price',min,max)}"/><line class="grid" x1="76" y1="314" x2="980" y2="314"/><rect class="chart-hover-overlay" x="76" y="62" width="904" height="252" fill="transparent"/><line class="hover-guide hover-guide-x" y1="62" y2="314" style="display:none"/><line class="hover-guide hover-guide-y" x1="76" x2="980" style="display:none"/><g class="hover-points"></g>`;
};
const drawSelectedChart=stock=>chartMode==='price'?drawPriceChart(stock):drawChart(stock);
const setChartMode=mode=>{
  chartMode=mode;
  activePeriod=mode==='price'?activePricePeriod:activeValuationPeriod;
  const stock=stocks[activeIndex];
  document.querySelectorAll('.periods button').forEach(button=>button.classList.toggle('active',button.textContent===activePeriod));
  document.querySelectorAll('#chart-mode button').forEach(button=>button.classList.toggle('active',button.dataset.chartMode===mode));
  document.querySelector('.chart-card').classList.toggle('price-mode',mode==='price');
  if(mode==='valuation'){document.querySelector('#chart-title').textContent=`${stock.name} 估值历史（TTM 估算）`;document.querySelector('.chart-hover-hint').textContent='按历史日收盘价和当时已公开的滚动四季财报重建；移动鼠标可查看该日期数据。'}
  drawSelectedChart(stock);
};
const originalOpenDetail=openDetail;
openDetail=ticker=>{chartMode='valuation';activeValuationMetric='pe';syncValuationMetricControls();activePeriod=activeValuationPeriod;document.querySelectorAll('.periods button').forEach(button=>button.classList.toggle('active',button.textContent===activePeriod));originalOpenDetail(ticker);document.querySelector('.chart-card').classList.remove('price-mode');document.querySelectorAll('#chart-mode button').forEach(button=>button.classList.toggle('active',button.dataset.chartMode==='valuation'))};
// Make a company detail view a real browser-history entry. This lets the
// phone's system back gesture/button return to the overview rather than leave
// the site, while retaining the existing on-page back control.
const openDetailWithoutHistory=openDetail;
const showOverviewFromHistory=()=>{
  document.querySelector('#detail').classList.add('hidden');
  document.querySelector('#overview').classList.remove('hidden');
  window.scrollTo({top:0,behavior:'smooth'});
};
const syncDetailRoute=()=>{
  const ticker=new URL(window.location.href).searchParams.get('stock');
  if(ticker&&stocks.some(stock=>stock.ticker===ticker))openDetailWithoutHistory(ticker);
  else showOverviewFromHistory();
};
// URL is the single source of truth for the detail view. Rendering never
// reads a previously selected company after navigation has changed the URL.
openDetail=ticker=>{
  if(!stocks.some(stock=>stock.ticker===ticker))return;
  const url=new URL(window.location.href);
  url.searchParams.set('stock',ticker);
  window.history.pushState({market10Detail:true,ticker},'',url);
  syncDetailRoute();
};
window.addEventListener('popstate',syncDetailRoute);
// Some mobile browsers restore a page from their back/forward cache without a
// fresh click. Re-read the URL in that case so it can never disagree with the
// company shown in the detail panel.
window.addEventListener('pageshow',syncDetailRoute);
queueMicrotask(syncDetailRoute);
// Remove the earlier direct-close listener so the on-page button follows the
// exact same history path as a phone back gesture.
const legacyBackButton=document.querySelector('#back');
legacyBackButton.replaceWith(legacyBackButton.cloneNode(true));
document.querySelector('#back').addEventListener('click',()=>{
  if(window.history.state?.market10Detail){
    window.history.back();
    return;
  }
  // A detail URL can be opened directly (or restored by the browser), in
  // which case there may be no in-app history entry to go back to. Clear the
  // ticker explicitly so the overview cannot retain a stale route.
  const url=new URL(window.location.href);
  url.searchParams.delete('stock');
  window.history.replaceState({market10Detail:false},'',url);
  showOverviewFromHistory();
});
document.querySelectorAll('#chart-mode button').forEach(button=>button.addEventListener('click',()=>setChartMode(button.dataset.chartMode)));
document.querySelectorAll('[data-valuation-metric]').forEach(button=>button.addEventListener('click',()=>{
  activeValuationMetric=button.dataset.valuationMetric;
  syncValuationMetricControls();
  if(chartMode==='valuation')drawChart(stocks[activeIndex]);
}));
document.querySelector('#stats').addEventListener('click',event=>{
  const button=event.target instanceof Element?event.target.closest('[data-valuation-metric]'):null;
  if(!button)return;
  activeValuationMetric=button.dataset.valuationMetric;
  syncValuationMetricControls();
  if(chartMode==='valuation')drawChart(stocks[activeIndex]);
});
rankingDirection.pcf=1;
metricHelp.pcf=['市现率（P/CF）','市现率 = 市值 ÷ 过去 12 个月经营现金流。它衡量市场为公司实际经营产生的现金支付了多少倍价格；经营现金流为负或缺失时显示“—”。'];

// Final mouse handler: makes the tooltip self-contained, consistently styled,
// and independent of SVG/CSS inheritance quirks in local file previews.
document.addEventListener('mousemove',event=>{
  const wrap=event.target instanceof Element?event.target.closest('.chart-wrap'):null;
  const detail=document.querySelector('#detail'),svg=wrap?.querySelector('#chart');
  if(!svg||detail.classList.contains('hidden'))return;
  const isPrice=chartMode==='price';
  const points=isPrice?filteredPriceHistory(stocks[activeIndex].ticker):filteredHistory(stocks[activeIndex].ticker),rect=svg.getBoundingClientRect();
  const x=(event.clientX-rect.left)*1040/rect.width,y=(event.clientY-rect.top)*400/rect.height;
  if(points.length<2||x<76||x>980||y<62||y>314)return;
  const index=Math.max(0,Math.min(points.length-1,Math.round((x-76)/904*(points.length-1))));
  const point=points[index],tooltip=document.querySelector('#chart-tooltip'),guide=svg.querySelector('.hover-guide-x');
  const guideX=76+904*index/Math.max(points.length-1,1);
  if(guide){guide.setAttribute('x1',guideX);guide.setAttribute('x2',guideX);guide.style.display='block'}
  const horizontal=svg.querySelector('.hover-guide-y');
  if(horizontal){horizontal.setAttribute('y1',y);horizontal.setAttribute('y2',y);horizontal.style.display='block'}
  const seriesValues=isPrice?points.map(item=>Number(item.price)).filter(Number.isFinite):points.map(item=>Number(item[selectedValuationMetric()[0]])).filter(Number.isFinite);
  const low=Math.min(...seriesValues),high=Math.max(...seriesValues),padding=isPrice?Math.max((high-low)*.1,1):0;
  const valuationRange=isPrice?null:valuationScale(points,selectedValuationMetric());
  const min=isPrice?Math.max(0,low-padding):valuationRange.min,max=isPrice?high+padding:valuationRange.max;
  const pointGroup=svg.querySelector('.hover-points');
  if(pointGroup){
    const items=isPrice?[['price','#1ba6a0']]:[[selectedValuationMetric()[0],selectedValuationMetric()[3]==='orange'?'#ee8b2d':selectedValuationMetric()[3]==='teal'?'#1ba6a0':'#b547c3']];
    pointGroup.innerHTML=items.filter(([key])=>numericValue(point[key])).map(([key,color])=>{
      const pointY=314-(Number(point[key])-min)/(max-min)*252;
      return `<circle cx="${guideX}" cy="${pointY}" r="6" fill="#fff" stroke="${color}" stroke-width="3" vector-effect="non-scaling-stroke"/>`;
    }).join('');
  }
  const rows=(isPrice?[['price','日收盘价','#1ba6a0']]:[[selectedValuationMetric()[0],selectedValuationMetric()[1],selectedValuationMetric()[3]==='orange'?'#ee8b2d':selectedValuationMetric()[3]==='teal'?'#1ba6a0':'#b547c3']])
    .map(([key,label,color])=>{if(numericValue(point[key]))return`<div style="display:grid;grid-template-columns:10px 1fr auto;align-items:center;gap:7px;margin-top:7px"><i style="display:block;width:8px;height:8px;border-radius:50%;background:${color}"></i><span style="font-size:12px;color:#52615a">${label}</span><strong style="font:700 14px 'DM Mono',monospace;color:#16231d">${isPrice?'$':''}${Number(point[key]).toFixed(isPrice?2:1)}${isPrice?'':'x'}</strong></div>`;if(!isPrice&&key==='pe')return`<div style="display:grid;grid-template-columns:10px 1fr auto;align-items:center;gap:7px;margin-top:7px"><i style="display:block;width:8px;height:8px;border-radius:50%;background:${color}"></i><span style="font-size:12px;color:#52615a">${label}</span><strong style="font:600 11px Manrope;color:#b46117">亏损期不适用</strong></div>`;return''}).join('');
  tooltip.innerHTML=`<div style="font:700 13px 'DM Mono',monospace;color:#14201e;padding-bottom:7px;border-bottom:1px solid rgba(126,145,136,.25)">${point.date}</div>${rows}`;
  tooltip.style.cssText='position:fixed;z-index:50;width:205px;padding:12px 13px;border:1px solid rgba(255,255,255,.65);border-radius:12px;background:rgba(255,255,255,.58);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);box-shadow:0 12px 30px rgba(20,32,30,.14);pointer-events:none';
  tooltip.style.left=`${Math.min(window.innerWidth-218,event.clientX+14)}px`;
  tooltip.style.top=`${Math.min(window.innerHeight-145,event.clientY+14)}px`;
  tooltip.classList.remove('hidden');
});
