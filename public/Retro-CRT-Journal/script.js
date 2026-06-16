/* -----------------------------------------------------------------------------
 * Retro CRT Terminal Journal - JavaScript Controllers & Synth Engine
 * Co-authored by Antigravity AI
 * ----------------------------------------------------------------------------- */

// --- Constants & Configs ---
const STORAGE_KEYS = {
  ENTRIES: 'retro_crt_journal_entries_v1',
  THEME: 'retro_crt_journal_theme_v1',
  POWER: 'retro_crt_journal_power_v1',
  SOUNDS: 'retro_crt_journal_sounds_v1'
};

// --- Initial Data Load ---
let journalEntries = JSON.parse(localStorage.getItem(STORAGE_KEYS.ENTRIES)) || [];
let activeTheme = localStorage.getItem(STORAGE_KEYS.THEME) || 'paperwhite';
let isPowerOn = localStorage.getItem(STORAGE_KEYS.POWER) !== 'off'; // Default to on
let globalMuted = localStorage.getItem(STORAGE_KEYS.SOUNDS) === 'muted';

// Active date selection state (default to today: YYYY-MM-DD)
let selectedDateStr = getLocalDateString(new Date());

// Draggable window coordinates tracking
let dragTarget = null;
let dragOffset = { x: 0, y: 0 };
let topZIndex = 200;

// --- Web Audio Context ---
let audioCtx = null;
let masterGain = null;
let bgmGain = null;
let keyGain = null;

// Volumes (0.0 to 1.0)
let volumeKeyboardVal = 0.6;
let volumeBgmVal = 0.3;

// --- Chiptune Sequencer Settings ---
let isMusicPlaying = false;
let seqTimer = null;
let seqStepIndex = 0;

// Arpeggio notes (Frequencies in Hz)
const CHIPTUNES = [
  {
    name: "CYBER AMBER LOFI",
    tempo: 140,
    melody: [261.63, 329.63, 392.00, 493.88, 523.25, 493.88, 392.00, 329.63], // C4, E4, G4, B4, C5, B4, G4, E4
    bass: [130.81, 130.81, 164.81, 164.81, 196.00, 196.00, 164.81, 164.81]     // C3, C3, E3, E3, G3, G3, E3, E3
  },
  {
    name: "FALLOUT PIT-BOY",
    tempo: 120,
    melody: [220.00, 277.18, 329.63, 440.00, 554.37, 440.00, 329.63, 277.18], // A3, C#4, E4, A4, C#5, A4, E4, C#4
    bass: [110.00, 110.00, 138.59, 138.59, 164.81, 164.81, 110.00, 110.00]    // A2, A2, C#3, C#3, E3, E3, A2, A2
  },
  {
    name: "MATRIX GRID SEQUENCE",
    tempo: 160,
    melody: [146.83, 174.61, 220.00, 261.63, 293.66, 261.63, 220.00, 174.61], // D3, F3, A3, C4, D4, C4, A3, F3
    bass: [73.42, 73.42, 87.31, 87.31, 110.00, 110.00, 73.42, 73.42]          // D2, D2, F2, F2, A2, A2, D2, D2
  },
  {
    name: "CYBERPUNK NEON GLOW",
    tempo: 130,
    melody: [293.66, 349.23, 440.00, 523.25, 587.33, 523.25, 440.00, 349.23], // D4, F4, A4, C5, D5, C5, A4, F4
    bass: [146.83, 146.83, 174.61, 174.61, 220.00, 220.00, 146.83, 146.83]    // D3, D3, F3, F3, A3, A3, D3, D3
  }
];
let activeTuneIndex = 0;

// --- Initialize DOM References ---
document.addEventListener('DOMContentLoaded', () => {
  setupCabinetPowerAndTheme();
  setupWindowDragging();
  setupShortcutButtons();
  setupDiaryAppControls();
  setupTimelineControls();
  setupFloppyControls();
  setupJukeboxControls();
  
  // Apply initial power state UI
  setPowerUI(isPowerOn);
  applyTheme(activeTheme);
  
  // Load today's entry on load
  selectedDateStr = getLocalDateString(new Date());
  document.getElementById('diary-date-picker').value = selectedDateStr;
  loadDiaryEntry(selectedDateStr);
  
  // Refresh layout lists
  renderTimeline();
  updateFloppyStats();

  lucide.createIcons();
});

