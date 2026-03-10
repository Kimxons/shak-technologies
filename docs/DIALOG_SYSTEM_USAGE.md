# Generic Dialog System - Usage Guide

## Overview

The AppCore now includes a powerful generic dialog system that supports multiple dialog types with customizable handlers and content. This replaces the need for creating custom modal HTML for common scenarios.

## Available Dialog Types

1. **Confirmation** - Yes/No or Confirm/Cancel dialogs
2. **Alert** - Single OK button informational dialogs
3. **Prompt** - Input field dialogs for single-line text
4. **Remarks** - Textarea dialogs for multi-line text with character counter
5. **Custom** - Fully customizable buttons and behavior

## Basic Usage

### 1. Confirmation Dialog

Simple yes/no confirmation with Cancel and Confirm buttons.

```javascript
// Basic confirmation
const confirmed = await AppCore.showConfirmation(
    'Delete Item',
    'Are you sure you want to delete this item?'
);

if (confirmed) {
    // User clicked Confirm
    console.log('User confirmed');
} else {
    // User clicked Cancel or closed dialog
    console.log('User cancelled');
}
```

### 2. Alert Dialog

Informational dialog with single OK button.

```javascript
// Show alert
await AppCore.showAlert(
    'Success',
    'Your changes have been saved successfully.'
);
```

### 3. Prompt Dialog

Get single-line text input from user.

```javascript
// Get user input
const username = await AppCore.showPrompt(
    'Enter Username',
    'Please enter your username:',
    'john.doe' // placeholder
);

if (username) {
    console.log('Username entered:', username);
} else {
    console.log('User cancelled');
}
```

### 4. Remarks Dialog

Get multi-line text input with character counter.

```javascript
// Get remarks with character limit
const remarks = await AppCore.showRemarks(
    'Enter Remarks',
    'Please provide your remarks:',
    {
        placeholder: 'Type your remarks here...',
        maxLength: 500,
        required: true
    }
);

if (remarks) {
    console.log('Remarks:', remarks);
}
```

## Advanced Usage

### Generic showDialog Method

For maximum flexibility, use the generic `showDialog` method:

```javascript
const result = await AppCore.showDialog({
    type: 'confirmation',           // Dialog type
    title: 'Custom Title',          // Dialog title
    message: 'Custom message',      // Dialog content
    dialogId: 'my-dialog-1',        // Optional unique ID
    buttons: { /* custom buttons */ },
    input: { /* input configuration */ },
    config: { /* additional config */ }
});
```

### Custom Buttons

Create dialogs with custom button configurations:

```javascript
const result = await AppCore.showDialog({
    type: 'custom',
    title: 'Choose Action',
    message: 'What would you like to do?',
    buttons: {
        list: [
            { 
                label: 'Approve', 
                variant: 'success', 
                value: 'approve' 
            },
            { 
                label: 'Reject', 
                variant: 'danger', 
                value: 'reject' 
            },
            { 
                label: 'Cancel', 
                variant: 'outline-secondary', 
                value: null 
            }
        ]
    }
});

switch (result) {
    case 'approve':
        console.log('Approved');
        break;
    case 'reject':
        console.log('Rejected');
        break;
    default:
        console.log('Cancelled');
}
```

### Custom Button Handlers

Add custom logic to buttons with handler functions:

```javascript
const result = await AppCore.showDialog({
    type: 'custom',
    title: 'Process Item',
    message: 'Are you sure you want to process this item?',
    buttons: {
        list: [
            { 
                label: 'Cancel', 
                variant: 'secondary', 
                value: null 
            },
            { 
                label: 'Process', 
                variant: 'primary',
                value: 'process',
                handler: async (inputValue) => {
                    // Custom validation or async operations
                    const isValid = await validateSomething();
                    
                    if (!isValid) {
                        alert('Cannot process at this time');
                        return false; // Prevent dialog from closing
                    }
                    
                    return 'process'; // Return value and close dialog
                }
            }
        ]
    }
});
```

### Remarks with Validation

Create a remarks dialog with custom validation:

```javascript
const remarks = await AppCore.showDialog({
    type: 'remarks',
    title: 'Rejection Reason',
    message: 'Please provide a reason for rejection:',
    input: {
        placeholder: 'Enter reason (minimum 20 characters)...',
        maxLength: 500,
        required: true
    }
});

if (remarks && remarks.length >= 20) {
    // Process valid remarks
    await rejectItem(remarks);
} else if (remarks) {
    AppCore.showAlert('Invalid Input', 'Remarks must be at least 20 characters.');
}
```

### Modal Configuration Options

Customize modal behavior:

```javascript
const result = await AppCore.showDialog({
    type: 'confirmation',
    title: 'Important Action',
    message: 'This action requires confirmation.',
    config: {
        backdrop: true,        // Show backdrop (default: true)
        keyboard: false,       // Disable ESC key dismiss (default: false)
        focus: true,          // Auto-focus input field (default: true)
        size: 'lg'            // Modal size: 'sm', 'md', 'lg', 'xl' (default: 'md')
    }
});
```

## Real-World Examples

### Workflow Reset Confirmation

