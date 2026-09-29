const driverPeriods = {};
const chartSeries = {
  cnyjpy: { pair: 'CNY / JPY', description: '1人民币可以兑换多少日元；数值上升表示人民币换日元更划算。', color: '#1aa774', periods: {} },
  usdjpy: { pair: 'USD / JPY', description: '1美元可以兑换多少日元；数值上升通常表示日元相对美元走弱。', color: '#d46b63', periods: {} },
  usdcny: { pair: 'USD / CNY', description: '1美元可以兑换多少人民币；数值上升通常表示人民币相对美元走弱。', color: '#d7923e', periods: {} }
};
const periodLabels = { 30: '1个月', 180: '6个月', 365: '1年', 1095: '3年', 1825: '5年' };
const marketContextUpdatedAt = '2026.09.29';
const marketContext = {
  30: {
    "updatedAt": "2026.09.29",
    "jpy": [
      "核心结论：日元近月对美元反弹约1.8%，幅度明显大于人民币，成为人民币兑日元回落的主因；月末修复尚不足以证明全年趋势反转。",
      [
        "日本央行9月18日将政策利率从约1%升至1.25%，9月24日生效，正常化预期改善日元持有收益。",
        "8月28日公布的干预金额提高继续做空日元的尾部风险，但不能据此认定9月持续干预。",
        "美联储9月16日将目标区间提高至3.75%—4%，日美利差仍在，限制日元升幅。",
        "能源进口成本和后续加息节奏存在双向影响，汇率波动会放大政策预期的变化。",
        "8月31日至9月28日窗口的跌幅有月末几日贡献，不能把单一会议解释为全月走势。"
      ]
    ],
    "cny": [
      "核心结论：人民币对美元仅温和走强约0.14%，但因日元走强更快，人民币兑日元反而下跌；人民币自身并未出现同幅度的贬值。",
      [
        "8月银行结汇高于售汇、跨境资金净流入，为人民币提供供求支持。",
        "外资分红派息较7月回落，季节性购汇和汇出压力减轻。",
        "工业生产改善而消费偏弱，增长信号分化，限制单边升值。",
        "美国利率仍高、国内需求仍需政策支持，人民币收益预期受约束。",
        "这段交叉汇率变化主要由日元侧相对强势造成，不能把人民币兑日元下跌直接归为人民币基本面恶化。"
      ]
    ]
  },
  180: {
    "updatedAt": "2026.09.29",
    "jpy": [
      "核心结论：半年日元对美元小幅走强，但人民币对美元走得更强，交叉汇率仍上涨；日元修复主要集中在后段。",
      [
        "日本央行年中将利率提高到约1%，9月再升至1.25%，逐步减少融资货币劣势。",
        "干预与口头警告提高追空日元的风险回报门槛。",
        "美国利率仍高约2.5—2.75个百分点，套息需求未消失。",
        "油价和日本进口账单同时影响贸易条件与加息预期。",
        "近1个月贡献了半年修复的较大部分，不能用9月消息平均解释整个半年。"
      ]
    ],
    "cny": [
      "核心结论：人民币半年对美元升约2.4%，强于日元，是人民币兑日元上涨的主要一侧；外部收支支持存在，但升值并非没有约束。",
      [
        "二季度经常账户顺差和7月银行结汇顺差提供外汇供给基础。",
        "企业结汇时点与升值预期可能互相强化即期需求。",
        "制造业景气在50附近反复，内需修复不均衡，限制人民币收益预期。",
        "美元利率仍高，人民币升值不能简单归因于美元全面走弱。",
        "人民币相对日元更强，解释了人民币兑日元半年仍上涨。"
      ]
    ]
  },
  365: {
    "updatedAt": "2026.09.29",
    "jpy": [
      "核心结论：尽管最近半年反弹，日元一年仍较去年同期偏弱；美元兑日元上升约5.5%，早期利差与套息影响尚未被抹平。",
      [
        "年初阶段美国收益优势仍明显，日元融资与海外配置需求压制日元。",
        "日本加息方向已改变预期，但节奏渐进且部分被提前计价。",
        "干预与加息带来阶段性反弹，却不足以逆转全年累计。",
        "能源进口、居民海外投资和资本流出在部分阶段增加日元卖压。",
        "一年终点包含方向相反的阶段，净变化不代表单边走势。"
      ]
    ],
    "cny": [
      "核心结论：人民币一年对美元走强约5.8%，与外部收支、结汇和美元压力缓和相符；人民币自身是人民币兑日元上涨的重要贡献方。",
      [
        "贸易和经常账户收入增加外汇供给，结汇时点决定其何时进入即期市场。",
        "升值预期可能促使企业分批结汇，放大既有供求。",
        "美国利差压力虽仍在，但相对一年前的美元环境约束减轻。",
        "国内消费和物价修复不均衡，限制升值速度与持续性。",
        "一年交叉汇率上涨来自人民币走强与日元走弱叠加，不能只归因于其中一侧。"
      ]
    ]
  },
  1095: {
    "updatedAt": "2026.09.29",
    "jpy": [
      "核心结论：三年美元兑日元仍比起点高约5.1%，日元净走弱；近期正常化和反弹尚未完全收复高利差阶段的跌幅。",
      [
        "起点处美国利率处于高位、日本仍接近负利率，收益差推动套息交易。",
        "日本2024年结束负利率和收益率曲线控制，随后加息，但退出超宽松是渐进过程。",
        "套息建仓与平仓交替，造成三年内多次剧烈反转。",
        "干预提高单边做空风险，却不能替代利率和资金流的长期调整。",
        "期初期末净值掩盖中间行情，近期反弹不能外推为三年趋势。"
      ]
    ],
    "cny": [
      "核心结论：人民币三年对美元走强约8.1%，是人民币兑日元上涨的较大贡献方；这反映美元周期、外部收支和结汇共同作用，不能写成单一美元走弱故事。",
      [
        "美国利率较三年起点高位回落，外部收益差压力减轻。",
        "经常账户顺差与贸易收入提供持续外汇来源。",
        "结汇节奏及企业美元持有决策决定收入转为人民币需求的速度。",
        "国内增长与地产等结构约束，使升值路径仍有反复。",
        "三年人民币走强与五年仍偏弱并存，说明这是阶段性修复而非无条件长期趋势。"
      ]
    ]
  },
  1825: {
    "updatedAt": "2026.09.29",
    "jpy": [
      "核心结论：五年美元兑日元上升约40.8%，日元大幅贬值是人民币兑日元上涨的绝对主因；近年反弹只收回部分跌幅。",
      [
        "2022年以来美联储快速收紧，而日本长期维持负利率，政策分化扩大美元收益优势。",
        "低成本日元融资支持未对冲海外资产配置，放大日元卖压。",
        "能源涨价抬高日本进口账单并恶化贸易条件，部分阶段加剧弱日元。",
        "日本2024年后开始正常化、美国利率回落，但美元仍有收益优势。",
        "干预与加息可改变短期风险，却未逆转五年累计路径。"
      ]
    ],
    "cny": [
      "核心结论：人民币五年对美元小幅走弱约3.8%，但跌幅远小于日元；人民币兑日元大涨主要是相对表现，不等于人民币对所有货币普遍升值。",
      [
        "美元加息与避险阶段提高美元资产吸引力，对人民币形成压力。",
        "国内增长、地产和利差约束使人民币资产收益预期承压。",
        "贸易顺差、经常账户收入和结汇需求提供反向缓冲。",
        "人民币近三年修复了部分早期跌幅，但尚未完全收回五年路径。",
        "五年交叉汇率的主导项是日元贬值，不能把人民币兑日元上涨直接当作人民币购买力全面提升。"
      ]
    ]
  }
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
const renderContextReasons = (id, reasons) => { document.querySelector(id).innerHTML = reasons.map((copy, index) => { const explicit = copy.split('｜'), separator = copy.indexOf('，'), title = explicit.length > 1 ? explicit[0] : separator > 0 ? copy.slice(0, separator) : copy, detail = explicit.length > 1 ? explicit.slice(1).join('｜') : separator > 0 ? copy.slice(separator + 1) : ''; return `<li><span>${String(index + 1).padStart(2, '0')}</span><div><b>${title}</b>${detail ? `<p>${detail}</p>` : ''}</div></li>` }).join('') };
function renderMarketContext(period) {
  if (!document.querySelector('#events-title')) return;
  const context = marketContext[period] || marketContext[180], label = periodLabels[period] || '6个月', stats = driverPeriods[period];
  document.querySelector('#events-title').textContent = `近${label}，两侧发生了什么？`;
  document.querySelector('#jpy-context-title').textContent = `为什么日元兑美元${stats && stats.jpy < 0 ? '走强' : '走弱'}？`;
  document.querySelector('#cny-context-title').textContent = `为什么人民币兑美元${stats && stats.cny < 0 ? '走弱' : '走强'}？`;
  document.querySelector('#context-updated-date').textContent = `内容更新：${context.updatedAt || marketContextUpdatedAt}`;
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
  const calendarNote = document.querySelector('#calendar-note');
  if (calendarNote) {
    const reviewed = payload.reviewedAt;
    const through = payload.reviewedThrough;
    const reviewCopy = reviewed
      ? `日程核查：${reviewed}${through ? `，覆盖至${through}` : ''}。`
      : through ? `日程覆盖至${through}。` : '';
    calendarNote.textContent = `${reviewCopy}事件日历只提示潜在波动节点，不提供结果预测。点击事件名称可查看发布机构的官方日程。`;
  }
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
