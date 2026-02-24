param(
  [Parameter(Mandatory = $false)]
  [string]$OldApiUrl = "http://172.16.2.31:3306/api/OldAPI",

  [Parameter(Mandatory = $false)]
  [string]$ClientID = "2350005187",

  [Parameter(Mandatory = $false)]
  [int]$TimeoutSec = 20,

  [Parameter(Mandatory = $false)]
  [switch]$SkipToken
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

function Get-OldApiResponseCode($resp) {
  if ($null -eq $resp) { return "<null>" }

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

function Get-OldApiResponseMessage($resp) {
  if ($null -eq $resp) { return "" }

  if ($resp.PSObject.Properties.Name -contains "Details") {
    $d0 = $resp.Details | Select-Object -First 1
    if ($null -ne $d0 -and ($d0.PSObject.Properties.Name -contains "ResponseMessage")) {
      return $d0.ResponseMessage
    }
  }

  if ($resp.PSObject.Properties.Name -contains "Message") {
    return ($resp.Message | Out-String).Trim()
  }

  return ""
}

$procs = @(
  "p_v1_GetClientBasicDetails",
  "p_v1_GetClientIndividual",
  "p_v1_GetClientCorporate",
  "p_v1_GetClientAddress",
  "p_v1_GetClientEmployment",
  "p_v1_GetClientRelation",
  "p_v1_GetClientDocuments",
  "p_v1_GetSpecialOffers",
  "p_v1_GetOtherDetails",
  "p_v1_GetProductAndServices"
)

$stableRequestId = "SMOKE_{0}" -f ([Guid]::NewGuid().ToString("N"))
$results = @()

foreach ($p in $procs) {
  $env = New-Envelope $p @{ ClientID = $ClientID; RequestID = $stableRequestId }
  try {
    $resp = Invoke-RestMethod -Method Post -Uri $OldApiUrl -Headers $headers -Body ($env | ConvertTo-Json -Depth 12) -TimeoutSec $TimeoutSec
    $results += [pscustomobject]@{
      Proc    = $p
      Code    = (Get-OldApiResponseCode $resp)
      Message = (Get-OldApiResponseMessage $resp)
    }
  }
  catch {
    $results += [pscustomobject]@{
      Proc    = $p
      Code    = "HTTPERR"
      Message = $_.Exception.Message
    }
  }
}

$results | Format-Table -AutoSize | Out-String -Width 220
