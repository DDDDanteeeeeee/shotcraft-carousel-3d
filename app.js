import {buildCarouselProject} from './codegen/carousel3d.js';
import {contrastRatio, deriveCarouselPalette} from './lib/color-system.js';
import {downloadZip} from './lib/zip.js';

const app = document.querySelector('#app');
const toast = document.querySelector('#toast');
const sampleCards = [
  {name: '01-maxey.png', url: 'assets/samples/01-maxey.png', type: 'image/png'},
  {name: '02-brown.png', url: 'assets/samples/02-brown.png', type: 'image/png'},
  {name: '03-edgecombe.png', url: 'assets/samples/03-edgecombe.png', type: 'image/png'},
  {name: '04-embiid.png', url: 'assets/samples/04-embiid.png', type: 'image/png'},
  {name: '05-james.png', url: 'assets/samples/05-james.png', type: 'image/png'},
];

const initialPalette = deriveCarouselPalette('#0055a5');
const state = {
  tab: 'assets',
  projectName: 'Sixers Carousel 3D',
  colors: {...initialPalette, overrides: {background: false, red: false, blue: false}},
  visual: {fitMode: 'contain', cardScale: 1, cornerRadius: 30, cameraTilt: -7},
  motion: {direction: 'clockwise', durationSeconds: 5.6, radius: 400, perspective: 1550, startCard: 0},
  uploaded: [],
  errors: [],
  generated: null,
  activeCodeFile: null,
};

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const showToast = (message) => {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 1800);
};

const currentCards = () => state.uploaded.length ? state.uploaded : sampleCards;

const invalidate = () => {
  state.generated = null;
  state.activeCodeFile = null;
};

const refreshErrors = () => {
  state.errors = [];
  if (state.uploaded.length > 0 && state.uploaded.length < 3) state.errors.push('至少需要 3 张图片才能生成代码包。');
  if (state.uploaded.length > 8) state.errors.push('最多只能使用 8 张图片。');
  if (state.motion.startCard >= currentCards().length) state.motion.startCard = 0;
};

const refreshColorMetrics = () => {
  state.colors.text = contrastRatio(state.colors.background, '#f7f8f2') >= 4.5 ? '#f7f8f2' : '#10130e';
  state.colors.backgroundTextContrast = Number(contrastRatio(state.colors.background, state.colors.text).toFixed(2));
};

const applyTheme = (theme) => {
  state.colors = {...deriveCarouselPalette(theme), overrides: {background: false, red: false, blue: false}};
};

const previewMarkup = () => {
  const cards = currentCards();
  const angleStep = 360 / cards.length;
  return `
    <section class="preview-shell">
      <div class="preview-head"><span><i></i> LIVE BROWSER MOTION PREVIEW</span><div><b>${cards.length} 张卡片</b><b>${state.motion.direction === 'clockwise' ? '顺时针 ↻' : '逆时针 ↺'}</b><b>${Math.round(360 / state.motion.durationSeconds)}°/秒</b></div></div>
      <div class="preview-stage" style="--preview-bg:${state.colors.background};--preview-red:${state.colors.red};--preview-blue:${state.colors.blue};--duration:${state.motion.durationSeconds}s;--perspective:${Math.round(state.motion.perspective * 0.7)}px;--tilt:${state.visual.cameraTilt}deg;--spin:${state.motion.direction === 'clockwise' ? '360deg' : '-360deg'};--card-width:${Math.round(210 * state.visual.cardScale)}px;--card-height:${Math.round(368 * state.visual.cardScale)}px;--corner:${state.visual.cornerRadius}px;">
        <div class="horizon"></div>
        <div class="orbit-camera">
          <div class="orbit-ring" style="--radius:${Math.round(state.motion.radius * 0.52)}px;--start:${-(state.motion.startCard * angleStep)}deg;">
            ${cards.map((card, index) => `<div class="orbit-card" style="--angle:${index * angleStep}deg"><div class="card-face"><img src="${escapeHtml(card.url)}" alt="${escapeHtml(card.name)}" /></div><div class="card-face card-back"><img src="${escapeHtml(card.url)}" alt="" /></div></div>`).join('')}
          </div>
        </div>
      </div>
      <p class="preview-note">浏览器实时预览 · 最终逐帧视频由导出的 Remotion 项目在客户环境生成</p>
    </section>`;
};

