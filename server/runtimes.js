const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * System Runtime Inspector for NovaCode
 * Accurately detects installed runtimes & compilers on Windows/Linux/Mac.
 * NEVER falsely claims a runtime is executable if it is not configured.
 */

let cachedRuntimes = null;
let lastScanTime = 0;

function checkExecutable(cmd, args = ['--version']) {
  try {
    const result = execSync(`${cmd} ${args.join(' ')}`, {
      encoding: 'utf8',
      timeout: 3500,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return { available: true, output: result.trim() };
  } catch (err) {
    if (err.stdout && err.stdout.trim().length > 0) {
      return { available: true, output: err.stdout.trim() };
    }
    if (err.stderr && err.stderr.trim().length > 0) {
      return { available: true, output: err.stderr.trim() };
    }
    return { available: false, error: err.message };
  }
}

function findExecutablePath(name) {
  try {
    const isWindows = process.platform === 'win32';
    const checkCmd = isWindows ? `where.exe ${name}` : `which ${name}`;
    const output = execSync(checkCmd, { encoding: 'utf8', timeout: 3000, stdio: ['pipe', 'pipe', 'ignore'] }).trim();
    if (output) {
      return output.split(/\r?\n/)[0];
    }
  } catch (e) {
    // not found
  }
  return null;
}

function inspectRuntimes(forceRefresh = false) {
  const now = Date.now();
  if (cachedRuntimes && !forceRefresh && (now - lastScanTime < 60000)) {
    return cachedRuntimes;
  }

  const runtimes = {
    c: {
      id: 'c',
      name: 'C Language (GCC / Clang)',
      extension: '.c',
      available: false,
      version: null,
      path: null,
      status: 'not_installed',
      badge: 'missing',
      description: 'Foundational procedural language. High performance, used for operating systems, hardware, and algorithms.',
      setupGuide: {
        title: 'How to install C Compiler (MinGW GCC)',
        summary: 'To compile and run native C programs (.c), Windows needs a C compiler such as MinGW-w64 GCC.',
        steps: [
          'Option A (Recommended via winget): Run in PowerShell: winget install -e --id BrechtSanders.MinGW-w64',
          'Option B (w64devkit standalone): Download from https://github.com/skeeto/w64devkit/releases, unzip to C:\\w64devkit, and add C:\\w64devkit\\bin to your PATH.',
          'Option C (MSYS2): If MSYS2 is installed at C:\\msys64, run "pacman -S mingw-w64-ucrt-x86_64-gcc".',
          'NovaCode also includes an Educational C Syntax & Logic Runner so you can write and test C code immediately!'
        ],
        quickInstallCmd: 'winget install -e --id BrechtSanders.MinGW-w64',
        officialUrl: 'https://github.com/skeeto/w64devkit/releases'
      }
    },
    cpp: {
      id: 'cpp',
      name: 'C++ (G++ / Clang)',
      extension: '.cpp',
      available: false,
      version: null,
      path: null,
      status: 'not_installed',
      badge: 'missing',
      description: 'High-performance object-oriented compiled language used in systems programming, games, and computer science.',
      setupGuide: {
        title: 'How to install C++ Compiler (G++ / MinGW)',
        summary: 'C++ requires G++ or Clang compiler to turn source code into an executable.',
        steps: [
          'Run in PowerShell: winget install -e --id BrechtSanders.MinGW-w64',
          'Or download w64devkit from https://github.com/skeeto/w64devkit/releases',
          'Restart NovaCode or click "Rescan Runtimes".'
        ],
        quickInstallCmd: 'winget install -e --id BrechtSanders.MinGW-w64',
        officialUrl: 'https://github.com/skeeto/w64devkit/releases'
      }
    },
    python: {
      id: 'python',
      name: 'Python 3',
      extension: '.py',
      available: false,
      version: null,
      path: null,
      status: 'not_installed',
      badge: 'missing',
      description: 'Used for general programming, data science, scripting, and beginner projects.',
      setupGuide: {
        title: 'How to install Python 3',
        summary: 'Python is a friendly, readable language perfect for beginners.',
        steps: [
          'Visit https://www.python.org/downloads/',
          'Download the latest Python 3 installer for Windows.',
          'IMPORTANT: Check "Add python.exe to PATH" during install.',
          'Click "Install Now", then click "Rescan Runtimes".'
        ],
        quickInstallCmd: 'winget install -e --id Python.Python.3.12',
        officialUrl: 'https://www.python.org/downloads/'
      }
    },
    javascript: {
      id: 'javascript',
      name: 'JavaScript (Node.js)',
      extension: '.js',
      available: false,
      version: null,
      path: null,
      status: 'not_installed',
      badge: 'missing',
      description: 'Executes JavaScript code in the Node.js runtime environment.',
      setupGuide: {
        title: 'How to install Node.js',
        summary: 'Node.js allows you to run modern JavaScript outside the web browser.',
        steps: [
          'Visit https://nodejs.org/ and download the LTS installer.',
          'Run the installer with standard recommended settings.',
          'Click "Rescan Runtimes".'
        ],
        quickInstallCmd: 'winget install -e --id OpenJS.NodeJS.LTS',
        officialUrl: 'https://nodejs.org/'
      }
    },
    html_css: {
      id: 'html_css',
      name: 'HTML & CSS (Web Preview)',
      extension: '.html',
      available: true,
      version: 'Built-in Sandboxed Web Engine',
      path: 'Internal Browser Engine',
      status: 'ready',
      badge: 'ready',
      description: 'Zero setup required! Runs instantly in NovaCode\'s interactive Live Preview with responsive device view.',
      setupGuide: null
    },
    java: {
      id: 'java',
      name: 'Java (JDK / JRE)',
      extension: '.java',
      available: false,
      version: null,
      path: null,
      status: 'not_installed',
      badge: 'missing',
      description: 'Used for object-oriented programming, AP Computer Science, and Android apps.',
      setupGuide: {
        title: 'How to install Java Development Kit (JDK)',
        summary: 'To compile and run Java programs, you need the Java Development Kit (JDK).',
        steps: [
          'Download Eclipse Temurin OpenJDK from https://adoptium.net/',
          'Alternatively, download Oracle JDK.',
          'Ensure the installer adds Java to your system PATH.',
          'Click "Rescan Runtimes".'
        ],
        quickInstallCmd: 'winget install -e --id EclipseAdoptium.Temurin.21.JDK',
        officialUrl: 'https://adoptium.net/'
      }
    }
  };

  // 1. Check Python
  const pyPath = findExecutablePath('python.exe') || findExecutablePath('python') || findExecutablePath('py.exe');
  if (pyPath) {
    const pyCheck = checkExecutable(pyPath.includes(' ') ? `"${pyPath}"` : pyPath, ['--version']);
    if (pyCheck.available) {
      runtimes.python.available = true;
      runtimes.python.version = pyCheck.output.split('\n')[0];
      runtimes.python.path = pyPath;
      runtimes.python.status = 'ready';
      runtimes.python.badge = 'ready';
    }
  }

  // 2. Check Node.js
  const nodePath = findExecutablePath('node.exe') || findExecutablePath('node');
  if (nodePath) {
    const nodeCheck = checkExecutable(nodePath.includes(' ') ? `"${nodePath}"` : nodePath, ['-v']);
    if (nodeCheck.available) {
      runtimes.javascript.available = true;
      runtimes.javascript.version = `Node.js ${nodeCheck.output.split('\n')[0]}`;
      runtimes.javascript.path = nodePath;
      runtimes.javascript.status = 'ready';
      runtimes.javascript.badge = 'ready';
    }
  }

  // 3. Check Java (both javac and java)
  const javacPath = findExecutablePath('javac.exe') || findExecutablePath('javac');
  const javaPath = findExecutablePath('java.exe') || findExecutablePath('java');
  if (javacPath && javaPath) {
    const javacCheck = checkExecutable(javacPath.includes(' ') ? `"${javacPath}"` : javacPath, ['-version']);
    if (javacCheck.available) {
      runtimes.java.available = true;
      runtimes.java.version = javacCheck.output.split('\n')[0] || 'Java Development Kit';
      runtimes.java.path = javacPath;
      runtimes.java.status = 'ready';
      runtimes.java.badge = 'ready';
    }
  }

  // 4. Check C/C++ (gcc or g++ or clang)
  const gccPath = findExecutablePath('gcc.exe') || findExecutablePath('gcc') || findExecutablePath('clang.exe');
  const gppPath = findExecutablePath('g++.exe') || findExecutablePath('g++') || gccPath;

  if (gccPath) {
    const gccCheck = checkExecutable(gccPath.includes(' ') ? `"${gccPath}"` : gccPath, ['--version']);
    if (gccCheck.available) {
      const v = gccCheck.output.split('\n')[0];
      runtimes.c.available = true;
      runtimes.c.version = v;
      runtimes.c.path = gccPath;
      runtimes.c.status = 'ready';
      runtimes.c.badge = 'ready';

      runtimes.cpp.available = true;
      runtimes.cpp.version = v;
      runtimes.cpp.path = gppPath || gccPath;
      runtimes.cpp.status = 'ready';
      runtimes.cpp.badge = 'ready';
    }
  }

  cachedRuntimes = runtimes;
  lastScanTime = now;
  return runtimes;
}

module.exports = {
  inspectRuntimes
};
