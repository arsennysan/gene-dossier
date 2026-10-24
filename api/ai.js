// Gene Dossier AI endpoint: gene summaries and translations.
// Prompts are built here from structured fields, so the endpoint cannot be used as a general chatbot.
// Provider is picked from the project's environment variables, first match wins:
//   GEMINI_API_KEY    – Google Gemini (free key from aistudio.google.com, no card); GEMINI_MODEL overrides the model
//   ANTHROPIC_API_KEY – Anthropic API, Claude Haiku
//   otherwise         – Vercel AI Gateway with the project's OIDC token (needs a card on the Vercel account)

const GATEWAY = 'https://ai-gateway.vercel.sh/v1/chat/completions';
const GEMINI = 'https://generativelanguage.googleapis.com/v1beta';
const ALLOWED = [/^https:\/\/gene-dossier(-[a-z0-9-]+)?\.vercel\.app$/, /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/];
const LANGS = { ru: 'Russian', kk: 'Kazakh (Cyrillic script)', en: 'English' };

// Per-instance rate limit: enough for normal use, stops scripted abuse of the free credits.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_CALLS = 30;
const calls = new Map();
function limited(ip) {
  const now = Date.now();
  const recent = (calls.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  calls.set(ip, recent);
  return recent.length > MAX_CALLS;
}

const clip = (s, n) => String(s ?? '').slice(0, n);
const list = (a, n, m) => (Array.isArray(a) ? a : []).slice(0, n).map((x) => clip(x, m));

function summaryMessages(b) {
  const g = b.gene || {};
  const ctx = {
    symbol: clip(g.symbol, 30), name: clip(g.name, 200), species: clip(g.species, 20),
    gene_type: clip(g.type, 40), cytoband: clip(g.location, 40),
    refseq_summary: clip(g.summary, 2500), protein_function: clip(g.fn, 3000), subcellular_location: list(g.locs, 8, 60),
    top_diseases_with_score: list(g.diseases, 8, 120), top_tissues_by_expression: list(g.tissues, 6, 80),
    interaction_partners: list(g.partners, 12, 20), clinvar_counts: clip(g.clinvar, 200), recent_paper_titles: list(g.papers, 8, 250)
  };
  const audience = b.mode === 'student'
    ? 'undergraduate biology students: use plain words and explain every technical term in a few words'
    : 'researchers: be precise and dense, use standard terminology';
  return [
    {
      role: 'system',
      content: `You write short gene briefings for ${audience}. Write in ${LANGS[b.lang]}. ` +
        'Use only facts present in the provided data; never invent numbers, diseases, mechanisms or findings. ' +
        'Keep gene and protein symbols, abbreviations and units exactly as in the source. ' +
        'Reply with JSON only, no markdown: {"overview": string (3-4 sentences: what the gene and its protein do and why it matters), ' +
        '"points": [exactly 3 short strings: disease links, where the gene is most active, main protein partners], ' +
        '"news": string (1-2 sentences on what the recent paper titles suggest researchers study now; hedge, since only titles are known)}.'
    },
    { role: 'user', content: JSON.stringify(ctx) }
  ];
}

function translateMessages(b) {
  const texts = list(b.texts, 8, 5000);
  return {
    texts,
    messages: [
      {
        role: 'system',
        content: `Translate scientific text from English into ${LANGS[b.lang]}. ` +
          'Keep gene and protein symbols, Latin species names, numbers, units and abbreviations unchanged. Keep sentence boundaries. ' +
          `Reply with JSON only: {"t": [translations in the same order]} with exactly ${texts.length} items.`
      },
      { role: 'user', content: JSON.stringify(texts) }
    ]
  };
}

// Stable Gemini Flash models the key can use, newest first, then the Flash-Lite ones; looked up once per instance.
let geminiModels = null;
async function geminiCandidates(key) {
  if (process.env.GEMINI_MODEL) return [process.env.GEMINI_MODEL];
  if (geminiModels) return geminiModels;
  try {
    const r = await fetch(`${GEMINI}/models?pageSize=200&key=${encodeURIComponent(key)}`, { signal: AbortSignal.timeout(8000) });
    const j = await r.json();
    const ver = (n) => parseFloat(n.match(/gemini-(\d+(?:\.\d+)?)/)[1]);
    const names = (j.models || [])
      .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
      .map((m) => m.name.replace(/^models\//, ''));
    const flash = names.filter((n) => /^gemini-\d+(\.\d+)?-flash$/.test(n)).sort((a, b) => ver(b) - ver(a));
    const lite = names.filter((n) => /^gemini-\d+(\.\d+)?-flash-lite$/.test(n)).sort((a, b) => ver(b) - ver(a));
    // Two best Flash models first, then Flash-Lite, which is rarely overloaded.
    geminiModels = [...flash.slice(0, 2), ...lite.slice(0, 2), ...flash.slice(2, 3)];
  } catch { /* fall through to the default */ }
  if (!geminiModels || !geminiModels.length) geminiModels = ['gemini-2.5-flash', 'gemini-2.5-flash-lite'];
  return geminiModels;
}

// Overload and rate-limit answers are worth retrying on another model.
const RETRYABLE = new Set([429, 500, 503, 504]);

async function complete(messages, maxTokens, oidc) {
  if (process.env.GEMINI_API_KEY) {
    const key = process.env.GEMINI_API_KEY;
    const started = Date.now();
    const tried = [];
    let last;
    for (const model of await geminiCandidates(key)) {
      // Keep the whole request under the function's 60 s limit.
      const left = 52000 - (Date.now() - started);
      if (left < 5000) break;
      tried.push(model);
      try {
        // Gemini's OpenAI-compatible endpoint; thinking tokens count toward max_tokens, so leave headroom.
        const r = await fetch(`${GEMINI}/openai/chat/completions`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, messages, max_tokens: maxTokens + 4000, temperature: 0.2, reasoning_effort: 'low' }),
          signal: AbortSignal.timeout(Math.min(20000, left))
        });
        if (!r.ok) {
          last = Object.assign(new Error('upstream'), { status: r.status, detail: `${model}: ${(await r.text()).slice(0, 200)}` });
          if (RETRYABLE.has(r.status)) continue;
          throw last;
        }
        const j = await r.json();
        const label = model.replace(/^gemini-/, 'Gemini ').replace(/-/g, ' ').replace(/\b[a-z]/g, (c) => c.toUpperCase());
        return { text: j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content, label };
      } catch (e) {
        if (e.name !== 'TimeoutError' && e.name !== 'AbortError') throw e;
        last = Object.assign(new Error('upstream'), { status: 504, detail: `${model}: timeout` });
      }
    }
    if (last) last.detail = `tried ${tried.join(', ')}; last ${last.detail}`;
    throw last || Object.assign(new Error('upstream'), { status: 504, detail: 'no time left' });
  }
  if (process.env.ANTHROPIC_API_KEY) {
    const model = 'claude-haiku-5-5';
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, system: messages[0].content, messages: messages.slice(1), max_tokens: maxTokens, temperature: 0.2 })
    });
    if (!r.ok) throw Object.assign(new Error('upstream'), { status: r.status, detail: (await r.text()).slice(0, 300) });
    const j = await r.json();
    return { text: (j.content || []).map((c) => c.text || '').join(''), label: 'Claude Haiku 5.5' };
  }
  if (!oidc) throw Object.assign(new Error('not_configured'), { code: 'not_configured' });
  const r = await fetch(GATEWAY, {
    method: 'POST',
    headers: { Authorization: `Bearer ${oidc}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'anthropic/claude-haiku-5.5', messages, max_tokens: maxTokens, temperature: 0.2 })
  });
  if (!r.ok) throw Object.assign(new Error('upstream'), { status: r.status, detail: (await r.text()).slice(0, 300) });
  const j = await r.json();
  return { text: j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content, label: 'Claude Haiku 5.5' };
}

function parseJSON(s) {
  const m = /\{[\s\S]*\}/.exec(s || '');
  if (!m) throw new Error('no json in model reply');
  return JSON.parse(m[0]);
}

module.exports = async (req, res) => {
  const origin = req.headers.origin || '';
  const allowed = ALLOWED.some((r) => r.test(origin));
  if (allowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Vary', 'Origin');
  }
  if (req.method === 'OPTIONS') return res.status(allowed ? 204 : 403).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  if (!allowed) return res.status(403).json({ error: 'origin' });

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (limited(ip)) return res.status(429).json({ error: 'rate' });

  let b = req.body || {};
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { return res.status(400).json({ error: 'body' }); } }
  if (!LANGS[b.lang]) return res.status(400).json({ error: 'lang' });

  const oidc = req.headers['x-vercel-oidc-token'] || process.env.VERCEL_OIDC_TOKEN || process.env.AI_GATEWAY_API_KEY;

  let messages, maxTokens, tr;
  if (b.task === 'summary') { messages = summaryMessages(b); maxTokens = 900; }
  else if (b.task === 'translate') {
    tr = translateMessages(b);
    if (!tr.texts.length) return res.status(400).json({ error: 'empty' });
    messages = tr.messages; maxTokens = 4000;
  } else return res.status(400).json({ error: 'task' });

  try {
    const { text, label } = await complete(messages, maxTokens, oidc);
    const out = parseJSON(text);
    if (tr && (!Array.isArray(out.t) || out.t.length !== tr.texts.length)) return res.status(502).json({ error: 'shape' });
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ ...out, model: label });
  } catch (e) {
    if (e.code === 'not_configured') return res.status(503).json({ error: 'not_configured' });
    return res.status(502).json({ error: 'upstream', status: e.status, detail: e.detail || String(e && e.message).slice(0, 200) });
  }
};
