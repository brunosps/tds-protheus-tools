const cp = require('child_process');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const rpc = require('vscode-jsonrpc/node');

function fail(message, detail) {
  const payload = { success: false, message };
  if (detail) payload.detail = detail;
  console.error(JSON.stringify(payload, null, 2));
  process.exit(1);
}

function normalizeResource(value) {
  return String(value || '')
    .replace(/\\/g, '/')
    .split('/')
    .pop()
    .trim()
    .toLowerCase();
}

function parseObjectLine(line) {
  const match = /(.*)\s\((.*)\)\s(.)(.)/i.exec(line);
  if (!match) {
    return {
      source: line,
      date: '',
      source_status: '',
      rpo_status: '',
      raw: line,
    };
  }

  return {
    source: match[1].trim(),
    date: match[2].trim(),
    source_status: match[3],
    rpo_status: match[4],
    raw: line,
  };
}

function parseFunctionLine(line) {
  const match = /(#NONE#)?(.*)(#NONE#)?\s\((.*):(\d+)\)\s?(.)(.)/i.exec(line);
  if (!match) {
    return {
      function: line,
      source: '',
      line: 0,
      source_status: '',
      rpo_status: '',
      raw: line,
    };
  }

  return {
    function: match[1] ? `#${match[2].substring(0, match[2].indexOf('#'))}` : match[2].trim(),
    source: match[4].trim(),
    line: Number.parseInt(match[5], 10),
    source_status: match[6],
    rpo_status: match[7],
    raw: line,
  };
}

function filterRows(rows, filter, key) {
  if (!filter) return rows;
  const needle = String(filter).toLowerCase();
  return rows.filter((row) => String(row[key] || row.raw || '').toLowerCase().includes(needle));
}

function getEnv() {
  const keep = [
    'ALLUSERSPROFILE',
    'APPDATA',
    'COLORTERM',
    'ComSpec',
    'CommonProgramFiles',
    'CommonProgramFiles(x86)',
    'CommonProgramW6432',
    'HOMEDRIVE',
    'HOMEPATH',
    'HOME',
    'LANG',
    'LC_ALL',
    'LD_LIBRARY_PATH',
    'LOCALAPPDATA',
    'NUMBER_OF_PROCESSORS',
    'OS',
    'PATH',
    'PATHEXT',
    'PROCESSOR_ARCHITECTURE',
    'PROCESSOR_IDENTIFIER',
    'PROCESSOR_LEVEL',
    'PROCESSOR_REVISION',
    'ProgramData',
    'ProgramFiles',
    'ProgramFiles(x86)',
    'ProgramW6432',
    'PSModulePath',
    'PUBLIC',
    'SystemDrive',
    'SystemRoot',
    'TEMP',
    'TERM',
    'TMP',
    'TMPDIR',
    'USERDOMAIN',
    'USERNAME',
    'USER',
    'USERPROFILE',
    'XDG_RUNTIME_DIR',
    'windir',
  ];
  const env = {};
  for (const key of keep) {
    if (process.env[key]) env[key] = process.env[key];
  }
  return env;
}

function createConnection(advplsPath, tdsExtensionRoot) {
  const args = ['language-server', '--notification-level="none"'];
  const child = cp.spawn(advplsPath, args, {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: getEnv(),
    detached: false,
  });

  const stderr = [];
  child.stderr.on('data', (chunk) => stderr.push(chunk.toString()));

  const connection = rpc.createMessageConnection(
    new rpc.StreamMessageReader(child.stdout),
    new rpc.StreamMessageWriter(child.stdin)
  );

  const logs = [];
  connection.onNotification('window/logMessage', (params) => logs.push(params.message));
  connection.onNotification('window/showMessage', (params) => logs.push(params.message));
  connection.onRequest('workspace/configuration', (params) => (params.items || []).map(() => null));
  connection.onRequest('client/registerCapability', () => null);
  connection.onRequest('window/showMessageRequest', () => null);
  connection.onRequest('workspace/applyEdit', () => ({ applied: false }));
  connection.listen();

  return { child, connection, stderr, logs, tdsExtensionRoot };
}

async function requestWithTimeout(connection, method, params, timeoutMs) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timeout calling ${method}`)), timeoutMs);
  });
  try {
    return await Promise.race([connection.sendRequest(method, params), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

async function initialize(connection, payload) {
  const workspace = payload.workspace || process.cwd();
  const rootUri = pathToFileURL(workspace).href;
  try {
    await requestWithTimeout(connection, 'initialize', {
    processId: process.pid,
    clientInfo: { name: 'tds-protheus-tools', version: '1.0.0' },
    rootPath: workspace,
    rootUri,
    capabilities: {
      workspace: { configuration: true, workspaceFolders: false },
      textDocument: { synchronization: {}, publishDiagnostics: {} },
      window: { workDoneProgress: false },
    },
    initializationOptions: {
      launchArgs: [],
      settings: [
        { scope: 'advpls', key: 'fsencoding', value: payload.encoding || 'CP1252' },
        { scope: 'advpls', key: 'notificationlevel', value: 'none' },
        { scope: 'server', key: 'usageInfo', value: 'disabled' },
        { scope: 'linter', key: 'behavior', value: 'disabled' },
        { scope: 'linter', key: 'includes', value: (payload.includes || []).join(';') },
        { scope: 'extension', key: 'tdsversion', value: '2.0.16' },
      ],
    },
    trace: 'off',
    workspaceFolders: null,
    }, 15000);
  } catch (error) {
    if (!String(error.message || '').includes('Timeout calling initialize')) {
      throw error;
    }
  }
  connection.sendNotification('initialized', {});
}

async function connectAndAuthenticate(connection, payload) {
  const connected = await requestWithTimeout(connection, '$totvsserver/connect', {
    connectionInfo: {
      connType: 3,
      serverName: payload.name || 'tds-protheus-tools',
      identification: payload.id || 'tds-protheus-tools',
      serverType: 1,
      server: payload.server,
      port: Number(payload.port),
      build: payload.build,
      bSecure: payload.secure ? 1 : 0,
      environment: payload.environment,
      autoReconnect: true,
    },
  }, 60000);

  if (!connected || !connected.connectionToken) {
    throw new Error(`Connection failed: ${JSON.stringify(connected)}`);
  }

  const authenticated = await requestWithTimeout(connection, '$totvsserver/authentication', {
    authenticationInfo: {
      connectionToken: connected.connectionToken,
      environment: payload.environment,
      user: payload.user,
      password: payload.password,
      encoding: payload.encoding || 'CP1252',
    },
  }, 60000);

  if (!authenticated || !authenticated.connectionToken) {
    throw new Error(`Authentication failed: ${JSON.stringify(authenticated)}`);
  }

  return authenticated.connectionToken;
}

async function safeDisconnect(connection, payload, token) {
  if (!token) return;
  try {
    await requestWithTimeout(connection, '$totvsserver/disconnect', {
      disconnectInfo: {
        connectionToken: token,
        serverName: payload.name || 'tds-protheus-tools',
      },
    }, 10000);
  } catch (_) {
  }
}

async function main() {
  const payloadPath = process.argv[2];
  if (!payloadPath) fail('Usage: node tds_lsp_client.js <payload.json>');

  const payload = JSON.parse(fs.readFileSync(payloadPath, 'utf8').replace(/^\uFEFF/, ''));
  if (!payload.advplsPath || !fs.existsSync(payload.advplsPath)) {
    fail(`advpls not found: ${payload.advplsPath || ''}`);
  }

  const { child, connection, stderr, logs } = createConnection(payload.advplsPath, payload.tdsExtensionRoot);
  let token = '';

  try {
    await initialize(connection, payload);
    token = await connectAndAuthenticate(connection, payload);

    let result;
    if (payload.action === 'rpo-info') {
      result = await requestWithTimeout(connection, '$totvsserver/rpoInfo', {
        rpoInfo: { connectionToken: token, environment: payload.environment },
      }, 60000);
    } else if (payload.action === 'rpo-objects' || payload.action === 'rpo-check') {
      const response = await requestWithTimeout(connection, '$totvsserver/inspectorObjects', {
        inspectorObjectsInfo: {
          connectionToken: token,
          environment: payload.environment,
          includeTres: payload.includeOutScope !== false,
        },
      }, 120000);
      const rows = filterRows((response.objects || []).map(parseObjectLine), payload.filter, 'source');

      if (payload.action === 'rpo-check') {
        const index = new Map();
        for (const row of rows) {
          const key = normalizeResource(row.source);
          if (!index.has(key)) index.set(key, []);
          index.get(key).push(row);
        }
        result = {
          environment: payload.environment,
          totalObjects: rows.length,
          checks: (payload.fileResources || []).map((resource) => {
            const key = normalizeResource(resource);
            const matches = index.get(key) || [];
            return {
              resource,
              status: matches.length > 0 ? 'FOUND' : 'MISSING',
              matches,
            };
          }),
        };
      } else {
        result = { environment: payload.environment, totalObjects: rows.length, objects: rows };
      }
    } else if (payload.action === 'rpo-functions') {
      const response = await requestWithTimeout(connection, '$totvsserver/inspectorFunctions', {
        inspectorFunctionsInfo: {
          connectionToken: token,
          environment: payload.environment,
        },
      }, 120000);
      const rows = filterRows((response.functions || []).map(parseFunctionLine), payload.filter, 'function');
      result = { environment: payload.environment, totalFunctions: rows.length, functions: rows };
    } else {
      throw new Error(`Unsupported LSP action: ${payload.action}`);
    }

    await safeDisconnect(connection, payload, token);
    try { await requestWithTimeout(connection, 'shutdown', {}, 10000); } catch (_) {}
    try { connection.sendNotification('exit'); } catch (_) {}
    try { child.kill(); } catch (_) {}

    console.log(JSON.stringify({ success: true, result }, null, 2));
  } catch (error) {
    await safeDisconnect(connection, payload, token);
    try { child.kill(); } catch (_) {}
    fail(error.message, {
      stderr: stderr.join('').trim(),
      logs,
      hint: 'If this fails during initialize, run the same operation from VS Code TDS or use patch-gen as fallback; some TDS LS builds do not initialize correctly outside the VS Code extension host.',
    });
  }
}

main();
