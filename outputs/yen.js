const driverPeriods = {};
const chartSeries = {
  cnyjpy: { pair: 'CNY / JPY', description: '1人民币可以兑换多少日元；数值上升表示人民币换日元更划算。', color: '#1aa774', periods: {} },
  usdjpy: { pair: 'USD / JPY', description: '1美元可以兑换多少日元；数值上升通常表示日元相对美元走弱。', color: '#d46b63', periods: {} },
  usdcny: { pair: 'USD / CNY', description: '1美元可以兑换多少人民币；数值上升通常表示人民币相对美元走弱。', color: '#d7923e', periods: {} }
};
const periodLabels = { 30: '1个月', 180: '6个月', 365: '1年', 1095: '3年', 1825: '5年' };
const marketContextUpdatedAt = '2026.09.02';
const marketContext = {
  30: {
    jpy: ['核心结论：近1个月，日元阶段性修复并未改变其结构性弱势。日本财务省已公布实际干预数据，说明当局确实在7月30日至8月26日期间入市买入日元；与此同时，财政扩张与政策可信度问题仍在压制日元，而不只是美日利差。', ['日本财务省已公开确认干预事实｜8月28日，日本财务省公布7月30日至8月26日期间的外汇干预月度数据，市场不应再用传闻替代事实；公开数据说明当局确实在高位附近出手干预，短期波动受此影响明显。', '财政扩张叙事继续构成底层压力｜高市主张的积极财政和扩张性支出，加大了市场对日本长期赤字、国债供给和政策可信度的担忧，日元继续面临被动承压。', '利差仍是背景，但不再是全部解释｜美日收益率差依然重要，但近1个月以来，市场更集中讨论的是财政和政策是否会持续冲击日元的供求与风险溢价。', '干预只能减速，不是修复｜一旦当局出手买入日元，往往会压低单边速度，但这并不意味着财政和政策问题已经消失。', '政策节点仍是短期决定因素｜日本央行表态、财务省数据和市场对政策一致性的判断，仍会决定日元在短期内的波动节奏。']],
    cny: ['核心结论：近1个月，人民币对美元温和升值约0.67%，这更像是美元阶段性回落叠加政策管理与贸易顺差共同支撑，而不是人民币单边走强。', ['美元回落提供外部支撑｜美元指数较弱，外部资金对美元资产的偏好回落，给人民币带来阶段性修复空间。', '结售汇节奏仍是关键｜出口企业结汇与跨境收付款的节奏，持续影响人民币外汇供求，短期内构成重要支撑。', '政策管理仍在压制单边预期｜中间价和外汇管理工具持续引导市场预期，使人民币更容易保持稳中偏强，而不是出现失控式升值。', '内需修复不足限制升值幅度｜国内需求和地产修复仍偏弱，降低了人民币形成更大幅度升值的基础。', '因此，近1个月人民币的升值主要是“稳中偏强”而非“强势扩张”。']],
  },
  180: {
    jpy: ['核心结论：近6个月，日元弱势的核心仍然是财政扩张叙事与政策不确定性，而非单一利差；但美日利差依然构成背景。', ['财政扩张叙事在中期变得更重要｜高市主张的积极财政和扩张性支出，使市场更关注日本长期赤字、国债供给和政策可信度，日元的风险溢价有所抬升。', '利差仍是背景，但不再足以解释全部变化｜美日收益率差仍然影响套息与资本流向，但财政问题在过去半年中逐渐变成了更关键的定价变量。', '日本政策正常化尚未得到足够信任｜央行退出超宽松的过程仍然相对温和，财政扩张与债务压力叠加后，市场对日元的长期持有意愿下降。', '官方干预只能压制波动｜日本财务省公布月度干预数据显示当局确实出手，但干预更像是缓冲，不是修复结构性弱点。', '因此，近6个月的日元弱势更接近“财政放大利差”而不是纯利差逻辑。']],
    cny: ['核心结论：近6个月，人民币对美元走强的核心原因仍然是美元周期回落、贸易顺差和政策管理共同作用，而不是单一事件。', ['美元回落给予外部支撑｜在美元指数承压背景下，人民币相对美元的修复空间被放大，形成阶段性升值。', '出口和结售汇仍是主要供求支撑｜制造业出口、企业结汇和跨境资金流动，持续提供外汇流入，支撑人民币保持偏强。', '政策管理使人民币更稳｜中间价、外汇工具和宏观审慎措施有效压制单边投机预期，使人民币更偏“稳中偏强”，而非盲目升值。', '内需与地产仍是边界条件｜国内需求修复仍不充分，限制了人民币走强幅度，避免出现过快升值。', '因此，近6个月的人民币走势更像是“有管理的修复”，而不是无约束的强势。']],
  },
  365: {
    jpy: ['核心结论：近1年，日元弱势仍然受到财政与政策不确定性的放大，但它的底层主因仍是美日利差。也就是说，财政叙事更强地改变了市场定价，而不是替代了利差。', ['利差仍是主轴｜美联储较高利率与日本央行极低政策利率的结构差，依然是过去一年日元承压的核心背景。', '财政扩张令日元风险溢价上升｜政府扩张支出、较高赤字和债务供给加剧了市场对日本财政可持续性的担忧，削弱了对日元的长期持有信心。', '政策正常化节奏不匹配｜日本央行逐步退出超宽松，但在财政扩张叙事下，市场仍认为政策调整不足以修复长期弱势。', '干预只是缓冲｜月度干预数据证明当局有动作，但这更像是压制极端波动，而不是扭转利差主导的结构性背景。', '因此，近1年更准确的判断是：利差是底层主因，财政与政策不确定性是放大器。']],
    cny: ['核心结论：近1年，人民币对美元升值约6.20%，本质上是美元周期转弱、出口顺差和企业结汇共同作用，形成了较强的修复基础。', ['美元阶段性转弱是核心变量｜美元从更高位回落，给人民币提供了明显修复空间。', '贸易顺差和企业结汇持续支撑｜出口收入与经常账户顺差推动外汇流入，增强了人民币供需平衡。', '政策管理抑制过度升值｜中间价和宏观审慎工具持续稳定市场预期，避免人民币出现失控式升值。', '国内需求仍是约束｜房地产和内需恢复仍偏弱，限制了人民币进一步加速升值的幅度。', '所以，近1年看，人民币更像是在“有秩序的修复”，而不是单纯美元环境推动的强势。']],
  },
  1095: {
    jpy: ['核心结论：近3年，日元对美元继续弱势，主因仍然是美日利差持续扩大。日本央行退出超宽松的速度明显慢于美联储，导致日元在资本流和套息交易中长期承压。', ['利差是三年周期的主因｜美元资产收益率持续高于日元资产收益率，促进了持续的日元融资和美元配置需求。', '政策正常化仍不足以逆转结构｜日本央行逐步加息，但起点极低，且退出节奏远慢于市场对“利差修正”的预期。', '财政扩张会放大波动，但不改变长期逻辑｜财政赤字、国债供给和低增长结构确实会提高市场对日元风险的敏感度，但它们更像是放大器，而非替代利差解释三年走势的主因。', '市场定价依然遵循收益率差｜在三年视角下，日元弱势最直接的解释仍然是资金流和套息交易偏向美元。', '干预只改变节奏｜短期干预可能压缩跌势速度，但不能改变长期结构性利差背景。']],
    cny: ['核心结论：近3年，人民币对美元升值约6.68%，本质上是美元周期中枢变化、出口顺差和政策管理共同推动，而非单一因素。', ['美元周期变化是关键｜在过去三年中，美元中枢和利率预期变化对人民币形成重要外部影响。', '出口与经常账户提供底部支撑｜制造业出口和经常账户顺差为人民币提供了持续外汇流入。', '政策管理维持稳定｜中间价和外汇工具防止人民币被过度放大，避免形成失控式升值。', '内需和房地产制约上行幅度｜国内需求修复有限，降低了人民币持续大幅升值的基础。', '因此，人民币三年利好更多来自“稳健修复”和顺差支持，而不是强周期式大幅升值。']],
  },
  1825: {
    jpy: ['核心结论：近5年，日元对美元累计明显走弱，核心仍然是美日利差结构性扩大。日本长期处于低利率、美国长期处于高利率，形成了对日元持续的资本流和套息压制。', ['五年周期的主因依然是收益率差｜美元和美元资产收益率与日元资产收益率之间的长期差异，构成了日元弱势的根本背景。', '财政扩张会放大，但不替代利差｜日本财政赤字和扩张性政策确实提高了市场风险溢价，但在五年视角下，它更像是放大器，而不是替代利差解释长期走势的主因。', '低增长和高债务形成结构性约束｜在低增长和高债务环境中，日元难以形成持续的中长期强势。', '政策正常化速度有限｜日本央行退出超宽松仍相对温和，导致利差没有在五年内被真正压缩。', '因此，5年视角下，日元弱势的核心定性仍然是“利差主导”。']],
    cny: ['核心结论：近5年，人民币对美元仅小幅贬值约4.16%，说明人民币的波动受到政策管理、贸易顺差和国内增长约束共同限制，不是无底线贬值。', ['美元周期冲击仍是外部变量｜过去五年中美元整体位于相对高位，对人民币形成持续压力。', '贸易顺差提供缓冲｜制造业出口和经常账户顺差，降低了人民币大幅贬值的幅度。', '政策管理抑制超调｜中间价和宏观审慎工具减少了单边投机，限制了人民币幅度性贬值。', '国内需求和地产调整限制人民币走强｜内需修复不足和房地产压力，限制了人民币长期走强的动力。', '因此，五年视角下人民币的走势更像是“受管理的双向波动”，而不是纯粹的强势/弱势单边。']],
  },
};
let activePair = 'cnyjpy', activeChartPeriod = '180', dataReady = false;
const signed = value => `${value >= 0 ? '+' : '−'}${Math.abs(value).toFixed(2)}%`;
const setDirection = (element, value) => { element.classList.toggle('positive', value >= 0); element.classList.toggle('negative', value < 0) };

