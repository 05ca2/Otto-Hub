/**
 * GitHub sync utility — pushes anonymized user content to a private repo.
 * Uses the GitHub Contents API (no git CLI required on the VPS).
 *
 * Repo: 05ca2/Otto-Hub-data
 * Env: GITHUB_PAT (Personal Access Token with `repo` scope)
 *
 * File structure (categorized by survey data):
 *   documents/{role}/{grade}/{year}/{month}/{original_filename}
 *   generations/{kind}/{role}/{grade}/{year}/{month}/{title}_{id}.md
 *   posts/{role}/{grade}/{year}/{month}/{title}_{id}.md
 *
 * Users without survey data go to unknown/unknown/.
 * Documents are saved with their ORIGINAL filename (not converted to .md).
 */

import { createHash } from 'node:crypto';
import { getDb } from './db';

const GITHUB_PAT = process.env.GITHUB_PAT || '';
const REPO_OWNER = '05ca2';
const REPO_NAME = 'Otto-Hub-data';
const API_BASE = 'https://api.github.com';

// Simple salt for anonymizing user IDs
const ANON_SALT = 'otto-hub-data-sync-2026';

function anonymizeUserId(userId: string): string {
  return createHash('sha256').update(`${ANON_SALT}:${userId}`).digest('hex').slice(0, 12);
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 80)
    .replace(/_+$/, '') || 'untitled';
}

/** Sanitize a path segment for use in GitHub paths (role, grade, etc.) */
function sanitizePathSegment(value: string | null | undefined): string {
  if (!value || !value.trim()) return 'unknown';
  return sanitizeFilename(value.trim().toLowerCase());
}

/** Look up a user's survey data from the DB. */
export function getUserSurvey(userId: string): { role: string; grade: string; purpose: string } {
  try {
    const db = getDb();
    const row = db.prepare(
      'SELECT role, grade, purpose FROM user_surveys WHERE user_id = ?'
    ).get(userId) as { role: string; grade: string; purpose: string } | undefined;
    return {
      role: sanitizePathSegment(row?.role),
      grade: sanitizePathSegment(row?.grade),
      purpose: row?.purpose || '',
    };
  } catch {
    return { role: 'unknown', grade: 'unknown', purpose: '' };
  }
}

