// SQLite layer using Node 24's built-in node:sqlite (no native build required).
// All persistence is local to the user's machine under ./data/ai-study-hub.db.
//
// Schema covers:
//   - next-auth core tables (users, accounts, sessions, verification_tokens)
//   - app content (documents, generations, annotations, qa_history) — keyed by user_id
//   - community (rooms, room_members, posts, comments, votes, follows, cheatshares)

import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'ai-study-hub.db');

let _db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (_db) return _db;
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  initSchema(db);
  migrate(db);
  _db = db;
  return db;
}

function initSchema(db: DatabaseSync) {
  db.exec(`
    -- ===== NextAuth core tables =====
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT UNIQUE,
      email_verified INTEGER,
      image TEXT,
      password_hash TEXT,
      bio TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      provider TEXT NOT NULL,
      provider_account_id TEXT NOT NULL,
      refresh_token TEXT,
      access_token TEXT,
      expires_at INTEGER,
      token_type TEXT,
      scope TEXT,
      id_token TEXT,
      session_state TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_provider
      ON accounts(provider, provider_account_id);

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      session_token TEXT UNIQUE NOT NULL,
      user_id TEXT NOT NULL,
      expires INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS verification_tokens (
      identifier TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires INTEGER NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_vt ON verification_tokens(identifier, token);

    -- ===== App content (per user) =====
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      source_type TEXT NOT NULL,
      mime TEXT,
      size INTEGER,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_doc_user ON documents(user_id);

    CREATE TABLE IF NOT EXISTS generations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      document_id TEXT NOT NULL,
      kind TEXT NOT NULL,           -- 'cheatsheet' | 'questions' | 'summary' | 'explain'
      prompt TEXT,
      content TEXT NOT NULL,
      meta TEXT,
      visibility TEXT NOT NULL DEFAULT 'private', -- 'private' | 'public' | 'room'
      room_id TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_gen_user ON generations(user_id);
    CREATE INDEX IF NOT EXISTS idx_gen_doc ON generations(document_id);
    CREATE INDEX IF NOT EXISTS idx_gen_visibility ON generations(visibility);

    CREATE TABLE IF NOT EXISTS annotations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      document_id TEXT NOT NULL,
      start_offset INTEGER NOT NULL,
      end_offset INTEGER NOT NULL,
      quoted TEXT NOT NULL,
      color TEXT NOT NULL,
      note TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_ann_user ON annotations(user_id);
    CREATE INDEX IF NOT EXISTS idx_ann_doc ON annotations(document_id);

    CREATE TABLE IF NOT EXISTS qa_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      document_id TEXT NOT NULL,
      annotation_id TEXT,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      citations TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
      FOREIGN KEY (annotation_id) REFERENCES annotations(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_qa_user ON qa_history(user_id);
    CREATE INDEX IF NOT EXISTS idx_qa_doc ON qa_history(document_id);

    -- ===== Chat history with Otter AI =====
    CREATE TABLE IF NOT EXISTS chat_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      document_id TEXT NOT NULL,
      role TEXT NOT NULL,           -- 'user' | 'assistant'
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_chat_user ON chat_history(user_id);
    CREATE INDEX IF NOT EXISTS idx_chat_doc ON chat_history(document_id);

    -- ===== Quiz progress (question completion) =====
    CREATE TABLE IF NOT EXISTS quiz_progress (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      generation_id TEXT NOT NULL,
      question_index INTEGER NOT NULL,
      user_answer TEXT,
      is_correct INTEGER,          -- 0/1
      completed_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (generation_id) REFERENCES generations(id) ON DELETE CASCADE,
      UNIQUE(user_id, generation_id, question_index)
    );
    CREATE INDEX IF NOT EXISTS idx_quiz_user ON quiz_progress(user_id);
    CREATE INDEX IF NOT EXISTS idx_quiz_gen ON quiz_progress(generation_id);

    -- ===== Community: rooms (study groups) =====
    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      invite_code TEXT UNIQUE NOT NULL,
      is_public INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_rooms_public ON rooms(is_public);

    CREATE TABLE IF NOT EXISTS room_members (
      room_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member', -- 'owner' | 'member'
      joined_at INTEGER NOT NULL,
      PRIMARY KEY (room_id, user_id),
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- ===== Community: posts (forum questions) =====
    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      author_id TEXT NOT NULL,
      room_id TEXT,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      tags TEXT,                       -- JSON array
      visibility TEXT NOT NULL DEFAULT 'public', -- 'public' | 'room'
      best_answer_id TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
    CREATE INDEX IF NOT EXISTS idx_posts_room ON posts(room_id);

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      author_id TEXT NOT NULL,
      body TEXT NOT NULL,
      parent_id TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);

    -- ===== Community: votes (1/-1 per user per target) =====
    CREATE TABLE IF NOT EXISTS votes (
      user_id TEXT NOT NULL,
      target_type TEXT NOT NULL,    -- 'post' | 'comment' | 'cheatsheet'
      target_id TEXT NOT NULL,
      value INTEGER NOT NULL,       -- 1 or -1
      created_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, target_type, target_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- ===== Community: follows (user → user) =====
    CREATE TABLE IF NOT EXISTS follows (
      follower_id TEXT NOT NULL,
      followee_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (follower_id, followee_id),
      FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (followee_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- ===== Friends system =====
    CREATE TABLE IF NOT EXISTS friends (
      user_id TEXT NOT NULL,
      friend_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'accepted'
      created_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, friend_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_friends_user ON friends(user_id);
    CREATE INDEX IF NOT EXISTS idx_friends_friend ON friends(friend_id);
    CREATE INDEX IF NOT EXISTS idx_friends_status ON friends(status);

    -- ===== Community: announcements (global admin or per-room owner) =====
    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      author_id TEXT NOT NULL,
      room_id TEXT,                       -- NULL = global admin announcement
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      is_pinned INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_announcements_author ON announcements(author_id);
    CREATE INDEX IF NOT EXISTS idx_announcements_room ON announcements(room_id);
    CREATE INDEX IF NOT EXISTS idx_announcements_pinned ON announcements(is_pinned);

    -- ===== Days Countdown (exam/event tracker) =====
    CREATE TABLE IF NOT EXISTS countdown_events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      event_date INTEGER NOT NULL,       -- Unix timestamp (ms) of the event
      color TEXT DEFAULT 'accent',       -- 'accent' | 'green' | 'red' | 'yellow' | 'blue'
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_countdown_user ON countdown_events(user_id);

    -- ===== Credits system (daily allowance) =====
    CREATE TABLE IF NOT EXISTS user_credits (
      user_id TEXT PRIMARY KEY,
      credits INTEGER NOT NULL DEFAULT 100,
      last_reset_date TEXT NOT NULL,     -- ISO date string 'YYYY-MM-DD', reset daily
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
}

function migrate(db: DatabaseSync) {
  // Add columns that may be missing if the DB was created by an earlier version.
  const ensure = (table: string, col: string, decl: string) => {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
    if (!cols.find((c) => c.name === col)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${decl}`);
    }
  };
  ensure('documents', 'user_id', "TEXT NOT NULL DEFAULT ''");
  ensure('documents', 'description', "TEXT DEFAULT ''");
  ensure('generations', 'user_id', "TEXT NOT NULL DEFAULT ''");
  ensure('generations', 'visibility', "TEXT NOT NULL DEFAULT 'private'");
  ensure('generations', 'room_id', 'TEXT');
  ensure('annotations', 'user_id', "TEXT NOT NULL DEFAULT ''");
  ensure('qa_history', 'user_id', "TEXT NOT NULL DEFAULT ''");
  ensure('users', 'password_hash', 'TEXT');
  ensure('users', 'bio', 'TEXT');
}

