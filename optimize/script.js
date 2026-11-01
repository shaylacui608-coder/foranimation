const asset = (name) => `../preview/assets/${name.replace('.png', '.webp')}`;
const beforeAsset = (name) => `./assets/${name}?v=3`;
const tabs = [...document.querySelectorAll('.step')];
const panels = [...document.querySelectorAll('.phone-panel')];
const device = document.querySelector('.device');
const hero = document.querySelector('.hero-banner-triptych');
const albumItems = [...document.querySelectorAll('.album-item')];
const dishCards = [...document.querySelectorAll('.dish-card')];
const originalHead = [1, 2, 3].map((index) => `./assets/head-original-${index}.jpg`);
const headOptions = [asset('head-option-1.png'), asset('head-option-2.png'), asset('head-option-3.png')];
const albumPhotos = albumItems.map((item) => item.querySelector('img').getAttribute('src'));
const dishPhotos = dishCards.map((item) => item.querySelector('img').getAttribute('src'));
const albumBefore = albumPhotos.map((_, index) => index < 4 ? beforeAsset(`before-album-0${index + 1}.jpg`) : null);
const dishBefore = dishPhotos.map((_, index) => beforeAsset(`before-dish-${['baguette', 'croissant', 'sandwich', 'tripe'][index]}.jpg`));

const state = {
  tab: '头图',
  visited: new Set(['头图']),
  headChoice: 0,
  albumOptimized: albumPhotos.map((_, index) => index < 4),
  dishOptimized: dishPhotos.map(() => true),
  activeAlbum: 0,
  activeDish: 0,
  comparing: false,
};

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
    const showBefore = Boolean(albumBefore[index]) && (state.comparing || !state.albumOptimized[index]);
    item.querySelector('img').src = showBefore ? albumBefore[index] : albumPhotos[index];
    item.classList.toggle('before-photo', showBefore);
  });
  dishCards.forEach((item, index) => {
    const showBefore = state.comparing || !state.dishOptimized[index];
    item.querySelector('img').src = showBefore ? dishBefore[index] : dishPhotos[index];
    item.classList.toggle('before-photo', showBefore);
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
}

tabs.forEach((tab) => tab.addEventListener('click', () => {
  setComparing(false);
  selectTab(tab.dataset.tab);
}));

const compareButton = document.querySelector('.compare-button');
function setComparing(active) {
  state.comparing = active;
  compareButton.classList.toggle('active', active);
  compareButton.setAttribute('aria-pressed', String(active));
  compareButton.setAttribute('aria-label', active ? '正在查看原图' : '按住查看原图');
  renderPreview();
}
compareButton.addEventListener('pointerdown', (event) => {
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  setComparing(true);
});
compareButton.addEventListener('pointermove', (event) => {
  if (!state.comparing) return;
  const bounds = compareButton.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) {
    setComparing(false);
  }
});
['pointerup', 'pointerleave', 'pointercancel', 'blur'].forEach((type) => {
  compareButton.addEventListener(type, () => setComparing(false));
});
window.addEventListener('pointerup', () => setComparing(false));
window.addEventListener('pointercancel', () => setComparing(false));
window.addEventListener('blur', () => setComparing(false));
compareButton.addEventListener('keydown', (event) => {
  if (event.key !== ' ' && event.key !== 'Enter') return;
  event.preventDefault();
  if (!event.repeat) setComparing(true);
});
compareButton.addEventListener('keyup', (event) => {
  if (event.key === ' ' || event.key === 'Enter') setComparing(false);
});

let swipeStartX = null;
const preview = document.querySelector('.preview-area');
preview.addEventListener('pointerdown', (event) => { swipeStartX = event.clientX; });
preview.addEventListener('pointerup', (event) => {
  if (swipeStartX === null) return;
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
setComparing(false);
