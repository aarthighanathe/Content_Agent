import { escapeXml } from '../lib/sanitizeSearchText.js';
import type { ContentJob } from '../db/schema.js';

/** Platform-specific writer system prompts — kept out of writer.ts for the 400-line cap. */
export function buildPlatformPrompts(job: ContentJob): Record<string, string> {
  const audience = escapeXml(job.targetAudience || '');
  const tone = escapeXml(job.tone || '');
  return {
    instagram_carousel: `Generate an Instagram carousel with EXACTLY 8 slides about the topic above. Return a JSON array only — no markdown, no code fences, no comments.

NARRATIVE ARC (follow this exactly):
1. COVER — bold hook that stops the scroll
2. PROBLEM — what's broken, painful, or frustrating for the reader
3. SOLUTION — the reframe or approach that changes everything
4. FEATURES — 4 concrete benefits/features as a structured list
5. STAT — a specific data point that validates the approach
6. QUOTE — a quotable, shareable truth the reader would screenshot
7. STEPS — a 3-4 step actionable how-to process
8. CTA — follow/save invitation

BACKGROUND PATTERN:
Slide 1: "light" | Slide 2: "dark" | Slide 3: "accent" | Slide 4: "light" | Slide 5: "dark" | Slide 6: "light" | Slide 7: "dark" | Slide 8: "accent"

CONTENT QUALITY RULES:
- Body copy must be 45-60 words — specific, detailed, and actionable.
- Every slide must teach or reveal something concrete. No vague generalities.
- Headlines must work standalone — bold promise, specific claim, or provocative question.
- STAT slides: use a real-world statistic from the research data provided above. If no exact stat is available, use a well-known public figure and label it with the approximate source (e.g. "74% — Forrester 2024"). Never fabricate percentages or dollar amounts.
- QUOTE slides: must feel like something a thought leader would say — screenshot-worthy paradox or reframe.
- STEPS slides: numbered how-to with 3-4 concrete, ordered actions. Each step = verb + specific action.
- Banned filler: "In today's world", "Have you ever wondered", "Game-changer", "Leverage", "At the end of the day".

POINTS FIELD — required on slides 4 (features) and 7 (steps):
- Slide 4 (features): array of 4 feature items, each with icon (emoji) + label (2-4 word name) + desc (10-15 words of real content)
- Slide 7 (steps): array of 3-4 step items, each with icon (step number "01"/"02"/etc.) + label (2-4 word step name) + desc (10-15 words of real content)

CONTENT UNIQUENESS RULES:
1. STAT slide: the number MUST be surprising or counterintuitive for THIS exact topic.
2. COVER hook: reference the specific emotional tension of THIS topic.
3. QUOTE slide: must sound paradoxical or reframing — not generic advice.
4. SOLUTION slide: give a NAMED framework or approach (e.g. "The 3R Reset"), not generic description.
5. STEPS slide: each step = verb + concrete action + time/metric. "Practice mindfulness" is banned. "Do a 5-min audit every Sunday" is correct.
6. CTA slide: name SPECIFIC future value (topics, frequency, transformation), NOT "follow for daily tips."

Full JSON structure — generate ALL 8 slides with real topic-specific content:
[
  {
    "slide_number": 1,
    "type": "cover",
    "bg_suggestion": "light",
    "headline": "<7-9 words: bold promise or provocative question that earns the swipe>",
    "body": "<45-60 words: set up the stakes. Be specific — name the transformation, not just the topic.>",
    "visual_hint": "🔥"
  },
  {
    "slide_number": 2,
    "type": "content",
    "bg_suggestion": "dark",
    "headline": "<6-8 words: name the pain point directly and specifically>",
    "body": "<45-60 words: describe the problem with vivid specificity. Include a concrete consequence.>",
    "visual_hint": "😤"
  },
  {
    "slide_number": 3,
    "type": "content",
    "bg_suggestion": "accent",
    "headline": "<6-8 words: the reframe or solution in one bold claim>",
    "body": "<45-60 words: deliver the insight. Explain WHY the old way fails and what the new approach unlocks.>",
    "visual_hint": "💡"
  },
  {
    "slide_number": 4,
    "type": "content",
    "bg_suggestion": "light",
    "headline": "<6-8 words: what they get — frame it as a gain>",
    "body": "<20-30 words: brief intro to the feature list below.>",
    "visual_hint": "✨",
    "points": [
      { "icon": "⚡", "label": "<2-4 word feature name>", "desc": "<10-15 words: specific concrete benefit>" },
      { "icon": "🎯", "label": "<2-4 word feature name>", "desc": "<10-15 words: specific concrete benefit>" },
      { "icon": "🔄", "label": "<2-4 word feature name>", "desc": "<10-15 words: specific concrete benefit>" },
      { "icon": "🛡️", "label": "<2-4 word feature name>", "desc": "<10-15 words: specific concrete benefit>" }
    ]
  },
  {
    "slide_number": 5,
    "type": "stat",
    "bg_suggestion": "dark",
    "headline": "<specific real statistic starting with a number>",
    "body": "<45-60 words: unpack what the statistic means. Connect the data to a behavior change.>",
    "visual_hint": "📊"
  },
  {
    "slide_number": 6,
    "type": "quote",
    "bg_suggestion": "light",
    "headline": "<standalone screenshot-worthy truth — paradoxical or reframing, no attribution needed>",
    "body": "<40-55 words: give context for the quote. Who experiences this truth daily? What does it cost people who don't understand it?>",
    "visual_hint": "💬"
  },
  {
    "slide_number": 7,
    "type": "content",
    "bg_suggestion": "dark",
    "headline": "<6-8 words: how-to promise — exactly what they'll learn to do>",
    "body": "<20-30 words: brief framing. Tell them this is the exact sequence that drives results.>",
    "visual_hint": "🚀",
    "points": [
      { "icon": "01", "label": "<2-4 word step name>", "desc": "<10-15 words: exactly what to do, with a concrete action>" },
      { "icon": "02", "label": "<2-4 word step name>", "desc": "<10-15 words: exactly what to do, with a concrete action>" },
      { "icon": "03", "label": "<2-4 word step name>", "desc": "<10-15 words: exactly what to do, with a concrete action>" },
      { "icon": "04", "label": "<2-4 word step name>", "desc": "<10-15 words: exactly what to do, with a concrete action>" }
    ]
  },
  {
    "slide_number": 8,
    "type": "cta",
    "bg_suggestion": "accent",
    "headline": "<specific follow/save invitation tied to the carousel topic — NOT generic>",
    "body": "<40-55 words: tell them exactly what value they get by following. Name specific future topics or the transformation they can expect.>",
    "visual_hint": "👇",
    "cta": { "action": "Save this post →", "handle": "@<topic-specific-handle — e.g. @remoteworkpro — NEVER use @yourbrand>" }
  }
]

SELF-CHECK before responding: Scan every "headline", "body", "label", and "desc" field.
If ANY field still contains angle-bracket instructions like <7-9 words: ...> or template-style text, replace it with real topic-specific content before responding.
ALL 8 slides must have actual content, not placeholder descriptions.`,

    linkedin_post: `Generate a LinkedIn post for a <audience>${audience}</audience> audience. Write in a <tone>${tone}</tone> voice.

QUALITY BAR — this post must feel human, specific, and worth the "see more" tap. Every sentence earns its place.

STRUCTURE (follow this arc — short paragraphs, blank line between them via \\n\\n):
1. Hook (field "hook"): 1–2 lines, ≤210 characters so it wins the feed preview before "see more". Use a specific number, contrarian claim, or sharp observation grounded in the research — never a bland topic label ("Thoughts on X…").
2. Body (150–220 words total across these beats):
   - Context / tension: one short paragraph that names who this hurts or why it matters now.
   - Insight + proof: at least ONE concrete fact, named example, or data point from the research (no vague "studies show").
   - Optional list: 3–5 single-idea lines (one insight each), not essay bullets.
   - Takeaway: one clear line the reader can act on or remember.
3. CTA (field "cta"): one specific question or action that invites a real reply. Ban: "What do you think?", "Thoughts?", "Agree?", "Drop a comment below.", "Let me know in the comments."
4. hookAlt: a second hook with a DIFFERENT angle (e.g. if hook is data-led, hookAlt is curiosity/story-led, or vice versa). Same ≤210 char limit. Used for A/B testing in the UI.

VOICE:
- Sound like a practitioner talking to peers, not a brand deck. Prefer concrete "I / we / teams" over abstract "organizations must…".
- Match <tone>${tone}</tone>. No empty hype emoji spam.

BANNED / CLICHÉ (never use):
"In today's world", "In today's fast-paced…", "Game-changer", "Leverage", "Navigate", "Unlock your potential", "At the end of the day", "Here's the thing:", "Let that sink in", "Hot take:", "This changes everything", "The future of work", generic #linkedin #success #motivation #leadership.

Return ONLY this JSON (no markdown, no code fences):
{
  "hook": "<1–2 line scroll-stopper — ≤210 chars, research-grounded>",
  "hookAlt": "<alternate hook, different angle — ≤210 chars>",
  "body": "<150–220 words: tension → proof → optional list → takeaway — use \\n\\n between paragraphs>",
  "cta": "<1 specific question or action — not generic engagement bait>",
  "hashtags": ["<3–5 niche topic-specific hashtags with # — NOT generic career spam>"]
}

SELF-CHECK before responding: Scan hook, hookAlt, body, and cta.
If ANY field still contains angle-bracket instructions like <1–2 line…> or template-style text, replace it with real topic-specific content.
Body MUST include at least one specific research-backed fact or named example.
CTA MUST NOT be a banned soft prompt.`,

    twitter_thread: `Generate a Twitter/X thread for a <audience>${audience}</audience> audience. Write in a <tone>${tone}</tone> voice.

QUALITY BAR — each tweet must deliver one complete idea.
- Tweet 1: Bold hook. 200-250 chars. Curiosity gap, specific claim, or counterintuitive fact. Number as "1/"
- Tweets 2-6: Each delivers ONE concrete insight. Number as "2/", "3/" etc. Max 270 chars each.
- Tweet 7-8: Summary + CTA. Ask one specific question that drives replies (not "What do you think?").
- Do NOT start any tweet with "So,", "Now,", "Finally,", or "In conclusion."
- Do NOT repeat numbering that is already in the tweet text.

Return ONLY this JSON (no markdown, no code fences):
{ "tweets": [{ "number": 1, "text": "<tweet 1 text, already numbered 1/>" }, { "number": 2, "text": "<2/ tweet text>" }] }

Generate 6-8 tweets total.`,

    instagram_caption: `Generate an Instagram caption for a <audience>${audience}</audience> audience. Write in a <tone>${tone}</tone> voice.

QUALITY BAR:
- First line: a hook that makes them tap "more" — question, bold claim, or surprising fact. Max 125 chars.
- Body: 80-120 words. Conversational, specific, and valuable. Break into short paragraphs.
- End with a clear CTA (question or invite to save/share).
- Hashtags: 10-15 niche-specific tags. Mix broad (1-2) with niche (8-10) and branded (1-3).
- Separate hashtags from caption with a line break.

Return ONLY this JSON (no markdown, no code fences):
{
  "caption": "<full caption with hook + body + CTA, using \\n\\n for paragraph breaks>",
  "hashtags": ["<10-15 relevant hashtags with # prefix>"]
}`,

    video_script: `Generate a short-form video script (Reels/TikTok/YouTube Shorts) for a <audience>${audience}</audience> audience. Write in a <tone>${tone}</tone> voice.

Return ONLY this JSON (no markdown, no code fences):
{
  "hook": { "text": "<2-3 punchy sentences — curiosity gap, bold claim, or pattern interrupt>", "duration": "0-3s", "visual": "<specific on-screen action or visual>" },
  "segments": [
    { "number": 1, "script": "<what to say — 30-50 words>", "duration": "<e.g. 8-12s>", "broll": "<specific visual: screen recording, b-roll shot, or graphic>", "caption": "<overlay text — max 6 words>" }
  ],
  "cta": { "text": "<specific 1-sentence CTA>", "duration": "3-5s", "visual": "<specific closing visual>" },
  "hashtags": ["<5-8 video-specific hashtags>"],
  "speakerNotes": "<overall delivery notes: pace, energy, key emphasis points>",
  "totalDuration": "<e.g. 45s>"
}

Include 3-5 main content segments. Total duration 30-60 seconds.`,
  };
}
