# Session Expiry Re-Authentication Feature

## Overview
This feature prevents users from losing their work when their session expires due to inactivity. Instead of immediately redirecting to the login page, users are presented with a blocking modal where they can re-authenticate with their password to continue their work.

## Architecture

### Components

#### 1. **SessionController** (`Controllers/SessionController.cs`)
REST API endpoints for session management:

- **GET `/api/session/current-user`**
  - Returns current logged-in username
  - Used by modal to display who is logged in
  - Returns 401 if session is invalid

- **POST `/api/session/renew`**
  - Re-authenticates user with password
  - Request body: `{ password: string, branchId?: number }`
  - Returns new token expiry time on success
  - Returns 401 with INVALID_CREDENTIALS on failure

- **GET `/api/session/check`**
  - Checks if current session is still valid
  - Returns `{ isValid: boolean, username: string }`
  - Used by the monitor for periodic checks

- **POST `/api/session/logout`**
  - Forces logout and clears all session data
  - Used when user declines re-authentication

#### 2. **Session Monitor Script** (`wwwroot/js/session-monitor.js`)
Client-side JavaScript that:

- **Monitors for expired sessions** via:
  - HTTP response status codes (401/403)
  - Periodic session validation polls
  - Fetch API and jQuery AJAX interception

- **Displays re-authentication modal** with:
  - Current username display
  - Password input field
  - Submit and Cancel buttons

- **Handles user actions**:
  - On successful re-authentication: Reloads page and continues session
  - On cancel/close: Redirects to login page
  - On invalid credentials: Shows error message

#### 3. **Re-Authentication Modal** (`Views/Shared/_SessionExpiredModal.cshtml`)
Bootstrap-based modal UI with:

- Header showing "Session Expired"
- Username display
- Password input (masked)
- Error message area
- Re-Authenticate and Logout buttons
- Responsive design for mobile

## How It Works

### User Flow

1. **Session Expires** (due to inactivity or timeout)
   - Server session becomes invalid
   - Subsequent API calls return 401/403

2. **Trigger** 
   - HTTP interception detects 401/403 OR
   - Periodic check interval finds session invalid

3. **Modal Appears**
   - Blocking overlay prevents interaction with page
   - Shows logged-in username
   - Prompts for password

4. **User Re-Authenticates**
   - Enters password
   - SessionController validates against auth server
   - If valid: 
     - Token updated in session
     - Session timeout reset
     - Page reloads
     - User continues working
   - If invalid:
     - Error message displayed
     - User can retry

5. **User Declines**
   - Clicks "Logout" or closes modal
   - Redirected to login page
   - Full logout occurs

## Session Configuration

### appsettings.json
```json
{
  "Session": {
    "IdleTimeoutMinutes": 30,
    "CookieTimeoutMinutes": 60
  }
}
```

### Development vs Production
- **Development**: 5 minutes idle timeout (for testing)
- **Production**: 30 minutes idle timeout

## Security Considerations

1. **Password Validation**
   - Password is validated against auth server (OAuth)
   - No password is stored in browser localStorage
   - Only cookies are used (HttpOnly flag set)

2. **HTTPS Only**
   - Session cookies should be Secure flag set in production
   - Modal communicates over HTTPS in production

3. **CSRF Protection**
   - Session endpoint should be protected with CSRF tokens if needed
   - Currently configured with Lax SameSite cookie policy

4. **Session Fixation**
   - New token issued on re-authentication
   - Old tokens invalidated on logout

## Customization

### Change Session Timeout
Edit `appsettings.Development.json` or `appsettings.Production.json`:
```json
"Session": {
  "IdleTimeoutMinutes": 45
}
```

### Change Check Interval
In `session-monitor.js`, modify `config.checkInterval`:
```javascript
const config = {
    checkInterval: 60000,  // Check every 60 seconds instead of 30
    // ...
};
```

### Disable Feature
Comment out the script loading in:
- `Views/Dashboard/Index.cshtml`
- `Views/Shared/_ApplicationLayout.cshtml`

### Customize Modal Styling
Edit styles in `_SessionExpiredModal.cshtml` (between `<style>` tags)

## Troubleshooting

### Modal Not Appearing
1. Check browser console for errors
2. Verify session-monitor.js is loaded
3. Ensure _SessionExpiredModal is included in layout
4. Test with explicitly expiring session: `/api/session/logout`

### Re-Authentication Fails with 500 Error
1. Check that AuthService can reach OAuth server
2. Verify user credentials are correct
3. Check server logs for authentication errors

### Session Not Extending
1. Verify SessionController is registered in dependency injection
2. Check that Session middleware is configured in Program.cs
3. Ensure cookies are being sent with requests (check network tab)

### Modal Appears Too Frequently
1. Increase `checkInterval` in session-monitor.js
2. Increase session timeout in appsettings.json
3. Check for 401 responses in network tab - these trigger modal immediately

## Testing

### Manual Testing
1. Log in to dashboard
2. Wait for session to expire (5 min in dev, 30 min in prod)
3. Click a button or perform an action
4. Modal should appear
5. Test both success and failure scenarios

### Automated Testing
```javascript
// Check current session status
SessionMonitor.checkSession().then(result => {
    console.log('Session valid:', result.isValid);
});

// Manually trigger modal
SessionMonitor.showModal();

// Attempt renewal (for integration testing)
SessionMonitor.renewSession('password', 123).then(result => {
    console.log('Renewal result:', result);
});
```

## Browser Compatibility
- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- IE11: Not supported (missing Fetch API, requires polyfill)

## Performance Impact
- **Network**: One check request every 30 seconds (~100 bytes)
- **CPU**: Minimal (simple event listening and DOM rendering)
- **Memory**: < 1MB (modal stays hidden until needed)

## Future Enhancements
Possible improvements for future versions:
- [ ] Multi-factor authentication support
- [ ] Biometric re-authentication (fingerprint/face)
- [ ] Countdown timer showing seconds until automatic logout
- [ ] Remember this device option
- [ ] Session extension without re-authentication (grace period)
- [ ] Notification before session expires (warning modal)
