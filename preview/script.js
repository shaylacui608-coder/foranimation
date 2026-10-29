const tabs = [...document.querySelectorAll(".step")];
const panels = [...document.querySelectorAll(".phone-panel")];
const availableTabs = tabs.filter((tab) => panels.some((panel) => panel.dataset.panel === tab.dataset.tab));
const visitedTabs = new Set();

function selectTab(tab, markVisited = false) {
  const targetPanel = panels.find((panel) => panel.dataset.panel === tab.dataset.tab);
  if (!targetPanel) return;

  if (markVisited) visitedTabs.add(tab.dataset.tab);
  tabs.forEach((item) => {
    const active = item === tab;
    item.classList.toggle("active", active);
    item.classList.toggle("completed", visitedTabs.has(item.dataset.tab));
    item.setAttribute("aria-selected", String(active));
  });

  panels.forEach((panel) => {
    const active = panel === targetPanel;
    panel.classList.toggle("active", active);
    panel.hidden = !active;
  });
  document.querySelector(".preview-area").setAttribute("aria-label", `${tab.dataset.tab}预览`);
  editSheet.dataset.mode = tab.dataset.tab === "头图"
    ? "head"
    : tab.dataset.tab === "相册"
      ? "album"
      : tab.dataset.tab === "推荐菜"
        ? "recommend"
        : "external";
  document.querySelector(".edit-title").textContent = tab.dataset.tab === "相册"
    ? "门店相册"
    : tab.dataset.tab === "推荐菜"
      ? "推荐菜"
      : "门店头图";
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => selectTab(tab, true));
});

let swipeStartX = null;
const preview = document.querySelector(".preview-area");

preview.addEventListener("pointerdown", (event) => {
  swipeStartX = event.clientX;
});

preview.addEventListener("dragstart", (event) => event.preventDefault());

preview.addEventListener("pointerup", (event) => {
  if (swipeStartX === null) return;
  const distance = event.clientX - swipeStartX;
  swipeStartX = null;
  if (Math.abs(distance) < 36) return;

  const current = availableTabs.findIndex((tab) => tab.classList.contains("active"));
  const next = distance < 0 ? current + 1 : current - 1;
  if (availableTabs[next]) selectTab(availableTabs[next]);
});

preview.addEventListener("pointercancel", () => {
  swipeStartX = null;
});

const device = document.querySelector(".device");
const editSheet = document.querySelector(".edit-sheet");
const editButton = document.querySelector(".edit-button");
const editCancel = document.querySelector(".edit-cancel");
const editConfirm = document.querySelector(".edit-confirm");
const editThumbs = [...document.querySelectorAll(".edit-thumb")];
const headEditThumbs = [...document.querySelectorAll(".head-edit-thumb")];
const albumEditThumbs = [...document.querySelectorAll(".album-edit-thumb")];
const recommendEditThumbs = [...document.querySelectorAll(".recommend-edit-thumb")];
const albumGrid = document.querySelector(".album-grid");
const albumItems = [...document.querySelectorAll(".album-item")];
const dishRow = document.querySelector(".dish-row");
const dishCards = [...document.querySelectorAll(".dish-card")];
const shopCover = document.querySelector(".shop-cover");
const heroCover = document.querySelector(".hero-banner-triptych");
const generationTimers = new Set();
const generatedByOriginal = {
  external: {
    "./assets/external-option-1.webp": "./assets/external-generated-2.webp",
    "./assets/external-option-2.webp": "./assets/external-generated-1.webp",
    "./assets/external-option-3.webp": "./assets/external-generated-3.webp",
  },
  head: {
    "./assets/head-option-1.webp": "./assets/head-generated-1.webp",
    "./assets/head-option-2.webp": "./assets/head-generated-2.webp",
    "./assets/head-option-3.webp": "./assets/head-generated-3.webp",
  },
};
const headArtHeight = {
  "./assets/head-generated-1.webp": "143%",
  "./assets/head-generated-2.webp": "130%",
  "./assets/head-generated-3.webp": "130%",
};
let albumSelection = albumEditThumbs.map((thumb) => thumb.dataset.albumId);
let dishSelection = recommendEditThumbs.map((thumb) => thumb.dataset.dishId);
let editSnapshot = null;
let uploadedNodesThisEdit = [];
let headUploadedParts = [null, null, null];
let activeHeadUploadSlot = 0;
let uploadCounter = 0;

