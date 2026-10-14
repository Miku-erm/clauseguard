param(
  [string]$ExtensionId = '',
  [switch]$Restart
)
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskExecutable = Join-Path $taskRoot '.local\ollama\ollama.exe'
if (-not (Test-Path -LiteralPath $taskExecutable)) {
  $taskCommand = Get-Command ollama -ErrorAction SilentlyContinue
  if (-not $taskCommand) { throw 'Ollama missing. Install the official Windows NVIDIA runtime; see README.md.' }
  $taskExecutable = $taskCommand.Source
}
$taskListener = Get-NetTCPConnection -LocalPort 11434 -State Listen -ErrorAction SilentlyContinue
if ($taskListener) {
  if ($taskListener.LocalAddress -ne '127.0.0.1') { throw 'Unsafe Ollama listener: expected IPv4 loopback only.' }
  if (-not $Restart) {
    Write-Output 'Loopback server already running; inspect its config log. Use -Restart only for this project runtime.'
    exit 0
  }
  $taskExistingServer = Get-CimInstance Win32_Process -Filter "ProcessId = $($taskListener.OwningProcess)"
  if ($taskExistingServer.ExecutablePath -ne $taskExecutable -or $taskExistingServer.CommandLine -notmatch 'serve') {
    throw 'Refusing to stop a runtime not owned by this project. Quit that Ollama server manually.'
  }
  Stop-Process -Id $taskExistingServer.ProcessId
  # Windows can leave native runner children alive after terminating serve.
  # Restrict cleanup to this exact project-owned executable; never other runtimes.
  $taskRunnerExecutable = Join-Path (Split-Path -Parent $taskExecutable) 'lib\ollama\llama-server.exe'
  Get-CimInstance Win32_Process -Filter "Name='llama-server.exe'" |
    Where-Object ExecutablePath -EQ $taskRunnerExecutable |
    ForEach-Object { Stop-Process -Id $_.ProcessId -ErrorAction SilentlyContinue }
}
$taskIdFile = Join-Path $taskRoot '.local\extension-id.txt'
if (-not $ExtensionId -and (Test-Path -LiteralPath $taskIdFile)) { $ExtensionId = (Get-Content -LiteralPath $taskIdFile -Raw).Trim() }
if ($ExtensionId) {
  if ($ExtensionId -notmatch '^[a-p]{32}$') { throw 'Expected the exact 32-character Chrome extension ID; wildcards are forbidden.' }
  $env:OLLAMA_ORIGINS = "chrome-extension://$ExtensionId"
} else {
  # Do not inherit a broad origin override from another project or shell.
  Remove-Item Env:\OLLAMA_ORIGINS -ErrorAction SilentlyContinue
}
$env:OLLAMA_HOST = '127.0.0.1:11434'
$env:OLLAMA_NO_CLOUD = '1'
$env:OLLAMA_NOPRUNE = '1'
$env:OLLAMA_NUM_PARALLEL = '1'
$env:OLLAMA_MAX_LOADED_MODELS = '1'
$env:OLLAMA_CONTEXT_LENGTH = '8192'
$env:OLLAMA_FLASH_ATTENTION = '1'
$env:OLLAMA_KV_CACHE_TYPE = 'q8_0'
# Explicit installation path wins. Ordinary installations use Ollama's default model directory.
# Retain the already-existing development cache as an optional fallback, never a requirement.
$taskLegacyModels = Join-Path (Split-Path -Parent $taskRoot) 'Challenge2\.local\models'
if ($env:CLAUSEGUARD_MODELS) {
  if (-not (Test-Path -LiteralPath $env:CLAUSEGUARD_MODELS -PathType Container)) { throw 'CLAUSEGUARD_MODELS directory does not exist.' }
  $env:OLLAMA_MODELS = (Resolve-Path -LiteralPath $env:CLAUSEGUARD_MODELS).Path
} elseif (-not $env:OLLAMA_MODELS -and (Test-Path -LiteralPath $taskLegacyModels)) {
  $env:OLLAMA_MODELS = $taskLegacyModels
}
New-Item -ItemType Directory -Force (Join-Path $taskRoot 'docs\evidence') | Out-Null
Start-Process -FilePath $taskExecutable -ArgumentList 'serve' -WindowStyle Hidden `
  -RedirectStandardOutput (Join-Path $taskRoot 'docs\evidence\ollama-stdout.log') `
  -RedirectStandardError (Join-Path $taskRoot 'docs\evidence\ollama-server.log') -PassThru | Select-Object Id
