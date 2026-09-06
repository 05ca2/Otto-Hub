import { chat } from './ai';

export interface ModerationResult {
  ok: boolean;
  reason?: string;
}

const MODERATION_PROMPT = `You are a content moderator for an educational platform (AI Study Hub).

Analyze the following content and determine if it's appropriate for public sharing.

REJECT if the content contains:
- Explicit sexual content or nudity (18+)
- Graphic violence or gore
- Hate speech or discrimination
- Drug use instructions
- Self-harm or suicide instructions
- Illegal activity instructions
- Personal attacks or harassment
- Spam or scam content

ALLOW if the content is:
- Educational (study materials, notes, tutorials)
- Technical (programming, math, science)
- General discussion or questions
- Appropriate humor or creative writing

Content to analyze:
---
TITLE: {title}
BODY: {body}
---

Respond with ONLY a JSON object:
{"ok": true, "reason": null}  // if content is appropriate
{"ok": false, "reason": "brief reason"}  // if content should be rejected`;

export async function moderateContent(
  title: string,
  body: string
): Promise<ModerationResult> {
  try {
    const prompt = MODERATION_PROMPT
      .replace('{title}', title.slice(0, 500))
      .replace('{body}', body.slice(0, 2000));

    const response = await chat(
      [{ role: 'user', content: prompt }],
      {
        provider: 'sensenova',
        temperature: 0.1,
        maxTokens: 200,
      }
    );

    // Parse JSON response
    const match = response.match(/\{[\s\S]*\}/);
    if (!match) {
      // If AI fails to return valid JSON, allow by default (fail-open)
      return { ok: true };
    }

    const result = JSON.parse(match[0]);
    return {
      ok: result.ok === true,
      reason: result.reason || undefined,
    };
  } catch (error) {
    // If moderation fails, allow by default (fail-open)
    console.error('Moderation error:', error);
    return { ok: true };
  }
}