// ===== Row types =====
export interface UserRow {
  id: string;
  name: string | null;
  email: string | null;
  email_verified: number | null;
  image: string | null;
  password_hash: string | null;
  bio: string | null;
  role: string | null;
  created_at: number;
}
export interface DocumentRow {
  id: string;
  user_id: string;
  title: string;
  description: string;
  source_type: string;
  mime: string | null;
  size: number | null;
  content: string;
  created_at: number;
}
export interface GenerationRow {
  id: string;
  user_id: string;
  document_id: string;
  kind: string;
  prompt: string | null;
  content: string;
  meta: string | null;
  visibility: string;
  room_id: string | null;
  created_at: number;
}
export interface AnnotationRow {
  id: string;
  user_id: string;
  document_id: string;
  start_offset: number;
  end_offset: number;
  quoted: string;
  color: string;
  note: string | null;
  created_at: number;
}
export interface QaRow {
  id: string;
  user_id: string;
  document_id: string;
  annotation_id: string | null;
  question: string;
  answer: string;
  citations: string | null;
  created_at: number;
}
export interface RoomRow {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  invite_code: string;
  is_public: number;
  created_at: number;
}
export interface PostRow {
  id: string;
  author_id: string;
  room_id: string | null;
  title: string;
  body: string;
  tags: string | null;
  visibility: string;
  best_answer_id: string | null;
  created_at: number;
}
export interface CommentRow {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  parent_id: string | null;
  created_at: number;
}
export interface VoteRow {
  user_id: string;
  target_type: string;
  target_id: string;
  value: number;
  created_at: number;
}
export interface AnnouncementRow {
  id: string;
  author_id: string;
  room_id: string | null;
  title: string;
  body: string;
  is_pinned: number;
  created_at: number;
}

export interface CountdownEventRow {
  id: string;
  user_id: string;
  title: string;
  event_date: number;
  color: string;
  created_at: number;
}

export interface UserCreditsRow {
  user_id: string;
  credits: number;
  last_reset_date: string;
  created_at: number;
}
