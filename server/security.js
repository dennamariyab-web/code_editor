/**
 * Security & Safe Coding Scanner for NovaCode
 * Protects beginners and educational environments by detecting dangerous operations,
 * accidental infinite loops, and risky patterns BEFORE code is executed.
 */

function scanCodeSecurity(code, language) {
  if (!code || typeof code !== 'string') {
    return { safe: true, score: 100, warnings: [] };
  }

  const lines = code.split('\n');
  const warnings = [];

  // Check each line and the whole document
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const trimmed = line.trim();

    // Skip commented lines
    if (trimmed.startsWith('#') || trimmed.startsWith('//') || trimmed.startsWith('/*')) {
      return;
    }

    // 1. DANGEROUS FILE DELETION & FORMATTING
    if (/(os\.remove|os\.unlink|os\.rmdir|shutil\.rmtree|fs\.unlink|fs\.rmdir|fs\.rmSync|File\.delete|std::remove|remove\s*\()/i.test(trimmed)) {
      warnings.push({
        type: 'danger',
        category: 'File System Operation',
        line: lineNum,
        message: 'Potentially destructive file deletion detected.',
        explanation: 'Your code is attempting to permanently delete files or folders from the disk. In a beginner project, this can accidentally delete important files or project work.',
        suggestion: 'If you want to practice file handling, write to a temporary file instead of deleting existing files, or wrap it in a careful check.',
        codeSnippet: trimmed
      });
    }

    // 2. DANGEROUS SHELL/COMMAND EXECUTION
    if (/(os\.system\s*\(|subprocess\.Popen|subprocess\.call|subprocess\.run|child_process\.exec|Runtime\.getRuntime\(\)\.exec|system\s*\()/i.test(trimmed)) {
      if (/(rm\s+-rf|del\s+\/[fF]|format\s+[a-zA-Z]:|mkfs|drop\s+database|shutdown)/i.test(trimmed)) {
        warnings.push({
          type: 'danger',
          category: 'High-Risk System Command',
          line: lineNum,
          message: 'Destructive system command execution detected.',
          explanation: 'This command attempts to execute low-level operating system shell commands that could delete system files or shut down the machine.',
          suggestion: 'Remove dangerous OS shell commands. Use high-level language standard libraries instead.',
          codeSnippet: trimmed
        });
      } else {
        warnings.push({
          type: 'warning',
          category: 'Shell Execution Warning',
          line: lineNum,
          message: 'Spawning an operating system shell command.',
          explanation: 'Running external shell commands directly bypasses programming safety boundaries and may behave unpredictably on different operating systems.',
          suggestion: 'Whenever possible, use language-native functions instead of spawning command-line processes.',
          codeSnippet: trimmed
        });
      }
    }

    // 3. UNSAFE DYNAMIC EVALUATION
    if (/(\beval\s*\(|\bexec\s*\(|new\s+Function\s*\()/i.test(trimmed)) {
      // In python, eval/exec; in JS, eval/Function
      warnings.push({
        type: 'warning',
        category: 'Dynamic Code Execution',
        line: lineNum,
        message: 'Unsafe dynamic evaluation function detected (`eval` / `exec`).',
        explanation: '`eval()` executes strings as raw code. If user input reaches `eval()`, malicious commands can be executed (Code Injection vulnerability).',
        suggestion: 'Avoid `eval()`. Use proper data parsing like `json.loads()` or `JSON.parse()`, or use functions/dictionaries for dynamic lookups.',
        codeSnippet: trimmed
      });
    }

    // 4. HARDCODED SENSITIVE SECRETS
    const secretPattern = /(api[_-]?key|secret[_-]?key|access[_-]?token|auth[_-]?token|aws[_-]?secret|password)\s*=\s*['"][^'"]{8,}['"]/i;
    if (secretPattern.test(trimmed) && !/example|placeholder|todo|change_me|your_password|test/i.test(trimmed)) {
      warnings.push({
        type: 'warning',
        category: 'Hardcoded Secret',
        line: lineNum,
        message: 'Possible sensitive password or API token hardcoded in source code.',
        explanation: 'Stashing private keys or real passwords directly in your code files can expose them if you share or commit code to GitHub or forums.',
        suggestion: 'Use environment variables (`os.environ` or `process.env`) or separate `.env` configuration files that are ignored by version control.',
        codeSnippet: trimmed
      });
    }
  });

  // 5. ACCIDENTAL INFINITE LOOPS WITHOUT SLEEP OR BREAK
  // Look for `while True:` or `while(true)` patterns
  const infiniteLoopMatch = code.match(/while\s*\(?\s*(True|true|1)\s*\)?\s*:/g) || code.match(/while\s*\(\s*(true|1)\s*\)\s*\{/g);
  if (infiniteLoopMatch) {
    const hasBreak = /\bbreak\b/.test(code);
    const hasSleep = /(time\.sleep|setTimeout|Thread\.sleep|sleep\s*\()/i.test(code);
    const hasInput = /(input\s*\(|prompt\s*\(|scanner\.next|cin\s*>>)/i.test(code);

    if (!hasBreak && !hasSleep && !hasInput) {
      warnings.push({
        type: 'warning',
        category: 'Unbounded Infinite Loop',
        line: 1,
        message: 'Infinite loop detected without break, pause, or user input.',
        explanation: 'You have a `while True` or `while (true)` loop without any `break` statement, sleep delay, or input prompt. This will run at 100% CPU and freeze the execution until stopped.',
        suggestion: 'Add an exit condition with `break` (e.g. `if count >= 10: break`) or a pause like `time.sleep(1)`.',
        codeSnippet: 'while True:'
      });
    }
  }

  // 6. FORK BOMB OR RECURSIVE CRASH CHECK
  if (/:\s*\(\s*\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:/i.test(code)) {
    warnings.push({
      type: 'danger',
      category: 'Fork Bomb Pattern',
      line: 1,
      message: 'Self-replicating fork bomb pattern detected.',
      explanation: 'This pattern creates an exponentially multiplying cascade of processes that crashes the operating system.',
      suggestion: 'Remove this pattern immediately.',
      codeSnippet: ':(){ :|:& };:'
    });
  }

  const dangerCount = warnings.filter(w => w.type === 'danger').length;
  const warningCount = warnings.filter(w => w.type === 'warning').length;
  const safe = dangerCount === 0;

  let score = 100;
  score -= (dangerCount * 40);
  score -= (warningCount * 15);
  score = Math.max(10, Math.min(100, score));

  return {
    safe,
    score,
    dangerCount,
    warningCount,
    warnings
  };
}

module.exports = {
  scanCodeSecurity
};
