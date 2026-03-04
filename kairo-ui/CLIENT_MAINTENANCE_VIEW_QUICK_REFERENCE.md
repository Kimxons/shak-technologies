# Client Maintenance Views - Dropdown Usage Quick Reference

## Overview
Quick reference guide for using the new `DropdownCodeItem` type in Client Maintenance Razor views.

---

## Standard Dropdown Pattern

### Basic Dropdown
```razor
@using CBS.Entities.SystemCore
@{
    var options = ViewData["TitleOptions"] as List<DropdownCodeItem> ?? new();
}

<div class="col-4">
    <label class="label-blue" for="ddl_title" id="lbl_title">Title</label>
    <select id="ddl_title" name="title" class="bs-select">
        <option value="">-- Select Title --</option>
        @foreach (var option in options)
        {
            <option value="@option.Value">@option.Label</option>
      }
    </select>
</div>
```

---

## By Controller/Tab

### 1. Relations Tab (_ClientRelations.cshtml)

```razor
@using CBS.Entities.SystemCore
@{
    var relationTypeOptions = ViewData["RelationTypeOptions"] as List<DropdownCodeItem> ?? new();
    var titleOptions = ViewData["RelationTitleOptions"] as List<DropdownCodeItem> ?? new();
    var genderOptions = ViewData["RelationGenderOptions"] as List<DropdownCodeItem> ?? new();
    var relationOptions = ViewData["RelationOptions"] as List<DropdownCodeItem> ?? new();
}

<!-- Relation Type Dropdown -->
<select id="ddl_relationType" name="relationTypeId" class="bs-select">
    <option value="">-- Select Relation Type --</option>
    @foreach (var option in relationTypeOptions)
    {
        <option value="@option.Value">@option.Label</option>
    }
</select>

<!-- Title Dropdown -->
<select id="ddl_relationTitle" name="titleId" class="bs-select">
    <option value="">-- Select Title --</option>
    @foreach (var option in titleOptions)
    {
        <option value="@option.Value">@option.Label</option>
    }
</select>

<!-- Gender Dropdown -->
<select id="ddl_relationGender" name="genderId" class="bs-select">
    <option value="">-- Select Gender --</option>
    @foreach (var option in genderOptions)
    {
        <option value="@option.Value">@option.Label</option>
    }
</select>

<!-- Relation Dropdown -->
<select id="ddl_relation" name="relationId" class="bs-select">
    <option value="">-- Select Relation --</option>
    @foreach (var option in relationOptions)
    {
        <option value="@option.Value">@option.Label</option>
    }
</select>
```

---

### 2. Personal Tab (_ClientPersonal.cshtml)

```razor
@using CBS.Entities.SystemCore
@{
    var titleOptions = ViewData["TitleOptions"] as List<DropdownCodeItem> ?? new();
    var genderOptions = ViewData["GenderOptions"] as List<DropdownCodeItem> ?? new();
    var nationalityOptions = ViewData["NationalityOptions"] as List<DropdownCodeItem> ?? new();
    var residentOptions = ViewData["ResidentOptions"] as List<DropdownCodeItem> ?? new();
    var identificationTypeOptions = ViewData["IdentificationTypeOptions"] as List<DropdownCodeItem> ?? new();
    var literacyLevelOptions = ViewData["LiteracyLevelOptions"] as List<DropdownCodeItem> ?? new();
    var maritalStatusOptions = ViewData["MaritalStatusOptions"] as List<DropdownCodeItem> ?? new();
    var bloodGroupOptions = ViewData["BloodGroupOptions"] as List<DropdownCodeItem> ?? new();
    var relationshipManagerOptions = ViewData["RelationshipManagerOptions"] as List<DropdownCodeItem> ?? new();
}

<!-- Example dropdowns -->
<select id="ddl_title" name="titleId" class="bs-select">
    <option value="">-- Select Title --</option>
    @foreach (var option in titleOptions)
    {
   <option value="@option.Value">@option.Label</option>
    }
</select>

<select id="ddl_gender" name="genderId" class="bs-select">
    <option value="">-- Select Gender --</option>
    @foreach (var option in genderOptions)
{
      <option value="@option.Value">@option.Label</option>
    }
</select>

<select id="ddl_nationality" name="nationalityId" class="bs-select">
    <option value="">-- Select Nationality --</option>
 @foreach (var option in nationalityOptions)
    {
        <option value="@option.Value">@option.Label</option>
    }
</select>

<select id="ddl_resident" name="residentId" class="bs-select">
    <option value="">-- Select Resident Status --</option>
    @foreach (var option in residentOptions)
    {
  <option value="@option.Value">@option.Label</option>
    }
</select>

<select id="ddl_identificationType" name="identificationTypeId" class="bs-select">
    <option value="">-- Select ID Type --</option>
    @foreach (var option in identificationTypeOptions)
    {
        <option value="@option.Value">@option.Label</option>
    }
</select>

<select id="ddl_literacyLevel" name="literacyLevelId" class="bs-select">
    <option value="">-- Select Literacy Level --</option>
    @foreach (var option in literacyLevelOptions)
    {
        <option value="@option.Value">@option.Label</option>
    }
</select>

<select id="ddl_maritalStatus" name="maritalStatusId" class="bs-select">
    <option value="">-- Select Marital Status --</option>
    @foreach (var option in maritalStatusOptions)
    {
        <option value="@option.Value">@option.Label</option>
    }
</select>

<select id="ddl_bloodGroup" name="bloodGroupId" class="bs-select">
    <option value="">-- Select Blood Group --</option>
    @foreach (var option in bloodGroupOptions)
    {
        <option value="@option.Value">@option.Label</option>
    }
</select>

<select id="ddl_relationshipManager" name="relationshipManagerId" class="bs-select">
    <option value="">-- Select Relationship Manager --</option>
    @foreach (var option in relationshipManagerOptions)
    {
        <option value="@option.Value">@option.Label</option>
    }
</select>
```

