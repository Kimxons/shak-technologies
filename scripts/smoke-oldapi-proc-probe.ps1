param(
  [Parameter(Mandatory = $false)]
  [string]$OldApiUrl = "http://172.16.2.31:3306/api/OldAPI",

  [Parameter(Mandatory = $false)]
  [string]$ClientID = "2350005187",

  [Parameter(Mandatory = $false)]
  [int]$TimeoutSec = 15,

  [Parameter(Mandatory = $false)]
  [switch]$SkipToken,

  [Parameter(Mandatory = $false)]
  [string]$OutFile = "temp/oldapi_proc_probe.json"
)

$headers = @{"Content-Type" = "application/json" }
if ($SkipToken) {
  $headers["skipToken"] = "true"
}

function New-Envelope([string]$FormId, [hashtable]$RequestData) {
  return [ordered]@{
    RequestID    = ("{0}_{1}" -f $FormId, [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())
    FormID       = $FormId
    RequestData  = $RequestData
    RequestTime  = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss")
    AppName      = "PROJECT_KAIRO"
    Checksum     = ""
  }
}

function Get-Status($resp) {
  $msg = (($resp.Message | Out-String).Trim())
  if ($msg -match "Could not find stored procedure") { return "MISSING" }

  if ($resp.PSObject.Properties.Name -contains "Details") {
    $d0 = $resp.Details | Select-Object -First 1
    if ($null -ne $d0 -and ($d0.PSObject.Properties.Name -contains "ResponseCode")) {
      return $d0.ResponseCode
    }
  }

  if ($resp.PSObject.Properties.Name -contains "Status") {
    return $resp.Status
  }

  return "<unknown>"
}

$procs = @(
  "p_V1_CreateClientAddress","p_v1_UpdateClientAddress",
  "p_V1_CreateClientBasicDetails","p_v1_UpdateClientBasicDetails",
  "p_v1_CreateClientCorporate","p_v1_UpdateClientCorporate",
  "p_v1_CreateClientDocuments","p_v1_UpdateClientDocuments",
  "p_v1_CreateClientEmployment","p_v1_UpdateClientEmployment",
  "p_v1_CreateClientIndividual","p_v1_UpdateClientIndividual",
  "p_v1_CreateClientRelation","p_v1_UpdateClientRelation",
  "p_v1_CreateClientSpecialOffers","p_v1_UpdateClientSpecialOffers",
  "p_v1_CreateClientOtherDetails","p_v1_UpdateClientOtherDetails",
  "p_v1_CreateClientProductAndServices","p_v1_UpdateClientProductAndServices"
)

$stableRequestId = "SMOKE_{0}" -f ([Guid]::NewGuid().ToString("N"))
$results = @()

foreach ($p in $procs) {
  $env = New-Envelope $p @{ ClientID = $ClientID; RequestID = $stableRequestId }
  try {
    $resp = Invoke-RestMethod -Method Post -Uri $OldApiUrl -Headers $headers -Body ($env | ConvertTo-Json -Depth 12) -TimeoutSec $TimeoutSec
    $status = Get-Status $resp
    $msg = (($resp.Message | Out-String).Trim())

    # For common "expects parameter" errors, Message is on top-level.
    if (-not $msg -and $resp.Details -and $resp.Details.Count -gt 0) {
      $msg = ($resp.Details[0].ResponseMessage | Out-String).Trim()
    }

    $results += [pscustomobject]@{ Proc = $p; Status = $status; Message = ($msg -replace "\s+", " ") }
  }
  catch {
    $results += [pscustomobject]@{ Proc = $p; Status = "HTTPERR"; Message = $_.Exception.Message }
  }
}

# Ensure output folder exists
$outDir = Split-Path -Parent $OutFile
if ($outDir -and -not (Test-Path $outDir)) {
  New-Item -ItemType Directory -Force -Path $outDir | Out-Null
}

$results | ConvertTo-Json -Depth 4 | Out-File -Encoding UTF8 $OutFile
$results | Format-Table -AutoSize | Out-String -Width 220
"WROTE $OutFile"