// --- Audio Initialization ---
function initAudio() {
  if (audioCtx) return;
  
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  audioCtx = new AudioContextClass();
  
  masterGain = audioCtx.createGain();
  masterGain.gain.value = globalMuted ? 0 : 1;
  masterGain.connect(audioCtx.destination);
  
  bgmGain = audioCtx.createGain();
  bgmGain.gain.value = volumeBgmVal;
  bgmGain.connect(masterGain);
  
  keyGain = audioCtx.createGain();
  keyGain.gain.value = volumeKeyboardVal;
  keyGain.connect(masterGain);
}

// --- Cabinet Power & Theme Toggles ---
function setupCabinetPowerAndTheme() {
  const powerBtn = document.getElementById('btn-power-switch');
  const muteBtn = document.getElementById('btn-global-mute');
  const dialBtns = document.querySelectorAll('.dial-btn');
  
  // Power Switch click
  powerBtn.addEventListener('click', () => {
    isPowerOn = !isPowerOn;
    localStorage.setItem(STORAGE_KEYS.POWER, isPowerOn ? 'on' : 'off');
    setPowerUI(isPowerOn);
    
    // Play power turn-off/on chime
    if (isPowerOn) {
      playPowerOnSound();
    } else {
      playPowerOffSound();
      stopSequencer(); // Stop music synth on power off
    }
  });

  // Mute Switch click
  muteBtn.addEventListener('click', () => {
    globalMuted = !globalMuted;
    localStorage.setItem(STORAGE_KEYS.SOUNDS, globalMuted ? 'muted' : 'unmuted');
    updateMuteUI();
  });

  // Dial buttons
  dialBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (!isPowerOn) return;
      dialBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const themeId = btn.dataset.themeId;
      applyTheme(themeId);
      playUIAckBeep();
    });
  });
}

function setPowerUI(powerState) {
  const body = document.body;
  if (powerState) {
    body.classList.remove('crt-power-off');
    body.classList.add('crt-power-on');
  } else {
    body.classList.remove('crt-power-on');
    body.classList.add('crt-power-off');
  }
  updateMuteUI();
}

function updateMuteUI() {
  const muteIcon = document.getElementById('mute-icon');
  if (masterGain) {
    masterGain.gain.value = globalMuted ? 0 : 1;
  }
  if (globalMuted) {
    muteIcon.setAttribute('data-lucide', 'volume-x');
  } else {
    muteIcon.setAttribute('data-lucide', 'volume-2');
  }
  lucide.createIcons();
}

function applyTheme(themeName) {
  activeTheme = themeName;
  localStorage.setItem(STORAGE_KEYS.THEME, themeName);
  
  // Remove existing themes
  document.body.className = document.body.className.replace(/\btheme-\S+/g, '');
  document.body.classList.add(`theme-${themeName}`);
  
  // Set theme dial active state
  const dialBtns = document.querySelectorAll('.dial-btn');
  dialBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.themeId === themeName);
  });
}

// --- Desktop Shortcuts ---
function setupShortcutButtons() {
  const shortcutList = [
    { iconId: 'icon-journal', winId: 'win-journal' },
    { iconId: 'icon-timeline', winId: 'win-timeline' },
    { iconId: 'icon-backup', winId: 'win-backup' },
    { iconId: 'icon-music', winId: 'win-music' },
    { iconId: 'icon-help', winId: 'win-help' }
  ];

  shortcutList.forEach(item => {
    const icon = document.getElementById(item.iconId);
    const win = document.getElementById(item.winId);
    
    icon.addEventListener('click', () => {
      if (!isPowerOn) return;
      win.classList.remove('hidden');
      focusWindow(win);
      playUIAckBeep();
    });

    // Wire up window header close click handler
    const closeBtn = win.querySelector('.win-close');
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      win.classList.add('hidden');
      playUICloseBeep();
    });

    // Wire up window header minimize click handler
    const minBtn = win.querySelector('.win-min');
    minBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      win.classList.add('hidden');
      playUICloseBeep();
    });
  });
}