const trendControlPanel = document.querySelector('.trend-controls');
const trendCard = document.querySelector('.trend-card');
if (trendControlPanel && trendCard && trendControlPanel.parentElement !== trendCard) { trendCard.appendChild(trendControlPanel); trendControlPanel.classList.add('trend-controls-bottom') }

function renderDrivers(period) {
  const data = driverPeriods[period];
  if (!data) return;
  const jpyValue = document.querySelector('#jpy-driver-value'), cnyValue = document.querySelector('#cny-driver-value'), totalValue = document.querySelector('#driver-total-value');
  jpyValue.textContent = signed(data.jpy); cnyValue.textContent = signed(data.cny); totalValue.textContent = signed(data.total);
  setDirection(jpyValue, data.jpy); setDirection(cnyValue, data.cny); setDirection(totalValue, data.total);
  document.querySelector('#jpy-driver-copy').textContent = data.jpy >= 0 ? '日元相对美元走弱' : '日元相对美元走强';
  document.querySelector('#cny-driver-copy').textContent = data.cny >= 0 ? '人民币相对美元走强' : '人民币相对美元走弱';
  document.querySelector('#driver-total-label').textContent = `过去${periodLabels[period]}人民币兑日元变化（对数）`;
  const logExample = document.querySelector('#log-example-values'), logFormula = document.querySelector('#log-example-formula');
  if (logExample) { logExample.textContent = `对数变化 ${signed(data.total)} → 普通涨幅 ${signed(data.ordinary)}`; logFormula.innerHTML = `e<sup>${(data.total / 100).toFixed(4)}</sup> − 1 = ${signed(data.ordinary)}` }
  const scale = Math.max(Math.abs(data.jpy), Math.abs(data.cny), .01);
  const jpyBar = document.querySelector('#jpy-driver-bar'), cnyBar = document.querySelector('#cny-driver-bar');
  for (const [bar, value] of [[jpyBar, data.jpy], [cnyBar, data.cny]]) { bar.style.width = `${Math.max(5, Math.abs(value) / scale * 82)}%`; bar.classList.toggle('positive-fill', value >= 0); bar.classList.toggle('negative-fill', value < 0) }
}
const renderContextReasons = (id, reasons) => { document.querySelector(id).innerHTML = reasons.map((copy, index) => { const explicit = copy.split('｜'), separator = copy.indexOf('，'), title = explicit.length > 1 ? explicit[0] : separator > 0 ? copy.slice(0, separator) : copy, detail = explicit.length > 1 ? explicit.slice(1).join('｜') : separator > 0 ? copy.slice(separator + 1) : copy; return `<li><span>${String(index + 1).padStart(2, '0')}</span><div><b>${title}</b><p>${detail}</p></div></li>` }).join('') };
function renderMarketContext(period) {
  const context = marketContext[period] || marketContext[180], label = periodLabels[period] || '6个月', stats = driverPeriods[period];
  document.querySelector('#events-title').textContent = `近${label}，两侧发生了什么？`;
  document.querySelector('#jpy-context-title').textContent = `为什么日元兑美元${stats && stats.jpy < 0 ? '走强' : '走弱'}？`;
  document.querySelector('#cny-context-title').textContent = `为什么人民币兑美元${stats && stats.cny < 0 ? '走弱' : '走强'}？`;
  document.querySelector('#context-updated-date').textContent = `内容更新：${marketContextUpdatedAt}`;
  document.querySelector('#jpy-context-conclusion').textContent = context.jpy[0];
  document.querySelector('#cny-context-conclusion').textContent = context.cny[0];
  renderContextReasons('#jpy-context-reasons', context.jpy[1]); renderContextReasons('#cny-context-reasons', context.cny[1]);
  if (!stats) return;
  const direction = stats.ordinary >= 0 ? '上涨' : '下跌', jpy = Math.abs(stats.jpy), cny = Math.abs(stats.cny), total = jpy + cny;
  let split = stats.jpy * stats.cny >= 0 ? `日元侧与人民币侧约占 ${Math.round(jpy / total * 100)}% 和 ${Math.round(cny / total * 100)}%。` : `两侧方向相反：日元侧贡献 ${stats.jpy.toFixed(2)} 个百分点，人民币侧贡献 ${stats.cny.toFixed(2)} 个百分点。`;
  document.querySelector('#context-period-note').innerHTML = `<b>阅读口径：</b>近${label}人民币兑日元${direction}约${Math.abs(stats.ordinary).toFixed(2)}%。${split}这里整理的是与走势一致的政策及资金线索，不证明任何单一因素与汇率之间存在确定因果关系。`;
}

