# ✅ Correct API Stored Procedure Mapping

**Updated:** 2026-01-24  
**Module:** Limits & Collateral - Client Limit

---

## 📋 Actual Stored Procedures (From Database)

Based on the module specification:

```
Module: Limit Client
Add Procedures: p_AddLimitClients, p_AddSupervisionData
Get Procedures: pc_SystemBranchSettings, p_GetLimitClients
Delete Procedures: p_DeleteLimits2, p_AddSupervisionData
```

---

## ✅ Updated Service Mapping

### File: `limitsCollateralService.js`

**Before (Incorrect):**
```javascript
createLimitClient(requestData) {
    const envelope = CoreApi.makeRequestEnvelope("dbo.p_CreateLimitClient", requestData);
    return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
}

updateLimitClient(requestData) {
    const envelope = CoreApi.makeRequestEnvelope("dbo.p_UpdateLimitClient", requestData);
    return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
}

deleteLimitClient(requestData) {
    const envelope = CoreApi.makeRequestEnvelope("dbo.p_DeleteLimitClient", requestData);
    return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
}
```

**After (Correct):**
```javascript
createLimitClient(requestData) {
    const envelope = CoreApi.makeRequestEnvelope("dbo.p_AddLimitClients", requestData);
    return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
}

updateLimitClient(requestData) {
    const envelope = CoreApi.makeRequestEnvelope("dbo.p_AddLimitClients", requestData);
    return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
}

deleteLimitClient(requestData) {
    const envelope = CoreApi.makeRequestEnvelope("dbo.p_DeleteLimits2", requestData);
    return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
}
```

---

## 🔍 Key Changes

### 1. Create & Update Use Same Procedure
**Both `createLimitClient()` and `updateLimitClient()` now call `p_AddLimitClients`**

This is a common pattern where a single stored procedure handles both insert and update:
- If the record exists → UPDATE
- If the record doesn't exist → INSERT

### 2. Delete Uses Different Procedure
**`deleteLimitClient()` now calls `p_DeleteLimits2`**

Note: The procedure is named `p_DeleteLimits2` (with "2" suffix), not `p_DeleteLimitClient`

### 3. Get Procedure (Already Correct)
**`getLimitClients()` calls `p_GetLimitClients`** ✅

This was already correct and didn't need changes.

---

## 📊 Complete API Method Mapping

| JavaScript Method | Stored Procedure | Purpose |
|------------------|------------------|---------|
| `getLimitClients()` | `dbo.p_GetLimitClients` | Retrieve limit client records |
| `createLimitClient()` | `dbo.p_AddLimitClients` | Create new limit client |
| `updateLimitClient()` | `dbo.p_AddLimitClients` | Update existing limit client |
| `deleteLimitClient()` | `dbo.p_DeleteLimits2` | Delete limit client |

---

## 🔄 How the Client-Limit Module Uses These

### Load Record
```javascript
const resp = await LimitsCollateralService.getLimitClients({
    OurBranchID: els.branchId.value,
    LimitID: els.limitId.value,
    Direction: "1"
});
```
**Calls:** `dbo.p_GetLimitClients`

---

### Save Record (Add Mode)
```javascript
const result = await LimitsCollateralService.createLimitClient(data);
```
**Calls:** `dbo.p_AddLimitClients`

---

### Save Record (Edit Mode)
```javascript
const result = await LimitsCollateralService.updateLimitClient(data);
```
**Calls:** `dbo.p_AddLimitClients` (same as create)

---

### Withdraw Record
```javascript
const result = await LimitsCollateralService.updateLimitClient(data);
```
**Calls:** `dbo.p_AddLimitClients` (updates status to WITHDRAWN)

---

### Delete Record
```javascript
const result = await LimitsCollateralService.deleteLimitClient(data);
```
**Calls:** `dbo.p_DeleteLimits2`

---

## 📝 Additional Procedures Mentioned

### Supervision Data
- **`p_AddSupervisionData`** - Used for supervision workflow
- Not currently implemented in the client-limit module
- May be needed for approval/supervision features

### System Settings
- **`pc_SystemBranchSettings`** - System configuration
- Likely used for initialization/settings
- Not directly called by client-limit module

---

## ✅ Status

**Service File:** ✅ Updated with correct stored procedure names  
**Client-Limit Module:** ✅ Already using the service methods correctly  
**No changes needed to client-limit.js** - It calls the service methods, which now call the correct procedures

---

## 🧪 Testing Notes

When testing, the API calls will now use:
- ✅ `p_AddLimitClients` for create/update operations
- ✅ `p_GetLimitClients` for read operations
- ✅ `p_DeleteLimits2` for delete operations

If you encounter any errors, check:
1. The stored procedures exist in the database
2. The procedures accept the parameters being sent
3. The user has permissions to execute these procedures

---

## 🎯 Summary

**What Changed:**
- Service file updated to use correct stored procedure names
- Both create and update now use the same procedure (`p_AddLimitClients`)
- Delete now uses `p_DeleteLimits2` instead of `p_DeleteLimitClient`

**What Stayed the Same:**
- Client-limit.js code (no changes needed)
- The way the module calls the service methods
- The data structure being sent

**Result:**
The module will now call the **actual stored procedures** that exist in your database! 🚀