const assetControls = () => {
  const cards = currentCards();
  const usingSamples = state.uploaded.length === 0;
  return `
    <section class="control-section">
      <div class="section-head"><strong>卡片素材</strong><span>${cards.length} 张 = ${cards.length} 个 3D 卡片</span></div>
      <div class="upload-grid">
        ${cards.map((card, index) => `<article class="upload-card"><img src="${escapeHtml(card.url)}" alt="${escapeHtml(card.name)}" /><span>${index + 1}</span>${usingSamples ? '' : `<div class="card-actions"><button data-action="move" data-index="${index}" data-delta="-1" ${index === 0 ? 'disabled' : ''} aria-label="前移">←</button><button data-action="move" data-index="${index}" data-delta="1" ${index === cards.length - 1 ? 'disabled' : ''} aria-label="后移">→</button><button data-action="remove" data-index="${index}" aria-label="删除">×</button></div>`}</article>`).join('')}
        <label class="upload-add"><span>＋</span><small>添加图片</small><input id="card-upload" type="file" accept="image/png,image/jpeg,image/webp" multiple /></label>
      </div>
      <div class="rule-row"><span>3–8 张</span><span>PNG / JPEG / WEBP</span><span>建议 ≥ 900×1575</span><span>上传顺序 = 环形顺序</span></div>
      ${state.errors.map((error) => `<p class="error-text">${escapeHtml(error)}</p>`).join('')}
      <div class="project-field"><label for="project-name">项目名称</label><input id="project-name" value="${escapeHtml(state.projectName)}" /></div>
      ${usingSamples ? '<p class="sample-notice">当前使用仓库内的 5 张演示卡片。首次上传后将切换为你的素材。</p>' : '<button class="secondary-button" data-action="restore-samples">恢复演示素材</button>'}
    </section>`;
};

const roleColor = (field, label, inputId) => {
  const overridden = state.colors.overrides[field];
  return `<div class="color-card ${overridden ? 'overridden' : ''}"><div><label for="${inputId}">${label}</label><button data-action="relink-color" data-field="${field}" ${overridden ? '' : 'disabled'}>${overridden ? '已手调 · 恢复' : '跟随主题'}</button></div><input id="${inputId}" type="color" value="${state.colors[field]}" /><code>${state.colors[field].toUpperCase()}</code></div>`;
};

const appearanceControls = () => `
  <section class="control-section">
    <div class="section-head"><strong>主题色驱动</strong><span>OKLCH 自动生成角色色</span></div>
    <div class="theme-driver"><div><strong>主题色</strong><small>改变后同步重算背景与两组光晕</small></div><input id="color-theme" type="color" value="${state.colors.theme}" aria-label="主题色" /><code>${state.colors.theme.toUpperCase()}</code></div>
    <div class="palette-meta"><span>${escapeHtml(state.colors.strategy)}</span><span>背景文字 ${state.colors.backgroundTextContrast}:1 · AA</span></div>
  </section>
  <section class="control-section">
    <div class="section-head"><strong>可控角色色</strong><button data-action="apply-theme">全部重新跟随</button></div>
    <div class="color-grid">${roleColor('background', '主背景', 'color-background')}${roleColor('red', '撞色光晕', 'color-red')}${roleColor('blue', '主题光晕', 'color-blue')}</div>
    <p class="helper-copy">单独调整任一角色色后，该项保留手动值；重新选择主题色会重建整套配色。</p>
  </section>
  <section class="control-section">
    <div class="section-head"><strong>图片适配</strong><span>写入 Remotion props</span></div>
    <div class="segmented"><button class="${state.visual.fitMode === 'contain' ? 'active' : ''}" data-action="set-option" data-scope="visual" data-field="fitMode" data-value="contain">完整展示</button><button class="${state.visual.fitMode === 'cover' ? 'active' : ''}" data-action="set-option" data-scope="visual" data-field="fitMode" data-value="cover">铺满裁切</button></div>
    <div class="range-list">
      ${rangeControl('card-scale', '卡片尺寸', 0.7, 1.2, 0.01, state.visual.cardScale, `${Math.round(state.visual.cardScale * 100)}%`)}
      ${rangeControl('corner-radius', '卡片圆角', 0, 48, 1, state.visual.cornerRadius, `${state.visual.cornerRadius}px`)}
      ${rangeControl('camera-tilt', '画面俯仰', -14, 4, 1, state.visual.cameraTilt, `${state.visual.cameraTilt}°`)}
    </div>
  </section>`;

