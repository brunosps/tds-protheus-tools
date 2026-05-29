#!/usr/bin/env node
import childProcess from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ACTIONS = new Set([
  'validate',
  'quality',
  'compile',
  'patch-gen',
  'patch-info',
  'appre',
  'rpo-info',
  'rpo-objects',
  'rpo-functions',
  'rpo-check',
  'decompress-ch',
  'convert-encoding',
]);

const BOOL_KEYS = new Set(['secure', 'includeOutScope', 'recompile', 'keepLog', 'recursive', 'dryRun', 'gateWarnOnly']);
const ARRAY_KEYS = new Set(['includes', 'programs', 'fileResources']);

const KEY_ALIASES = new Map([
  ['action', 'action'],
  ['server', 'server'],
  ['port', 'port'],
  ['build', 'build'],
  ['secure', 'secure'],
  ['environment', 'environment'],
  ['user', 'user'],
  ['username', 'user'],
  ['password', 'password'],
  ['psw', 'password'],
  ['includes', 'includes'],
  ['programs', 'programs'],
  ['program', 'programs'],
  ['fileresources', 'fileResources'],
  ['file-resource', 'fileResources'],
  ['file-resources', 'fileResources'],
  ['patchfile', 'patchFile'],
  ['patch-file', 'patchFile'],
  ['patchname', 'patchName'],
  ['patch-name', 'patchName'],
  ['patchtype', 'patchType'],
  ['patch-type', 'patchType'],
  ['savelocal', 'saveLocal'],
  ['save-local', 'saveLocal'],
  ['output', 'output'],
  ['filter', 'filter'],
  ['includeoutscope', 'includeOutScope'],
  ['include-out-scope', 'includeOutScope'],
  ['recompile', 'recompile'],
  ['advplspath', 'advplsPath'],
  ['advpls-path', 'advplsPath'],
  ['keeplog', 'keepLog'],
  ['keep-log', 'keepLog'],
  ['origin', 'origin'],
  ['source', 'origin'],
  ['input', 'origin'],
  ['dest', 'dest'],
  ['destination', 'dest'],
  ['target', 'dest'],
  ['to', 'to'],
  ['recursive', 'recursive'],
  ['r', 'recursive'],
  ['dry-run', 'dryRun'],
  ['dryrun', 'dryRun'],
  ['extensions', 'extensions'],
  ['ext', 'extensions'],
  ['gate-warn-only', 'gateWarnOnly'],
  ['warn-only', 'gateWarnOnly'],
  ['warnonly', 'gateWarnOnly'],
  ['help', 'help'],
  ['h', 'help'],
]);

function usage() {
  return `Usage:
  node scripts/tds_protheus.mjs --action compile --programs src/A.prw --recompile
  node scripts/tds_protheus.mjs --action quality --programs src/A.prw,src/B.tlpp
  node scripts/tds_protheus.mjs --action compile --programs src/Legacy.prw --gate-warn-only
  node scripts/tds_protheus.mjs --action patch-gen --file-resources A.PRW --patch-name A_YYYYMMDD --save-local ./patches
  node scripts/tds_protheus.mjs --action rpo-check --file-resources A.PRW
  node scripts/tds_protheus.mjs --action decompress-ch --source /path/compressed --dest /path/out
  node scripts/tds_protheus.mjs --action convert-encoding --source ./src --to cp1252 --recursive --dry-run

Options accept --kebab-case, --camelCase, or PowerShell-style -PascalCase names.`;
}

function splitList(value) {
  if (Array.isArray(value)) return value.flatMap(splitList);
  if (value === undefined || value === null || value === true || value === false) return [];
  return String(value)
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseBool(value) {
  if (value === true || value === undefined) return true;
  if (value === false || value === null) return false;
  const text = String(value).trim().toLowerCase();
  return ['1', 'true', 't', 'yes', 'y', '$true'].includes(text);
}

function normalizeKey(token) {
  const stripped = token.replace(/^-+/, '');
  const normalized = stripped
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase();
  return KEY_ALIASES.get(normalized) || KEY_ALIASES.get(normalized.replace(/-/g, '')) || stripped;
}

function addValue(options, key, value) {
  if (ARRAY_KEYS.has(key)) {
    options[key].push(...splitList(value));
  } else if (BOOL_KEYS.has(key)) {
    options[key] = parseBool(value);
  } else {
    options[key] = value === true ? 'true' : String(value);
  }
}

function parseArgs(argv) {
  const options = {
    action: '',
    server: '127.0.0.1',
    port: 30600,
    build: '7.00.240223P',
    secure: false,
    environment: 'DEV',
    user: 'admin',
    password: 'admin',
    includes: defaultIncludes(),
    programs: [],
    fileResources: [],
    patchFile: '',
    patchName: '',
    patchType: 'PTM',
    saveLocal: defaultPatchFolder(),
    output: '',
    filter: '',
    includeOutScope: false,
    recompile: false,
    advplsPath: '',
    keepLog: false,
    origin: '',
    dest: '',
    to: 'cp1252',
    recursive: false,
    dryRun: false,
    extensions: '',
    gateWarnOnly: false,
    help: false,
  };

  const supplied = new Set();
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('-')) {
      if (!options.action) {
        options.action = token;
        supplied.add('action');
        continue;
      }
      throw new Error(`Unexpected positional argument: ${token}`);
    }

    const key = normalizeKey(token);
    if (key === 'help') {
      options.help = true;
      continue;
    }

    let value = true;
    if (!BOOL_KEYS.has(key) && argv[i + 1] !== undefined && !argv[i + 1].startsWith('-')) {
      value = argv[i + 1];
      i += 1;
    } else if (BOOL_KEYS.has(key) && argv[i + 1] !== undefined && !argv[i + 1].startsWith('-')) {
      value = argv[i + 1];
      i += 1;
    }

    if (!Object.prototype.hasOwnProperty.call(options, key)) {
      throw new Error(`Unknown option: ${token}`);
    }
    addValue(options, key, value);
    supplied.add(key);
  }

  options.port = Number.parseInt(String(options.port), 10);
  options.portWasExplicit = supplied.has('port');
  return options;
}