// --- Draggable Window Manager ---
function setupWindowDragging() {
  const windows = document.querySelectorAll('.retro-window');
  
  windows.forEach(win => {
    const header = win.querySelector('.window-header');
    
    // Focus window on click anywhere inside
    win.addEventListener('mousedown', () => {
      if (!isPowerOn) return;
      focusWindow(win);
    });

    header.addEventListener('mousedown', (e) => {
      if (!isPowerOn) return;
      // Bring to front
      focusWindow(win);
      
      dragTarget = win;
      dragOffset.x = e.clientX - win.offsetLeft;
      dragOffset.y = e.clientY - win.offsetTop;
      
      document.addEventListener('mousemove', dragMove);
      document.addEventListener('mouseup', dragEnd);
      
      e.preventDefault();
    });
  });
}

function focusWindow(win) {
  topZIndex += 1;
  win.style.zIndex = topZIndex;
  
  document.querySelectorAll('.retro-window').forEach(w => w.classList.remove('focused'));
  win.classList.add('focused');
}

function dragMove(e) {
  if (!dragTarget) return;
  
  const screen = document.getElementById('crt-screen');
  const screenRect = screen.getBoundingClientRect();
  
  // Calculate relative position within CRT screen boundaries
  let left = e.clientX - dragOffset.x;
  let top = e.clientY - dragOffset.y;
  
  // Constraint windows within viewport boundary
  const maxLeft = screenRect.width - dragTarget.offsetWidth;
  const maxTop = screenRect.height - dragTarget.offsetHeight;
  
  left = Math.max(0, Math.min(left, maxLeft));
  top = Math.max(0, Math.min(top, maxTop));
  
  dragTarget.style.left = `${left}px`;
  dragTarget.style.top = `${top}px`;
}

function dragEnd() {
  dragTarget = null;
  document.removeEventListener('mousemove', dragMove);
  document.removeEventListener('mouseup', dragEnd);
}

// --- Date Helper ---
function getLocalDateString(date) {
  const offset = date.getTimezoneOffset();
  const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000));
  return adjustedDate.toISOString().split('T')[0];
}

// --- Diary App CRUD & Lock Controller ---
function setupDiaryAppControls() {
  const datePicker = document.getElementById('diary-date-picker');
  const titleInput = document.getElementById('entry-title');
  const bodyTextarea = document.getElementById('entry-body');
  const saveBtn = document.getElementById('btn-save-entry');
  const deleteBtn = document.getElementById('btn-delete-entry');
  const writeProtectSwitch = document.getElementById('write-protect-switch');
  const quickUnlockBtn = document.getElementById('btn-quick-unlock');
  const moodBtns = document.querySelectorAll('.mood-select-btn');

  // Load selected date entry on change
  datePicker.addEventListener('change', (e) => {
    selectedDateStr = e.target.value;
    loadDiaryEntry(selectedDateStr);
    playUIAckBeep();
  });

  // Mood selector click
  moodBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (writeProtectSwitch.checked && !isToday(selectedDateStr)) return; // Locked past
      moodBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      triggerDraftChange();
      playUIAckBeep();
    });
  });

  // Toggle write-protect slider switch
  writeProtectSwitch.addEventListener('change', () => {
    updateWriteProtectUI();
    playUIAckBeep();
  });

  // Quick unlock btn overlay click helper
  quickUnlockBtn.addEventListener('click', () => {
    writeProtectSwitch.checked = false;
    updateWriteProtectUI();
    playUIAckBeep();
  });

  // Type sound feedback triggers
  bodyTextarea.addEventListener('input', () => {
    updateWordCount();
    triggerDraftChange();
    playMechanicalClick();
  });

  titleInput.addEventListener('input', () => {
    triggerDraftChange();
    playMechanicalClick();
  });

  // Save diary entry click
  saveBtn.addEventListener('click', () => {
    saveActiveEntry();
  });

  // Delete diary entry click
  deleteBtn.addEventListener('click', () => {
    deleteActiveEntry();
  });
}

function isToday(dateStr) {
  const todayStr = getLocalDateString(new Date());
  return dateStr === todayStr;
}

