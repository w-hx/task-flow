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
const createSoundStart = document.getElementById('create-sound-start');
const createSoundEnd = document.getElementById('create-sound-end');
const createSave = document.getElementById('create-save');
const createError = document.getElementById('create-error');
const editName = document.getElementById('edit-name');
const editContent = document.getElementById('edit-content');
const editSoundStart = document.getElementById('edit-sound-start');
const editSoundEnd = document.getElementById('edit-sound-end');
const editSave = document.getElementById('edit-save');
const editError = document.getElementById('edit-error');
const btnRunToggle = document.getElementById('btn-run-toggle');

// Custom Select Implementation
function setupCustomSelects() {
  const selects = document.querySelectorAll('select');
  selects.forEach(select => {
    // Check if already custom
    if (select.nextElementSibling && select.nextElementSibling.classList.contains('custom-select-wrapper')) {
      return;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'custom-select-wrapper';
    
    const trigger = document.createElement('div');
    trigger.className = 'custom-select-trigger';
    trigger.innerHTML = `
      <span>${select.options[select.selectedIndex].text}</span>
      <div class="arrow"></div>
    `;
    
    const optionsList = document.createElement('div');
    optionsList.className = 'custom-options';
    
    Array.from(select.options).forEach(option => {
      const customOption = document.createElement('div');
      customOption.className = 'custom-option' + (option.selected ? ' selected' : '');
      customOption.dataset.value = option.value;
      customOption.textContent = option.text;
      
      customOption.addEventListener('click', (e) => {
        e.stopPropagation();
        select.value = option.value;
        trigger.querySelector('span').textContent = option.text;
        
        // Update selected class
        optionsList.querySelectorAll('.custom-option').forEach(opt => opt.classList.remove('selected'));
        customOption.classList.add('selected');
        
        wrapper.classList.remove('open');
        
        // Trigger change event for listeners (like preview sound)
        const event = new Event('change');
        select.dispatchEvent(event);
      });
      
      optionsList.appendChild(customOption);
    });
    
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      // Close other selects
      document.querySelectorAll('.custom-select-wrapper.open').forEach(el => {
        if (el !== wrapper) el.classList.remove('open');
      });
      wrapper.classList.toggle('open');
    });
    
    wrapper.appendChild(trigger);
    wrapper.appendChild(optionsList);
    
    select.style.display = 'none'; // Hide native select
    select.parentNode.insertBefore(wrapper, select.nextSibling);
    
    // Listen for external changes to select (e.g. programmatic update)
    const observer = new MutationObserver(() => {
        trigger.querySelector('span').textContent = select.options[select.selectedIndex].text;
        optionsList.querySelectorAll('.custom-option').forEach(opt => {
            if (opt.dataset.value === select.value) {
                opt.classList.add('selected');
            } else {
                opt.classList.remove('selected');
            }
        });
    });
    observer.observe(select, { attributes: true, childList: true, subtree: true });
    
    // Manual sync helper for value property setting
    select.addEventListener('change', () => {
         trigger.querySelector('span').textContent = select.options[select.selectedIndex].text;
         optionsList.querySelectorAll('.custom-option').forEach(opt => {
             opt.classList.toggle('selected', opt.dataset.value === select.value);
         });
    });
  });
  
  // Close on click outside
  document.addEventListener('click', () => {
    document.querySelectorAll('.custom-select-wrapper.open').forEach(el => {
      el.classList.remove('open');
    });
  });
}