document.querySelector('[data-toggle="method"]').addEventListener('click', event => { const box = document.querySelector('#method-box'); box.classList.toggle('hidden'); event.currentTarget.textContent = box.classList.contains('hidden') ? '查看计算方法⌄' : '收起计算方法⌃' });
const logModal = document.querySelector('#log-help-modal'), logOpenButton = document.querySelector('[data-open-log-help]'), logCloseButton = document.querySelector('[data-close-log-help]');
function closeLogModal() { logModal.classList.add('hidden'); document.body.classList.remove('modal-open'); logOpenButton.focus() }
logOpenButton.addEventListener('click', () => { logModal.classList.remove('hidden'); document.body.classList.add('modal-open'); logCloseButton.focus() });
logCloseButton.addEventListener('click', closeLogModal);
logModal.addEventListener('click', event => { if (event.target === logModal) closeLogModal() });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !logModal.classList.contains('hidden')) closeLogModal() });

function emptyChart(message) {
  const canvas = document.querySelector('#fx-trend-chart'), ctx = canvas.getContext('2d'), dpr = window.devicePixelRatio || 1, box = canvas.getBoundingClientRect(), width = Math.max(1, box.width), height = canvas.clientHeight || 310;
  canvas.width = width * dpr; canvas.height = height * dpr; ctx.scale(dpr, dpr); ctx.clearRect(0, 0, width, height); ctx.fillStyle = '#87938d'; ctx.font = '12px Manrope'; ctx.textAlign = 'center'; ctx.fillText(message, width / 2, height / 2);
}
function hoverLabel(period, index) { return period.dates?.[index] || '—' }
function drawFxChart(pair, hoverIndex = null) {
  activePair = pair; const series = chartSeries[pair], period = series.periods[activeChartPeriod];
  if (!dataReady || !period) { emptyChart('等待真实汇率数据'); return }
  const canvas = document.querySelector('#fx-trend-chart'), ctx = canvas.getContext('2d'), dpr = window.devicePixelRatio || 1, box = canvas.getBoundingClientRect(), width = Math.max(1, box.width), height = canvas.clientHeight || 310;
  canvas.width = width * dpr; canvas.height = height * dpr; ctx.scale(dpr, dpr); ctx.clearRect(0, 0, width, height);
  const pad = { left: 16, right: 62, top: 18, bottom: 24 }, values = period.values, minValue = Math.min(...values), maxValue = Math.max(...values), range = Math.max(maxValue - minValue, .001), min = minValue - range * .16, max = maxValue + range * .16;
  const point = (value, index) => ({ x: pad.left + (width - pad.left - pad.right) * index / (values.length - 1), y: pad.top + (max - value) / (max - min) * (height - pad.top - pad.bottom) });
  ctx.font = '10px DM Mono'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  for (let index = 0; index < 4; index++) { const y = pad.top + (height - pad.top - pad.bottom) * index / 3, value = max - (max - min) * index / 3; ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(width - pad.right, y); ctx.strokeStyle = '#e7ece9'; ctx.lineWidth = 1; ctx.stroke(); ctx.fillStyle = '#8a958f'; ctx.fillText(pair === 'usdcny' ? value.toFixed(3) : value.toFixed(2), width - 8, y) }
  const gradient = ctx.createLinearGradient(0, pad.top, 0, height - pad.bottom); gradient.addColorStop(0, `${series.color}35`); gradient.addColorStop(1, `${series.color}00`);
  ctx.beginPath(); values.forEach((value, index) => { const p = point(value, index); index ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y) }); const last = point(values.at(-1), values.length - 1); ctx.lineTo(last.x, height - pad.bottom); ctx.lineTo(pad.left, height - pad.bottom); ctx.closePath(); ctx.fillStyle = gradient; ctx.fill();
  ctx.beginPath(); values.forEach((value, index) => { const p = point(value, index); index ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y) }); ctx.strokeStyle = series.color; ctx.lineWidth = 2.7; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
  ctx.beginPath(); ctx.arc(last.x, last.y, 4.5, 0, Math.PI * 2); ctx.fillStyle = series.color; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
  const tooltip = document.querySelector('#fx-chart-tooltip');
  if (Number.isInteger(hoverIndex) && hoverIndex >= 0 && hoverIndex < values.length) { const selected = point(values[hoverIndex], hoverIndex), relative = (values[hoverIndex] / values[0] - 1) * 100, decimals = pair === 'usdjpy' ? 2 : 4; ctx.beginPath(); ctx.moveTo(selected.x, pad.top); ctx.lineTo(selected.x, height - pad.bottom); ctx.strokeStyle = '#86938d'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]); ctx.beginPath(); ctx.arc(selected.x, selected.y, 5, 0, Math.PI * 2); ctx.fillStyle = series.color; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.stroke(); tooltip.innerHTML = `<b>${series.pair} · ${hoverLabel(period, hoverIndex)}</b><strong>${values[hoverIndex].toFixed(decimals)}</strong><span>相对周期起点</span><em class="${relative >= 0 ? 'positive' : 'negative'}">${signed(relative)}</em>`; tooltip.style.left = `${selected.x}px`; tooltip.style.top = `${selected.y}px`; tooltip.classList.toggle('flip', selected.x > width * .68); tooltip.classList.remove('hidden') } else tooltip.classList.add('hidden');
  document.querySelector('#trend-pair').textContent = series.pair; document.querySelector('#trend-current').textContent = series.current;
  const conversion = document.querySelector('#trend-conversion');
  if (pair === 'cnyjpy') { conversion.textContent = `10,000日元 ≈ ${(10000 / Number(series.current)).toFixed(2)}人民币`; conversion.classList.remove('hidden') } else { conversion.classList.add('hidden') }
  const label = periodLabels[activeChartPeriod], change = document.querySelector('#trend-change'); change.textContent = `过去${label} ${signed(period.change)}`; setDirection(change, period.change);
  document.querySelector('#trend-title').textContent = `过去${label}汇率走势`; document.querySelector('#chart-period-start').textContent = period.dates[0]; document.querySelector('#trend-description').textContent = series.description; canvas.setAttribute('aria-label', `过去${label}${series.pair}走势图`);
}