function loadDiaryEntry(dateStr) {
  const entry = journalEntries.find(e => e.date === dateStr);
  const titleInput = document.getElementById('entry-title');
  const bodyTextarea = document.getElementById('entry-body');
  const deleteBtn = document.getElementById('btn-delete-entry');
  const saveBtn = document.getElementById('btn-save-entry');
  const warningMsg = document.getElementById('date-warning-msg');
  const writeProtectSwitch = document.getElementById('write-protect-switch');

  // Highlight warnings for non-today logs
  if (isToday(dateStr)) {
    warningMsg.classList.add('hidden');
    // Lock today's entry only if explicitly write-protected. However, by default let's write-protect past entries
    // For today, we default write-protect switch to OFF so they can type immediately
    writeProtectSwitch.checked = false;
  } else {
    warningMsg.classList.remove('hidden');
    // For historical entries, default write-protect switch to ON (locked by default to prevent accidental overrides)
    writeProtectSwitch.checked = true;
  }

  if (entry) {
    titleInput.value = entry.title;
    bodyTextarea.value = entry.body;
    deleteBtn.disabled = false;
    saveBtn.disabled = false;
    
    // Activate mood emoji
    const moodBtns = document.querySelectorAll('.mood-select-btn');
    moodBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mood === entry.mood);
    });
    
    setSaveStatus('ENTRY READY');
  } else {
    // Empty entry
    titleInput.value = '';
    bodyTextarea.value = '';
    deleteBtn.disabled = true;
    saveBtn.disabled = false;
    
    // Default mood RAD
    const moodBtns = document.querySelectorAll('.mood-select-btn');
    moodBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mood === 'rad');
    });

    setSaveStatus('BLANK BLOCK');
  }

  updateWriteProtectUI();
  updateWordCount();
}

function updateWriteProtectUI() {
  const writeProtectSwitch = document.getElementById('write-protect-switch');
  const wpStatusText = document.getElementById('wp-status-text');
  const titleInput = document.getElementById('entry-title');
  const bodyTextarea = document.getElementById('entry-body');
  const lockOverlay = document.getElementById('textarea-lock-overlay');
  const isLocked = writeProtectSwitch.checked;
  const deleteBtn = document.getElementById('btn-delete-entry');

  if (isLocked) {
    wpStatusText.textContent = "LOCKED";
    wpStatusText.style.color = "var(--text-dim)";
    titleInput.disabled = true;
    bodyTextarea.disabled = true;
    lockOverlay.classList.add('active');
    deleteBtn.disabled = true;
  } else {
    wpStatusText.textContent = "UNLOCKED";
    wpStatusText.style.color = "var(--text-main)";
    titleInput.disabled = false;
    bodyTextarea.disabled = false;
    lockOverlay.classList.remove('active');
    
    // Enable delete if entry exists
    const entryExists = journalEntries.some(e => e.date === selectedDateStr);
    deleteBtn.disabled = !entryExists;
  }
}

function updateWordCount() {
  const bodyText = document.getElementById('entry-body').value.trim();
  const charCount = bodyText.length;
  const wordCount = bodyText === "" ? 0 : bodyText.split(/\s+/).length;
  document.getElementById('char-word-counter').textContent = `${charCount} chars | ${wordCount} words`;
}

function triggerDraftChange() {
  setSaveStatus('* DRAFT MODIFIED');
}

function setSaveStatus(status) {
  document.getElementById('save-status-msg').textContent = status;
}

function saveActiveEntry() {
  const titleInput = document.getElementById('entry-title');
  const bodyTextarea = document.getElementById('entry-body');
  const activeMoodBtn = document.querySelector('.mood-select-btn.active');
  
  const title = titleInput.value.trim() || 'Untitled Log';
  const body = bodyTextarea.value.trim();
  const mood = activeMoodBtn ? activeMoodBtn.dataset.mood : 'rad';

  if (!body) {
    playWarningSound();
    alert("SYSTEM ERROR: Log output content cannot be blank.");
    return;
  }

  const existingIndex = journalEntries.findIndex(e => e.date === selectedDateStr);
  const entryObject = {
    id: selectedDateStr, // Unique key per day
    date: selectedDateStr,
    title: title,
    body: body,
    mood: mood,
    timestamp: new Date().toISOString()
  };

  if (existingIndex !== -1) {
    journalEntries[existingIndex] = entryObject;
  } else {
    journalEntries.push(entryObject);
  }

  // Save to LocalStorage
  localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(journalEntries));
  
  // UI feedback
  playSuccessSound();
  setSaveStatus('💾 SAVED SECURELY');
  document.getElementById('btn-delete-entry').disabled = false;
  
  // Auto Write-Protect after saving historical entries
  if (!isToday(selectedDateStr)) {
    document.getElementById('write-protect-switch').checked = true;
    updateWriteProtectUI();
  }

  // Refresh Timeline lists & floppy stats
  renderTimeline();
  updateFloppyStats();
}

