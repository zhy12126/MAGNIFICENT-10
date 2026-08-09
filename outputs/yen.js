const driverPeriods={};
const chartSeries={
  cnyjpy:{pair:'CNY / JPY',description:'1人民币可以兑换多少日元；数值上升表示人民币换日元更划算。',color:'#1aa774',periods:{}},
  usdjpy:{pair:'USD / JPY',description:'1美元可以兑换多少日元；数值上升通常表示日元相对美元走弱。',color:'#d46b63',periods:{}},
  usdcny:{pair:'USD / CNY',description:'1美元可以兑换多少人民币；数值上升通常表示人民币相对美元走弱。',color:'#d7923e',periods:{}}
};
const periodLabels={30:'1个月',180:'6个月',365:'1年',1095:'3年',1825:'5年'};
const marketContextUpdatedAt='2026.08.09';
const marketContext={
  30:{
    jpy:['核心结论：近1个月 USD/JPY 从约162.49降至158.34，日元对美元升值约2.55%。7月底美日联合买入日元是本月最重要的拐点，但干预后的部分涨幅已回吐。',['先跌至近40年低位｜7月下旬 USD/JPY 一度升破163，ECB参考汇率在7月28日达到约163.91。日美利差、套息交易和日本进口成本压力继续推动日元走弱，也把市场推到更容易触发官方行动的位置。','日本先行实际干预｜7月30日，日本财务省在纽约交易时段买入日元、卖出美元，USD/JPY 当日参考价由前一日约163.68降至162.94，次日进一步降至160.24。这不是口头警告，而是实际入市操作。','美国随后协同买入日元｜7月31日，美国财政部通过纽约联储参与买入日元；美日随后公开确认协调行动。这是罕见的联合支撑日元，显著提高了市场对官方“反向做多日元”能力和再次行动风险的定价。','空头回补放大升值｜联合行动触发日元空头与套息仓位集中回补，USD/JPY 在8月3日进一步降至约156.68。快速买回日元偿还融资，使行情幅度超过单纯干预成交本身。','反弹不等于趋势完全逆转｜此后 USD/JPY 回到8月7日约158.34，说明部分冲击已经消化。干预能改变短期速度和波动区间，但日美利差与跨境资金流仍决定中期基础。']],
    cny:['核心结论：近1个月 USD/CNY 从约6.80降至6.75，人民币对美元升值约0.78%。人民币侧提供温和正贡献，但人民币兑日元本月下跌主要由日元在联合干预后快速走强造成。',['美元回落提供外部窗口｜美日联合干预直接压低美元兑日元，同时美元整体波动也为人民币提供被动升值空间；但 USD/CNY 的变化远小于 USD/JPY。','企业结汇继续支撑｜当人民币升值预期增强时，出口企业更倾向于提前卖出美元收入，进口企业则可能延后购汇，短期供求共同压低 USD/CNY。','政策稳定预期发挥作用｜中间价和宏观审慎管理抑制单边预期，使人民币本月保持温和升值，波动明显小于日元。','两侧方向首次明显对冲｜人民币相对美元走强本应抬高 CNY/JPY，但日元对美元升值幅度更大，因此近1个月人民币兑日元仍下跌约1.80%。']]},
  180:{
    jpy:['核心结论：近6个月 USD/JPY 从约156.19升至158.34，日元仍小幅贬值约1.37%；7月底美日联合干预逆转了此前冲向164的行情，但尚未抹去整个周期的弱势。',['美日联合干预成为拐点｜日本7月30日先行买入日元，美国财政部7月31日通过纽约联储参与；两国随后确认协调行动。USD/JPY 从163上方快速降至8月3日约156.68，是本周期最显著的政策冲击。','日美利差尚未消除｜日本央行虽继续退出宽松、政策利率升至1%，但美联储仍维持3.50%—3.75%，美元资产收益优势继续支撑套息和海外配置。','干预前贬值压力持续累积｜能源进口、居民和机构海外投资以及对日本财政前景的担忧，使 USD/JPY 在7月下旬一度接近164，促成官方以“过度波动和无序走势”为由行动。','联合行动提高尾部风险｜美国直接参与意味着市场不能再只估算日本单方面干预的规模；再次联合行动的可能性，会限制交易者在高位继续扩大日元空头。','干预改变速度，基本面决定持续性｜8月初日元已从干预后的高点回落。若利差和资本流没有继续收窄，联合干预更可能重设短期区间，而非单独建立长期升值趋势。']],
    cny:['核心结论：近6个月人民币明显走强，美元回落、企业结汇和政策稳定预期共同提供支持。',['美元环境转向缓和｜虽然美联储利率仍高，但市场开始交易未来政策转向的可能性，美元不再保持此前单边强势。美元回落为人民币升值提供了外部窗口。','出口与结汇形成支撑｜出口企业持有的美元收入在人民币升值预期增强时，更可能提前或增加结汇。这会增加市场上的美元供给，并强化人民币阶段性升值趋势。','升值预期强化结汇｜当 USD/CNY 持续下降时，企业延后购汇、加快结汇，可能进一步增加人民币需求。不过这种行为容易随市场预期变化而逆转，不能简单外推。','政策管理降低波动｜人民币实行参考一篮子货币的有管理浮动制度。中间价、跨境资金管理和宏观审慎工具有助于稳定预期，因此人民币通常不会像日元一样快速单边波动。','国内宽松限制空间｜人民币仍面临国内低利率、内需恢复和资本流动等约束。政策重点并非推动单边升值，而是避免汇率超调、保持双向波动。']]},
  365:{
    jpy:['核心结论：近1年 USD/JPY 从约147.38升至158.34，日元贬值约7.43%。7月底美日联合干预带来急速反弹，但只收回了此前一部分跌幅。',['加息方向明确但速度渐进｜日本央行继续退出超宽松政策，政策方向已经改变；但其利率水平和市场预期的终点仍明显低于美国，因此日元没有因加息自动转为强势。','美国利率维持较高水平｜美联储政策利率仍处限制性区间，较高的美元资产收益继续吸引套息资金。','实际工资与消费约束政策｜日本通胀和工资有所上升，但实际消费及经济增长并不均衡，日本央行仍需控制收紧速度。','套息和海外配置仍有吸引力｜日本机构、企业和家庭长期持有海外资产。只要利差存在，新增配置和套息交易仍会形成日元卖盘。','联合干预重设短期上沿｜7月30日至31日美日相继买入日元，使汇率从近40年低位快速反转；但一年期结果仍是日元贬值，说明干预尚未改变利差主导的累计方向。']],
    cny:['核心结论：近1年 USD/CNY 从约7.18降至6.75，人民币升值约6.20%。人民币走强与日元走弱共同推动人民币兑日元上涨约14.30%，近期联合干预则回吐了部分涨幅。',['美元周期转入高位震荡｜随着市场开始讨论美国未来政策转向，美元不再保持此前的单边强势，人民币获得明显修复空间。','出口与经常账户提供基础｜出口收入和经常账户顺差持续带来外汇流入，为企业结汇和人民币需求提供基本面支撑。','升值预期推动结汇加快｜当 USD/CNY 趋势向下时，企业倾向于提前结汇、延后购汇，这种行为会阶段性强化人民币升值。','政策工具稳定单边预期｜中间价、离岸流动性与宏观审慎措施帮助避免贬值预期自我强化。','日元急升带来近期回撤｜美日联合干预主要作用于日元侧，并未改变人民币对美元温和升值；但因为日元涨得更快，CNY/JPY 在7月底至8月初明显回落。']]},
  1095:{
    jpy:['核心结论：近3年 USD/JPY 从约143.05升至158.34，日元贬值约10.69%。日本结束负利率并逐步加息，但政策差只被缓慢修复，近期联合干预主要改变短线速度。',['长期美日利差压制日元｜2023年以来，美国利率长期处于高位，而日本仍维持低利率，套息收益差成为日元贬值的核心背景。','2024年结束负利率与YCC｜日本央行在2024年3月结束负利率和收益率曲线控制，货币政策框架发生历史性转变。','正常化难以快速追赶｜日本随后逐步加息并减少国债购买，但调整速度远慢于此前美联储紧缩形成的利差。','干预层级明显升级｜从日本单独入市，到2026年7月底美国财政部通过纽约联储协同买入日元，官方行动不断制造阶段反转；三年累计方向仍未逆转。','能源和海外投资形成结构压力｜能源进口结算以及日本居民、机构对海外资产的长期配置，使日元在政策转折后仍面临持续卖盘。']],
    cny:['核心结论：近3年 USD/CNY 从约7.21降至6.75，人民币对美元升值约6.68%。这段时间经历先贬后升，人民币与日元两侧共同推动 CNY/JPY 累计上涨约18.34%。',['走势并非连续单边升值｜人民币在美元强势、中美利差扩大阶段曾明显承压，随后随着美元转弱和结汇增加而修复。','出口与经常账户形成缓冲｜出口收入和经常账户顺差降低了人民币对外部冲击的敏感度，使其波动小于日元。','政策管理防止汇率超调｜中间价、宏观审慎工具和稳定预期措施用于防止单边交易自我强化。','国内低利率带来约束｜中国利率偏低、房地产调整和内需压力可能推动资金寻求海外收益，限制人民币持续升值。','近期冲击来自日元侧｜7月底美日联合干预压低 USD/JPY，对 USD/CNY 的直接影响较小，因此主要表现为人民币兑日元回撤。']]},
  1825:{
    jpy:['核心结论：近5年 USD/JPY 累计上涨约43.76%，日元是人民币兑日元上涨约38.06%的主要来源。2026年7月底联合干预很重要，但不足以逆转五年政策分化。',['2022年政策差急剧扩大｜美联储连续大幅加息，日本央行同期继续负利率和收益率曲线控制，美日利差迅速扩大。','能源冲击恶化贸易条件｜俄乌冲突及全球能源价格上涨提高日本进口成本，增加美元购汇需求。','套息交易形成长期趋势｜低成本日元融资与高收益美元资产之间的差距吸引全球套息资金。','2024年政策框架转折｜日本结束负利率和收益率曲线控制，随后逐步加息、减少购债；但政策起点很低。','联合干预仍是阶段反转｜2026年7月底美国罕见加入日本的买入日元行动，强化了高位约束；五年走势仍主要由政策差、能源进口和海外资产配置决定。']],
    cny:['核心结论：近5年 USD/CNY 累计上涨约4.16%，人民币对美元小幅贬值，抵消了部分日元贬值带来的 CNY/JPY 涨幅。',['2022—2023年美元加息冲击｜美联储快速加息和全球避险需求推高美元，中美利差收窄甚至倒挂。','国内增长与房地产调整｜房地产下行、内需恢复偏慢以及较低利率环境影响跨境资本流向。','出口顺差提供重要缓冲｜制造业出口和经常账户顺差使人民币累计跌幅远小于日元。','有管理浮动抑制超调｜中间价和宏观审慎政策强调双向波动，降低了人民币在美元强周期中的波动幅度。','近一年升值属于部分修复｜美元环境缓和与企业结汇推动人民币回升；最近的美日联合干预主要改变日元侧，不改变人民币五年累计仍对美元小幅贬值的结果。']]}
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
  document.querySelector('#context-updated-date').textContent=`内容更新：${marketContextUpdatedAt}`;
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
function updateChartPointer(event){
  if(!dataReady)return;
  const rect=trendCanvas.getBoundingClientRect(),period=chartSeries[activePair].periods[activeChartPeriod],plotLeft=16,plotRight=62,plotWidth=Math.max(1,rect.width-plotLeft-plotRight),x=Math.min(plotWidth,Math.max(0,event.clientX-rect.left-plotLeft)),index=Math.round(x/plotWidth*(period.values.length-1));
  drawFxChart(activePair,index);
}
trendCanvas.addEventListener('pointerdown',event=>{if(event.pointerType==='touch')updateChartPointer(event)});
trendCanvas.addEventListener('pointermove',updateChartPointer);
trendCanvas.addEventListener('pointerleave',event=>{if(event.pointerType!=='touch')drawFxChart(activePair)});
trendCanvas.addEventListener('pointercancel',()=>drawFxChart(activePair));
document.addEventListener('pointerdown',event=>{if(event.pointerType==='touch'&&!trendCanvas.contains(event.target))drawFxChart(activePair)});

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
  const japanUpdated=window.formatJapanHeaderTime?.(payload.generatedAt)||'—';
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
