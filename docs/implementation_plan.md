# Implementation Plan - Google Authentication & Login Screen UI Upgrade

We will upgrade the login/register screen with a premium modern design (glassmorphism, clean input groups, subtle micro-animations) and implement the Google Authentication feature.

## Proposed Changes

### 1. Backend: Google Login Verification API

#### [MODIFY] [backend/routers/auth.py](file:///d:/git/text-to-speed-internal/backend/routers/auth.py)
- Create a new endpoint `POST /api/auth/google`:
  - Request body schema: `GoogleLoginRequest` with `credential: str`.
  - Verify the credential by making an HTTP request to `https://oauth2.googleapis.com/tokeninfo?id_token={credential}`.
  - If verified successfully:
    - Get user email, name.
    - If user doesn't exist, create a new `User` record with role `user` (using a generated random password hash).
    - If user exists, retrieve them.
    - Create/fetch workspace for the user.
    - Return a JWT token and user info matching the existing login response.

#### [MODIFY] [backend/schemas.py](file:///d:/git/text-to-speed-internal/backend/schemas.py)
- Add the `GoogleLoginRequest` schema.

### 2. Frontend: Premium Login UI & Google Login Integration

#### [MODIFY] [frontend/src/pages/AuthScreen.jsx](file:///d:/git/text-to-speed-internal/frontend/src/pages/AuthScreen.jsx)
- Redesign the layout with a premium glassmorphic UI, better typography, styling, and animations.
- Integrate the Google Sign-in API:
  - Dynamically load the Google Identity Services client script (`https://accounts.google.com/gsi/client`).
  - Initialize the Google client with a Client ID.
  - Render the Google Login Button.
  - Handle the credential response and send it to our new `/api/auth/google` backend endpoint.

#### [MODIFY] [frontend/src/hooks/useAuth.js](file:///d:/git/text-to-speed-internal/frontend/src/hooks/useAuth.js)
- Add a new helper `handleGoogleLogin(credential)`:
  - Send the credential to `/api/auth/google`.
  - Store token and user object in local storage and update states.

## Verification Plan

### Automated/Manual Verification
- Verify the dynamic load of Google Client API on the login screen.
- Verify Google OAuth popup triggers correctly on button click.
- Verify successful login redirects to dashboard.
- Verify user database records are correctly created/fetched.
