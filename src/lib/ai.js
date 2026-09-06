// 前端只调用同源的 /api/chat，Key 在后端，浏览器拿不到
export const TUTOR_SYS =
  '你是一位耐心、专业的文档辅导老师。用户会引用资料中的片段并向你提问。' +
  '请结合引用片段与资料上下文，用中文清晰、循序渐进地解答；' +
  '如果引用能直接回答问题，请先点明引用内容，再用通俗语言解释，必要时补充例子。';

const GEN_SYS = {
  cheatsheet:
    '你是一位擅长整理知识的学习教练。请把用户提供的学习资料整理成一张结构清晰、便于记忆的“速查表(Cheatsheet)”，' +
    '使用 Markdown 格式：包含核心概念、关键公式/要点、易错提醒、典型示例。内容要准确、精炼、层次分明。',
  quiz:
    '你是一位出题老师。请基于用户提供的学习资料，出 6 道练习题（混合选择题与简答题），并在文末给出“答案与解析”。' +
    '使用 Markdown 格式，题目编号清晰。',
  summary:
    '你是一位总结高手。请用要点列表（Markdown）概括用户提供的学习资料的核心内容，' +
    '突出最重要的概念与结论，控制在合理篇幅，不要遗漏关键知识点。'
};

function truncate(t, max = 14000) {
  return t.length > max ? t.slice(0, max) + '\n\n…(原始内容过长，已截断至前 ' + max + ' 字)' : t;
}

// 流式对话：边接收边通过 onToken 回调推送增量文本，最终返回完整文本
export async function streamChat(messages, { model, temperature = 0.7, onToken, signal } = {}) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, model: model || undefined, temperature, stream: true }),
    signal
  });
  if (!res.ok) {
    let err = 'AI 请求失败（' + res.status + '）';
    try {
      const j = await res.json();
      if (j.error) err = typeof j.error === 'string' ? j.error : JSON.stringify(j.error);
    } catch (_e) {}
    throw new Error(err);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n');
    buffer = parts.pop() || '';
    for (const line of parts) {
      const l = line.trim();
      if (!l.startsWith('data:')) continue;
      const data = l.slice(5).trim();
      if (data === '[DONE]') continue;
      try {
        const json = JSON.parse(data);
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) {
          full += delta;
          if (onToken) onToken(delta, full);
        }
      } catch (_e) {
        // 忽略不完整/心跳行
      }
    }
  }
  return full;
}

export async function generate({ kind, text, model, temperature = 0.7, onToken }) {
  const sys = GEN_SYS[kind] || GEN_SYS.summary;
  const messages = [
    { role: 'system', content: sys },
    { role: 'user', content: `以下是学习资料：\n\n${truncate(text)}` }
  ];
  return streamChat(messages, { model, temperature, onToken });
}
