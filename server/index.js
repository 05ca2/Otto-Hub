import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = process.env.PORT || 8787;
const app = express();
app.use(cors());
app.use(express.json({ limit: '8mb' }));

// 默认配置（可被前端在请求体里按文档覆盖）
const DEFAULT_BASE = process.env.AI_BASE_URL || 'https://openrouter.ai/api/v1';
const DEFAULT_MODEL = process.env.AI_MODEL || 'meta-llama/llama-3.1-8b-instruct:free';

// 健康检查：前端可用来判断 Key 是否已配置
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    configured: Boolean(process.env.AI_API_KEY),
    base: DEFAULT_BASE,
    model: DEFAULT_MODEL
  });
});

// 核心代理：把对话请求转发到任意 OpenAI 兼容端点，Key 仅存于服务端
app.post('/api/chat', async (req, res) => {
  const { messages, model, temperature = 0.7, stream = true } = req.body || {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages 不能为空' });
  }
  if (!process.env.AI_API_KEY) {
    return res.status(500).json({
      error: '服务端未配置 AI_API_KEY。请在项目根目录 .env 中设置后重启服务。'
    });
  }

  const base = DEFAULT_BASE;
  const m = model || DEFAULT_MODEL;

  try {
    const upstream = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.AI_API_KEY}`,
        'HTTP-Referer': process.env.AI_REFERER || 'http://localhost',
        'X-Title': process.env.AI_TITLE || 'AI Study Hub'
      },
      body: JSON.stringify({ model: m, messages, temperature, stream })
    });

    if (!upstream.ok) {
      const txt = await upstream.text();
      return res.status(upstream.status).json({ error: txt });
    }

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // 关闭 nginx 缓冲，保证流式输出
      res.flushHeaders?.();

      const reader = upstream.body.getReader();
      const decoder = new TextDecoder();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(decoder.decode(value, { stream: true }));
        }
      } catch (_e) {
        // 客户端断开等情况，静默结束
      }
      res.end();
    } else {
      const json = await upstream.json();
      res.json(json);
    }
  } catch (e) {
    if (!res.headersSent) {
      res.status(502).json({ error: '上游 AI 服务请求失败：' + e.message });
    } else {
      res.end();
    }
  }
});

// 生产环境：托管前端构建产物（npm run build 后的 dist）
const dist = path.join(__dirname, '..', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`[ai-study-hub] 后端已启动: http://localhost:${PORT}`);
  if (!process.env.AI_API_KEY) {
    console.warn('[ai-study-hub] 警告: 未检测到 AI_API_KEY，AI 生成/问答将不可用。请复制 .env.example 为 .env 并填入 Key。');
  }
});