---

### 3. Corporate Tab (_ClientCorporate.cshtml)

```razor
@using CBS.Entities.SystemCore
@{
    var businessOwnershipOptions = ViewData["CorporateBusinessOwnershipOptions"] as List<DropdownCodeItem> ?? new();
    var businessLineOptions = ViewData["CorporateBusinessLineOptions"] as List<DropdownCodeItem> ?? new();
    var identificationTypeOptions = ViewData["CorporateIdentificationTypeOptions"] as List<DropdownCodeItem> ?? new();
    var countryOptions = ViewData["CorporateCountryOptions"] as List<DropdownCodeItem> ?? new();
    var relationshipManagerOptions = ViewData["CorporateRelationshipManagerOptions"] as List<DropdownCodeItem> ?? new();
}

<select id="ddl_corporateBusinessOwnership" name="businessOwnershipId" class="bs-select">
  <option value="">-- Select Business Ownership --</option>
    @foreach (var option in businessOwnershipOptions)
    {
        <option value="@option.Value">@option.Label</option>
    }
</select>

<select id="ddl_corporateBusinessLine" name="businessLineId" class="bs-select">
    <option value="">-- Select Business Line --</option>
    @foreach (var option in businessLineOptions)
    {
        <option value="@option.Value">@option.Label</option>
    }
</select>

<select id="ddl_corporateIdentificationType" name="identificationTypeId" class="bs-select">
    <option value="">-- Select ID Type --</option>
  @foreach (var option in identificationTypeOptions)
    {
        <option value="@option.Value">@option.Label</option>
    }
</select>

<select id="ddl_corporateCountry" name="countryId" class="bs-select">
    <option value="">-- Select Country --</option>
    @foreach (var option in countryOptions)
    {
        <option value="@option.Value">@option.Label</option>
    }
</select>

<select id="ddl_corporateRelationshipManager" name="relationshipManagerId" class="bs-select">
    <option value="">-- Select Relationship Manager --</option>
    @foreach (var option in relationshipManagerOptions)
    {
        <option value="@option.Value">@option.Label</option>
    }
</select>
```

---

### 4. Employment Tab (_ClientEmployment.cshtml)

