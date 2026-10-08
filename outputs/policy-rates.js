(() => {
  const svg = document.querySelector('#policy-rate-chart');
  if (!svg) return;
  const status = document.querySelector('#policy-chart-status');
  const controls = document.querySelector('#policy-series-controls');
  const dateInput = document.querySelector('#policy-inspect-date');
  const readout = document.querySelector('#policy-date-values');
  const ns = 'http://www.w3.org/2000/svg', dayMs = 86400000;
  const styles = { cn: { color: '#ce892d', name: '中国' }, us: { color: '#4d79bc', name: '美国' }, jp: { color: '#c66868', name: '日本' } };
  let payload, years = 10, selectedDate, bounds;
  const visible = new Set(['cn', 'us', 'jp']);
  const timestamp = day => Date.parse(`${day}T00:00:00Z`);
  const isoDay = value => new Date(value).toISOString().slice(0, 10);
  const percent = value => `${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 3 })}%`;
  const node = (tag, attributes = {}, text) => {
    const element = document.createElementNS(ns, tag);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
    if (text !== undefined) element.textContent = text;
    return element;
  };
  function valueAt(series, day) {
    let value;
    for (const point of series.points) { if (point.date > day) break; value = point.value }
    return value;
  }
  function setStatus(message) { status.textContent = message; status.classList.toggle('hidden', !message) }
  function inspect(day) {
    if (!bounds || !payload) return;
    selectedDate = isoDay(Math.max(bounds.start, Math.min(bounds.end, timestamp(day))));
    dateInput.value = selectedDate;
    readout.replaceChildren();
    svg.querySelector('.policy-crosshair')?.remove();
    if (!visible.size) return;
    const group = node('g', { class: 'policy-crosshair', 'pointer-events': 'none', 'aria-hidden': 'true' });
    const x = bounds.x(timestamp(selectedDate));
    group.append(node('line', { x1: x, x2: x, y1: bounds.pad.top, y2: bounds.height - bounds.pad.bottom, stroke: '#8d9c94', 'stroke-dasharray': '4 4' }));
    for (const series of payload.series) {
      if (!visible.has(series.id)) continue;
      const value = valueAt(series, selectedDate), style = styles[series.id];
      if (value === undefined) continue;
      group.append(node('circle', { cx: x, cy: bounds.y(value), r: 4, fill: style.color, stroke: '#fff', 'stroke-width': 2 }));
      const label = document.createElement('span');
      label.style.setProperty('--policy-color', style.color);
      label.textContent = `${style.name} ${percent(value)}`;
      label.title = series.measure;
      readout.append(label);
    }
    svg.append(group);
  }
  function draw() {
    if (!payload) return;
    const width = Math.max(280, svg.getBoundingClientRect().width), height = width < 600 ? 270 : 320;
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.style.height = `${height}px`;
    svg.replaceChildren(node('title', {}, `近${years}年中美日央行政策利率，年利率百分比`));
    const end = timestamp(payload.latestCommonDate), startDate = new Date(end);
    startDate.setUTCFullYear(startDate.getUTCFullYear() - years);
    const start = Math.max(startDate.getTime(), timestamp(payload.historyStart));
    dateInput.min = isoDay(start); dateInput.max = isoDay(end);
    const pad = { left: 12, right: 49, top: 20, bottom: 35 };
    const seriesInView = payload.series.filter(series => visible.has(series.id)).map(series => ({
      ...series,
      points: [{ date: isoDay(start), value: valueAt(series, isoDay(start)) }, ...series.points.filter(point => timestamp(point.date) > start && timestamp(point.date) <= end), { date: isoDay(end), value: valueAt(series, isoDay(end)) }]
    }));
    const values = seriesInView.flatMap(series => series.points.map(point => point.value));
    let min = Math.min(0, ...values), max = Math.max(1, ...values);
    const step = max - min > 3 ? 1 : 0.5;
    min = Math.floor((min - .12) / step) * step; max = Math.ceil((max + .12) / step) * step;
    const x = time => pad.left + (time - start) / Math.max(1, end - start) * (width - pad.left - pad.right);
    const y = value => pad.top + (max - value) / (max - min) * (height - pad.top - pad.bottom);
    bounds = { start, end, width, height, pad, x, y };
    for (let value = min; value <= max + .001; value += step) {
      const position = y(value);
      svg.append(node('line', { x1: pad.left, x2: width - pad.right, y1: position, y2: position, stroke: value === 0 ? '#c9d4ce' : '#e9eeeb', 'stroke-dasharray': value === 0 ? 'none' : '3 4' }));
      svg.append(node('text', { x: width - 8, y: position + 3, 'text-anchor': 'end', fill: '#85928b', 'font-size': 10 }, `${value.toFixed(1)}%`));
    }
    const ticks = width < 600 ? 3 : 5;
    for (let i = 0; i < ticks; i++) {
      const time = start + (end - start) * i / (ticks - 1);
      svg.append(node('text', { x: x(time), y: height - 8, 'text-anchor': i === 0 ? 'start' : i === ticks - 1 ? 'end' : 'middle', fill: '#85928b', 'font-size': 10 }, isoDay(time).slice(0, 7)));
    }
    for (const series of seriesInView) {
      let path = '';
      series.points.forEach((point, index) => { path += index ? ` H ${x(timestamp(point.date)).toFixed(2)} V ${y(point.value).toFixed(2)}` : `M ${x(timestamp(point.date)).toFixed(2)} ${y(point.value).toFixed(2)}` });
      svg.append(node('path', { d: path, fill: 'none', stroke: styles[series.id].color, 'stroke-width': 2.5, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', 'data-series': series.id }));
    }
    svg.setAttribute('aria-label', `近${years}年政策利率，${seriesInView.map(series => `${styles[series.id].name} ${percent(valueAt(series, payload.latestCommonDate))}`).join('，')}；可用左右方向键查看日期`);
    setStatus(visible.size ? '' : '点击上方国家卡片，选择要显示的曲线');
    inspect(selectedDate || payload.latestCommonDate);
  }
  function apply(data) {
    if (data.schemaVersion !== 1 || !/^\d{4}-\d{2}-\d{2}$/.test(data.latestCommonDate) || !Array.isArray(data.series) || data.series.length !== 3) throw new Error('Invalid policy rate data');
    const ids = new Set();
    for (const series of data.series) {
      if (!styles[series.id] || ids.has(series.id) || !series.points?.length) throw new Error('Invalid policy rate series');
      ids.add(series.id);
      if (series.points.some((point, index) => !Number.isFinite(point.value) || !Number.isFinite(timestamp(point.date)) || (index && point.date <= series.points[index - 1].date)) || series.points[0].date > data.historyStart || series.asOf < data.latestCommonDate) throw new Error('Invalid policy rate observations');
    }
    payload = data;
    controls.replaceChildren();
    const sources = document.querySelector('#policy-source-details'); sources.replaceChildren();
    for (const series of data.series) {
      const style = styles[series.id], button = document.createElement('button');
      button.type = 'button'; button.className = 'policy-series-button'; button.setAttribute('aria-pressed', 'true'); button.style.setProperty('--policy-color', style.color);
      const country = document.createElement('b'); country.textContent = style.name;
      const measure = document.createElement('span'); measure.textContent = series.shortMeasure;
      const rate = document.createElement('strong'); rate.textContent = percent(series.points.at(-1).value);
      const date = document.createElement('small'); date.textContent = `数据截至 ${series.asOf}`;
      button.append(country, measure, rate, date);
      button.addEventListener('click', () => { visible.has(series.id) ? visible.delete(series.id) : visible.add(series.id); button.setAttribute('aria-pressed', String(visible.has(series.id))); draw() });
      controls.append(button);
      const paragraph = document.createElement('p'), link = document.createElement('a');
      paragraph.append(`${style.name}：${series.measure}。`);
      const sourceUrl = new URL(series.sourceUrl);
      if (sourceUrl.protocol !== 'https:') throw new Error('Invalid policy rate source URL');
      link.href = sourceUrl.href; link.target = '_blank'; link.rel = 'noopener'; link.textContent = series.provider;
      paragraph.append(link, `，数据截至 ${series.asOf}。`); sources.append(paragraph);
    }
    document.querySelector('#policy-data-date').textContent = `共同数据截至 ${data.latestCommonDate}`;
    dateInput.disabled = false; draw();
  }
  document.querySelectorAll('[data-policy-years]').forEach(button => button.addEventListener('click', () => {
    years = Number(button.dataset.policyYears);
    document.querySelectorAll('[data-policy-years]').forEach(item => { const active = item === button; item.classList.toggle('active', active); item.setAttribute('aria-pressed', String(active)) });
    draw();
  }));
  dateInput.addEventListener('change', () => { if (dateInput.value && dateInput.validity.valid) inspect(dateInput.value) });
  svg.addEventListener('pointermove', event => {
    if (!bounds) return;
    const box = svg.getBoundingClientRect(), ratio = (event.clientX - box.left - bounds.pad.left) / (bounds.width - bounds.pad.left - bounds.pad.right);
    inspect(isoDay(bounds.start + Math.round(Math.max(0, Math.min(1, ratio)) * (bounds.end - bounds.start) / dayMs) * dayMs));
  });
  svg.addEventListener('keydown', event => {
    if (!bounds || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const time = event.key === 'Home' ? bounds.start : event.key === 'End' ? bounds.end : timestamp(selectedDate) + (event.key === 'ArrowLeft' ? -dayMs : dayMs);
    inspect(isoDay(time));
  });
  new ResizeObserver(() => draw()).observe(svg.parentElement);
  fetch('data/policy-rates.json', { cache: 'no-cache' }).then(response => { if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json() }).then(apply).catch(error => { console.error('Policy rate data unavailable', error); setStatus('央行利率数据暂时无法加载，请稍后刷新。') });
})();