const rangeControl = (id, label, min, max, step, value, output) => `<label class="range-control" for="${id}"><span><strong>${label}</strong><output id="${id}-value">${output}</output></span><input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${value}" /></label>`;

const motionControls = () => {
  const cards = currentCards();
  const speed = Math.round(360 / state.motion.durationSeconds);
  return `
    <section class="control-section">
      <div class="section-head"><strong>转动方向</strong><span>一整圈无缝循环</span></div>
      <div class="segmented"><button class="${state.motion.direction === 'clockwise' ? 'active' : ''}" data-action="set-option" data-scope="motion" data-field="direction" data-value="clockwise">顺时针 ↻</button><button class="${state.motion.direction === 'counterclockwise' ? 'active' : ''}" data-action="set-option" data-scope="motion" data-field="direction" data-value="counterclockwise">逆时针 ↺</button></div>
    </section>
    <section class="control-section">
      <div class="range-list">
        ${rangeControl('duration-seconds', '运动速度', 3, 12, 0.1, state.motion.durationSeconds, `${speed}°/秒 · ${state.motion.durationSeconds}秒/圈`)}
        ${rangeControl('ring-radius', '圆环半径', 280, 560, 10, state.motion.radius, `${state.motion.radius}px`)}
        ${rangeControl('scene-perspective', '空间透视', 1000, 2200, 50, state.motion.perspective, `${state.motion.perspective}px`)}
      </div>
    </section>
    <section class="control-section"><label class="select-field" for="start-card"><span>开场正面卡片</span><select id="start-card">${cards.map((card, index) => `<option value="${index}" ${state.motion.startCard === index ? 'selected' : ''}>#${index + 1} · ${escapeHtml(card.name)}</option>`).join('')}</select></label></section>
    <section class="control-section"><div class="config-preview"><span>输出规格</span><code>1080×1920 · 30fps · ${Math.round(state.motion.durationSeconds * 30)} frames</code></div></section>`;
};

const controlPanel = () => {
  const panels = {assets: assetControls, appearance: appearanceControls, motion: motionControls};
  return `<aside class="control-panel"><div class="panel-title"><div><span>单模板代码生成器</span><h2>配置 Carousel 3D</h2></div><b>ADAPTER READY</b></div><nav class="tabs" aria-label="配置分类">${[['assets', '素材'], ['appearance', '外观'], ['motion', '动效']].map(([key, label]) => `<button class="${state.tab === key ? 'active' : ''}" data-action="tab" data-tab="${key}">${label}</button>`).join('')}</nav><div class="panel-body">${panels[state.tab]()}</div><footer class="panel-footer"><span>交付：Remotion 源码 + 素材</span><button class="generate-button" data-action="generate" ${state.errors.length ? 'disabled' : ''}>生成完整代码包 →</button></footer></aside>`;
};

const outputPanel = () => {
  if (!state.generated) return '';
  const textFiles = state.generated.files.filter((file) => file.text != null);
  const active = textFiles.find((file) => file.path === state.activeCodeFile) || textFiles[0];
  return `<section class="output-panel"><header><div><span>GENERATED PROJECT</span><h2>${escapeHtml(state.generated.name)}</h2></div><button data-action="close-output" aria-label="关闭">×</button></header><div class="output-workspace"><nav>${textFiles.map((file) => `<button class="${file.path === active.path ? 'active' : ''}" data-action="select-code" data-path="${escapeHtml(file.path)}">${escapeHtml(file.path)}</button>`).join('')}</nav><pre><code>${escapeHtml(active.text)}</code></pre></div><footer><button class="secondary-button" data-action="copy-code">复制当前文件</button><button class="download-button" data-action="download">下载 ZIP</button></footer></section>`;
};

const render = () => {
  app.innerHTML = `<section class="workspace"><div class="workspace-main"><div class="eyebrow">STANDALONE VISUAL CARD</div><div class="page-heading"><div><h1>CAROUSEL 3D</h1><p>上传 3–8 张竖版卡片，配置视觉与运动参数，导出可直接运行的 Remotion 项目。</p></div><span>9:16 · 1080×1920</span></div>${previewMarkup()}</div>${controlPanel()}</section>${outputPanel()}`;
};

const updateRange = (id, value) => {
  const output = document.querySelector(`#${id}-value`);
  if (id === 'card-scale') {
    state.visual.cardScale = Number(value);
    if (output) output.textContent = `${Math.round(state.visual.cardScale * 100)}%`;
  }
  if (id === 'corner-radius') {
    state.visual.cornerRadius = Number(value);
    if (output) output.textContent = `${state.visual.cornerRadius}px`;
  }
  if (id === 'camera-tilt') {
    state.visual.cameraTilt = Number(value);
    if (output) output.textContent = `${state.visual.cameraTilt}°`;
  }
  if (id === 'duration-seconds') {
    state.motion.durationSeconds = Number(value);
    if (output) output.textContent = `${Math.round(360 / state.motion.durationSeconds)}°/秒 · ${state.motion.durationSeconds}秒/圈`;
  }
  if (id === 'ring-radius') {
    state.motion.radius = Number(value);
    if (output) output.textContent = `${state.motion.radius}px`;
  }
  if (id === 'scene-perspective') {
    state.motion.perspective = Number(value);
    if (output) output.textContent = `${state.motion.perspective}px`;
  }
  invalidate();
};

