const driverPeriods={};
const chartSeries={
  cnyjpy:{pair:'CNY / JPY',description:'1人民币可以兑换多少日元；数值上升表示人民币换日元更划算。',color:'#1aa774',periods:{}},
  usdjpy:{pair:'USD / JPY',description:'1美元可以兑换多少日元；数值上升通常表示日元相对美元走弱。',color:'#d46b63',periods:{}},
  usdcny:{pair:'USD / CNY',description:'1美元可以兑换多少人民币；数值上升通常表示人民币相对美元走弱。',color:'#d7923e',periods:{}}
};
const periodLabels={30:'1个月',180:'6个月',365:'1年',1095:'3年',1825:'5年'};
const marketContext={
  30:{
    jpy:['核心结论：近1个月 USD/JPY 从约162.71降至160.24，日元对美元升值约1.52%。这是高位后的阶段性反弹，主要反映政策预期、干预风险和仓位调整。',['日本央行会议预期升温｜市场在7月重新评估日本央行继续加息和减少宽松的可能性。即使实际利率仍低，只要加息预期边际升温，就可能推动空头回补并压低 USD/JPY。','高位干预风险增加｜USD/JPY 处于历史高位区间时，日本财务省对无序波动的关注会明显上升。交易者通常会降低日元空头规模，以避免突发干预造成快速反转。','套息仓位阶段性回补｜此前积累的日元融资交易在汇率波动放大时容易集中平仓。买回日元偿还融资会放大短期升值，但不意味着长期套息逻辑已经消失。','短周期容易受事件扰动｜一个月窗口对央行会议、美国数据和风险情绪非常敏感。当前反弹更适合视为高位修正，不能单凭一个月走势判断长期趋势已经逆转。']],
    cny:['核心结论：近1个月 USD/CNY 从约6.79降至6.75，人民币对美元升值约0.64%。美元转弱和结汇需求提供支持，但幅度小于日元反弹。',['美元回落提供外部窗口｜美国利率预期和经济数据变化使美元从高位回落，人民币因此获得被动升值空间。这一影响属于外部环境改善，并非完全来自中国国内因素。','企业结汇继续支撑｜当人民币升值预期增强时，出口企业更倾向于提前卖出美元收入，进口企业则可能延后购汇，短期供求共同压低 USD/CNY。','政策稳定预期发挥作用｜中间价和宏观审慎管理有助于抑制单边预期，使人民币升值过程相对平缓，波动明显小于自由浮动的日元。','国内宽松限制升值幅度｜国内仍需要偏宽松的金融条件支持增长，因此政策并不追求人民币快速单边升值。近1个月表现更接近温和修复。']]},
  180:{
    jpy:['核心结论：日本央行虽然继续退出宽松，但政策利率仍明显低于美国；利差、资本流向和能源进口需求继续压制日元。',['日美利差尚未消除｜日本央行6月进一步收紧政策，并表示若经济和物价符合预期，将继续提高政策利率；但日本金融环境整体仍偏宽松。同期美联储将联邦基金利率维持在3.50%—3.75%，美元资产收益率仍明显高于日元资产。','市场关注加息速度｜市场已经接受日本利率将逐步上升，但对连续快速加息仍较谨慎。日本消费、实际工资和外部需求存在不确定性，使日本央行需要在通胀风险与经济承受能力之间权衡。','套息与海外配置持续｜只要日元融资成本明显低于美元资产收益率，借入日元、持有海外资产的交易就仍有吸引力。日本机构和家庭持续配置海外资产，也形成结构性的日元卖盘。','能源进口形成压力｜日本高度依赖能源进口。能源价格上涨会增加美元结算需求并恶化贸易条件，尤其在能源价格波动时，日元容易承受额外压力。','干预难改趋势基础｜日本政府可以通过口头警告或直接买入日元抑制无序波动，但如果日美利差和跨境资金流没有逆转，干预更可能改变短期速度，而不是长期方向。']],
    cny:['核心结论：近6个月人民币明显走强，美元回落、企业结汇和政策稳定预期共同提供支持。',['美元环境转向缓和｜虽然美联储利率仍高，但市场开始交易未来政策转向的可能性，美元不再保持此前单边强势。美元回落为人民币升值提供了外部窗口。','出口与结汇形成支撑｜出口企业持有的美元收入在人民币升值预期增强时，更可能提前或增加结汇。这会增加市场上的美元供给，并强化人民币阶段性升值趋势。','升值预期强化结汇｜当 USD/CNY 持续下降时，企业延后购汇、加快结汇，可能进一步增加人民币需求。不过这种行为容易随市场预期变化而逆转，不能简单外推。','政策管理降低波动｜人民币实行参考一篮子货币的有管理浮动制度。中间价、跨境资金管理和宏观审慎工具有助于稳定预期，因此人民币通常不会像日元一样快速单边波动。','国内宽松限制空间｜人民币仍面临国内低利率、内需恢复和资本流动等约束。政策重点并非推动单边升值，而是避免汇率超调、保持双向波动。']]},
  365:{
    jpy:['核心结论：近1年 USD/JPY 从约149.85升至160.24，日元贬值约6.93%。日本继续加息，但利率正常化速度仍不足以抵消美元资产的收益优势。',['加息方向明确但速度渐进｜日本央行继续退出超宽松政策，政策方向已经改变；但其利率水平和市场预期的终点仍明显低于美国，因此日元没有因加息自动转为强势。','美国利率维持较高水平｜美联储虽然结束最激进的加息阶段，但政策利率仍处限制性区间。较高的美债收益率继续吸引资金持有美元资产。','实际工资与消费约束政策｜日本通胀和工资有所上升，但实际消费及经济增长并不均衡。日本央行必须控制加息速度，避免金融条件过快收紧。','套息和海外配置仍有吸引力｜日本机构、企业和家庭长期持有海外资产。只要利差存在，新增配置和套息交易仍会形成日元卖盘。','能源与干预塑造波动｜能源进口增加美元需求，而官方干预预期限制日元贬值速度。两者共同造成趋势向弱、途中反复的走势。']],
    cny:['核心结论：近1年 USD/CNY 从约7.19降至6.75，人民币升值约6.16%。人民币走强与日元走弱几乎各贡献一半，共同推动人民币兑日元上涨约13.95%。',['美元周期转入高位震荡｜随着市场开始讨论美国未来降息，美元不再保持此前的单边强势，人民币获得明显修复空间。','出口与经常账户提供基础｜出口收入和经常账户顺差持续带来外汇流入，为企业结汇和人民币需求提供基本面支撑。','升值预期推动结汇加快｜当 USD/CNY 趋势向下时，企业倾向于提前结汇、延后购汇，这种行为会阶段性强化人民币升值。','政策工具稳定单边预期｜人民币实行参考一篮子货币的有管理浮动。中间价、离岸流动性与宏观审慎措施帮助避免贬值预期自我强化。','国内压力限制长期外推｜房地产、内需恢复和低利率环境仍可能带来资本流动压力，因此近1年升值更适合视为阶段性修复，而非长期单边趋势。']]},
  1095:{
    jpy:['核心结论：近3年 USD/JPY 从约142.98升至160.24，日元贬值约12.07%。日本结束负利率是重要转折，但此前形成的巨大政策差只被缓慢修复。',['长期美日利差压制日元｜2023年以来，美国利率长期处于高位，而日本仍维持极低利率。持有美元资产、以日元融资的收益差成为日元贬值的核心背景。','2024年结束负利率与YCC｜日本央行在2024年3月结束负利率和收益率曲线控制，货币政策框架发生历史性转变；但央行同时强调金融环境仍将保持宽松。','正常化难以快速追赶｜日本随后逐步加息并减少国债购买，但调整速度远慢于此前美联储紧缩形成的利差，市场没有迅速撤出套息交易。','官方干预造成阶段反转｜日本在汇率快速波动时实施或警告干预，曾推动日元短期大幅反弹，但没有持续改变利率与资本流动基础。','能源和海外投资形成结构压力｜能源进口结算以及日本居民、机构对海外资产的长期配置，使日元在政策转折后仍面临持续卖盘。']],
    cny:['核心结论：近3年 USD/CNY 从约7.17降至6.75，人民币对美元升值约5.80%。但这段时间经历先贬后升，最终为人民币兑日元上涨贡献约34%。',['走势并非连续单边升值｜人民币在美元强势、中美利差扩大阶段曾明显承压，随后随着美元转弱和结汇增加而修复，期末涨幅掩盖了过程中的双向波动。','出口与经常账户形成缓冲｜出口收入和经常账户顺差降低了人民币对外部冲击的敏感度，使其整体跌幅和波动小于日元。','政策管理防止汇率超调｜中间价、宏观审慎工具和稳定预期措施用于防止单边交易自我强化，使人民币更接近有管理的双向波动。','国内低利率带来约束｜中国利率偏低、房地产调整和内需压力可能推动资金寻求海外收益，限制人民币持续升值。','后期结汇推动明显修复｜当市场由贬值预期转向稳定或升值预期，出口企业结汇节奏加快，成为三年期末人民币走强的重要力量。']]},
  1825:{
    jpy:['核心结论：近5年 USD/JPY 从约109.52升至160.24，日元累计贬值约46.31%。这是全球加息周期中最典型的政策分化行情，也是人民币兑日元上涨约40.04%的主要来源。',['2022年政策差急剧扩大｜美联储为应对高通胀连续大幅加息，并缩减资产负债表；日本央行同期继续负利率和收益率曲线控制，美日利差迅速扩大。','能源冲击恶化贸易条件｜俄乌冲突及全球能源价格上涨提高日本石油和天然气进口成本，增加美元购汇需求，使日元同时受到利差与贸易渠道压力。','套息交易形成长期趋势｜低成本日元融资与高收益美元资产之间的差距吸引全球套息资金。趋势持续时间越长，企业和投资者越容易形成顺势配置。','2024年政策框架转折｜日本结束负利率和收益率曲线控制，随后逐步加息、减少购债；但政策起点很低，渐进正常化没有逆转多年累积的利差。','干预改变速度而非方向｜日本多次通过实际干预或政策警告抑制无序贬值，制造明显反弹，但五年走势仍主要由政策差、能源进口和海外资产配置决定。']],
    cny:['核心结论：近5年 USD/CNY 从约6.46升至6.75，人民币对美元累计贬值约4.48%。人民币侧没有推动长期上涨，反而抵消了部分日元贬值带来的收益。',['2022—2023年美元加息冲击｜美联储快速加息和全球避险需求推高美元，中美利差收窄甚至倒挂，人民币因此经历五年区间内最主要的贬值阶段。','国内增长与房地产调整｜房地产下行、内需恢复偏慢以及较低利率环境影响跨境资本流向，使人民币在部分阶段持续承压。','出口顺差提供重要缓冲｜制造业出口和经常账户顺差带来稳定外汇收入，使人民币累计跌幅远小于日元，没有出现同等规模的单边贬值。','有管理浮动抑制超调｜中间价和宏观审慎政策强调双向波动、防止一致性预期自我强化，降低了人民币在美元强周期中的波动幅度。','近一年升值属于部分修复｜美元环境缓和与企业结汇推动人民币回升，但只是收复2022年以来部分跌幅，五年累计结果仍为对美元小幅贬值。']]}
};
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
  const logExample=document.querySelector('#log-example-values'),logFormula=document.querySelector('#log-example-formula');
  if(logExample){logExample.textContent=`对数变化 ${signed(data.total)} → 普通涨幅 ${signed(data.ordinary)}`;logFormula.innerHTML=`e<sup>${(data.total/100).toFixed(4)}</sup> − 1 = ${signed(data.ordinary)}`}
  const scale=Math.max(Math.abs(data.jpy),Math.abs(data.cny),.01);
  const jpyBar=document.querySelector('#jpy-driver-bar'),cnyBar=document.querySelector('#cny-driver-bar');
  for(const [bar,value] of [[jpyBar,data.jpy],[cnyBar,data.cny]]){bar.style.width=`${Math.max(5,Math.abs(value)/scale*82)}%`;bar.classList.toggle('positive-fill',value>=0);bar.classList.toggle('negative-fill',value<0)}
}
const renderContextReasons=(id,reasons)=>{document.querySelector(id).innerHTML=reasons.map((copy,index)=>{const explicit=copy.split('｜'),separator=copy.indexOf('，'),title=explicit.length>1?explicit[0]:separator>0?copy.slice(0,separator):copy,detail=explicit.length>1?explicit.slice(1).join('｜'):separator>0?copy.slice(separator+1):copy;return`<li><span>${String(index+1).padStart(2,'0')}</span><div><b>${title}</b><p>${detail}</p></div></li>`}).join('')};
function renderMarketContext(period){
  const context=marketContext[period]||marketContext[180],label=periodLabels[period]||'6个月',stats=driverPeriods[period];
  document.querySelector('#events-title').textContent=`近${label}，两侧发生了什么？`;
  document.querySelector('#jpy-context-title').textContent=`为什么日元兑美元${stats&&stats.jpy<0?'走强':'走弱'}？`;
  document.querySelector('#cny-context-title').textContent=`为什么人民币兑美元${stats&&stats.cny<0?'走弱':'走强'}？`;
  document.querySelector('#context-period-date').textContent=stats?`${stats.startDate||''} 至 ${stats.endDate||''}`:'随分析周期同步';
  document.querySelector('#jpy-context-conclusion').textContent=context.jpy[0];
  document.querySelector('#cny-context-conclusion').textContent=context.cny[0];
  renderContextReasons('#jpy-context-reasons',context.jpy[1]);renderContextReasons('#cny-context-reasons',context.cny[1]);
  if(!stats)return;
  const direction=stats.ordinary>=0?'上涨':'下跌',jpy=Math.abs(stats.jpy),cny=Math.abs(stats.cny),total=jpy+cny;
  let split=stats.jpy*stats.cny>=0?`日元侧与人民币侧约占 ${Math.round(jpy/total*100)}% 和 ${Math.round(cny/total*100)}%。`:`两侧方向相反：日元侧贡献 ${stats.jpy.toFixed(2)} 个百分点，人民币侧贡献 ${stats.cny.toFixed(2)} 个百分点。`;
  document.querySelector('#context-period-note').innerHTML=`<b>阅读口径：</b>近${label}人民币兑日元${direction}约${Math.abs(stats.ordinary).toFixed(2)}%。${split}这里整理的是与走势一致的政策及资金线索，不证明任何单一因素与汇率之间存在确定因果关系。`;
}

