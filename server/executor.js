const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { inspectRuntimes } = require('./runtimes');
const { translateError } = require('./error_translator');
const { scanCodeSecurity } = require('./security');
const { validateAndSimulateC } = require('./c_runner');

// Temp directory for running code safely
const TEMP_RUN_DIR = path.join(__dirname, '..', '.novacode_temp_run');
if (!fs.existsSync(TEMP_RUN_DIR)) {
  fs.mkdirSync(TEMP_RUN_DIR, { recursive: true });
}

// Active process registry: executionId -> { process, startTime, language, code, ... }
const activeProcesses = new Map();

function generateExecId() {
  return 'exec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
}

/**
 * Execute user code safely
 */
function runCode({ code, language, filename, input = '' }, onStdout, onStderr, onExit) {
  const runtimes = inspectRuntimes();
  const execId = generateExecId();
  const startTime = Date.now();

  // Normalize language
  let lang = (language || 'python').toLowerCase();
  if (filename) {
    const ext = path.extname(filename).toLowerCase();
    if (ext === '.c') lang = 'c';
    else if (ext === '.cpp' || ext === '.cc' || ext === '.cxx') lang = 'cpp';
    else if (ext === '.py') lang = 'python';
    else if (ext === '.js') lang = 'javascript';
    else if (ext === '.java') lang = 'java';
    else if (ext === '.html' || ext === '.htm') lang = 'html_css';
  }

  // 1. RUNTIME CONFIGURATION CHECK:
  if (lang === 'html_css' || lang === 'html') {
    return {
      execId,
      status: 'web_preview',
      language: 'html_css',
      message: 'HTML/CSS/JS is rendered live in the NovaCode Interactive Web Preview panel.'
    };
  }

  const runtimeInfo = runtimes[lang];

  // EDUCATIONAL C SUPPORT WHEN GCC NOT YET INSTALLED
  if (lang === 'c' && (!runtimeInfo || !runtimeInfo.available)) {
    const sim = validateAndSimulateC(code);
    if (!sim.success) {
      onStderr(`[C Syntax Check Failed] Line ${sim.diagnostic.line || 1}\n${sim.diagnostic.whatHappened}\n${sim.diagnostic.howToFix}\n`);
      onExit({
        exitCode: 1,
        durationMs: 15,
        diagnostic: sim.diagnostic
      });
      return { execId, status: 'syntax_error' };
    } else {
      onStdout(sim.output);
      onStdout('\n----------------------------------------\n[Notice] Output simulated by NovaCode Educational C Engine.\nTo build native Windows .exe binaries, install MinGW GCC with: winget install BrechtSanders.MinGW-w64\n');
      onExit({
        exitCode: 0,
        durationMs: 25,
        stdout: sim.output
      });
      return { execId, status: 'simulated' };
    }
  }

  if (!runtimeInfo || !runtimeInfo.available) {
    const guide = runtimeInfo ? runtimeInfo.setupGuide : null;
    const errorMsg = `[NovaCode Runtime Missing] The ${runtimeInfo ? runtimeInfo.name : lang} compiler/runtime is not installed or configured on your system.\n\n` +
      `NovaCode never fakes execution. To run this code, please set up the runtime:\n` +
      (guide ? guide.steps.map((s, idx) => `  ${idx + 1}. ${s}`).join('\n') + `\n\nQuick command: ${guide.quickInstallCmd || 'N/A'}\nOfficial URL: ${guide.officialUrl || 'N/A'}` : 'Please install the runtime and click Rescan Runtimes.');

    onStderr(errorMsg);
    onExit({
      exitCode: 1,
      durationMs: 0,
      missingRuntime: true,
      runtimeInfo: runtimeInfo || { name: lang },
      diagnostic: {
        language: lang,
        errorType: 'Missing Runtime or Compiler',
        whatHappened: `${runtimeInfo ? runtimeInfo.name : lang} is not installed on this machine.`,
        whyItHappened: `Code in ${lang} requires an engine or compiler to convert your instructions into computer actions.`,
        howToFix: `Follow the step-by-step setup guide below or click "Setup ${runtimeInfo ? runtimeInfo.name : lang}" to get started.`,
        setupGuide: guide
      }
    });

    return { execId, status: 'missing_runtime' };
  }

  // 2. Prepare file in temp directory
  let runFile;
  let child;
  let isCleanedUp = false;

  const cleanup = () => {
    if (isCleanedUp) return;
    isCleanedUp = true;
    activeProcesses.delete(execId);
    try {
      if (runFile && fs.existsSync(runFile)) {
        fs.unlinkSync(runFile);
      }
      if (lang === 'java') {
        const classFile = runFile.replace(/\.java$/, '.class');
        if (fs.existsSync(classFile)) fs.unlinkSync(classFile);
      } else if (lang === 'cpp' || lang === 'c') {
        const exeFile = runFile.replace(/\.(cpp|c|cc)$/, '.exe');
        if (fs.existsSync(exeFile)) fs.unlinkSync(exeFile);
      }
    } catch (e) {
      // ignore
    }
  };

  let collectedStdout = '';
  let collectedStderr = '';

  // 3. Execution per language
  try {
    if (lang === 'python') {
      runFile = path.join(TEMP_RUN_DIR, `script_${execId}.py`);
      fs.writeFileSync(runFile, code, 'utf8');

      const pyExe = runtimeInfo.path;
      child = spawn(pyExe, ['-u', runFile], {
        cwd: TEMP_RUN_DIR,
        env: { ...process.env, PYTHONUNBUFFERED: '1', PYTHONIOENCODING: 'utf-8' },
        stdio: ['pipe', 'pipe', 'pipe']
      });

    } else if (lang === 'javascript') {
      runFile = path.join(TEMP_RUN_DIR, `script_${execId}.js`);
      fs.writeFileSync(runFile, code, 'utf8');

      const nodeExe = runtimeInfo.path;
      child = spawn(nodeExe, [runFile], {
        cwd: TEMP_RUN_DIR,
        env: { ...process.env },
        stdio: ['pipe', 'pipe', 'pipe']
      });

    } else if (lang === 'java') {
      const classMatch = code.match(/public\s+class\s+([a-zA-Z0-9_]+)/);
      const className = classMatch ? classMatch[1] : 'Main';
      runFile = path.join(TEMP_RUN_DIR, `${className}.java`);
      fs.writeFileSync(runFile, code, 'utf8');

      const javacExe = runtimeInfo.path;
      const javaDir = path.dirname(javacExe);
      const javaExe = path.join(javaDir, 'java.exe');
      const actualJava = fs.existsSync(javaExe) ? javaExe : 'java';

      try {
        const compileOut = execSync(`"${javacExe}" "${runFile}"`, {
          cwd: TEMP_RUN_DIR,
          encoding: 'utf8',
          timeout: 10000,
          stdio: ['pipe', 'pipe', 'pipe']
        });
        if (compileOut) onStdout(compileOut);
      } catch (compileErr) {
        const compileStderr = (compileErr.stderr || '') + (compileErr.stdout || '') || compileErr.message;
        onStderr(compileStderr);
        const diagnostic = translateError(compileStderr, '', 'java', code);
        cleanup();
        onExit({
          exitCode: 1,
          durationMs: Date.now() - startTime,
          diagnostic
        });
        return { execId, status: 'compile_error' };
      }

      child = spawn(actualJava, ['-cp', TEMP_RUN_DIR, className], {
        cwd: TEMP_RUN_DIR,
        stdio: ['pipe', 'pipe', 'pipe']
      });

    } else if (lang === 'c' || lang === 'cpp') {
      const isC = lang === 'c' || (filename && filename.endsWith('.c'));
      const fileExt = isC ? '.c' : '.cpp';
      runFile = path.join(TEMP_RUN_DIR, `code_${execId}${fileExt}`);
      const exeFile = path.join(TEMP_RUN_DIR, `code_${execId}.exe`);
      fs.writeFileSync(runFile, code, 'utf8');

      const compilerExe = runtimeInfo.path;
      try {
        const compileCmd = `"${compilerExe}" "${runFile}" -o "${exeFile}"`;
        const compileOut = execSync(compileCmd, {
          cwd: TEMP_RUN_DIR,
          encoding: 'utf8',
          timeout: 12000,
          stdio: ['pipe', 'pipe', 'pipe']
        });
        if (compileOut) onStdout(compileOut);
      } catch (compileErr) {
        const compileStderr = (compileErr.stderr || '') + (compileErr.stdout || '') || compileErr.message;
        onStderr(compileStderr);
        const diagnostic = translateError(compileStderr, '', isC ? 'c' : 'cpp', code);
        cleanup();
        onExit({
          exitCode: 1,
          durationMs: Date.now() - startTime,
          diagnostic
        });
        return { execId, status: 'compile_error' };
      }

      child = spawn(exeFile, [], {
        cwd: TEMP_RUN_DIR,
        stdio: ['pipe', 'pipe', 'pipe']
      });
    }

    if (!child) {
      throw new Error(`Unsupported execution language: ${lang}`);
    }

    activeProcesses.set(execId, {
      process: child,
      startTime,
      language: lang,
      code,
      runFile
    });

    if (input && child.stdin && child.stdin.writable) {
      child.stdin.write(input + '\n');
    }

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      collectedStdout += text;
      onStdout(text);
    });

    child.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      collectedStderr += text;
      onStderr(text);
    });

    const timeoutTimer = setTimeout(() => {
      if (activeProcesses.has(execId)) {
        onStderr('\n[NovaCode Safety Timeout] Execution was stopped after 30 seconds to protect your computer.\nCheck for infinite loops (like `while (1)`) or waiting input.\n');
        stopProcess(execId);
      }
    }, 30000);

    child.on('close', (code, signal) => {
      clearTimeout(timeoutTimer);
      const durationMs = Date.now() - startTime;
      const isError = (code !== 0 && code !== null) || signal !== null;

      let diagnostic = null;
      if (isError && (collectedStderr || collectedStdout)) {
        diagnostic = translateError(collectedStderr, collectedStdout, lang, code);
      }

      cleanup();

      onExit({
        exitCode: code !== null ? code : (signal ? 1 : 0),
        signal,
        durationMs,
        diagnostic,
        stdout: collectedStdout,
        stderr: collectedStderr
      });
    });

    child.on('error', (err) => {
      clearTimeout(timeoutTimer);
      onStderr(`\n[Process Launch Error] ${err.message}\n`);
      cleanup();
      onExit({
        exitCode: 1,
        durationMs: Date.now() - startTime,
        error: err.message
      });
    });

    return { execId, status: 'running' };

  } catch (err) {
    cleanup();
    onStderr(`[Execution Error] ${err.message}`);
    onExit({
      exitCode: 1,
      durationMs: Date.now() - startTime,
      error: err.message
    });
    return { execId, status: 'error', error: err.message };
  }
}

function sendInputToProcess(execId, text) {
  const active = activeProcesses.get(execId);
  if (!active || !active.process || !active.process.stdin || !active.process.stdin.writable) {
    return { success: false, message: 'Process is not running or not accepting input.' };
  }

  try {
    active.process.stdin.write(text + '\n');
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function stopProcess(execId) {
  const active = activeProcesses.get(execId);
  if (!active || !active.process) {
    return { success: false, message: 'Process not found or already stopped.' };
  }

  try {
    const pid = active.process.pid;
    if (process.platform === 'win32') {
      try {
        execSync(`taskkill /F /T /PID ${pid}`, { stdio: 'ignore' });
      } catch (e) {
        active.process.kill('SIGKILL');
      }
    } else {
      active.process.kill('SIGTERM');
    }
    activeProcesses.delete(execId);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function getActiveProcessCount() {
  return activeProcesses.size;
}

module.exports = {
  runCode,
  sendInputToProcess,
  stopProcess,
  getActiveProcessCount
};
