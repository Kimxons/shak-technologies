# ✅ Clearing Bank Signatories - Testing Instructions

## 🚀 Quick Test

1. **Open the page** in your browser:
   ```
   c:\Users\clara.wanjiru\Desktop\Kairo\kairo\public\modules\clearing-bank-signatories\clearing-bank-signatories.html
   ```

2. **Open Developer Tools** (Press F12)

3. **Check Console Output** - You should see:
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
   ✅ Clearing Bank Signatories module loaded
   🧪 Debug tools: window.SignatoriesDebug
   ```

## 🧪 Test Workflow

### Test 1: Initial State
- [ ] Only **VIEW** and **BACK** buttons are enabled
- [ ] All other buttons are disabled
- [ ] Signatory ID field is enabled for input
- [ ] All other form fields are disabled

### Test 2: View Non-Existent Signatory
1. Enter `TEST123` in Signatory ID field
2. Click **VIEW** button
3. **Expected**:
   - Console shows: `📤 Get signatory request:...`
   - Status message: "Signatory not found. You can add a new one."
   - **ADD**, **CANCEL**, and **BACK** buttons become enabled
   - All other buttons disabled

### Test 3: Add New Signatory
1. From previous state, click **ADD** button
2. **Expected**:
   - Console shows: `Add clicked`
   - Signatory ID `TEST123` is preserved
   - Signatory Name field becomes enabled and gets focus
   - **SAVE**, **CANCEL**, and **BROWSE** buttons become enabled
   - All other buttons disabled

### Test 4: Save Signatory
1. Enter `Test Signatory Name` in Signatory Name field
2. Click **SAVE** button
3. **Expected**:
   - Console shows: `💾 Save payload:...`
   - Alert dialog: "Data saved successfully!"
   - Form is cleared
   - Returns to initial state: only **VIEW** and **BACK** enabled

### Test 5: Cancel Operation
1. Enter a Signatory ID and click VIEW
2. Click ADD
3. Enter some data
4. Click **CANCEL**
5. **Expected**:
   - Confirmation dialog appears
   - Form is cleared
   - Returns to initial state

## 🐛 Debugging

If buttons are NOT working:

1. **Check Console for Errors**:
   ```javascript
   // In console, check if buttons were found
   document.querySelectorAll('.action-button').length
   // Should return 8
   ```

2. **Test Button Manually**:
   ```javascript
   // In console
   const viewBtn = document.querySelector('[data-action="view"]');
   console.log('View button:', viewBtn);
   console.log('Disabled?', viewBtn.disabled);
   ```

3. **Test Debug Tools**:
   ```javascript
   // In console
   SignatoriesDebug.testAdd();
   ```

## 🎯 What Should Work

✅ All 8 action buttons (Show, View, Add, Edit, Delete, Save, Cancel, Back)
✅ Browse button (shows alert)
✅ Search button (shows prompt)
✅ Button states change based on workflow
✅ Form fields enable/disable correctly
✅ Validation messages appear
✅ API calls are made (check Network tab)
✅ Success alert after save

## 📞 If Still Not Working

Share the **COMPLETE console output** including any errors in red.
