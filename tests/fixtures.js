// Recorded-style answers from the public databases, trimmed to what the page reads.
// `route(url, opts)` stands in for fetch; every request the page makes must match a rule here.

const GENES = {
  TP53: {
    _id: '7157', symbol: 'TP53', name: 'tumor protein p53', entrezgene: '7157', HGNC: '11998',
    ensembl: { gene: 'ENSG00000141510' }, uniprot: { 'Swiss-Prot': 'P04637' },
    genomic_pos: { chr: '17', start: 7661779, end: 7687538, strand: -1, ensemblgene: 'ENSG00000141510' },
    map_location: '17p13.1', type_of_gene: 'protein-coding', alias: ['BCC7', 'LFS1', 'P53'],
    summary: 'This gene encodes a tumor suppressor protein. Mutations are associated with Li-Fraumeni syndrome (PMIDs: 12032546, 20937277).'
  },
  MDM2: {
    _id: '4193', symbol: 'MDM2', name: 'MDM2 proto-oncogene', entrezgene: '4193', HGNC: '6973',
    ensembl: { gene: 'ENSG00000135679' }, uniprot: { 'Swiss-Prot': 'Q00987' },
    genomic_pos: { chr: '12', start: 68808177, end: 68850686, strand: 1, ensemblgene: 'ENSG00000135679' },
    map_location: '12q15', type_of_gene: 'protein-coding', alias: ['HDM2'],
    summary: 'This gene encodes a nuclear-localized E3 ubiquitin ligase.'
  }
};

const UNIPROT = {
  P04637: {
    primaryAccession: 'P04637',
    proteinDescription: { recommendedName: { fullName: { value: 'Cellular tumor antigen p53' } } },
    comments: [
      { commentType: 'FUNCTION', texts: [{ value: 'Multifunctional transcription factor that induces cell cycle arrest, DNA repair or apoptosis (PubMed:11025664, PubMed:12524540). Acts as a tumor suppressor in many tumor types. Negatively regulates cell division. One of the activated genes is an inhibitor of kinases.' }] },
      { commentType: 'SUBCELLULAR LOCATION', subcellularLocations: [{ location: { value: 'Cytoplasm' } }, { location: { value: 'Nucleus' } }] }
    ],
    sequence: { length: 393, molWeight: 43653 }, features: []
  },
  Q00987: {
    primaryAccession: 'Q00987',
    proteinDescription: { recommendedName: { fullName: { value: 'E3 ubiquitin-protein ligase Mdm2' } } },
    comments: [
      { commentType: 'FUNCTION', texts: [{ value: 'E3 ubiquitin-protein ligase that mediates ubiquitination of p53/TP53.' }] },
      { commentType: 'SUBCELLULAR LOCATION', subcellularLocations: [{ location: { value: 'Nucleus' } }] }
    ],
    sequence: { length: 491, molWeight: 55233 }, features: []
  }
};

const DISEASES = {
  ENSG00000141510: [['MONDO_0018875', 'Li-Fraumeni syndrome', 0.876], ['MONDO_0007256', 'hepatocellular carcinoma', 0.797], ['MONDO_0005575', 'colorectal cancer', 0.75]],
  ENSG00000135679: [['MONDO_0018875', 'Li-Fraumeni syndrome', 0.61], ['MONDO_0000001', 'sarcoma', 0.55]]
};

const TISSUES = {
  ENSG00000141510: [['Cells_EBV-transformed_lymphocytes', 72.9], ['Skin_Sun_Exposed_Lower_leg', 37.0], ['Lung', 18.2], ['Brain_Cortex', 5.1]],
  ENSG00000135679: [['Cells_Cultured_fibroblasts', 32.0], ['Lung', 18.0]]
};

const edge = (a, b, score) => ({ preferredName_A: a, preferredName_B: b, score });
const NETWORK = {
  TP53: [edge('TP53', 'MDM2', 0.999), edge('TP53', 'SIRT1', 0.99), edge('TP53', 'EP300', 0.98), edge('MDM2', 'EP300', 0.9)],
  MDM2: [edge('MDM2', 'TP53', 0.999), edge('MDM2', 'EP300', 0.97), edge('MDM2', 'UBE2D1', 0.95)]
};

const CLINVAR_COUNTS = {
  TP53: { total: 3930, p: 977, lp: 422, vus: 948, lb: 1050, b: 386 },
  MDM2: { total: 176, p: 0, lp: 1, vus: 120, lb: 30, b: 5 }
};
// Out of numeric order on purpose: the page must sort by review stars, keeping id order for ties.
const CLINVAR_RECORDS = {
  7108: { title: 'NM_000546.6(TP53):c.524G>A (p.Arg175His)', review_status: 'reviewed by expert panel' },
  7109: { title: 'NM_000546.6(TP53):c.743G>A (p.Arg248Gln)', review_status: 'practice guideline' },
  7110: { title: 'NM_000546.6(TP53):c.818G>A (p.Arg273His)', review_status: 'criteria provided, single submitter' }
};

const PAPERS = [
  { id: '1', source: 'MED', pmid: '42866107', title: 'p53 in <i>cancer</i> evolution', authorString: 'Ivanova A, Smith B', journalTitle: 'Nat Rev Cancer', firstPublicationDate: '2026-09-28', pubType: 'review; journal article', isOpenAccess: 'Y', citedByCount: 3 },
  { id: '2', source: 'MED', pmid: '42857877', title: 'A TP53 variant study', authorString: 'Lee C', journalTitle: 'Genome Med', firstPublicationDate: '2026-09-20', pubType: 'journal article', isOpenAccess: 'N', citedByCount: 0 }
];

