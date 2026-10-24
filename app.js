(() => {
'use strict';

const SPECIES = {
  human: { taxid: 9606, ens: 'ENSG', examples: ['TP53', 'BRCA1', 'CFTR', 'EGFR', 'APOE', 'HBB'] },
  mouse: { taxid: 10090, ens: 'ENSMUSG', examples: ['Trp53', 'Brca1', 'Cftr', 'Egfr', 'Apoe', 'Pax6'] },
  rat: { taxid: 10116, ens: 'ENSRNOG', examples: ['Tp53', 'Brca1', 'Cftr', 'Egfr', 'Apoe', 'Ins1'] }
};

/* Chromosome lengths and approximate centromere positions in Mb (human GRCh38; mouse GRCm39, acrocentric). */
const CHROMS = {
  human: { 1: [248.96, 123.4], 2: [242.19, 93.9], 3: [198.3, 90.9], 4: [190.21, 50.0], 5: [181.54, 48.8], 6: [170.81, 59.8], 7: [159.35, 60.1], 8: [145.14, 45.2], 9: [138.39, 43.0], 10: [133.8, 39.8], 11: [135.09, 53.4], 12: [133.28, 35.5], 13: [114.36, 17.7], 14: [107.04, 17.2], 15: [101.99, 19.0], 16: [90.34, 36.8], 17: [83.26, 25.1], 18: [80.37, 18.5], 19: [58.62, 26.2], 20: [64.44, 28.1], 21: [46.71, 12.0], 22: [50.82, 15.0], X: [156.04, 60.6], Y: [57.23, 10.4] },
  mouse: { 1: [195.15, 0], 2: [181.76, 0], 3: [159.75, 0], 4: [156.86, 0], 5: [151.76, 0], 6: [149.59, 0], 7: [144.99, 0], 8: [130.13, 0], 9: [124.36, 0], 10: [130.53, 0], 11: [121.97, 0], 12: [120.09, 0], 13: [120.88, 0], 14: [125.14, 0], 15: [104.07, 0], 16: [98.01, 0], 17: [95.29, 0], 18: [90.72, 0], 19: [61.42, 0], X: [169.48, 0], Y: [91.46, 0] }
};

/* ---------- state ---------- */
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } }
};
const S = {
  lang: ['ru', 'en', 'kk'].includes(store.get('gd.lang')) ? store.get('gd.lang') : 'ru',
  mode: store.get('gd.mode') === 'student' ? 'student' : 'expert',
  species: 'human',
  query: '',
  gene: null, geneStatus: 'idle',
  uniprot: null, uniStatus: 'idle',
  ot: null, otStatus: 'idle',
  papers: null, papStatus: 'idle',
  gtex: null, gtexStatus: 'idle', exprAll: false,
  str: null, strStatus: 'idle',
  af: null, afStatus: 'idle',
  clin: null, clinStatus: 'idle',
  ai: null, aiStatus: 'idle', aiKey: '', aiErr: '',
  tr: null, trStatus: 'idle',
  cmp: null
};
const RESET = { uniprot: null, uniStatus: 'idle', ot: null, otStatus: 'idle', papers: null, papStatus: 'idle', gtex: null, gtexStatus: 'idle', exprAll: false, str: null, strStatus: 'idle', af: null, afStatus: 'idle', clin: null, clinStatus: 'idle', ai: null, aiStatus: 'idle', aiKey: '', aiErr: '', tr: null, trStatus: 'idle', cmp: null };
// The AI endpoint lives on the deployed site; local copies call it there.
const API = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? 'https://gene-dossier.vercel.app' : '';
let reqId = 0;
const t = () => T[S.lang];
const fmt = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k]);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (n) => Number(n).toLocaleString(S.lang === 'en' ? 'en-US' : S.lang === 'kk' ? 'kk-KZ' : 'ru-RU');
const $ = (id) => document.getElementById(id);

/* ---------- data ---------- */
async function getJSON(url, opts) {
  const r = await fetch(url, opts);
  if (!r.ok) { const e = new Error(r.status); e.status = r.status; throw e; }
  return r.json();
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// 4xx from a database means "nothing for this gene", not an outage.
const isMissing = (e) => e && e.status >= 400 && e.status < 500;

function pickEnsembl(ens, prefix) {
  const list = Array.isArray(ens) ? ens : ens ? [ens] : [];
  const g = list.find((e) => e.gene && e.gene.startsWith(prefix)) || list[0];
  return g ? g.gene : null;
}
function pickPos(pos, ensId) {
  const list = Array.isArray(pos) ? pos : pos ? [pos] : [];
  return list.find((p) => p.ensemblgene === ensId) || list.find((p) => /^(\d+|X|Y|MT)$/.test(p.chr)) || list[0] || null;
}

async function fetchGene(q, species) {
  const fields = 'symbol,name,entrezgene,ensembl.gene,uniprot.Swiss-Prot,genomic_pos,map_location,alias,summary,type_of_gene,HGNC,MGI,RGD';
  const base = `https://mygene.info/v3/query?species=${species}&fields=${fields}&size=1&q=`;
  for (const term of [`symbol:"${q}"`, `alias:"${q}"`, q]) {
    const j = await getJSON(base + encodeURIComponent(term));
    if (j.hits && j.hits.length) return j.hits[0];
  }
  return null;
}

async function loadGene(q) {
  q = q.trim();
  if (!q) return;
  const my = ++reqId;
  Object.assign(S, RESET, { query: q, gene: null, geneStatus: 'loading' });
  render();
  try {
    const hit = await fetchGene(q, S.species);
    if (my !== reqId) return;
    if (!hit) { S.geneStatus = 'notfound'; render(); return; }
    S.gene = prepGene(hit);
    S.geneStatus = 'ok';
    try { history.replaceState(null, '', `#${S.species === 'human' ? '' : S.species + ':'}${hit.symbol}`); } catch { /* sandboxed */ }
    render();
    loadUniprot(my); loadOT(my); loadPapers(my); loadGtex(my); loadString(my); loadClin(my);
  } catch (e) {
    if (my !== reqId) return;
    S.geneStatus = 'error'; render();
  }
}

/* Fetchers return data for any gene without touching page state; the dossier and the comparison share them. */
function prepGene(hit) {
  const ens = pickEnsembl(hit.ensembl, SPECIES[S.species].ens);
  return { ...hit, ensId: ens, pos: pickPos(hit.genomic_pos, ens) };
}
const UNI_FIELDS = 'accession,protein_name,cc_function,cc_subcellular_location,length,mass,ft_domain';
async function getUniprot(g, species) {
  const sp = g.uniprot && g.uniprot['Swiss-Prot'];
  const acc = Array.isArray(sp) ? sp[0] : sp;
  const url = acc
    ? `https://rest.uniprot.org/uniprotkb/search?query=accession:${acc}&fields=${UNI_FIELDS}&format=json&size=1`
    : `https://rest.uniprot.org/uniprotkb/search?query=${encodeURIComponent(`gene_exact:${g.symbol} AND organism_id:${SPECIES[species].taxid} AND reviewed:true`)}&fields=${UNI_FIELDS}&format=json&size=1`;
  const j = await getJSON(url);
  return (j.results && j.results[0]) || null;
}
function accOf(g, u) {
  const sp = g.uniprot && g.uniprot['Swiss-Prot'];
  return (Array.isArray(sp) ? sp[0] : sp) || (u && u.primaryAccession) || null;
}
async function getAF(acc) {
  try {
    const j = await getJSON(`https://alphafold.ebi.ac.uk/api/prediction/${acc}`);
    return (Array.isArray(j) && j[0]) || null;
  } catch (e) { if (isMissing(e)) return null; throw e; }
}
async function getOT(g) {
  if (!g.ensId) return null;
  const query = `query($id:String!){target(ensemblId:$id){approvedSymbol associatedDiseases(page:{size:12,index:0}){count rows{score disease{id name}}}}}`;
  const j = await getJSON('https://api.platform.opentargets.org/api/v4/graphql', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { id: g.ensId } })
  });
  return j.data && j.data.target ? j.data.target.associatedDiseases : null;
}
async function getGtex(g) {
  try {
    // GTEx needs the versioned GENCODE id; resolve it from the symbol first.
    const ref = await getJSON(`https://gtexportal.org/api/v2/reference/gene?geneId=${encodeURIComponent(g.symbol)}&gencodeVersion=v26&genomeBuild=GRCh38%2Fhg38`);
    const hit = (ref.data || []).find((d) => g.ensId && d.gencodeId.startsWith(g.ensId + '.')) || (ref.data || [])[0];
    if (!hit) return [];
    const j = await getJSON(`https://gtexportal.org/api/v2/expression/medianGeneExpression?gencodeId=${hit.gencodeId}&datasetId=gtex_v8`);
    return (j.data || []).map((d) => ({ tissue: d.tissueSiteDetailId.replace(/_/g, ' ').replace(/\s+-\s+/g, ' – '), tpm: d.median })).sort((a, b) => b.tpm - a.tpm);
  } catch (e) { if (isMissing(e)) return []; throw e; }
}
async function getString(g, species) {
  try {
    const j = await getJSON(`https://string-db.org/api/json/network?identifiers=${encodeURIComponent(g.symbol)}&species=${SPECIES[species].taxid}&required_score=700&add_nodes=12&caller_identity=gene-dossier`);
    return Array.isArray(j) ? j : [];
  } catch (e) { if (isMissing(e)) return []; throw e; }
}
// NCBI allows ~3 requests/s without a key, so every E-utilities call goes through one spaced queue.
let ncbiChain = Promise.resolve();
function ncbi(url) {
  const p = ncbiChain.then(() => getJSON(url));
  ncbiChain = p.catch(() => {}).then(() => sleep(350));
  return p;
}
const esClin = (term, n = 0) => ncbi(`${EU}esearch.fcgi?db=clinvar&retmode=json&retmax=${n}&tool=gene-dossier&term=${encodeURIComponent(term)}`);
async function getClinCounts(sym, alive) {
  const base = `${sym}[gene] AND "single gene"[prop]`;
  const counts = { total: +(await esClin(base)).esearchresult.count };
  let pIds = [];
  for (const [k, prop] of CLS) {
    if (!alive()) throw new Error('stale');
    const r = (await esClin(`${base} AND "${prop}"[prop]`, k === 'p' ? 60 : 0)).esearchresult;
    counts[k] = +r.count;
    if (k === 'p') pIds = r.idlist || [];
  }
  return { counts, pIds, base };
}

