'use client';

// Reader component - document display + chat with Otter AI

import { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MessageCircle, Loader2, Send, X, Bot, User } from 'lucide-react';

type QaItem = {
  id: string;
  question: string;
  answer: string;
  citations: string | null;
  created_at: number;
};

type Generation = {
  id: string;
  kind: 'cheatsheet' | 'questions' | 'summary';
  content: string;
  created_at: number;
  visibility?: 'private' | 'public' | 'room';
};

type ChatMessage = {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
};

export function Reader({
  documentId,
  title,
  description,
  content,
  initialAnnotations,
  initialGenerations,
  initialQa,
}: {
  documentId: string;
  title: string;
  description: string;
  content: string;
  initialAnnotations: any[];
  initialGenerations: Generation[];
  initialQa: QaItem[];
}) {
  const [docTitle, setDocTitle] = useState(title);
  const [docDescription, setDocDescription] = useState(description);
  const [generations, setGenerations] = useState<Generation[]>(initialGenerations);
  const [qa, setQa] = useState<QaItem[]>(initialQa);
  const [editingDoc, setEditingDoc] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const [editDesc, setEditDesc] = useState(description);
  const [savingDoc, setSavingDoc] = useState(false);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Generation state
  const [genKind, setGenKind] = useState<'cheatsheet' | 'questions' | 'summary'>('cheatsheet');
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [activeGenId, setActiveGenId] = useState<string | null>(
    initialGenerations[0]?.id ?? null,
  );
  const [provider, setProvider] = useState<'sensenova' | 'openrouter' | 'custom'>('sensenova');
  const [questionCount, setQuestionCount] = useState<number>(5);

  // Selected text for context
  const [selectedText, setSelectedText] = useState<string | null>(null);

  const PROVIDER_LABELS: Record<string, string> = {
    sensenova: 'SenseNova (6.7 Flash-Lite)',
    openrouter: 'OpenRouter (Nemotron 3 Super)',
    custom: 'Custom Model',
  };

  // Load chat history on mount
  useEffect(() => {
    async function loadChatHistory() {
      try {
        const res = await fetch(`/api/chat?documentId=${documentId}&limit=100`);
        if (res.ok) {
          const data = await res.json();
          if (data.messages && data.messages.length > 0) {
            setChatMessages(data.messages.map((m: any) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              timestamp: m.created_at,
            })));
            // Scroll to bottom after loading
            setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
          }
        }
      } catch (err) {
        console.error('Failed to load chat history:', err);
      }
    }
    loadChatHistory();
  }, [documentId]);

  // Capture text selection for context
  const onMouseUp = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) {
      setSelectedText(null);
      return;
    }
    const text = sel.toString().trim();
    if (text.length > 10) {
      setSelectedText(text.slice(0, 500)); // Limit context
    }
  }, []);

  // Send message to Otter
  async function sendChat() {
    if (!chatInput.trim()) return;
    
    const userMessage: ChatMessage = {
      role: 'user',
      content: chatInput,
      timestamp: Date.now(),
    };
    
    // Save user message to API
    try {
      const saveRes = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          documentId,
          role: 'user',
          content: chatInput,
        }),
      });
      if (saveRes.ok) {
        const saveData = await saveRes.json();
        userMessage.id = saveData.id;
      }
    } catch (err) {
      console.error('Failed to save user message:', err);
    }
    
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setChatLoading(true);
    setChatError(null);
    
    // Scroll to bottom
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

    try {
      // Build context from document and selected text
      const contextParts = [`Document: ${docTitle}`];
      if (selectedText) {
        contextParts.push(`Selected text: "${selectedText}"`);
      }
      contextParts.push(`Full document content:\n${content.slice(0, 2000)}`);
      
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          documentId,
          quoted: contextParts.join('\n\n'),
          startOffset: 0,
          endOffset: content.length,
          question: chatInput,
          provider,
        }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to get response');
      }
      
      // Handle streaming response
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      
      // Add empty assistant message
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
      };
      setChatMessages(prev => [...prev, assistantMessage]);
      
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const text = decoder.decode(value);
          const lines = text.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.chunk) {
                  assistantContent += data.chunk;
                  setChatMessages(prev => {
                    const msgs = [...prev];
                    msgs[msgs.length - 1] = {
                      ...msgs[msgs.length - 1],
                      content: assistantContent,
                    };
                    return msgs;
                  });
                  // Auto-scroll during streaming
                  setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 10);
                }
                if (data.error) {
                  throw new Error(data.error);
                }
              } catch (e) {
                // Ignore parse errors for incomplete chunks
              }
            }
          }
        }
      }
      
      // Save assistant message to API after streaming completes
      if (assistantContent) {
        try {
          const saveRes = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              documentId,
              role: 'assistant',
              content: assistantContent,
            }),
          });
          if (saveRes.ok) {
            const saveData = await saveRes.json();
            setChatMessages(prev => {
              const msgs = [...prev];
              msgs[msgs.length - 1] = {
                ...msgs[msgs.length - 1],
                id: saveData.id,
              };
              return msgs;
            });
          }
        } catch (err) {
          console.error('Failed to save assistant message:', err);
        }
      }
    } catch (err) {
      setChatError(err instanceof Error ? err.message : 'Failed to get response');
      // Remove the empty assistant message if there was an error
      setChatMessages(prev => prev.slice(0, -1));
    } finally {
      setChatLoading(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }

  async function generate() {
    setGenLoading(true);
    setGenError(null);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ documentId, kind: genKind, provider, questionCount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      const newGen: Generation = {
        id: data.id,
        kind: genKind,
        content: data.content,
        created_at: Date.now(),
        visibility: 'private',
      };
      setGenerations((prev) => [newGen, ...prev]);
      setActiveGenId(newGen.id);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenLoading(false);
    }
  }

  async function saveDocInfo() {
    if (!editTitle.trim()) return;
    setSavingDoc(true);
    try {
      const res = await fetch(`/api/documents/${documentId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: editTitle, description: editDesc }),
      });
      if (res.ok) {
        setDocTitle(editTitle);
        setDocDescription(editDesc);
        setEditingDoc(false);
      }
    } finally { setSavingDoc(false); }
  }

  const [shareConfirm, setShareConfirm] = useState<{ genId: string; next: 'private' | 'public' } | null>(null);

  async function shareToggle(genId: string, current: 'private' | 'public' | 'room' | undefined) {
    const next = current === 'public' ? 'private' : 'public';
    if (next === 'public') {
      setShareConfirm({ genId, next });
      return;
    }
    const res = await fetch('/api/share', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ generation_id: genId, visibility: next }),
    });
    if (res.ok) {
      setGenerations((prev) => prev.map((g) => (g.id === genId ? { ...g, visibility: next } : g)));
    }
  }

  async function confirmShare() {
    if (!shareConfirm) return;
    const res = await fetch('/api/share', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ generation_id: shareConfirm.genId, visibility: shareConfirm.next }),
    });
    if (res.ok) {
      setGenerations((prev) => prev.map((g) => (g.id === shareConfirm.genId ? { ...g, visibility: shareConfirm.next } : g)));
    }
    setShareConfirm(null);
  }

  function downloadGeneration(gen: Generation) {
    const ext = gen.kind === 'questions' ? 'json' : 'md';
    const mime = gen.kind === 'questions' ? 'application/json' : 'text/markdown';
    const blob = new Blob([gen.content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || 'document'}-${gen.kind}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const activeGen = generations.find((g) => g.id === activeGenId) ?? generations[0];

  return (
    <div className="grid lg:grid-cols-[1fr_420px] gap-6">
      {/* Left: the document text */}
      <article className="rounded-2xl border border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-800 p-6 relative" onMouseUp={onMouseUp}>
        <header className="mb-4 pb-4 border-b border-ink-100 dark:border-ink-700">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h1 className="text-2xl font-semibold dark:text-ink-100">{docTitle}</h1>
              {docDescription && <p className="text-sm text-ink-600 dark:text-ink-400 mt-1">{docDescription}</p>}
            </div>
            <button onClick={() => { setEditTitle(docTitle); setEditDesc(docDescription); setEditingDoc(true); }}
              className="px-2 py-1 text-xs rounded border border-ink-200 dark:border-ink-600 text-ink-600 dark:text-ink-400 hover:bg-ink-50 dark:hover:bg-ink-700 shrink-0">
              Edit info
            </button>
          </div>
          <p className="text-sm text-ink-400 dark:text-ink-500 mt-1">
            {content.length.toLocaleString()} characters
            {selectedText && (
              <span className="ml-2 text-accent-600">
                · Selected text will be used as context for Otter
              </span>
            )}
          </p>
        </header>
        <div className="font-serif text-[17px] leading-7 whitespace-pre-wrap break-words dark:text-ink-200">
          {content}
        </div>
      </article>

      {/* Right: Chat with Otter + Generation */}
      <aside className="space-y-4">
        {/* Chat Window */}
        <div className="rounded-2xl border border-ink-200 dark:border-ink-600 bg-white dark:bg-ink-800 p-4 flex flex-col h-[500px]">
          <div className="flex items-center gap-2 mb-3 pb-3 border-b border-ink-200 dark:border-ink-600">
            <Bot className="w-5 h-5 text-accent-500" />
            <h3 className="font-semibold dark:text-ink-100">Otter</h3>
            <span className="text-xs text-ink-400 ml-auto">AI Assistant</span>
          </div>
          
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto space-y-3 mb-3 pr-1">
            {chatMessages.length === 0 && (
              <div className="text-center text-ink-400 dark:text-ink-500 text-sm py-8">
                <Bot className="w-8 h-8 mx-auto mb-2 text-ink-300 dark:text-ink-600" />
                <p>Hi! I'm Otter 🦦</p>
                <p className="mt-1">Ask me anything about this document.</p>
                <p className="mt-1 text-xs">Select text to use as context</p>
              </div>
            )}
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center shrink-0">
                    <Bot className="w-3.5 h-3.5 text-accent-600 dark:text-accent-400" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                  msg.role === 'user' 
                    ? 'bg-accent-500 text-white' 
                    : 'bg-ink-100 dark:bg-ink-700 text-ink-800 dark:text-ink-200'
                }`}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                </div>
                {msg.role === 'user' && (
                  <div className="w-6 h-6 rounded-full bg-ink-200 dark:bg-ink-600 flex items-center justify-center shrink-0">
                    <User className="w-3.5 h-3.5 text-ink-600 dark:text-ink-300" />
                  </div>
                )}
              </div>
            ))}
            {chatLoading && (
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5 text-accent-600 dark:text-accent-400" />
                </div>
                <div className="bg-ink-100 dark:bg-ink-700 rounded-xl px-3 py-2 text-sm text-ink-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          
          {/* Chat Input */}
          <div className="border-t border-ink-200 dark:border-ink-600 pt-3">
            {selectedText && (
              <div className="mb-2 px-2 py-1 bg-accent-50 dark:bg-accent-900/20 rounded text-xs text-accent-700 dark:text-accent-400 flex items-center gap-1">
                <span className="truncate flex-1">"{selectedText.slice(0, 100)}..."</span>
                <button onClick={() => setSelectedText(null)} className="p-0.5 hover:bg-accent-100 dark:hover:bg-accent-800/30 rounded">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendChat()}
                placeholder="Ask Otter anything..."
                className="flex-1 border border-ink-200 dark:border-ink-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-ink-900 dark:text-ink-100 placeholder:text-ink-400 dark:placeholder:text-ink-500 focus:outline-none focus:ring-2 focus:ring-accent-400"
                disabled={chatLoading}
              />
              <button
                onClick={sendChat}
                disabled={chatLoading || !chatInput.trim()}
                className="px-3 py-2 rounded-lg bg-accent-500 text-white hover:bg-accent-600 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            {chatError && <p className="text-xs text-red-600 mt-1">{chatError}</p>}
          </div>
        </div>

        {/* Generation Section */}
        <div className="rounded-2xl border border-ink-200 dark:border-ink-600 bg-white dark:bg-ink-800 p-4">
          <h3 className="text-sm font-semibold mb-3 dark:text-ink-100">Generate</h3>
          <div className="flex flex-wrap gap-2 mb-3">
            {(['cheatsheet','questions','summary'] as const).map((k) => (
              <button
                key={k}
                onClick={() => setGenKind(k)}
                className={`px-2.5 py-1 rounded text-xs font-medium border ${genKind === k ? 'bg-accent-500 text-white border-accent-500' : 'border-ink-200 dark:border-ink-600 text-ink-600 dark:text-ink-400 hover:bg-ink-50 dark:hover:bg-ink-700'}`}
              >
                {k}
              </button>
            ))}
            {genKind === 'questions' && (
              <div className="flex items-center gap-1 ml-2">
                <span className="text-xs text-ink-600 dark:text-ink-400">Count:</span>
                <select
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  className="border border-ink-200 dark:border-ink-600 rounded px-2 py-1 text-xs bg-white dark:bg-ink-900 dark:text-ink-200 focus:outline-none focus:ring-1 focus:ring-accent-400"
                >
                  {[3, 5, 7, 10, 15, 20].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            )}
            <button
              onClick={generate}
              disabled={genLoading}
              className="ml-auto px-3 py-1.5 rounded bg-ink-900 dark:bg-ink-700 text-white text-sm font-medium hover:bg-ink-800 dark:hover:bg-ink-600 disabled:opacity-50 flex items-center gap-1.5"
            >
              {genLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              {genLoading ? 'Generating…' : 'Generate'}
            </button>
          </div>
          
          <div className="mb-3 flex items-center gap-2 text-xs text-ink-600 dark:text-ink-400">
            <span className="font-medium">Model:</span>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as 'sensenova' | 'openrouter' | 'custom')}
              className="border border-ink-200 dark:border-ink-600 rounded px-2 py-1 text-xs bg-white dark:bg-ink-900 dark:text-ink-200 flex-1 focus:outline-none focus:ring-1 focus:ring-accent-400"
            >
              <option value="sensenova">SenseNova (6.7 Flash-Lite)</option>
              <option value="openrouter">OpenRouter (Nemotron 3 Super)</option>
              <option value="custom">Custom Model</option>
            </select>
          </div>
          
          {activeGen && (
            <div className="mb-3 flex items-center gap-2 text-xs">
              <span className="text-ink-600 dark:text-ink-400">Visibility:</span>
              <button
                onClick={() => shareToggle(activeGen.id, activeGen.visibility)}
                className={`px-2 py-0.5 rounded border text-xs font-medium ${activeGen.visibility === 'public' ? 'bg-green-100 text-green-700 border-green-200' : 'border-ink-200 dark:border-ink-600 text-ink-600 dark:text-ink-400 hover:bg-ink-50 dark:hover:bg-ink-700'}`}
              >
                {activeGen.visibility === 'public' ? '🌐 Public' : '🔒 Private'}
              </button>
              {activeGen.visibility === 'public' && (
                <a href="/explore" className="text-accent-600 hover:underline">view in Explore →</a>
              )}
              {(activeGen.kind === 'cheatsheet' || activeGen.kind === 'summary') && (
                <button
                  onClick={() => downloadGeneration(activeGen)}
                  className="ml-auto px-2 py-0.5 rounded border border-ink-200 dark:border-ink-600 text-ink-600 dark:text-ink-400 hover:bg-ink-50 dark:hover:bg-ink-700 text-xs font-medium"
                  title="Download as Markdown"
                >
                  ⬇ Download
                </button>
              )}
            </div>
          )}
          
          {genError && <p className="text-sm text-red-600 mb-2">{genError}</p>}
          
          {generations.length > 1 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {generations.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setActiveGenId(g.id)}
                  className={`px-2 py-0.5 rounded text-[11px] border ${activeGen?.id === g.id ? 'border-accent-500 text-accent-600' : 'border-ink-200 dark:border-ink-600 text-ink-400 hover:bg-ink-50 dark:hover:bg-ink-700'}`}
                >
                  {g.kind}
                </button>
              ))}
            </div>
          )}
          
          {activeGen ? (
            activeGen.kind === 'questions' ? (
              <QuestionsView content={activeGen.content} generationId={activeGen.id} />
            ) : (
              <div className="markdown-body text-sm max-h-[60vh] overflow-y-auto pr-1 dark:text-ink-200">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{activeGen.content}</ReactMarkdown>
              </div>
            )
          ) : (
            <p className="text-sm text-ink-400 dark:text-ink-500">No generations yet. Pick a kind and hit Generate.</p>
          )}
        </div>
      </aside>

      {/* Edit Document Info Modal */}
      {editingDoc && (
        <div className="fixed inset-0 z-50 bg-ink-900/40 flex items-center justify-center p-4" onClick={() => setEditingDoc(false)}>
          <div className="bg-white dark:bg-ink-800 rounded-2xl shadow-2xl max-w-md w-full p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold mb-3 dark:text-ink-100">Edit document info</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-ink-200">Title</label>
                <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full border border-ink-200 dark:border-ink-600 rounded-md p-2 text-sm bg-white dark:bg-ink-900 dark:text-ink-100" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-ink-200">Description (optional)</label>
                <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="w-full border border-ink-200 dark:border-ink-600 rounded-md p-2 text-sm min-h-[80px] bg-white dark:bg-ink-900 dark:text-ink-100" placeholder="Brief description of this document..." />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setEditingDoc(false)} className="px-3 py-1.5 rounded text-sm hover:bg-ink-100 dark:hover:bg-ink-700 dark:text-ink-300">Cancel</button>
              <button onClick={saveDocInfo} disabled={!editTitle.trim() || savingDoc} className="px-3 py-1.5 rounded bg-accent-500 text-white text-sm font-medium hover:bg-accent-600 disabled:opacity-50 flex items-center gap-1.5">
                {savingDoc ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                {savingDoc ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Confirmation Modal */}
      {shareConfirm && (
        <div className="fixed inset-0 z-50 bg-ink-900/40 flex items-center justify-center p-4" onClick={() => setShareConfirm(null)}>
          <div className="bg-white dark:bg-ink-800 rounded-2xl shadow-2xl max-w-md w-full p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold mb-3 dark:text-ink-100">Share to Explore</h3>
            <p className="text-sm text-ink-600 dark:text-ink-400 mb-4">
              Make this <strong>{generations.find(g => g.id === shareConfirm.genId)?.kind}</strong> public? It will appear in the Explore page for everyone to see.
            </p>
            <div className="bg-ink-50 dark:bg-ink-700 rounded-lg p-3 mb-4">
              <div className="text-xs text-ink-500 dark:text-ink-400 mb-1">Title</div>
              <div className="text-sm font-medium dark:text-ink-100">{docTitle}</div>
              {docDescription && (
                <>
                  <div className="text-xs text-ink-500 dark:text-ink-400 mt-2 mb-1">Description</div>
                  <div className="text-sm text-ink-600 dark:text-ink-300">{docDescription}</div>
                </>
              )}
            </div>
            <p className="text-xs text-ink-500 dark:text-ink-400 mb-4">
              Tip: You can edit the title and description by clicking "Edit info" above the document.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShareConfirm(null)} className="px-3 py-1.5 rounded text-sm hover:bg-ink-100 dark:hover:bg-ink-700 dark:text-ink-300">Cancel</button>
              <button onClick={confirmShare} className="px-3 py-1.5 rounded bg-accent-500 text-white text-sm font-medium hover:bg-accent-600">
                Share publicly
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function QuestionsView({ content, generationId }: { content: string; generationId: string }) {
  let parsed: { questions?: Array<{ type: string; question: string; choices?: string[]; answer: string; explanation?: string }> } | null = null;
  try { parsed = JSON.parse(content); } catch { /* fall through */ }
  if (!parsed?.questions) {
    return (
      <div className="markdown-body text-sm max-h-[60vh] overflow-y-auto pr-1">
        <pre className="whitespace-pre-wrap">{content}</pre>
      </div>
    );
  }
  return (
    <QuestionsInteractive questions={parsed.questions} generationId={generationId} />
  );
}

function QuestionsInteractive({ questions, generationId }: { questions: Array<{ type: string; question: string; choices?: string[]; answer: string; explanation?: string }>; generationId: string }) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [scores, setScores] = useState<Record<number, number>>({});
  const [selectedChoice, setSelectedChoice] = useState<Record<number, number | null>>({});
  const [loading, setLoading] = useState(true);

  // Load quiz progress on mount
  useEffect(() => {
    async function loadProgress() {
      try {
        const res = await fetch(`/api/quiz?generationId=${generationId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.progress && data.progress.length > 0) {
            const newAnswers: Record<number, string> = {};
            const newChecked: Record<number, boolean> = {};
            const newScores: Record<number, number> = {};
            for (const p of data.progress) {
              newAnswers[p.question_index] = p.user_answer;
              newChecked[p.question_index] = p.is_correct === 1;
              if (p.user_answer && !isNaN(Number(p.user_answer))) {
                newScores[p.question_index] = Number(p.user_answer);
              }
            }
            setAnswers(newAnswers);
            setChecked(newChecked);
            setScores(newScores);
          }
        }
      } catch (err) {
        console.error('Failed to load quiz progress:', err);
      } finally {
        setLoading(false);
      }
    }
    loadProgress();
  }, [generationId]);

  function handleMCQSelect(i: number, choiceIndex: number) {
    if (checked[i]) return;
    setSelectedChoice(prev => ({ ...prev, [i]: choiceIndex }));
    setAnswers(prev => ({ ...prev, [i]: questions[i].choices?.[choiceIndex] || '' }));
  }

  async function handleCheck(i: number) {
    setChecked((prev) => ({ ...prev, [i]: true }));
    
    const q = questions[i];
    const isMCQ = q.type === 'mcq';
    
    // For MCQ: auto-grade; For short answer: save user's self-score
    let isCorrect = false;
    let userAnswer = answers[i] || '';
    
    if (isMCQ) {
      const userAns = userAnswer.trim().toLowerCase();
      const correctAns = q.answer.trim().toLowerCase();
      isCorrect = userAns === correctAns || q.choices?.findIndex((c) => c.toLowerCase() === userAns) !== -1;
    } else {
      // Short answer: use self-score
      userAnswer = String(scores[i] ?? 0);
      isCorrect = true; // Always mark as "completed" for self-grading
    }
    
    try {
      await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          generationId,
          questionIndex: i,
          userAnswer,
          isCorrect,
        }),
      });
    } catch (err) {
      console.error('Failed to save quiz progress:', err);
    }
  }

  function handleReset() {
    setAnswers({});
    setChecked({});
    setScores({});
    setSelectedChoice({});
    fetch(`/api/quiz?generationId=${generationId}`, { method: 'DELETE' }).catch(console.error);
  }

  // Calculate MCQ score
  const mcqCorrect = Object.keys(checked).filter((k) => {
    const i = Number(k);
    const q = questions[i];
    if (q.type !== 'mcq') return false;
    const userAns = (answers[i] || '').trim().toLowerCase();
    const correctAns = q.answer.trim().toLowerCase();
    return userAns === correctAns || q.choices?.findIndex((c) => c.toLowerCase() === userAns) !== -1;
  }).length;

  const mcqTotal = questions.filter(q => q.type === 'mcq').length;
  const shortAnswerTotal = questions.filter(q => q.type !== 'mcq').length;
  const totalSelfScore = Object.values(scores).reduce((a, b) => a + b, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-ink-400 text-sm">
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        Loading progress...
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
      <div className="flex items-center justify-between text-xs text-ink-600 dark:text-ink-400 mb-2">
        <div className="flex gap-3">
          {mcqTotal > 0 && <span>MCQ: {mcqCorrect}/{mcqTotal}</span>}
          {shortAnswerTotal > 0 && <span>Self Score: {totalSelfScore}</span>}
        </div>
        {Object.keys(checked).length > 0 && (
          <button onClick={handleReset} className="text-accent-600 hover:underline">Reset</button>
        )}
      </div>
      
      {questions.map((q, i) => {
        const isMCQ = q.type === 'mcq';
        const isSelected = selectedChoice[i] !== null && selectedChoice[i] !== undefined;
        
        return (
          <div key={i} className="border border-ink-200 dark:border-ink-600 rounded-lg p-3 bg-ink-50/40 dark:bg-ink-700/40">
            <div className="text-xs text-ink-400 dark:text-ink-500 mb-1 uppercase">{q.type}</div>
            <div className="text-sm font-medium mb-2 dark:text-ink-100">{q.question}</div>
            
            {q.choices && (
              <ul className="text-sm space-y-1 mb-2">
                {q.choices.map((c, j) => {
                  const isThisSelected = selectedChoice[i] === j;
                  const isCorrectChoice = checked[i] && c.toLowerCase() === q.answer.trim().toLowerCase();
                  const isWrongSelection = checked[i] && isThisSelected && !isCorrectChoice;
                  
                  return (
                    <li 
                      key={j} 
                      className={`px-3 py-2 rounded-lg cursor-pointer transition-all duration-150 ${
                        isThisSelected && !checked[i]
                          ? 'bg-accent-100 dark:bg-accent-900/30 text-accent-800 dark:text-accent-300 ring-2 ring-accent-500 ring-offset-1 font-medium'
                          : isCorrectChoice
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 ring-2 ring-green-500 ring-offset-1'
                            : isWrongSelection
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 ring-2 ring-red-500 ring-offset-1 line-through'
                              : checked[i]
                                ? 'bg-ink-50 dark:bg-ink-700 text-ink-400 dark:text-ink-500'
                                : 'hover:bg-white dark:hover:bg-ink-700 hover:ring-1 hover:ring-ink-200 dark:hover:ring-ink-600'
                      }`}
                      onClick={() => handleMCQSelect(i, j)}
                    >
                      <span className="inline-flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs ${
                          isThisSelected && !checked[i]
                            ? 'border-accent-500 bg-accent-500 text-white'
                            : isCorrectChoice
                              ? 'border-green-500 bg-green-500 text-white'
                              : isWrongSelection
                                ? 'border-red-500 bg-red-500 text-white'
                                : 'border-ink-300 dark:border-ink-500'
                        }`}>
                          {isThisSelected && !checked[i] && '✓'}
                          {isCorrectChoice && '✓'}
                          {isWrongSelection && '✗'}
                        </span>
                        {c}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            
            {!isMCQ && (
              <textarea
                value={answers[i] || ''}
                onChange={(e) => setAnswers(prev => ({ ...prev, [i]: e.target.value }))}
                disabled={checked[i]}
                placeholder="Type your answer..."
                className="w-full border border-ink-200 dark:border-ink-600 rounded-md p-2 text-sm min-h-[60px] bg-white dark:bg-ink-900 dark:text-ink-100 placeholder:text-ink-400 dark:placeholder:text-ink-500 focus:outline-none focus:ring-2 focus:ring-accent-400 disabled:bg-white dark:disabled:bg-ink-800 mb-2"
              />
            )}
            
            {!checked[i] ? (
              <button
                onClick={() => handleCheck(i)}
                disabled={isMCQ ? !isSelected : !answers[i]?.trim()}
                className="px-3 py-1 rounded text-xs font-medium bg-accent-500 text-white hover:bg-accent-600 disabled:opacity-50"
              >
                {isMCQ ? 'Submit Answer' : 'Show Reference Answer'}
              </button>
            ) : (
              <div className="mt-2 p-3 bg-white dark:bg-ink-800 rounded-lg border border-ink-200 dark:border-ink-600 text-xs space-y-2">
                {isMCQ ? (
                  <>
                    <div className="font-medium text-ink-800 dark:text-ink-200">
                      {answers[i]?.trim().toLowerCase() === q.answer.trim().toLowerCase() ? '✅ Correct!' : '❌ Incorrect'}
                    </div>
                    <div className="text-ink-700 dark:text-ink-300">Answer: {q.answer}</div>
                  </>
                ) : (
                  <>
                    <div className="font-medium text-ink-800 dark:text-ink-200 mb-2">Reference Answer:</div>
                    <div className="text-ink-700 dark:text-ink-300 p-2 bg-ink-50 dark:bg-ink-700 rounded">{q.answer}</div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-ink-600 dark:text-ink-400">Your score:</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={scores[i] ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setScores(prev => ({ ...prev, [i]: val === '' ? 0 : Number(val) }));
                        }}
                        className="w-16 border border-ink-200 dark:border-ink-600 rounded px-2 py-1 text-center bg-white dark:bg-ink-900 dark:text-ink-100 focus:outline-none focus:ring-2 focus:ring-accent-400"
                        placeholder="0"
                      />
                      <span className="text-ink-400 dark:text-ink-500">points</span>
                    </div>
                  </>
                )}
                {q.explanation && <div className="text-ink-500 dark:text-ink-400 mt-2 italic">{q.explanation}</div>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
