/**
 * NovaCode Main Application Controller
 * Orchestrates Editor, Terminal, Assistant, Web Preview, Security,
 * File Management, Tabs, Themes, Language Switcher, and Runtime Diagnostics.
 */

class NovaApp {
  constructor() {
    this.tabs = [];
    this.activeTabId = null;
    this.tabCounter = 0;
    this.currentProjectDir = null;
    this.currentExecId = null;
    this.runtimes = {};
    this.isExecuting = false;

    // Settings
    this.settings = {
      theme: localStorage.getItem('novacode_theme') || 'dark',
      fontSize: parseInt(localStorage.getItem('novacode_fontSize') || '14', 10),
      autoSave: localStorage.getItem('novacode_autoSave') !== 'false',
      autoSaveIntervalSec: 5,
      autoCloseBrackets: true
    };

    this.init();
  }

  async init() {
    this.applyTheme(this.settings.theme);
    this.initDOM();
    this.initSubsystems();
    this.bindGlobalEvents();

    // Check system runtimes
    await this.fetchRuntimes();

    // Load recent projects
    await this.loadRecentProjects();

    // Load starter sample tabs (C and Python)
    this.openDefaultStarterTabs();

    // Auto-save loop
    this.startAutoSaveLoop();
  }

  initDOM() {
    // Topbar elements
    this.runBtn = document.getElementById('btn-run');
    this.stopBtn = document.getElementById('btn-stop');
    this.quickNewBtn = document.getElementById('btn-quick-new-file');
    this.explainBtn = document.getElementById('btn-explain');
    this.formatBtn = document.getElementById('btn-format');
    this.findBtn = document.getElementById('btn-find');
    this.securityBtn = document.getElementById('btn-security');
    this.zenBtn = document.getElementById('btn-zen');
    this.homeBtn = document.getElementById('btn-home');
    this.themeSelect = document.getElementById('select-theme');
    this.langSelect = document.getElementById('select-active-language');
    this.runtimePill = document.getElementById('runtime-status-pill');
    this.runtimeStatusText = document.getElementById('runtime-status-text');
    this.runtimeStatusDot = document.getElementById('runtime-status-dot');

    // Breadcrumbs
    this.breadcrumbProject = document.getElementById('bc-project');
    this.breadcrumbFile = document.getElementById('bc-file');
    this.unsavedDot = document.getElementById('unsaved-indicator');

    // Tabs
    this.tabsBar = document.getElementById('tabs-bar');
    this.newTabBtn = document.getElementById('new-tab-btn');
    this.autoSaveText = document.getElementById('auto-save-text');

    // Sidebar
    this.sidebar = document.getElementById('sidebar');
    this.fileTree = document.getElementById('file-tree');
    this.sidebarNewFileBtn = document.getElementById('sidebar-new-file');

    // Bottom Panel Tabs
    this.panelTabBtns = document.querySelectorAll('.panel-tab-btn');
    this.panelPages = document.querySelectorAll('.panel-page');
    this.errorBadge = document.getElementById('panel-error-badge');

    // Modals
    this.dashboardOverlay = document.getElementById('dashboard-overlay');
    this.newFileModal = document.getElementById('new-file-modal');
    this.runtimeModal = document.getElementById('runtime-modal');
    this.templatesModal = document.getElementById('templates-modal');
    this.settingsModal = document.getElementById('settings-modal');
    this.securityModal = document.getElementById('security-modal');
  }

  initSubsystems() {
    // 1. Code Editor
    const editorContainer = document.getElementById('editor-mount');
    this.editor = new NovaEditor(editorContainer, {
      language: 'c',
      fontSize: this.settings.fontSize,
      onChange: (newCode) => this.onCodeModified(newCode),
      onCursorMove: (line, col) => {
        const cursorEl = document.getElementById('editor-cursor-pos');
        if (cursorEl) cursorEl.innerText = `Ln ${line}, Col ${col}`;
      }
    });

    // 2. Terminal
    const terminalMount = document.getElementById('terminal-mount');
    this.terminal = new NovaTerminal(terminalMount, {
      onStopClick: () => this.stopExecution(),
      onInputSubmit: (execId, input) => this.sendInteractiveInput(execId, input)
    });

    // 3. Smart Error Display
    const errorMount = document.getElementById('error-mount');
    this.smartError = new SmartErrorDisplay(errorMount, this.editor);

    // 4. Nova Assistant
    const assistantMount = document.getElementById('assistant-mount');
    this.assistant = new NovaAssistant(assistantMount, this.editor);

    // 5. Live Web Preview
    const webMount = document.getElementById('web-mount');
    this.webPreview = new WebPreview(webMount, {
      onConsoleLog: (text) => this.terminal.appendStdout(text),
      onConsoleError: (text) => this.terminal.appendStderr(text)
    });

    // 6. Security Guard
    const securityMount = document.getElementById('security-mount');
    this.securityGuard = new SecurityGuard(securityMount);
  }