document.querySelector('[data-toggle="method"]').addEventListener('click',event=>{const box=document.querySelector('#method-box');box.classList.toggle('hidden');event.currentTarget.textContent=box.classList.contains('hidden')?'查看计算方法⌄':'收起计算方法⌃'});
const logModal=document.querySelector('#log-help-modal'),logOpenButton=document.querySelector('[data-open-log-help]'),logCloseButton=document.querySelector('[data-close-log-help]');
function closeLogModal(){logModal.classList.add('hidden');document.body.classList.remove('modal-open');logOpenButton.focus()}
logOpenButton.addEventListener('click',()=>{logModal.classList.remove('hidden');document.body.classList.add('modal-open');logCloseButton.focus()});
logCloseButton.addEventListener('click',closeLogModal);
logModal.addEventListener('click',event=>{if(event.target===logModal)closeLogModal()});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!logModal.classList.contains('hidden'))closeLogModal()});

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
  const conversion=document.querySelector('#trend-conversion');
  if(pair==='cnyjpy'){conversion.textContent=`10,000日元 ≈ ${(10000/Number(series.current)).toFixed(2)}人民币`;conversion.classList.remove('hidden')}else{conversion.classList.add('hidden')}
  const label=periodLabels[activeChartPeriod],change=document.querySelector('#trend-change');change.textContent=`过去${label} ${signed(period.change)}`;setDirection(change,period.change);
  document.querySelector('#trend-title').textContent=`过去${label}汇率走势`;document.querySelector('#chart-period-start').textContent=period.dates[0];document.querySelector('#trend-description').textContent=series.description;canvas.setAttribute('aria-label',`过去${label}${series.pair}走势图`);
}