async function loadUniprot(my) {
  S.uniStatus = 'loading'; render();
  try {
    const u = await getUniprot(S.gene, S.species);
    if (my !== reqId) return;
    S.uniprot = u;
    S.uniStatus = 'ok';
  } catch { if (my !== reqId) return; S.uniStatus = 'error'; }
  render();
  loadAF(my);
}

async function loadAF(my) {
  if (my !== reqId) return;
  const acc = accOf(S.gene, S.uniprot);
  if (!acc) { S.af = null; S.afStatus = 'ok'; render(); return; }
  S.afStatus = 'loading'; render();
  try {
    const af = await getAF(acc);
    if (my !== reqId) return;
    S.af = af; S.afStatus = 'ok';
  } catch { if (my !== reqId) return; S.afStatus = 'error'; }
  render();
}

async function loadGtex(my) {
  if (S.species !== 'human') { S.gtexStatus = 'na'; render(); return; }
  S.gtexStatus = 'loading'; render();
  try {
    const rows = await getGtex(S.gene);
    if (my !== reqId) return;
    S.gtex = rows; S.gtexStatus = 'ok';
  } catch { if (my !== reqId) return; S.gtexStatus = 'error'; }
  render();
}

async function loadString(my) {
  S.strStatus = 'loading'; render();
  try {
    const edges = await getString(S.gene, S.species);
    if (my !== reqId) return;
    S.str = edges; S.strStatus = 'ok';
  } catch { if (my !== reqId) return; S.strStatus = 'error'; }
  render();
}

const EU = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/';
const CLS = [['p', 'clinsig pathogenic'], ['lp', 'clinsig likely pathogenic'], ['vus', 'clinsig vus'], ['lb', 'clinsig likely benign'], ['b', 'clinsig benign']];
const STARS = { 'practice guideline': 4, 'reviewed by expert panel': 3, 'criteria provided, multiple submitters, no conflicts': 2, 'criteria provided, single submitter': 1, 'criteria provided, conflicting classifications': 1 };

async function loadClin(my) {
  if (S.species !== 'human') { S.clinStatus = 'na'; render(); return; }
  S.clinStatus = 'loading'; render();
  try {
    const { counts, pIds, base } = await getClinCounts(S.gene.symbol, () => my === reqId);
    let ids = pIds;
    // Prefer well-reviewed records (2+ stars). Older ClinVar ids are the classic, long-studied variants, so take the lowest ids.
    if (my !== reqId) return;
    const reviewed = (await esClin(`${base} AND "clinsig pathogenic"[prop] AND ("practice guideline"[rvst] OR "reviewed by expert panel"[rvst] OR "criteria provided, multiple submitters, no conflicts"[rvst])`, 500)).esearchresult.idlist || [];
    if (reviewed.length) ids = reviewed.map(Number).sort((a, b) => a - b).slice(0, 40);
    let top = [];
    if (ids.length) {
      const sm = await ncbi(`${EU}esummary.fcgi?db=clinvar&retmode=json&tool=gene-dossier&id=${ids.join(',')}`);
      top = (sm.result.uids || []).map((u) => sm.result[u]).map((v) => {
        const gc = v.germline_classification || {};
        return {
          id: v.uid, title: v.title || '', type: v.obj_type || '',
          stars: STARS[gc.review_status] || 0, review: gc.review_status || '',
          traits: (gc.trait_set || []).map((x) => x.trait_name).filter((n) => n && !/not provided|not specified/i.test(n))
        };
      }).sort((a, b) => b.stars - a.stars);
    }
    if (my !== reqId) return;
    S.clin = { counts, top }; S.clinStatus = 'ok';
  } catch { if (my !== reqId) return; S.clinStatus = 'error'; }
  render();
}

async function loadOT(my) {
  if (S.species !== 'human' || !S.gene.ensId) { S.otStatus = 'na'; render(); return; }
  S.otStatus = 'loading'; render();
  try {
    const ot = await getOT(S.gene);
    if (my !== reqId) return;
    S.ot = ot;
    S.otStatus = 'ok';
  } catch { if (my !== reqId) return; S.otStatus = 'error'; }
  render();
}

function papersQuery() {
  const sym = S.gene.symbol;
  const org = { human: '', mouse: ' AND (mouse OR mice)', rat: ' AND (rat OR rats)' }[S.species];
  return `TITLE_ABS:"${sym}"${org}`;
}
async function loadPapers(my) {
  S.papStatus = 'loading'; render();
  try {
    const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(papersQuery())}&sort=${encodeURIComponent('P_PDATE_D desc')}&format=json&pageSize=10&resultType=lite`;
    const j = await getJSON(url);
    if (my !== reqId) return;
    S.papers = { total: j.hitCount, list: (j.resultList && j.resultList.result) || [] };
    S.papStatus = 'ok';
  } catch { if (my !== reqId) return; S.papStatus = 'error'; }
  render();
}

/* ---------- render helpers ---------- */
const skel = () => '<div class="skel"><i></i><i></i><i></i></div>';
const errBox = (src, action) => `<div class="err"><span>${esc(fmt(t().error, { src }))}</span><button type="button" data-retry="${action}">${t().retry}</button></div>`;
const plain = (...paras) => S.mode === 'student' ? `<div class="plain"><b>${t().plain}</b>${paras.filter(Boolean).map((p) => `<p>${p}</p>`).join('')}</div>` : '';

function parseBand(band) {
  const m = /^(\d+|X|Y)([pq])(\d)?(\d)?(?:\.(\d+))?/.exec(band || '');
  return m ? { chr: m[1], arm: m[2], r: m[3], b: m[4], sub: m[5] } : null;
}

function ideogram(g) {
  const chrs = CHROMS[S.species];
  const pos = g.pos;
  if (!chrs || !pos || !chrs[pos.chr] || !pos.start) return '';
  const [len, cen] = chrs[pos.chr];
  const W = 600, x0 = 10, x1 = W - 10, y = 22, h = 14;
  const sx = (mb) => x0 + (mb / len) * (x1 - x0);
  const mid = (pos.start + pos.end) / 2 / 1e6;
  const gx = sx(mid), cx = sx(cen);
  const r = h / 2;
  const acro = cen === 0;
  // Two rounded arm shapes meeting at the centromere pinch.
  const pArm = acro ? '' : `<rect x="${x0}" y="${y}" width="${cx - x0 - 2}" height="${h}" rx="${r}" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1"/>`;
  const qStart = acro ? x0 : cx + 2;
  const qArm = `<rect x="${qStart}" y="${y}" width="${x1 - qStart}" height="${h}" rx="${r}" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1"/>`;
  const tmb = t().mb;
  return `<div class="ideo">
    <svg viewBox="0 0 ${W} 62" role="img" aria-label="${esc(t().chr)} ${esc(pos.chr)}">
      ${pArm}${qArm}
      ${acro ? '' : `<circle cx="${cx}" cy="${y + r}" r="3" fill="var(--muted)"/>`}
      <line x1="${gx}" x2="${gx}" y1="${y - 8}" y2="${y + h + 8}" stroke="var(--warm)" stroke-width="3" stroke-linecap="round"/>
      <text x="${Math.min(Math.max(gx, 40), W - 40)}" y="12" text-anchor="middle" font-size="12" font-family="IBM Plex Mono, monospace" fill="var(--warm)" font-weight="500">${esc(g.symbol)}</text>
      ${acro ? '' : `<text x="${(x0 + cx) / 2}" y="${y + h + 20}" text-anchor="middle" font-size="11" fill="var(--muted)" font-family="IBM Plex Sans, sans-serif">p</text>`}
      <text x="${(qStart + x1) / 2}" y="${y + h + 20}" text-anchor="middle" font-size="11" fill="var(--muted)" font-family="IBM Plex Sans, sans-serif">q</text>
      <text x="${x0}" y="${y + h + 20}" font-size="11" fill="var(--muted)" font-family="IBM Plex Mono, monospace">0</text>
      <text x="${x1}" y="${y + h + 20}" text-anchor="end" font-size="11" fill="var(--muted)" font-family="IBM Plex Mono, monospace">${len.toFixed(0)} ${esc(tmb)}</text>
    </svg>
    <div class="cap">${esc(t().chr)} ${esc(pos.chr)} · ${mid.toFixed(2)} ${esc(tmb)}${acro ? '' : ` · ${esc(cen < mid ? t().qArm : t().pArm)}`}</div>
  </div>`;
}

