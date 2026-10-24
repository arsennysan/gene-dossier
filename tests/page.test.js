// End-to-end tests of the page in jsdom. The real index.html, i18n.js and app.js run unchanged;
// only fetch is replaced by recorded database answers (tests/fixtures.js).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, ResourceLoader, VirtualConsole } = require('jsdom');
const { makeRouter, CLINVAR_COUNTS } = require('./fixtures');

const ROOT = path.join(__dirname, '..');
const BASE = 'https://gene-dossier.test/';

// Serves the site's own scripts from disk; everything external (fonts, 3Dmol.js) is not loaded.
class LocalFiles extends ResourceLoader {
  fetch(url, options) {
    if (!url.startsWith(BASE)) return null;
    const file = path.join(ROOT, new URL(url).pathname);
    if (file.endsWith('.css')) return Promise.resolve(Buffer.from(''));
    return Promise.resolve(fs.readFileSync(file));
  }
}

async function openPage(hash = 'TP53', { lang = 'ru', mode = 'expert' } = {}) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (e) => { if (!/Not implemented/.test(e.message)) errors.push(e); });
  virtualConsole.on('error', (e) => errors.push(e));
  const router = makeRouter();
  const dom = new JSDOM(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), {
    url: `${BASE}#${hash}`,
    runScripts: 'dangerously',
    resources: new LocalFiles(),
    pretendToBeVisual: true,
    virtualConsole,
    beforeParse(window) {
      window.fetch = router.route;
      window.localStorage.setItem('gd.lang', lang);
      window.localStorage.setItem('gd.mode', mode);
    }
  });
  const { window } = dom;
  const $ = (sel) => window.document.querySelector(sel);
  const $$ = (sel) => [...window.document.querySelectorAll(sel)];
  const card = (title) => $$('.card').find((c) => c.querySelector('h2') && c.querySelector('h2').textContent.toLowerCase().includes(title.toLowerCase()));
  return { dom, window, $, $$, card, errors, router };
}

async function waitFor(check, what, timeout = 15000) {
  const start = Date.now();
  for (;;) {
    let value;
    try { value = check(); } catch { value = null; }
    if (value) return value;
    if (Date.now() - start > timeout) throw new Error(`Timed out waiting for ${what}`);
    await new Promise((r) => setTimeout(r, 50));
  }
}

// ClinVar is the slowest section (spaced NCBI queue); once its legend is drawn, the page has settled.
const waitForDossier = (p) => waitFor(() => p.$('.stack + .legend') && !p.$('.card .skel'), 'the dossier to finish loading');

test('renders a full dossier for TP53', async () => {
  const p = await openPage('TP53');
  await waitForDossier(p);
  assert.equal(p.$('.symbol').textContent, 'TP53');
  assert.equal(p.$('.fullname').textContent, 'tumor protein p53');
  assert.match(p.card('Обзор гена').textContent, /17p13\.1/);
  assert.equal(p.$$('.dis li').length, 3, 'three disease associations');
  assert.equal(p.$$('.expr .row').length, 4, 'four tissues');
  assert.equal(p.$$('.net .node').length, 4, 'TP53 and three partners');
  assert.equal(p.$$('.papers li').length, 2);
  assert.match(p.card('Свежие статьи').textContent, /Обзор/, 'review badge');
  assert.ok(p.$('#molSlot, .mol'), '3D viewer slot is present');
  assert.match(p.card('3D-структура').textContent, /75\.1/, 'mean pLDDT');
  assert.equal(p.$('#tools').hidden, false, 'compare/export toolbar shown');
  assert.deepEqual(p.errors, []);
  p.window.close();
});

test('expert mode links UniProt evidence to PubMed', async () => {
  const p = await openPage('TP53', { mode: 'expert' });
  await waitForDossier(p);
  const refs = p.$$('.ref').map((a) => a.getAttribute('href'));
  assert.deepEqual(refs, ['https://pubmed.ncbi.nlm.nih.gov/11025664/', 'https://pubmed.ncbi.nlm.nih.gov/12524540/']);
  assert.match(p.card('Обзор гена').textContent, /chr17:/, 'coordinates shown to experts');
  p.window.close();
});

test('student mode explains the cytoband and shortens texts', async () => {
  const p = await openPage('TP53', { mode: 'student' });
  await waitForDossier(p);
  const plain = p.card('Обзор гена').querySelector('.plain').textContent;
  assert.match(plain, /короткое плечо \(p\), район 1, полоса 3, подполоса 1/);
  assert.match(plain, /курсивом/);
  assert.equal(p.$$('.ref').length, 0, 'no PubMed brackets for students');
  const fn = p.card('Функция белка').querySelector('.prose').textContent;
  assert.equal(fn.split('. ').length, 3, 'function text cut to three sentences');
  assert.doesNotMatch(p.card('Обзор гена').textContent, /chr17:/);
  p.window.close();
});

