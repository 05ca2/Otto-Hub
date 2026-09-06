// GitHub OAuth (simplified). The user pastes a code from GitHub into our /api/auth/github/callback
// URL (or we redirect via /api/auth/github → GitHub → back here). We exchange the code for
// an access token, then fetch the user profile, and create-or-link the local account.

import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { getDb, type UserRow } from '@/lib/db';
import { createSession, getSessionUser } from '@/lib/auth';
import { trackTask, ensureCredits } from '@/lib/tasks';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const GITHUB_AUTHORIZE = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN = 'https://github.com/login/oauth/access_token';
const GITHUB_ME = 'https://api.github.com/user';
const GITHUB_EMAILS = 'https://api.github.com/user/emails';

function getCreds() {
  return {
    id: process.env.GITHUB_ID || '',
    secret: process.env.GITHUB_SECRET || '',
  };
}

function getOrigin(req: NextRequest): string {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  if (!host) return 'http://localhost:3000';
  const proto = req.headers.get('x-forwarded-proto') || 'http';
  return `${proto}://${host}`;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const origin = getOrigin(req);
  const action = url.searchParams.get('action') || 'login';
  const { id, secret } = getCreds();
  if (!id || !secret) {
    return NextResponse.json(
      {
        error: 'GitHub OAuth not configured. Set GITHUB_ID and GITHUB_SECRET in .env.local. See README.',
        setup: '1. Create an OAuth app at https://github.com/settings/developers\n2. Set Authorization callback URL to: ' +
          new URL('/api/auth/github?action=callback', origin).toString(),
      },
      { status: 412 },
    );
  }
  if (action === 'login') {
    const params = new URLSearchParams({
      client_id: id,
      scope: 'read:user user:email',
      redirect_uri: new URL('/api/auth/github?action=callback', origin).toString(),
    });
    return NextResponse.redirect(`${GITHUB_AUTHORIZE}?${params.toString()}`);
  }
  if (action === 'callback') {
    const code = url.searchParams.get('code');
    if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 });
    const redirectUri = new URL('/api/auth/github?action=callback', origin).toString();
    const tokenRes = await fetch(GITHUB_TOKEN, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ client_id: id, client_secret: secret, code, redirect_uri: redirectUri }),
    });
    const tokenJson = await tokenRes.json();
    const accessToken = tokenJson.access_token;
    if (!accessToken) {
      return NextResponse.json({ error: 'Token exchange failed', detail: tokenJson }, { status: 502 });
    }
    const headers = { authorization: `Bearer ${accessToken}`, accept: 'application/json', 'user-agent': 'ai-study-hub' };
    const [meRes, emailsRes] = await Promise.all([
      fetch(GITHUB_ME, { headers }),
      fetch(GITHUB_EMAILS, { headers }),
    ]);
    const me = await meRes.json();
    const emails = emailsRes.ok ? await emailsRes.json() : [];
    const primaryEmail =
      (Array.isArray(emails) && emails.find((e: any) => e.primary && e.verified)?.email) || me?.email || null;
    if (!primaryEmail) {
      return NextResponse.json({ error: 'GitHub did not return a verifiable email' }, { status: 400 });
    }
    const db = getDb();
    // Try to link to existing user by email, otherwise create a new one.
    let user = db.prepare(`SELECT * FROM users WHERE email = ?`).get(primaryEmail.toLowerCase()) as UserRow | undefined;
    if (!user) {
      const newId = nanoid(12);
      db.prepare(
        `INSERT INTO users (id, name, email, email_verified, image, password_hash, bio, created_at)
         VALUES (?, ?, ?, ?, ?, NULL, NULL, ?)`,
      ).run(newId, me.login || me.name || primaryEmail, primaryEmail.toLowerCase(), Date.now(), me.avatar_url || null, Date.now());
      user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(newId) as UserRow;
    }
    // Save the OAuth linkage (idempotent by provider+provider_account_id).
    const existingAccount = db
      .prepare(`SELECT id FROM accounts WHERE provider = ? AND provider_account_id = ?`)
      .get('github', String(me.id));
    if (!existingAccount) {
      db.prepare(
        `INSERT INTO accounts (id, user_id, type, provider, provider_account_id, access_token, token_type, scope, expires_at)
         VALUES (?, ?, 'oauth', 'github', ?, ?, ?, ?, ?)`,
      ).run(
        nanoid(12),
        user.id,
        String(me.id),
        accessToken,
        tokenJson.token_type || 'bearer',
        tokenJson.scope || 'read:user user:email',
        tokenJson.expires_in ? Math.floor(Date.now() / 1000) + Number(tokenJson.expires_in) : null,
      );
    }
    await createSession(user.id);
    // Track daily_login task
    ensureCredits(user.id);
    trackTask(user.id, 'daily_login');
    return NextResponse.redirect(new URL('/', origin).toString());
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