function deleteActiveEntry() {
  const confirmDelete = confirm(`Are you sure you want to PURGE the log entry for [${selectedDateStr}]?`);
  if (!confirmDelete) return;

  journalEntries = journalEntries.filter(e => e.date !== selectedDateStr);
  localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(journalEntries));

  playDeleteSound();
  loadDiaryEntry(selectedDateStr);
  renderTimeline();
  updateFloppyStats();
}

// --- TIMELINE ARCHIVE GENERATOR ---
function setupTimelineControls() {
  const searchInput = document.getElementById('timeline-search');
  const moodFilter = document.getElementById('filter-mood-select');

  searchInput.addEventListener('input', () => {
    renderTimeline();
    playMechanicalClick();
  });

  moodFilter.addEventListener('change', () => {
    renderTimeline();
    playUIAckBeep();
  });
}

function renderTimeline() {
  const timelineContainer = document.getElementById('timeline-list-container');
  const query = document.getElementById('timeline-search').value.toLowerCase().trim();
  const moodVal = document.getElementById('filter-mood-select').value;
  
  timelineContainer.innerHTML = '';

  // Sort chronological descending (latest date first)
  const filtered = journalEntries.filter(entry => {
    const matchesMood = (moodVal === 'all' || entry.mood === moodVal);
    const matchesSearch = !query || 
      entry.title.toLowerCase().includes(query) || 
      entry.body.toLowerCase().includes(query);
    return matchesMood && matchesSearch;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  if (filtered.length === 0) {
    timelineContainer.innerHTML = '<div class="no-timeline-msg">NO LOG BLOCKS DECODED.</div>';
    return;
  }

  filtered.forEach(entry => {
    const item = document.createElement('div');
    item.className = 'timeline-item';
    if (entry.date === selectedDateStr) {
      item.classList.add('active');
    }

    const moodEmojiMap = {
      rad: '🕶️',
      chill: '🌊',
      tired: '💤',
      meh: '👾',
      glitchy: '⚡'
    };
    const emoji = moodEmojiMap[entry.mood] || '💾';

    // Highlight text segments matching query
    let titleHtml = entry.title;
    if (query) {
      const regex = new RegExp(`(${query})`, 'gi');
      titleHtml = entry.title.replace(regex, '<mark>$1</mark>');
    }

    const excerpt = entry.body.substring(0, 70) + (entry.body.length > 70 ? '...' : '');

    item.innerHTML = `
      <div class="timeline-dot-connector"></div>
      <div class="timeline-card-content">
        <div class="timeline-card-header">
          <span class="tl-date">${entry.date}</span>
          <span class="tl-mood" title="Mood: ${entry.mood}">${emoji}</span>
        </div>
        <div class="tl-title">${titleHtml}</div>
        <div class="tl-excerpt">${excerpt}</div>
      </div>
    `;

    // Click timeline card to load into editor
    item.querySelector('.timeline-card-content').addEventListener('click', () => {
      selectedDateStr = entry.date;
      document.getElementById('diary-date-picker').value = selectedDateStr;
      loadDiaryEntry(selectedDateStr);
      focusWindow(document.getElementById('win-journal'));
      
      // Update active state class highlights in timeline list
      document.querySelectorAll('.timeline-item').forEach(el => el.classList.remove('active'));
      item.classList.add('active');
      
      playUIAckBeep();
    });

    timelineContainer.appendChild(item);
  });
}

// --- FLOPPY BACKUP DRIVE ---
function setupFloppyControls() {
  const exportBtn = document.getElementById('btn-export-floppy');
  const importBtn = document.getElementById('btn-trigger-import');
  const fileInput = document.getElementById('floppy-import-input');

  exportBtn.addEventListener('click', () => {
    exportJournalBackup();
  });

  importBtn.addEventListener('click', () => {
    fileInput.click();
    playUIAckBeep();
  });

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    importJournalBackup(file);
  });
}

