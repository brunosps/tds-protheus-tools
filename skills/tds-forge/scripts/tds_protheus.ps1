param(
  [Parameter(Mandatory=$true)]
  [ValidateSet('validate','quality','compile','patch-gen','patch-info','appre','rpo-info','rpo-objects','rpo-functions','rpo-check')]
  [string]$Action,

  [string]$Server = '127.0.0.1',
  [int]$Port = 30600,
  [string]$Build = '7.00.240223P',
  [bool]$Secure = $false,
  [string]$Environment = 'DEV',
  [string]$User = 'admin',
  [string]$Password = 'admin',
  [string[]]$Includes = @('C:\TOTVS\includes'),
  [string[]]$Programs = @(),
  [string[]]$FileResources = @(),
  [string]$PatchFile,
  [string]$PatchName,
  [string]$PatchType = 'PTM',
  [string]$SaveLocal = 'C:\TOTVS\Patchs',
  [string]$Output,
  [string]$Filter,
  [switch]$IncludeOutScope,
  [switch]$Recompile,
  [string]$AdvplsPath,
  [switch]$KeepLog
)

$ErrorActionPreference = 'Stop'
$portWasExplicit = $PSBoundParameters.ContainsKey('Port')

function Find-Advpls {
  param([string]$ExplicitPath)

  if ($ExplicitPath -and (Test-Path -LiteralPath $ExplicitPath)) {
    return (Resolve-Path -LiteralPath $ExplicitPath).Path
  }
  if ($env:TDS_ADVPLS_PATH -and (Test-Path -LiteralPath $env:TDS_ADVPLS_PATH)) {
    return (Resolve-Path -LiteralPath $env:TDS_ADVPLS_PATH).Path
  }

  $skillRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
  $skillAdvpls = Join-Path $skillRoot 'node_modules\@totvs\tds-ls\bin\windows\advpls.exe'
  if (Test-Path -LiteralPath $skillAdvpls) {
    return (Resolve-Path -LiteralPath $skillAdvpls).Path
  }

  $extRoot = Join-Path $env:USERPROFILE '.vscode\extensions'
  if (Test-Path -LiteralPath $extRoot) {
    $match = Get-ChildItem -LiteralPath $extRoot -Directory -Filter 'totvs.tds-vscode-*' |
      Sort-Object Name -Descending |
      ForEach-Object { Join-Path $_.FullName 'node_modules\@totvs\tds-ls\bin\windows\advpls.exe' } |
      Where-Object { Test-Path -LiteralPath $_ } |
      Select-Object -First 1
    if ($match) { return $match }
  }

  $cmd = Get-Command advpls.exe -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }

  $npm = Get-Command npm.cmd,npm -ErrorAction SilentlyContinue | Select-Object -First 1
  if (-not $npm) {
    throw 'advpls.exe not found and npm is not available to install @totvs/tds-ls.'
  }

  Write-Output 'advpls.exe not found. Installing @totvs/tds-ls inside the skill directory...'
  & $npm.Source --prefix $skillRoot install '@totvs/tds-ls' --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) {
    throw '@totvs/tds-ls installation failed.'
  }

  if (Test-Path -LiteralPath $skillAdvpls) {
    return (Resolve-Path -LiteralPath $skillAdvpls).Path
  }

  throw '@totvs/tds-ls was installed, but advpls.exe was not found in the expected package path.'
}

function To-SlashPath {
  param([string]$PathValue)
  return ($PathValue -replace '\\','/')
}

function Join-Values {
  param([string[]]$Values)
  return ($Values | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }) -join ','
}

