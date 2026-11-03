# Run in your own terminal, not in a chat message. No key in command history.
param([switch]$Synthetic)
$ErrorActionPreference = 'Stop'
$splitwiseSecureKey = if ($Synthetic) {
    ConvertTo-SecureString 'synthetic-not-a-credential' -AsPlainText -Force
} else {
    Read-Host 'Splitwise API key (hidden; never paste into chat)' -AsSecureString
}
$splitwiseKeyPointer = [IntPtr]::Zero
$splitwiseProcess = $null
$splitwiseStart = $null
try {
    $splitwiseKeyPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($splitwiseSecureKey)
    $splitwiseStart = [Diagnostics.ProcessStartInfo]::new()
    $splitwiseStart.FileName = 'C:\Program Files\nodejs\node.exe'
    $splitwiseStart.UseShellExecute = $false
    $splitwiseStart.CreateNoWindow = $true
    $splitwiseStart.RedirectStandardOutput = $true
    $splitwiseStart.RedirectStandardError = $true
    $splitwiseStart.WorkingDirectory = $PSScriptRoot
    $splitwiseEntry = if ($Synthetic) {
        Join-Path $PSScriptRoot '../tests/fixtures/discover-splitwise-account.mjs'
    } else {
        Join-Path $PSScriptRoot '../integrations/splitwise-mcp/discover-account.mjs'
    }
    $splitwiseStart.ArgumentList.Add([IO.Path]::GetFullPath($splitwiseEntry))
    $splitwiseStart.Environment.Clear()
    $splitwiseStart.Environment['SystemRoot'] = $env:SystemRoot
    $splitwiseStart.Environment['SPLITWISE_API_KEY'] = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($splitwiseKeyPointer)
    $splitwiseProcess = [Diagnostics.Process]::Start($splitwiseStart)
    $splitwiseOutputTask = $splitwiseProcess.StandardOutput.ReadToEndAsync()
    $splitwiseErrorTask = $splitwiseProcess.StandardError.ReadToEndAsync()
    if (-not $splitwiseProcess.WaitForExit(180000)) {
        $splitwiseProcess.Kill($true)
        throw 'Read-only account check timed out. Stop for inspection.'
    }
    $splitwiseOutput = $splitwiseOutputTask.GetAwaiter().GetResult()
    $splitwiseErrorTask.GetAwaiter().GetResult() | Out-Null
    # Suppress arbitrary stderr and redact the key if a returned name echoed it.
    if ($splitwiseOutput) { Write-Output $splitwiseOutput.Replace($splitwiseStart.Environment['SPLITWISE_API_KEY'], '[redacted]') }
    if ($splitwiseProcess.ExitCode -ne 0) { throw 'Read-only account check failed. Stop for inspection.' }
} finally {
    if ($null -ne $splitwiseStart) { $splitwiseStart.Environment.Remove('SPLITWISE_API_KEY') | Out-Null }
    if ($splitwiseKeyPointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($splitwiseKeyPointer) }
    $splitwiseSecureKey.Dispose()
    if ($null -ne $splitwiseProcess) { $splitwiseProcess.Dispose() }
}