document.querySelectorAll('[data-chart-pair]').forEach(button=>button.addEventListener('click',()=>{if(!dataReady)return;document.querySelectorAll('[data-chart-pair]').forEach(item=>item.classList.toggle('active',item===button));drawFxChart(button.dataset.chartPair)}));
document.querySelectorAll('[data-chart-period]').forEach(button=>button.addEventListener('click',()=>{if(!dataReady)return;activeChartPeriod=button.dataset.chartPeriod;document.querySelectorAll('[data-chart-period]').forEach(item=>item.classList.toggle('active',item===button));drawFxChart(activePair);renderDrivers(activeChartPeriod);renderMarketContext(activeChartPeriod)}));
let chartResizeTimer;window.addEventListener('resize',()=>{clearTimeout(chartResizeTimer);chartResizeTimer=setTimeout(()=>drawFxChart(activePair),100)});
const trendCanvas=document.querySelector('#fx-trend-chart');
trendCanvas.addEventListener('pointermove',event=>{if(!dataReady||event.pointerType==='touch')return;const rect=trendCanvas.getBoundingClientRect(),period=chartSeries[activePair].periods[activeChartPeriod],plotLeft=16,plotRight=62,plotWidth=Math.max(1,rect.width-plotLeft-plotRight),x=Math.min(plotWidth,Math.max(0,event.clientX-rect.left-plotLeft)),index=Math.round(x/plotWidth*(period.values.length-1));drawFxChart(activePair,index)});
trendCanvas.addEventListener('pointerleave',()=>drawFxChart(activePair));trendCanvas.addEventListener('pointercancel',()=>drawFxChart(activePair));