function dbLinks(g) {
  const L = [];
  if (g.entrezgene) L.push(['NCBI Gene', `https://www.ncbi.nlm.nih.gov/gene/${g.entrezgene}`]);
  if (g.ensId) L.push(['Ensembl', `https://www.ensembl.org/id/${g.ensId}`]);
  const sp = g.uniprot && g.uniprot['Swiss-Prot'];
  const acc = Array.isArray(sp) ? sp[0] : sp;
  if (acc) L.push(['UniProt', `https://www.uniprot.org/uniprotkb/${acc}/entry`]);
  if (S.species === 'human') {
    L.push(['GeneCards', `https://www.genecards.org/cgi-bin/carddisp.pl?gene=${encodeURIComponent(g.symbol)}`]);
    if (g.ensId) L.push(['Open Targets', `https://platform.opentargets.org/target/${g.ensId}`]);
    if (g.HGNC) L.push(['HGNC', `https://www.genenames.org/data/gene-symbol-report/#!/hgnc_id/HGNC:${g.HGNC}`]);
  }
  if (S.species === 'mouse' && g.MGI) L.push(['MGI', `https://www.informatics.jax.org/marker/${g.MGI}`]);
  if (S.species === 'rat' && g.RGD) L.push(['RGD', `https://rgd.mcw.edu/rgdweb/report/gene/main.html?id=${String(g.RGD).replace('RGD:', '')}`]);
  return `<div class="links">${L.map(([n, u]) => `<a href="${u}" target="_blank" rel="noopener">${n}</a>`).join('')}</div>`;
}

function overviewCard() {
  const g = S.gene, tt = t();
  const pos = g.pos;
  const strand = pos && pos.strand ? (pos.strand > 0 ? '+' : '−') : '';
  const coords = pos && pos.start ? `chr${pos.chr}:${num(pos.start)}–${num(pos.end)} (${strand})` : '';
  const typeKey = g.type_of_gene || 'unknown';
  const typeLabel = tt.gt[typeKey] || typeKey;
  const aliases = [].concat(g.alias || []);
  // Mouse/rat map_location looks like "2 E3|2 55.31 cM"; keep the cytoband part.
  const band = String(g.map_location || '').split('|')[0].trim();
  const pb = parseBand(band);
  const expert = S.mode === 'expert';

  const facts = [
    [tt.chr, pos ? esc(pos.chr) : esc(pb ? pb.chr : '—')],
    band && [tt.band, `<span class="mono">${esc(band)}</span>`],
    expert && coords && [tt.coords, `<span class="mono">${coords}</span>`],
    [tt.type, `<span class="pill${typeKey === 'protein-coding' ? '' : ' warm'}">${esc(typeLabel)}</span>`],
    aliases.length && [tt.aliases, `<span class="mono">${aliases.slice(0, expert ? 12 : 5).map(esc).join(', ')}</span>`]
  ].filter(Boolean);

  const typeExpl = tt.x.type[typeKey] || (typeKey === 'protein-coding' ? '' : tt.x.type.other);
  const sizeExpl = pos && pos.start ? tt.x.size((pos.start / 1e6).toFixed(1), ((pos.end - pos.start) / 1e3).toFixed(1)) : '';

  return `<article class="card full">
    <h2><span>${tt.overview}</span><span>${esc(tt.sp[S.species])}</span></h2>
    <div class="ident">
      <div>
        <p class="symbol">${esc(g.symbol)}</p>
        <p class="fullname">${esc(g.name || '')}</p>
        ${ideogram(g)}
        ${plain(tt.x.italic(esc(g.symbol)), pb ? tt.x.locus(esc(pb.chr), pb.arm, pb.r, pb.b, pb.sub, esc(band)) : '', sizeExpl, typeExpl)}
      </div>
      <div>
        <dl class="facts">${facts.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>
        <div class="subhead">${expert ? tt.ids : tt.more}</div>
        ${dbLinks(g)}
        ${expert && g.entrezgene ? `<p class="note mono">Entrez ${esc(g.entrezgene)}${g.ensId ? ' · ' + esc(g.ensId) : ''}</p>` : ''}
      </div>
    </div>
  </article>`;
}

function refsify(text) {
  const safe = esc(text);
  const re = /\s*\(((?:PubMed:\d+(?:,\s*)?)+)\)/g;
  if (S.mode === 'student') return safe.replace(re, '').replace(/\s*\((?:By similarity|Probable)\)/g, '');
  return safe.replace(re, (_, ids) => ids.match(/\d+/g).slice(0, 4).map((id) => `<a class="ref" href="https://pubmed.ncbi.nlm.nih.gov/${id}/" target="_blank" rel="noopener" title="PMID ${id}">[${id}]</a>`).join(''));
}

function functionCard() {
  const tt = t();
  let body;
  if (S.uniStatus === 'loading' || S.uniStatus === 'idle') body = skel();
  else if (S.uniStatus === 'error') body = errBox('UniProt', 'uniprot');
  else if (!S.uniprot) body = `<p class="empty">${tt.noProtein}</p>`;
  else {
    const u = S.uniprot;
    const pname = u.proteinDescription?.recommendedName?.fullName?.value || u.proteinDescription?.submissionNames?.[0]?.fullName?.value || '';
    const len = u.sequence?.length;
    const kda = u.sequence?.molWeight ? (u.sequence.molWeight / 1000).toFixed(1) : null;
    const comments = u.comments || [];
    const fnTexts = comments.filter((c) => c.commentType === 'FUNCTION').flatMap((c) => (c.texts || []).map((x) => x.value));
    const locs = [...new Set(comments.filter((c) => c.commentType === 'SUBCELLULAR LOCATION')
      .flatMap((c) => (c.subcellularLocations || []).map((s) => s.location?.value)).filter(Boolean))];
    const domains = (u.features || []).filter((f) => f.type === 'Domain');
    // Student mode keeps only the opening sentences of the first paragraph.
    const firstSentences = (s, n) => (s.match(/[^.]+(?:\.(?!\d)|$)+/g) || [s]).slice(0, n).join('').trim();
    const trOn = trActive() && S.tr.fn && S.tr.fn.length > 0;
    const src = trOn ? S.tr.fn : fnTexts;
    const shown = S.mode === 'student' ? src.slice(0, 1).map((s) => firstSentences(stripRefs(s), 3)) : src;
    body = `
      <div class="kv">
        <div><span>${tt.protein}:</span> ${esc(pname)}</div>
        ${len ? `<div><span>${tt.length}:</span> <b class="mono">${num(len)}</b> ${tt.aa}</div>` : ''}
        ${kda ? `<div><span>${tt.mass}:</span> <b class="mono">${kda}</b> ${tt.kda}</div>` : ''}
      </div>
      ${shown.map((x) => `<p class="prose">${trOn ? esc(x) : refsify(x)}</p>`).join('') || `<p class="empty">${tt.none}</p>`}
      ${trBar(fnTexts.length > 0)}
      ${len && kda ? plain(tt.x.protein(num(len), kda)) : ''}
      ${locs.length ? `<div class="subhead">${tt.loc}</div><div class="tags">${locs.slice(0, 10).map((l) => `<span>${esc(l)}</span>`).join('')}</div>${plain(tt.x.loc)}` : ''}
      ${S.mode === 'expert' && domains.length ? `<div class="subhead">${tt.domains}</div><div class="tags">${domains.map((d) => `<span>${esc(d.description)} <span class="mono">${d.location.start.value}–${d.location.end.value}</span></span>`).join('')}</div>` : ''}
      <p class="meta"><span>${tt.source}: UniProt ${esc(u.primaryAccession)}</span></p>`;
  }
  return `<article class="card"><h2><span>${tt.fn}</span></h2>${body}</article>`;
}