function updateFloppyStats() {
  const blockCount = journalEntries.length;
  const totalCharacters = journalEntries.reduce((acc, curr) => acc + curr.body.length + curr.title.length, 0);
  
  // Update UI texts
  document.getElementById('disk-capacity-text').textContent = `Blocks: ${blockCount} | Total Payload: ${totalCharacters} Chars`;
  document.getElementById('backup-floppy-date').textContent = `DATE: ${getLocalDateString(new Date()).replace(/-/g, '.')}`;
}

function exportJournalBackup() {
  if (journalEntries.length === 0) {
    playWarningSound();
    alert("SYSTEM WARNING: Floppy is empty. No blocks to export.");
    return;
  }

  const payload = {
    app: "Retro-CRT-Journal",
    exportedAt: new Date().toISOString(),
    blocks: journalEntries
  };

  const jsonString = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const tempLink = document.createElement('a');
  tempLink.href = url;
  tempLink.download = `crt_diary_floppy_${getLocalDateString(new Date())}.json`;
  
  playFloppyWriteSound();
  document.body.appendChild(tempLink);
  tempLink.click();
  document.body.removeChild(tempLink);
  
  setSaveStatus('💾 FLOPPY WRITTEN');
}

function importJournalBackup(file) {
  const reader = new FileReader();
  reader.onload = function(event) {
    try {
      const data = JSON.parse(event.target.result);
      if (data.app !== "Retro-CRT-Journal" || !Array.isArray(data.blocks)) {
        throw new Error("Invalid disk metadata header.");
      }

      // Merge and resolve duplication by taking the latest updated entry date
      data.blocks.forEach(importedBlock => {
        if (!importedBlock.date || !importedBlock.body) return;
        const existingIdx = journalEntries.findIndex(e => e.date === importedBlock.date);
        if (existingIdx !== -1) {
          journalEntries[existingIdx] = importedBlock;
        } else {
          journalEntries.push(importedBlock);
        }
      });

      localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(journalEntries));
      
      playSuccessSound();
      alert(`SYSTEM NOTE: Restored ${data.blocks.length} blocks successfully from floppy diskette.`);
      
      // Reload timeline and active entry
      loadDiaryEntry(selectedDateStr);
      renderTimeline();
      updateFloppyStats();
    } catch (e) {
      playWarningSound();
      alert(`DISK BOOT FAILURE: JSON read error. ${e.message}`);
    }
  };
  reader.readAsText(file);
}

// --- JUKEBOX SYNTH MUSIC & VOLUMES ---
function setupJukeboxControls() {
  const playBtn = document.getElementById('btn-play-tune');
  const prevBtn = document.getElementById('btn-prev-tune');
  const nextBtn = document.getElementById('btn-next-tune');
  const keyboardVolSlider = document.getElementById('volume-keyboard');
  const bgmVolSlider = document.getElementById('volume-bgm');

  playBtn.addEventListener('click', () => {
    if (!isPowerOn) return;
    initAudio();
    audioCtx.resume();
    toggleMusicSequencer();
  });

  prevBtn.addEventListener('click', () => {
    if (!isPowerOn) return;
    initAudio();
    changeTune(-1);
  });

  nextBtn.addEventListener('click', () => {
    if (!isPowerOn) return;
    initAudio();
    changeTune(1);
  });

  keyboardVolSlider.addEventListener('input', (e) => {
    volumeKeyboardVal = parseFloat(e.target.value) / 100;
    if (keyGain) {
      keyGain.gain.setValueAtTime(volumeKeyboardVal, audioCtx.currentTime);
    }
    playMechanicalClick();
  });

  bgmVolSlider.addEventListener('input', (e) => {
    volumeBgmVal = parseFloat(e.target.value) / 100;
    if (bgmGain) {
      bgmGain.gain.setValueAtTime(volumeBgmVal, audioCtx.currentTime);
    }
  });
}

function changeTune(direction) {
  activeTuneIndex = (activeTuneIndex + direction + CHIPTUNES.length) % CHIPTUNES.length;
  document.getElementById('tape-song-name').textContent = CHIPTUNES[activeTuneIndex].name;
  
  if (isMusicPlaying) {
    stopSequencer();
    startSequencer();
  } else {
    playUIAckBeep();
  }
}