function defaultIncludes() {
  if (process.env.TDS_INCLUDES) {
    return process.env.TDS_INCLUDES.split(path.delimiter).filter(Boolean);
  }
  return process.platform === 'win32' ? ['C:\\TOTVS\\includes'] : ['/opt/totvs/includes'];
}

function defaultPatchFolder() {
  if (process.env.TDS_PATCH_DIR) return process.env.TDS_PATCH_DIR;
  return process.platform === 'win32'
    ? 'C:\\TOTVS\\Patchs'
    : path.join(os.homedir(), 'TOTVS', 'Patchs');
}

function skillRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

function scriptDir() {
  return path.dirname(fileURLToPath(import.meta.url));
}

function isWindows() {
  return process.platform === 'win32';
}

function pathExists(filePath) {
  return Boolean(filePath) && fs.existsSync(filePath);
}

function executableCandidates(baseDir) {
  const platformNames = process.platform === 'win32'
    ? [['windows', 'advpls.exe'], ['windows', 'advpls']]
    : process.platform === 'darwin'
      ? [['mac', 'advpls'], ['darwin', 'advpls'], ['osx', 'advpls']]
      : [['linux', 'advpls'], ['linux', 'advpls.exe']];
  return platformNames.map(([dir, exe]) =>
    path.join(baseDir, 'node_modules', '@totvs', 'tds-ls', 'bin', dir, exe)
  );
}

function findOnPath(names) {
  const pathValue = process.env.PATH || '';
  for (const dir of pathValue.split(path.delimiter)) {
    for (const name of names) {
      const candidate = path.join(dir, name);
      if (pathExists(candidate)) return candidate;
    }
  }
  return '';
}

function vscodeExtensionRoots() {
  const home = os.homedir();
  const roots = [
    process.env.TDS_VSCODE_EXTENSION_ROOT,
    path.join(home, '.vscode', 'extensions'),
    path.join(home, '.vscode-server', 'extensions'),
    path.join(home, '.vscode-remote', 'extensions'),
  ].filter(Boolean);

  if (process.env.USERPROFILE) {
    roots.push(path.join(process.env.USERPROFILE, '.vscode', 'extensions'));
  }
  return [...new Set(roots)];
}

function findTdsExtensionRoot() {
  for (const root of vscodeExtensionRoots()) {
    if (!fs.existsSync(root)) continue;
    const matches = fs.readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && /^totvs\.tds-vscode-/i.test(entry.name))
      .map((entry) => path.join(root, entry.name))
      .sort()
      .reverse();
    if (matches.length > 0) return matches[0];
  }
  return '';
}

function findNpm() {
  return findOnPath(isWindows() ? ['npm.cmd', 'npm.exe', 'npm'] : ['npm']);
}

function installNodeDependencies(root) {
  const npm = findNpm();
  if (!npm) {
    throw new Error('advpls was not found and npm is not available to install @totvs/tds-ls.');
  }

  console.log('advpls not found. Installing @totvs/tds-ls and vscode-jsonrpc inside the skill directory...');
  const result = childProcess.spawnSync(npm, [
    '--prefix',
    root,
    'install',
    '@totvs/tds-ls',
    'vscode-jsonrpc',
    '--no-audit',
    '--no-fund',
  ], { stdio: 'inherit', shell: false });

  if (result.status !== 0) {
    throw new Error('@totvs/tds-ls installation failed.');
  }
}

function findAdvpls(explicitPath) {
  if (pathExists(explicitPath)) return path.resolve(explicitPath);
  if (pathExists(process.env.TDS_ADVPLS_PATH)) return path.resolve(process.env.TDS_ADVPLS_PATH);

  const root = skillRoot();
  for (const candidate of executableCandidates(root)) {
    if (pathExists(candidate)) return path.resolve(candidate);
  }

  const extensionRoot = findTdsExtensionRoot();
  if (extensionRoot) {
    for (const candidate of executableCandidates(extensionRoot)) {
      if (pathExists(candidate)) return path.resolve(candidate);
    }
  }

  const fromPath = findOnPath(isWindows() ? ['advpls.exe', 'advpls'] : ['advpls', 'advpls.exe']);
  if (fromPath) return fromPath;

  installNodeDependencies(root);
  for (const candidate of executableCandidates(root)) {
    if (pathExists(candidate)) return path.resolve(candidate);
  }

  throw new Error('@totvs/tds-ls was installed, but advpls was not found in the expected package path.');
}

function toSlashPath(value) {
  return String(value).replace(/\\/g, '/');
}

function joinValues(values) {
  return values.filter((value) => String(value || '').trim()).join(',');
}