function updateCustomSelect(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    const wrapper = select.nextElementSibling;
    if (wrapper && wrapper.classList.contains('custom-select-wrapper')) {
        const trigger = wrapper.querySelector('.custom-select-trigger span');
        const options = wrapper.querySelectorAll('.custom-option');
        
        trigger.textContent = select.options[select.selectedIndex].text;
        options.forEach(opt => {
            opt.classList.toggle('selected', opt.dataset.value === select.value);
        });
    }
}


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

  // Sort by updatedAt desc
  const sorted = [...state.schedules].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  sorted.forEach((s) => {
    const isRunning = s.id === state.runningId;
    const card = document.createElement('div');
    card.className = 'schedule-card' + (s.id === state.activeId ? ' active' : '') + (isRunning ? ' running' : '');
    card.dataset.id = s.id;
    
    // Check if deletable (not running and not active)
    // Requirement 3 says: "不用担心删除的时间表刚好是被点开的时间表的情况，因为被点开的时间表前面不会有删除符号"
    // So we hide delete btn for active item too.
    const canDelete = !isRunning && s.id !== state.activeId;
    
    let deleteBtnHtml = '';
    // Placeholder logic: Always have placeholder space to align text, only show btn if can delete
    if (canDelete) {
      deleteBtnHtml = `<button class="card-delete-btn" data-id="${s.id}" title="删除">−</button>`;
    } else {
       deleteBtnHtml = `<span class="card-delete-placeholder"></span>`; 
    }

    card.innerHTML = `
      ${deleteBtnHtml}
      <span class="card-name">${escapeHtml(s.name)}</span>
      ${isRunning ? '<span class="running-indicator-icon">🟢</span>' : ''}
    `;
    card.querySelector('.card-name').addEventListener('click', (e) => {
      if (!isDeleteMode) {
        e.stopPropagation();
        selectSchedule(s.id);
      }
    });
    
    // Add ripple effect or active scale
    card.addEventListener('mousedown', () => {
      card.style.transform = 'scale(0.98)';
    });
    card.addEventListener('mouseup', () => {
      card.style.transform = '';
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });

    const delBtn = card.querySelector('.card-delete-btn');
    if (delBtn) {
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteSchedule(s.id);
      });
    }

    card.addEventListener('click', () => {
      if (!isDeleteMode) selectSchedule(s.id);
    });
    cardList.appendChild(card);
  });
  
  if (isDeleteMode) {
    cardList.classList.add('delete-mode');
    btnDeleteMode.textContent = '✔';
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
  createSoundStart.value = 'success';
  createSoundEnd.value = 'chime';
  createError.textContent = '';
  
  // Update custom selects for create panel
  updateCustomSelect('create-sound-start');
  updateCustomSelect('create-sound-end');
  
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
    editSoundStart.value = s.soundStart || 'success';
    editSoundEnd.value = s.soundEnd || s.sound || 'chime'; // Fallback to old sound field for end
    editContent.value = (s.items || [])
      .map((it) => `${it.start}-${it.end} ${it.title}`)
      .join('\n');
    
    // Update custom selects
    updateCustomSelect('edit-sound-start');
    updateCustomSelect('edit-sound-end');
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
  const soundStart = createSoundStart.value;
  const soundEnd = createSoundEnd.value;
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
    soundStart,
    soundEnd,
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
  const soundStart = editSoundStart.value;
  const soundEnd = editSoundEnd.value;
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
    s.soundStart = soundStart;
    s.soundEnd = soundEnd;
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
  // Don't exit delete mode
  // Don't change right panel if deleted item was not active (but active item is not deletable anyway if running, though if active but not running it could be deleted)
  // Requirement: "删除某个时间表后面板右部展示的时间表信息不能变"
  // If we deleted the active item, we might need to clear right panel or keep showing it? 
  // User says "不用担心删除的时间表刚好是被点开的时间表的情况，因为被点开的时间表前面不会有删除符号"
  // So we just render cards again.
  renderCards();
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

// Sound Preview
const soundSelectors = [createSoundStart, createSoundEnd, editSoundStart, editSoundEnd];
soundSelectors.forEach(sel => {
  sel.addEventListener('change', () => {
    window.taskFlowAPI.previewSound(sel.value);
  });
});

loadData().then(() => {
  showRightPanel();
  renderCards();
  window.taskFlowAPI.setRunning(state.runningId);
  setupCustomSelects(); // Initialize custom selects
});
