const MAX_SCHEDULES = 10;

let state = {
  schedules: [],
  activeId: null,
  runningId: null,
  lastModifiedId: null,
  deleteMode: false,
  createDirty: false
};

const cardList = document.getElementById('card-list');
const btnAdd = document.getElementById('btn-add');
const btnDeleteMode = document.getElementById('btn-delete-mode');
const createPanel = document.getElementById('create-panel');
const editPanel = document.getElementById('edit-panel');
const createName = document.getElementById('create-name');
const createContent = document.getElementById('create-content');
const createSave = document.getElementById('create-save');
const createError = document.getElementById('create-error');
const editName = document.getElementById('edit-name');
const editContent = document.getElementById('edit-content');
const editSave = document.getElementById('edit-save');
const editError = document.getElementById('edit-error');
const btnRunToggle = document.getElementById('btn-run-toggle');


function loadData() {
  return window.taskFlowAPI.getSchedules().then((data) => {
    state.schedules = data.schedules || [];
    state.activeId = data.activeId;
    state.runningId = data.runningId;
    state.lastModifiedId = data.lastModifiedId || null;
  });
}

function saveData() {
  return window.taskFlowAPI.saveSchedules({
    schedules: state.schedules,
    activeId: state.activeId,
    runningId: state.runningId,
    lastModifiedId: state.lastModifiedId
  });
}

function renderCards() {
  cardList.innerHTML = '';
  const isDeleteMode = state.deleteMode;

  state.schedules.forEach((s) => {
    const card = document.createElement('div');
    card.className = 'schedule-card' + (s.id === state.activeId ? ' active' : '');
    card.dataset.id = s.id;
    card.innerHTML = `
      <button class="card-delete-btn" data-id="${s.id}" title="删除">−</button>
      <span class="card-name">${escapeHtml(s.name)}</span>
    `;
    card.querySelector('.card-name').addEventListener('click', (e) => {
      if (!isDeleteMode) {
        e.stopPropagation();
        selectSchedule(s.id);
      }
    });
    card.querySelector('.card-delete-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteSchedule(s.id);
    });
    card.addEventListener('click', () => {
      if (!isDeleteMode) selectSchedule(s.id);
    });
    cardList.appendChild(card);
  });

  if (isDeleteMode) {
    cardList.classList.add('delete-mode');
    btnDeleteMode.textContent = '←';
    btnDeleteMode.title = '返回';
    btnDeleteMode.classList.add('return');
    btnDeleteMode.classList.remove('highlight');
  } else {
    cardList.classList.remove('delete-mode');
    btnDeleteMode.textContent = '−';
    btnDeleteMode.title = '删除';
    btnDeleteMode.classList.remove('return');
  }
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function showRightPanel() {
  if (state.runningId) {
    showEditPanel(state.runningId);
  } else if (state.lastModifiedId && state.schedules.some((s) => s.id === state.lastModifiedId)) {
    showEditPanel(state.lastModifiedId);
  } else {
    showCreatePanel();
  }
}

function showCreatePanel() {
  createPanel.classList.remove('hidden');
  editPanel.classList.add('hidden');
  btnAdd.classList.add('highlight');
  btnDeleteMode.classList.remove('highlight');
  state.activeId = null;
  createName.value = '';
  createContent.value = '';
  createError.textContent = '';
  renderCards();
}

function showEditPanel(id) {
  createPanel.classList.add('hidden');
  editPanel.classList.remove('hidden');
  btnAdd.classList.remove('highlight');
  btnDeleteMode.classList.remove('highlight');
  state.activeId = id;
  state.lastModifiedId = id;

  const s = state.schedules.find((x) => x.id === id);
  if (s) {
    editName.value = s.name;
    editContent.value = (s.items || [])
      .map((it) => `${it.start}-${it.end} ${it.title}`)
      .join('\n');
  }
  editError.textContent = '';
  updateEditRunButton();
  renderCards();
}