function diseaseCard() {
  const tt = t();
  let body, link = '';
  if (S.otStatus === 'na') body = `<p class="empty">${tt.humanOnly}</p>`;
  else if (S.otStatus === 'loading' || S.otStatus === 'idle') body = skel();
  else if (S.otStatus === 'error') body = errBox('Open Targets', 'ot');
  else if (!S.ot || !S.ot.rows.length) body = `<p class="empty">${tt.none}</p>`;
  else {
    const rows = S.mode === 'student' ? S.ot.rows.slice(0, 8) : S.ot.rows;
    link = `<a href="https://platform.opentargets.org/target/${S.gene.ensId}/associations" target="_blank" rel="noopener">${tt.openOT}</a>`;
    body = `<ul class="dis">${rows.map((r) => `<li>
        <a href="https://platform.opentargets.org/disease/${r.disease.id}" target="_blank" rel="noopener">${esc(r.disease.name)}</a>
        <span class="sc">${r.score.toFixed(2)}</span>
        <span class="track"><i style="width:${(r.score * 100).toFixed(1)}%"></i></span>
      </li>`).join('')}</ul>
      ${plain(tt.x.dis)}
      <p class="meta"><span>${esc(fmt(tt.total, { n: num(S.ot.count) }))}</span><span>${tt.source}: Open Targets</span></p>`;
  }
  return `<article class="card"><h2><span>${tt.diseases}</span>${link}</h2>${body}</article>`;
}

function summaryCard() {
  const g = S.gene;
  if (!g.summary) return '';
  const orig = S.mode === 'student' ? stripPmids(g.summary) : g.summary;
  const text = trActive() && S.tr.summary ? S.tr.summary : orig;
  return `<article class="card full"><h2><span>${t().summary}</span></h2><p class="prose">${esc(text)}</p>${trBar(true)}</article>`;
}

/* ---------- AI: summary and translation ---------- */
const stripRefs = (s) => String(s).replace(/\s*\((?:PubMed:\d+(?:,\s*)?)+\)/g, '');
const stripPmids = (s) => String(s || '').replace(/\s*\(PMIDs?:[^)]*\)/g, '');
const fnTextsOf = (u) => (u && u.comments || []).filter((c) => c.commentType === 'FUNCTION').flatMap((c) => (c.texts || []).map((x) => x.value));
const locsOf = (u) => [...new Set((u && u.comments || []).filter((c) => c.commentType === 'SUBCELLULAR LOCATION').flatMap((c) => (c.subcellularLocations || []).map((s) => s.location && s.location.value)).filter(Boolean))];
function partnersOf(edges, sym) {
  const up = String(sym).toUpperCase(), best = new Map();
  (edges || []).forEach((e) => {
    const a = e.preferredName_A, b = e.preferredName_B;
    const other = a.toUpperCase() === up ? b : b.toUpperCase() === up ? a : null;
    if (other) best.set(other, Math.max(best.get(other) || 0, e.score));
  });
  return [...best.entries()].sort((x, y) => y[1] - x[1]).map(([n]) => n);
}
function edgeScore(edges, a, b) {
  const A = String(a).toUpperCase(), B = String(b).toUpperCase();
  const e = (edges || []).find((x) => { const p = x.preferredName_A.toUpperCase(), q = x.preferredName_B.toUpperCase(); return (p === A && q === B) || (p === B && q === A); });
  return e ? e.score : null;
}

const cacheGet = (k) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; } };
const cacheSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } };
const aiKey = () => `gd.ai.sum.${S.species}.${S.gene.symbol}.${S.lang}.${S.mode}`;
const trKey = () => `gd.ai.tr.${S.species}.${S.gene.symbol}.${S.lang}`;
const trActive = () => S.lang !== 'en' && S.trStatus === 'ok' && S.tr && S.tr.show;

async function callAI(body) {
  const r = await fetch(`${API}/api/ai`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(j.error || r.status); e.code = j.error || String(r.status); throw e; }
  return j;
}

// Language and mode switches pick up an already generated text from the browser cache.
function syncAI() {
  const k = aiKey();
  if (S.aiKey !== k && S.aiStatus !== 'loading') { const c = cacheGet(k); S.ai = c; S.aiStatus = c ? 'ok' : 'idle'; S.aiKey = k; }
  if (S.lang === 'en' || S.trStatus === 'loading') return;
  const tk = trKey();
  if (!S.tr || S.tr.key !== tk) { const c = cacheGet(tk); S.tr = c; S.trStatus = c ? 'ok' : 'idle'; }
}

function aiContext() {
  const g = S.gene;
  return {
    symbol: g.symbol, name: g.name, species: S.species, type: g.type_of_gene, location: g.map_location,
    summary: stripPmids(g.summary), fn: fnTextsOf(S.uniprot).map(stripRefs).join(' '), locs: locsOf(S.uniprot),
    diseases: (S.ot && S.ot.rows || []).slice(0, 8).map((r) => `${r.disease.name} (${r.score.toFixed(2)})`),
    tissues: (S.gtex || []).slice(0, 6).map((r) => `${r.tissue}: ${r.tpm.toFixed(1)} TPM`),
    partners: partnersOf(S.str, g.symbol).slice(0, 12),
    clinvar: S.clin ? CLS.map(([k]) => `${k}: ${S.clin.counts[k]}`).join(', ') : '',
    papers: (S.papers && S.papers.list || []).slice(0, 8).map((p) => `${p.firstPublicationDate || p.pubYear}: ${(p.title || '').replace(/<[^>]+>/g, '')}`)
  };
}

async function loadAI(force) {
  const key = aiKey(), my = reqId;
  const cached = !force && cacheGet(key);
  if (cached) { Object.assign(S, { ai: cached, aiStatus: 'ok', aiKey: key }); render(); return; }
  Object.assign(S, { aiStatus: 'loading', aiKey: key }); render();
  try {
    const out = await callAI({ task: 'summary', lang: S.lang, mode: S.mode, gene: aiContext() });
    if (my !== reqId || S.aiKey !== key) return;
    Object.assign(S, { ai: out, aiStatus: 'ok' }); cacheSet(key, out);
  } catch (e) {
    if (my !== reqId || S.aiKey !== key) return;
    Object.assign(S, { aiStatus: 'error', aiErr: e.code });
  }
  render();
}

async function loadTr() {
  const key = trKey(), my = reqId;
  const fn = fnTextsOf(S.uniprot).slice(0, 6).map(stripRefs);
  const summary = stripPmids(S.gene.summary);
  const texts = summary ? [...fn, summary] : fn;
  if (!texts.length) return;
  S.trStatus = 'loading'; render();
  try {
    const out = await callAI({ task: 'translate', lang: S.lang, texts });
    if (my !== reqId || trKey() !== key) return;
    S.tr = { key, fn: out.t.slice(0, fn.length), summary: summary ? out.t[fn.length] : '', show: true };
    S.trStatus = 'ok'; cacheSet(key, S.tr);
  } catch {
    if (my !== reqId || trKey() !== key) return;
    S.trStatus = 'error';
  }
  render();
}

function trBar(has) {
  if (S.lang === 'en' || !has) return '';
  const tt = t();
  if (S.trStatus === 'loading') return `<div class="trbar">${tt.trLoading}</div>`;
  if (S.trStatus === 'ok' && S.tr) return `<div class="trbar"><span>${tt.trNote}</span><button type="button" class="small-btn" data-act="tr-toggle">${S.tr.show ? tt.trOrig : tt.trShow}</button></div>`;
  return `<div class="trbar">${S.trStatus === 'error' ? `<span class="err">${tt.trErr}</span>` : ''}<button type="button" class="small-btn" data-act="tr">${tt.trGo}</button></div>`;
}