document.querySelectorAll('[data-chart-pair]').forEach(button => button.addEventListener('click', () => { if (!dataReady) return; document.querySelectorAll('[data-chart-pair]').forEach(item => item.classList.toggle('active', item === button)); drawFxChart(button.dataset.chartPair) }));
document.querySelectorAll('[data-chart-period]').forEach(button => button.addEventListener('click', () => { if (!dataReady) return; activeChartPeriod = button.dataset.chartPeriod; document.querySelectorAll('[data-chart-period]').forEach(item => item.classList.toggle('active', item === button)); drawFxChart(activePair); renderDrivers(activeChartPeriod); renderMarketContext(activeChartPeriod) }));
let chartResizeTimer; window.addEventListener('resize', () => { clearTimeout(chartResizeTimer); chartResizeTimer = setTimeout(() => drawFxChart(activePair), 100) });
const trendCanvas = document.querySelector('#fx-trend-chart');
function updateChartPointer(event) {
  if (!dataReady) return;
  const rect = trendCanvas.getBoundingClientRect(), period = chartSeries[activePair].periods[activeChartPeriod], plotLeft = 16, plotRight = 62, plotWidth = Math.max(1, rect.width - plotLeft - plotRight), x = Math.min(plotWidth, Math.max(0, event.clientX - rect.left - plotLeft)), index = Math.round(x / plotWidth * (period.values.length - 1));
  drawFxChart(activePair, index);
}
trendCanvas.addEventListener('pointerdown', event => { if (event.pointerType === 'touch') updateChartPointer(event) });
trendCanvas.addEventListener('pointermove', updateChartPointer);
trendCanvas.addEventListener('pointerleave', event => { if (event.pointerType !== 'touch') drawFxChart(activePair) });
trendCanvas.addEventListener('pointercancel', () => drawFxChart(activePair));
document.addEventListener('pointerdown', event => { if (event.pointerType === 'touch' && !trendCanvas.contains(event.target)) drawFxChart(activePair) });