function selectImage(thumb, thumbGroup, previewImage) {
  thumbGroup.forEach((item) => {
    const selected = item === thumb;
    item.classList.toggle("selected", selected);
    item.setAttribute("aria-pressed", String(selected));
    item.querySelector(".edit-check, .head-edit-check").src = selected
      ? "./assets/edit-checkbox-selected.svg"
      : "./assets/edit-checkbox-empty.svg";
  });

  previewImage.src = thumb.dataset.preview;
}

function selectCover(thumb) {
  selectImage(thumb, editThumbs, shopCover);
}

function setHeadPreview(src, thumb = null) {
  heroCover.dataset.preview = src;
  heroCover.classList.toggle("custom-triptych", thumb?.dataset.custom === "true");
  if (thumb?.dataset.custom === "true") {
    [0, 1, 2].forEach((index) => {
      heroCover.style.setProperty(`--custom-art-${index + 1}`, `url("${thumb.dataset[`part${index}`]}")`);
    });
  }
  heroCover.style.setProperty("--triptych-art", `url("${src}")`);
  heroCover.style.setProperty("--art-height", headArtHeight[src] || "100%");
}

function selectHeadCover(thumb) {
  headEditThumbs.forEach((item) => {
    const selected = item === thumb;
    item.classList.toggle("selected", selected);
    item.setAttribute("aria-pressed", String(selected));
    item.querySelector(".head-edit-check").src = selected
      ? "./assets/edit-checkbox-selected.svg"
      : "./assets/edit-checkbox-empty.svg";
  });
  setHeadPreview(thumb.dataset.preview, thumb);
}

function setThumbSource(thumb, mode, src) {
  thumb.dataset.preview = src;
  if (mode === "head") {
    if (thumb.dataset.custom === "true") return;
    thumb.style.setProperty("--triptych-art", `url("${src}")`);
    thumb.style.setProperty("--art-height", headArtHeight[src] || "100%");
  }
  else thumb.querySelector(".edit-photo").src = src;
  if (thumb.classList.contains("selected")) {
    if (mode === "head") setHeadPreview(src);
    else shopCover.src = src;
  }
}

function updateGenerationControls() {
  editConfirm.disabled = generationTimers.size > 0;
}

function stopGeneration() {
  generationTimers.forEach((timer) => clearTimeout(timer));
  generationTimers.clear();
  document.querySelectorAll(".edit-tile.generating, .head-edit-item.generating").forEach((item) => {
    item.classList.remove("generating");
    item.querySelector(".edit-thumb, .head-edit-thumb")?.removeAttribute("aria-busy");
  });
  updateGenerationControls();
}

function regenerateThumb(thumb, mode) {
  const original = thumb.dataset.original || thumb.dataset.preview;
  thumb.dataset.original = original;
  const generated = generatedByOriginal[mode][original];
  if (!generated) return;
  const nextSource = thumb.dataset.preview === generated ? original : generated;

  const tile = thumb.parentElement;
  tile.classList.add("generating");
  thumb.setAttribute("aria-busy", "true");
  const timer = setTimeout(() => {
    generationTimers.delete(timer);
    setThumbSource(thumb, mode, nextSource);
    tile.classList.remove("generating");
    thumb.removeAttribute("aria-busy");
    updateGenerationControls();
  }, 1700);
  generationTimers.add(timer);
  updateGenerationControls();
}

