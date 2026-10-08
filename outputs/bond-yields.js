(() => {
  const section = document.querySelector('.bond-section');
  if (!section) return;
  const historySvg = section.querySelector('#bond-history-chart');
  const historyDate = section.querySelector('#bond-history-date');
  const styles = { cn: { color: '#ce892d', name: '中国' }, us: { color: '#4d79bc', name: '美国' }, jp: { color: '#c66868', name: '日本' } };
  const visible = new Set(['cn', 'us', 'jp']), ns = 'http://www.w3.org/2000/svg', dayMs = 86400000;
  const timestamp = day => Date.parse(`${day}T00:00:00Z`);
  const isoDay = time => new Date(time).toISOString().slice(0, 10);
  const percent = value => value === null || value === undefined ? '无报价' : `${Number(value).toFixed(3)}%`;
  const node = (tag, attrs = {}, text) => {
    const el = document.createElementNS(ns, tag);
    Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
    if (text !== undefined) el.textContent = text;
    return el;
  };
  let payload, years = 10, historyDay, historyBounds, unionDates;
  const tenYearIndex = 5;
  function status(id, message) {
    const el = section.querySelector(id); el.textContent = message; el.classList.toggle('hidden', !message);
  }
  function readout(id, accessor) {
    const el = section.querySelector(id); el.replaceChildren();
    for (const series of payload.series) {
      if (!visible.has(series.id)) continue;
      const span = document.createElement('span');
      span.style.setProperty('--policy-color', styles[series.id].color);
      span.textContent = `${series.name} ${percent(accessor(series))}`;
      el.append(span);
    }
  }
  function frame(svg, values, title) {
    const width = Math.max(280, svg.getBoundingClientRect().width), height = width < 600 ? 260 : 300;
    const pad = { left: 16, right: 53, top: 20, bottom: 35 };
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`); svg.style.height = `${height}px`;
    svg.replaceChildren(node('title', {}, title));
    let min = Math.min(0, ...values), max = Math.max(1, ...values);
    const step = max - min > 3 ? 1 : .5;
    min = Math.floor((min - .1) / step) * step; max = Math.ceil((max + .1) / step) * step;
    const y = value => pad.top + (max - value) / (max - min) * (height - pad.top - pad.bottom);
    for (let v = min; v <= max + .001; v += step) {
      svg.append(node('line', { x1: pad.left, x2: width - pad.right, y1: y(v), y2: y(v), stroke: v === 0 ? '#c9d4ce' : '#e9eeeb', 'stroke-dasharray': v === 0 ? 'none' : '3 4' }));
      svg.append(node('text', { x: width - 5, y: y(v) + 3, 'text-anchor': 'end', fill: '#85928b', 'font-size': 10 }, `${v.toFixed(1)}%`));
    }
    return { width, height, pad, y };
  }
  function inspectHistory(day) {
    if (!payload || !historyBounds) return;
    const { start, end, x, y, pad, height } = historyBounds;
    historyDay = isoDay(Math.max(start, Math.min(end, timestamp(day))));
    historyDate.value = historyDay;
    historySvg.querySelector('.bond-crosshair')?.remove();
    const group = node('g', { class: 'bond-crosshair', 'pointer-events': 'none', 'aria-hidden': 'true' });
    if (visible.size) group.append(node('line', { x1: x(timestamp(historyDay)), x2: x(timestamp(historyDay)), y1: pad.top, y2: height - pad.bottom, stroke: '#8d9c94', 'stroke-dasharray': '4 4' }));
    for (const series of payload.series) {
      const value = series.byDate.get(historyDay)?.[tenYearIndex];
      if (!visible.has(series.id) || value === undefined || value === null) continue;
      group.append(node('circle', { cx: x(timestamp(historyDay)), cy: y(value), r: 4, fill: styles[series.id].color, stroke: '#fff', 'stroke-width': 2 }));
    }
    historySvg.append(group);
    readout('#bond-history-values', s => s.byDate.get(historyDay)?.[tenYearIndex]);
  }
  function drawHistory() {
    if (!payload) return;
    const end = timestamp(payload.latestCommonDate), startDate = new Date(end);
    startDate.setUTCFullYear(startDate.getUTCFullYear() - years);
    const start = Math.max(startDate.getTime(), timestamp(payload.historyStart));
    const dates = unionDates.filter(day => timestamp(day) >= start && timestamp(day) <= end);
    const selected = payload.series.filter(s => visible.has(s.id));
    const values = selected.flatMap(s => dates.map(day => s.byDate.get(day)?.[tenYearIndex])).filter(v => v !== null && v !== undefined);
    const bounds = frame(historySvg, values, `近${years}年中美日10年期国债收益率，单位百分比`);
    const { width, height, pad, y } = bounds;
    const x = time => pad.left + (time - start) / (end - start) * (width - pad.left - pad.right);
    historyBounds = { ...bounds, x, start, end };
    historyDate.min = isoDay(start); historyDate.max = isoDay(end);
    const ticks = width < 600 ? 3 : 5;
    for (let i = 0; i < ticks; i++) {
      const time = start + (end - start) * i / (ticks - 1);
      historySvg.append(node('text', { x: x(time), y: height - 8, 'text-anchor': i === 0 ? 'start' : i === ticks - 1 ? 'end' : 'middle', fill: '#85928b', 'font-size': 10 }, isoDay(time).slice(0, 7)));
    }
    for (const series of selected) {
      let path = '', previous;
      // Connect adjacent actual quotes linearly across holidays and missing dates.
      for (const day of dates) {
        const value = series.byDate.get(day)?.[tenYearIndex], time = timestamp(day);
        if (value === undefined || value === null) continue;
        path += `${previous !== undefined ? 'L' : 'M'} ${x(time).toFixed(2)} ${y(value).toFixed(2)} `;
        previous = time;
      }
      historySvg.append(node('path', { d: path, fill: 'none', stroke: styles[series.id].color, 'stroke-width': 1.8, 'stroke-linejoin': 'round', 'data-series': series.id }));
    }
    historySvg.setAttribute('aria-label', `近${years}年10年期国债收益率；左右方向键查看日期，休市或缺失时报无报价`);
    status('#bond-history-status', visible.size ? '' : '点击国家卡片选择要显示的曲线');
    inspectHistory(historyDay || payload.latestCommonDate);
  }
  historyDate.addEventListener('change', () => { if (historyDate.value) inspectHistory(historyDate.value) });
  section.querySelectorAll('[data-bond-years]').forEach(button => button.addEventListener('click', () => {
    years = Number(button.dataset.bondYears);
    section.querySelectorAll('[data-bond-years]').forEach(el => { const active = el === button; el.classList.toggle('active', active); el.setAttribute('aria-pressed', String(active)) });
    drawHistory();
  }));
  historySvg.addEventListener('pointermove', event => {
    if (!historyBounds) return;
    const b = historyBounds, box = historySvg.getBoundingClientRect(), localX = (event.clientX - box.left) * b.width / box.width;
    const ratio = (localX - b.pad.left) / (b.width - b.pad.left - b.pad.right);
    inspectHistory(isoDay(b.start + Math.max(0, Math.min(1, ratio)) * (b.end - b.start)));
  });
  historySvg.addEventListener('keydown', event => {
    if (!payload || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault(); inspectHistory(isoDay(timestamp(historyDay) + (event.key === 'ArrowRight' ? dayMs : -dayMs)));
  });
  new ResizeObserver(() => drawHistory()).observe(historySvg.parentElement);
  fetch('data/bond-yields.json', { cache: 'no-store' }).then(response => {
    if (!response.ok) throw new Error('Yield snapshot unavailable'); return response.json();
  }).then(data => {
    if (data.schemaVersion !== 1 || data.unit !== '%' || !data.commonDates?.length || data.series?.length !== 3 || data.maturities?.join(',') !== '1,2,3,5,7,10,20,30') throw new Error('Invalid yield snapshot');
    for (const series of data.series) {
      if (!styles[series.id] || !series.curves?.length || series.curves.some((row, i) => !Number.isFinite(timestamp(row.date)) || (i && row.date <= series.curves[i - 1].date) || row.values?.length !== 8 || row.values.some(v => v !== null && !Number.isFinite(v)))) throw new Error('Invalid yield series');
      series.byDate = new Map(series.curves.map(row => [row.date, row.values]));
      if (new URL(series.source.url).protocol !== 'https:') throw new Error('Invalid source link');
    }
    if (new Set(data.series.map(s => s.id)).size !== 3 || data.commonDates.some((day, i) => !Number.isFinite(timestamp(day)) || (i && day <= data.commonDates[i - 1]) || data.series.some(s => !s.byDate.has(day) || s.byDate.get(day).some(v => v === null))) || data.commonDates.at(-1) !== data.latestCommonDate) throw new Error('Invalid comparison dates');
    payload = data;
    unionDates = [...new Set(data.series.flatMap(s => s.curves.map(r => r.date)))].sort();
    historyDate.disabled = false;
    section.querySelectorAll('[data-bond-years]').forEach(el => { el.disabled = false });
    const cards = section.querySelector('#bond-series-controls');
    for (const series of data.series) {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'policy-series-button';
      button.dataset.bondCountry = series.id; button.style.setProperty('--policy-color', styles[series.id].color);
      button.setAttribute('aria-pressed', 'true'); button.setAttribute('aria-label', `显示或隐藏${series.name}国债曲线`);
      for (const [tag, text] of [['b', series.name], ['span', series.id === 'cn' ? '中债国债到期收益率' : series.id === 'us' ? '美国国债平价收益率' : '日本国债基准收益率'], ['strong', percent(series.byDate.get(data.latestCommonDate)[tenYearIndex])], ['small', `10年期 · ${data.latestCommonDate}`]]) {
        const el = document.createElement(tag); el.textContent = text; button.append(el);
      }
      button.addEventListener('click', () => {
        visible.has(series.id) ? visible.delete(series.id) : visible.add(series.id);
        button.setAttribute('aria-pressed', String(visible.has(series.id))); drawHistory();
      });
      cards.append(button);
      const p = document.createElement('p'), link = document.createElement('a');
      link.textContent = series.source.provider; link.href = series.source.url; link.target = '_blank'; link.rel = 'noopener noreferrer';
      p.append(`${series.name}：${series.measure}。源数据截至 ${series.asOf}；`, link, '。');
      section.querySelector('#bond-source-details').append(p);
    }
    section.querySelector('#bond-data-date').textContent = `共同比较日 ${data.latestCommonDate}`;
    drawHistory();
  }).catch(error => {
    console.error(error); status('#bond-history-status', '国债数据暂时无法加载，请稍后刷新');
  });
})();