function updateEditRunButton() {
  if (!state.activeId) return;
  const isRunning = state.runningId === state.activeId;
  btnRunToggle.classList.remove('hidden');
  if (isRunning) {
    btnRunToggle.textContent = '停止运行';
    btnRunToggle.className = 'btn-secondary stop';
    editSave.disabled = true;
  } else {
    btnRunToggle.textContent = '开始运行';
    btnRunToggle.className = 'btn-secondary';
    editSave.disabled = false;
  }
}

function selectSchedule(id) {
  showEditPanel(id);
}

function generateId() {
  return 's_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
}

async function doCreate() {
  const name = createName.value.trim();
  const content = createContent.value.trim();
  createError.textContent = '';
  if (!name) {
    createError.textContent = '请输入时间表名称';
    return;
  }
  if (!content) {
    createError.textContent = '请输入时间表内容';
    return;
  }
  if (state.schedules.length >= MAX_SCHEDULES) {
    createError.textContent = `最多存储 ${MAX_SCHEDULES} 个时间表，请先删除再添加`;
    return;
  }

  const result = await window.taskFlowAPI.parseSchedule(content);
  if (result.error) {
    createError.textContent = result.error;
    return;
  }

  const schedule = {
    id: generateId(),
    name,
    items: result.items,
    updatedAt: Date.now()
  };
  state.schedules.push(schedule);
  await saveData();
  showEditPanel(schedule.id);
  btnRunToggle.classList.remove('hidden');
  btnRunToggle.textContent = '开始运行';
  editSave.disabled = false;
}

async function doEditSave() {
  const id = state.activeId;
  if (!id || state.runningId === id) return;

  const name = editName.value.trim();
  const content = editContent.value.trim();
  editError.textContent = '';
  if (!name) {
    editError.textContent = '请输入时间表名称';
    return;
  }
  if (!content) {
    editError.textContent = '请输入时间表内容';
    return;
  }

  const result = await window.taskFlowAPI.parseSchedule(content);
  if (result.error) {
    editError.textContent = result.error;
    return;
  }

  const s = state.schedules.find((x) => x.id === id);
  if (s) {
    s.name = name;
    s.items = result.items;
    s.updatedAt = Date.now();
  }
  await saveData();
  editError.textContent = '';
  renderCards();
}

async function toggleRun() {
  if (!state.activeId) return;
  if (state.runningId === state.activeId) {
    state.runningId = null;
    await saveData();
    window.taskFlowAPI.setRunning(null);
  } else {
    state.runningId = state.activeId;
    await saveData();
    window.taskFlowAPI.setRunning(state.activeId);
  }
  updateEditRunButton();
  renderCards();
}

async function deleteSchedule(id) {
  state.schedules = state.schedules.filter((s) => s.id !== id);
  if (state.activeId === id) state.activeId = null;
  if (state.runningId === id) {
    state.runningId = null;
    await saveData();
    window.taskFlowAPI.setRunning(null);
  }
  if (state.lastModifiedId === id) state.lastModifiedId = null;
  await saveData();
  exitDeleteMode();
  showRightPanel();
}

function toggleDeleteMode() {
  state.deleteMode = !state.deleteMode;
  if (!state.deleteMode) {
    btnDeleteMode.textContent = '−';
    btnDeleteMode.title = '删除';
  }
  renderCards();
}

function exitDeleteMode() {
  state.deleteMode = false;
}

btnAdd.addEventListener('click', () => {
  exitDeleteMode();
  showCreatePanel();
});

btnDeleteMode.addEventListener('click', () => {
  if (state.deleteMode) {
    exitDeleteMode();
    renderCards();
  } else {
    toggleDeleteMode();
  }
});

createSave.addEventListener('click', () => doCreate());
editSave.addEventListener('click', () => doEditSave());
btnRunToggle.addEventListener('click', () => toggleRun());

loadData().then(() => {
  showRightPanel();
  renderCards();
  window.taskFlowAPI.setRunning(state.runningId);
});