async function ghFetch(path: string, method: string, body?: Record<string, unknown>) {
  const url = `${API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/contents${path}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${GITHUB_PAT}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  const init: RequestInit = { method, headers };
  if (body) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  const res = await fetch(url, init);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GitHub API ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

/** Get the SHA of an existing file (needed for updates), or null if new. */
async function getFileSha(filePath: string): Promise<string | null> {
  try {
    const data = await ghFetch(filePath, 'GET');
    return (data as { sha: string }).sha;
  } catch {
    return null;
  }
}

/** Push a single file to the repo (create or update). */
export async function pushFile(filePath: string, content: string, message: string) {
  if (!GITHUB_PAT) {
    console.warn('[github-sync] GITHUB_PAT not set, skipping sync');
    return;
  }
  const sha = await getFileSha(filePath);
  const body: Record<string, unknown> = {
    message,
    content: Buffer.from(content).toString('base64'),
  };
  if (sha) body.sha = sha;
  await ghFetch(filePath, 'PUT', body);
}

// ============================================================
// Document sync — saves with ORIGINAL filename, no frontmatter
// ============================================================

export interface SyncDocumentOpts {
  docId: string;
  userId: string;
  title: string;
  sourceType: string;
  content: string;
  mime: string | null;  // stores original filename(s) from upload
  createdAt: number;
}

/**
 * Push an anonymized document to the repo.
 * Path: documents/{role}/{grade}/{year}/{month}/{original_filename}
 * Content: raw extracted text, NO frontmatter, saved with original extension.
 */
export async function syncDocument(opts: SyncDocumentOpts): Promise<void> {
  if (!GITHUB_PAT) return;
  try {
    const anonId = anonymizeUserId(opts.userId);
    const survey = getUserSurvey(opts.userId);
    const date = new Date(opts.createdAt);
    const year = date.getFullYear().toString();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');

    // Use original filename from mime field (first filename if multiple)
    const originalFilename = opts.mime
      ? opts.mime.split(',')[0].trim()
      : sanitizeFilename(opts.title);
    const filename = `${originalFilename}_${opts.docId}`;

    const filePath = `/documents/${survey.role}/${survey.grade}/${year}/${month}/${filename}`;

    // Save raw content — NO frontmatter, just the extracted text
    await pushFile(filePath, opts.content, `sync: document "${opts.title}"`);
    console.log(`[github-sync] Synced document: ${filePath}`);
  } catch (err) {
    console.error('[github-sync] Failed to sync document:', err);
  }
}

// ============================================================
// Generation sync (cheatsheets, summaries, questions)
// ============================================================

export interface SyncGenerationOpts {
  genId: string;
  userId: string;
  docTitle: string;
  kind: string;
  content: string;
  visibility: string;
  createdAt: number;
}

/**
 * Push an anonymized generation to the repo.
 * Path: generations/{kind}/{role}/{grade}/{year}/{month}/{title}_{id}.md
 */
export async function syncGeneration(opts: SyncGenerationOpts): Promise<void> {
  if (!GITHUB_PAT) return;
  if (opts.visibility === 'private') return;

  try {
    const anonId = anonymizeUserId(opts.userId);
    const survey = getUserSurvey(opts.userId);
    const date = new Date(opts.createdAt);
    const year = date.getFullYear().toString();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const filename = `${sanitizeFilename(opts.docTitle)}_${opts.genId}.md`;
    const filePath = `/generations/${opts.kind}/${survey.role}/${survey.grade}/${year}/${month}/${filename}`;

    const frontmatter = [
      '---',
      `gen_id: "${opts.genId}"`,
      `anon_user: "${anonId}"`,
      `doc_title: "${opts.docTitle.replace(/"/g, '\\"')}"`,
      `kind: ${opts.kind}`,
      `visibility: ${opts.visibility}`,
      `role: ${survey.role}`,
      `grade: ${survey.grade}`,
      survey.purpose ? `purpose: "${survey.purpose.replace(/"/g, '\\"')}"` : null,
      `created_at: ${date.toISOString()}`,
      '---',
      '',
    ].filter(Boolean).join('\n');

    const content = frontmatter + opts.content;
    await pushFile(filePath, content, `sync: ${opts.kind} "${opts.docTitle}"`);
    console.log(`[github-sync] Synced generation: ${filePath}`);
  } catch (err) {
    console.error('[github-sync] Failed to sync generation:', err);
  }
}

// ============================================================
// Community posts sync
// ============================================================

export interface SyncPostOpts {
  postId: string;
  userId: string;
  title: string;
  body: string;
  tags: string | null;
  createdAt: number;
}

/**
 * Push an anonymized community post to the repo.
 * Path: posts/{role}/{grade}/{year}/{month}/{title}_{id}.md
 */
export async function syncPost(opts: SyncPostOpts): Promise<void> {
  if (!GITHUB_PAT) return;
  try {
    const anonId = anonymizeUserId(opts.userId);
    const survey = getUserSurvey(opts.userId);
    const date = new Date(opts.createdAt);
    const year = date.getFullYear().toString();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const filename = `${sanitizeFilename(opts.title)}_${opts.postId}.md`;
    const filePath = `/posts/${survey.role}/${survey.grade}/${year}/${month}/${filename}`;

    const frontmatter = [
      '---',
      `post_id: "${opts.postId}"`,
      `anon_user: "${anonId}"`,
      `title: "${opts.title.replace(/"/g, '\\"')}"`,
      opts.tags ? `tags: "${opts.tags}"` : null,
      `role: ${survey.role}`,
      `grade: ${survey.grade}`,
      `created_at: ${date.toISOString()}`,
      '---',
      '',
    ].filter(Boolean).join('\n');

    const content = frontmatter + opts.body;
    await pushFile(filePath, content, `sync: post "${opts.title}"`);
    console.log(`[github-sync] Synced post: ${filePath}`);
  } catch (err) {
    console.error('[github-sync] Failed to sync post:', err);
  }
}