function aiCard() {
  const tt = t();
  const ready = ['uniStatus', 'otStatus', 'gtexStatus', 'strStatus', 'papStatus', 'clinStatus'].every((k) => !['idle', 'loading'].includes(S[k]));
  let body;
  if (S.aiStatus === 'loading') body = `${skel()}<p class="note">${tt.aiLoading}</p>`;
  else if (S.aiStatus === 'ok' && S.ai) {
    const a = S.ai;
    body = `<div class="ai-out">
        ${a.overview ? `<p>${esc(a.overview)}</p>` : ''}
        ${Array.isArray(a.points) && a.points.length ? `<ul>${a.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}
        ${a.news ? `<p><b>${tt.aiNews}.</b> ${esc(a.news)}</p>` : ''}
      </div>
      <p class="ai-note">${tt.aiNote}</p>
      <button type="button" class="linkbtn" data-act="ai-redo">${tt.aiRedo}</button>`;
  } else {
    const err = S.aiStatus === 'error' ? `<p class="err" style="margin-top:8px">${esc(tt.aiErr[S.aiErr] || tt.aiErr.default)}</p>` : '';
    body = `<p class="prose">${tt.aiIntro}</p>${err}
      <div style="margin-top:12px"><button type="button" class="btn primary slim" data-act="ai"${ready ? '' : ' disabled'}>${ready ? tt.aiGo : tt.aiWait}</button></div>`;
  }
  return `<article class="card full ai-card"><h2><span>${tt.ai}</span><span class="ai-badge">${esc((S.aiStatus === 'ok' && S.ai && S.ai.model) || 'AI')}</span></h2>${body}</article>`;
}

/* ---------- comparison ---------- */
async function loadCompare(q) {
  q = q.trim();
  if (!q || !S.gene) return;
  const c = { q, status: 'loading', d: {}, st: {} };
  S.cmp = c; render();
  const live = () => S.cmp === c;
  try {
    const hit = await fetchGene(q, S.species);
    if (!live()) return;
    if (!hit) { c.status = 'notfound'; render(); return; }
    if (hit.symbol === S.gene.symbol) { c.status = 'same'; render(); return; }
    const g = prepGene(hit);
    Object.assign(c, { status: 'ok', gene: g });
    const human = S.species === 'human';
    const jobs = {
      uni: () => getUniprot(g, S.species),
      str: () => getString(g, S.species),
      ot: human ? () => getOT(g) : null,
      gtex: human ? () => getGtex(g) : null,
      clin: human ? async () => (await getClinCounts(g.symbol, live)).counts : null
    };
    Object.keys(jobs).forEach((k) => { c.st[k] = jobs[k] ? 'loading' : 'na'; });
    c.st.af = 'loading';
    render();
    await Promise.all(Object.entries(jobs).filter(([, f]) => f).map(async ([k, f]) => {
      try { c.d[k] = await f(); c.st[k] = 'ok'; } catch { c.d[k] = null; c.st[k] = 'error'; }
      if (live()) render();
    }));
    // AlphaFold needs the UniProt accession, which may only come from the UniProt search.
    const acc = accOf(g, c.d.uni);
    try { c.d.af = acc ? await getAF(acc) : null; c.st.af = 'ok'; } catch { c.st.af = 'error'; }
    if (live()) render();
  } catch { if (live()) { c.status = 'error'; render(); } }
}

function compareCard() {
  const c = S.cmp;
  if (!c) return '';
  const tt = t();
  let body, title = tt.cmp, open = '';
  if (c.status === 'loading') body = skel();
  else if (c.status === 'notfound') body = `<p class="empty">${esc(fmt(tt.cmpNotFound, { q: c.q, sp: tt.sp[S.species] }))}</p>`;
  else if (c.status === 'same') body = `<p class="empty">${tt.cmpSame}</p>`;
  else if (c.status === 'error') body = errBox('MyGene.info', 'cmp');
  else {
    const A = { gene: S.gene, uni: S.uniprot, ot: S.ot, gtex: S.gtex, str: S.str, af: S.af, clin: S.clin && S.clin.counts,
      st: { uni: S.uniStatus, ot: S.otStatus, gtex: S.gtexStatus, str: S.strStatus, af: S.afStatus, clin: S.clinStatus } };
    const B = { gene: c.gene, ...c.d, st: c.st };
    title = fmt(tt.cmpTitle, { a: A.gene.symbol, b: B.gene.symbol });
    open = `<button type="button" data-goto="${esc(B.gene.symbol)}">${esc(fmt(tt.openB, { b: B.gene.symbol }))}</button>`;
    const dis = (s) => new Set((s.ot && s.ot.rows || []).map((r) => r.disease.name));
    const da = dis(A), db = dis(B);
    const common = new Set([...da].filter((x) => db.has(x)));
    // A cell shows "…" while its source loads, "!" if it failed and "—" if the source has nothing.
    const need = (s, k, f) => {
      const st = s.st[k];
      if (st === 'na') return '—';
      if (st === 'error') return '<span class="muted">!</span>';
      if (st !== 'ok') return '<span class="muted">…</span>';
      return f(s[k]);
    };
    const band = (g) => String(g.map_location || '').split('|')[0].trim();
    const rows = [
      [tt.cmpName, (s) => esc(s.gene.name || '—')],
      [`${tt.chr} · ${tt.band}`, (s) => esc([s.gene.pos && s.gene.pos.chr, band(s.gene)].filter(Boolean).join(' · ') || '—')],
      [tt.type, (s) => esc(tt.gt[s.gene.type_of_gene] || s.gene.type_of_gene || '—')],
      [tt.protein, (s) => need(s, 'uni', (u) => u && u.sequence ? `${num(u.sequence.length)} ${tt.aa} · ${(u.sequence.molWeight / 1000).toFixed(1)} ${tt.kda}` : '—')],
      [tt.loc, (s) => need(s, 'uni', (u) => esc(locsOf(u).slice(0, 4).join(', ')) || '—')],
      [tt.plddtShort, (s) => need(s, 'af', (a) => a && a.globalMetricValue != null ? a.globalMetricValue.toFixed(1) : '—')],
      [tt.diseases, (s) => need(s, 'ot', (o) => o && o.rows.length ? `<ol>${o.rows.slice(0, 5).map((r) => `<li${common.has(r.disease.name) ? ' class="hl"' : ''}>${esc(r.disease.name)}</li>`).join('')}</ol>` : '—')],
      [tt.expr, (s) => need(s, 'gtex', (g) => g && g.length ? g.slice(0, 3).map((r) => `${esc(r.tissue)} <span class="mono">${r.tpm.toFixed(0)}</span>`).join('<br>') : '—')],
      [`${tt.cls.p} (ClinVar)`, (s) => need(s, 'clin', (x) => x ? `${num(x.p)} / ${num(x.total)}` : '—')],
      [tt.partners, (s) => need(s, 'str', (e) => String(partnersOf(e, s.gene.symbol).length))]
    ];
    const pa = partnersOf(A.str, A.gene.symbol), pb = partnersOf(B.str, B.gene.symbol);
    const bothNet = A.st.str === 'ok' && B.st.str === 'ok';
    const shared = pa.filter((x) => pb.includes(x));
    const direct = edgeScore(A.str, A.gene.symbol, B.gene.symbol) ?? edgeScore(B.str, B.gene.symbol, A.gene.symbol);
    body = `<div class="cmp-wrap"><table class="cmp">
        <thead><tr><th></th><th>${esc(A.gene.symbol)}</th><th>${esc(B.gene.symbol)}</th></tr></thead>
        <tbody>${rows.map(([label, f]) => `<tr><th>${esc(label)}</th><td>${f(A)}</td><td>${f(B)}</td></tr>`).join('')}</tbody>
      </table></div>
      ${common.size ? `<p class="note">${tt.commonDis}</p>` : ''}
      ${bothNet ? `<div class="subhead">${tt.shared}</div>
        ${shared.length ? `<div class="shared">${shared.map((n) => `<button type="button" data-goto="${esc(n)}">${esc(n)}</button>`).join('')}</div>` : `<p class="empty">${tt.noShared}</p>`}
        <p class="note">${direct != null ? esc(fmt(tt.direct, { s: direct.toFixed(2) })) : tt.noDirect}</p>` : ''}
      ${plain(tt.x.cmp)}`;
  }
  return `<article class="card full"><h2><span>${esc(title)}</span><span class="h-actions">${open}<button type="button" data-act="cmp-close">${tt.cmpClose}</button></span></h2>${body}</article>`;
}

/* ---------- export ---------- */
function dossierMarkdown() {
  const tt = t(), g = S.gene, u = S.uniprot, L = [];
  const band = String(g.map_location || '').split('|')[0].trim();
  const clean = (s) => String(s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  L.push(`# ${g.symbol}: ${g.name || ''}`, '', `${tt.sp[S.species]} · ${tt.chr} ${g.pos ? g.pos.chr : '—'}${band ? ` · ${band}` : ''} · ${tt.gt[g.type_of_gene] || g.type_of_gene || ''}`, '');
  if (S.aiStatus === 'ok' && S.ai) {
    L.push(`## ${tt.ai}`, '', clean(S.ai.overview), '');
    (S.ai.points || []).forEach((p) => L.push(`- ${clean(p)}`));
    if (S.ai.news) L.push('', `**${tt.aiNews}.** ${clean(S.ai.news)}`);
    L.push('', `_${tt.aiNote}${S.ai.model ? ` (${S.ai.model})` : ''}_`, '');
  }
  if (u) {
    const pname = u.proteinDescription && u.proteinDescription.recommendedName ? u.proteinDescription.recommendedName.fullName.value : '';
    L.push(`## ${tt.fn}`, '', `**${tt.protein}:** ${pname}${u.sequence ? ` · ${u.sequence.length} ${tt.aa} · ${(u.sequence.molWeight / 1000).toFixed(1)} ${tt.kda}` : ''}`, '');
    const texts = trActive() && S.tr.fn && S.tr.fn.length ? S.tr.fn : fnTextsOf(u).map(stripRefs);
    texts.forEach((x) => L.push(clean(x), ''));
    const locs = locsOf(u);
    if (locs.length) L.push(`**${tt.loc}:** ${locs.join(', ')}`, '');
  }
  if (S.ot && S.ot.rows.length) { L.push(`## ${tt.diseases}`, ''); S.ot.rows.forEach((r) => L.push(`- ${r.disease.name}: ${r.score.toFixed(2)}`)); L.push(''); }
  if (S.gtex && S.gtex.length) { L.push(`## ${tt.expr}`, '', `| Tissue | TPM |`, `|---|---|`); S.gtex.slice(0, 15).forEach((r) => L.push(`| ${r.tissue} | ${r.tpm.toFixed(1)} |`)); L.push(''); }
  const partners = partnersOf(S.str, g.symbol);
  if (partners.length) L.push(`## ${tt.net}`, '', partners.join(', '), '');
  if (S.af) L.push(`## ${tt.struct}`, '', `${a2s(S.af)}`, '');
  if (S.clin) {
    L.push(`## ${tt.clin}`, '', CLS.map(([k]) => `${tt.cls[k]}: ${S.clin.counts[k]}`).join(' · '), '');
    S.clin.top.slice(0, 10).forEach((v) => L.push(`- ${v.title} (${'★'.repeat(v.stars)}${'☆'.repeat(4 - v.stars)}) https://www.ncbi.nlm.nih.gov/clinvar/variation/${v.id}/`));
    L.push('');
  }
  if (g.summary) L.push(`## ${tt.summary}`, '', clean(trActive() && S.tr.summary ? S.tr.summary : stripPmids(g.summary)), '');
  if (S.papers && S.papers.list.length) {
    L.push(`## ${tt.papers}`, '');
    S.papers.list.forEach((p) => L.push(`- ${p.firstPublicationDate || p.pubYear} · ${clean(p.title)} · ${p.journalTitle || ''}${p.pmid ? ` · https://pubmed.ncbi.nlm.nih.gov/${p.pmid}/` : ''}`));
    L.push('');
  }
  L.push('---', `${tt.exported} · ${new Date().toISOString().slice(0, 10)} · ${location.origin}${location.pathname}#${S.species === 'human' ? '' : S.species + ':'}${g.symbol}`, '', tt.foot);
  return L.join('\n');
}
function a2s(a) { return `${a.modelEntityId || ''} · ${fmt(t().meanPlddt, { n: a.globalMetricValue != null ? a.globalMetricValue.toFixed(1) : '—' })} · https://alphafold.ebi.ac.uk/entry/${a.uniprotAccession}`; }
function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function fmtDate(p) {
  const d = p.firstPublicationDate || p.pubYear || '';
  return d;
}

function papersCard() {
  const tt = t();
  let body, link = '';
  if (S.papStatus === 'loading' || S.papStatus === 'idle') body = skel();
  else if (S.papStatus === 'error') body = errBox('Europe PMC', 'papers');
  else if (!S.papers.list.length) body = `<p class="empty">${tt.none}</p>`;
  else {
    const list = S.mode === 'student' ? S.papers.list.slice(0, 6) : S.papers.list;
    link = `<a href="https://europepmc.org/search?query=${encodeURIComponent(papersQuery())}&sortBy=FIRST_PDATE_D+desc" target="_blank" rel="noopener">${tt.openEPMC}</a>`;
    body = `${plain(tt.x.papers)}<ul class="papers" style="margin-top:${S.mode === 'student' ? '14px' : '0'}">${list.map((p) => {
      const href = p.pmid ? `https://pubmed.ncbi.nlm.nih.gov/${p.pmid}/` : `https://europepmc.org/article/${p.source}/${p.id}`;
      const isReview = /review/i.test(p.pubType || '');
      const authors = (p.authorString || '').split(', ');
      const au = authors.length > 4 ? authors.slice(0, 3).join(', ') + ' et al.' : p.authorString || '';
      return `<li>
        <div class="date">${esc(fmtDate(p))}</div>
        <div>
          <a class="t" href="${href}" target="_blank" rel="noopener">${esc((p.title || '').replace(/<[^>]+>/g, ''))}</a>
          <div class="au">${esc(au)}${p.journalTitle ? ` · <i>${esc(p.journalTitle)}</i>` : ''}</div>
          <div class="badges">
            ${isReview ? `<span class="pill warm">${tt.review}</span>` : ''}
            ${p.isOpenAccess === 'Y' ? `<span class="pill">${tt.oa}</span>` : ''}
            ${S.mode === 'expert' && p.pmid ? `<span class="mono" style="color:var(--muted);font-size:12px">PMID ${esc(p.pmid)}</span>` : ''}
            ${S.mode === 'expert' && p.citedByCount ? `<span style="color:var(--muted);font-size:12px">${esc(fmt(tt.cited, { n: p.citedByCount }))}</span>` : ''}
          </div>
        </div>
      </li>`;
    }).join('')}</ul>
    <p class="meta"><span>${esc(fmt(tt.papersTotal, { n: num(S.papers.total) }))}</span><span>${tt.source}: Europe PMC</span></p>`;
  }
  return `<article class="card full"><h2><span>${tt.papers}</span>${link}</h2>${body}</article>`;
}

function exprCard() {
  const tt = t();
  let body;
  if (S.gtexStatus === 'na') body = `<p class="empty">${tt.exprHuman}</p>`;
  else if (S.gtexStatus === 'loading' || S.gtexStatus === 'idle') body = skel();
  else if (S.gtexStatus === 'error') body = errBox('GTEx', 'gtex');
  else if (!S.gtex.length) body = `<p class="empty">${tt.none}</p>`;
  else {
    const n = S.gtex.length;
    const limit = S.exprAll ? n : S.mode === 'student' ? 10 : 15;
    const max = S.gtex[0].tpm || 1;
    const rows = S.gtex.slice(0, limit).map((r) => {
      const v = r.tpm >= 100 ? r.tpm.toFixed(0) : r.tpm.toFixed(1);
      return `<div class="row" data-tip="${esc(r.tissue)}: ${v} TPM"><span class="nm">${esc(r.tissue)}</span><span class="bar"><i style="width:${Math.max(0.4, (r.tpm / max) * 100).toFixed(1)}%"></i></span><span class="v">${v}</span></div>`;
    }).join('');
    body = `${plain(tt.x.expr)}
      <div class="expr" style="margin-top:${S.mode === 'student' ? '12px' : '0'}">${rows}</div>
      ${n > limit || S.exprAll ? `<button type="button" class="linkbtn" data-act="expr">${S.exprAll ? tt.showLess : fmt(tt.showAll, { n })}</button>` : ''}
      <p class="meta"><span>${tt.exprUnit}</span><span>${tt.source}: GTEx v8</span></p>`;
  }
  const link = S.gtexStatus === 'ok' && S.gtex.length ? `<a href="https://gtexportal.org/home/gene/${encodeURIComponent(S.gene.symbol)}" target="_blank" rel="noopener">GTEx →</a>` : '';
  return `<article class="card full"><h2><span>${tt.expr}</span>${link}</h2>${body}</article>`;
}

function networkSVG(edges) {
  const sym = S.gene.symbol.toUpperCase();
  const names = [...new Set(edges.flatMap((e) => [e.preferredName_A, e.preferredName_B]))];
  if (names.length < 2) return '';
  const center = names.find((n) => n.toUpperCase() === sym) || names[0];
  const toCenter = {};
  edges.forEach((e) => {
    if (e.preferredName_A === center) toCenter[e.preferredName_B] = e.score;
    if (e.preferredName_B === center) toCenter[e.preferredName_A] = e.score;
  });
  // Radial layout: query protein in the middle, partners around it by descending confidence.
  const others = names.filter((n) => n !== center).sort((a, b) => (toCenter[b] || 0) - (toCenter[a] || 0));
  const W = 440, C = W / 2, R = 168;
  const pos = { [center]: [C, C] };
  others.forEach((n, i) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / others.length; pos[n] = [C + R * Math.cos(a), C + R * Math.sin(a)]; });
  const seen = new Set();
  const lines = edges.filter((e) => { const k = [e.preferredName_A, e.preferredName_B].sort().join('|'); if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, b) => (a.preferredName_A === center || a.preferredName_B === center) - (b.preferredName_A === center || b.preferredName_B === center))
    .map((e) => {
      const [x1, y1] = pos[e.preferredName_A], [x2, y2] = pos[e.preferredName_B];
      const hub = e.preferredName_A === center || e.preferredName_B === center;
      const w = (1 + ((e.score - 0.7) / 0.3) * 2.5).toFixed(2);
      return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${hub ? 'var(--accent)' : 'var(--muted)'}" stroke-opacity="${hub ? 0.75 : 0.35}" stroke-width="${w}" stroke-linecap="round"/>`;
    }).join('');
  const node = (n) => {
    const [x, y] = pos[n]; const isC = n === center; const r = isC ? 30 : 24;
    const label = n.length > 8 ? n.slice(0, 7) + '…' : n;
    const tip = isC ? n : `${n} · ${t().score} ${(toCenter[n] || 0).toFixed(2)}`;
    return `<g class="node" data-goto="${esc(n)}" data-tip="${esc(tip)}" tabindex="0" role="button" aria-label="${esc(n)}">
      <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${isC ? 'var(--accent-soft)' : 'var(--surface)'}" stroke="var(--accent)" stroke-width="${isC ? 2 : 1.25}"/>
      <text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="middle" font-size="${isC ? 12 : 10.5}" font-weight="500" font-family="IBM Plex Mono, monospace" fill="var(--fg)">${esc(label)}</text>
    </g>`;
  };
  return `<svg viewBox="0 0 ${W} ${W}" role="img" aria-label="STRING network">${lines}${others.map(node).join('')}${node(center)}</svg>`;
}