function renderAlbumSelection() {
  albumGrid.querySelectorAll(".album-placeholder").forEach((item) => item.remove());
  albumEditThumbs.forEach((thumb) => {
    const order = albumSelection.indexOf(thumb.dataset.albumId);
    const selected = order !== -1;
    thumb.classList.toggle("selected", selected);
    thumb.setAttribute("aria-pressed", String(selected));
    thumb.querySelector(".album-edit-index").textContent = selected ? String(order + 1) : "";
    thumb.setAttribute(
      "aria-label",
      selected
        ? `相册图片 ${thumb.dataset.albumId}，已选第 ${order + 1} 张`
        : `选择相册图片 ${thumb.dataset.albumId}`,
    );
  });

  albumSelection.forEach((id) => {
    const item = albumItems.find((candidate) => candidate.dataset.albumId === id);
    if (item) {
      item.hidden = false;
      albumGrid.appendChild(item);
    }
  });
  albumItems.forEach((item) => {
    if (!albumSelection.includes(item.dataset.albumId)) item.hidden = true;
  });
  for (let index = albumSelection.length; index < 4; index += 1) {
    const placeholder = document.createElement("div");
    placeholder.className = "album-placeholder";
    placeholder.setAttribute("aria-hidden", "true");
    albumGrid.appendChild(placeholder);
  }

  [...albumGrid.querySelectorAll(".album-item:not([hidden])")].forEach((item, index) => {
    const handle = item.querySelector(".drag-badge");
    if (!handle) return;
    handle.setAttribute("role", "button");
    handle.setAttribute("tabindex", "0");
    handle.setAttribute("aria-label", `拖动调整第 ${index + 1} 张图片的顺序`);
  });
}

function toggleAlbumImage(thumb) {
  const id = thumb.dataset.albumId;
  const currentIndex = albumSelection.indexOf(id);
  if (currentIndex === -1) albumSelection.push(id);
  else if (albumSelection.length > 1) albumSelection.splice(currentIndex, 1);
  renderAlbumSelection();
}

function renderDishSelection() {
  dishRow.querySelectorAll(".dish-placeholder").forEach((item) => item.remove());
  recommendEditThumbs.forEach((thumb) => {
    const order = dishSelection.indexOf(thumb.dataset.dishId);
    const selected = order !== -1;
    const name = thumb.querySelector(".recommend-edit-name").textContent;
    thumb.classList.toggle("selected", selected);
    thumb.setAttribute("aria-pressed", String(selected));
    thumb.querySelector(".recommend-edit-index").textContent = selected ? String(order + 1) : "";
    thumb.setAttribute(
      "aria-label",
      selected ? `${name}，已选第 ${order + 1} 道` : `选择${name}`,
    );
  });

  dishSelection.forEach((id) => {
    const card = dishCards.find((candidate) => candidate.dataset.dishId === id);
    if (card) {
      card.hidden = false;
      dishRow.appendChild(card);
    }
  });
  dishCards.forEach((card) => {
    if (!dishSelection.includes(card.dataset.dishId)) card.hidden = true;
  });
  for (let index = dishSelection.length; index < 4; index += 1) {
    const placeholder = document.createElement("div");
    placeholder.className = "dish-placeholder";
    placeholder.setAttribute("aria-hidden", "true");
    dishRow.appendChild(placeholder);
  }
}

function toggleDish(thumb) {
  const id = thumb.dataset.dishId;
  const currentIndex = dishSelection.indexOf(id);
  if (currentIndex === -1) {
    if (dishSelection.length === 4) dishSelection.pop();
    dishSelection.push(id);
  }
  else if (dishSelection.length > 1) dishSelection.splice(currentIndex, 1);
  renderDishSelection();
}

function resetHeadUploadControls() {
  headUploadedParts = [null, null, null];
  document.querySelectorAll(".head-upload-control").forEach((button) => {
    button.classList.remove("has-file");
    button.style.removeProperty("--uploaded-art");
  });
}

function addExternalUpload(file) {
  const url = URL.createObjectURL(file);
  const tile = document.createElement("div");
  tile.className = "edit-tile";
  tile.innerHTML = `<button class="edit-thumb" type="button" aria-label="选择上传的外显小图" aria-pressed="false"><img class="edit-photo" alt="上传的外显小图" /><img class="edit-check" src="./assets/edit-checkbox-empty.svg" alt="" /></button>`;
  const thumb = tile.querySelector(".edit-thumb");
  thumb.dataset.preview = url;
  thumb.querySelector(".edit-photo").src = url;
  document.querySelector('[data-upload="external"]').before(tile);
  editThumbs.push(thumb);
  uploadedNodesThisEdit.push(tile);
  thumb.addEventListener("click", () => selectCover(thumb));
  selectCover(thumb);
}