test('switches the interface to Kazakh and English', async () => {
  const p = await openPage('TP53');
  await waitForDossier(p);
  p.$('[data-lang="kk"]').click();
  assert.ok(p.card('Ген шолуы'), 'Kazakh overview heading');
  assert.ok(p.card('Клиникалық нұсқалар'), 'Kazakh ClinVar heading');
  assert.equal(p.window.document.documentElement.lang, 'kk');
  p.$('[data-lang="en"]').click();
  assert.ok(p.card('Gene overview'));
  assert.equal(p.window.localStorage.getItem('gd.lang'), 'en', 'choice is remembered');
  p.window.close();
});

test('ClinVar shows class counts and orders variants by review stars', async () => {
  const p = await openPage('TP53');
  await waitForDossier(p);
  const c = CLINVAR_COUNTS.TP53;
  assert.equal(p.$$('.stack i').length, 5);
  // Thousands separators differ by locale, so compare digits only.
  const legend = p.$('.stack + .legend').textContent.replace(/[\s,]/g, '');
  for (const n of [c.p, c.lp, c.vus, c.lb, c.b]) assert.ok(legend.includes(String(n)), `count ${n} in legend`);
  const vars = p.$$('.vars li a').map((a) => a.textContent);
  assert.deepEqual(vars.map((v) => v.match(/p\.\w+/)[0]), ['p.Arg248Gln', 'p.Arg175His', 'p.Arg273His'], '4★, 3★, then 1★');
  assert.deepEqual(p.$$('.vars .stars').map((s) => s.textContent), ['★★★★', '★★★☆', '★☆☆☆']);
  assert.ok(p.$$('.vars .cond').every((el) => !/not provided/.test(el.textContent)), '"not provided" traits are hidden');
  // Only the reviewed (2+ star) query decides which records are summarised.
  const summary = p.router.log.find((r) => r.url.includes('esummary.fcgi'));
  assert.match(decodeURIComponent(summary.url), /id=7108,7109,7110/);
  p.window.close();
});

test('NCBI requests are spaced to respect the rate limit', async () => {
  const p = await openPage('TP53');
  await waitForDossier(p);
  const ncbi = p.router.log.filter((r) => r.url.includes('eutils.ncbi.nlm.nih.gov'));
  assert.equal(ncbi.length, 8, 'total + 5 classes + reviewed + summary');
  // NCBI allows ~3 requests/s without a key; the page waits 350 ms between calls.
  const gaps = ncbi.slice(1).map((r, i) => r.at - ncbi[i].at);
  assert.ok(Math.min(...gaps) >= 330, `smallest gap ${Math.min(...gaps)} ms`);
  p.window.close();
});

test('unknown symbols show a clear message', async () => {
  const p = await openPage('XYZ123');
  const msg = await waitFor(() => p.$('.banner'), 'the not-found banner');
  assert.match(msg.textContent, /«XYZ123» не найден/);
  assert.equal(p.$('#tools').hidden, true);
  p.window.close();
});

test('a #mouse: link switches the species before searching', async () => {
  const p = await openPage('mouse:Trp53');
  // The fixtures hold only human genes, so the search ends in the not-found banner for mouse.
  const msg = await waitFor(() => p.$('.banner'), 'a result for the mouse query');
  assert.equal(p.$('#species').value, 'mouse');
  assert.ok(p.router.log.some((r) => r.url.includes('species=mouse')), 'MyGene queried for mouse');
  assert.match(msg.textContent, /Мышь/);
  p.window.close();
});

test('clicking a protein in the network opens its dossier', async () => {
  const p = await openPage('TP53');
  await waitForDossier(p);
  p.$('.net .node[data-goto="MDM2"]').dispatchEvent(new p.window.MouseEvent('click', { bubbles: true }));
  await waitFor(() => p.$('.symbol') && p.$('.symbol').textContent === 'MDM2', 'the MDM2 dossier');
  assert.equal(p.window.location.hash, '#MDM2');
  p.window.close();
});