function applyPayload(payload){
  if(!payload||payload.schemaVersion!==1||!payload.periods||!payload.attribution)throw new Error('invalid yen-rate payload');
  for(const key of Object.keys(chartSeries)){
    const periods=payload.periods[key];if(!periods)throw new Error(`missing ${key}`);
    chartSeries[key].current=Number(payload.latest[key]).toFixed(key==='usdjpy'?2:4);
    for(const period of Object.keys(periodLabels)){const raw=periods[period];if(!raw?.points?.length)throw new Error(`missing ${key}/${period}`);chartSeries[key].periods[period]={change:Number(raw.change),values:raw.points.map(point=>Number(point.value)),dates:raw.points.map(point=>point.date)}}
  }
  for(const period of Object.keys(periodLabels)){const raw=payload.attribution[period];driverPeriods[period]={jpy:Number(raw.jpyContribution),cny:Number(raw.cnyContribution),total:Number(raw.totalLogChange),ordinary:Number(raw.ordinaryChange),dominant:raw.dominant,startDate:raw.startDate,endDate:raw.endDate}}
  const provider=String(payload.source?.provider||'官方日频数据'),shortProvider=provider.includes('European Central Bank')?'ECB':'FRED';
  const latest=new Date(`${payload.latestCommonDate}T00:00:00Z`),today=new Date(),cursor=new Date(latest);let businessLag=0;
  while(cursor<today){cursor.setUTCDate(cursor.getUTCDate()+1);const day=cursor.getUTCDay();if(day!==0&&day!==6&&cursor<=today)businessLag++}
  const stale=businessLag>3,status=document.querySelector('[data-status-label]'),dot=document.querySelector('.demo-dot');
  status.textContent=stale?`${shortProvider} 数据延迟`:`${shortProvider} 日频数据`;dot?.classList.toggle('stale',stale);
  const generatedAt=new Date(payload.generatedAt),japanUpdated=Number.isNaN(generatedAt.getTime())?'—':new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(generatedAt).replaceAll('/','-');
  const updatedElement=document.querySelector('[data-updated]');updatedElement.textContent=japanUpdated;updatedElement.title=`汇率数据截至最近共同交易日 ${payload.latestCommonDate}`;
  dataReady=true;document.querySelector('#chart-data-source').textContent=`${shortProvider} 日频参考汇率 · 同日对齐`;renderDrivers('180');renderMarketContext('180');drawFxChart('cnyjpy');
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
