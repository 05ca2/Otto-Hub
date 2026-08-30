'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowUp, ArrowDown, ArrowLeft, Loader2, Send, Sparkles, MessageSquare, Reply } from 'lucide-react';

type ExploreItem = {
  id: string;
  kind: string;
  title: string;
  content: string;
  created_at: number;
  author_id: string;
  author_name: string;
  author_image: string | null;
  score: number;
  my_vote: number;
  comment_count: number;
  tags: string[] | null;
  visibility: string;
};

type Comment = {
  id: string;
  body: string;
  created_at: number;
  parent_id: string | null;
  author_id: string;
  author_name: string;
  author_image: string | null;
  score: number;
  my_vote: number;
};

export default function ExploreItemDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [type, setType] = useState<'generation' | 'post' | null>(null);
  const [item, setItem] = useState<ExploreItem | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [postingReply, setPostingReply] = useState(false);

  async function load() {
    const r = await fetch(`/api/explore/${params.id}`);
    if (r.status === 401) { router.push('/login'); return; }
    if (r.status === 404) { setNotFound(true); return; }
    const d = await r.json();
    setType(d.type);
    setItem(d.item);
    setComments(d.comments || []);
  }
  useEffect(() => { load(); }, [params.id]);

  const targetType = type === 'generation' ? 'cheatsheet' : 'post';

  // Build comment tree
  const commentTree = useMemo(() => {
    const map = new Map<string, Comment & { replies: Comment[] }>();
    const roots: (Comment & { replies: Comment[] })[] = [];
    
    for (const c of comments) {
      map.set(c.id, { ...c, replies: [] });
    }
    
    for (const c of comments) {
      const node = map.get(c.id)!;
      if (c.parent_id && map.has(c.parent_id)) {
        map.get(c.parent_id)!.replies.push(node);
      } else {
        roots.push(node);
      }
    }
    
    return roots;
  }, [comments]);

  async function vote(target: 'item' | 'comment', id: string, value: 1 | -1 | 0) {
    const r = await fetch('/api/vote', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ target_type: target === 'item' ? targetType : 'comment', target_id: id, value }),
    });
    if (r.ok) await load();
  }

  async function submitComment() {
    if (!body.trim() || type !== 'post') return;
    setPosting(true);
    try {
      const r = await fetch(`/api/posts/${params.id}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'comment', body }),
      });
      if (r.ok) { setBody(''); await load(); }
    } finally { setPosting(false); }
  }

  async function submitReply(parentId: string) {
    if (!replyBody.trim()) return;
    setPostingReply(true);
    try {
      const r = await fetch(`/api/posts/${params.id}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'comment', body: replyBody, parent_id: parentId }),
      });
      if (r.ok) { setReplyBody(''); setReplyTo(null); await load(); }
    } finally { setPostingReply(false); }
  }

  if (notFound) {
    return (
      <div className="space-y-6">
        <Link href="/explore" className="text-sm text-ink-600 hover:underline flex items-center gap-1"><ArrowLeft className="w-3.5 h-3.5" /> Back to explore</Link>
        <div className="rounded-xl border border-dashed border-ink-200 p-8 text-center text-sm text-ink-400">
          This item doesn&apos;t exist or is no longer public.
        </div>
      </div>
    );
  }

  if (!item) return <div className="text-ink-400 text-sm">Loading…</div>;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/explore" className="text-sm text-ink-600 hover:underline flex items-center gap-1"><ArrowLeft className="w-3.5 h-3.5" /> Back to explore</Link>
      </div>

      <article className="rounded-2xl border border-ink-100 bg-white p-6">
        <div className="flex gap-4">
          <div className="flex flex-col items-center text-sm text-ink-600 w-10 shrink-0">
            <button onClick={() => vote('item', item.id, item.my_vote === 1 ? 0 : 1)} className={`p-1 rounded hover:bg-ink-100 ${item.my_vote === 1 ? 'text-accent-600' : ''}`} aria-label="Upvote"><ArrowUp className="w-5 h-5" /></button>
            <span className="tabular-nums">{item.score}</span>
            <button onClick={() => vote('item', item.id, item.my_vote === -1 ? 0 : -1)} className={`p-1 rounded hover:bg-ink-100 ${item.my_vote === -1 ? 'text-red-500' : ''}`} aria-label="Downvote"><ArrowDown className="w-5 h-5" /></button>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {type === 'generation'
                ? <Sparkles className="w-4 h-4 text-accent-500 shrink-0" />
                : <MessageSquare className="w-4 h-4 text-accent-500 shrink-0" />}
              <span className="text-xs uppercase tracking-wide text-accent-600 font-medium">{type === 'generation' ? item.kind : 'Community post'}</span>
            </div>
            <h1 className="text-2xl font-semibold mt-1">{item.title}</h1>
            <div className="text-xs text-ink-400 mt-1.5 flex flex-wrap items-center gap-2">
              <Avatar name={item.author_name} image={item.author_image} />
              <span>by <Link href={`/u/${item.author_id}`} className="font-medium hover:underline">{item.author_name}</Link></span>
              <span>·</span>
              <span>{new Date(item.created_at).toLocaleString()}</span>
              {item.tags && item.tags.length > 0 && item.tags.map((t) => (
                <span key={t} className="px-1.5 py-0.5 rounded bg-ink-100 text-ink-600">#{t}</span>
              ))}
            </div>
            <div className="markdown-body text-sm mt-4">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.content}</ReactMarkdown>
            </div>
          </div>
        </div>
      </article>

      <section>
        <h2 className="text-lg font-semibold mb-3">
          {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
        </h2>
        {comments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ink-200 p-6 text-center text-sm text-ink-400">
            No comments yet.
          </div>
        ) : (
          <div className="space-y-3">
            {commentTree.map((c) => (
              <CommentItem 
                key={c.id} 
                comment={c} 
                depth={0}
                vote={vote} 
                targetType={targetType}
                replyTo={replyTo}
                setReplyTo={setReplyTo}
                replyBody={replyBody}
                setReplyBody={setReplyBody}
                submitReply={submitReply}
                postingReply={postingReply}
              />
            ))}
          </div>
        )}

        {type === 'post' && (
          <div className="mt-4 rounded-xl border border-ink-100 bg-white p-4">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write a comment (Markdown OK)…"
              className="w-full border border-ink-200 rounded-md p-2 text-sm min-h-[80px] font-mono"
            />
            <div className="flex justify-end mt-2">
              <button onClick={submitComment} disabled={!body.trim() || posting} className="px-3 py-1.5 rounded bg-accent-500 text-white text-sm font-medium hover:bg-accent-600 disabled:opacity-50 flex items-center gap-1.5">
                {posting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                {posting ? 'Posting…' : 'Comment'}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function CommentItem({ 
  comment, 
  depth, 
  vote, 
  targetType,
  replyTo,
  setReplyTo,
  replyBody,
  setReplyBody,
  submitReply,
  postingReply
}: {
  comment: Comment & { replies: Comment[] };
  depth: number;
  vote: (target: 'item' | 'comment', id: string, value: 1 | -1 | 0) => Promise<void>;
  targetType: string;
  replyTo: string | null;
  setReplyTo: (id: string | null) => void;
  replyBody: string;
  setReplyBody: (body: string) => void;
  submitReply: (parentId: string) => Promise<void>;
  postingReply: boolean;
}) {
  const maxDepth = 3;
  
  return (
    <div className={depth > 0 ? 'ml-6 mt-2' : ''}>
      <div className="rounded-xl border border-ink-100 bg-white p-4 flex gap-3">
        <div className="flex flex-col items-center text-sm text-ink-600 w-10 shrink-0">
          <button onClick={() => vote('comment', comment.id, comment.my_vote === 1 ? 0 : 1)} className={`p-1 rounded hover:bg-ink-100 ${comment.my_vote === 1 ? 'text-accent-600' : ''}`} aria-label="Upvote comment"><ArrowUp className="w-4 h-4" /></button>
          <span className="tabular-nums">{comment.score}</span>
          <button onClick={() => vote('comment', comment.id, comment.my_vote === -1 ? 0 : -1)} className={`p-1 rounded hover:bg-ink-100 ${comment.my_vote === -1 ? 'text-red-500' : ''}`} aria-label="Downvote comment"><ArrowDown className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 min-w-0">
          <div className="markdown-body text-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{comment.body}</ReactMarkdown>
          </div>
          <div className="text-xs text-ink-400 mt-2 flex items-center gap-2">
            <Avatar name={comment.author_name} image={comment.author_image} />
            <span>by <Link href={`/u/${comment.author_id}`} className="hover:underline">{comment.author_name}</Link></span>
            <span>·</span>
            <span>{new Date(comment.created_at).toLocaleString()}</span>
            {depth < maxDepth && (
              <button 
                onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                className="ml-2 text-accent-600 hover:underline flex items-center gap-1"
              >
                <Reply className="w-3 h-3" /> Reply
              </button>
            )}
          </div>
          
          {/* Reply input */}
          {replyTo === comment.id && (
            <div className="mt-3 rounded-lg border border-ink-200 bg-ink-50 p-3">
              <textarea
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                placeholder="Write a reply (Markdown OK)…"
                className="w-full border border-ink-200 rounded-md p-2 text-sm min-h-[60px] font-mono bg-white"
                autoFocus
              />
              <div className="flex justify-end gap-2 mt-2">
                <button onClick={() => { setReplyTo(null); setReplyBody(''); }} className="px-2 py-1 text-xs rounded hover:bg-ink-100">Cancel</button>
                <button 
                  onClick={() => submitReply(comment.id)} 
                  disabled={!replyBody.trim() || postingReply}
                  className="px-2 py-1 text-xs rounded bg-accent-500 text-white hover:bg-accent-600 disabled:opacity-50 flex items-center gap-1"
                >
                  {postingReply ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                  Reply
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Nested replies */}
      {comment.replies.length > 0 && depth < maxDepth && (
        <div className="space-y-2">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={{ ...reply, replies: [] }}
              depth={depth + 1}
              vote={vote}
              targetType={targetType}
              replyTo={replyTo}
              setReplyTo={setReplyTo}
              replyBody={replyBody}
              setReplyBody={setReplyBody}
              submitReply={submitReply}
              postingReply={postingReply}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Avatar({ name, image }: { name: string; image: string | null }) {
  if (image) return <img src={image} alt="" className="w-5 h-5 rounded-full" />;
  return <span className="w-5 h-5 rounded-full bg-accent-500 text-white text-[10px] font-medium flex items-center justify-center">{(name || '?').slice(0, 1).toUpperCase()}</span>;
}