function addAlbumUpload(file) {
  const url = URL.createObjectURL(file);
  const id = `uploaded-album-${++uploadCounter}`;
  const thumb = document.createElement("button");
  thumb.className = "album-edit-thumb";
  thumb.type = "button";
  thumb.dataset.albumId = id;
  thumb.innerHTML = `<img class="album-edit-photo" alt="上传的相册图片" /><span class="album-edit-index"></span>`;
  thumb.querySelector("img").src = url;
  document.querySelector('[data-upload="album"]').before(thumb);
  const item = document.createElement("figure");
  item.className = "album-item";
  item.dataset.albumId = id;
  item.innerHTML = `<img alt="上传的相册图片" />`;
  item.querySelector("img").src = url;
  albumGrid.appendChild(item);
  albumEditThumbs.push(thumb);
  albumItems.push(item);
  uploadedNodesThisEdit.push(thumb, item);
  thumb.addEventListener("click", () => toggleAlbumImage(thumb));
  albumSelection.push(id);
  renderAlbumSelection();
}

function addDishUpload(file) {
  const url = URL.createObjectURL(file);
  const id = `uploaded-dish-${++uploadCounter}`;
  const name = file.name.replace(/\.[^.]+$/, "").slice(0, 12) || "新菜品";
  const thumb = document.createElement("button");
  thumb.className = "recommend-edit-thumb";
  thumb.type = "button";
  thumb.dataset.dishId = id;
  thumb.innerHTML = `<span class="recommend-edit-photo-wrap"><img class="recommend-edit-photo" alt="上传的推荐菜图片" /><span class="recommend-edit-index"></span></span><span class="recommend-edit-name"></span>`;
  thumb.querySelector("img").src = url;
  thumb.querySelector(".recommend-edit-name").textContent = name;
  document.querySelector('[data-upload="recommend"]').before(thumb);
  const card = document.createElement("article");
  card.className = "dish-card";
  card.dataset.dishId = id;
  card.innerHTML = `<img alt="上传的推荐菜图片" /><h3></h3><span></span>`;
  card.querySelector("img").src = url;
  card.querySelector("h3").textContent = name;
  dishRow.appendChild(card);
  recommendEditThumbs.push(thumb);
  dishCards.push(card);
  uploadedNodesThisEdit.push(thumb, card);
  thumb.addEventListener("click", () => toggleDish(thumb));
  if (dishSelection.length === 4) dishSelection.pop();
  dishSelection.push(id);
  renderDishSelection();
}

function addHeadUpload(file, slot) {
  const url = URL.createObjectURL(file);
  headUploadedParts[slot] = url;
  const control = document.querySelector(`.head-upload-control[data-slot="${slot}"]`);
  control.classList.add("has-file");
  control.style.setProperty("--uploaded-art", `url("${url}")`);
  if (headUploadedParts.some((part) => !part)) return;

  const item = document.createElement("div");
  item.className = "head-edit-item";
  item.innerHTML = `<button class="head-edit-thumb" type="button" aria-label="选择上传的一组门店头图" aria-pressed="false"><span class="head-edit-triptych triptych custom-triptych" aria-hidden="true"><span></span><span></span><span></span></span><img class="head-edit-check" src="./assets/edit-checkbox-empty.svg" alt="" /></button>`;
  const thumb = item.querySelector(".head-edit-thumb");
  thumb.dataset.preview = `custom-upload-${++uploadCounter}`;
  thumb.dataset.custom = "true";
  headUploadedParts.forEach((part, index) => {
    thumb.dataset[`part${index}`] = part;
    thumb.style.setProperty(`--custom-art-${index + 1}`, `url("${part}")`);
  });
  document.querySelector(".head-upload-row").before(item);
  headEditThumbs.push(thumb);
  uploadedNodesThisEdit.push(item);
  thumb.addEventListener("click", () => selectHeadCover(thumb));
  selectHeadCover(thumb);
  resetHeadUploadControls();
}