function toggleMusicSequencer() {
  const playBtn = document.getElementById('btn-play-tune');
  const playIcon = document.getElementById('music-play-icon');
  const spindleL = document.getElementById('spindle-left');
  const spindleR = document.getElementById('spindle-right');

  if (isMusicPlaying) {
    stopSequencer();
    playIcon.setAttribute('data-lucide', 'play');
    spindleL.classList.remove('playing');
    spindleR.classList.remove('playing');
    playUICloseBeep();
  } else {
    startSequencer();
    playIcon.setAttribute('data-lucide', 'pause');
    spindleL.classList.add('playing');
    spindleR.classList.add('playing');
    playUIAckBeep();
  }
  lucide.createIcons();
}

function startSequencer() {
  isMusicPlaying = true;
  seqStepIndex = 0;
  
  const tune = CHIPTUNES[activeTuneIndex];
  const stepDuration = 60 / tune.tempo / 2; // Eighth notes
  
  const scheduler = () => {
    if (!isMusicPlaying) return;
    
    const now = audioCtx.currentTime;
    const melodyFreq = tune.melody[seqStepIndex % tune.melody.length];
    const bassFreq = tune.bass[seqStepIndex % tune.bass.length];
    
    // Play Melodic Arpeggio Channel (Triangle Synth)
    playSynthNote(melodyFreq, 0.12, 'triangle', now, 0.15);
    
    // Play Bass Channel (Sine Synth) on step divisions
    if (seqStepIndex % 2 === 0) {
      playSynthNote(bassFreq, 0.2, 'sine', now, 0.25);
    }
    
    // Procedural drum noise hit (Kick & Snare beats)
    if (seqStepIndex % 4 === 0) {
      playRetroKick(now);
    } else if (seqStepIndex % 4 === 2) {
      playRetroSnare(now);
    }

    seqStepIndex++;
    seqTimer = setTimeout(scheduler, stepDuration * 1000);
  };
  
  scheduler();
}

function stopSequencer() {
  isMusicPlaying = false;
  if (seqTimer) clearTimeout(seqTimer);
  
  // Set icons
  const playIcon = document.getElementById('music-play-icon');
  const spindleL = document.getElementById('spindle-left');
  const spindleR = document.getElementById('spindle-right');
  if (playIcon) playIcon.setAttribute('data-lucide', 'play');
  if (spindleL) spindleL.classList.remove('playing');
  if (spindleR) spindleR.classList.remove('playing');
  lucide.createIcons();
}