const ok = (data) => ({ ok: true, status: 200, json: async () => data, text: async () => (typeof data === 'string' ? data : JSON.stringify(data)) });
const notFound = () => ({ ok: false, status: 404, json: async () => ({}), text: async () => '' });

function clinvarSearch(term, retmax) {
  const sym = term.split('[gene]')[0];
  const c = CLINVAR_COUNTS[sym] || { total: 0, p: 0, lp: 0, vus: 0, lb: 0, b: 0 };
  const res = (count, idlist = []) => ok({ esearchresult: { count: String(count), idlist: idlist.slice(0, retmax) } });
  if (term.includes('[rvst]')) return res(3, sym === 'TP53' ? ['7110', '7108', '7109'] : []);
  if (term.includes('"clinsig likely pathogenic"')) return res(c.lp);
  if (term.includes('"clinsig pathogenic"')) return res(c.p, sym === 'TP53' ? ['9001', '9002'] : []);
  if (term.includes('"clinsig vus"')) return res(c.vus);
  if (term.includes('"clinsig likely benign"')) return res(c.lb);
  if (term.includes('"clinsig benign"')) return res(c.b);
  return res(c.total);
}

function clinvarSummary(ids) {
  const result = { uids: ids };
  ids.forEach((id) => {
    const r = CLINVAR_RECORDS[id] || { title: `Variant ${id}`, review_status: 'criteria provided, single submitter' };
    result[id] = {
      uid: id, title: r.title, obj_type: 'single nucleotide variant',
      germline_classification: { review_status: r.review_status, trait_set: [{ trait_name: 'Li-Fraumeni syndrome' }, { trait_name: 'not provided' }] }
    };
  });
  return ok({ result });
}

// Every request the page sends is recorded here for assertions.
function makeRouter() {
  const log = [];
  const route = async (input, opts = {}) => {
    const url = new URL(String(input), 'https://gene-dossier.test/');
    log.push({ url: url.href, body: opts.body, at: Date.now() });
    const q = url.searchParams;
    switch (url.hostname) {
      case 'mygene.info': {
        const term = q.get('q') || '';
        const sym = (term.match(/^symbol:"([^"]+)"$/) || [])[1];
        const hit = sym && GENES[sym.toUpperCase()];
        return ok({ hits: hit ? [hit] : [] });
      }
      case 'rest.uniprot.org': {
        const acc = ((q.get('query') || '').match(/^accession:(\w+)/) || [])[1];
        return ok({ results: UNIPROT[acc] ? [UNIPROT[acc]] : [] });
      }
      case 'api.platform.opentargets.org': {
        const id = JSON.parse(opts.body).variables.id;
        const rows = (DISEASES[id] || []).map(([did, name, score]) => ({ score, disease: { id: did, name } }));
        return ok({ data: { target: { approvedSymbol: '', associatedDiseases: { count: rows.length * 100, rows } } } });
      }
      case 'gtexportal.org': {
        if (url.pathname.endsWith('/reference/gene')) {
          const g = GENES[(q.get('geneId') || '').toUpperCase()];
          return ok({ data: g ? [{ gencodeId: `${g.ensembl.gene}.16` }] : [] });
        }
        const ens = (q.get('gencodeId') || '').split('.')[0];
        return ok({ data: (TISSUES[ens] || []).map(([tissueSiteDetailId, median]) => ({ tissueSiteDetailId, median })) });
      }
      case 'string-db.org':
        return NETWORK[q.get('identifiers')] ? ok(NETWORK[q.get('identifiers')]) : notFound();
      case 'alphafold.ebi.ac.uk': {
        if (url.pathname.endsWith('.pdb')) return ok('ATOM      1  N   MET A   1');
        const acc = url.pathname.split('/').pop();
        if (!UNIPROT[acc]) return notFound();
        return ok([{
          uniprotAccession: acc, modelEntityId: `AF-${acc}-F1`, pdbUrl: `https://alphafold.ebi.ac.uk/files/AF-${acc}-F1-model_v6.pdb`,
          globalMetricValue: acc === 'P04637' ? 75.06 : 62.6,
          fractionPlddtVeryHigh: 0.527, fractionPlddtConfident: 0.071, fractionPlddtLow: 0.104, fractionPlddtVeryLow: 0.298
        }]);
      }
      case 'eutils.ncbi.nlm.nih.gov':
        if (url.pathname.endsWith('esearch.fcgi')) return clinvarSearch(q.get('term') || '', +q.get('retmax'));
        return clinvarSummary((q.get('id') || '').split(','));
      case 'www.ebi.ac.uk':
        return ok({ hitCount: 33966, resultList: { result: PAPERS } });
      case 'gene-dossier.test':
        if (url.pathname === '/api/ai') {
          const body = JSON.parse(opts.body);
          if (body.task === 'summary') {
            return ok({ overview: `${body.gene.symbol} summary in ${body.lang}`, points: ['p1', 'p2', 'p3'], news: 'recent work', model: 'Gemini 3.5 Flash Lite' });
          }
          return ok({ t: body.texts.map((s) => `[${body.lang}] ${s}`), model: 'Gemini 3.5 Flash Lite' });
        }
        return notFound();
      default:
        throw new Error(`Unexpected request: ${url.href}`);
    }
  };
  return { route, log };
}

module.exports = { makeRouter, CLINVAR_COUNTS };