const validateFile = async (file) => {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error(`${file.name} 不是 PNG、JPEG 或 WEBP。`);
  const bitmap = await createImageBitmap(file);
  const result = {width: bitmap.width, height: bitmap.height};
  bitmap.close();
  if (result.width < 900 || result.height < 1575) throw new Error(`${file.name} 尺寸为 ${result.width}×${result.height}，建议至少 900×1575。`);
  return result;
};

const handleUpload = async (files) => {
  const incoming = [...files];
  if (!incoming.length) return;
  if (state.uploaded.length + incoming.length > 8) {
    showToast('最多只能使用 8 张图片');
    return;
  }
  const accepted = [];
  for (const file of incoming) {
    try {
      const size = await validateFile(file);
      accepted.push({file, name: file.name, type: file.type, url: URL.createObjectURL(file), ...size});
    } catch (error) {
      showToast(error.message);
    }
  }
  state.uploaded.push(...accepted);
  refreshErrors();
  invalidate();
  render();
};

const assetBytes = async () => {
  if (state.uploaded.length) return Promise.all(state.uploaded.map(async (item) => ({name: item.name, type: item.type, data: new Uint8Array(await item.file.arrayBuffer())})));
  return Promise.all(sampleCards.map(async (item) => {
    const response = await fetch(item.url);
    if (!response.ok) throw new Error(`无法读取演示素材：${item.name}`);
    return {name: item.name, type: item.type, data: new Uint8Array(await response.arrayBuffer())};
  }));
};