```javascript
async function resetWorkflow() {
    const confirmed = await AppCore.showConfirmation(
        'Reset Workflow',
        'Are you sure you want to clear all data and reset the workflow? This action cannot be undone.'
    );

    if (!confirmed) return;

    try {
        await clearWorkflowData();
        AppCore.showNotification('Workflow reset successfully', 'success');
    } catch (error) {
        AppCore.showAlert('Error', 'Failed to reset workflow: ' + error.message);
    }
}
```

### Approval with Remarks

```javascript
async function approveWithRemarks(itemId) {
    const remarks = await AppCore.showRemarks(
        'Approval Remarks',
        'Please provide approval remarks:',
        {
            placeholder: 'Enter approval remarks...',
            maxLength: 500,
            required: true
        }
    );

    if (!remarks) {
        console.log('Approval cancelled');
        return;
    }

    try {
        await submitApproval(itemId, remarks);
        AppCore.showNotification('Item approved successfully', 'success');
    } catch (error) {
        AppCore.showAlert('Error', 'Failed to approve: ' + error.message);
    }
}
```

### Multi-Option Selection

```javascript
async function handleWorkflowAction() {
    const action = await AppCore.showDialog({
        type: 'custom',
        title: 'Workflow Action',
        message: 'Choose an action for this workflow:',
        buttons: {
            list: [
                { label: 'Approve', variant: 'success', value: 'approve' },
                { label: 'Reject', variant: 'danger', value: 'reject' },
                { label: 'Return', variant: 'warning', value: 'return' },
                { label: 'Cancel', variant: 'outline-secondary', value: null }
            ]
        }
    });

    if (!action) return;

    // Get remarks based on action
    let remarks = null;
    if (action === 'reject' || action === 'return') {
        remarks = await AppCore.showRemarks(
            `${action === 'reject' ? 'Rejection' : 'Return'} Remarks`,
            'Please provide a reason:',
            { required: true, maxLength: 500 }
        );

        if (!remarks) return; // User cancelled remarks input
    }

    // Process action
    await processWorkflowAction(action, remarks);
}
```

### Input Validation Example

```javascript
async function getValidatedEmail() {
    let email = '';
    let isValid = false;

    while (!isValid) {
        email = await AppCore.showPrompt(
            'Enter Email',
            'Please enter your email address:',
            'user@example.com'
        );

        if (!email) return null; // User cancelled

        // Validate email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        isValid = emailRegex.test(email);

        if (!isValid) {
            await AppCore.showAlert(
                'Invalid Email',
                'Please enter a valid email address.'
            );
        }
    }

    return email;
}
```

## Dialog Types Reference

| Type | Description | Input Field | Default Buttons |
|------|-------------|-------------|-----------------|
| `confirmation` | Yes/No confirmation | No | Cancel, Confirm |
| `alert` | Information display | No | OK |
| `prompt` | Single-line text input | Yes (input) | Cancel, Submit |
| `remarks` | Multi-line text input | Yes (textarea) | Cancel, Submit |
| `custom` | Fully customizable | Optional | Custom defined |

## Button Variants

Available Bootstrap button variants for custom buttons:
- `primary` - Blue primary button
- `secondary` - Gray secondary button
- `success` - Green success button
- `danger` - Red danger button
- `warning` - Yellow warning button
- `info` - Light blue info button
- `light` - Light gray button
- `dark` - Dark gray button
- `outline-*` - Outlined versions (e.g., `outline-primary`)

## Return Values

| Dialog Type | Return Value |
|-------------|--------------|
| `confirmation` | `true` (confirmed) or `null` (cancelled) |
| `alert` | `true` (OK clicked) |
| `prompt` | `string` (input value) or `null` (cancelled) |
| `remarks` | `string` (textarea value) or `null` (cancelled) |
| `custom` | Custom value defined in button config or `null` |

## Best Practices

1. **Always handle null returns** - User can always cancel or close the dialog
2. **Use appropriate dialog types** - Choose the type that best fits your use case
3. **Keep messages concise** - Clear, brief messages are more effective
4. **Validate input** - Check returned values before processing
5. **Use async/await** - Makes dialog code cleaner and easier to read
6. **Provide meaningful titles** - Help users understand the context
7. **Consider character limits** - Use maxLength for remarks to prevent excessive input

## Migration from Custom Dialogs

If you have existing custom dialog implementations, you can replace them:

### Before (Custom Implementation)
```javascript
function showConfirmationDialog(title, message) {
    return new Promise((resolve) => {
        // 50+ lines of modal creation code
        // ...
    });
}

const confirmed = await showConfirmationDialog('Delete', 'Are you sure?');
```

### After (AppCore Dialog)
```javascript
const confirmed = await AppCore.showConfirmation('Delete', 'Are you sure?');
```

## Browser Compatibility

- Requires Bootstrap 5.x
- Requires ES6+ (async/await support)
- Works in all modern browsers (Chrome, Firefox, Safari, Edge)

## Troubleshooting

### Dialog not appearing
- Ensure Bootstrap 5 is loaded before app-core.js
- Check browser console for JavaScript errors
- Verify `AppCore` is available: `console.log(AppCore)`

### Dialog closes immediately
- Check if you're properly awaiting the promise
- Ensure button handlers return `false` to prevent closing

### Styling issues
- Verify Bootstrap CSS is loaded
- Check for CSS conflicts with custom styles
- Use browser DevTools to inspect modal elements

## Support

For issues or questions, check:
1. Browser console for error messages
2. Network tab for failed resource loads
3. Bootstrap documentation for modal-related issues