  bindGlobalEvents() {
    // Run & Stop
    this.runBtn.addEventListener('click', () => this.runCurrentCode());
    this.stopBtn.addEventListener('click', () => this.stopExecution());

    // Language Dropdown Selector in Topbar
    if (this.langSelect) {
      this.langSelect.addEventListener('change', (e) => {
        this.changeCurrentLanguage(e.target.value);
      });
    }

    // New File Buttons
    if (this.quickNewBtn) {
      this.quickNewBtn.addEventListener('click', () => this.showNewFileModal());
    }
    if (this.newTabBtn) {
      this.newTabBtn.addEventListener('click', () => this.showNewFileModal());
    }
    if (this.sidebarNewFileBtn) {
      this.sidebarNewFileBtn.addEventListener('click', () => this.showNewFileModal());
    }

    // Double-click breadcrumb to rename file
    if (this.breadcrumbFile) {
      this.breadcrumbFile.addEventListener('dblclick', () => {
        const tab = this.getActiveTab();
        if (tab) this.promptRenameTab(tab.id);
      });
    }

    // Formatting & Find
    this.formatBtn.addEventListener('click', () => {
      this.editor.formatCode();
      this.showToast('Code tidied and formatted!', 'success');
    });
    this.findBtn.addEventListener('click', () => this.editor.showFindReplace());

    // Explain & Security
    this.explainBtn.addEventListener('click', () => {
      this.switchBottomPanel('assistant');
      this.assistant.explainCurrentCode();
    });
    this.securityBtn.addEventListener('click', () => this.runManualSecurityCheck());

    // Zen Mode
    this.zenBtn.addEventListener('click', () => this.toggleZenMode());

    // Home / Dashboard
    this.homeBtn.addEventListener('click', () => this.toggleDashboard(true));

    // Theme Switch
    this.themeSelect.value = this.settings.theme;
    this.themeSelect.addEventListener('change', (e) => {
      this.settings.theme = e.target.value;
      localStorage.setItem('novacode_theme', e.target.value);
      this.applyTheme(e.target.value);
    });

    // Runtime Inspector Pill
    this.runtimePill.addEventListener('click', () => this.showRuntimeModal());

    // Bottom Panel Navigation
    this.panelTabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-tab');
        this.switchBottomPanel(target);
      });
    });

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey && e.key === 'Enter') || e.key === 'F5') {
        e.preventDefault();
        this.runCurrentCode();
      } else if (e.ctrlKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        this.saveActiveTab();
      } else if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        this.toggleZenMode();
      } else if (e.key === 'Escape') {
        if (document.body.classList.contains('zen-mode')) {
          this.toggleZenMode(false);
        }
        this.closeAllModals();
      }
    });

    // Modal Close buttons
    document.querySelectorAll('.modal-close-btn').forEach(btn => {
      btn.addEventListener('click', () => this.closeAllModals());
    });

    // New File Modal Handlers
    const confirmCreateBtn = document.getElementById('btn-confirm-create-file');
    const newFileLangSelect = document.getElementById('new-file-lang-select');
    const newFileNameInput = document.getElementById('new-file-name-input');
    const newFileTemplateCheck = document.getElementById('new-file-template-check');

    if (newFileLangSelect && newFileNameInput) {
      newFileLangSelect.addEventListener('change', (e) => {
        const ext = this.getExtForLang(e.target.value);
        const baseName = newFileNameInput.value.split('.')[0] || 'main';
        newFileNameInput.value = `${baseName}.${ext}`;
      });
    }

    if (confirmCreateBtn) {
      confirmCreateBtn.addEventListener('click', () => {
        const lang = newFileLangSelect.value;
        let filename = newFileNameInput.value.trim();
        if (!filename) filename = `main.${this.getExtForLang(lang)}`;
        const includeTemplate = newFileTemplateCheck.checked;

        this.closeAllModals();
        this.createNewTab({
          filename,
          language: lang,
          content: includeTemplate ? this.getDefaultCodeForLang(lang) : ''
        });
        this.showToast(`Created new file ${filename}!`, 'success');
      });
    }

    // Quick Preset Buttons in New File Modal
    const presets = [
      { id: 'preset-c-btn', lang: 'c', name: 'main.c' },
      { id: 'preset-py-btn', lang: 'python', name: 'main.py' },
      { id: 'preset-html-btn', lang: 'html_css', name: 'index.html' },
      { id: 'preset-js-btn', lang: 'javascript', name: 'script.js' },
      { id: 'preset-cpp-btn', lang: 'cpp', name: 'main.cpp' },
      { id: 'preset-java-btn', lang: 'java', name: 'Main.java' }
    ];
    presets.forEach(p => {
      const el = document.getElementById(p.id);
      if (el) {
        el.addEventListener('click', () => this.quickCreatePreset(p.lang, p.name));
      }
    });

    // Dashboard Buttons
    const dashNewBtn = document.getElementById('dash-new-btn');
    if (dashNewBtn) dashNewBtn.addEventListener('click', () => {
      this.toggleDashboard(false);
      this.showNewFileModal();
    });

    const dashTemplatesBtn = document.getElementById('dash-templates-btn');
    if (dashTemplatesBtn) dashTemplatesBtn.addEventListener('click', () => {
      this.showTemplatesModal();
    });

    const dashOpenBtn = document.getElementById('dash-open-btn');
    if (dashOpenBtn) dashOpenBtn.addEventListener('click', () => {
      this.openDefaultStarterTabs();
      this.toggleDashboard(false);
    });

    const dashRescanBtn = document.getElementById('dash-rescan-btn');
    if (dashRescanBtn) dashRescanBtn.addEventListener('click', async () => {
      await this.fetchRuntimes(true);
      this.showToast('Runtime health scan complete!', 'success');
    });

    // Settings Modal
    const settingsBtn = document.getElementById('btn-settings');
    if (settingsBtn) settingsBtn.addEventListener('click', () => this.showSettingsModal());

    const fontRange = document.getElementById('setting-font-size');
    if (fontRange) {
      fontRange.value = this.settings.fontSize;
      fontRange.addEventListener('input', (e) => {
        const size = parseInt(e.target.value, 10);
        this.settings.fontSize = size;
        localStorage.setItem('novacode_fontSize', size);
        this.editor.setFontSize(size);
        document.getElementById('font-size-display').innerText = `${size}px`;
      });
    }
  }

  // ----------------------------------------------------
  // LANGUAGE SWITCHING & CONVERSIONS
  // ----------------------------------------------------
  changeCurrentLanguage(newLang) {
    const tab = this.getActiveTab();
    if (!tab) return;

    const oldLang = tab.language;
    tab.language = newLang;
    this.editor.setLanguage(newLang);

    // Update filename extension
    const oldExt = this.getExtForLang(oldLang);
    const newExt = this.getExtForLang(newLang);
    if (tab.filename.endsWith(`.${oldExt}`)) {
      tab.filename = tab.filename.slice(0, -(oldExt.length + 1)) + `.${newExt}`;
    } else if (!tab.filename.includes('.')) {
      tab.filename = `${tab.filename}.${newExt}`;
    }

    // If blank or matching default template of old language, update to new template
    if (!tab.content.trim() || tab.content === this.getDefaultCodeForLang(oldLang)) {
      tab.content = this.getDefaultCodeForLang(newLang);
      this.editor.setValue(tab.content);
    }

    this.breadcrumbFile.innerText = tab.filename;
    this.renderTabs();
    this.updateRuntimeStatusDisplay();
    this.showToast(`Switched language to ${newLang.toUpperCase()} (.${newExt})!`, 'success');
  }

  promptRenameTab(tabId) {
    const tab = this.tabs.find(t => t.id === tabId);
    if (!tab) return;

    const newName = prompt('Enter new filename (e.g. main.c, hello.py, index.html):', tab.filename);
    if (newName && newName.trim() && newName.trim() !== tab.filename) {
      tab.filename = newName.trim();
      const ext = tab.filename.split('.').pop();
      const detectedLang = this.getLangForExt(ext);
      tab.language = detectedLang;
      this.editor.setLanguage(detectedLang);
      if (this.langSelect) this.langSelect.value = detectedLang;
      this.breadcrumbFile.innerText = tab.filename;
      this.renderTabs();
      this.updateRuntimeStatusDisplay();
      this.showToast(`Renamed to ${tab.filename} (${detectedLang.toUpperCase()})`, 'success');
    }
  }

  showNewFileModal() {
    this.newFileModal.classList.add('active');
    const input = document.getElementById('new-file-name-input');
    if (input) {
      input.focus();
      input.select();
    }
  }

  quickCreatePreset(lang, filename) {
    this.closeAllModals();
    this.createNewTab({
      filename,
      language: lang,
      content: this.getDefaultCodeForLang(lang)
    });
    this.showToast(`Created ${filename}!`, 'success');
  }

  // ----------------------------------------------------
  // RUNTIMES & HEALTH
  // ----------------------------------------------------
  async fetchRuntimes(forceRescan = false) {
    try {
      const endpoint = forceRescan ? '/api/runtimes/rescan' : '/api/runtimes';
      const method = forceRescan ? 'POST' : 'GET';
      const res = await fetch(endpoint, { method });
      const data = await res.json();
      this.runtimes = data.runtimes || {};
      this.updateRuntimeStatusDisplay();
    } catch (e) {
      console.warn('Failed to fetch runtimes:', e);
    }
  }

  updateRuntimeStatusDisplay() {
    const tab = this.getActiveTab();
    const lang = tab ? tab.language : 'c';

    // Synchronize language dropdown
    if (this.langSelect && tab) {
      this.langSelect.value = tab.language;
    }

    let currentRuntime = this.runtimes[lang] || this.runtimes.c || this.runtimes.python;
    if (lang === 'html_css') {
      currentRuntime = this.runtimes.html_css;
    }

    if (currentRuntime && currentRuntime.available) {
      this.runtimeStatusDot.className = 'status-dot';
      this.runtimeStatusText.innerText = `${currentRuntime.name} Ready`;
      this.runtimePill.style.borderColor = 'rgba(16, 185, 129, 0.4)';
    } else {
      this.runtimeStatusDot.className = 'status-dot missing';
      this.runtimeStatusText.innerText = `${currentRuntime ? currentRuntime.name : lang} Setup Needed`;
      this.runtimePill.style.borderColor = 'rgba(245, 158, 11, 0.5)';
    }

    // Update Dashboard health badges row
    const dashRow = document.getElementById('dash-runtime-badges');
    if (dashRow) {
      let badgesHTML = '';
      Object.keys(this.runtimes).forEach(k => {
        const r = this.runtimes[k];
        badgesHTML += `
          <div class="runtime-tag ${r.available ? 'ready' : 'missing'}" onclick="app.showRuntimeDetail('${k}')">
            <span class="status-dot"></span>
            <strong>${r.name}:</strong>
            <span>${r.available ? (r.version || 'Ready') : 'Not Configured'}</span>
          </div>
        `;
      });
      dashRow.innerHTML = badgesHTML;
    }
  }

  showRuntimeModal(selectedKey = null) {
    const modalBody = document.getElementById('runtime-modal-body');
    let html = `
      <div style="margin-bottom: 16px;">
        <p style="font-size: 0.88rem; color: var(--text-secondary);">
          NovaCode actively checks your system for compilers and interpreters. It provides step-by-step setup guides for any missing tools.
        </p>
      </div>
      <div style="display: flex; flex-direction: column; gap: 12px;">
    `;

    Object.keys(this.runtimes).forEach(k => {
      const r = this.runtimes[k];
      html += `
        <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 8px; padding: 14px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="status-dot ${r.available ? '' : 'missing'}"></span>
              <strong style="color: var(--text-primary); font-size: 0.95rem;">${r.name}</strong>
            </div>
            <span class="brand-pill" style="background: ${r.available ? 'var(--success-bg)' : 'var(--warning-bg)'}; color: ${r.available ? 'var(--success)' : 'var(--warning)'};">
              ${r.available ? 'CONFIGURED & READY' : 'SETUP REQUIRED'}
            </span>
          </div>
          <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 8px;">${r.description}</p>
          ${r.available ? `
            <div style="font-size: 0.78rem; font-family: var(--font-mono); color: var(--text-secondary); background: var(--bg-primary); padding: 4px 8px; border-radius: 4px;">
              Detected: ${r.version || ''} (${r.path || 'Internal'})
            </div>
          ` : `
            ${r.setupGuide ? `
              <div style="margin-top: 8px; font-size: 0.82rem; background: rgba(99, 102, 241, 0.08); padding: 10px; border-radius: 6px;">
                <strong style="color: #818cf8;">Quick Setup Steps:</strong>
                <ol style="padding-left: 18px; margin-top: 4px; line-height: 1.5;">
                  ${r.setupGuide.steps.map(s => `<li>${s}</li>`).join('')}
                </ol>
                ${r.setupGuide.quickInstallCmd ? `
                  <div style="margin-top: 8px;">
                    <span style="font-size: 0.75rem; color: var(--text-muted);">Quick Install Command:</span>
                    <div style="display: flex; align-items: center; gap: 6px; margin-top: 2px;">
                      <code style="background: var(--bg-primary); padding: 3px 8px; border-radius: 4px; font-size: 0.78rem;">${r.setupGuide.quickInstallCmd}</code>
                      <button class="btn btn-sm btn-outline" onclick="navigator.clipboard.writeText('${r.setupGuide.quickInstallCmd}'); alert('Command copied!');">Copy</button>
                    </div>
                  </div>
                ` : ''}
              </div>
            ` : ''}
          `}
        </div>
      `;
    });

    html += `</div>`;
    modalBody.innerHTML = html;
    this.runtimeModal.classList.add('active');
  }

  showRuntimeDetail(key) {
    this.showRuntimeModal(key);
  }

  // ----------------------------------------------------
  // TABS & FILE MANAGEMENT
  // ----------------------------------------------------
  createNewTab(options = {}) {
    this.tabCounter++;
    const id = `tab_${Date.now()}_${this.tabCounter}`;
    const language = options.language || 'c';
    const filename = options.filename || `program_${this.tabCounter}.${this.getExtForLang(language)}`;
    const content = options.content !== undefined ? options.content : this.getDefaultCodeForLang(language);

    const tab = {
      id,
      filename,
      language,
      content,
      isDirty: false,
      filePath: options.filePath || null
    };

    this.tabs.push(tab);
    this.renderTabs();
    this.activateTab(id);
    return tab;
  }

  openDefaultStarterTabs() {
    // 1. C Starter File
    this.createNewTab({
      filename: 'main.c',
      language: 'c',
      content: `// ⚡ Welcome to C Programming in NovaCode!
// Press the green "Run" button (or Ctrl+Enter) to execute!

#include <stdio.h>

int main() {
    printf("========================================\\n");
    printf("   Hello, World from C in NovaCode!    \\n");
    printf("========================================\\n");

    int a = 15;
    int b = 25;
    int sum = a + b;

    printf("Calculating: %d + %d = %d\\n", a, b, sum);

    if (sum > 30) {
        printf("Success: The sum is greater than 30!\\n");
    } else {
        printf("The sum is 30 or less.\\n");
    }

    return 0;
}
`
    });

    // 2. Python Starter File
    this.createNewTab({
      filename: 'hello_game.py',
      language: 'python',
      content: `# 🌟 Python Starter in NovaCode!
# Switch language anytime using the dropdown above.

import random

print("🚀 NOVA PYTHON NUMBER GUESSING GAME 🚀")
secret = random.randint(1, 10)
print("I picked a number between 1 and 10!")

try:
    guess = int(input("Enter your guess: "))
    if guess == secret:
        print("🎉 Correct! You won!")
    else:
        print(f"Almost! The number was {secret}.")
except ValueError:
    print("Please enter a valid number.")
`
    });

    // Activate the C file first
    if (this.tabs.length > 0) {
      this.activateTab(this.tabs[0].id);
    }
  }

  renderTabs() {
    this.tabsBar.innerHTML = '';
    this.tabs.forEach(tab => {
      const tabEl = document.createElement('div');
      tabEl.className = `tab-item ${tab.id === this.activeTabId ? 'active' : ''}`;
      tabEl.setAttribute('data-id', tab.id);

      const icon = this.getFileIcon(tab.filename);
      tabEl.innerHTML = `
        <span class="file-icon">${icon}</span>
        <span class="tab-title" title="Double click to rename">${tab.filename}</span>
        ${tab.isDirty ? '<span class="unsaved-dot"></span>' : ''}
        <span class="tab-close" data-close-id="${tab.id}">✕</span>
      `;

      tabEl.addEventListener('click', (e) => {
        if (e.target.classList.contains('tab-close')) {
          this.closeTab(tab.id);
        } else {
          this.activateTab(tab.id);
        }
      });

      tabEl.addEventListener('dblclick', (e) => {
        if (!e.target.classList.contains('tab-close')) {
          this.promptRenameTab(tab.id);
        }
      });

      this.tabsBar.appendChild(tabEl);
    });

    this.tabsBar.appendChild(this.newTabBtn);
  }

  activateTab(tabId) {
    const tab = this.tabs.find(t => t.id === tabId);
    if (!tab) return;

    this.activeTabId = tabId;
    this.editor.setLanguage(tab.language);
    this.editor.setValue(tab.content);

    // Update Breadcrumbs
    this.breadcrumbFile.innerText = tab.filename;
    this.unsavedDot.style.display = tab.isDirty ? 'inline-block' : 'none';

    // Clear previous error line in gutter
    this.editor.clearErrorLine();
    this.smartError.clear();

    // Re-render tabs bar
    this.renderTabs();
    this.updateRuntimeStatusDisplay();

    // If Web HTML, update live preview
    if (tab.language === 'html_css') {
      this.webPreview.updateContent(tab.content);
    }
  }

  closeTab(tabId) {
    const idx = this.tabs.findIndex(t => t.id === tabId);
    if (idx === -1) return;

    const tab = this.tabs[idx];
    if (tab.isDirty && !confirm(`"${tab.filename}" has unsaved changes. Close anyway?`)) {
      return;
    }

    this.tabs.splice(idx, 1);
    if (this.tabs.length === 0) {
      this.createNewTab();
    } else {
      const nextTab = this.tabs[Math.max(0, idx - 1)];
      this.activateTab(nextTab.id);
    }
  }

  getActiveTab() {
    return this.tabs.find(t => t.id === this.activeTabId) || null;
  }

  onCodeModified(newCode) {
    const tab = this.getActiveTab();
    if (!tab) return;

    tab.content = newCode;
    tab.isDirty = true;
    this.unsavedDot.style.display = 'inline-block';
    this.autoSaveText.innerText = '● Unsaved changes';

    if (tab.language === 'html_css') {
      this.webPreview.updateContent(newCode);
    }
  }

  saveActiveTab() {
    const tab = this.getActiveTab();
    if (!tab) return;

    tab.isDirty = false;
    this.unsavedDot.style.display = 'none';
    this.renderTabs();
    this.autoSaveText.innerText = '✔ Saved';

    fetch('/api/files/autosave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: tab.filename, content: tab.content })
    });

    this.showToast(`Saved ${tab.filename}!`, 'success');
  }

  startAutoSaveLoop() {
    setInterval(() => {
      if (!this.settings.autoSave) return;
      const tab = this.getActiveTab();
      if (tab && tab.isDirty) {
        tab.isDirty = false;
        this.unsavedDot.style.display = 'none';
        this.autoSaveText.innerText = '✔ Auto-saved';
        this.renderTabs();

        fetch('/api/files/autosave', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: tab.filename, content: tab.content })
        });
      }
    }, this.settings.autoSaveIntervalSec * 1000);
  }

  // ----------------------------------------------------
  // CODE EXECUTION & RUNTIME
  // ----------------------------------------------------
  async runCurrentCode() {
    if (this.isExecuting) return;

    const tab = this.getActiveTab();
    if (!tab) return;

    const code = this.editor.getValue();
    const language = tab.language;

    // 1. Pre-execution Security Scan
    const scanRes = await fetch('/api/security/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, language })
    });
    const scanData = await scanRes.json();

    this.securityGuard.renderReport(scanData);

    if (!scanData.safe) {
      const proceed = await this.promptSecurityWarning(scanData);
      if (!proceed) {
        this.switchBottomPanel('security');
        return;
      }
    }

    // 2. Prepare Terminal & Execution UI
    this.isExecuting = true;
    this.runBtn.disabled = true;
    this.stopBtn.disabled = false;
    this.editor.clearErrorLine();
    this.smartError.clear();

    if (language === 'html_css') {
      this.switchBottomPanel('web');
      this.webPreview.updateContent(code);
      this.terminal.appendSystem('[NovaCode] Web preview rendered in Live Web Sandbox.\n');
      this.isExecuting = false;
      this.runBtn.disabled = false;
      this.stopBtn.disabled = true;
      return;
    }

    this.switchBottomPanel('terminal');
    this.terminal.clear();
    this.terminal.startExecution('exec_live', language.toUpperCase());

    // 3. Send Execution Request
    try {
      const response = await fetch('/api/execute/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language,
          filename: tab.filename
        })
      });

      const result = await response.json();
      this.currentExecId = result.execId;

      if (result.stdout) {
        this.terminal.appendStdout(result.stdout);
      }
      if (result.stderr) {
        this.terminal.appendStderr(result.stderr);
      }

      this.terminal.endExecution(result.exitCode, result.durationMs);

      if (result.diagnostic) {
        this.smartError.renderError(result.diagnostic);
        this.switchBottomPanel('errors');
        this.errorBadge.style.display = 'inline-block';
        this.errorBadge.innerText = '1';
      } else {
        this.errorBadge.style.display = 'none';
      }

    } catch (err) {
      this.terminal.appendStderr(`\n[Execution Failure] ${err.message}\n`);
      this.terminal.endExecution(1, 0);
    } finally {
      this.isExecuting = false;
      this.runBtn.disabled = false;
      this.stopBtn.disabled = true;
    }
  }

  async stopExecution() {
    if (this.currentExecId) {
      await fetch('/api/execute/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ execId: this.currentExecId })
      });
    }
    this.terminal.appendSystem('\n[NovaCode] Execution was stopped by user.\n');
    this.terminal.endExecution(130, 0);
    this.isExecuting = false;
    this.runBtn.disabled = false;
    this.stopBtn.disabled = true;
  }

  async sendInteractiveInput(execId, text) {
    try {
      await fetch('/api/execute/input', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ execId, input: text })
      });
    } catch (e) {
      console.warn('Failed to send stdin:', e);
    }
  }

  async runManualSecurityCheck() {
    const tab = this.getActiveTab();
    if (!tab) return;
    const code = this.editor.getValue();
    const res = await fetch('/api/security/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, language: tab.language })
    });
    const scanData = await res.json();
    this.securityGuard.renderReport(scanData);
    this.switchBottomPanel('security');
    this.showToast('Security & safety scan complete', 'info');
  }

  promptSecurityWarning(scanData) {
    return new Promise((resolve) => {
      const modal = this.securityModal;
      const body = document.getElementById('security-modal-body');
      const proceedBtn = document.getElementById('btn-security-proceed');
      const cancelBtn = document.getElementById('btn-security-cancel');

      let warningsList = scanData.warnings.map(w => `
        <li style="margin-bottom: 6px;">
          <strong>${w.category}:</strong> ${w.message}
        </li>
      `).join('');

      body.innerHTML = `
        <div style="background: var(--danger-bg); border: 1px solid var(--danger); border-radius: 8px; padding: 14px; margin-bottom: 14px;">
          <h4 style="color: var(--danger); margin-bottom: 6px;">⚠️ Potentially Destructive Operation Detected</h4>
          <p style="font-size: 0.85rem; color: var(--text-primary); margin-bottom: 8px;">
            NovaCode's safety scanner detected patterns that could freeze your computer or alter important files:
          </p>
          <ul style="font-size: 0.82rem; color: var(--text-primary); padding-left: 20px;">
            ${warningsList}
          </ul>
        </div>
        <p style="font-size: 0.82rem; color: var(--text-muted);">
          Are you sure you want to proceed with running this code?
        </p>
      `;

      modal.classList.add('active');

      const onProceed = () => {
        cleanup();
        modal.classList.remove('active');
        resolve(true);
      };

      const onCancel = () => {
        cleanup();
        modal.classList.remove('active');
        resolve(false);
      };

      const cleanup = () => {
        proceedBtn.removeEventListener('click', onProceed);
        cancelBtn.removeEventListener('click', onCancel);
      };

      proceedBtn.addEventListener('click', onProceed);
      cancelBtn.addEventListener('click', onCancel);
    });
  }

  // ----------------------------------------------------
  // TEMPLATES & CHEAT SHEETS MODAL
  // ----------------------------------------------------
  async showTemplatesModal() {
    const body = document.getElementById('templates-modal-body');
    body.innerHTML = 'Loading starter templates...';
    this.templatesModal.classList.add('active');

    try {
      const res = await fetch('/api/templates');
      const data = await res.json();

      let html = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 14px;">
      `;

      data.templates.forEach(t => {
        html += `
          <div class="dash-card" style="padding: 16px;" onclick="app.loadTemplate('${t.id}')">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span class="file-icon">${this.getFileIcon(t.filename)}</span>
              <span class="brand-pill">${t.badge}</span>
            </div>
            <strong style="color: var(--text-primary); font-size: 0.95rem; margin-bottom: 4px;">${t.title}</strong>
            <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 12px; line-height: 1.4;">${t.description}</p>
            <button class="btn btn-sm btn-primary" style="margin-top: auto;">Open Template</button>
          </div>
        `;
      });

      html += `</div>`;
      body.innerHTML = html;
      this.cachedTemplates = data.templates;
    } catch (e) {
      body.innerHTML = `<p style="color: var(--danger);">Failed to load templates: ${e.message}</p>`;
    }
  }

  loadTemplate(templateId) {
    if (!this.cachedTemplates) return;
    const template = this.cachedTemplates.find(t => t.id === templateId);
    if (!template) return;

    this.createNewTab({
      filename: template.filename,
      language: template.language,
      content: template.code
    });

    this.closeAllModals();
    this.toggleDashboard(false);
    this.showToast(`Loaded ${template.title}!`, 'success');
  }

  // ----------------------------------------------------
  // RECENT PROJECTS
  // ----------------------------------------------------
  async loadRecentProjects() {
    try {
      const res = await fetch('/api/projects/recent');
      const data = await res.json();
      const listEl = document.getElementById('dash-recent-list');
      if (!listEl) return;

      if (data.recents && data.recents.length > 0) {
        listEl.innerHTML = data.recents.map(p => `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: var(--bg-surface); border-radius: 8px; margin-bottom: 8px; border: 1px solid var(--border-color);">
            <div>
              <strong style="color: var(--text-primary); font-size: 0.9rem;">${p.name}</strong>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${p.path}</div>
            </div>
            <button class="btn btn-sm btn-outline" onclick="app.openRecentProject('${p.path}')">Open</button>
          </div>
        `).join('');
      } else {
        listEl.innerHTML = '<p style="font-size: 0.82rem; color: var(--text-muted);">No recent projects yet. Create a new file or explore starter templates!</p>';
      }
    } catch (e) {
      // ignore
    }
  }

  async openRecentProject(projectPath) {
    try {
      const res = await fetch('/api/files/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dirPath: projectPath })
      });
      const data = await res.json();
      if (data.success) {
        this.currentProjectDir = data.dirPath;
        this.breadcrumbProject.innerText = projectPath.split(/[/\\]/).pop();
        this.renderFileTree(data.files);
        this.toggleDashboard(false);
        this.showToast(`Opened project ${this.breadcrumbProject.innerText}`, 'success');
      }
    } catch (e) {
      this.showToast(`Failed to open project: ${e.message}`, 'danger');
    }
  }

  renderFileTree(files) {
    this.fileTree.innerHTML = '';
    files.forEach(f => {
      const item = document.createElement('div');
      item.className = 'file-item';
      item.innerHTML = `
        <span class="file-icon">${f.isDirectory ? '📁' : this.getFileIcon(f.name)}</span>
        <span>${f.name}</span>
      `;
      if (!f.isDirectory) {
        item.addEventListener('click', async () => {
          const res = await fetch('/api/files/read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filePath: f.path })
          });
          const fileData = await res.json();
          if (fileData.success) {
            this.createNewTab({
              filename: fileData.filename,
              language: this.getLangForExt(fileData.extension),
              content: fileData.content,
              filePath: fileData.path
            });
          }
        });
      }
      this.fileTree.appendChild(item);
    });
  }

  // ----------------------------------------------------
  // UI UTILITIES
  // ----------------------------------------------------
  switchBottomPanel(tabName) {
    this.panelTabBtns.forEach(b => {
      if (b.getAttribute('data-tab') === tabName) b.classList.add('active');
      else b.classList.remove('active');
    });

    this.panelPages.forEach(p => {
      if (p.getAttribute('data-page') === tabName) p.classList.add('active');
      else p.classList.remove('active');
    });
  }

  toggleZenMode(forceState = null) {
    const isZen = forceState !== null ? forceState : !document.body.classList.contains('zen-mode');
    if (isZen) {
      document.body.classList.add('zen-mode');
      this.zenBtn.innerText = 'Exit Zen';
      this.zenBtn.classList.add('btn-primary');
      this.showToast('Zen Focus Mode active. Press Esc or click Exit Zen.', 'info');
    } else {
      document.body.classList.remove('zen-mode');
      this.zenBtn.innerText = '🧘 Zen Mode';
      this.zenBtn.classList.remove('btn-primary');
    }
  }

  toggleDashboard(show) {
    if (show) {
      this.dashboardOverlay.style.display = 'flex';
      this.loadRecentProjects();
      this.updateRuntimeStatusDisplay();
    } else {
      this.dashboardOverlay.style.display = 'none';
    }
  }

  showSettingsModal() {
    this.settingsModal.classList.add('active');
  }

  closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
  }

  applyTheme(theme) {
    document.body.setAttribute('data-theme', theme);
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span>${type === 'success' ? '✔' : type === 'danger' ? '✖' : 'ℹ'}</span>
      <span>${message}</span>
    `;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 200);
    }, 3000);
  }

  getFileIcon(filename) {
    const ext = (filename.split('.').pop() || '').toLowerCase();
    switch (ext) {
      case 'c': return '⚡';
      case 'cpp': return '⚡';
      case 'py': return '🐍';
      case 'js': return '🟨';
      case 'html': return '🌐';
      case 'css': return '🎨';
      case 'java': return '☕';
      case 'json': return '📋';
      case 'md': return '📝';
      default: return '📄';
    }
  }

  getExtForLang(lang) {
    switch (lang) {
      case 'c': return 'c';
      case 'cpp': return 'cpp';
      case 'python': return 'py';
      case 'javascript': return 'js';
      case 'html_css': return 'html';
      case 'java': return 'java';
      case 'json': return 'json';
      case 'markdown': return 'md';
      default: return 'c';
    }
  }

  getLangForExt(ext) {
    const clean = (ext || '').replace(/^\./, '').toLowerCase();
    switch (clean) {
      case 'c': return 'c';
      case 'cpp':
      case 'cc':
      case 'cxx': return 'cpp';
      case 'py': return 'python';
      case 'js': return 'javascript';
      case 'html':
      case 'htm':
      case 'css': return 'html_css';
      case 'java': return 'java';
      case 'json': return 'json';
      case 'md': return 'markdown';
      default: return 'c';
    }
  }

  getDefaultCodeForLang(lang) {
    switch (lang) {
      case 'c':
        return `// ⚡ Welcome to C Programming in NovaCode!
// Press "Run" (or Ctrl+Enter) to execute!

#include <stdio.h>

int main() {
    printf("========================================\\n");
    printf("   Hello, World from C in NovaCode!    \\n");
    printf("========================================\\n");

    int a = 15;
    int b = 25;
    int sum = a + b;

    printf("Calculating: %d + %d = %d\\n", a, b, sum);

    if (sum > 30) {
        printf("Success: The sum is greater than 30!\\n");
    } else {
        printf("The sum is 30 or less.\\n");
    }

    return 0;
}
`;
      case 'cpp':
        return `#include <iostream>

using namespace std;

int main() {
    cout << "Hello from C++ in NovaCode!" << endl;
    int a = 10, b = 20;
    cout << "Sum: " << (a + b) << endl;
    return 0;
}
`;
      case 'python':
        return `# Python Starter File\nprint("Hello from NovaCode!")\n`;
      case 'javascript':
        return `// JavaScript Starter File\nconsole.log("Hello from Node.js in NovaCode!");\n`;
      case 'html_css':
        return `<!DOCTYPE html>\n<html>\n<head>\n  <style>\n    body { font-family: sans-serif; padding: 20px; }\n  </style>\n</head>\n<body>\n  <h1>My Web Page</h1>\n  <p>Live preview in NovaCode!</p>\n</body>\n</html>\n`;
      case 'java':
        return `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello from Java!");\n    }\n}\n`;
      default:
        return '';
    }
  }
}

// Global App Instance
let app;
window.addEventListener('DOMContentLoaded', () => {
  app = new NovaApp();
});
