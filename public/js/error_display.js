/**
 * NovaCode Smart Error Diagnostics Display
 * Renders beginner-friendly error cards with plain English explanations,
 * line jumping, and 1-click deterministic auto-fixes.
 */

class SmartErrorDisplay {
  constructor(containerEl, editorInstance) {
    this.container = containerEl;
    this.editor = editorInstance;
  }

  renderError(diagnostic, onApplyFix) {
    if (!diagnostic) {
      this.clear();
      return;
    }

    const {
      language,
      errorType,
      rawMessage,
      line,
      column,
      codeSnippet,
      whatHappened,
      whyItHappened,
      howToFix,
      autoFix,
      setupGuide
    } = diagnostic;

    // Highlight error line in editor gutter
    if (line && this.editor) {
      this.editor.setErrorLine(line);
    }

    let fixButtonHTML = '';
    if (autoFix) {
      fixButtonHTML = `
        <div class="auto-fix-box">
          <div>
            <strong style="color: var(--success); font-size: 0.85rem;">⚡ Quick Fix Available:</strong>
            <div style="font-size: 0.82rem; color: var(--text-primary); margin-top: 2px;">${autoFix.description}</div>
          </div>
          <button class="btn btn-sm btn-success" id="btn-apply-auto-fix">Apply Fix</button>
        </div>
      `;
    }

    let setupGuideHTML = '';
    if (setupGuide) {
      setupGuideHTML = `
        <div class="error-section" style="background: rgba(99, 102, 241, 0.1); padding: 12px; border-radius: 8px; margin-top: 12px;">
          <div class="error-section-title" style="color: #818cf8;">🛠️ ${setupGuide.title}</div>
          <p style="font-size: 0.85rem; margin-bottom: 8px;">${setupGuide.summary}</p>
          <ol style="font-size: 0.82rem; padding-left: 20px; line-height: 1.6;">
            ${setupGuide.steps.map(s => `<li>${s}</li>`).join('')}
          </ol>
          ${setupGuide.quickInstallCmd ? `<div style="margin-top: 8px;"><code style="background: var(--bg-primary); padding: 4px 8px; border-radius: 4px; font-size: 0.8rem;">${setupGuide.quickInstallCmd}</code></div>` : ''}
        </div>
      `;
    }

    this.container.innerHTML = `
      <div class="smart-error-card">
        <div class="error-card-header">
          <div class="error-type-badge">
            <span>🔴</span>
            <span>${errorType || 'Runtime Error'}</span>
          </div>
          ${line ? `<button class="error-jump-btn" id="btn-jump-error">🎯 Jump to Line ${line}${column ? `:${column}` : ''}</button>` : ''}
        </div>

        ${codeSnippet ? `<div class="error-code-preview">Line ${line}: ${codeSnippet}</div>` : ''}

        <div class="error-section">
          <div class="error-section-title">💡 What Happened:</div>
          <div class="error-section-content">${whatHappened}</div>
        </div>

        <div class="error-section">
          <div class="error-section-title">🔍 Why It Happened:</div>
          <div class="error-section-content" style="white-space: pre-line;">${whyItHappened}</div>
        </div>

        <div class="error-section">
          <div class="error-section-title">🛠️ How to Fix:</div>
          <div class="error-section-content" style="white-space: pre-line;">${howToFix}</div>
        </div>

        ${fixButtonHTML}
        ${setupGuideHTML}

        ${rawMessage ? `
          <details style="margin-top: 14px; font-size: 0.75rem; color: var(--text-muted);">
            <summary style="cursor: pointer;">Show raw compiler output</summary>
            <pre style="background: var(--bg-primary); padding: 8px; border-radius: 4px; margin-top: 4px; overflow-x: auto;">${rawMessage}</pre>
          </details>
        ` : ''}
      </div>
    `;

    // Bind Jump button
    const jumpBtn = this.container.querySelector('#btn-jump-error');
    if (jumpBtn && line && this.editor) {
      jumpBtn.addEventListener('click', () => {
        this.editor.jumpToLine(line);
      });
    }

    // Bind Auto-Fix button
    const applyBtn = this.container.querySelector('#btn-apply-auto-fix');
    if (applyBtn && autoFix && line && this.editor) {
      applyBtn.addEventListener('click', () => {
        if (onApplyFix) {
          onApplyFix(line, autoFix.replacement);
        } else {
          // Replace line in editor directly
          const code = this.editor.getValue();
          const lines = code.split('\n');
          if (lines[line - 1] !== undefined) {
            lines[line - 1] = autoFix.replacement;
            this.editor.setValue(lines.join('\n'));
            this.clear();
          }
        }
      });
    }
  }

  clear() {
    this.container.innerHTML = `
      <div style="text-align: center; padding: 32px 16px; color: var(--text-muted);">
        <div style="font-size: 2rem; margin-bottom: 8px;">✨</div>
        <p style="font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">No errors detected!</p>
        <p style="font-size: 0.85rem;">When an error or exception occurs, NovaCode translates it into plain English here.</p>
      </div>
    `;
    if (this.editor) {
      this.editor.clearErrorLine();
    }
  }
}

if (typeof module !== 'undefined') {
  module.exports = SmartErrorDisplay;
}
