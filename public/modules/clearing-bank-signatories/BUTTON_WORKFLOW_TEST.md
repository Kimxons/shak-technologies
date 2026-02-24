# 🔘 Button Workflow Testing Guide

## ✅ Complete Button State Workflow

### State 1: **INITIAL** (Page Load)
**Active Buttons:** VIEW, BACK  
**Disabled Buttons:** SHOW, ADD, EDIT, DELETE, SAVE, CANCEL

**Actions:**
- User can enter Signatory ID
- User clicks VIEW to search for signatory

---

### State 2A: **LOADED** (Signatory Found)
**Active Buttons:** EDIT, DELETE, BACK  
**Disabled Buttons:** SHOW, VIEW, ADD, SAVE, CANCEL

**Triggered when:** User enters existing signatory ID and clicks VIEW

**Actions:**
- Form populated with signatory data
- User can click EDIT to modify
- User can click DELETE to remove
- User can click BACK to return

---

### State 2B: **AFTER VIEW** (Signatory Not Found)
**Active Buttons:** ADD, CANCEL, BACK  
**Disabled Buttons:** SHOW, VIEW, EDIT, DELETE, SAVE

**Triggered when:** User enters non-existent signatory ID and clicks VIEW

**Actions:**
- Status message: "Signatory not found. You can add a new one."
- Signatory ID field retains entered value
- User can click ADD to create new record

---

### State 3: **ADD MODE**
**Active Buttons:** SAVE, CANCEL, BROWSE  
**Disabled Buttons:** SHOW, VIEW, ADD, EDIT, DELETE, BACK

**Triggered when:** User clicks ADD button (from afterView state)

**Actions:**
- Signatory ID field locked (preserved)
- Signatory Name field enabled and focused
- User can enter signatory name
- User can click BROWSE to select signature file
- User clicks SAVE to submit

---

### State 4: **EDIT MODE**
**Active Buttons:** SAVE, CANCEL  
**Disabled Buttons:** SHOW, VIEW, ADD, EDIT, DELETE, BACK, BROWSE

**Triggered when:** User clicks EDIT button (from loaded state)

**Actions:**
- All form fields enabled except Signatory ID (locked)
- User can modify signatory name
- User clicks SAVE to update

---

### State 5: **SAVE SUCCESS** → Returns to INITIAL
**Active Buttons:** VIEW, BACK  
**Disabled Buttons:** All others

**Triggered when:** Save operation completes successfully

**Actions:**
- Alert: "Data saved successfully!"
- Form cleared completely
- Ready for next operation
- Returns to INITIAL state

---

## 🧪 Testing Steps

### Test 1: View Non-Existent Signatory → Add New
1. **Open page** → Verify VIEW and BACK are enabled
2. **Enter ID:** `TEST123`
3. **Click VIEW** → Verify ADD, CANCEL, BACK are enabled
4. **Click ADD** → Verify SAVE, CANCEL, BROWSE are enabled
5. **Enter Name:** `Test Signatory`
6. **Click SAVE** → Verify alert appears
7. **After alert** → Verify form cleared, VIEW and BACK enabled

### Test 2: View Existing Signatory → Edit
1. **Open page** → Verify VIEW and BACK are enabled
2. **Enter ID:** (existing ID from database)
3. **Click VIEW** → Verify EDIT, DELETE, BACK are enabled, form populated
4. **Click EDIT** → Verify SAVE, CANCEL are enabled
5. **Modify Name**
6. **Click SAVE** → Verify alert appears
7. **After alert** → Verify form cleared, VIEW and BACK enabled

### Test 3: Cancel Operations
1. **From afterView state** → Click CANCEL → Returns to INITIAL
2. **From add mode** → Click CANCEL → Confirmation dialog → Returns to INITIAL
3. **From edit mode** → Click CANCEL → Confirmation dialog → Returns to INITIAL

---

## 📋 Button State Reference

| State | VIEW | ADD | EDIT | DELETE | SAVE | CANCEL | BACK | BROWSE |
|-------|------|-----|------|--------|------|--------|------|--------|
| **initial** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **afterView** | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| **add** | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ |
| **edit** | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| **loaded** | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |

---

## 🐛 Console Verification

Open Developer Tools (F12) and check for these messages:

```
✅ OtherStaticDataService loaded successfully
🔗 Attaching event listeners...
Found action buttons: 8
✅ Event listeners attached
🔧 Initializing form...
📋 Form elements: {statusMessage: true, form: true, ...}
🏦 Initialized with BankID: 04
🔘 Setting button state to: initial
Found 9/9 buttons
  ✅ VIEW enabled
  ✅ BACK enabled
✅ Signatory ID field enabled
✅ Form initialization complete
```

When clicking VIEW with non-existent ID:
```
View clicked
📤 Get signatory request: {...}
📥 Get signatory response: {...}
🔘 Setting button state to: afterView
  ✅ ADD enabled
  ✅ CANCEL enabled
  ✅ BACK enabled
```

When clicking ADD:
```
Add clicked
🔘 Setting button state to: add
  ✅ SAVE enabled
  ✅ CANCEL enabled
  ✅ BROWSE enabled
```

---

## ✅ Expected Behavior Summary

1. **Page loads** → Only VIEW and BACK work
2. **VIEW non-existent** → ADD, CANCEL, BACK work
3. **VIEW existing** → EDIT, DELETE, BACK work
4. **Click ADD** → SAVE, CANCEL, BROWSE work
5. **Click EDIT** → SAVE, CANCEL work
6. **Save success** → Alert → Form cleared → Back to VIEW and BACK only
7. **Click CANCEL** → Confirmation → Form cleared → Back to VIEW and BACK only

---

## 🚀 Quick Browser Test

Open the browser console and paste:

```javascript
// Test button states manually
const buttons = document.querySelectorAll('.action-button');
console.log('Total buttons:', buttons.length);
buttons.forEach(btn => {
    const action = btn.dataset.action;
    const disabled = btn.disabled;
    console.log(`${action}: ${disabled ? '❌ DISABLED' : '✅ ENABLED'}`);
});
```

This will show you the current state of all buttons.