function syncAlbumOrderFromPreview() {
  albumSelection = [...albumGrid.querySelectorAll(".album-item:not([hidden])")]
    .map((item) => item.dataset.albumId);
  renderAlbumSelection();
}

function moveAlbumItem(item, direction) {
  const visibleItems = [...albumGrid.querySelectorAll(".album-item:not([hidden])")];
  const currentIndex = visibleItems.indexOf(item);
  const nextIndex = currentIndex + direction;
  if (currentIndex === -1 || nextIndex < 0 || nextIndex >= visibleItems.length) return;

  if (direction < 0) albumGrid.insertBefore(item, visibleItems[nextIndex]);
  else albumGrid.insertBefore(visibleItems[nextIndex], item);
  syncAlbumOrderFromPreview();
}

let activeAlbumSorting = null;

function finishAlbumSorting(event) {
  if (!activeAlbumSorting) return;
  const { item, handle, pointerId } = activeAlbumSorting;
  event?.preventDefault();
  item.classList.remove("sorting");
  if (pointerId !== null && handle.hasPointerCapture(pointerId)) {
    handle.releasePointerCapture(pointerId);
  }
  activeAlbumSorting = null;
  syncAlbumOrderFromPreview();
}

function updateAlbumSorting(item, clientX, clientY) {
  const visibleItems = [...albumGrid.querySelectorAll(".album-item:not([hidden])")];
  const siblings = visibleItems.filter((candidate) => candidate !== item);
  if (!siblings.length) return;

  const gridRect = albumGrid.getBoundingClientRect();
  const itemRect = item.getBoundingClientRect();
  const styles = getComputedStyle(albumGrid);
  const columnGap = Number.parseFloat(styles.columnGap) || 0;
  const rowGap = Number.parseFloat(styles.rowGap) || 0;
  const contentLeft = gridRect.left + (Number.parseFloat(styles.paddingLeft) || 0);
  const contentTop = gridRect.top + (Number.parseFloat(styles.paddingTop) || 0);
  const column = Math.max(0, Math.min(1, Math.floor((clientX - contentLeft) / (itemRect.width + columnGap))));
  const row = Math.max(0, Math.floor((clientY - contentTop) / (itemRect.height + rowGap)));
  const targetIndex = Math.min(row * 2 + column, siblings.length);

  if (targetIndex === siblings.length) albumGrid.appendChild(item);
  else albumGrid.insertBefore(item, siblings[targetIndex]);
}

albumItems.forEach((item) => {
  const handle = item.querySelector(".drag-badge");
  if (!handle) return;

  handle.addEventListener("pointerdown", (event) => {
    if (device.classList.contains("editing")) return;
    event.preventDefault();
    event.stopPropagation();
    item.classList.add("sorting");
    handle.setPointerCapture(event.pointerId);
    activeAlbumSorting = { item, handle, pointerId: event.pointerId };
  });

  handle.addEventListener("pointermove", (event) => {
    if (!item.classList.contains("sorting")) return;
    event.preventDefault();
    event.stopPropagation();
    updateAlbumSorting(item, event.clientX, event.clientY);
  });

  handle.addEventListener("pointerup", (event) => {
    event.stopPropagation();
    finishAlbumSorting(event);
  });
  handle.addEventListener("pointercancel", finishAlbumSorting);
  handle.addEventListener("keydown", (event) => {
    if (device.classList.contains("editing")) return;
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      moveAlbumItem(item, -1);
    }
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      moveAlbumItem(item, 1);
    }
  });
});

window.addEventListener("pointerup", finishAlbumSorting);
window.addEventListener("pointercancel", finishAlbumSorting);
window.addEventListener("mouseup", finishAlbumSorting);
window.addEventListener("pointermove", (event) => {
  if (!activeAlbumSorting) return;
  updateAlbumSorting(activeAlbumSorting.item, event.clientX, event.clientY);
});