```razor
@using CBS.Entities.SystemCore
@{
    var occupationOptions = ViewData["EmploymentOccupationOptions"] as List<DropdownCodeItem> ?? new();
    var designationOptions = ViewData["EmploymentDesignationOptions"] as List<DropdownCodeItem> ?? new();
    var companyTypeOptions = ViewData["EmploymentCompanyTypeOptions"] as List<DropdownCodeItem> ?? new();
    var businessOwnershipOptions = ViewData["EmploymentBusinessOwnershipOptions"] as List<DropdownCodeItem> ?? new();
    var businessLineOptions = ViewData["EmploymentBusinessLineOptions"] as List<DropdownCodeItem> ?? new();
}

<select id="ddl_employmentOccupation" name="occupationId" class="bs-select">
    <option value="">-- Select Occupation --</option>
    @foreach (var option in occupationOptions)
    {
        <option value="@option.Value">@option.Label</option>
    }
</select>

<select id="ddl_employmentDesignation" name="designationId" class="bs-select">
    <option value="">-- Select Designation --</option>
    @foreach (var option in designationOptions)
    {
        <option value="@option.Value">@option.Label</option>
    }
</select>

<select id="ddl_employmentCompanyType" name="companyTypeId" class="bs-select">
  <option value="">-- Select Company Type --</option>
    @foreach (var option in companyTypeOptions)
    {
  <option value="@option.Value">@option.Label</option>
    }
</select>

<select id="ddl_employmentBusinessOwnership" name="businessOwnershipId" class="bs-select">
    <option value="">-- Select Business Ownership --</option>
    @foreach (var option in businessOwnershipOptions)
    {
     <option value="@option.Value">@option.Label</option>
    }
</select>

<select id="ddl_employmentBusinessLine" name="businessLineId" class="bs-select">
    <option value="">-- Select Business Line --</option>
    @foreach (var option in businessLineOptions)
    {
    <option value="@option.Value">@option.Label</option>
    }
</select>
```

---

### 5. KYC Tab (_ClientKyc.cshtml)

```razor
@using CBS.Entities.SystemCore
@{
    var clientAreaOptions = ViewData["KycClientAreaOptions"] as List<DropdownCodeItem> ?? new();
    var personalStatusOptions = ViewData["KycPersonalStatusOptions"] as List<DropdownCodeItem> ?? new();
    var closeLawSuitOptions = ViewData["KycCloseLawSuitOptions"] as List<DropdownCodeItem> ?? new();
    var cnfsoOptions = ViewData["KycCnfsoOptions"] as List<DropdownCodeItem> ?? new();
}

<select id="ddl_kycClientArea" name="clientArea" class="bs-select">
    <option value="">-- Select Client Area --</option>
    @foreach (var option in clientAreaOptions)
    {
        <option value="@option.Value">@option.Label</option>
    }
</select>

<select id="ddl_kycPersonalStatus" name="personalStatusId" class="bs-select">
    <option value="">-- Select Personal Status --</option>
    @foreach (var option in personalStatusOptions)
    {
        <option value="@option.Value">@option.Label</option>
    }
</select>

<select id="ddl_kycCloseLawSuit" name="closeLawSuitId" class="bs-select">
    <option value="">-- Select Close Law Suit --</option>
    @foreach (var option in closeLawSuitOptions)
    {
        <option value="@option.Value">@option.Label</option>
    }
</select>

<select id="ddl_kycCnfso" name="cnfso" class="bs-select">
    <option value="">-- Select CNFSO --</option>
    @foreach (var option in cnfsoOptions)
    {
        <option value="@option.Value">@option.Label</option>
    }
</select>
```

---

### 6. Address Tab (_ClientAddress.cshtml)

```razor
@using CBS.Entities.SystemCore
@{
    var addressTypeOptions = ViewData["AddressTypeOptions"] as List<DropdownCodeItem> ?? new();
}

<select id="ddl_addressType" name="addressTypeId" class="bs-select">
    <option value="">-- Select Address Type --</option>
    @foreach (var option in addressTypeOptions)
    {
        <option value="@option.Value">@option.Label</option>
    }
</select>
```

---

## Advanced Patterns

### 1. Pre-select a Value
```razor
<select id="ddl_title" name="titleId" class="bs-select">
    <option value="">-- Select Title --</option>
    @foreach (var option in titleOptions)
    {
     <option value="@option.Value" selected="@(option.Value == Model?.TitleId)">
            @option.Label
     </option>
    }
</select>
```

### 2. Add Data Attributes for JavaScript
```razor
<select id="ddl_title" name="titleId" class="bs-select">
    <option value="">-- Select Title --</option>
    @foreach (var option in titleOptions)
    {
        <option value="@option.Value" 
      data-code-id="@option.CodeID"
       data-parent-code-id="@option.ParentCodeID"
                data-display-order="@option.DisplayOrder">
 @option.Label
        </option>
    }
</select>
```

