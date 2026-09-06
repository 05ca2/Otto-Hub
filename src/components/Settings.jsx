import { useState } from 'react';
import { useStore } from '../state/store';

export default function Settings() {
  const { settings, setSettings } = useStore();
  const [status, setStatus] = useState('');
  const [testing, setTesting] = useState(false);

  async function test() {
    setTesting(true);
    setStatus('检测中…');
    try {
      const r = await fetch('/api/health');
      const j = await r.json();
      if (j.configured) {
        setStatus(`✅ 后端已连接，默认模型：${j.model}`);
      } else {
        setStatus('⚠️ 后端已启动，但未配置 AI_API_KEY。请在服务端 .env 填入 Key 后重启。');
      }
    } catch (e) {
      setStatus('❌ 无法连接后端：' + e.message + '（确认 npm run dev 已启动后端）');
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="settings">
      <header className="page-head">
        <h1>设置</h1>
        <p className="sub">AI Key 保存在服务端，终端用户无需自带 Key。这里只配置前端可选的模型与温度。</p>
      </header>

      <div className="set-card">
        <label className="set-label">模型（可选）</label>
        <input
          className="set-input"
          placeholder="留空则用服务端默认模型"
          value={settings.model}
          onChange={(e) => setSettings({ model: e.target.value })}
        />
        <div className="set-hint">
          例如：<code>meta-llama/llama-3.1-8b-instruct:free</code>（OpenRouter 免费模型）、
          <code>deepseek/deepseek-chat</code> 等任意 OpenAI 兼容模型名。
        </div>
      </div>

      <div className="set-card">
        <label className="set-label">温度（创造性）：{settings.temperature}</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={settings.temperature}
          onChange={(e) => setSettings({ temperature: parseFloat(e.target.value) })}
        />
        <div className="set-hint">越低越严谨稳定，越高越发散。生成题目/摘要建议 0.3–0.5，答疑 0.5–0.7。</div>
      </div>

      <div className="set-card">
        <button className="gen-btn" onClick={test} disabled={testing}>
          {testing ? '检测中…' : '测试后端连接'}
        </button>
        {status && <div className="set-status">{status}</div>}
      </div>

      <div className="set-card note">
        <div className="set-label">服务端如何配 Key？</div>
        <ol>
          <li>复制 <code>.env.example</code> 为 <code>.env</code></li>
          <li>填入 <code>AI_BASE_URL</code>、<code>AI_API_KEY</code>、<code>AI_MODEL</code></li>
          <li>重启 <code>npm run dev</code> 或 <code>npm start</code></li>
        </ol>
        <div className="set-hint">
          推荐用 OpenRouter / SenseNova 等平台的免费兼容模型。Key 仅存于服务端内存，不会下发浏览器。
        </div>
      </div>
    </div>
  );
}
