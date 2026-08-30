'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Loader2, CheckCircle2, User, Image as ImageIcon } from 'lucide-react';

export default function ProfileSettingsPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth').then((r) => r.json()).then((d) => {
      if (d.user) {
        setName(d.user.name || '');
        setBio(d.user.bio || '');
        setImageUrl(d.user.image || '');
      }
      setLoading(false);
    });
  }, []);

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch('/api/auth', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, bio, image: imageUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-ink-400 dark:text-ink-500 text-sm">Loading…</div>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="rounded-2xl border border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-800 p-6">
        <h1 className="text-2xl font-semibold mb-1">Edit Profile</h1>
        <p className="text-ink-600 dark:text-ink-400 text-sm mb-5">Update your display name, bio, and avatar.</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Display Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full border border-ink-200 dark:border-ink-600 rounded-md p-2 text-sm bg-white dark:bg-ink-900 dark:text-ink-100 focus:outline-none focus:ring-2 focus:ring-accent-400"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              className="w-full border border-ink-200 dark:border-ink-600 rounded-md p-2 text-sm min-h-[80px] bg-white dark:bg-ink-900 dark:text-ink-100 focus:outline-none focus:ring-2 focus:ring-accent-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Avatar URL</label>
            <div className="flex gap-3">
              <input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
                className="flex-1 border border-ink-200 dark:border-ink-600 rounded-md p-2 text-sm bg-white dark:bg-ink-900 dark:text-ink-100 focus:outline-none focus:ring-2 focus:ring-accent-400"
              />
              {imageUrl && (
                <div className="w-10 h-10 rounded-full overflow-hidden border border-ink-200 dark:border-ink-600">
                  <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
            <p className="text-xs text-ink-400 dark:text-ink-500 mt-1">Paste a URL to your avatar image</p>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400 mt-4">{error}</p>}
        {saved && <p className="text-sm text-green-600 dark:text-green-400 mt-4 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Profile updated.</p>}

        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 rounded bg-accent-500 text-white font-medium hover:bg-accent-600 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving…' : 'Save profile'}
          </button>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 rounded text-ink-600 dark:text-ink-300 hover:bg-ink-100 dark:hover:bg-ink-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