function networkCard() {
  const tt = t();
  let body, link = '';
  if (S.strStatus === 'loading' || S.strStatus === 'idle') body = skel();
  else if (S.strStatus === 'error') body = errBox('STRING', 'string');
  else {
    const svg = networkSVG(S.str);
    if (!svg) body = `<p class="empty">${tt.none}</p>`;
    else {
      link = `<a href="https://string-db.org/cgi/network?identifiers=${encodeURIComponent(S.gene.symbol)}&species=${SPECIES[S.species].taxid}" target="_blank" rel="noopener">${tt.openSTRING}</a>`;
      body = `<div class="net">${svg}</div><p class="note">${tt.netHint}</p>${plain(tt.x.net)}<p class="meta"><span>${tt.score} ≥ 0.70</span><span>${tt.source}: STRING</span></p>`;
    }
  }
  return `<article class="card"><h2><span>${tt.net}</span>${link}</h2>${body}</article>`;
}

/* 3D viewer lives outside the re-rendered markup and is moved into its slot after each render. */
const AF_COLORS = ['--af-vh', '--af-h', '--af-l', '--af-vl'];
const mol = { el: null, viewer: null, key: '', spinning: false, state: 'idle' };
let molLib = null;
function load3Dmol() {
  if (!molLib) molLib = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/3dmol@2.0.4/build/3Dmol-min.js';
    s.onload = () => res(window.$3Dmol); s.onerror = () => { molLib = null; rej(new Error('3Dmol')); };
    document.head.appendChild(s);
  });
  return molLib;
}
function molMsg(text) { if (!mol.el) return; let m = mol.el.querySelector('.msg'); if (!m) { m = document.createElement('div'); m.className = 'msg'; mol.el.appendChild(m); } m.textContent = text; m.hidden = !text; }
async function buildViewer(key) {
  mol.state = 'loading'; molMsg(t().molLoading);
  try {
    const [lib, pdb] = await Promise.all([load3Dmol(), fetch(key).then((r) => { if (!r.ok) throw new Error(r.status); return r.text(); })]);
    if (mol.key !== key) return;
    const cs = getComputedStyle(document.documentElement);
    const col = AF_COLORS.map((v) => cs.getPropertyValue(v).trim());
    const v = lib.createViewer(mol.el, { backgroundAlpha: 0 });
    v.setBackgroundColor(0x000000, 0);
    v.addModel(pdb, 'pdb');
    v.setStyle({}, { cartoon: { colorfunc: (a) => (a.b > 90 ? col[0] : a.b > 70 ? col[1] : a.b > 50 ? col[2] : col[3]) } });
    v.zoomTo(); v.render();
    mol.viewer = v; mol.state = 'ready'; molMsg('');
  } catch { if (mol.key === key) { mol.state = 'error'; molMsg(t().molFail); } }
}
function ensureMol() {
  const slot = document.getElementById('molSlot');
  if (!slot || !S.af) return;
  const key = S.af.pdbUrl;
  if (mol.key !== key) {
    mol.el = document.createElement('div'); mol.el.className = 'mol';
    mol.viewer = null; mol.key = key; mol.spinning = false; mol.state = 'idle';
  }
  slot.replaceWith(mol.el);
  if (mol.state === 'idle') buildViewer(key);
  else if (mol.viewer) { mol.viewer.resize(); mol.viewer.render(); }
}