function setEditing(editing) {
  if (editing) {
    uploadedNodesThisEdit = [];
    const mode = editSheet.dataset.mode;
    if (mode === "album") {
      editSnapshot = { mode, albumSelection: [...albumSelection] };
      renderAlbumSelection();
    } else if (mode === "recommend") {
      editSnapshot = { mode, dishSelection: [...dishSelection] };
      renderDishSelection();
    } else {
      const headMode = mode === "head";
      editSnapshot = {
        mode: headMode ? "head" : "external",
        thumb: (headMode ? headEditThumbs : editThumbs).find((thumb) => thumb.classList.contains("selected")),
        preview: headMode ? heroCover.dataset.preview : shopCover.getAttribute("src"),
        sources: (headMode ? headEditThumbs : editThumbs).map((thumb) => thumb.dataset.preview),
      };
    }
  }
  if (!editing) resetHeadUploadControls();
  device.classList.toggle("editing", editing);
  editSheet.setAttribute("aria-hidden", String(!editing));
}

editButton.addEventListener("click", () => setEditing(true));
editCancel.addEventListener("click", () => {
  stopGeneration();
  uploadedNodesThisEdit.forEach((node) => node.remove());
  [editThumbs, headEditThumbs, albumEditThumbs, recommendEditThumbs, albumItems, dishCards].forEach((items) => {
    for (let index = items.length - 1; index >= 0; index -= 1) {
      if (!items[index].isConnected) items.splice(index, 1);
    }
  });
  if (editSnapshot?.mode === "album") {
    albumSelection = [...editSnapshot.albumSelection];
    renderAlbumSelection();
  }
  if (editSnapshot?.mode === "recommend") {
    dishSelection = [...editSnapshot.dishSelection];
    renderDishSelection();
  }
  if (editSnapshot?.sources) {
    const group = editSnapshot.mode === "head" ? headEditThumbs : editThumbs;
    group.forEach((thumb, index) => setThumbSource(thumb, editSnapshot.mode, editSnapshot.sources[index]));
  }
  if (editSnapshot?.thumb) {
    if (editSnapshot.mode === "head") selectHeadCover(editSnapshot.thumb);
    else selectCover(editSnapshot.thumb);
  }
  if (editSnapshot?.preview) {
    if (editSnapshot.mode === "head") setHeadPreview(editSnapshot.preview, editSnapshot.thumb);
    else shopCover.src = editSnapshot.preview;
  }
  setEditing(false);
});
editConfirm.addEventListener("click", () => setEditing(false));

editThumbs.forEach((thumb) => thumb.addEventListener("click", () => selectCover(thumb)));
headEditThumbs.forEach((thumb) => thumb.addEventListener("click", () => selectHeadCover(thumb)));
document.querySelectorAll(".edit-tile .regenerate-button").forEach((button) => {
  button.addEventListener("click", () => regenerateThumb(button.parentElement.querySelector(".edit-thumb"), "external"));
});
document.querySelectorAll(".head-edit-item .regenerate-button").forEach((button) => {
  button.addEventListener("click", () => regenerateThumb(button.parentElement.querySelector(".head-edit-thumb"), "head"));
});
albumEditThumbs.forEach((thumb) => thumb.addEventListener("click", () => toggleAlbumImage(thumb)));
recommendEditThumbs.forEach((thumb) => thumb.addEventListener("click", () => toggleDish(thumb)));

document.querySelectorAll(".upload-control").forEach((button) => {
  button.addEventListener("click", () => {
    if (button.dataset.upload === "head") activeHeadUploadSlot = Number(button.dataset.slot);
    document.querySelector(`#${button.dataset.upload}-upload-input`).click();
  });
});
document.querySelector("#external-upload-input").addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (file?.type.startsWith("image/")) addExternalUpload(file);
  event.target.value = "";
});
document.querySelector("#head-upload-input").addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (file?.type.startsWith("image/")) addHeadUpload(file, activeHeadUploadSlot);
  event.target.value = "";
});
document.querySelector("#album-upload-input").addEventListener("change", (event) => {
  [...event.target.files].filter((file) => file.type.startsWith("image/")).forEach(addAlbumUpload);
  event.target.value = "";
});
document.querySelector("#recommend-upload-input").addEventListener("change", (event) => {
  [...event.target.files].filter((file) => file.type.startsWith("image/")).forEach(addDishUpload);
  event.target.value = "";
});

editSheet.dataset.mode = "external";
renderAlbumSelection();
renderDishSelection();
