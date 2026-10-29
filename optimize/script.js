const asset = (name) => `../preview/assets/${name}`;
const tabs = [...document.querySelectorAll('.step')];
const panels = [...document.querySelectorAll('.phone-panel')];
const device = document.querySelector('.device');
const sheet = document.querySelector('.edit-sheet');
const sheetBody = document.querySelector('.optimization-sheet-body');
const title = document.querySelector('.edit-title');
const hero = document.querySelector('.hero-banner-triptych');
const albumItems = [...document.querySelectorAll('.album-item')];
const dishCards = [...document.querySelectorAll('.dish-card')];
const originalHead = [asset('album-01.webp'), asset('album-05.webp'), asset('album-03.webp')];
const headOptions = [asset('head-option-1.webp'), asset('head-option-2.webp'), asset('head-option-3.webp')];
const albumPhotos = albumItems.map((item) => item.querySelector('img').getAttribute('src'));
const dishPhotos = dishCards.map((item) => item.querySelector('img').getAttribute('src'));

const state = {
  tab: '头图',
  visited: new Set(['头图']),
  headChoice: 0,
  albumOptimized: albumPhotos.map((_, index) => index === 1),
  dishOptimized: dishPhotos.map(() => false),
  activeAlbum: 0,
  activeDish: 0,
  comparing: false,
};
let snapshot = null;

function renderPreview() {
  const headIsOriginal = state.comparing || state.headChoice === -1;
  hero.classList.toggle('custom-triptych', headIsOriginal);
  if (headIsOriginal) {
    originalHead.forEach((source, index) => hero.style.setProperty(`--custom-art-${index + 1}`, `url("${source}")`));
  } else {
    const source = headOptions[state.headChoice];
    hero.style.setProperty('--triptych-art', `url("${source}")`);
    hero.style.setProperty('--art-height', '100%');
  }
  albumItems.forEach((item, index) => {
    item.classList.toggle('light-optimized', !state.comparing && state.albumOptimized[index]);
  });
  dishCards.forEach((item, index) => {
    item.classList.toggle('light-optimized', !state.comparing && state.dishOptimized[index]);
  });
}

function selectTab(name, markVisited = true) {
  state.tab = name;
  if (markVisited) state.visited.add(name);
  tabs.forEach((tab) => {
    const active = tab.dataset.tab === name;
    tab.classList.toggle('active', active);
    tab.classList.toggle('completed', state.visited.has(tab.dataset.tab));
    tab.setAttribute('aria-selected', String(active));
  });
  panels.forEach((panel) => {
    const active = panel.dataset.panel === name;
    panel.classList.toggle('active', active);
    panel.hidden = !active;
  });
  document.querySelector('.preview-area').setAttribute('aria-label', `${name}预览`);
  sheet.dataset.mode = name === '头图' ? 'head' : name === '相册' ? 'album' : 'recommend';
  title.textContent = name === '头图' ? '门店头图' : name === '相册' ? '门店相册' : '推荐菜';
}

function optionButton(source, label, selected, index, extraClass = '') {
  return `<button class="opt-option ${extraClass} ${selected ? 'selected' : ''}" type="button" data-choice="${index}" aria-pressed="${selected}" aria-label="${label}"><img src="${source}" alt="" /><span class="opt-check">${selected ? '✓' : ''}</span><span class="opt-caption">${label}</span></button>`;
}

function renderHeadSheet() {
  sheetBody.innerHTML = `<div class="opt-head-content">
    <div class="opt-source-triptych" aria-label="你的三张原图">${originalHead.map((source) => `<img src="${source}" alt="原图" />`).join('')}<span>你的原图</span></div>
    <div class="opt-head-candidates">${headOptions.map((source, index) => optionButton(source, `生成方案 ${index + 1}`, state.headChoice === index, index, 'head-candidate')).join('')}</div>
  </div>`;
  sheetBody.querySelectorAll('.head-candidate').forEach((button) => button.addEventListener('click', () => {
    state.headChoice = Number(button.dataset.choice);
    renderHeadSheet();
    renderPreview();
  }));
}