function applyPayload(payload) {
  if (!payload || payload.schemaVersion !== 1 || !payload.periods || !payload.attribution) throw new Error('invalid yen-rate payload');
  for (const key of Object.keys(chartSeries)) {
    const periods = payload.periods[key]; if (!periods) throw new Error(`missing ${key}`);
    chartSeries[key].current = Number(payload.latest[key]).toFixed(key === 'usdjpy' ? 2 : 4);
    for (const period of Object.keys(periodLabels)) { const raw = periods[period]; if (!raw?.points?.length) throw new Error(`missing ${key}/${period}`); chartSeries[key].periods[period] = { change: Number(raw.change), values: raw.points.map(point => Number(point.value)), dates: raw.points.map(point => point.date) } }
  }
  for (const period of Object.keys(periodLabels)) { const raw = payload.attribution[period]; driverPeriods[period] = { jpy: Number(raw.jpyContribution), cny: Number(raw.cnyContribution), total: Number(raw.totalLogChange), ordinary: Number(raw.ordinaryChange), dominant: raw.dominant, startDate: raw.startDate, endDate: raw.endDate } }
  const provider = String(payload.source?.provider || '官方日频数据'), shortProvider = provider.includes('European Central Bank') ? 'ECB' : 'FRED';
  const latest = new Date(`${payload.latestCommonDate}T00:00:00Z`), today = new Date(), cursor = new Date(latest); let businessLag = 0;
  while (cursor < today) { cursor.setUTCDate(cursor.getUTCDate() + 1); const day = cursor.getUTCDay(); if (day !== 0 && day !== 6 && cursor <= today) businessLag++ }
  const stale = businessLag > 3, status = document.querySelector('[data-status-label]'), dot = document.querySelector('.demo-dot');
  status.textContent = stale ? `${shortProvider} 数据延迟` : `${shortProvider} 日频数据`; dot?.classList.toggle('stale', stale);
  const japanUpdated = window.formatJapanHeaderTime?.(payload.generatedAt) || '—';
  const updatedElement = document.querySelector('[data-updated]'); updatedElement.textContent = japanUpdated; updatedElement.title = `汇率数据截至最近共同交易日 ${payload.latestCommonDate}`;
  dataReady = true; document.querySelector('#chart-data-source').textContent = `${shortProvider} 日频参考汇率 · 同日对齐`; renderDrivers('180'); renderMarketContext('180'); drawFxChart('cnyjpy');
}

