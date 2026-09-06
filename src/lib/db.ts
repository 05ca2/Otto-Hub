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
      expires_at INTEGER,
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_rooms_public ON rooms(is_public);
    CREATE INDEX IF NOT EXISTS idx_rooms_expires ON rooms(expires_at);

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

    -- ===== Feedbacks =====
    CREATE TABLE IF NOT EXISTS feedbacks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'experience',  -- 'experience' | 'bug' | 'feature' | 'other'
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'reviewing' | 'resolved' | 'closed'
      admin_reply TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_feedbacks_user ON feedbacks(user_id);
    CREATE INDEX IF NOT EXISTS idx_feedbacks_status ON feedbacks(status);

    -- ===== Verification codes =====
    CREATE TABLE IF NOT EXISTS verification_codes (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      code TEXT NOT NULL,
      purpose TEXT NOT NULL DEFAULT 'register',
      expires_at INTEGER NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_vcodes_email ON verification_codes(email, purpose);

    -- ===== User reports =====
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      reporter_id TEXT NOT NULL,
      post_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'reviewed' | 'dismissed'
      admin_note TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_reports_post ON reports(post_id);
    CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

    -- ===== AI moderation violations =====
    CREATE TABLE IF NOT EXISTS violations (
      id TEXT PRIMARY KEY,
      post_id TEXT,
      author_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      content_preview TEXT,
      status TEXT NOT NULL DEFAULT 'active',  -- 'active' | 'acknowledged' | 'dismissed'
      source TEXT NOT NULL DEFAULT 'moderation',  -- 'moderation' | 'user_report'
      created_at INTEGER NOT NULL,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE SET NULL,
      FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_violations_status ON violations(status);
    CREATE INDEX IF NOT EXISTS idx_violations_author ON violations(author_id);

    -- ===== User onboarding survey =====
    CREATE TABLE IF NOT EXISTS user_surveys (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      grade TEXT,               -- e.g. '1年级', '高一', '大二', etc.
      role TEXT NOT NULL,       -- 'student' | 'teacher' | 'self_learner' | 'other'
      purpose TEXT,             -- free text: what they plan to use the platform for
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_surveys_user ON user_surveys(user_id);
    CREATE INDEX IF NOT EXISTS idx_surveys_role ON user_surveys(role);

    -- ===== Personalization: avatar frames =====
    CREATE TABLE IF NOT EXISTS avatar_frames (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      name_zh TEXT,
      description TEXT,
      description_zh TEXT,
      css_class TEXT NOT NULL,
      requirement_type TEXT NOT NULL DEFAULT 'none',  -- none, documents, posts, upvotes, login_days
      requirement_value INTEGER NOT NULL DEFAULT 0,
      price_ohbit INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    -- ===== Personalization: profile wallpapers =====
    CREATE TABLE IF NOT EXISTS wallpapers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      name_zh TEXT,
      css_value TEXT NOT NULL,
      requirement_type TEXT NOT NULL DEFAULT 'none',
      requirement_value INTEGER NOT NULL DEFAULT 0,
      price_ohbit INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    -- ===== Purchased items (Ohbit shop) =====
    CREATE TABLE IF NOT EXISTS purchased_items (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      item_type TEXT NOT NULL,  -- 'frame' | 'wallpaper'
      item_id TEXT NOT NULL,
      purchased_at INTEGER NOT NULL,
      UNIQUE(user_id, item_type, item_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_purchased_user ON purchased_items(user_id);

    -- ===== User task progress =====
    CREATE TABLE IF NOT EXISTS user_tasks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      task_type TEXT NOT NULL,  -- daily_login, upload_document, post_question, receive_upvote, answer_question
      progress INTEGER NOT NULL DEFAULT 0,
      target INTEGER NOT NULL,
      period_start INTEGER NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      UNIQUE(user_id, task_type, period_start)
    );
    CREATE INDEX IF NOT EXISTS idx_user_tasks_user ON user_tasks(user_id);

    -- ===== Groups (persistent chat rooms) =====
    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      avatar TEXT,
      privacy TEXT NOT NULL DEFAULT 'public',  -- 'public' | 'private'
      invite_code TEXT UNIQUE,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_groups_owner ON groups(owner_id);
    CREATE INDEX IF NOT EXISTS idx_groups_privacy ON groups(privacy);

    CREATE TABLE IF NOT EXISTS group_members (
      group_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',  -- 'owner' | 'admin' | 'member'
      joined_at INTEGER NOT NULL,
      PRIMARY KEY (group_id, user_id),
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS group_messages (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      author_id TEXT NOT NULL,
      content TEXT NOT NULL,
      msg_type TEXT NOT NULL DEFAULT 'text',  -- 'text' | 'emoji' | 'file' | 'announcement'
      file_url TEXT,
      file_name TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
      FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_group_msg_group ON group_messages(group_id);
    CREATE INDEX IF NOT EXISTS idx_group_msg_time ON group_messages(created_at);

    CREATE TABLE IF NOT EXISTS group_announcements (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      author_id TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      is_pinned INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
      FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_group_ann_group ON group_announcements(group_id);

    CREATE TABLE IF NOT EXISTS group_files (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      uploader_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_url TEXT NOT NULL,
      file_size INTEGER,
      mime TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
      FOREIGN KEY (uploader_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_group_files_group ON group_files(group_id);
  `);

  seedPersonalization(db);
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
  ensure('users', 'role', "TEXT DEFAULT 'user'");
  ensure('users', 'language', "TEXT DEFAULT 'en'");
  ensure('users', 'avatar_frame', "TEXT DEFAULT 'none'");
  ensure('users', 'wallpaper', "TEXT DEFAULT 'default'");
  ensure('rooms', 'expires_at', 'INTEGER');
  ensure('avatar_frames', 'price_ohbit', 'INTEGER NOT NULL DEFAULT 0');
  ensure('wallpapers', 'price_ohbit', 'INTEGER NOT NULL DEFAULT 0');

  // Set Ohbit prices for existing frames
  const framePrices: Record<string, number> = {
    'none': 0, 'laurel_bronze': 50, 'laurel_silver': 100, 'laurel_gold': 200,
    'laurel_rainbow': 150, 'laurel_neon': 300, 'laurel_diamond': 500, 'laurel_flame': 400, 'admin_tech': 0
  };
  for (const [id, price] of Object.entries(framePrices)) {
    db.prepare('UPDATE avatar_frames SET price_ohbit = ? WHERE id = ? AND price_ohbit = 0').run(price, id);
  }

  const wpPrices: Record<string, number> = {
    'default': 0, 'sunset': 80, 'ocean': 120, 'forest': 100, 'midnight': 200,
    'cherry': 150, 'aurora': 250, 'ember': 180, 'galaxy': 300, 'geometric': 220
  };
  for (const [id, price] of Object.entries(wpPrices)) {
    db.prepare('UPDATE wallpapers SET price_ohbit = ? WHERE id = ? AND price_ohbit = 0').run(price, id);
  }

  // Ensure new personalization seed data exists (re-seed if admin_tech frame missing)
  const hasAdminFrame = db.prepare("SELECT id FROM avatar_frames WHERE id = 'admin_tech'").get();
  if (!hasAdminFrame) {
    db.exec("DELETE FROM avatar_frames");
    db.exec("DELETE FROM wallpapers");
    // Re-run seed
    seedPersonalization(db);
  }

  // Auto-assign super_admin role to the designated super admin email
  const superAdmin = db.prepare(`SELECT id, role FROM users WHERE email = ?`).get('freshpinapple20120518@outlook.com') as { id: string; role: string | null } | undefined;
  if (superAdmin && superAdmin.role !== 'super_admin') {
    db.prepare(`UPDATE users SET role = 'super_admin' WHERE id = ?`).run(superAdmin.id);
  }
}

function seedPersonalization(db: DatabaseSync) {
  const now = Date.now();

  // Check if already seeded
  const existing = db.prepare('SELECT id FROM avatar_frames LIMIT 1').get();
  if (existing) return;

  // Avatar frames - unlocked by tasks (laurel wreath themed)
  const frames = [
    { id: 'none', name: 'None', name_zh: '无', css_class: '', requirement_type: 'none', requirement_value: 0, sort_order: 0 },
    { id: 'laurel_bronze', name: 'Bronze Laurel', name_zh: '铜桂冠', css_class: 'frame-laurel-bronze', requirement_type: 'documents', requirement_value: 1, sort_order: 1, description: 'A simple bronze laurel wreath', description_zh: '简约铜制桂冠' },
    { id: 'laurel_silver', name: 'Silver Laurel', name_zh: '银桂冠', css_class: 'frame-laurel-silver', requirement_type: 'documents', requirement_value: 5, sort_order: 2, description: 'A silver laurel with delicate leaves', description_zh: '精致银叶桂冠' },
    { id: 'laurel_gold', name: 'Golden Laurel', name_zh: '金桂冠', css_class: 'frame-laurel-gold', requirement_type: 'documents', requirement_value: 10, sort_order: 3, description: 'A radiant golden laurel crown', description_zh: '光芒四射的金色桂冠' },
    { id: 'laurel_rainbow', name: 'Prismatic Laurel', name_zh: '棱光桂冠', css_class: 'frame-laurel-rainbow', requirement_type: 'posts', requirement_value: 5, sort_order: 4, description: 'A shimmering prismatic laurel', description_zh: '闪烁的棱光桂冠' },
    { id: 'laurel_neon', name: 'Neon Laurel', name_zh: '霓虹桂冠', css_class: 'frame-laurel-neon', requirement_type: 'upvotes', requirement_value: 20, sort_order: 5, description: 'A neon-lit laurel wreath', description_zh: '霓虹灯光桂冠' },
    { id: 'laurel_diamond', name: 'Diamond Laurel', name_zh: '钻石桂冠', css_class: 'frame-laurel-diamond', requirement_type: 'login_days', requirement_value: 30, sort_order: 6, description: 'A diamond-encrusted laurel crown', description_zh: '镶嵌钻石的桂冠' },
    { id: 'laurel_flame', name: 'Inferno Laurel', name_zh: '烈焰桂冠', css_class: 'frame-laurel-flame', requirement_type: 'documents', requirement_value: 25, sort_order: 7, description: 'A blazing flame laurel wreath', description_zh: '烈焰燃烧的桂冠' },
    { id: 'admin_tech', name: 'Admin Circuit', name_zh: '管理员电路', css_class: 'frame-admin-tech', requirement_type: 'none', requirement_value: 0, sort_order: 99, description: 'Exclusive admin tech frame with circuit patterns', description_zh: '管理员专属科技电路边框' },
  ];

  const insertFrame = db.prepare('INSERT INTO avatar_frames (id, name, name_zh, description, description_zh, css_class, requirement_type, requirement_value, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  for (const f of frames) {
    insertFrame.run(f.id, f.name, f.name_zh, f.description || null, f.description_zh || null, f.css_class, f.requirement_type, f.requirement_value, f.sort_order, now);
  }

  // Wallpapers - upgraded with patterns and CSS gradients layered
  const wallpapersList = [
    { id: 'default', name: 'Default', name_zh: '默认', css_value: '', requirement_type: 'none', requirement_value: 0, sort_order: 0 },
    { id: 'sunset', name: 'Sunset Glow', name_zh: '日落余晖', css_value: 'linear-gradient(135deg, #ff6b6b, #feca57), radial-gradient(circle at 20% 80%, rgba(255,107,107,0.3) 0%, transparent 50%)', requirement_type: 'documents', requirement_value: 3, sort_order: 1 },
    { id: 'ocean', name: 'Deep Ocean', name_zh: '深海', css_value: 'linear-gradient(135deg, #667eea, #764ba2), repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.03) 20px, rgba(255,255,255,0.03) 40px)', requirement_type: 'posts', requirement_value: 3, sort_order: 2 },
    { id: 'forest', name: 'Enchanted Forest', name_zh: '魔法森林', css_value: 'linear-gradient(135deg, #11998e, #38ef7d), radial-gradient(circle at 70% 30%, rgba(56,239,125,0.2) 0%, transparent 40%), radial-gradient(circle at 30% 70%, rgba(17,153,142,0.2) 0%, transparent 40%)', requirement_type: 'login_days', requirement_value: 7, sort_order: 3 },
    { id: 'midnight', name: 'Starry Midnight', name_zh: '星夜', css_value: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e), radial-gradient(1px 1px at 10% 20%, #fff 50%, transparent), radial-gradient(1px 1px at 30% 60%, #fff 50%, transparent), radial-gradient(1px 1px at 50% 10%, #fff 50%, transparent), radial-gradient(1px 1px at 70% 40%, #fff 50%, transparent), radial-gradient(1px 1px at 90% 80%, #fff 50%, transparent), radial-gradient(1px 1px at 15% 90%, #fff 50%, transparent), radial-gradient(1px 1px at 60% 70%, #fff 50%, transparent), radial-gradient(1px 1px at 85% 25%, #fff 50%, transparent)', requirement_type: 'upvotes', requirement_value: 10, sort_order: 4 },
    { id: 'cherry', name: 'Cherry Blossom', name_zh: '樱花飘落', css_value: 'linear-gradient(135deg, #ffecd2, #fcb69f), radial-gradient(circle at 25% 25%, rgba(255,183,197,0.4) 0%, transparent 30%), radial-gradient(circle at 75% 75%, rgba(255,183,197,0.3) 0%, transparent 25%), radial-gradient(circle at 50% 50%, rgba(252,182,159,0.2) 0%, transparent 35%)', requirement_type: 'documents', requirement_value: 8, sort_order: 5 },
    { id: 'aurora', name: 'Northern Aurora', name_zh: '北极光', css_value: 'linear-gradient(135deg, #00c6ff, #0072ff, #7c3aed, #f43f5e), linear-gradient(45deg, transparent 40%, rgba(0,198,255,0.1) 50%, transparent 60%), linear-gradient(-45deg, transparent 40%, rgba(124,58,237,0.1) 50%, transparent 60%)', requirement_type: 'login_days', requirement_value: 14, sort_order: 6 },
    { id: 'ember', name: 'Dragon Ember', name_zh: '龙焰余烬', css_value: 'linear-gradient(135deg, #f12711, #f5af19), radial-gradient(circle at 30% 70%, rgba(241,39,17,0.3) 0%, transparent 40%), radial-gradient(circle at 70% 30%, rgba(245,175,25,0.3) 0%, transparent 40%), repeating-conic-gradient(from 0deg at 50% 50%, transparent 0deg, rgba(255,255,255,0.02) 5deg, transparent 10deg)', requirement_type: 'posts', requirement_value: 10, sort_order: 7 },
    { id: 'galaxy', name: 'Cosmic Galaxy', name_zh: '宇宙星河', css_value: 'linear-gradient(135deg, #0c0c1d, #1a1a3e, #2d1b69), radial-gradient(ellipse at 20% 50%, rgba(100,50,200,0.3) 0%, transparent 50%), radial-gradient(ellipse at 80% 50%, rgba(50,100,200,0.2) 0%, transparent 50%), radial-gradient(1px 1px at 20% 30%, #fff 50%, transparent), radial-gradient(1px 1px at 40% 70%, #fff 50%, transparent), radial-gradient(1px 1px at 60% 20%, #fff 50%, transparent), radial-gradient(1px 1px at 80% 60%, #fff 50%, transparent), radial-gradient(1.5px 1.5px at 50% 50%, #a78bfa 50%, transparent)', requirement_type: 'login_days', requirement_value: 30, sort_order: 8 },
    { id: 'geometric', name: 'Geometric Harmony', name_zh: '几何和谐', css_value: 'linear-gradient(135deg, #667eea, #764ba2), repeating-linear-gradient(60deg, transparent, transparent 30px, rgba(255,255,255,0.04) 30px, rgba(255,255,255,0.04) 31px), repeating-linear-gradient(-60deg, transparent, transparent 30px, rgba(255,255,255,0.04) 30px, rgba(255,255,255,0.04) 31px)', requirement_type: 'upvotes', requirement_value: 30, sort_order: 9 },
  ];

  const insertWallpaper = db.prepare('INSERT INTO wallpapers (id, name, name_zh, css_value, requirement_type, requirement_value, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  for (const w of wallpapersList) {
    insertWallpaper.run(w.id, w.name, w.name_zh, w.css_value, w.requirement_type, w.requirement_value, w.sort_order, now);
  }
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
  language: string | null;
  avatar_frame: string | null;
  wallpaper: string | null;
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

export interface FeedbackRow {
  id: string;
  user_id: string;
  category: string;
  title: string;
  content: string;
  status: string;
  admin_reply: string | null;
  created_at: number;
}

export interface VerificationCodeRow {
  id: string;
  email: string;
  code: string;
  purpose: string;
  expires_at: number;
  used: number;
  created_at: number;
}

export interface ReportRow {
  id: string;
  reporter_id: string;
  post_id: string;
  reason: string;
  status: string;
  admin_note: string | null;
  created_at: number;
}

export interface ViolationRow {
  id: string;
  post_id: string | null;
  author_id: string;
  reason: string;
  content_preview: string | null;
  status: string;
  source: string;
  created_at: number;
}

export interface AvatarFrameRow {
  id: string;
  name: string;
  name_zh: string | null;
  description: string | null;
  description_zh: string | null;
  css_class: string;
  requirement_type: string;
  requirement_value: number;
  sort_order: number;
  created_at: number;
}

export interface WallpaperRow {
  id: string;
  name: string;
  name_zh: string | null;
  css_value: string;
  requirement_type: string;
  requirement_value: number;
  sort_order: number;
  created_at: number;
}

export interface UserTaskRow {
  id: string;
  user_id: string;
  task_type: string;
  progress: number;
  target: number;
  period_start: number;
  completed: number;
  created_at: number;
}