test('compares two genes: shared diseases, shared partners, direct link', async () => {
  const p = await openPage('TP53');
  await waitForDossier(p);
  p.$('#cmpQ').value = 'MDM2';
  p.$('#cmpForm').dispatchEvent(new p.window.Event('submit', { bubbles: true, cancelable: true }));
  const cmp = await waitFor(() => {
    const c = p.card('Сравнение');
    return c && c.querySelector('table') && !/…/.test(c.querySelector('table').textContent) && c;
  }, 'the comparison table');
  const heads = [...cmp.querySelectorAll('thead th')].map((th) => th.textContent);
  assert.deepEqual(heads.slice(1), ['TP53', 'MDM2']);
  assert.deepEqual([...cmp.querySelectorAll('.hl')].map((li) => li.textContent), ['Li-Fraumeni syndrome', 'Li-Fraumeni syndrome']);
  assert.deepEqual([...cmp.querySelectorAll('.shared button')].map((b) => b.textContent), ['EP300']);
  assert.match(cmp.textContent, /Прямая связь в STRING: уверенность 1\.00/);
  assert.match(cmp.textContent, /0 \/ 176/, 'MDM2 ClinVar pathogenic / total');
  cmp.querySelector('[data-act="cmp-close"]').click();
  assert.equal(p.card('Сравнение'), undefined);
  p.window.close();
});

test('comparing a gene with itself is refused politely', async () => {
  const p = await openPage('TP53');
  await waitForDossier(p);
  p.$('#cmpQ').value = 'tp53';
  p.$('#cmpForm').dispatchEvent(new p.window.Event('submit', { bubbles: true, cancelable: true }));
  const cmp = await waitFor(() => p.card('Сравнение') && /тот же ген/.test(p.card('Сравнение').textContent) && p.card('Сравнение'), 'the same-gene message');
  assert.ok(cmp);
  p.window.close();
});

test('AI summary is requested once, shown with the model name and cached', async () => {
  const p = await openPage('TP53');
  await waitForDossier(p);
  p.$('[data-act="ai"]').click();
  const out = await waitFor(() => p.$('.ai-out'), 'the AI summary');
  assert.match(out.textContent, /TP53 summary in ru/);
  assert.equal(p.$$('.ai-out li').length, 3);
  assert.equal(p.$('.ai-badge').textContent, 'Gemini 3.5 Flash Lite');
  const call = p.router.log.find((r) => r.url.endsWith('/api/ai'));
  const sent = JSON.parse(call.body);
  assert.equal(sent.task, 'summary');
  assert.ok(sent.gene.diseases.some((d) => d.startsWith('Li-Fraumeni')), 'page data goes into the prompt');
  assert.ok(p.window.localStorage.getItem('gd.ai.sum.human.TP53.ru.expert'), 'summary cached');
  // Switching language and back reuses the cache instead of calling the API again.
  p.$('[data-lang="en"]').click();
  p.$('[data-lang="ru"]').click();
  assert.equal(p.router.log.filter((r) => r.url.endsWith('/api/ai')).length, 1);
  assert.match(p.$('.ai-out').textContent, /TP53 summary in ru/);
  p.window.close();
});

test('translates database texts and can switch back to the original', async () => {
  const p = await openPage('TP53', { lang: 'kk' });
  await waitForDossier(p);
  p.$('[data-act="tr"]').click();
  await waitFor(() => p.$('[data-act="tr-toggle"]'), 'the translation');
  const fnText = () => p.card('Ақуыздың қызметі').querySelector('.prose').textContent;
  assert.match(fnText(), /^\[kk\] Multifunctional/);
  assert.match(p.card('NCBI сипаттамасы').querySelector('.prose').textContent, /^\[kk\] This gene/);
  p.$('[data-act="tr-toggle"]').click();
  assert.match(fnText(), /^Multifunctional/);
  p.window.close();
});

test('exports the dossier as Markdown', async () => {
  const p = await openPage('TP53');
  await waitForDossier(p);
  let blob, name;
  p.window.URL.createObjectURL = (b) => { blob = b; return 'blob:test'; };
  p.window.URL.revokeObjectURL = () => {};
  p.window.HTMLAnchorElement.prototype.click = function () { name = this.download; };
  p.$('#expMd').click();
  assert.equal(name, 'TP53_dossier_ru.md');
  // jsdom's Blob has no text(); read it the way older browsers do.
  const md = await new Promise((resolve) => {
    const reader = new p.window.FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsText(blob);
  });
  assert.match(md, /^# TP53: tumor protein p53/);
  for (const h of ['## Функция белка', '## Связь с болезнями', '## Экспрессия по тканям (GTEx)', '## Клинические варианты (ClinVar)', '## Свежие статьи']) {
    assert.ok(md.includes(h), `section ${h}`);
  }
  assert.match(md, /Li-Fraumeni syndrome: 0\.88/);
  assert.match(md, /https:\/\/www\.ncbi\.nlm\.nih\.gov\/clinvar\/variation\/7109\//);
  p.window.close();
});
