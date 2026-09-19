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
  "updatedAt": "2026.09.19",
  "jpy": [
    "核心结论：近1个月日元兑美元小幅走强，日本加息预期最终兑现提供了支撑；但美联储也同步加息，使日美利差并未因这轮决议明显收窄。日元的修复因此受到美元收益优势的牵制。",
    [
      "日本加息从预期走向兑现｜9月18日日本央行决定将政策利率从约1%提高至1.25%，9月24日起生效。此前关于更灵活加息的讨论获得了政策确认，有助于支撑持有日元的收益预期；但预期已经反映多少，决定了决议还能带来多少新增买盘。",
      "美联储同时加息，抵消部分利差利好｜美联储9月16日将目标区间提高至3.75%—4%。按日本新利率生效后的水平计算，日美政策利差仍为2.50—2.75个百分点，与本轮加息前相同。因此不能把日元走强解释为美国降息或本轮利差大幅收窄。",
      "后续加息路径比单次动作更关键｜日本央行继续保留根据经济与物价调整利率的方向，认为基础通胀接近2%，但仍需权衡能源成本对增长的影响。若市场上调日本后续加息速度，日元会获得支持；美国通胀若促使进一步收紧，则可能抵消这种作用。",
      "干预风险仍影响仓位，但不等于本月持续干预｜8月28日公布的约15.40万亿日元干预总额覆盖7月30日至8月26日，只与当前一个月窗口的开头重叠。它可以提高继续做空日元的风险、促使投资者降低杠杆，但不足以证明9月仍在干预或整段升值都由干预造成。",
      "月底净升值不代表期间单边上涨｜截至9月18日的30天数据中，日元与人民币都对美元走强，日元仅略占上风。两边相近的修复幅度让人民币兑日元接近横盘；单看日本加息，很容易高估换汇价格应有的变化。"
    ]
  ],
  "cny": [
    "核心结论：近1个月人民币兑美元温和走强，最新证据更支持“外汇净流入与季节性支出回落”的解释，而不是企业突然加速结汇。美国加息和国内消费偏弱形成约束，使人民币与日元的相对变化较小。",
    [
      "外汇净流入增强，是更直接的供求支撑｜8月银行结汇2,518亿美元、售汇2,033亿美元，顺差485亿美元；非银行部门跨境资金净流入624亿美元。外汇收入与兑换供给支持人民币，但这属于8月全月统计，不能与8月19日至9月18日的汇率窗口逐日对应。",
      "结汇顺差扩大，不等于企业抢着结汇｜8月企业外汇收入结汇率为61.5%，比前7个月平均水平低2.7个百分点。顺差更应从资金流入来理解，不能再把“升值预期推动结汇加速”写成本月已经证实的主要原因。",
      "分红购汇需求回落，缓解季节性压力｜外资企业分红派息较7月减少23%，从季节性高位回落，可能减轻换汇与汇出压力；货物贸易项下净流入较高也提供支持。不过留学和旅行需求仍使服务贸易支出形成反向力量。",
      "生产改善与消费偏弱并存，限制单边走强｜8月工业增加值同比增长5.2%，但社会消费品零售总额仅增长0.4%。生产端改善有助于稳定增长预期，消费修复偏弱则意味着政策支持需求仍在，人民币资产收益预期难以仅凭一组数据持续上调。",
      "美元利率上升与两侧升值相互抵消｜美联储加息提高持有美元的利息收益，对人民币构成外部约束。与此同时，日本加息支撑日元；当前窗口日元升幅略大，使人民币兑日元小幅回落，而非出现上一轮更新时那样明显的月度下跌。"
    ]
  ]
},
  180: {
  "updatedAt": "2026.09.10",
  "jpy": [
    "核心结论：近6个月日元兑美元总体走强，可以从日本政策正常化和干预风险对弱日元交易的约束来理解。仍然存在的日美利差与能源成本压力构成反向力量，因此半年走势呈现多种力量拉扯，而非单一因素主导。",
    [
      "日本加息逐步改善持有日元的收益｜日本央行6月将政策利率提高至约1%，7月维持。加息提高日元融资成本，也减少日元资产相对美元资产的收益劣势；市场若进一步预期后续加息，会提前降低对弱日元交易的依赖。",
      "干预改变单边押注的风险回报｜大规模干预的意义不仅是当期交易，还在于提高继续追空日元可能遭遇突然反弹的风险。它可以促使投资者降低杠杆、收缩仓位，为日元修复创造条件；持续升值仍需要利率和资金供求配合。",
      "剩余利差解释了为何升值并不顺畅｜以7月底政策利率看，美国仍比日本高2.50—2.75个百分点。持有美元依然有利息优势，只要日元预期升幅不足以抵消这一优势，套息需求就可能恢复，压制日元进一步走强。",
      "能源冲击同时影响贸易条件和政策预期｜油价上涨会提高日本进口账单，对日元形成压力；但输入型通胀也可能增加加息必要性。日本央行6月已指出原油涨价压低经济活动，这种增长与通胀之间的权衡，是政策路径和汇率反复的重要背景。",
      "近期修复不能平均分摊到整个半年｜半年窗口包含多轮行情，最近一个月的日元升值贡献尤其明显。高田讲话和近期干预有助于理解后段变化，但不能用9月的消息倒推解释3月以来所有波动。"
    ]
  ],
  "cny": [
    "核心结论：近6个月人民币兑美元走强，外部收支与实际结汇需求是较有依据的支撑线索；预期变化可以进一步放大这种支持。国内需求修复不均衡和美元利率仍高，则解释了人民币升值为何较为温和。",
    [
      "经常账户顺差提供持续的外汇收入基础｜二季度经常账户顺差13,337亿元，货物贸易顺差抵消了服务贸易等项目的逆差。这意味着对外交易整体有收入支撑人民币，但外汇收入是否兑换、何时兑换，决定它对即期汇率的实际作用。",
      "结汇把贸易收入转化为人民币需求｜7月银行结汇超过售汇183亿美元，比单看出口规模更接近外汇市场的兑换供求。当外汇持有人卖出外汇、买入人民币时，会对人民币形成支持；这项统计也包含银行自身业务，不能全部归于出口企业。",
      "汇率预期能放大已有的供求变化｜人民币逐步升值时，持有美元的企业可能加快结汇，进口商可能暂缓购汇，从而增加即期人民币需求。这有助于理解汇率为什么可能在经济数据仅温和改善时继续走强，但尚不能量化其实际贡献。",
      "国内需求改善不均衡，约束升值幅度｜制造业PMI在3—6月维持50及以上，7月回落、8月修复至49.8%。景气反复意味着增长和政策支持需求仍需权衡，尚不足以形成持续提高人民币资产收益预期的强劲动力。",
      "不能把人民币走强全部解释为美元走弱｜美国7月仍维持较高利率，并存在加息分歧；人民币还受到自身收支和结汇节奏影响。半年里人民币与日元均对美元升值，而日元幅度更大，最终使人民币兑日元小幅回落。"
    ]
  ]
},
  365: {
  "updatedAt": "2026.09.10",
  "jpy": [
    "核心结论：近1年日元兑美元仍净走弱，但最近半年的修复已收回部分跌幅。解释这一年，需要同时看美元资产的收益优势，以及日本加息和干预对贬值交易的约束。",
    [
      "美元收益优势仍是日元承压的背景｜日本政策利率虽已升至约1%，美国7月底仍为3.50%—3.75%。持有美元有较高利息收入，使日元融资、配置美元资产仍具吸引力；只有预期日元升值足够大，才可能抵消这一收益差。",
      "加息方向明确，不等于升值力度足够｜汇率交易的是相对预期。如果日本加息已被提前计入价格，而美国利率预期仍高，单次日本加息未必带来持续升值。高田主张更灵活加息，使市场更关注后续速度能否超出原先预期。",
      "能源成本与政策权衡增加反复｜日本需要进口能源，油价上升会增加进口支出、削弱贸易条件；与此同时，通胀上升又可能促使央行收紧。增长承压和加息预期的作用方向不同，使日元走势难以只用一条逻辑解释。",
      "近期干预与修复尚未抹去全年跌幅｜近半年日元对美元走强，而一年窗口仍净走弱，说明不同阶段方向并不一致。近期干预可能通过提高做空风险、促使仓位收缩支持反弹，但不能据此认定全年的收益差和资金供求已经逆转。"
    ]
  ],
  "cny": [
    "核心结论：近1年人民币兑美元走强，与外部收支和结汇需求的支持相符。人民币侧对人民币兑日元上涨的数学贡献略大于日元侧，不能只用“日元贬值”解释这一年的变化。",
    [
      "贸易收入为人民币提供供给端支持｜经常账户顺差意味着对外交易整体带来净收入。收入持有人兑换成人民币时，会增加外汇供给、支持人民币；因此需要同时看贸易收入和结汇行为，而不能把顺差直接等同于当期买盘。",
      "结汇节奏可能强化升值趋势｜7月银行结汇高于售汇，为近期兑换需求提供了事实线索。人民币逐步走强时，企业为避免美元收入折算缩水，可能提前结汇，形成供求与预期相互强化；单月数据并不代表全年每月情况相同。",
      "美元利率重要，但不是人民币的全部解释｜美国利率仍高，会提高持有美元的机会收益。人民币在这一背景下仍走强，提示应同时考虑自身外汇收入、兑换节奏和汇率预期，不能把升值完全归于美国宽松。",
      "内需修复反复限制升值的经济基础｜制造业景气和物价改善尚不均衡，意味着人民币资产收益预期未必持续上调。外部收支支持与国内增长约束并存，可以解释为什么汇率走强不必伴随全面的经济强周期。"
    ]
  ]
},
  1095: {
  "updatedAt": "2026.09.10",
  "jpy": [
    "核心结论：近3年日元兑美元小幅净走弱，但不能再写成“日美利差持续扩大”。这一阶段利差已从高位收窄，只是美元仍有收益优势，日本政策正常化也未使日元回到周期起点。",
    [
      "利差收窄与利差仍大可以同时成立｜2023年美国政策利率一度达5.25%—5.50%，日本仍处于负利率框架；到2026年7月底，两者约为3.50%—3.75%和1%。收益差已经缩小，但仍偏向美元，因此缓解了日元压力，却不保证日元持续升值。",
      "退出超宽松是渐进过程｜日本2024年3月结束负利率和收益率曲线控制，随后逐步提高利率。政策转向改变了长期预期，但资金是否回流，还取决于未来收益、汇率风险和对冲成本，不能由“结束负利率”直接推出强日元。",
      "套息收益与平仓风险交替影响行情｜只要日元融资成本较低，未对冲的海外资产配置就可能受利差吸引；当日元反弹或波动加大，平仓买回日元又会放大升势。这种双向作用，更适合解释三年中的多次往返。",
      "三年净变化掩盖了中间的大幅波动｜起点已在美国高利率阶段，不能把此前加息引发的全部日元跌幅算进这三年。近期日本加息和干预构成修复背景，但期初、期末的净变化不代表期间始终沿同一方向运行。"
    ]
  ],
  "cny": [
    "核心结论：近3年人民币兑美元净走强，是从2023年高美元利率背景下的起点向后观察的结果。外部利率压力缓和、外汇收入及结汇需求可以共同解释修复；人民币侧也是这一窗口交叉汇率上涨的较大贡献方。",
    [
      "美元利率较起点回落，减轻外部压力｜三年起点附近美国利率处于5.25%—5.50%的高位，2026年7月底降至3.50%—3.75%。其他条件相同时，持有美元的利息优势下降，有助于缓解人民币压力，但这不等于美元汇率全程下跌。",
      "外部收支为修复提供资金基础｜经常账户顺差使经济获得外汇净收入，为人民币提供潜在支持。最新二季度顺差和7月结汇差额说明这一机制近期仍有支撑，但不能拿最近一期数据替代三年的完整资金流分析。",
      "结汇意愿决定收入何时影响汇率｜相同的外汇收入，在企业选择留存美元时与选择兑换人民币时，对即期市场的影响不同。升值预期增强可能推动积累的外汇收入分批结汇，使汇率修复快于部分国内经济指标。",
      "周期起点解释了与五年视角的差别｜三年窗口人民币对美元净升值，五年窗口却仍净贬值，两者并不冲突。这说明近年的修复尚未完全收回更早阶段的回落，不宜把三年涨幅直接理解为持续不变的长期趋势。"
    ]
  ]
},
  1825: {
  "updatedAt": "2026.09.10",
  "jpy": [
    "核心结论：近5年人民币兑日元的明显上涨，主要来自日元兑美元的大幅净贬值。最有解释力的长期背景，是美日从共同低利率转向政策分化，以及随后较慢的日本政策正常化。",
    [
      "政策分化改变了两种货币的相对收益｜美国从2022年开始快速加息，2023年利率升至5.25%—5.50%；日本直到2024年3月才结束负利率。美元利息收入大幅提高，而日元融资仍便宜，为资金偏向美元提供了持续激励。",
      "低成本日元融资放大收益差的影响｜投资者可以借入日元持有收益更高的海外资产，对应卖出日元、买入外币的需求。该机制对未对冲或部分对冲仓位尤其重要；完整对冲会消耗利差，不能把所有海外投资都算作同等规模的日元卖压。",
      "后续正常化尚未逆转五年累计变化｜日本升至约1%改善了相对收益，美国利率也已低于2023年高点，但美元仍有利息优势。最近半年的日元修复与五年的大幅净贬值可以同时存在，表明反弹尚不足以收回此前跌幅。",
      "能源进口使日元面对额外外部冲击｜能源涨价会抬高日本进口账单、削弱贸易条件，并可能增加外币支付需求。它可以在部分阶段放大利差压力，但油价方向会变，不能把五年全部贬值都归于同一次能源冲击。",
      "财政与债务更适合作为政策约束理解｜债务负担可能增加利率上升带来的财政压力，使投资者关注政策正常化的可持续性。但债务高并不自动导致货币贬值；判断汇率仍需回到相对收益、通胀和实际资金供求。"
    ]
  ],
  "cny": [
    "核心结论：近5年人民币兑美元小幅净贬值，而人民币兑日元明显上涨，核心是日元跌得更多。人民币受到美元高利率压力，也有外部收支与结汇需求提供缓冲，近年的修复尚未完全收回早期跌幅。",
    [
      "美元加息提高了持有外币的吸引力｜美国从低利率转向高利率，提高了美元存款和债券的利息收益。其他条件相同时，这会增加外汇收入留存美元的意愿，降低立即结汇的动力，从供求上对人民币形成压力。",
      "外部收入与结汇需求提供反向支持｜货物贸易和经常账户收入可以增加外汇供给，部分抵消金融配置偏向美元的压力。真正进入即期市场的支持取决于兑换比例和时点，因此人民币与美元利率并不是机械的一对一关系。",
      "国内增长与利率预期影响资金选择｜当经济仍需要政策支持时，人民币利率快速上升的空间可能有限，美元收益优势也更难迅速消失。增长预期、企业投资回报和汇率风险会一起影响持币选择，单看贸易顺差不足以解释五年变化。",
      "近年升值属于五年路径中的修复｜三年和一年窗口人民币兑美元均走强，但五年窗口仍略弱于起点。这种差异提示，近期结汇支持和外部压力缓和修复了部分早期跌幅，不能把最近的升值速度外推到整个五年。",
      "兑日元走强不等于兑所有货币走强｜五年里日元对美元的累计跌幅明显更大，人民币侧的净贬值实际抵消了一部分人民币兑日元涨幅。因此换到更多日元，主要反映两币相对表现，不代表人民币普遍走强或购买力同步提高。"
    ]
  ]
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