function structCard() {
  const tt = t();
  let body, link = '';
  if (S.afStatus === 'loading' || S.afStatus === 'idle') body = skel();
  else if (S.afStatus === 'error') body = errBox('AlphaFold DB', 'af');
  else if (!S.af) body = `<p class="empty">${tt.noStruct}</p>`;
  else {
    const a = S.af;
    link = `<a href="https://alphafold.ebi.ac.uk/entry/${esc(a.uniprotAccession)}" target="_blank" rel="noopener">${tt.openAF}</a>`;
    const fr = [a.fractionPlddtVeryHigh, a.fractionPlddtConfident, a.fractionPlddtLow, a.fractionPlddtVeryLow];
    body = `<div id="molSlot" class="mol"></div>
      <div class="molbar">
        <div class="legend" aria-label="${esc(tt.plddt)}">${tt.bands.map((b, i) => `<span><i style="background:var(${AF_COLORS[i]})"></i>${esc(b)}${S.mode === 'expert' && fr[i] != null ? ` <b>${Math.round(fr[i] * 100)}%</b>` : ''}</span>`).join('')}</div>
        <div class="btns"><button type="button" class="small-btn" data-act="spin" aria-pressed="${mol.spinning}">${tt.spin}</button><button type="button" class="small-btn" data-act="reset">${tt.reset}</button></div>
      </div>
      ${plain(tt.x.struct)}
      <p class="meta"><span>${tt.plddt} · ${esc(fmt(tt.meanPlddt, { n: a.globalMetricValue != null ? a.globalMetricValue.toFixed(1) : '—' }))}</span><span>${tt.source}: AlphaFold DB ${esc(a.modelEntityId || '')}</span></p>`;
  }
  return `<article class="card"><h2><span>${tt.struct}</span>${link}</h2>${body}</article>`;
}

function clinCard() {
  const tt = t();
  let body, link = '';
  if (S.clinStatus === 'na') body = `<p class="empty">${tt.clinHuman}</p>`;
  else if (S.clinStatus === 'loading' || S.clinStatus === 'idle') body = skel();
  else if (S.clinStatus === 'error') body = errBox('ClinVar', 'clin');
  else if (!S.clin.counts.total) body = `<p class="empty">${tt.none}</p>`;
  else {
    const c = S.clin.counts;
    const keys = CLS.map(([k]) => k);
    const sum = keys.reduce((s, k) => s + c[k], 0) || 1;
    const pct = (k) => Math.round((c[k] / sum) * 100);
    link = `<a href="https://www.ncbi.nlm.nih.gov/clinvar/?term=${encodeURIComponent(S.gene.symbol + '[gene]')}" target="_blank" rel="noopener">${tt.openClin}</a>`;
    const stack = `<div class="stack" role="img" aria-label="${esc(keys.map((k) => `${tt.cls[k]} ${c[k]}`).join(', '))}">${keys.filter((k) => c[k] > 0).map((k) => `<i style="flex:${c[k]} 1 0;background:var(--cv-${k})" data-tip="${esc(tt.cls[k])}: ${num(c[k])} (${pct(k)}%)"></i>`).join('')}</div>`;
    const legend = `<div class="legend">${keys.map((k) => `<span><i style="background:var(--cv-${k})"></i>${esc(tt.cls[k])} <b>${num(c[k])}</b></span>`).join('')}</div>`;
    const n = S.mode === 'student' ? 5 : 10;
    const vars = S.clin.top.slice(0, n).map((v) => {
      const prot = (/\((p\.[^)]+)\)/.exec(v.title) || [])[1];
      const label = S.mode === 'student' && prot ? `<b>${esc(prot)}</b>` : esc(v.title).replace(/\((p\.[^)]+)\)/, '(<b>$1</b>)');
      const stars = '★'.repeat(v.stars) + '☆'.repeat(4 - v.stars);
      return `<li>
        <a href="https://www.ncbi.nlm.nih.gov/clinvar/variation/${esc(v.id)}/" target="_blank" rel="noopener">${label}</a>
        <span class="stars" data-tip="${esc(v.review)}" aria-label="${v.stars}/4">${stars}</span>
        ${v.traits.length ? `<span class="cond">${esc(v.traits.slice(0, 2).join('; '))}${S.mode === 'expert' && v.type ? ` · ${esc(v.type)}` : ''}</span>` : ''}
      </li>`;
    }).join('');
    body = `${stack}${legend}${plain(tt.x.clin)}
      ${vars ? `<div class="subhead">${tt.topPath}</div><ul class="vars">${vars}</ul>` : ''}
      <p class="meta"><span>${esc(fmt(tt.clinTotal, { n: num(c.total) }))}</span><span>${tt.source}: ClinVar (NCBI)</span></p>`;
  }
  return `<article class="card full"><h2><span>${tt.clin}</span>${link}</h2>${body}</article>`;
}

