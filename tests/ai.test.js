// Tests for the serverless AI endpoint (api/ai.js). The network is replaced by a fake fetch,
// so no real keys or model calls are involved.
const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const MODULE = path.join(__dirname, '..', 'api', 'ai.js');
const ORIGIN = 'https://gene-dossier.vercel.app';

// Fresh module per test: the model list and the rate limiter live in module state.
function loadHandler() {
  delete require.cache[require.resolve(MODULE)];
  return require(MODULE);
}

function makeRes() {
  return {
    statusCode: 200, headers: {}, body: undefined,
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
    status(c) { this.statusCode = c; return this; },
    json(o) { this.body = o; return this; },
    end() { return this; }
  };
}

let ipCounter = 0;
function makeReq(body, { origin = ORIGIN, method = 'POST', ip } = {}) {
  return { method, headers: { origin, 'x-forwarded-for': ip || `10.0.0.${++ipCounter}` }, body };
}

const reply = (status, obj) => ({
  ok: status >= 200 && status < 300, status,
  json: async () => obj, text: async () => JSON.stringify(obj)
});

const MODELS = {
  models: [
    { name: 'models/gemini-3.5-flash', supportedGenerationMethods: ['generateContent'] },
    { name: 'models/gemini-3.6-flash', supportedGenerationMethods: ['generateContent'] },
    { name: 'models/gemini-3.5-flash-lite', supportedGenerationMethods: ['generateContent'] },
    { name: 'models/gemini-3.6-pro', supportedGenerationMethods: ['generateContent'] },
    { name: 'models/text-embedding-9', supportedGenerationMethods: ['embedContent'] }
  ]
};

// Fake Gemini: `busy` lists models that answer 503, `content` builds the model's text reply.
function fakeGemini({ busy = [], content = () => '{"overview":"ok","points":["a","b","c"],"news":"n"}' } = {}) {
  const calls = [];
  const fetch = async (url, opts = {}) => {
    if (url.includes('/models?')) return reply(200, MODELS);
    if (url.includes('/openai/chat/completions')) {
      const body = JSON.parse(opts.body);
      calls.push(body);
      if (busy.includes(body.model)) return reply(503, { error: { message: 'high demand' } });
      return reply(200, { choices: [{ message: { content: content(body) } }] });
    }
    throw new Error(`unexpected fetch ${url}`);
  };
  return { fetch, calls };
}

const realFetch = global.fetch;
beforeEach(() => { process.env.GEMINI_API_KEY = 'test-key'; delete process.env.GEMINI_MODEL; delete process.env.ANTHROPIC_API_KEY; });
afterEach(() => { global.fetch = realFetch; delete process.env.GEMINI_API_KEY; });

test('rejects requests from other sites', async () => {
  const res = makeRes();
  await loadHandler()(makeReq({ task: 'summary', lang: 'ru' }, { origin: 'https://evil.example' }), res);
  assert.equal(res.statusCode, 403);
  assert.equal(res.headers['access-control-allow-origin'], undefined);
});

test('answers CORS preflight for the site and localhost', async () => {
  for (const origin of [ORIGIN, 'http://localhost:8765']) {
    const res = makeRes();
    await loadHandler()(makeReq(undefined, { origin, method: 'OPTIONS' }), res);
    assert.equal(res.statusCode, 204);
    assert.equal(res.headers['access-control-allow-origin'], origin);
  }
});

test('validates language and task', async () => {
  const handler = loadHandler();
  let res = makeRes();
  await handler(makeReq({ task: 'summary', lang: 'de' }), res);
  assert.deepEqual([res.statusCode, res.body.error], [400, 'lang']);
  res = makeRes();
  await handler(makeReq({ task: 'chat', lang: 'ru' }), res);
  assert.deepEqual([res.statusCode, res.body.error], [400, 'task']);
  res = makeRes();
  await handler(makeReq({ task: 'translate', lang: 'kk', texts: [] }), res);
  assert.deepEqual([res.statusCode, res.body.error], [400, 'empty']);
});

