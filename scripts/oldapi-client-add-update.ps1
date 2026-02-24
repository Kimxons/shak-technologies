param(
  [Parameter(Mandatory = $false)]
  [string]$OldApiUrl = "http://172.16.2.31:3306/api/OldAPI",

  [Parameter(Mandatory = $false)]
  [string]$OurBranchID = "0101",

  [Parameter(Mandatory = $false)]
  [string]$UpdateClientID = "2350005187",

  [Parameter(Mandatory = $false)]
  [string]$OperatorID = "web_portal",

  [Parameter(Mandatory = $false)]
  [int]$TimeoutSec = 30,

  [Parameter(Mandatory = $false)]
  [switch]$SkipToken,

  [Parameter(Mandatory = $false)]
  [string]$OutFile = "temp/oldapi_add_update_results.json"
)

$headers = @{"Content-Type" = "application/json" }
if ($SkipToken) { $headers["skipToken"] = "true" }

function New-Envelope([string]$FormId, $RequestData) {
  return [ordered]@{
    RequestID    = ("{0}_{1}" -f $FormId, [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())
    FormID       = $FormId
    RequestData  = $RequestData
    RequestTime  = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss")
    AppName      = "PROJECT_KAIRO"
    Checksum     = ""
  }
}

function Invoke-OldApi([string]$Proc, $RequestData) {
  $env = New-Envelope $Proc $RequestData
  try {
    $resp = Invoke-RestMethod -Method Post -Uri $OldApiUrl -Headers $headers -Body ($env | ConvertTo-Json -Depth 30) -TimeoutSec $TimeoutSec
    return [pscustomobject]@{
      Proc = $Proc
      Ok = $true
      Raw = $resp
    }
  } catch {
    return [pscustomobject]@{
      Proc = $Proc
      Ok = $false
      Error = $_.Exception.Message
      Raw = $null
    }
  }
}

function Extract-OldApiDetails($raw) {
  if ($null -eq $raw) { return $null }
  if ($raw.PSObject.Properties.Name -notcontains "Details") { return $null }
  $d0 = $raw.Details | Select-Object -First 1
  if ($null -eq $d0) { return $null }
  if ($d0.PSObject.Properties.Name -notcontains "Details") { return $null }
  return $d0.Details
}

function Pick($value, $fallback) {
  if ($null -eq $value) { return $fallback }
  if ($value -is [string] -and [string]::IsNullOrWhiteSpace($value)) { return $fallback }
  return $value
}

function Get-OldApiPrimaryResponse($resp) {
  if (-not $resp) { return $null }

  $datasets = @("Details", "Details01", "Details02", "Details03", "Details04", "Details05")
  foreach ($ds in $datasets) {
    if ($resp.PSObject.Properties.Name -contains $ds) {
      $arr = $resp.$ds
      if ($arr -is [System.Collections.IEnumerable]) {
        foreach ($item in $arr) {
          if ($item -and ($item.PSObject.Properties.Name -contains "ResponseCode")) {
            return $item
          }
        }
      }
    }
  }

  return $null
}

function To-InvariantString($value, $fallback = "") {
  if ($null -eq $value) { return $fallback }
  if ($value -is [string]) {
    if ([string]::IsNullOrWhiteSpace($value)) { return $fallback }
    return $value
  }
  if ($value -is [datetime]) { return $value.ToString("s") }
  if ($value -is [DateTimeOffset]) { return $value.ToString("s") }
  try {
    return $value.ToString([System.Globalization.CultureInfo]::InvariantCulture)
  } catch {
    return [string]$value
  }
}

function To-OldApiBool01($value, $fallback = "0") {
  if ($null -eq $value) { return $fallback }
  if ($value -is [bool]) { return $(if ($value) { "1" } else { "0" }) }
  $s = To-InvariantString $value ""
  if ([string]::IsNullOrWhiteSpace($s)) { return $fallback }
  if ($s -match '^(1|true|y|yes)$') { return "1" }
  if ($s -match '^(0|false|n|no)$') { return "0" }
  return $fallback
}

function To-OldApiDateString($value, $fallback = "") {
  if ($null -eq $value) { return $fallback }
  if ($value -is [datetime]) { return $value.ToString("s") }
  if ($value -is [DateTimeOffset]) { return $value.ToString("s") }
  $s = To-InvariantString $value ""
  if ([string]::IsNullOrWhiteSpace($s)) { return $fallback }
  # Trim common full-ISO timestamps to date-time without timezone.
  if ($s -match '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}') { return $s.Substring(0,19) }
  return $s
}

function Summarize($callResult) {
  if (-not $callResult.Ok) {
    return [pscustomobject]@{ Proc = $callResult.Proc; Success = $false; Code = "HTTPERR"; Message = $callResult.Error }
  }

  $resp = $callResult.Raw
  $msg = (($resp.Message | Out-String).Trim())

  # OldAPI responses may put the status row in Details01.. etc.
  $d0 = Get-OldApiPrimaryResponse $resp
  $code = $null
  $innerMsg = $null
  if ($d0) {
    if ($d0.PSObject.Properties.Name -contains "ResponseCode") { $code = $d0.ResponseCode }
    if ($d0.PSObject.Properties.Name -contains "ResponseMessage") { $innerMsg = $d0.ResponseMessage }
  }

  $finalMsg = $innerMsg
  if (-not $finalMsg) { $finalMsg = $msg }
  if (-not $finalMsg) { $finalMsg = "<no message>" }

  $codeOut = $code
  if (-not $codeOut) { $codeOut = "<unknown>" }

  $dbInner = $null
  if ($d0 -and ($d0.PSObject.Properties.Name -contains "Details")) {
    $dbInner = $d0.Details
  }

  $extra = ""
  if ($codeOut -eq "DBEX50000" -and $dbInner -and ($dbInner.PSObject.Properties.Name -contains "DBErrorMessage")) {
    $extra = " (Inner=$($dbInner.DBErrorMessage))"
  }

  return [pscustomobject]@{
    Proc = $callResult.Proc
    Success = ($codeOut -eq "00")
    Code = $codeOut
    Message = ((($finalMsg -replace "\s+", " ").Trim()) + $extra)
  }
}

function Ensure-OutDir([string]$path) {
  $outDir = Split-Path -Parent $path
  if ($outDir -and -not (Test-Path $outDir)) {
    New-Item -ItemType Directory -Force -Path $outDir | Out-Null
  }
}

$stableRequestId = "RUN_{0}" -f ([Guid]::NewGuid().ToString("N"))
$now = (Get-Date).ToString("s")

# Generate an ID for add flow
$newClientId = "CL{0}{1}" -f (Get-Date -Format "yyyyMMddHHmmss"), (Get-Random -Minimum 100 -Maximum 999)
if ([string]::IsNullOrWhiteSpace($OurBranchID)) {
  # If branch is unknown, keep blank; server may reject and we will capture it.
  $OurBranchID = ""
}

$results = [ordered]@{
  Meta = [ordered]@{
    OldApiUrl = $OldApiUrl
    StableRequestId = $stableRequestId
    OperatorID = $OperatorID
    OurBranchID = $OurBranchID
    AddClientID = $newClientId
    UpdateClientID = $UpdateClientID
    RunAt = (Get-Date).ToString("o")
  }
  Add = @()
  Update = @()
}

Write-Host "=== ADD FLOW (ClientID=$newClientId) ==="

# 1) Create Basic Details
$addBasic = Invoke-OldApi "p_V1_CreateClientBasicDetails" @{
  RequestID = $stableRequestId
  OurBranchID = $OurBranchID
  ClientID = $newClientId
  ClientTypeID = "I"
  Name = "Test Client $newClientId"
  ApplicationID = $newClientId
  OpenedBy = $OperatorID
  OpenedDate = $now
  CreatedBy = $OperatorID
  CreatedOn = $now
  UpdateCount = 0
}
$results.Add += $addBasic
Summarize $addBasic | Format-Table -AutoSize | Out-String -Width 220 | Write-Host

# 2) Create Individual (send full key-set with safe defaults)
$addInd = Invoke-OldApi "p_v1_CreateClientIndividual" @{
  RequestID = $stableRequestId
  ClientID = $newClientId
  TitleID = ""
  FirstName = "Test"
  LastName = "Client"
  MiddleName = ""
  GenderID = ""
  NationalityID = ""
  IsDOBGiven = "0"
  DateOfBirth = ""
  Age = ""
  AgeAsOn = ""
  BloodGroupID = ""
  CanDonateBlood = "0"
  ResidentID = ""
  LiteracyLevelID = ""
  PassportNo = "32545345"
  PassportIssuedCityID = ""
  PassportExpiryDate = ""
  MaritalStatusID = ""
  SpouseID = ""
  NextOfKinID = ""
  NumberOfHouseMembers = ""
  NumberOfChildren = ""
  NumberOfDependents = ""
  IsSalaried = "1"
  OccupationID = ""
  DesignationID = ""
  CompanyTypeID = ""
  EmployerName = ""
  EmployerCode = ""
  WorkingSince = ""
  Salary = ""
  FamilyIncome = ""
  OtherIncome = ""
  RentExpense = ""
  OtherExpenses = ""
  WorkPermitNo = ""
  IdentificationTypeID = "DL"
  NationalId = ""
}
$results.Add += $addInd
Summarize $addInd | Format-Table -AutoSize | Out-String -Width 220 | Write-Host

# 3) Create Address (single)
$addAddr = Invoke-OldApi "p_V1_CreateClientAddress" @{
  RequestID = $stableRequestId
  AddressTypeID = "M"
  Address1 = "Test Address"
  Address2 = ""
  LandMark = ""
  CityID = "506"
  CountryID = "ET"
  ZipCode = ""
  Phone1 = ""
  Phone2 = ""
  Mobile = "0910000000"
  Fax = ""
  Email = ""
  IsMailingAddress = "1"
  CreatedBy = $OperatorID
  CreatedOn = $now
  SupervisedBy = ""
  SupervisedOn = ""
  UpdateCount = "0"
}
$results.Add += $addAddr
Summarize $addAddr | Format-Table -AutoSize | Out-String -Width 220 | Write-Host

# 4) Create Other Details
$addOther = Invoke-OldApi "p_v1_CreateClientOtherDetails" @{
  RequestID = $stableRequestId
  ClientID = $newClientId
  ExtraDetails = (ConvertTo-Json @{ ClientArea = ""; isdatacleansed = "1" } -Compress)
  CreatedBy = $OperatorID
  CreatedOn = $now
}
$results.Add += $addOther
Summarize $addOther | Format-Table -AutoSize | Out-String -Width 220 | Write-Host

# 5) Create Special Offers
$addOffers = Invoke-OldApi "p_v1_CreateClientSpecialOffers" @{
  RequestID = $stableRequestId
  ClientID = $newClientId
  CanSendAssociateSpecialOffer = "0"
  CanSendGreetings = "0"
  CanSendOurSpecialOffers = "0"
  eStatementRequired = "0"
  MobileAlertRequired = ""
}
$results.Add += $addOffers
Summarize $addOffers | Format-Table -AutoSize | Out-String -Width 220 | Write-Host

# 6) Create Product & Services
$prodArr = @(
  @{ "@RequestID" = $stableRequestId; RequestID = $stableRequestId; ClientID = $newClientId; SerialNo = 1; ProductTypeID = "CA"; ProductID = "AOS"; Description = "Advance on Salary"; IsSelected = 1; IsDefault = $null; CreatedBy = $OperatorID; CreatedOn = $null; ModifiedBy = $OperatorID; ModifiedOn = $null; SupervisedBy = $null; SupervisedOn = $null }
)
$svcArr = @(
  @{ "@RequestID" = $stableRequestId; RequestID = $stableRequestId; ClientID = $newClientId; SerialNo = 1; ID = "TypeOfServiceID"; SubCodeID = "CP"; CreatedBy = $OperatorID; ModifiedOn = $null; ModifiedBy = $OperatorID; StatusID = 0; SupervisedBy = $null; SupervisedOn = $null; CreatedOn = $null }
)
$addPS = Invoke-OldApi "p_v1_CreateClientProductAndServices" @{
  RequestID = $stableRequestId
  ClientID = $newClientId
  Products = ($prodArr | ConvertTo-Json -Depth 10 -Compress)
  Services = ($svcArr | ConvertTo-Json -Depth 10 -Compress)
  CreatedBy = $OperatorID
  CreatedOn = $now
}
$results.Add += $addPS
Summarize $addPS | Format-Table -AutoSize | Out-String -Width 220 | Write-Host

Write-Host "=== UPDATE FLOW (ClientID=$UpdateClientID) ==="

# GET current rows first (so we can replay required fields accurately)
$getAddr = Invoke-OldApi "p_v1_GetClientAddress" @{ RequestID = $stableRequestId; ClientID = $UpdateClientID }
$results.Update += $getAddr
Summarize $getAddr | Format-Table -AutoSize | Out-String -Width 220 | Write-Host

$addrRows0 = Extract-OldApiDetails $getAddr.Raw
$addrRow0 = $null
if ($addrRows0 -is [System.Collections.IEnumerable]) { $addrRow0 = $addrRows0 | Select-Object -First 1 }
$auditUser = Pick $addrRow0.CreatedBy $OperatorID

$getEmp = Invoke-OldApi "p_v1_GetClientEmployment" @{ RequestID = $stableRequestId; ClientID = $UpdateClientID }
$results.Update += $getEmp
Summarize $getEmp | Format-Table -AutoSize | Out-String -Width 220 | Write-Host

# If employment row is missing, create it first, then proceed to update.
$empInner = Extract-OldApiDetails $getEmp.Raw
$getEmpCode = $null
if ($getEmp.Raw -and ($getEmp.Raw.PSObject.Properties.Name -contains "Details")) {
  $tmp0 = $getEmp.Raw.Details | Select-Object -First 1
  if ($tmp0 -and ($tmp0.PSObject.Properties.Name -contains "ResponseCode")) { $getEmpCode = $tmp0.ResponseCode }
}

if ($getEmpCode -eq "DBEX000020") {
  $createEmp = Invoke-OldApi "p_v1_CreateClientEmployment" @{
    RequestID = $stableRequestId
    ClientID = $UpdateClientID
    EmployerID = ""
    DepartmentCodeID = ""
    WorkingSince = ""
    Salary = 0
    FamilyIncome = 0
    OtherIncome = 0
    RentExpense = 0
    OtherExpenses = 0
    WorkPermitNo = ""
    EmployerCode = ""
    AverageMonthlyIncome = 0
    AverageAnnualIncome = 0
    Occupationdescription = ""
    DesignationDescription = ""
    CompanytypeDescription = ""
    CreatedBy = $auditUser
    CreatedOn = $now
    ModifiedBy = $auditUser
    ModifiedOn = $now
    SupervisedBy = ""
    SupervisedOn = ""
    UpdateCount = 0
  }
  $results.Update += $createEmp
  Summarize $createEmp | Format-Table -AutoSize | Out-String -Width 220 | Write-Host

  # Re-fetch after create to get any server-side identifiers.
  $getEmp = Invoke-OldApi "p_v1_GetClientEmployment" @{ RequestID = $stableRequestId; ClientID = $UpdateClientID }
  $results.Update += $getEmp
  Summarize $getEmp | Format-Table -AutoSize | Out-String -Width 220 | Write-Host
}

# Update Basic Details (full key-set; many values are optional/blank in this runner)
$updBasic = Invoke-OldApi "p_v1_UpdateClientBasicDetails" @{
  RequestID = $stableRequestId
  ClientID = $UpdateClientID
  ClientTypeID = "I"
  Name = "Test Update $UpdateClientID"
  TitleID = ""
  OpenedBy = $OperatorID
  OpenedDate = $now
  ClientStatusID = ""
  CreatedBy = $OperatorID
  CreatedOn = $now
  ModifiedBy = $OperatorID
  ModifiedOn = $now
  ApprovedBy = ""
  ApprovedOn = ""
  UpdateCount = "0"
  WorkFlowID = ""
  WFStageID = ""
  PhotoID = ""
  SignID = ""
  LanguageID = ""
  RecommendedBy = ""
  KnowFrom = ""
  RelationshipManagerID = ""
  IdentificationTypeID = "DL"
  AMLStatusID = ""
}
$results.Update += $updBasic
Summarize $updBasic | Format-Table -AutoSize | Out-String -Width 220 | Write-Host

# Update Individual (full key-set with safe defaults)
$updInd = Invoke-OldApi "p_v1_UpdateClientIndividual" @{
  RequestID = $stableRequestId
  ClientID = $UpdateClientID
  BankID = ""
  Name = "Test Update $UpdateClientID"
  ClientTypeID = "I"
  TitleID = ""
  FirstName = "Test"
  LastName = "Client"
  MiddleName = ""
  GenderID = ""
  NationalityID = ""
  IsDOBGiven = "0"
  DateOfBirth = ""
  Age = ""
  AgeAsOn = ""
  BloodGroupID = ""
  CanDonateBlood = "0"
  ResidentID = ""
  LiteracyLevelID = ""
  PassportNo = "32545345"
  PassportIssuedCityID = ""
  PassportExpiryDate = ""
  MaritalStatusID = ""
  SpouseID = ""
  NextOfKinID = ""
  NumberOfHouseMembers = ""
  NumberOfChildren = ""
  NumberOfDependents = ""
  IsSalaried = "1"
  OccupationID = ""
  DesignationID = ""
  CompanyTypeID = ""
  EmployerName = ""
  EmployerCode = ""
  WorkingSince = ""
  Salary = ""
  FamilyIncome = ""
  OtherIncome = ""
  RentExpense = ""
  OtherExpenses = ""
  WorkPermitNo = ""
  IdentificationTypeID = "DL"
  AddressTypeID = ""
  Address1 = ""
  Address2 = ""
  CityID = ""
  CountryID = ""
  Zipcode = ""
  Phone1 = ""
  Phone2 = ""
  Mobile = ""
  Fax = ""
  Email = ""
  CanSendGreetings = ""
  CanSendOurSpecialOffers = ""
  CanSendAssociateSpecialOffer = ""
  eStatementRequired = ""
  MobileAlertRequired = ""
  NoOfEmployee = ""
  BusinessLineID = ""
  BusinessOwnershipID = ""
  BusinessStartedYear = ""
  OpenedBy = $OperatorID
  OpenedDate = $now
  ClientStatusID = ""
  Comments = ""
  CreatedBy = $OperatorID
  CreatedOn = $now
  SupervisedBy = ""
  SupervisedOn = ""
  ID1 = ""
  ID2 = ""
  TotalLimit = ""
  IsExpired = ""
  UpdateCount = "0"
  ClientClassID = ""
  BaseID = ""
  RelationshipManagerID = ""
  Region = ""
  Street = ""
  KRAPin = ""
  NextOfKinName = ""
  NextOfKinRelationship = ""
  NextOfKinMobile = ""
  NextOfKinEmail = ""
  ParentClientID = ""
  CountryIssued = ""
  Email2 = ""
  PhysicalAddress = ""
  NationalId = ""
}
$results.Update += $updInd
Summarize $updInd | Format-Table -AutoSize | Out-String -Width 220 | Write-Host

# Update Address (single row; placeholder values)
$addrRows = Extract-OldApiDetails $getAddr.Raw
$addrRow = $null
if ($addrRows -is [System.Collections.IEnumerable]) {
  $addrRow = $addrRows | Select-Object -First 1
}

$addrRequestId = Pick $addrRow.RequestID $stableRequestId

$addrUpdateCount = 1
try { $addrUpdateCount = [int](Pick $addrRow.UpdateCount 0) + 1 } catch { $addrUpdateCount = 1 }

$updAddrData = @{
  RequestID = $addrRequestId
  ClientID = $UpdateClientID
  AddressTypeID = (Pick $addrRow.AddressTypeID "")
  Address1 = (Pick $addrRow.Address1 "Updated Address")
  Address2 = (Pick $addrRow.Address2 "")
  LandMark = (Pick $addrRow.LandMark "")
  CityID = (Pick $addrRow.CityID "")
  CountryID = (Pick $addrRow.CountryID "")
  ZipCode = (Pick $addrRow.ZipCode "")
  Phone1 = (Pick $addrRow.Phone1 "")
  Phone2 = (Pick $addrRow.Phone2 "")
  Mobile = (Pick $addrRow.Mobile "")
  Fax = (Pick $addrRow.Fax "")
  Email = (Pick $addrRow.Email "")
  IsMailingAddress = (To-OldApiBool01 (Pick $addrRow.IsMailingAddress $true) "1")
  CreatedBy = (Pick $addrRow.CreatedBy $OperatorID)
  CreatedOn = (To-OldApiDateString (Pick $addrRow.CreatedOn $now) $now)
  ModifiedBy = $auditUser
  ModifiedOn = (To-OldApiDateString $now $now)
  SupervisedBy = (Pick $addrRow.SupervisedBy "")
  SupervisedOn = (To-OldApiDateString (Pick $addrRow.SupervisedOn "") "")
  UpdateCount = (To-InvariantString $addrUpdateCount "1")
}

$updAddr = Invoke-OldApi "p_v1_UpdateClientAddress" $updAddrData
$results.Update += $updAddr
Summarize $updAddr | Format-Table -AutoSize | Out-String -Width 220 | Write-Host

# Update Employment (safe defaults)
$empRows = Extract-OldApiDetails $getEmp.Raw
$empRow = $null
if ($empRows -is [System.Collections.IEnumerable]) {
  $empRow = $empRows | Select-Object -First 1
}

$empRequestId = Pick $empRow.RequestID $stableRequestId

$empUpdateCount = 1
try { $empUpdateCount = [int](Pick $empRow.UpdateCount 0) + 1 } catch { $empUpdateCount = 1 }

$updEmpData = @{
  RequestID = $empRequestId
  ClientID = $UpdateClientID
  EmployerID = (Pick $empRow.EmployerID "")
  DepartmentCodeID = (Pick $empRow.DepartmentCodeID "")
  WorkingSince = (To-OldApiDateString (Pick $empRow.WorkingSince "") "")
  Salary = (To-InvariantString (Pick $empRow.Salary 0) "0")
  FamilyIncome = (To-InvariantString (Pick $empRow.FamilyIncome 0) "0")
  OtherIncome = (To-InvariantString (Pick $empRow.OtherIncome 0) "0")
  RentExpense = (To-InvariantString (Pick $empRow.RentExpense 0) "0")
  OtherExpenses = (To-InvariantString (Pick $empRow.OtherExpenses 0) "0")
  WorkPermitNo = (Pick $empRow.WorkPermitNo "")
  EmployerCode = (Pick $empRow.EmployerCode "")
  AverageMonthlyIncome = (To-InvariantString (Pick $empRow.AverageMonthlyIncome 0) "0")
  AverageAnnualIncome = (To-InvariantString (Pick $empRow.AverageAnnualIncome 0) "0")
  Occupationdescription = (Pick $empRow.Occupationdescription "")
  DesignationDescription = (Pick $empRow.DesignationDescription "")
  CompanytypeDescription = (Pick $empRow.CompanytypeDescription "")
  CreatedBy = (Pick $empRow.CreatedBy $OperatorID)
  CreatedOn = (To-OldApiDateString (Pick $empRow.CreatedOn $now) $now)
  ModifiedBy = $auditUser
  ModifiedOn = (To-OldApiDateString $now $now)
  SupervisedBy = (Pick $empRow.SupervisedBy "")
  SupervisedOn = (To-OldApiDateString (Pick $empRow.SupervisedOn "") "")
  UpdateCount = (To-InvariantString $empUpdateCount "1")
}

$updEmp = Invoke-OldApi "p_v1_UpdateClientEmployment" $updEmpData
$results.Update += $updEmp
Summarize $updEmp | Format-Table -AutoSize | Out-String -Width 220 | Write-Host

# Update Other Details (known to succeed per previous probe)
$updOther = Invoke-OldApi "p_v1_UpdateClientOtherDetails" @{
  RequestID = $stableRequestId
  ClientID = $UpdateClientID
  ExtraDetails = (ConvertTo-Json @{ ClientArea = ""; isdatacleansed = "1"; modifiedBy = $OperatorID } -Compress)
  ModifiedBy = $OperatorID
  ModifiedOn = $now
}
$results.Update += $updOther
Summarize $updOther | Format-Table -AutoSize | Out-String -Width 220 | Write-Host

# Update Special Offers
$updOffers = Invoke-OldApi "p_v1_UpdateClientSpecialOffers" @{
  RequestID = $stableRequestId
  ClientID = $UpdateClientID
  CanSendAssociateSpecialOffer = "0"
  CanSendGreetings = "0"
  CanSendOurSpecialOffers = "0"
  eStatementRequired = "0"
  MobileAlertRequired = ""
}
$results.Update += $updOffers
Summarize $updOffers | Format-Table -AutoSize | Out-String -Width 220 | Write-Host

# Update Product & Services (may fail with edit-lock; capture response)
$updProdArr = @(
  @{ "@RequestID" = $stableRequestId; RequestID = $stableRequestId; ClientID = $UpdateClientID; SerialNo = 1; ProductTypeID = "CA"; ProductID = "AOS"; Description = "Advance on Salary"; IsSelected = 1; IsDefault = $null; CreatedBy = $OperatorID; CreatedOn = $null; ModifiedBy = $OperatorID; ModifiedOn = $null; SupervisedBy = $null; SupervisedOn = $null }
)
$updSvcArr = @(
  @{ "@RequestID" = $stableRequestId; RequestID = $stableRequestId; ClientID = $UpdateClientID; SerialNo = 1; ID = "TypeOfServiceID"; SubCodeID = "CP"; CreatedBy = $OperatorID; ModifiedOn = $null; ModifiedBy = $OperatorID; StatusID = 0; SupervisedBy = $null; SupervisedOn = $null; CreatedOn = $null }
)

$updPS = Invoke-OldApi "p_v1_UpdateClientProductAndServices" @{
  RequestID = $stableRequestId
  ClientID = $UpdateClientID
  Products = ($updProdArr | ConvertTo-Json -Depth 10 -Compress)
  Services = ($updSvcArr | ConvertTo-Json -Depth 10 -Compress)
  ModifiedBy = $OperatorID
  ModifiedOn = $now
}
$results.Update += $updPS
Summarize $updPS | Format-Table -AutoSize | Out-String -Width 220 | Write-Host

Ensure-OutDir $OutFile
$results | ConvertTo-Json -Depth 30 | Out-File -Encoding UTF8 $OutFile
Write-Host "WROTE $OutFile"
