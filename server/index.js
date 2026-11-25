const express = require('express');
const http = require('http');
const path = require('path');
const os = require('os');
const { inspectRuntimes } = require('./runtimes');
const { runCode, sendInputToProcess, stopProcess, getActiveProcessCount } = require('./executor');
const { scanCodeSecurity } = require('./security');
const { translateError } = require('./error_translator');
const {
  getRecentProjects,
  addRecentProject,
  removeRecentProject,
  listDirectoryFiles,
  readFileContent,
  saveFileContent,
  saveRecoverySnapshot,
  getRecoverySnapshots
} = require('./project_manager');
const {
  explainCode,
  explainKeyword,
  getDebuggingWalkthrough,
  getStarterTemplates,
  getCheatSheets,
  KEYWORD_GLOSSARY
} = require('./assistant_engine');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3840;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve frontend assets
app.use(express.static(path.join(__dirname, '..', 'public')));

// ----------------------------------------------------
// SYSTEM & HEALTH API
// ----------------------------------------------------
app.get('/api/health', (req, res) => {
  const memoryUsage = process.memoryUsage();
  res.json({
    status: 'online',
    appName: 'NovaCode - Beginner-Friendly Smart Code Editor',
    version: '1.0.0',
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    uptimeSeconds: Math.floor(process.uptime()),
    ramUsageMB: Math.round(memoryUsage.rss / (1024 * 1024)),
    activeRunningProcesses: getActiveProcessCount()
  });
});

// ----------------------------------------------------
// RUNTIMES API
// ----------------------------------------------------
app.get('/api/runtimes', (req, res) => {
  const runtimes = inspectRuntimes(false);
  res.json({ success: true, runtimes });
});

app.post('/api/runtimes/rescan', (req, res) => {
  const runtimes = inspectRuntimes(true);
  res.json({ success: true, runtimes });
});

// ----------------------------------------------------
// CODE EXECUTION API
// ----------------------------------------------------
app.post('/api/execute/run', (req, res) => {
  const { code, language, filename, input } = req.body;

  if (!code && typeof code !== 'string') {
    return res.status(400).json({ error: 'Code is required' });
  }

  // Set up streaming response via chunked transfer
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Transfer-Encoding', 'chunked');

  let exec = null;
  let executionResult = null;
  let fullStdout = '';
  let fullStderr = '';

  exec = runCode(
    { code, language, filename, input },
    (stdoutChunk) => {
      fullStdout += stdoutChunk;
    },
    (stderrChunk) => {
      fullStderr += stderrChunk;
    },
    (exitInfo) => {
      const responsePayload = {
        execId: exitInfo.execId || (exec ? exec.execId : null),
        stdout: fullStdout,
        stderr: fullStderr,
        exitCode: exitInfo.exitCode,
        durationMs: exitInfo.durationMs,
        diagnostic: exitInfo.diagnostic || null,
        missingRuntime: exitInfo.missingRuntime || false,
        runtimeInfo: exitInfo.runtimeInfo || null
      };

      try {
        res.end(JSON.stringify(responsePayload));
      } catch (e) {
        // stream already ended
      }
    }
  );

  // If missing runtime or web preview, it returned immediately
  if (exec && exec.status === 'web_preview') {
    return res.json({
      execId: exec.execId,
      status: 'web_preview',
      stdout: exec.message,
      stderr: '',
      exitCode: 0,
      durationMs: 0
    });
  }
});

// Interactive STDIN
app.post('/api/execute/input', (req, res) => {
  const { execId, input } = req.body;
  if (!execId) {
    return res.status(400).json({ error: 'execId is required' });
  }
  const result = sendInputToProcess(execId, input || '');
  res.json(result);
});

// Stop Execution
app.post('/api/execute/stop', (req, res) => {
  const { execId } = req.body;
  if (!execId) {
    return res.status(400).json({ error: 'execId is required' });
  }
  const result = stopProcess(execId);
  res.json(result);
});

// ----------------------------------------------------
// SECURITY SCANNER API
// ----------------------------------------------------
app.post('/api/security/scan', (req, res) => {
  const { code, language } = req.body;
  const analysis = scanCodeSecurity(code, language);
  res.json(analysis);
});

// ----------------------------------------------------
// BEGINNER ASSISTANT API
// ----------------------------------------------------
app.post('/api/assistant/explain', (req, res) => {
  const { code, language } = req.body;
  const explanation = explainCode(code, language);
  res.json(explanation);
});

app.get('/api/assistant/keyword/:keyword', (req, res) => {
  const kw = req.params.keyword;
  const info = explainKeyword(kw);
  if (info) {
    res.json({ found: true, keyword: info });
  } else {
    res.json({ found: false, message: `Keyword "${kw}" not in glossary.` });
  }
});

app.get('/api/assistant/keywords', (req, res) => {
  res.json({ keywords: Object.keys(KEYWORD_GLOSSARY) });
});

app.post('/api/assistant/debug-walkthrough', (req, res) => {
  const { code, language, errorMsg } = req.body;
  const guide = getDebuggingWalkthrough(code, language, errorMsg);
  res.json(guide);
});

app.get('/api/templates', (req, res) => {
  res.json({ templates: getStarterTemplates() });
});

app.get('/api/cheatsheets', (req, res) => {
  res.json({ cheatSheets: getCheatSheets() });
});

// ----------------------------------------------------
// PROJECTS & FILES API
// ----------------------------------------------------
app.get('/api/projects/recent', (req, res) => {
  res.json({ recents: getRecentProjects() });
});

app.post('/api/projects/add', (req, res) => {
  const { projectPath, projectName, language } = req.body;
  const recents = addRecentProject(projectPath, projectName, language);
  res.json({ success: true, recents });
});

app.post('/api/projects/remove', (req, res) => {
  const { projectPath } = req.body;
  const recents = removeRecentProject(projectPath);
  res.json({ success: true, recents });
});

app.post('/api/files/list', (req, res) => {
  const { dirPath } = req.body;
  const targetDir = dirPath || path.join(__dirname, '..', 'sample_projects');
  try {
    const files = listDirectoryFiles(targetDir);
    res.json({ success: true, dirPath: targetDir, files });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/files/read', (req, res) => {
  const { filePath } = req.body;
  try {
    const fileData = readFileContent(filePath);
    res.json({ success: true, ...fileData });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/files/save', (req, res) => {
  const { filePath, content } = req.body;
  try {
    const result = saveFileContent(filePath, content);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/files/autosave', (req, res) => {
  const { filename, content } = req.body;
  const result = saveRecoverySnapshot(filename, content);
  res.json(result);
});

app.get('/api/files/recovery', (req, res) => {
  const snapshots = getRecoverySnapshots();
  res.json({ snapshots });
});

// Start Server
server.listen(PORT, '127.0.0.1', () => {
  console.log(`[NovaCode] Server running at http://127.0.0.1:${PORT}`);
});
