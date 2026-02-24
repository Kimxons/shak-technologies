# Toast Messages

A lightweight, reusable toast notification system for displaying user feedback messages.

## Installation

Add the following to your HTML file:

```html
<!-- Toast CSS -->
<link rel="stylesheet" href="path/to/common/toast-messages/toast-messages.css">

<!-- Bootstrap Icons (required for icons) -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css">

<!-- Toast JavaScript -->
<script src="path/to/common/toast-messages/toast-messages.js"></script>
```

## Usage

### Basic Examples

```javascript
// Show success message
ToastMessages.success('Operation completed successfully!');

// Show error message
ToastMessages.error('Failed to save data. Please try again.');

// Show warning message
ToastMessages.warning('Your session will expire in 5 minutes.');

// Show info message
ToastMessages.info('New updates are available.');
```

### Advanced Options

```javascript
// Custom title and duration
ToastMessages.success('Data saved!', {
    title: 'Database Update',
    duration: 5000  // 5 seconds
});

// Disable auto-close
ToastMessages.error('Critical error occurred!', {
    autoClose: false  // Must be manually closed
});

// Custom title with longer duration
ToastMessages.info('Please review the changes before submitting.', {
    title: 'Review Required',
    duration: 8000
});
```

### Clear All Toasts

```javascript
// Remove all active toasts
ToastMessages.clearAll();
```

## API Reference

### Methods

- **`ToastMessages.success(message, options)`** - Show success toast (green)
- **`ToastMessages.error(message, options)`** - Show error toast (red)
- **`ToastMessages.warning(message, options)`** - Show warning toast (orange)
- **`ToastMessages.info(message, options)`** - Show info toast (blue)
- **`ToastMessages.show(type, message, options)`** - Show custom toast
- **`ToastMessages.clearAll()`** - Remove all toasts

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `title` | string | Auto | Custom title for the toast |
| `duration` | number | 4000 | Duration in milliseconds before auto-close |
| `autoClose` | boolean | true | Whether to automatically close the toast |

## Examples in Common Use Cases

### Form Validation

```javascript
// On successful form submission
ToastMessages.success('User role assigned successfully!');

// On validation error
ToastMessages.error('Please fill in all required fields.');
```

### API Calls

```javascript
try {
    const result = await SomeService.saveData(data);
    if (result.success) {
        ToastMessages.success('Data saved successfully!');
    } else {
        ToastMessages.error(result.message || 'Failed to save data.');
    }
} catch (err) {
    ToastMessages.error('An error occurred. Please try again.');
}
```

### User Actions

```javascript
// Branch selected
ToastMessages.info('Branch "Nairobi HQ" selected.');

// Item deleted
ToastMessages.warning('Item has been removed.', {
    title: 'Item Removed'
});
```

## Features

- ✅ Multiple toast types (success, error, warning, info)
- ✅ Auto-dismiss with configurable duration
- ✅ Manual close button
- ✅ Progress bar animation
- ✅ Stacks multiple toasts
- ✅ Smooth slide-in/slide-out animations
- ✅ Responsive design
- ✅ Consistent with existing theme
- ✅ Zero dependencies (except Bootstrap Icons for icons)

## Customization

Toast colors and styles can be customized by modifying the CSS variables in `toast-messages.css`:

```css
:root {
    --toast-success: #27AE60;  /* Success color */
    --toast-error: #E74C3C;    /* Error color */
    --toast-warning: #F39C12;  /* Warning color */
    --toast-info: #3498DB;     /* Info color */
}
```