/* ---------- render ---------- */
function renderChrome() {
  const tt = t();
  document.documentElement.lang = S.lang;
  $('tagline').textContent = tt.tagline;
  $('q').placeholder = tt.searchPh;
  $('go').textContent = tt.search;
  $('dataNote').textContent = S.lang === 'en' ? '' : tt.dataNote;
  $('dataNote').hidden = S.lang === 'en';
  $('foot').textContent = tt.foot;
  document.querySelectorAll('#langSeg button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === S.lang)));
  document.querySelectorAll('#modeSeg button').forEach((b) => { b.textContent = tt.mode[b.dataset.mode]; b.setAttribute('aria-pressed', String(b.dataset.mode === S.mode)); });
  const sel = $('species');
  sel.innerHTML = Object.keys(SPECIES).map((k) => `<option value="${k}"${k === S.species ? ' selected' : ''}>${tt.sp[k]}</option>`).join('');
  $('tries').innerHTML = `<span>${tt.try}</span>` + SPECIES[S.species].examples.map((s) => `<button type="button" class="chip" data-gene="${s}">${s}</button>`).join('');
  $('tools').hidden = S.geneStatus !== 'ok';
  $('cmpQ').placeholder = tt.cmpWith;
  $('cmpGo').textContent = tt.cmpGo;
  $('expMd').textContent = tt.expMd;
  $('expPdf').textContent = tt.expPdf;
}

function render() {
  renderChrome();
  const d = $('dossier');
  const tt = t();
  if (S.geneStatus === 'loading') d.innerHTML = `<article class="card full">${skel()}</article><article class="card">${skel()}</article><article class="card">${skel()}</article>`;
  else if (S.geneStatus === 'notfound') d.innerHTML = `<div class="banner card full">${esc(fmt(tt.notFound, { q: S.query, sp: tt.sp[S.species] }))}</div>`;
  else if (S.geneStatus === 'error') d.innerHTML = `<div class="card full">${errBox('MyGene.info', 'gene')}</div>`;
  else if (S.geneStatus === 'ok') {
    syncAI();
    d.innerHTML = overviewCard() + aiCard() + compareCard() + functionCard() + diseaseCard() + exprCard() + networkCard() + structCard() + clinCard() + summaryCard() + papersCard();
    ensureMol();
  }
  else d.innerHTML = '';
}

/* ---------- tooltip ---------- */
const tip = document.createElement('div');
tip.className = 'tip'; tip.hidden = true; tip.setAttribute('role', 'tooltip');
document.body.appendChild(tip);
function placeTip(x, y) {
  tip.style.left = Math.max(8, Math.min(x + 14, innerWidth - tip.offsetWidth - 8)) + 'px';
  tip.style.top = Math.min(y + 16, innerHeight - tip.offsetHeight - 8) + 'px';
}
document.addEventListener('mouseover', (e) => {
  const el = e.target.closest && e.target.closest('[data-tip]');
  if (!el) { tip.hidden = true; return; }
  tip.textContent = el.getAttribute('data-tip'); tip.hidden = false; placeTip(e.clientX, e.clientY);
});
document.addEventListener('mousemove', (e) => { if (!tip.hidden) placeTip(e.clientX, e.clientY); });
document.addEventListener('focusin', (e) => {
  const el = e.target.closest && e.target.closest('[data-tip]');
  if (!el) { tip.hidden = true; return; }
  const r = el.getBoundingClientRect();
  tip.textContent = el.getAttribute('data-tip'); tip.hidden = false; placeTip(r.left + r.width / 2, r.bottom);
});
document.addEventListener('scroll', () => { tip.hidden = true; }, { passive: true });

/* ---------- autocomplete ---------- */
const input = $('q'), list = $('suggest');
let sugg = [], active = -1, sugTimer = 0, sugReq = 0;
function closeSuggest() { list.hidden = true; input.setAttribute('aria-expanded', 'false'); active = -1; }
function drawSuggest() {
  if (!sugg.length) { closeSuggest(); return; }
  list.innerHTML = sugg.map((h, i) => `<li role="option" id="opt${i}" aria-selected="${i === active}" data-i="${i}"><span class="sym">${esc(h.symbol)}</span><span class="nm">${esc(h.name || '')}</span></li>`).join('');
  list.hidden = false; input.setAttribute('aria-expanded', 'true');
  if (active >= 0) input.setAttribute('aria-activedescendant', `opt${active}`); else input.removeAttribute('aria-activedescendant');
}
input.addEventListener('input', () => {
  clearTimeout(sugTimer);
  const v = input.value.trim();
  if (v.length < 2) { sugg = []; closeSuggest(); return; }
  sugTimer = setTimeout(async () => {
    const my = ++sugReq;
    try {
      const safe = v.replace(/[^A-Za-z0-9\-.]/g, '');
      if (!safe) return;
      const j = await getJSON(`https://mygene.info/v3/query?species=${S.species}&fields=symbol,name&size=8&q=${encodeURIComponent(`symbol:${safe}* OR symbol:"${safe}"^5`)}`);
      if (my !== sugReq) return;
      const hits = (j.hits || []).filter((h) => h.symbol);
      hits.sort((a, b) => (b.symbol.toLowerCase() === v.toLowerCase()) - (a.symbol.toLowerCase() === v.toLowerCase()) || a.symbol.length - b.symbol.length);
      sugg = hits; active = -1; drawSuggest();
    } catch { sugg = []; closeSuggest(); }
  }, 180);
});
input.addEventListener('keydown', (e) => {
  if (list.hidden) return;
  if (e.key === 'ArrowDown') { e.preventDefault(); active = (active + 1) % sugg.length; drawSuggest(); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); active = (active - 1 + sugg.length) % sugg.length; drawSuggest(); }
  else if (e.key === 'Escape') closeSuggest();
  else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); pick(sugg[active].symbol); }
});
list.addEventListener('mousedown', (e) => {
  const li = e.target.closest('li'); if (!li) return;
  e.preventDefault(); pick(sugg[+li.dataset.i].symbol);
});
input.addEventListener('blur', () => setTimeout(closeSuggest, 100));
function pick(sym) { input.value = sym; closeSuggest(); loadGene(sym); }

/* ---------- events ---------- */
$('searchForm').addEventListener('submit', (e) => { e.preventDefault(); closeSuggest(); loadGene(input.value); });
$('species').addEventListener('change', (e) => {
  S.species = e.target.value;
  const prev = S.gene ? S.gene.symbol : S.query;
  if (prev) { input.value = prev; loadGene(prev); } else render();
});
$('langSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; S.lang = b.dataset.lang; store.set('gd.lang', S.lang); render(); });
$('modeSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; S.mode = b.dataset.mode; store.set('gd.mode', S.mode); render(); });
$('tries').addEventListener('click', (e) => { const b = e.target.closest('[data-gene]'); if (b) pick(b.dataset.gene); });
function gotoGene(name) { tip.hidden = true; input.value = name; window.scrollTo({ top: 0, behavior: 'smooth' }); loadGene(name); }
$('dossier').addEventListener('click', (e) => {
  const go = e.target.closest('[data-goto]');
  if (go) { e.preventDefault(); gotoGene(go.getAttribute('data-goto')); return; }
  const act = e.target.closest('[data-act]');
  if (act) {
    const a = act.dataset.act;
    if (a === 'expr') { S.exprAll = !S.exprAll; render(); }
    else if (a === 'ai') loadAI(false);
    else if (a === 'ai-redo') loadAI(true);
    else if (a === 'tr') loadTr();
    else if (a === 'tr-toggle' && S.tr) { S.tr.show = !S.tr.show; render(); }
    else if (a === 'cmp-close') { S.cmp = null; render(); }
    else if (a === 'spin' && mol.viewer) { mol.spinning = !mol.spinning; mol.viewer.spin(mol.spinning ? 'y' : false); act.setAttribute('aria-pressed', String(mol.spinning)); }
    else if (a === 'reset' && mol.viewer) { mol.viewer.zoomTo(); mol.viewer.render(); }
    return;
  }
  const b = e.target.closest('[data-retry]'); if (!b) return;
  const a = b.dataset.retry, my = reqId;
  if (a === 'gene') loadGene(S.query);
  else if (a === 'uniprot') loadUniprot(my);
  else if (a === 'ot') loadOT(my);
  else if (a === 'papers') loadPapers(my);
  else if (a === 'gtex') loadGtex(my);
  else if (a === 'string') loadString(my);
  else if (a === 'af') loadAF(my);
  else if (a === 'clin') loadClin(my);
  else if (a === 'cmp' && S.cmp) loadCompare(S.cmp.q);
});
$('cmpForm').addEventListener('submit', (e) => { e.preventDefault(); loadCompare($('cmpQ').value); });
$('expMd').addEventListener('click', () => { if (S.gene) download(`${S.gene.symbol}_dossier_${S.lang}.md`, dossierMarkdown(), 'text/markdown;charset=utf-8'); });
$('expPdf').addEventListener('click', () => window.print());
$('dossier').addEventListener('keydown', (e) => {
  const go = e.target.closest && e.target.closest('[data-goto]');
  if (go && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); gotoGene(go.getAttribute('data-goto')); }
});

/* ---------- boot ---------- */
// Hash format: #TP53 (human) or #mouse:Trp53 / #rat:Tp53
function fromHash() {
  const h = decodeURIComponent(location.hash.slice(1));
  const m = /^(mouse|rat):(.+)$/.exec(h);
  if (m) { S.species = m[1]; return m[2]; }
  if (h) S.species = 'human';
  return h || 'TP53';
}
window.addEventListener('hashchange', () => { const g = fromHash(); input.value = g; loadGene(g); });
const start = fromHash();
input.value = start;
render();
loadGene(start);
})();