### 3. Cascading Dropdown (Parent-Child)
```razor
@{
    var countryOptions = ViewData["CountryOptions"] as List<DropdownCodeItem> ?? new();
    var cityOptions = ViewData["CityOptions"] as List<DropdownCodeItem> ?? new();
    var citiesJson = System.Text.Json.JsonSerializer.Serialize(cityOptions);
}

<!-- Parent Dropdown -->
<select id="ddl_country" name="countryId" class="bs-select" onchange="filterCities()">
    <option value="">-- Select Country --</option>
    @foreach (var option in countryOptions)
    {
        <option value="@option.Value">@option.Label</option>
    }
</select>

<!-- Child Dropdown -->
<select id="ddl_city" name="cityId" class="bs-select">
    <option value="">-- Select City --</option>
</select>

<script>
    const allCities = @Html.Raw(citiesJson);
    
    function filterCities() {
        const countryId = document.getElementById('ddl_country').value;
        const citySelect = document.getElementById('ddl_city');
        
      citySelect.innerHTML = '<option value="">-- Select City --</option>';
        
        allCities
    .filter(c => c.parentCodeID === countryId)
            .forEach(city => {
 const opt = document.createElement('option');
         opt.value = city.value;
          opt.textContent = city.label;
        citySelect.appendChild(opt);
            });
    }
</script>
```

### 4. Disable Option Based on Condition
```razor
<select id="ddl_title" name="titleId" class="bs-select">
    <option value="">-- Select Title --</option>
    @foreach (var option in titleOptions)
    {
        <option value="@option.Value" 
       disabled="@(option.Value == "DISABLED_CODE")">
  @option.Label
  </option>
    }
</select>
```

---

## Property Reference

| Property | Type | Description | Example |
|----------|------|-------------|---------|
| `CodeID` | `string` | System code identifier | "TitleID" |
| `ParentCodeID` | `string?` | Parent code (for hierarchical dropdowns) | "ETH" |
| `Value` | `string` | Form value (from SubCodeID) | "Mr" |
| `Label` | `string` | Display text (from CodeDescription) | "Mr." |
| `DisplayOrder` | `int` | Sort order | 1 |

---

## Common Patterns

### Empty Check
```razor
@if (titleOptions.Any())
{
  <select id="ddl_title" name="titleId" class="bs-select">
        <option value="">-- Select Title --</option>
        @foreach (var option in titleOptions)
        {
         <option value="@option.Value">@option.Label</option>
        }
    </select>
}
else
{
    <p class="text-muted">No title options available</p>
}
```

### Group Options by Parent
```razor
@foreach (var parentGroup in titleOptions.GroupBy(o => o.ParentCodeID))
{
    <optgroup label="@(parentGroup.Key ?? "Main")">
        @foreach (var option in parentGroup)
        {
    <option value="@option.Value">@option.Label</option>
  }
    </optgroup>
}
```

---

## Migration from SystemCodeDetail

### Old Pattern (SystemCodeDetail)
```razor
@using CBS.Entities.SystemCore
@{
    var options = ViewData["TitleOptions"] as List<SystemCodeDetail> ?? new();
}

<select>
    @foreach (var option in options)
    {
        <option value="@option.SubCodeID">
  @(option.CodeDescription ?? option.SubCodeID)
  </option>
    }
</select>
```

### New Pattern (DropdownCodeItem)
```razor
@using CBS.Entities.SystemCore
@{
    var options = ViewData["TitleOptions"] as List<DropdownCodeItem> ?? new();
}

<select>
    @foreach (var option in options)
    {
    <option value="@option.Value">@option.Label</option>
  }
</select>
```

---

## Testing Checklist

- [ ] Verify dropdowns render with correct options
- [ ] Check that values are correct (form submission works)
- [ ] Verify labels display properly
- [ ] Test cascading dropdowns (if applicable)
- [ ] Check empty state handling
- [ ] Test pre-selection of values
- [ ] Verify sorting by DisplayOrder
- [ ] Check console for errors

---

## See Also

- `CLIENT_MAINTENANCE_DROPDOWN_MIGRATION.md` - Full migration details
- `DROPDOWNCODEITEM_IMPLEMENTATION_SUMMARY.md` - Implementation overview
- `GETMULTIPLEDROPDOWNCODEOPTIONS_USAGE_GUIDE.md` - Detailed usage guide
- `CBS.Entities.SystemCore\DROPDOWNCODEITEM_README.md` - POCO documentation

---

**Version:** 1.0  
**Date:** January 2025  
**Status:** ? Ready for Implementation