function renderCompareSheet(kind) {
  const isAlbum = kind === 'album';
  const sources = isAlbum ? albumPhotos : dishPhotos;
  const optimized = isAlbum ? state.albumOptimized : state.dishOptimized;
  const activeIndex = isAlbum ? state.activeAlbum : state.activeDish;
  const labels = isAlbum ? ['面包', '店内陈列', '店内环境', '门店外景', '面包包装', '店内陈列', '门店图片', '门店图片', '门店图片', '门店图片'] : ['法式面包', '可颂', '美式三明治', '火锅毛肚'];
  const thumbnails = sources.slice(0, isAlbum ? 4 : 4).map((source, index) => `<button class="opt-source-thumb ${activeIndex === index ? 'active' : ''}" type="button" data-source="${index}" aria-label="编辑${labels[index]}"><img src="${source}" alt="" />${optimized[index] ? '<span class="thumb-check">✓</span>' : ''}</button>`).join('');
  sheetBody.innerHTML = `<div class="opt-compare-content">
    <div class="opt-source-strip">${thumbnails}</div>
    <div class="opt-compare-pair" aria-label="原图与优化后对比">
      ${optionButton(sources[activeIndex], '你的原图', !optimized[activeIndex], 0, 'compare-option')}
      ${optionButton(sources[activeIndex], '优化后', optimized[activeIndex], 1, 'compare-option light-optimized')}
    </div>
  </div>`;
  sheetBody.querySelectorAll('.opt-source-thumb').forEach((button) => button.addEventListener('click', () => {
    if (isAlbum) state.activeAlbum = Number(button.dataset.source);
    else state.activeDish = Number(button.dataset.source);
    renderCompareSheet(kind);
  }));
  sheetBody.querySelectorAll('.compare-option').forEach((button) => button.addEventListener('click', () => {
    optimized[activeIndex] = Number(button.dataset.choice) === 1;
    renderCompareSheet(kind);
    renderPreview();
  }));
}

function renderSheet() {
  const kind = sheet.dataset.mode;
  if (kind === 'head') renderHeadSheet();
  else renderCompareSheet(kind);
}

function setEditing(open) {
  device.classList.toggle('editing', open);
  sheet.setAttribute('aria-hidden', String(!open));
  if (open) {
    snapshot = {
      headChoice: state.headChoice,
      albumOptimized: [...state.albumOptimized],
      dishOptimized: [...state.dishOptimized],
    };
    renderSheet();
  }
}

tabs.forEach((tab) => tab.addEventListener('click', () => {
  if (device.classList.contains('editing')) setEditing(false);
  selectTab(tab.dataset.tab);
}));
document.querySelector('.edit-button').addEventListener('click', () => setEditing(true));
document.querySelector('.edit-cancel').addEventListener('click', () => {
  if (snapshot) {
    state.headChoice = snapshot.headChoice;
    state.albumOptimized = [...snapshot.albumOptimized];
    state.dishOptimized = [...snapshot.dishOptimized];
    renderPreview();
  }
  setEditing(false);
});
document.querySelector('.edit-confirm').addEventListener('click', () => setEditing(false));

const compareButton = document.querySelector('.compare-button');
function setComparing(active) {
  state.comparing = active;
  compareButton.classList.toggle('active', active);
  renderPreview();
}
compareButton.addEventListener('pointerdown', (event) => {
  compareButton.setPointerCapture(event.pointerId);
  setComparing(true);
});
compareButton.addEventListener('pointerup', () => setComparing(false));
compareButton.addEventListener('pointercancel', () => setComparing(false));
compareButton.addEventListener('keydown', (event) => {
  if (event.key === ' ' || event.key === 'Enter') setComparing(true);
});
compareButton.addEventListener('keyup', () => setComparing(false));

let swipeStartX = null;
const preview = document.querySelector('.preview-area');
preview.addEventListener('pointerdown', (event) => { swipeStartX = event.clientX; });
preview.addEventListener('pointerup', (event) => {
  if (swipeStartX === null || device.classList.contains('editing')) return;
  const distance = event.clientX - swipeStartX;
  swipeStartX = null;
  if (Math.abs(distance) < 42) return;
  const index = tabs.findIndex((tab) => tab.dataset.tab === state.tab);
  const next = tabs[index + (distance < 0 ? 1 : -1)];
  if (next) selectTab(next.dataset.tab);
});
preview.addEventListener('pointercancel', () => { swipeStartX = null; });

document.querySelectorAll('.album-category button').forEach((button) => button.addEventListener('click', () => {
  document.querySelectorAll('.album-category button').forEach((item) => {
    const active = item === button;
    item.classList.toggle('active', active);
    item.setAttribute('aria-selected', String(active));
  });
}));

document.querySelector('.review-button').addEventListener('click', () => {
  const message = document.createElement('div');
  message.className = 'opt-toast';
  message.textContent = '装修效果已提交审核';
  device.appendChild(message);
  window.setTimeout(() => message.remove(), 2300);
});

selectTab('头图', false);
renderPreview();
