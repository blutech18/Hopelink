// Minimal scaffold for a Supabase Edge Function to suspend a user by email.
// Requires SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and CAPTCHA verification.
// Implement CAPTCHA verification and rate-limiting before enabling.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Get Supabase URL - try automatic env first, then fallback to custom
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 
  Deno.env.get('SUPABASE_PROJECT_URL') || 
  'https://hvhwqtebimabyrcgprwd.supabase.co'

// Get service role key - use custom env var name that CLI allows
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') || 
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 
  ''

// Get CAPTCHA secret
const CAPTCHA_SECRET = Deno.env.get('CAPTCHA_SECRET')

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function verifyCaptcha(token: string | undefined, ip: string | undefined): Promise<boolean> {
  if (!CAPTCHA_SECRET) return false
  if (!token) return false
  try {
    // Example for hCaptcha; adjust for your provider.
    const resp = await fetch('https://hcaptcha.com/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: CAPTCHA_SECRET,
        response: token,
        remoteip: ip || ''
      })
    })
    const data = await resp.json()
    return !!data.success
  } catch {
    return false
  }
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405 })
  }
  try {
    const ip = req.headers.get('x-forwarded-for') ?? undefined
    const ua = req.headers.get('user-agent') ?? ''
    const { email, captchaToken } = await req.json()
    if (!email || typeof email !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid email' }), { status: 400 })
    }

    // Enforce CAPTCHA
    const captchaOk = await verifyCaptcha(captchaToken, ip)
    if (!captchaOk) {
      return new Response(JSON.stringify({ error: 'Captcha verification failed' }), { status: 400 })
    }

    // TODO: add IP/email rate limiting (KV or DB-based)

    // Suspend account
    const { error } = await supabase
      .from('users')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('email', email.toLowerCase())

    if (error) {
      return new Response(JSON.stringify({ error: 'Failed to suspend account' }), { status: 500 })
    }

    // Optionally: log the action to an audit table
    // await supabase.from('audit_logs').insert({ ... })

    return new Response(JSON.stringify({ success: true }), { status: 200 })
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Unexpected error' }), { status: 500 })
  }
})