function isUnderPath(basePath, childPath) {
  const base = path.resolve(basePath);
  const child = path.resolve(childPath);
  const relative = path.relative(base, child);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function relativeChildPath(basePath, childPath, index) {
  if (isUnderPath(basePath, childPath)) return path.relative(basePath, childPath);
  return path.join(`external_${String(index).padStart(3, '0')}`, path.basename(childPath));
}

function compileStaging(sourcePrograms) {
  if (sourcePrograms.length === 0) throw new Error('Programs is required for compile.');

  const workspace = process.cwd();
  const stamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
  const stagingRoot = fs.mkdtempSync(path.join(os.tmpdir(), `tds-protheus-compile-${stamp}-`));
  const stagedPrograms = [];
  const originals = [];

  sourcePrograms.forEach((program, index) => {
    if (!fs.existsSync(program) || !fs.statSync(program).isFile()) {
      throw new Error(`Program not found: ${program}`);
    }
    const resolved = path.resolve(program);
    const relative = relativeChildPath(workspace, resolved, index);
    const destination = path.join(stagingRoot, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(resolved, destination);
    stagedPrograms.push(destination);
    originals.push(resolved);
  });

  return { root: stagingRoot, programs: stagedPrograms, originals };
}

function advplCodeLine(line) {
  const trimmed = line.trimStart();
  if (trimmed.startsWith('//') || trimmed.startsWith('*')) return '';
  const commentAt = line.indexOf('//');
  return commentAt >= 0 ? line.slice(0, commentAt) : line;
}

function isAdvplFunctionBoundary(line) {
  return /^\s*((Static|User)\s+Function|Function|Method)\s+[A-Za-z_][A-Za-z0-9_]*\b/i.test(line);
}

function tenantContextError(filePath, lineNumber, variable, operation) {
  return `${filePath}:${lineNumber} - Protheus 12.1.2510 quality gate blocks ${operation} of ${variable}. Read access is allowed, but tenant/user context must be prepared by the supported runtime path: RpcSetEnv() only at the start of a new StartJob/SmartJob thread, REST PrepareIn with tenantId, SOAP specialist URI/PrepareIn, or xFilial()/FWxFilial() for branch filters.`;
}

// Tags a finding with its SonarQube (engpro.totvs) rule id, e.g. "<file>:<line> - [CA2050] ...".
function ruleTag(filePath, lineNumber, id, message) {
  return `${filePath}:${lineNumber} - [${id}] ${message}`;
}

// Maps a Protheus system table to its G4 SonarQube rule id (direct DbSelectArea access prohibited).
const SYS_TABLE_RULE = new Map([
  ['SM0', 'CA2000'], ['SIX', 'CA2001'], ['SX1', 'CA2002'], ['SX2', 'CA2003'],
  ['SX3', 'CA2004'], ['SX7', 'CA2005'], ['SX9', 'CA2006'], ['SXA', 'CA2007'],
  ['SXB', 'CA2008'], ['SX5', 'CA2009'], ['SX6', 'CA2010'], ['SXG', 'CA2011'],
  ['SXD', 'CA2012'],
]);

function assertAdvplCompileRules(sourcePrograms, { warnOnly = false } = {}) {
  const errors = [];
  const warnings = [];

  for (const program of sourcePrograms) {
    const extension = path.extname(program).toLowerCase();
    if (!['.prw', '.tlpp'].includes(extension)) continue;
    if (!fs.existsSync(program) || !fs.statSync(program).isFile()) continue;

    const resolved = path.resolve(program);
    const lines = fs.readFileSync(resolved, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/);
    const boundaries = [];
    const includeLines = new Map();
    let transactionDepth = 0;
    // SonarQube AdvPL/TLPP catalog (sonar-rules.engpro.totvs.com.br): security blocks, legacy/quality warns.
    let loopDepth = 0;
    const fullText = lines.join('\n');
    const isRestSoap = /@\s*(Get|Post|Put|Delete|Patch)\b|\bWSRESTFUL\b|\bWSMETHOD\b|\bWSSERVICE\b|\bWSDLPATH\b/i.test(fullText);
    const fileFlags = { iif: 0, iifLine: 0, incCase: 0, incLine: 0, ini: 0, iniLine: 0 };
    let firstSqlLine = 0;

    for (let i = 0; i < lines.length; i += 1) {
      const codeLine = advplCodeLine(lines[i]);
      if (!codeLine.trim()) continue;

      const conditionLike = /^\s*(If|ElseIf|While|Do\s+While)\b/i.test(codeLine);
      const tenantAssignment = /(?<![A-Za-z0-9_:.>\-])(cEmpAnt|__cUserId|cFilAnt|cNumEmp)\s*(:=|=(?!=))/i.exec(codeLine);
      if (tenantAssignment && !(conditionLike && tenantAssignment[2].startsWith('='))) {
        errors.push(tenantContextError(resolved, i + 1, tenantAssignment[1], 'direct assignment'));
      }

      const tenantByRef = /@\s*(cEmpAnt|__cUserId|cFilAnt|cNumEmp)\b/i.exec(codeLine);
      if (tenantByRef) {
        errors.push(tenantContextError(resolved, i + 1, tenantByRef[1], 'by-reference mutation risk'));
      }

      // --- SonarQube G1 security (BLOCKS, .prw + .tlpp). Use --gate-warn-only to downgrade for legacy compiles. ---
      if (/\bStaticCall\s*\(/i.test(codeLine)) {
        errors.push(ruleTag(resolved, i + 1, 'CA2022', 'Restricted function StaticCall(); replace with FWLoadModel()/FWLoadMenuDef() or a direct namespace call.'));
      }
      if (/\bPTInternal\s*\(/i.test(codeLine)) {
        errors.push(ruleTag(resolved, i + 1, 'CA2023', 'Prohibited function PTInternal(); remove it (no exceptions).'));
      }
      if (/\bCREATE\s+PROCEDURE\b/i.test(codeLine)) {
        errors.push(ruleTag(resolved, i + 1, 'CA2053', 'CREATE PROCEDURE in source is prohibited; manage procedures via SPManager.'));
      }
      const credMatch = /\b([A-Za-z_][A-Za-z0-9_]*(?:senha|pass|pwd|secret|token|apikey)[A-Za-z0-9_]*)\s*:=\s*(["'])([^"']+)\2/i.exec(codeLine);
      if (credMatch && !/^(?:https?:|www\.|\/|\.)/i.test(credMatch[3]) && !/\.(?:com|br|net|org)\b/i.test(credMatch[3])) {
        errors.push(ruleTag(resolved, i + 1, 'CA2052', `Hardcoded credential in ${credMatch[1]}; read it from GetMV() or AppServer config, never a string literal.`));
      }
      // Flags a bare variable concatenated into a SQL value (the "= '" + cVar + "'" pattern).
      // Function calls (xFilial(), RetSqlName(), FWxFilial(), AllTrim(), ...) are excluded via (?!\s*\() — they are safe framework helpers, not injectable input.
      const concatSql = /(?:'"\s*\+\s*[A-Za-z_]\w*\b(?!\s*\())|(?:\+\s*[A-Za-z_]\w*\b(?!\s*\()\s*\+\s*"\s*')/.test(codeLine);
      if (concatSql) {
        errors.push(ruleTag(resolved, i + 1, 'CA2050', 'Possible SQL injection: a value is concatenated into a SQL string; use FWExecStatement() with bind parameters (?).'));
      }
      if (isRestSoap && /\b(RpcSetEnv|RpcSetType)\s*\(/i.test(codeLine)) {
        const fn = /\bRpcSetType\b/i.test(codeLine) ? 'RpcSetType' : 'RpcSetEnv';
        errors.push(ruleTag(resolved, i + 1, 'BG1000', `${fn}() inside a REST/SOAP service is prohibited; configure PrepareIn (REST) or specialist URI/PrepareIn (SOAP) and use the tenantId header.`));
      }

      // --- SonarQube G2/G3/G4 legacy/quality (WARNS, .prw + .tlpp). ---
      if (/^\s*(For|While|Do\s+While)\b/i.test(codeLine)) loopDepth += 1;
      if (/^\s*(Next|EndDo|End\s+Do)\b/i.test(codeLine) && loopDepth > 0) loopDepth -= 1;

      if (/\b(ConOut|OutErr)\s*\(/i.test(codeLine) || /^\s*\?\s/.test(codeLine)) {
        warnings.push(ruleTag(resolved, i + 1, 'CA1004', 'Console output (ConOut/OutErr/?) is prohibited; use FWLogMsg().'));
      }
      if (/\b(MSCREATE|DBCREATE|CRIATRAB)\s*\(/i.test(codeLine)) {
        warnings.push(ruleTag(resolved, i + 1, 'CA1000', 'ISAM driver access (MSCREATE/DBCREATE/CRIATRAB); use FWTemporaryTable in relational mode.'));
      }
      const loopApi = loopDepth > 0 ? /\b(GetMV|SuperGetMV|ExistBlock|AllUsers|Pergunte|Type)\s*\(/i.exec(codeLine) : null;
      if (loopApi) {
        warnings.push(ruleTag(resolved, i + 1, 'CA1003', `${loopApi[1]}() called inside a loop; cache the result before the loop.`));
      }
      const sysTable = /\bDb(?:SelectArea|UseArea)\s*\(\s*["'](S(?:X[0-9A-Z]?|M0|IX))["']/i.exec(codeLine);
      if (sysTable) {
        const tbl = sysTable[1].toUpperCase();
        const id = SYS_TABLE_RULE.get(tbl) || SYS_TABLE_RULE.get(tbl.slice(0, 3)) || 'CA2013';
        warnings.push(ruleTag(resolved, i + 1, id, `Direct access to system table ${tbl} via DbSelectArea/DbUseArea; use the framework API instead.`));
      }
      if (/\bRecLock\s*\(/i.test(codeLine)) {
        const wStart = Math.max(0, i - 2);
        const wEnd = Math.min(lines.length - 1, i + 12);
        if (!/\bMsUnLock\s*\(/i.test(lines.slice(wStart, wEnd + 1).join('\n'))) {
          warnings.push(ruleTag(resolved, i + 1, 'TDS-RECLOCK', 'RecLock() without a nearby MsUnLock(); release the lock to avoid leaving records locked.'));
        }
      }
      if (/\bIIf\s*\(/i.test(codeLine)) { if (!fileFlags.iif) fileFlags.iifLine = i + 1; fileFlags.iif += 1; }
      const incCaseMatch = /^\s*#\s*(include)\s+["<]([^">]+)[">]/i.exec(codeLine);
      if (incCaseMatch && (/[A-Z]/.test(incCaseMatch[1]) || /[A-Z]/.test(incCaseMatch[2]))) {
        if (!fileFlags.incCase) fileFlags.incLine = i + 1;
        fileFlags.incCase += 1;
      }
      if (/["'][^"']*\.ini["']/i.test(codeLine)) { if (!fileFlags.ini) fileFlags.iniLine = i + 1; fileFlags.ini += 1; }
      if (!firstSqlLine && /\bRetSqlName\s*\(/i.test(codeLine)) firstSqlLine = i + 1;

      if (extension !== '.prw') continue;

      const includeMatch = /^\s*#\s*include\s+["<]([^">]+)[">]/i.exec(codeLine);
      if (includeMatch) includeLines.set(includeMatch[1].toUpperCase(), i + 1);

      const privateMatch = /^\s*(Private|Public)\b/i.exec(codeLine);
      if (privateMatch) {
        warnings.push(`${resolved}:${i + 1} - Avoid ${privateMatch[1]}; prefer Local variables, explicit parameters, or documented narrow-scope legacy use.`);
      }

      if (/(?:\:\=|(?<![<>=!:!])=(?![=>]))\s*\{\s*["'][^"']+["']\s*:/i.test(codeLine)) {
        errors.push(`${resolved}:${i + 1} - TLPP JSON literal syntax is not valid for ADVPL .prw sources; use JsonObject():New() and parser methods.`);
      }

      if (/\bBegin\s+Transaction\b/i.test(codeLine)) transactionDepth += 1;

      const uiMatch = /\b(MsgInfo|MsgAlert|MsgStop|Alert|InputBox)\s*\(/i.exec(codeLine);
      if (transactionDepth > 0 && uiMatch) {
        errors.push(`${resolved}:${i + 1} - Do not open user-interface function ${uiMatch[1]}() inside Begin Transaction/End Transaction.`);
      }

      if (/(?<!&)&\s*[A-Za-z_][A-Za-z0-9_]*\.?/.test(codeLine)) {
        warnings.push(`${resolved}:${i + 1} - Macro substitution detected; use only for controlled dynamic calls or protected compatibility checks.`);
      }

      const logicalCount = (codeLine.match(/\.(AND|OR)\./gi) || []).length;
      if (/\{\s*\|/.test(codeLine) && (codeLine.length > 120 || logicalCount > 3)) {
        warnings.push(`${resolved}:${i + 1} - Long or complex codeblock detected; consider extracting the logic to a named function.`);
      }

      if (/\bDbSelectArea\s*\(/i.test(codeLine)) {
        const windowStart = Math.max(0, i - 8);
        const windowEnd = Math.min(lines.length - 1, i + 8);
        const windowText = lines.slice(windowStart, windowEnd + 1).join('\n');
        if (!/\b(GetArea|RestArea|Select)\s*\(/i.test(windowText)) {
          warnings.push(`${resolved}:${i + 1} - DbSelectArea() without nearby GetArea/RestArea or Select() restore pattern; prefer aliased expressions or preserve workarea.`);
        }
      }

      const fileMatch = /\b(fCreate|fOpen)\s*\(\s*["'][A-Z]:\\/i.exec(codeLine);
      if (fileMatch) {
        warnings.push(`${resolved}:${i + 1} - ${fileMatch[1]}() uses an absolute Windows path; prefer a server-side path relative to Protheus RootPath when possible.`);
      }

      if (/^\s*(If|ElseIf|While|Do\s+While)\b/i.test(codeLine) && /["']/.test(codeLine) && /(?<![<>=!:!])=(?![=>])/.test(codeLine)) {
        warnings.push(`${resolved}:${i + 1} - String comparison with single "=" can be partial; prefer "==" when exact comparison is intended.`);
      }

      if (/\b(If|ElseIf|While|Do\s+While|Empty)\b.*[A-Za-z_][A-Za-z0-9_:]*\s*\[\s*["'][^"']+["']\s*\]/i.test(codeLine) && !/\bHasProperty\s*\(/i.test(codeLine)) {
        warnings.push(`${resolved}:${i + 1} - JSON indexed property access in a condition can create missing properties as null; check HasProperty() first for optional properties.`);
      }

      if (/\bEnd\s+Transaction\b/i.test(codeLine) && transactionDepth > 0) transactionDepth -= 1;

      if (!isAdvplFunctionBoundary(codeLine)) continue;

      let name = null;
      let kind = 'Other';
      const staticMatch = /^\s*Static\s+Function\s+([A-Za-z_][A-Za-z0-9_]*)\b/i.exec(codeLine);
      const userMatch = /^\s*User\s+Function\s+([A-Za-z_][A-Za-z0-9_]*)\b/i.exec(codeLine);
      if (staticMatch) {
        name = staticMatch[1];
        kind = 'Static';
        if (name.length > 10) {
          errors.push(`${resolved}:${i + 1} - Static Function "${name}" has ${name.length} characters; maximum is 10.`);
        }
      } else if (userMatch) {
        name = userMatch[1];
        kind = 'User';
        if (/^U_/i.test(name)) {
          errors.push(`${resolved}:${i + 1} - User Function "${name}" must be declared without the U_ prefix in source code.`);
        }
        if (name.length > 8) {
          errors.push(`${resolved}:${i + 1} - User Function "${name}" has ${name.length} characters; maximum is 8 because the compiled symbol receives U_ and must fit in 10.`);
        }
      } else {
        const otherMatch = /^\s*(Function|Method)\s+([A-Za-z_][A-Za-z0-9_]*)\b/i.exec(codeLine);
        if (otherMatch) name = otherMatch[2];
      }

      boundaries.push({ kind, name, line: i });
    }

    boundaries.forEach((boundary, index) => {
      if (!['Static', 'User'].includes(boundary.kind)) return;
      const start = boundary.line + 1;
      const end = index + 1 < boundaries.length ? boundaries[index + 1].line - 1 : lines.length - 1;
      let hasReturn = false;
      for (let lineIndex = start; lineIndex <= end; lineIndex += 1) {
        if (/^\s*Return(\b|\s|\()/i.test(advplCodeLine(lines[lineIndex] || ''))) {
          hasReturn = true;
          break;
        }
      }
      if (!hasReturn) {
        errors.push(`${resolved}:${boundary.line + 1} - ${boundary.kind} Function "${boundary.name}" must contain an explicit Return.`);
      }
    });

    if (includeLines.has('PROTHEUS.CH') && includeLines.has('TOTVS.CH')) {
      warnings.push(`${resolved}:${includeLines.get('TOTVS.CH')} - PROTHEUS.CH and TOTVS.CH are both included; keep only one unless a compatibility reason exists.`);
    }

    // File-level rollups (deduplicated to keep output readable).
    if (fileFlags.iif > 0) {
      warnings.push(ruleTag(resolved, fileFlags.iifLine, 'CA4000', `Inline IIf()/IF() ternary used ${fileFlags.iif}x; prefer If/Else/EndIf blocks.`));
    }
    if (fileFlags.incCase > 0) {
      warnings.push(ruleTag(resolved, fileFlags.incLine, 'CA3001', `#INCLUDE directive/filename not lowercase (${fileFlags.incCase}x); SonarQube expects lowercase (e.g. #include "totvs.ch").`));
    }
    if (fileFlags.ini > 0) {
      warnings.push(ruleTag(resolved, fileFlags.iniLine, 'CA1005', `Reference to a .ini file (${fileFlags.ini}x); evaluate Cloud/SmartERP compatibility.`));
    }
    if (firstSqlLine > 0 && !/D_E_L_E_T_/.test(fullText)) {
      warnings.push(ruleTag(resolved, firstSqlLine, 'TDS-DELET', 'SQL built with RetSqlName() but no D_E_L_E_T_ filter found; exclude logically deleted records.'));
    }
    if (firstSqlLine > 0 && !/\b(FWx|x)Filial\s*\(/i.test(fullText)) {
      warnings.push(ruleTag(resolved, firstSqlLine, 'TDS-FILIAL', 'SQL built with RetSqlName() but no xFilial()/FWxFilial() found; scope the query to the active branch.'));
    }
    if (/\bTCQuery\b/i.test(fullText) && !/\bDbCloseArea\s*\(/i.test(fullText)) {
      warnings.push(ruleTag(resolved, firstSqlLine || 1, 'TDS-TCQUERY', 'TCQuery opened but no DbCloseArea() found; close the temporary alias to free resources.'));
    }
  }

  if (warnings.length > 0) {
    console.log('--- ADVPL RULE VALIDATION WARNINGS ---');
    warnings.forEach((warning) => console.log(`[WARN] ${warning}`));
  }

  if (errors.length > 0) {
    if (warnOnly) {
      console.log('--- ADVPL RULE VALIDATION ERRORS (downgraded by --gate-warn-only) ---');
      errors.forEach((error) => console.log(`[WARN] ${error}`));
      console.log(`[INFO] ${errors.length} blocking rule(s) downgraded to warnings; compile is NOT aborted.`);
      return;
    }
    console.log('--- ADVPL RULE VALIDATION ERRORS ---');
    errors.forEach((error) => console.log(`[ERROR] ${error}`));
    throw new Error(`ADVPL rule validation failed with ${errors.length} error(s).`);
  }
}

function gitTracked(workspace, filePath) {
  if (!isUnderPath(workspace, filePath)) return false;
  const git = findOnPath(isWindows() ? ['git.exe', 'git'] : ['git']);
  if (!git) return false;

  const relative = path.relative(workspace, filePath);
  const result = childProcess.spawnSync(git, ['-C', workspace, 'ls-files', '--error-unmatch', '--', relative], {
    stdio: 'ignore',
  });
  return result.status === 0;
}

function removeCompileArtifacts(originalPrograms) {
  const workspace = process.cwd();
  const artifactExtensions = new Set(['.ppo', '.ppx', '.ppx_prw', '.ppx_tlpp', '.errprw']);
  for (const program of originalPrograms) {
    const dir = path.dirname(program);
    const baseName = path.basename(program, path.extname(program)).toLowerCase();
    if (!fs.existsSync(dir)) continue;

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      const fullPath = path.join(dir, entry.name);
      const entryBase = path.basename(entry.name, path.extname(entry.name)).toLowerCase();
      const entryExt = path.extname(entry.name).toLowerCase();
      if (entryBase === baseName && artifactExtensions.has(entryExt) && !gitTracked(workspace, fullPath)) {
        fs.rmSync(fullPath, { force: true });
      }
    }
  }
}

function connectionOrAuthFailure(logPath) {
  if (!fs.existsSync(logPath)) return false;
  const text = fs.readFileSync(logPath, 'utf8');
  return /(connection\s+.*(failed|refused|denied|error|timeout|timed out|unable)|authentication\s+.*(failed|error)|authenticat(e|ing)\s+.*failed|not authenticated|could not connect|cannot connect|econnrefused)/i.test(text);
}

function requireConnection(options) {
  if (!options.server || !options.port || Number.isNaN(options.port)) {
    throw new Error('Server and Port are required.');
  }
}

function requireAuth(options) {
  requireConnection(options);
  if (!options.environment || !options.user || !options.password) {
    throw new Error('Environment, User, and Password are required for this action.');
  }
}

function cp1252Buffer(text) {
  const special = new Map([
    [0x20AC, 0x80], [0x201A, 0x82], [0x0192, 0x83], [0x201E, 0x84],
    [0x2026, 0x85], [0x2020, 0x86], [0x2021, 0x87], [0x02C6, 0x88],
    [0x2030, 0x89], [0x0160, 0x8A], [0x2039, 0x8B], [0x0152, 0x8C],
    [0x017D, 0x8E], [0x2018, 0x91], [0x2019, 0x92], [0x201C, 0x93],
    [0x201D, 0x94], [0x2022, 0x95], [0x2013, 0x96], [0x2014, 0x97],
    [0x02DC, 0x98], [0x2122, 0x99], [0x0161, 0x9A], [0x203A, 0x9B],
    [0x0153, 0x9C], [0x017E, 0x9E], [0x0178, 0x9F],
  ]);
  const bytes = [];
  for (const char of text) {
    const code = char.codePointAt(0);
    if (code <= 0x7F || (code >= 0xA0 && code <= 0xFF)) bytes.push(code);
    else bytes.push(special.get(code) || 0x3F);
  }
  return Buffer.from(bytes);
}

function writeIni(filePath, lines) {
  fs.writeFileSync(filePath, cp1252Buffer(`${lines.join(os.EOL)}${os.EOL}`));
}

function runTdsCli(options, advpls, portToUse, compilePrograms, compileIncludes) {
  const tmp = path.join(os.tmpdir(), `tds-protheus-${cryptoId()}.ini`);
  const log = path.join(os.tmpdir(), `tds-protheus-${cryptoId()}.log`);

  try {
    const lines = ['showConsoleOutput=true', `logToFile=${toSlashPath(log)}`, ''];

    if (options.action === 'validate') {
      requireConnection(options);
      lines.push('[validate]', 'action=validate', `server=${options.server}`, `port=${portToUse}`);
    } else {
      requireAuth(options);
      lines.push(
        '[authentication]',
        'action=authentication',
        `server=${options.server}`,
        `port=${portToUse}`,
        `secure=${options.secure ? '1' : '0'}`,
        `build=${options.build}`,
        `environment=${options.environment}`,
        `user=${options.user}`,
        `psw=${options.password}`,
        ''
      );
    }

    if (options.action === 'compile') {
      if (compilePrograms.length === 0) throw new Error('Programs is required for compile.');
      lines.push(
        '[compile]',
        'action=compile',
        `program=${joinValues(compilePrograms.map(toSlashPath))}`,
        `recompile=${options.recompile ? 'T' : 'F'}`,
        `includes=${joinValues(compileIncludes.map(toSlashPath))}`
      );
    } else if (options.action === 'patch-gen') {
      if (options.fileResources.length === 0) throw new Error('FileResources is required for patch-gen.');
      if (!options.patchName) options.patchName = `PATCH_${timestamp()}`;
      fs.mkdirSync(options.saveLocal, { recursive: true });
      lines.push(
        '[patchGen]',
        'action=patchGen',
        `fileResource=${joinValues(options.fileResources)}`,
        `patchType=${options.patchType}`,
        `patchName=${options.patchName}`,
        `saveLocal=${toSlashPath(options.saveLocal)}`
      );
    } else if (options.action === 'patch-info') {
      if (!options.patchFile) throw new Error('PatchFile is required for patch-info.');
      if (!options.output) options.output = path.join(os.tmpdir(), `tds-patch-info-${cryptoId()}.txt`);
      lines.push(
        '[patchInfo]',
        'action=patchInfo',
        `patchFile=${toSlashPath(options.patchFile)}`,
        'localPatch=True',
        `output=${toSlashPath(options.output)}`
      );
    }

    writeIni(tmp, lines);
    const result = childProcess.spawnSync(advpls, ['cli', tmp], { stdio: 'inherit' });
    const exitCode = result.status === null ? 1 : result.status;
    const authFailure = connectionOrAuthFailure(log);

    if (fs.existsSync(log)) {
      console.log('--- TDS LOG ---');
      process.stdout.write(fs.readFileSync(log, 'utf8'));
      if (!String(fs.readFileSync(log, 'utf8')).endsWith('\n')) console.log();
    }

    if (options.action === 'patch-info' && fs.existsSync(options.output)) {
      console.log('--- PATCH INFO ---');
      process.stdout.write(fs.readFileSync(options.output, 'utf8'));
      if (!String(fs.readFileSync(options.output, 'utf8')).endsWith('\n')) console.log();
    }

    if (options.action === 'patch-gen' && fs.existsSync(options.saveLocal)) {
      console.log('--- PATCH FILES ---');
      const files = fs.readdirSync(options.saveLocal)
        .filter((name) => name.startsWith(options.patchName))
        .map((name) => {
          const fullPath = path.join(options.saveLocal, name);
          const stat = fs.statSync(fullPath);
          return { fullPath, length: stat.size, lastWriteTime: stat.mtime.toISOString() };
        })
        .sort((a, b) => b.lastWriteTime.localeCompare(a.lastWriteTime));
      files.forEach((file) => console.log(`${file.fullPath}\t${file.length}\t${file.lastWriteTime}`));
    }

    return { exitCode, connectionOrAuthFailure: authFailure };
  } finally {
    fs.rmSync(tmp, { force: true });
    if (!options.keepLog) fs.rmSync(log, { force: true });
  }
}

function cryptoId() {
  return `${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`;
}

function timestamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

function findNode() {
  const node = findOnPath(isWindows() ? ['node.exe', 'node'] : ['node']);
  if (!node) throw new Error('node was not found. It is required for RPO inspector actions.');
  return node;
}

function ensureLspDependencies() {
  const root = skillRoot();
  const jsonRpcPath = path.join(root, 'node_modules', 'vscode-jsonrpc');
  if (!fs.existsSync(jsonRpcPath)) installNodeDependencies(root);
}

function invokeLspAction(options, advpls) {
  requireAuth(options);
  ensureLspDependencies();

  const node = findNode();
  const client = path.join(scriptDir(), 'tds_lsp_client.js');
  if (!fs.existsSync(client)) throw new Error(`LSP client script not found: ${client}`);

  const payloadPath = path.join(os.tmpdir(), `tds-protheus-lsp-${cryptoId()}.json`);
  const payload = {
    action: options.action,
    server: options.server,
    port: options.port,
    build: options.build,
    secure: Boolean(options.secure),
    environment: options.environment,
    user: options.user,
    password: options.password,
    encoding: 'CP1252',
    includes: options.includes,
    fileResources: options.fileResources,
    filter: options.filter,
    includeOutScope: Boolean(options.includeOutScope),
    advplsPath: advpls,
    tdsExtensionRoot: findTdsExtensionRoot(),
    workspace: process.cwd(),
  };

  try {
    fs.writeFileSync(payloadPath, JSON.stringify(payload, null, 2), 'utf8');
    const result = childProcess.spawnSync(node, [client, payloadPath], { stdio: 'inherit' });
    process.exit(result.status === null ? 1 : result.status);
  } finally {
    fs.rmSync(payloadPath, { force: true });
  }
}

function runDecompressCh(options) {
  if (!options.origin) throw new Error('Origin is required for decompress-ch (use --source).');
  if (!options.dest) throw new Error('Dest is required for decompress-ch (use --dest).');
  if (!fs.existsSync(options.origin)) throw new Error(`Origin folder not found: ${options.origin}`);
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const script = path.join(scriptDir, 'decompress_ch.py');
  const pythonBin = findPython();
  const result = childProcess.spawnSync(pythonBin, [script, options.origin, options.dest], { stdio: 'inherit' });
  process.exit(result.status === null ? 1 : result.status);
}

function findPython() {
  for (const bin of ['python3', 'python']) {
    const probe = childProcess.spawnSync(bin, ['--version'], { stdio: 'ignore' });
    if (probe.status === 0) return bin;
  }
  throw new Error('Python 3 not found on PATH (required for decompress-ch).');
}

function collectSourceFiles(src, recursive, exts) {
  const stat = fs.statSync(src);
  if (stat.isFile()) return [src];
  const out = [];
  const walk = (dir) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (recursive) walk(full);
      } else {
        const ext = path.extname(ent.name).slice(1).toLowerCase();
        if (exts.length === 0 || exts.includes(ext)) out.push(full);
      }
    }
  };
  walk(src);
  return out;
}

// Converte encoding de fontes AdvPL/TLPP. cp1252 (padrao) delega ao convert_encoding.{sh,bat}
// (pula ASCII/cp1252, remove BOM, preserva CRLF e permissoes). utf8 faz o reverso via iconv inline.
function runConvertEncoding(options) {
  const src = options.origin;
  if (!src) throw new Error('Source is required for convert-encoding (use --source).');
  if (!fs.existsSync(src)) throw new Error(`Source not found: ${src}`);
  const to = String(options.to || 'cp1252').toLowerCase().replace('-', '');
  if (!['cp1252', 'utf8'].includes(to)) {
    throw new Error(`--to must be cp1252 or utf8 (got "${options.to}").`);
  }

  if (to === 'cp1252') {
    const dir = scriptDir();
    const script = isWindows()
      ? path.join(dir, 'convert_encoding.bat')
      : path.join(dir, 'convert_encoding.sh');
    if (!pathExists(script)) throw new Error(`Encoding script not found: ${script}`);
    const args = [];
    if (options.recursive) args.push('-r');
    if (options.dryRun) args.push('--dry-run');
    if (options.extensions) args.push('-e', options.extensions);
    args.push(src);
    const runner = isWindows() ? script : 'bash';
    const spawnArgs = isWindows() ? args : [script, ...args];
    const result = childProcess.spawnSync(runner, spawnArgs, { stdio: 'inherit' });
    process.exit(result.status === null ? 1 : result.status);
  }

  // to === 'utf8' : WINDOWS-1252 -> UTF-8 (iconv preserva CRLF), inline.
  const exts = (options.extensions || 'prw prg tlpp prx ch th')
    .split(/[\s,;]+/).filter(Boolean).map((e) => e.toLowerCase().replace(/^\./, ''));
  const files = collectSourceFiles(src, options.recursive, exts);
  let converted = 0; let skipped = 0; let failed = 0;
  for (const f of files) {
    const buf = fs.readFileSync(f);
    if (!buf.some((b) => b > 127)) { skipped += 1; continue; } // ASCII puro
    const isUtf8 = childProcess.spawnSync('iconv', ['-f', 'UTF-8', '-t', 'UTF-8', f], { stdio: 'ignore' });
    if (isUtf8.status === 0) { skipped += 1; continue; } // ja e UTF-8 valido
    if (options.dryRun) { console.log(`[DRY] cp1252 -> utf8: ${f}`); converted += 1; continue; }
    const out = childProcess.spawnSync('iconv', ['-f', 'WINDOWS-1252', '-t', 'UTF-8', f]);
    if (out.status !== 0 || !out.stdout || out.stdout.length === 0) {
      console.error(`[ERROR] iconv failed: ${f}`); failed += 1; continue;
    }
    fs.writeFileSync(f, out.stdout); console.log(`[OK] cp1252 -> utf8: ${f}`); converted += 1;
  }
  console.log(`[INFO] convert-encoding (utf8): converted=${converted} skipped=${skipped} failed=${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

function runAppre(options, advpls) {
  if (options.programs.length === 0) throw new Error('Programs is required for appre.');
  // Compila a partir de um staging temporario para nao gerar .ppx*/.ppo ao lado do fonte.
  const staging = compileStaging(options.programs);
  let exitCode = 1;
  try {
    const args = ['appre'];
    for (const includePath of options.includes) args.push('-I', includePath);
    args.push(joinValues(staging.programs));
    const result = childProcess.spawnSync(advpls, args, { stdio: 'inherit' });
    exitCode = result.status === null ? 1 : result.status;
  } finally {
    fs.rmSync(staging.root, { recursive: true, force: true });
  }
  process.exit(exitCode);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }
  if (!ACTIONS.has(options.action)) {
    throw new Error(`Action is required and must be one of: ${[...ACTIONS].join(', ')}`);
  }

  if (options.action === 'quality') {
    if (options.programs.length === 0) throw new Error('Programs is required for quality.');
    assertAdvplCompileRules(options.programs, { warnOnly: options.gateWarnOnly });
    console.log('[INFO] Quality gate passed.');
    return;
  }

  if (options.action === 'decompress-ch') {
    runDecompressCh(options);
    return;
  }

  if (options.action === 'convert-encoding') {
    runConvertEncoding(options);
    return;
  }

  const advpls = findAdvpls(options.advplsPath);
  let staging = null;
  let effectivePrograms = options.programs;
  let effectiveIncludes = options.includes;

  try {
    if (['rpo-info', 'rpo-objects', 'rpo-functions', 'rpo-check'].includes(options.action)) {
      invokeLspAction(options, advpls);
    }

    if (options.action === 'appre') runAppre(options, advpls);

    if (options.action === 'compile') {
      assertAdvplCompileRules(options.programs, { warnOnly: options.gateWarnOnly });
      staging = compileStaging(options.programs);
      effectivePrograms = staging.programs;
      const stagedDirs = [...new Set(effectivePrograms.map((program) => path.dirname(program)))];
      effectiveIncludes = [...new Set([...options.includes, staging.root, ...stagedDirs])];
      console.log(`[INFO] Compile staging folder: ${staging.root}`);
    }

    let result = runTdsCli(options, advpls, options.port, effectivePrograms, effectiveIncludes);
    if (result.exitCode !== 0 && !options.portWasExplicit && options.port === 30600 && result.connectionOrAuthFailure) {
      console.log('[WARN] Default port 30600 failed during connection/authentication. Retrying with fallback port 1234.');
      result = runTdsCli(options, advpls, 1234, effectivePrograms, effectiveIncludes);
    }

    if (options.action === 'compile' && staging) removeCompileArtifacts(staging.originals);
    process.exit(result.exitCode);
  } finally {
    if (staging?.root && fs.existsSync(staging.root)) {
      if (options.keepLog) {
        console.log(`[INFO] Compile staging folder kept: ${staging.root}`);
      } else {
        fs.rmSync(staging.root, { recursive: true, force: true });
      }
    }
  }
}

try {
  main();
} catch (error) {
  console.error(`[ERROR] ${error.message}`);
  process.exit(1);
}