async function loadRates() {
  emptyChart('正在加载真实汇率数据…');
  try { const response = await fetch('data/yen-rates.json', { cache: 'no-cache' }); if (!response.ok) throw new Error(`HTTP ${response.status}`); applyPayload(await response.json()) }
  catch (error) { console.error('Yen-rate data unavailable', error); document.querySelector('[data-status-label]').textContent = '等待真实数据'; document.querySelector('[data-updated]').textContent = '尚未生成'; document.querySelector('#trend-current').textContent = '—'; document.querySelector('#trend-change').textContent = '等待日频数据'; document.querySelector('#trend-description').textContent = '首次运行汇率数据更新任务后，这里将显示官方真实历史序列。'; emptyChart('真实汇率数据尚未生成') }
}
loadRates();

const eventLabels = {
  country: { cn: ['中国', 'cn-tag'], jp: ['日本', 'jp-tag'], us: ['美国', 'us-tag'] },
  impact: { cny: ['人民币侧', ''], jpy: ['日元侧', ''], both: ['两侧', 'both'] }
};
const escapeHtml = value => String(value).replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
function renderEventCalendar(payload) {
  if (!payload || payload.schemaVersion !== 1 || !Array.isArray(payload.events)) throw new Error('invalid yen-event payload');
  const calendar = document.querySelector('#future-calendar');
  document.querySelector('.calendar-window').textContent = `未来${payload.windowDays || 30}天`;
  if (!payload.events.length) { calendar.innerHTML = '<p class="calendar-empty">未来30天暂无已确认的重要官方日程。</p>'; return }
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  calendar.innerHTML = payload.events.map(event => {
    const datePart = String(event.datetime).slice(0, 10), parts = datePart.split('-').map(Number), localDate = new Date(parts[0], parts[1] - 1, parts[2]);
    const country = eventLabels.country[event.country] || ['其他', ''], impact = eventLabels.impact[event.impact] || ['关注', ''];
    return `<article${event.major ? ' class="calendar-major"' : ''}><time datetime="${escapeHtml(event.datetime)}"><span>${parts[1]}月</span><b>${parts[2]}</b><small>${weekdays[localDate.getDay()]}</small></time><div class="calendar-line"></div><div class="calendar-content"><div><span class="country-tag ${country[1]}">${country[0]}</span><em>${escapeHtml(event.timeLabel)}</em></div><h3><a href="${escapeHtml(event.sourceUrl)}" target="_blank" rel="noopener">${escapeHtml(event.title)}</a></h3><p>${escapeHtml(event.summary)}</p></div><span class="impact ${impact[1]}">${impact[0]}</span></article>`;
  }).join('');
}
async function loadEventCalendar() {
  try { const response = await fetch('data/yen-events.json', { cache: 'no-cache' }); if (!response.ok) throw new Error(`HTTP ${response.status}`); renderEventCalendar(await response.json()) }
  catch (error) { console.error('Yen event calendar unavailable', error); document.querySelector('#future-calendar').innerHTML = '<p class="calendar-empty">事件日历暂时无法加载，请稍后刷新。</p>' }
}
loadEventCalendar();