const generate = async () => {
  refreshErrors();
  if (state.errors.length) {
    render();
    showToast('请先满足 3–8 张素材要求');
    return;
  }
  try {
    const [assets, license] = await Promise.all([assetBytes(), fetch('LICENSE').then((response) => response.text())]);
    state.generated = buildCarouselProject({projectName: state.projectName, colors: state.colors, visual: state.visual, motion: state.motion, assets, licenseText: license});
    state.activeCodeFile = 'src/CardCarousel3D.tsx';
    render();
    showToast('完整代码包已生成');
  } catch (error) {
    showToast(error.message || '生成失败');
  }
};

const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.append(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }
};

document.addEventListener('click', async (event) => {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const action = target.dataset.action;
  if (action === 'tab') {
    state.tab = target.dataset.tab;
    render();
  }
  if (action === 'set-option') {
    state[target.dataset.scope][target.dataset.field] = target.dataset.value;
    invalidate();
    render();
  }
  if (action === 'apply-theme') {
    applyTheme(state.colors.theme);
    invalidate();
    render();
  }
  if (action === 'relink-color') {
    const field = target.dataset.field;
    const derived = deriveCarouselPalette(state.colors.theme);
    state.colors[field] = derived[field];
    state.colors.overrides[field] = false;
    refreshColorMetrics();
    invalidate();
    render();
  }
  if (action === 'restore-samples') {
    state.uploaded.forEach((item) => URL.revokeObjectURL(item.url));
    state.uploaded = [];
    state.motion.startCard = 0;
    refreshErrors();
    invalidate();
    render();
  }
  if (action === 'move') {
    const index = Number(target.dataset.index);
    const destination = index + Number(target.dataset.delta);
    if (destination >= 0 && destination < state.uploaded.length) {
      [state.uploaded[index], state.uploaded[destination]] = [state.uploaded[destination], state.uploaded[index]];
      state.motion.startCard = destination;
      invalidate();
      render();
    }
  }
  if (action === 'remove') {
    const [removed] = state.uploaded.splice(Number(target.dataset.index), 1);
    if (removed) URL.revokeObjectURL(removed.url);
    refreshErrors();
    invalidate();
    render();
  }
  if (action === 'generate') await generate();
  if (action === 'close-output') {
    state.generated = null;
    render();
  }
  if (action === 'select-code') {
    state.activeCodeFile = target.dataset.path;
    render();
  }
  if (action === 'copy-code') {
    const file = state.generated.files.find((item) => item.path === state.activeCodeFile);
    if (file?.text != null) {
      await copyText(file.text);
      showToast('当前文件已复制');
    }
  }
  if (action === 'download') downloadZip(state.generated.name, state.generated.files);
});

document.addEventListener('input', (event) => {
  if (event.target.id === 'project-name') {
    state.projectName = event.target.value;
    invalidate();
  }
  if (['card-scale', 'corner-radius', 'camera-tilt', 'duration-seconds', 'ring-radius', 'scene-perspective'].includes(event.target.id)) updateRange(event.target.id, event.target.value);
});

document.addEventListener('change', async (event) => {
  if (event.target.id === 'card-upload') await handleUpload(event.target.files);
  if (event.target.id === 'color-theme') {
    applyTheme(event.target.value);
    invalidate();
    render();
  }
  const colorFields = {'color-background': 'background', 'color-red': 'red', 'color-blue': 'blue'};
  if (colorFields[event.target.id]) {
    const field = colorFields[event.target.id];
    state.colors[field] = event.target.value;
    state.colors.overrides[field] = true;
    refreshColorMetrics();
    invalidate();
    render();
  }
  if (event.target.id === 'start-card') {
    state.motion.startCard = Number(event.target.value);
    invalidate();
    render();
  }
  if (['card-scale', 'corner-radius', 'camera-tilt', 'duration-seconds', 'ring-radius', 'scene-perspective'].includes(event.target.id)) render();
});

render();