test('summary: builds the prompt itself and labels the model', async () => {
  const g = fakeGemini();
  global.fetch = g.fetch;
  const res = makeRes();
  await loadHandler()(makeReq({ task: 'summary', lang: 'kk', mode: 'student', gene: { symbol: 'TP53', diseases: ['Li-Fraumeni syndrome (0.88)'] } }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.overview, 'ok');
  assert.equal(res.body.model, 'Gemini 3.6 Flash');
  const sent = g.calls[0];
  assert.equal(sent.model, 'gemini-3.6-flash', 'newest stable Flash model goes first');
  assert.match(sent.messages[0].content, /Kazakh/);
  assert.match(sent.messages[0].content, /students/);
  assert.match(sent.messages[1].content, /Li-Fraumeni/);
});

test('falls back to the next model when Gemini is overloaded', async () => {
  const g = fakeGemini({ busy: ['gemini-3.6-flash', 'gemini-3.5-flash'] });
  global.fetch = g.fetch;
  const res = makeRes();
  await loadHandler()(makeReq({ task: 'summary', lang: 'ru', gene: { symbol: 'CFTR' } }), res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(g.calls.map((c) => c.model), ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite']);
  assert.equal(res.body.model, 'Gemini 3.5 Flash Lite');
});

test('reports every model tried when all are overloaded', async () => {
  const g = fakeGemini({ busy: ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite'] });
  global.fetch = g.fetch;
  const res = makeRes();
  await loadHandler()(makeReq({ task: 'summary', lang: 'ru', gene: { symbol: 'CFTR' } }), res);
  assert.equal(res.statusCode, 502);
  assert.equal(res.body.error, 'upstream');
  assert.match(res.body.detail, /tried gemini-3\.6-flash, gemini-3\.5-flash, gemini-3\.5-flash-lite/);
});

test('translate: returns one translation per text and rejects a wrong count', async () => {
  let g = fakeGemini({ content: (body) => JSON.stringify({ t: JSON.parse(body.messages[1].content).map((s) => `RU:${s}`) }) });
  global.fetch = g.fetch;
  let res = makeRes();
  await loadHandler()(makeReq({ task: 'translate', lang: 'ru', texts: ['one', 'two'] }), res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.t, ['RU:one', 'RU:two']);

  g = fakeGemini({ content: () => '{"t":["only one"]}' });
  global.fetch = g.fetch;
  res = makeRes();
  await loadHandler()(makeReq({ task: 'translate', lang: 'ru', texts: ['one', 'two'] }), res);
  assert.deepEqual([res.statusCode, res.body.error], [502, 'shape']);
});

test('extracts JSON even when the model wraps it in a code fence', async () => {
  global.fetch = fakeGemini({ content: () => '```json\n{"overview":"fenced","points":[],"news":""}\n```' }).fetch;
  const res = makeRes();
  await loadHandler()(makeReq({ task: 'summary', lang: 'en', gene: { symbol: 'APOE' } }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.overview, 'fenced');
});

test('GEMINI_MODEL pins the model', async () => {
  process.env.GEMINI_MODEL = 'gemini-3.5-flash-lite';
  const g = fakeGemini();
  global.fetch = g.fetch;
  const res = makeRes();
  await loadHandler()(makeReq({ task: 'summary', lang: 'en', gene: { symbol: 'APOE' } }), res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(g.calls.map((c) => c.model), ['gemini-3.5-flash-lite']);
});

test('says "not configured" when no provider is set up', async () => {
  delete process.env.GEMINI_API_KEY;
  const prev = process.env.VERCEL_OIDC_TOKEN;
  delete process.env.VERCEL_OIDC_TOKEN;
  const res = makeRes();
  await loadHandler()(makeReq({ task: 'summary', lang: 'en', gene: { symbol: 'APOE' } }), res);
  if (prev !== undefined) process.env.VERCEL_OIDC_TOKEN = prev;
  assert.deepEqual([res.statusCode, res.body.error], [503, 'not_configured']);
});

test('rate-limits one address to 30 calls per 10 minutes', async () => {
  global.fetch = fakeGemini().fetch;
  const handler = loadHandler();
  const statuses = [];
  for (let i = 0; i < 31; i++) {
    const res = makeRes();
    await handler(makeReq({ task: 'summary', lang: 'en', gene: { symbol: 'APOE' } }, { ip: '203.0.113.7' }), res);
    statuses.push(res.statusCode);
  }
  assert.equal(statuses.filter((s) => s === 200).length, 30);
  assert.equal(statuses[30], 429);
});