function Test-IsUnderPath {
  param(
    [string]$BasePath,
    [string]$ChildPath
  )

  $base = [System.IO.Path]::GetFullPath($BasePath).TrimEnd('\','/')
  $child = [System.IO.Path]::GetFullPath($ChildPath).TrimEnd('\','/')
  return $child.Equals($base, [System.StringComparison]::OrdinalIgnoreCase) -or
    $child.StartsWith($base + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase) -or
    $child.StartsWith($base + [System.IO.Path]::AltDirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)
}

function Get-RelativeChildPath {
  param(
    [string]$BasePath,
    [string]$ChildPath,
    [int]$Index
  )

  $base = [System.IO.Path]::GetFullPath($BasePath).TrimEnd('\','/')
  $child = [System.IO.Path]::GetFullPath($ChildPath)
  if (Test-IsUnderPath $base $child) {
    return $child.Substring($base.Length).TrimStart('\','/')
  }

  return ('external_{0:D3}\{1}' -f $Index, [System.IO.Path]::GetFileName($child))
}

function New-CompileStaging {
  param([string[]]$SourcePrograms)

  if ($SourcePrograms.Count -eq 0) { throw 'Programs is required for compile.' }

  $workspace = (Get-Location).Path
  $stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
  $stagingRoot = Join-Path $env:TEMP ('tds-protheus-compile-' + $stamp + '-' + [guid]::NewGuid().ToString('N'))
  $stagedPrograms = New-Object System.Collections.Generic.List[string]
  $originalPrograms = New-Object System.Collections.Generic.List[string]
  $index = 0

  foreach ($program in $SourcePrograms) {
    if (-not (Test-Path -LiteralPath $program -PathType Leaf)) {
      throw "Program not found: $program"
    }

    $resolved = (Resolve-Path -LiteralPath $program).Path
    $relative = Get-RelativeChildPath $workspace $resolved $index
    $destination = Join-Path $stagingRoot $relative
    $destinationDir = Split-Path -Parent $destination
    if (-not (Test-Path -LiteralPath $destinationDir)) {
      New-Item -ItemType Directory -Force -Path $destinationDir | Out-Null
    }

    Copy-Item -LiteralPath $resolved -Destination $destination -Force
    $stagedPrograms.Add($destination)
    $originalPrograms.Add($resolved)
    $index++
  }

  return [pscustomobject]@{
    Root = $stagingRoot
    Programs = @($stagedPrograms)
    Originals = @($originalPrograms)
  }
}

function Get-AdvplCodeLine {
  param([string]$Line)

  $trimmed = $Line.TrimStart()
  if ($trimmed.StartsWith('//') -or $trimmed.StartsWith('*')) {
    return ''
  }

  $commentAt = $Line.IndexOf('//')
  if ($commentAt -ge 0) {
    return $Line.Substring(0, $commentAt)
  }

  return $Line
}

function Test-AdvplFunctionBoundary {
  param([string]$Line)
  return $Line -match '(?i)^\s*((Static|User)\s+Function|Function|Method)\s+[A-Za-z_][A-Za-z0-9_]*\b'
}

function New-TenantContextError {
  param(
    [string]$Path,
    [int]$Line,
    [string]$Variable,
    [string]$Operation
  )

  return ('{0}:{1} - Protheus 12.1.2510 quality gate blocks {2} of {3}. Read access is allowed, but tenant/user context must be prepared by the supported runtime path: RpcSetEnv() only at the start of a new StartJob/SmartJob thread, REST PrepareIn with tenantId, SOAP specialist URI/PrepareIn, or xFilial()/FWxFilial() for branch filters.' -f $Path, $Line, $Operation, $Variable)
}

function Assert-AdvplCompileRules {
  param([string[]]$SourcePrograms)

  $errors = New-Object System.Collections.Generic.List[string]
  $warnings = New-Object System.Collections.Generic.List[string]

  foreach ($program in $SourcePrograms) {
    $sourceExt = [System.IO.Path]::GetExtension($program)
    if ($sourceExt -notmatch '(?i)^\.(prw|tlpp)$') {
      continue
    }
    if (-not (Test-Path -LiteralPath $program -PathType Leaf)) {
      continue
    }

    $resolved = (Resolve-Path -LiteralPath $program).Path
    $lines = @(Get-Content -LiteralPath $resolved)
    $boundaries = New-Object System.Collections.Generic.List[object]
    $includeLines = @{}
    $transactionDepth = 0

    for ($i = 0; $i -lt $lines.Count; $i++) {
      $codeLine = Get-AdvplCodeLine $lines[$i]
      if ([string]::IsNullOrWhiteSpace($codeLine)) {
        continue
      }

      $conditionLike = $codeLine -match '(?i)^\s*(If|ElseIf|While|Do\s+While)\b'
      $tenantAssignment = [regex]::Match($codeLine, '(?<![A-Za-z0-9_:.>\-])(cEmpAnt|__cUserId|cFilAnt|cNumEmp)\s*(:=|=(?!=))', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
      if ($tenantAssignment.Success -and -not ($conditionLike -and $tenantAssignment.Groups[2].Value.StartsWith('='))) {
        $errors.Add((New-TenantContextError $resolved ($i + 1) $tenantAssignment.Groups[1].Value 'direct assignment'))
      }

      $tenantByRef = [regex]::Match($codeLine, '@\s*(cEmpAnt|__cUserId|cFilAnt|cNumEmp)\b', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
      if ($tenantByRef.Success) {
        $errors.Add((New-TenantContextError $resolved ($i + 1) $tenantByRef.Groups[1].Value 'by-reference mutation risk'))
      }

      if ($sourceExt -notmatch '(?i)^\.prw$') {
        continue
      }

      $includeMatch = [regex]::Match($codeLine, '^\s*#\s*include\s+["<]([^">]+)[">]', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
      if ($includeMatch.Success) {
        $includeLines[$includeMatch.Groups[1].Value.ToUpperInvariant()] = $i + 1
      }

      if ($codeLine -match '(?i)^\s*(Private|Public)\b') {
        $warnings.Add(('{0}:{1} - Avoid {2}; prefer Local variables, explicit parameters, or documented narrow-scope legacy use.' -f $resolved, ($i + 1), $matches[1]))
      }

      if ($codeLine -match '(?i)(:=|(?<![<>=!:!])=(?![=>]))\s*\{\s*["''][^"'']+["'']\s*:') {
        $errors.Add(('{0}:{1} - TLPP JSON literal syntax is not valid for ADVPL .prw sources; use JsonObject():New() and parser methods.' -f $resolved, ($i + 1)))
      }

      if ($codeLine -match '(?i)\bBegin\s+Transaction\b') {
        $transactionDepth++
      }

      if ($transactionDepth -gt 0 -and $codeLine -match '(?i)\b(MsgInfo|MsgAlert|MsgStop|Alert|InputBox)\s*\(') {
        $errors.Add(('{0}:{1} - Do not open user-interface function {2}() inside Begin Transaction/End Transaction.' -f $resolved, ($i + 1), $matches[1]))
      }

      if ($codeLine -match '(?<!&)&\s*[A-Za-z_][A-Za-z0-9_]*\.?') {
        $warnings.Add(('{0}:{1} - Macro substitution detected; use only for controlled dynamic calls or protected compatibility checks.' -f $resolved, ($i + 1)))
      }

      if ($codeLine -match '\{\s*\|' -and ($codeLine.Length -gt 120 -or ([regex]::Matches($codeLine, '(?i)\.(AND|OR)\.').Count -gt 3))) {
        $warnings.Add(('{0}:{1} - Long or complex codeblock detected; consider extracting the logic to a named function.' -f $resolved, ($i + 1)))
      }

      if ($codeLine -match '(?i)\bDbSelectArea\s*\(') {
        $windowStart = [Math]::Max(0, $i - 8)
        $windowEnd = [Math]::Min($lines.Count - 1, $i + 8)
        $windowText = ($lines[$windowStart..$windowEnd] -join "`n")
        if ($windowText -notmatch '(?i)\b(GetArea|RestArea|Select)\s*\(') {
          $warnings.Add(('{0}:{1} - DbSelectArea() without nearby GetArea/RestArea or Select() restore pattern; prefer aliased expressions or preserve workarea.' -f $resolved, ($i + 1)))
        }
      }

      if ($codeLine -match '(?i)\b(fCreate|fOpen)\s*\(\s*["''][A-Z]:\\') {
        $warnings.Add(('{0}:{1} - {2}() uses an absolute Windows path; prefer a server-side path relative to Protheus RootPath when possible.' -f $resolved, ($i + 1), $matches[1]))
      }

      if ($codeLine -match '(?i)^\s*(If|ElseIf|While|Do\s+While)\b' -and $codeLine -match '["'']' -and $codeLine -match '(?<![<>=!:!])=(?![=>])') {
        $warnings.Add(('{0}:{1} - String comparison with single "=" can be partial; prefer "==" when exact comparison is intended.' -f $resolved, ($i + 1)))
      }

      if ($codeLine -match '(?i)\b(If|ElseIf|While|Do\s+While|Empty)\b.*[A-Za-z_][A-Za-z0-9_:]*\s*\[\s*["''][^"'']+["'']\s*\]' -and $codeLine -notmatch '(?i)\bHasProperty\s*\(') {
        $warnings.Add(('{0}:{1} - JSON indexed property access in a condition can create missing properties as null; check HasProperty() first for optional properties.' -f $resolved, ($i + 1)))
      }

      if ($codeLine -match '(?i)\bEnd\s+Transaction\b' -and $transactionDepth -gt 0) {
        $transactionDepth--
      }

      if (-not (Test-AdvplFunctionBoundary $codeLine)) {
        continue
      }

      $staticMatch = [regex]::Match($codeLine, '^\s*Static\s+Function\s+([A-Za-z_][A-Za-z0-9_]*)\b', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
      $userMatch = [regex]::Match($codeLine, '^\s*User\s+Function\s+([A-Za-z_][A-Za-z0-9_]*)\b', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
      $name = $null
      $kind = 'Other'

      if ($staticMatch.Success) {
        $name = $staticMatch.Groups[1].Value
        $kind = 'Static'
        if ($name.Length -gt 10) {
          $errors.Add(('{0}:{1} - Static Function "{2}" has {3} characters; maximum is 10.' -f $resolved, ($i + 1), $name, $name.Length))
        }
      }
      elseif ($userMatch.Success) {
        $name = $userMatch.Groups[1].Value
        $kind = 'User'
        if ($name -match '(?i)^U_') {
          $errors.Add(('{0}:{1} - User Function "{2}" must be declared without the U_ prefix in source code.' -f $resolved, ($i + 1), $name))
        }
        if ($name.Length -gt 8) {
          $errors.Add(('{0}:{1} - User Function "{2}" has {3} characters; maximum is 8 because the compiled symbol receives U_ and must fit in 10.' -f $resolved, ($i + 1), $name, $name.Length))
        }
      }
      else {
        $otherMatch = [regex]::Match($codeLine, '^\s*(Function|Method)\s+([A-Za-z_][A-Za-z0-9_]*)\b', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
        if ($otherMatch.Success) { $name = $otherMatch.Groups[2].Value }
      }

      $boundaries.Add([pscustomobject]@{
        Kind = $kind
        Name = $name
        Line = $i
      })
    }

    for ($i = 0; $i -lt $boundaries.Count; $i++) {
      $boundary = $boundaries[$i]
      if ($boundary.Kind -notin @('Static','User')) {
        continue
      }

      $start = $boundary.Line + 1
      $end = $lines.Count - 1
      if ($i + 1 -lt $boundaries.Count) {
        $end = $boundaries[$i + 1].Line - 1
      }

      $hasReturn = $false
      for ($lineIndex = $start; $lineIndex -le $end; $lineIndex++) {
        $codeLine = Get-AdvplCodeLine $lines[$lineIndex]
        if ($codeLine -match '(?i)^\s*Return(\b|\s|\()') {
          $hasReturn = $true
          break
        }
      }

      if (-not $hasReturn) {
        $errors.Add(('{0}:{1} - {2} Function "{3}" must contain an explicit Return.' -f $resolved, ($boundary.Line + 1), $boundary.Kind, $boundary.Name))
      }
    }

    if ($includeLines.ContainsKey('PROTHEUS.CH') -and $includeLines.ContainsKey('TOTVS.CH')) {
      $warnings.Add(('{0}:{1} - PROTHEUS.CH and TOTVS.CH are both included; keep only one unless a compatibility reason exists.' -f $resolved, $includeLines['TOTVS.CH']))
    }
  }

  if ($warnings.Count -gt 0) {
    Write-Output '--- ADVPL RULE VALIDATION WARNINGS ---'
    $warnings | ForEach-Object { Write-Output ('[WARN] ' + $_) }
  }

  if ($errors.Count -gt 0) {
    Write-Output '--- ADVPL RULE VALIDATION ERRORS ---'
    $errors | ForEach-Object { Write-Output ('[ERROR] ' + $_) }
    throw ('ADVPL rule validation failed with {0} error(s).' -f $errors.Count)
  }
}

function Test-GitTracked {
  param(
    [string]$Workspace,
    [string]$Path
  )

  $git = Get-Command git.exe,git -ErrorAction SilentlyContinue | Select-Object -First 1
  if (-not $git) { return $false }
  if (-not (Test-IsUnderPath $Workspace $Path)) { return $false }

  $relative = [System.IO.Path]::GetFullPath($Path).Substring([System.IO.Path]::GetFullPath($Workspace).TrimEnd('\','/').Length).TrimStart('\','/')
  & $git.Source -C $Workspace ls-files --error-unmatch -- $relative *> $null
  return ($LASTEXITCODE -eq 0)
}

function Remove-CompileArtifacts {
  param([string[]]$OriginalPrograms)

  $workspace = (Get-Location).Path
  foreach ($program in $OriginalPrograms) {
    $dir = Split-Path -Parent $program
    $baseName = [System.IO.Path]::GetFileNameWithoutExtension($program)
    if (-not (Test-Path -LiteralPath $dir)) { continue }

    Get-ChildItem -LiteralPath $dir -File -ErrorAction SilentlyContinue |
      Where-Object {
        $_.BaseName.Equals($baseName, [System.StringComparison]::OrdinalIgnoreCase) -and
        $_.Extension -match '^\.(ppo|ppx|ppx_prw|ppx_tlpp|errprw)$'
      } |
      ForEach-Object {
        if (-not (Test-GitTracked $workspace $_.FullName)) {
          Remove-Item -LiteralPath $_.FullName -Force
        }
      }
  }
}

function Test-ConnectionOrAuthFailure {
  param([string]$LogPath)

  if (-not (Test-Path -LiteralPath $LogPath)) { return $false }
  $text = Get-Content -LiteralPath $LogPath -Raw
  return $text -match '(?i)(connection\s+.*(failed|refused|denied|error|timeout|timed out|unable)|authentication\s+.*(failed|error)|authenticat(e|ing)\s+.*failed|not authenticated|could not connect|cannot connect|econnrefused)'
}

function Require-Connection {
  if ([string]::IsNullOrWhiteSpace($Server) -or $Port -le 0) {
    throw 'Server and Port are required.'
  }
}

function Require-Auth {
  Require-Connection
  if ([string]::IsNullOrWhiteSpace($Environment) -or [string]::IsNullOrWhiteSpace($User) -or [string]::IsNullOrWhiteSpace($Password)) {
    throw 'Environment, User, and Password are required for this action.'
  }
}

function Find-Node {
  $cmd = Get-Command node.exe,node -ErrorAction SilentlyContinue | Select-Object -First 1
  if (-not $cmd) {
    throw 'node was not found. It is required for RPO inspector actions.'
  }
  return $cmd.Source
}

function Find-TdsExtensionRoot {
  $extRoot = Join-Path $env:USERPROFILE '.vscode\extensions'
  if (-not (Test-Path -LiteralPath $extRoot)) {
    return $null
  }
  return Get-ChildItem -LiteralPath $extRoot -Directory -Filter 'totvs.tds-vscode-*' |
    Sort-Object Name -Descending |
    Select-Object -ExpandProperty FullName -First 1
}

function Invoke-LspAction {
  Require-Auth

  $node = Find-Node
  $skillRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
  $lspClient = Join-Path $PSScriptRoot 'tds_lsp_client.js'
  if (-not (Test-Path -LiteralPath $lspClient)) {
    throw "LSP client script not found: $lspClient"
  }

  $tdsExtensionRoot = Find-TdsExtensionRoot
  $payloadPath = Join-Path $env:TEMP ('tds-protheus-lsp-' + [guid]::NewGuid().ToString('N') + '.json')

  $payload = [ordered]@{
    action = $Action
    server = $Server
    port = $Port
    build = $Build
    secure = [bool]$Secure
    environment = $Environment
    user = $User
    password = $Password
    encoding = 'CP1252'
    includes = @($Includes)
    fileResources = @($FileResources)
    filter = $Filter
    includeOutScope = [bool]$IncludeOutScope
    advplsPath = $advpls
    tdsExtensionRoot = $tdsExtensionRoot
    workspace = (Get-Location).Path
  }

  try {
    $json = $payload | ConvertTo-Json -Depth 8
    [System.IO.File]::WriteAllText($payloadPath, $json, [System.Text.Encoding]::UTF8)

    $oldNodePath = $env:NODE_PATH
    if ($tdsExtensionRoot) {
      $env:NODE_PATH = Join-Path $tdsExtensionRoot 'node_modules'
    }

    & $node $lspClient $payloadPath
    exit $LASTEXITCODE
  }
  finally {
    $env:NODE_PATH = $oldNodePath
    if (Test-Path -LiteralPath $payloadPath) { Remove-Item -LiteralPath $payloadPath -Force }
  }
}

function Invoke-TdsCli {
  param(
    [int]$PortToUse,
    [string[]]$CompilePrograms,
    [string[]]$CompileIncludes
  )

  $tmp = Join-Path $env:TEMP ('tds-protheus-' + [guid]::NewGuid().ToString('N') + '.ini')
  $log = Join-Path $env:TEMP ('tds-protheus-' + [guid]::NewGuid().ToString('N') + '.log')

  try {
    $lines = New-Object System.Collections.Generic.List[string]
    $lines.Add('showConsoleOutput=true')
    $lines.Add('logToFile=' + (To-SlashPath $log))
    $lines.Add('')

    if ($Action -eq 'validate') {
      Require-Connection
      $lines.Add('[validate]')
      $lines.Add('action=validate')
      $lines.Add('server=' + $Server)
      $lines.Add('port=' + $PortToUse)
    }
    else {
      Require-Auth
      $lines.Add('[authentication]')
      $lines.Add('action=authentication')
      $lines.Add('server=' + $Server)
      $lines.Add('port=' + $PortToUse)
      $lines.Add('secure=' + ($(if ($Secure) { '1' } else { '0' })))
      $lines.Add('build=' + $Build)
      $lines.Add('environment=' + $Environment)
      $lines.Add('user=' + $User)
      $lines.Add('psw=' + $Password)
      $lines.Add('')
    }

    if ($Action -eq 'compile') {
      if ($CompilePrograms.Count -eq 0) { throw 'Programs is required for compile.' }
      $lines.Add('[compile]')
      $lines.Add('action=compile')
      $lines.Add('program=' + (Join-Values ($CompilePrograms | ForEach-Object { To-SlashPath $_ })))
      $lines.Add('recompile=' + ($(if ($Recompile) { 'T' } else { 'F' })))
      $lines.Add('includes=' + (Join-Values ($CompileIncludes | ForEach-Object { To-SlashPath $_ })))
    }
    elseif ($Action -eq 'patch-gen') {
      if ($FileResources.Count -eq 0) { throw 'FileResources is required for patch-gen.' }
      if ([string]::IsNullOrWhiteSpace($PatchName)) { $script:PatchName = 'PATCH_' + (Get-Date -Format 'yyyyMMdd_HHmmss') }
      if (-not (Test-Path -LiteralPath $SaveLocal)) { New-Item -ItemType Directory -Force -Path $SaveLocal | Out-Null }
      $lines.Add('[patchGen]')
      $lines.Add('action=patchGen')
      $lines.Add('fileResource=' + (Join-Values $FileResources))
      $lines.Add('patchType=' + $PatchType)
      $lines.Add('patchName=' + $PatchName)
      $lines.Add('saveLocal=' + (To-SlashPath $SaveLocal))
    }
    elseif ($Action -eq 'patch-info') {
      if ([string]::IsNullOrWhiteSpace($PatchFile)) { throw 'PatchFile is required for patch-info.' }
      if ([string]::IsNullOrWhiteSpace($Output)) { $script:Output = Join-Path $env:TEMP ('tds-patch-info-' + [guid]::NewGuid().ToString('N') + '.txt') }
      $lines.Add('[patchInfo]')
      $lines.Add('action=patchInfo')
      $lines.Add('patchFile=' + (To-SlashPath $PatchFile))
      $lines.Add('localPatch=True')
      $lines.Add('output=' + (To-SlashPath $Output))
    }

    [System.IO.File]::WriteAllLines($tmp, $lines, [System.Text.Encoding]::GetEncoding(1252))
    & $advpls cli $tmp
    $exit = $LASTEXITCODE
    $connectionOrAuthFailure = Test-ConnectionOrAuthFailure $log

    if (Test-Path -LiteralPath $log) {
      Write-Output '--- TDS LOG ---'
      Get-Content -LiteralPath $log
    }

    if ($Action -eq 'patch-info' -and (Test-Path -LiteralPath $Output)) {
      Write-Output '--- PATCH INFO ---'
      Get-Content -LiteralPath $Output
    }

    if ($Action -eq 'patch-gen') {
      Write-Output '--- PATCH FILES ---'
      Get-ChildItem -LiteralPath $SaveLocal -Filter ($PatchName + '*') -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object FullName,Length,LastWriteTime
    }

    return [pscustomobject]@{
      ExitCode = $exit
      ConnectionOrAuthFailure = $connectionOrAuthFailure
    }
  }
  finally {
    if (Test-Path -LiteralPath $tmp) { Remove-Item -LiteralPath $tmp -Force }
    if (-not $KeepLog -and (Test-Path -LiteralPath $log)) { Remove-Item -LiteralPath $log -Force }
  }
}

$compileStaging = $null
$effectivePrograms = @($Programs)
$effectiveIncludes = @($Includes)

if ($Action -eq 'quality') {
  if ($Programs.Count -eq 0) { throw 'Programs is required for quality.' }
  Assert-AdvplCompileRules $Programs
  Write-Output '[INFO] Quality gate passed.'
  exit 0
}

$advpls = Find-Advpls $AdvplsPath

try {
  if ($Action -in @('rpo-info','rpo-objects','rpo-functions','rpo-check')) {
    Invoke-LspAction
  }

  if ($Action -eq 'appre') {
    if ($Programs.Count -eq 0) { throw 'Programs is required for appre.' }
    $args = @('appre')
    foreach ($inc in $Includes) { $args += @('-I', $inc) }
    $args += (Join-Values $Programs)
    & $advpls @args
    exit $LASTEXITCODE
  }

  if ($Action -eq 'compile') {
    Assert-AdvplCompileRules $Programs
    $compileStaging = New-CompileStaging $Programs
    $effectivePrograms = @($compileStaging.Programs)
    $stagedDirs = @($effectivePrograms | ForEach-Object { Split-Path -Parent $_ } | Select-Object -Unique)
    $effectiveIncludes = @($Includes + @($compileStaging.Root) + $stagedDirs | Select-Object -Unique)
    Write-Output ('[INFO] Compile staging folder: ' + $compileStaging.Root)
  }

  $result = Invoke-TdsCli -PortToUse $Port -CompilePrograms $effectivePrograms -CompileIncludes $effectiveIncludes
  if ($result.ExitCode -ne 0 -and -not $portWasExplicit -and $Port -eq 30600 -and $result.ConnectionOrAuthFailure) {
    Write-Output '[WARN] Default port 30600 failed during connection/authentication. Retrying with fallback port 1234.'
    $result = Invoke-TdsCli -PortToUse 1234 -CompilePrograms $effectivePrograms -CompileIncludes $effectiveIncludes
  }

  if ($Action -eq 'compile' -and $compileStaging) {
    Remove-CompileArtifacts $compileStaging.Originals
  }

  exit $result.ExitCode
}
finally {
  if ($compileStaging -and $compileStaging.Root -and (Test-Path -LiteralPath $compileStaging.Root)) {
    if ($KeepLog) {
      Write-Output ('[INFO] Compile staging folder kept: ' + $compileStaging.Root)
    }
    else {
      Remove-Item -LiteralPath $compileStaging.Root -Recurse -Force
    }
  }
}