// --- Procedural Synth Note Generators ---
function playSynthNote(freq, duration, type, startTime, gainVal) {
  if (globalMuted) return;
  
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  
  gainNode.gain.setValueAtTime(gainVal, startTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  
  osc.connect(gainNode);
  gainNode.connect(bgmGain);
  
  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

function playRetroKick(startTime) {
  if (globalMuted) return;
  
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(120, startTime);
  osc.frequency.exponentialRampToValueAtTime(40, startTime + 0.1);
  
  gainNode.gain.setValueAtTime(0.35, startTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.12);
  
  osc.connect(gainNode);
  gainNode.connect(bgmGain);
  
  osc.start(startTime);
  osc.stop(startTime + 0.15);
}

function playRetroSnare(startTime) {
  if (globalMuted) return;
  
  const bufferSize = audioCtx.sampleRate * 0.05;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  
  const noiseSource = audioCtx.createBufferSource();
  noiseSource.buffer = buffer;
  
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1500;
  
  const gainNode = audioCtx.createGain();
  gainNode.gain.setValueAtTime(0.12, startTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.045);
  
  noiseSource.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(bgmGain);
  
  noiseSource.start(startTime);
}

// --- Key Type click synthesizer (Web Audio API) ---
function playMechanicalClick() {
  if (globalMuted) return;
  initAudio();
  audioCtx.resume();
  
  const now = audioCtx.currentTime;
  
  // 1. Noise burst for switch rattle
  const bufferSize = audioCtx.sampleRate * 0.025; // 25ms burst
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  
  const noiseSource = audioCtx.createBufferSource();
  noiseSource.buffer = buffer;
  
  const filterNode = audioCtx.createBiquadFilter();
  filterNode.type = 'bandpass';
  filterNode.frequency.setValueAtTime(1200 + Math.random() * 400, now);
  filterNode.Q.setValueAtTime(6, now);
  
  const noiseGain = audioCtx.createGain();
  noiseGain.gain.setValueAtTime(0.14, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
  
  noiseSource.connect(filterNode);
  filterNode.connect(noiseGain);
  noiseGain.connect(keyGain);
  noiseSource.start(now);
  
  // 2. High metallic chime/ping oscillator
  const osc = audioCtx.createOscillator();
  const oscGain = audioCtx.createGain();
  osc.type = Math.random() > 0.4 ? 'triangle' : 'sine';
  osc.frequency.setValueAtTime(2500 + Math.random() * 800, now);
  
  oscGain.gain.setValueAtTime(0.06, now);
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.018);
  
  osc.connect(oscGain);
  oscGain.connect(keyGain);
  
  osc.start(now);
  osc.stop(now + 0.025);
}

// --- Sound Effects & UI Alerts ---
function playUIAckBeep() {
  if (globalMuted) return;
  initAudio();
  audioCtx.resume();
  const now = audioCtx.currentTime;
  
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(880, now); // A5 note
  
  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(now);
  osc.stop(now + 0.1);
}

function playUICloseBeep() {
  if (globalMuted) return;
  initAudio();
  audioCtx.resume();
  const now = audioCtx.currentTime;
  
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(440, now); // A4 note
  
  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(now);
  osc.stop(now + 0.1);
}

function playSuccessSound() {
  if (globalMuted) return;
  initAudio();
  audioCtx.resume();
  const now = audioCtx.currentTime;
  
  // Double-beep retro chime
  const osc1 = audioCtx.createOscillator();
  const osc2 = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc1.type = 'square';
  osc1.frequency.setValueAtTime(600, now);
  osc1.frequency.setValueAtTime(800, now + 0.08);
  
  gain.gain.setValueAtTime(0.1, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
  
  osc1.connect(gain);
  gain.connect(masterGain);
  osc1.start(now);
  osc1.stop(now + 0.22);
}

function playWarningSound() {
  if (globalMuted) return;
  initAudio();
  audioCtx.resume();
  const now = audioCtx.currentTime;
  
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(180, now);
  osc.frequency.linearRampToValueAtTime(140, now + 0.25);
  
  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
  
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(now);
  osc.stop(now + 0.3);
}

function playDeleteSound() {
  if (globalMuted) return;
  initAudio();
  audioCtx.resume();
  const now = audioCtx.currentTime;
  
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(300, now);
  osc.frequency.exponentialRampToValueAtTime(60, now + 0.35);
  
  gain.gain.setValueAtTime(0.14, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
  
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(now);
  osc.stop(now + 0.4);
}

function playFloppyWriteSound() {
  if (globalMuted) return;
  initAudio();
  audioCtx.resume();
  const now = audioCtx.currentTime;
  
  // Simulates floppy head movement clicks
  for (let i = 0; i < 4; i++) {
    const clickTime = now + (i * 0.12);
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(80, clickTime);
    
    gain.gain.setValueAtTime(0.18, clickTime);
    gain.gain.exponentialRampToValueAtTime(0.001, clickTime + 0.05);
    
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(clickTime);
    osc.stop(clickTime + 0.06);
  }
}

function playPowerOnSound() {
  if (globalMuted) return;
  initAudio();
  audioCtx.resume();
  const now = audioCtx.currentTime;
  
  // Power startup squeal (100Hz to 12kHz swoop) + click
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(100, now);
  osc.frequency.exponentialRampToValueAtTime(13000, now + 0.25);
  
  gain.gain.setValueAtTime(0.05, now);
  gain.gain.setValueAtTime(0.1, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
  
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(now);
  osc.stop(now + 0.26);

  // Relay click sound
  const clickOsc = audioCtx.createOscillator();
  const clickGain = audioCtx.createGain();
  clickOsc.type = 'triangle';
  clickOsc.frequency.setValueAtTime(120, now + 0.05);
  clickGain.gain.setValueAtTime(0.15, now + 0.05);
  clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  clickOsc.connect(clickGain);
  clickGain.connect(masterGain);
  clickOsc.start(now + 0.05);
  clickOsc.stop(now + 0.1);
}

function playPowerOffSound() {
  if (globalMuted) return;
  initAudio();
  audioCtx.resume();
  const now = audioCtx.currentTime;
  
  // Simple solid relay shutoff click
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(90, now);
  
  gain.gain.setValueAtTime(0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
  
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(now);
  osc.stop(now + 0.07);
}
