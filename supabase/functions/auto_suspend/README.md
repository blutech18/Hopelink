Auto-suspend Edge Function (scaffold)

Purpose
- Securely suspend a user account (set users.is_active = false) after too many failed login attempts, without exposing suspension to anonymous callers.

How it works (high-level)
- Client detects lock condition (>= 7 failed attempts) via RPC response.
- Client calls this Edge Function endpoint with the target email and a CAPTCHA token.
- The function verifies CAPTCHA, rate-limits by IP/email, and uses the Supabase service role to update users.is_active = false safely.

Environment variables
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- CAPTCHA_SECRET (e.g., hCaptcha or reCAPTCHA)

Endpoint (example)
- POST /auto-suspend
  - Body: { email: string, captchaToken: string }
  - Response: { success: boolean }

Security notes
- Require CAPTCHA verification and strict rate limits.
- Log IP, user agent, and request metadata.
- Never expose service role key to the client.


