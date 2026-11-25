/**
 * NovaCode Security & Safety Scanner UI
 * Scans code for dangerous commands, unbounded infinite loops, and sensitive data.
 */

class SecurityGuard {
  constructor(containerEl, options = {}) {
    this.container = containerEl;
    this.onProceedAnyway = options.onProceedAnyway || null;
    this.onReviewCode = options.onReviewCode || null;
  }

  renderReport(analysis) {
    if (!analysis) return;

    const { safe, score, dangerCount, warningCount, warnings } = analysis;

    let scoreClass = 'success';
    if (score < 60) scoreClass = 'danger';
    else if (score < 90) scoreClass = 'warning';

    let warningsHTML = '';
    if (warnings && warnings.length > 0) {
      warningsHTML = warnings.map(w => `
        <div class="warning-item ${w.type}">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <strong style="color: ${w.type === 'danger' ? 'var(--danger)' : 'var(--warning)'}; font-size: 0.88rem;">
              ${w.type === 'danger' ? '🛑' : '⚠️'} ${w.category} (Line ${w.line})
            </strong>
            <span style="font-size: 0.72rem; text-transform: uppercase; background: var(--bg-primary); padding: 2px 6px; border-radius: 4px;">
              ${w.type}
            </span>
          </div>
          <p style="font-size: 0.85rem; color: var(--text-primary); margin-bottom: 6px;">${w.message}</p>
          <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 6px;">${w.explanation}</p>
          <div style="background: var(--bg-primary); padding: 6px 10px; border-radius: 4px; font-size: 0.8rem; font-family: var(--font-mono); color: #818cf8;">
            💡 Suggestion: ${w.suggestion}
          </div>
        </div>
      `).join('');
    } else {
      warningsHTML = `
        <div style="text-align: center; padding: 24px 12px; color: var(--text-muted);">
          <div style="font-size: 2rem; margin-bottom: 6px;">🛡️</div>
          <p style="font-weight: 600; color: var(--text-primary);">Code Safety Check Passed</p>
          <p style="font-size: 0.85rem;">No infinite loops, destructive file operations, or unsafe system commands detected.</p>
        </div>
      `;
    }

    this.container.innerHTML = `
      <div class="security-score-container">
        <div class="score-gauge ${scoreClass}">${score}%</div>
        <div>
          <h4 style="font-size: 1rem; color: var(--text-primary); margin-bottom: 2px;">
            ${safe ? 'Safe to Execute' : 'Safety Review Recommended'}
          </h4>
          <p style="font-size: 0.82rem; color: var(--text-muted);">
            ${dangerCount} critical risk(s) and ${warningCount} advisory warning(s) detected.
          </p>
        </div>
      </div>

      <div style="margin-top: 14px;">
        <h4 style="font-size: 0.95rem; color: var(--text-secondary); margin-bottom: 10px;">Security Scan Findings:</h4>
        ${warningsHTML}
      </div>
    `;
  }
}

if (typeof module !== 'undefined') {
  module.exports = SecurityGuard;
}
