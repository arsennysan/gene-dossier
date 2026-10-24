// Interface strings in Kazakh, Russian and English.
/* ---------- i18n ---------- */
const T = {
  ru: {
    tagline: 'Всё о гене на одной странице',
    searchPh: 'Символ гена: TP53, BRCA1, CFTR…', search: 'Найти', try: 'Попробуйте:',
    sp: { human: 'Человек', mouse: 'Мышь', rat: 'Крыса' },
    mode: { expert: 'Эксперт', student: 'Студент' },
    dataNote: 'Интерфейс переведён, а тексты из научных баз приводятся на английском, как в оригинале.',
    overview: 'Обзор гена', fn: 'Функция белка', summary: 'Описание NCBI (RefSeq)', diseases: 'Связь с болезнями', papers: 'Свежие статьи',
    chr: 'Хромосома', band: 'Цитополоса', coords: 'Координаты', type: 'Тип', aliases: 'Синонимы', ids: 'Базы данных', more: 'Где почитать ещё',
    protein: 'Белок', length: 'Длина', aa: 'а.к.', mass: 'Масса', kda: 'кДа', loc: 'Где находится в клетке', domains: 'Домены',
    total: 'Всего ассоциаций: {n}', openOT: 'Все в Open Targets →', papersTotal: 'Найдено статей: {n}', openEPMC: 'Все в Europe PMC →',
    cited: 'цитирований: {n}', oa: 'Открытый доступ', review: 'Обзор',
    loading: 'Загрузка…', error: 'Не удалось загрузить данные из {src}. Проверьте интернет и попробуйте снова.', retry: 'Повторить',
    notFound: 'Ген «{q}» не найден среди генов вида «{sp}». Проверьте написание символа.',
    none: 'Нет данных', humanOnly: 'Данные о болезнях из Open Targets есть только для генов человека. Переключите вид на «Человек».',
    noProtein: 'Этот ген не кодирует белок, или белок не описан в проверенной части UniProt (Swiss-Prot).',
    plain: 'Простыми словами', source: 'Источник',
    mb: 'млн п.н.', kb: 'тыс. п.н.',
    foot: 'Данные: MyGene.info (NCBI, Ensembl), UniProt, Open Targets, Europe PMC. Учебный и исследовательский инструмент, не для клинических решений.',
    pArm: 'p (короткое плечо)', qArm: 'q (длинное плечо)', cen: 'центромера',
    gt: { 'protein-coding': 'белок-кодирующий', ncRNA: 'некодирующая РНК', pseudo: 'псевдоген', snoRNA: 'snoRNA', snRNA: 'snRNA', rRNA: 'рРНК', tRNA: 'тРНК', miscRNA: 'другая РНК', other: 'другой', unknown: 'неизвестно' },
    x: {
      italic: (s) => `Символ гена пишут курсивом: <i>${s}</i> означает ген (участок ДНК), а ${s.toUpperCase()} прямым шрифтом — белок, который по нему собирается.`,
      locus: (chr, arm, r, b, sub, band) => `Ген лежит на хромосоме ${chr}. Запись <span class="mono">${band}</span> читается так: ${arm === 'p' ? 'короткое плечо (p)' : 'длинное плечо (q)'}${r ? `, район ${r}` : ''}${b ? `, полоса ${b}` : ''}${sub ? `, подполоса ${sub}` : ''}. Номера растут от центромеры к концу хромосомы.`,
      size: (pos, len) => `Ген начинается примерно в ${pos} млн «букв» (пар нуклеотидов) от начала хромосомы и занимает около ${len} тыс. пар.`,
      type: { 'protein-coding': 'Ген кодирует белок: клетка «читает» его инструкцию и собирает по ней молекулу белка.', ncRNA: 'Ген не кодирует белок. С него считывается РНК, которая сама выполняет работу в клетке.', pseudo: 'Это псевдоген — копия гена, которая за время эволюции «сломалась» и обычно не даёт работающего белка.', other: 'Это ген особого типа: с него считывается РНК, а не белок.' },
      protein: (len, kda) => `Белок — это цепочка из ${len} аминокислот, его масса около ${kda} кДа. Для сравнения: в гормоне инсулине всего 51 аминокислота.`,
      loc: 'Здесь белок работает. Место подсказывает функцию: белки ядра часто управляют генами, мембранные — передают сигналы и переносят вещества, митохондриальные — участвуют в получении энергии.',
      dis: 'Оценка от 0 до 1 показывает, насколько сильны доказательства связи гена с болезнью: генетические исследования, литература, лекарства. Это не вероятность заболеть.',
      papers: 'Статьи отсортированы по дате, сверху самые новые. Если тема новая, начните со статей с меткой «Обзор»: в них собраны итоги многих работ.'
    }
  },
  en: {
    tagline: 'Everything about a gene on one page',
    searchPh: 'Gene symbol: TP53, BRCA1, CFTR…', search: 'Search', try: 'Try:',
    sp: { human: 'Human', mouse: 'Mouse', rat: 'Rat' },
    mode: { expert: 'Expert', student: 'Student' },
    dataNote: 'Texts from scientific databases are shown in their original English.',
    overview: 'Gene overview', fn: 'Protein function', summary: 'NCBI summary (RefSeq)', diseases: 'Disease associations', papers: 'Recent papers',
    chr: 'Chromosome', band: 'Cytoband', coords: 'Coordinates', type: 'Type', aliases: 'Aliases', ids: 'Databases', more: 'Read more',
    protein: 'Protein', length: 'Length', aa: 'aa', mass: 'Mass', kda: 'kDa', loc: 'Subcellular location', domains: 'Domains',
    total: '{n} associations in total', openOT: 'All in Open Targets →', papersTotal: '{n} papers found', openEPMC: 'All in Europe PMC →',
    cited: 'cited {n}×', oa: 'Open access', review: 'Review',
    loading: 'Loading…', error: 'Couldn’t load data from {src}. Check your connection and try again.', retry: 'Retry',
    notFound: 'No {sp} gene matches “{q}”. Check the symbol spelling.',
    none: 'No data', humanOnly: 'Open Targets disease data covers human genes only. Switch the species to Human.',
    noProtein: 'This gene doesn’t code for a protein, or its protein isn’t in the reviewed part of UniProt (Swiss-Prot).',
    plain: 'In plain words', source: 'Source',
    mb: 'Mb', kb: 'kb',
    foot: 'Data: MyGene.info (NCBI, Ensembl), UniProt, Open Targets, Europe PMC. For learning and research, not for clinical decisions.',
    pArm: 'p (short arm)', qArm: 'q (long arm)', cen: 'centromere',
    gt: { 'protein-coding': 'protein-coding', ncRNA: 'non-coding RNA', pseudo: 'pseudogene', snoRNA: 'snoRNA', snRNA: 'snRNA', rRNA: 'rRNA', tRNA: 'tRNA', miscRNA: 'misc RNA', other: 'other', unknown: 'unknown' },
    x: {
      italic: (s) => `Gene symbols are written in italics: <i>${s}</i> is the gene (a stretch of DNA), while upright ${s.toUpperCase()} is the protein made from it.`,
      locus: (chr, arm, r, b, sub, band) => `The gene sits on chromosome ${chr}. Read <span class="mono">${band}</span> as: ${arm === 'p' ? 'short arm (p)' : 'long arm (q)'}${r ? `, region ${r}` : ''}${b ? `, band ${b}` : ''}${sub ? `, sub-band ${sub}` : ''}. Numbers grow from the centromere toward the chromosome’s end.`,
      size: (pos, len) => `It starts about ${pos} million DNA “letters” (base pairs) from the start of the chromosome and spans roughly ${len} thousand base pairs.`,
      type: { 'protein-coding': 'This gene codes for a protein: the cell reads its instructions and builds a protein molecule from them.', ncRNA: 'This gene doesn’t code for a protein. It is copied into an RNA that does the job itself.', pseudo: 'This is a pseudogene: a copy of a gene that broke during evolution and usually makes no working protein.', other: 'This is a special type of gene: it is read into RNA rather than protein.' },
      protein: (len, kda) => `The protein is a chain of ${len} amino acids weighing about ${kda} kDa. For comparison, the hormone insulin has only 51 amino acids.`,
      loc: 'This is where the protein works. Location hints at function: nuclear proteins often control genes, membrane proteins pass signals and move molecules, mitochondrial ones help make energy.',
      dis: 'The 0–1 score shows how strong the evidence linking the gene to the disease is: genetic studies, literature, drugs. It is not the chance of getting sick.',
      papers: 'Papers are sorted by date, newest first. If the topic is new to you, start with those marked “Review”: they sum up many studies.'
    }
  },
  kk: {
    tagline: 'Ген туралы бәрі бір бетте',
    searchPh: 'Ген символы: TP53, BRCA1, CFTR…', search: 'Іздеу', try: 'Байқап көріңіз:',
    sp: { human: 'Адам', mouse: 'Тышқан', rat: 'Егеуқұйрық' },
    mode: { expert: 'Маман', student: 'Студент' },
    dataNote: 'Интерфейс аударылған, ал ғылыми дерекқорлардағы мәтіндер түпнұсқадағыдай ағылшын тілінде беріледі.',
    overview: 'Ген шолуы', fn: 'Ақуыздың қызметі', summary: 'NCBI сипаттамасы (RefSeq)', diseases: 'Аурулармен байланысы', papers: 'Жаңа мақалалар',
    chr: 'Хромосома', band: 'Цитожолақ', coords: 'Координаттар', type: 'Түрі', aliases: 'Синонимдер', ids: 'Дерекқорлар', more: 'Толығырақ оқу',
    protein: 'Ақуыз', length: 'Ұзындығы', aa: 'а.қ.', mass: 'Массасы', kda: 'кДа', loc: 'Жасушадағы орны', domains: 'Домендер',
    total: 'Барлық байланыс: {n}', openOT: 'Барлығы Open Targets-те →', papersTotal: 'Табылған мақалалар: {n}', openEPMC: 'Барлығы Europe PMC-де →',
    cited: 'дәйексөз: {n}', oa: 'Ашық қолжетімді', review: 'Шолу',
    loading: 'Жүктелуде…', error: '{src} дерекқорынан деректер жүктелмеді. Интернетті тексеріп, қайталап көріңіз.', retry: 'Қайталау',
    notFound: '«{sp}» түрінің гендері арасында «{q}» табылмады. Символдың жазылуын тексеріңіз.',
    none: 'Деректер жоқ', humanOnly: 'Open Targets аурулар туралы деректері тек адам гендері үшін бар. Түрді «Адам» деп ауыстырыңыз.',
    noProtein: 'Бұл ген ақуызды кодтамайды немесе оның ақуызы UniProt-тың тексерілген бөлігінде (Swiss-Prot) сипатталмаған.',
    plain: 'Қарапайым тілмен', source: 'Дереккөз',
    mb: 'млн ж.н.', kb: 'мың ж.н.',
    foot: 'Деректер: MyGene.info (NCBI, Ensembl), UniProt, Open Targets, Europe PMC. Оқу және зерттеу құралы, клиникалық шешімдерге арналмаған.',
    pArm: 'p (қысқа иін)', qArm: 'q (ұзын иін)', cen: 'центромера',
    gt: { 'protein-coding': 'ақуыз кодтайтын', ncRNA: 'кодтамайтын РНҚ', pseudo: 'псевдоген', snoRNA: 'snoRNA', snRNA: 'snRNA', rRNA: 'рРНҚ', tRNA: 'тРНҚ', miscRNA: 'басқа РНҚ', other: 'басқа', unknown: 'белгісіз' },
    x: {
      italic: (s) => `Ген символы курсивпен жазылады: <i>${s}</i> — ген (ДНҚ бөлігі), ал тік қаріппен жазылған ${s.toUpperCase()} — сол бойынша құрастырылатын ақуыз.`,
      locus: (chr, arm, r, b, sub, band) => `Ген ${chr}-хромосомада орналасқан. <span class="mono">${band}</span> жазбасы былай оқылады: ${arm === 'p' ? 'қысқа иін (p)' : 'ұзын иін (q)'}${r ? `, ${r}-аймақ` : ''}${b ? `, ${b}-жолақ` : ''}${sub ? `, ${sub}-қосалқы жолақ` : ''}. Нөмірлер центромерадан хромосоманың ұшына қарай өседі.`,
      size: (pos, len) => `Ген хромосоманың басынан шамамен ${pos} млн «әріп» (жұп нуклеотид) қашықтықта басталады және шамамен ${len} мың жұпты алып жатыр.`,
      type: { 'protein-coding': 'Бұл ген ақуызды кодтайды: жасуша оның «нұсқаулығын» оқып, сол бойынша ақуыз молекуласын құрастырады.', ncRNA: 'Бұл ген ақуызды кодтамайды. Одан РНҚ оқылады, ол жасушада жұмысты өзі атқарады.', pseudo: 'Бұл псевдоген — эволюция барысында «бұзылған» ген көшірмесі, әдетте жұмыс істейтін ақуыз бермейді.', other: 'Бұл ерекше түрдегі ген: одан ақуыз емес, РНҚ оқылады.' },
      protein: (len, kda) => `Ақуыз — ${len} амин қышқылынан тұратын тізбек, массасы шамамен ${kda} кДа. Салыстыру үшін: инсулин гормонында небәрі 51 амин қышқылы бар.`,
      loc: 'Ақуыз осы жерде жұмыс істейді. Орны қызметін аңғартады: ядро ақуыздары көбіне гендерді басқарады, мембрана ақуыздары сигнал береді және заттарды тасымалдайды, митохондрия ақуыздары энергия алуға қатысады.',
      dis: '0-ден 1-ге дейінгі баға геннің аурумен байланысы туралы дәлелдердің қаншалықты күшті екенін көрсетеді: генетикалық зерттеулер, әдебиет, дәрілер. Бұл ауыру ықтималдығы емес.',
      papers: 'Мақалалар күні бойынша сұрыпталған, ең жаңасы жоғарыда. Тақырып сізге жаңа болса, «Шолу» белгісі бар мақалалардан бастаңыз: оларда көптеген жұмыстың қорытындысы жиналған.'
    }
  }
};

/* Stage 2 strings: expression, network, structure, ClinVar. Merged into T below. */
const T2 = {
  ru: {
    expr: 'Экспрессия по тканям (GTEx)', exprUnit: 'медиана, TPM', showAll: 'Показать все ({n})', showLess: 'Свернуть',
    exprHuman: 'Данные GTEx есть только для тканей человека.',
    net: 'Сеть взаимодействий (STRING)', netHint: 'Нажмите на белок, чтобы открыть его досье.', openSTRING: 'Открыть в STRING →', score: 'уверенность',
    struct: '3D-структура (AlphaFold)', plddt: 'Уверенность модели (pLDDT)', bands: ['очень высокая >90', 'высокая 70–90', 'низкая 50–70', 'очень низкая <50'],
    meanPlddt: 'средний pLDDT: {n}', reset: 'Сбросить вид', spin: 'Вращение', noStruct: 'Для этого белка нет модели AlphaFold.', openAF: 'Открыть в AlphaFold DB →',
    molLoading: 'Загружаю модель…', molFail: 'Не удалось показать 3D-модель в этом браузере.',
    clin: 'Клинические варианты (ClinVar)', clinTotal: 'Всего вариантов в гене: {n}', topPath: 'Патогенные варианты с лучшей проверкой', openClin: 'Все в ClinVar →',
    clinHuman: 'ClinVar содержит только варианты человека.', cls: { p: 'Патогенный', lp: 'Вероятно патогенный', vus: 'Неясного значения', lb: 'Вероятно доброкачественный', b: 'Доброкачественный' },
    x2: {
      expr: 'TPM показывает, сколько копий РНК этого гена приходится на миллион всех молекул РНК в ткани. Чем длиннее полоса, тем активнее ген работает в этой ткани.',
      net: 'Белки редко работают поодиночке. Линии соединяют белок с партнёрами, с которыми он взаимодействует или участвует в одном процессе. Чем толще линия, тем надёжнее подтверждена связь.',
      struct: 'Это трёхмерная модель белка, которую предсказала нейросеть AlphaFold. Синие участки модель знает уверенно, жёлтые и оранжевые — гибкие или неупорядоченные. Модель можно вращать мышью или пальцем.',
      clin: 'Вариант — это отличие в ДНК от эталонной последовательности. Патогенные варианты вызывают болезнь, доброкачественные безвредны, а для вариантов неясного значения пока не хватает данных. Звёзды показывают, насколько тщательно вывод проверен: от 0 до 4.'
    }
  },
  en: {
    expr: 'Tissue expression (GTEx)', exprUnit: 'median, TPM', showAll: 'Show all ({n})', showLess: 'Show fewer',
    exprHuman: 'GTEx data covers human tissues only.',
    net: 'Interaction network (STRING)', netHint: 'Click a protein to open its dossier.', openSTRING: 'Open in STRING →', score: 'confidence',
    struct: '3D structure (AlphaFold)', plddt: 'Model confidence (pLDDT)', bands: ['Very high >90', 'Confident 70–90', 'Low 50–70', 'Very low <50'],
    meanPlddt: 'mean pLDDT: {n}', reset: 'Reset view', spin: 'Spin', noStruct: 'There is no AlphaFold model for this protein.', openAF: 'Open in AlphaFold DB →',
    molLoading: 'Loading model…', molFail: 'Couldn’t show the 3D model in this browser.',
    clin: 'Clinical variants (ClinVar)', clinTotal: '{n} variants in the gene', topPath: 'Best-reviewed pathogenic variants', openClin: 'All in ClinVar →',
    clinHuman: 'ClinVar covers human variants only.', cls: { p: 'Pathogenic', lp: 'Likely pathogenic', vus: 'Uncertain significance', lb: 'Likely benign', b: 'Benign' },
    x2: {
      expr: 'TPM is how many RNA copies of this gene there are per million RNA molecules in the tissue. A longer bar means the gene is more active there.',
      net: 'Proteins rarely work alone. Lines connect the protein to partners it binds or shares a process with. A thicker line means stronger evidence for the link.',
      struct: 'This is a 3D model of the protein predicted by the AlphaFold neural network. Blue parts are predicted with confidence; yellow and orange parts are flexible or disordered. Drag with a mouse or finger to rotate it.',
      clin: 'A variant is a difference in DNA from the reference sequence. Pathogenic variants cause disease, benign ones are harmless, and variants of uncertain significance still lack evidence. Stars show how thoroughly the call was reviewed, from 0 to 4.'
    }
  },
  kk: {
    expr: 'Тіндердегі экспрессия (GTEx)', exprUnit: 'медиана, TPM', showAll: 'Барлығын көрсету ({n})', showLess: 'Жасыру',
    exprHuman: 'GTEx деректері тек адам тіндері үшін бар.',
    net: 'Өзара әрекеттесу желісі (STRING)', netHint: 'Ақуыздың досьесін ашу үшін оны басыңыз.', openSTRING: 'STRING-те ашу →', score: 'сенімділік',
    struct: '3D құрылымы (AlphaFold)', plddt: 'Модель сенімділігі (pLDDT)', bands: ['өте жоғары >90', 'жоғары 70–90', 'төмен 50–70', 'өте төмен <50'],
    meanPlddt: 'орташа pLDDT: {n}', reset: 'Көріністі қалпына келтіру', spin: 'Айналдыру', noStruct: 'Бұл ақуыз үшін AlphaFold моделі жоқ.', openAF: 'AlphaFold DB-де ашу →',
    molLoading: 'Модель жүктелуде…', molFail: 'Бұл браузерде 3D моделін көрсету мүмкін болмады.',
    clin: 'Клиникалық нұсқалар (ClinVar)', clinTotal: 'Гендегі барлық нұсқалар: {n}', topPath: 'Ең жақсы тексерілген патогенді нұсқалар', openClin: 'Барлығы ClinVar-да →',
    clinHuman: 'ClinVar тек адам нұсқаларын қамтиды.', cls: { p: 'Патогенді', lp: 'Патогенді болуы ықтимал', vus: 'Маңызы белгісіз', lb: 'Қатерсіз болуы ықтимал', b: 'Қатерсіз' },
    x2: {
      expr: 'TPM тіндегі миллион РНҚ молекуласына осы геннің қанша РНҚ көшірмесі келетінін көрсетеді. Жолақ неғұрлым ұзын болса, ген сол тінде соғұрлым белсенді жұмыс істейді.',
      net: 'Ақуыздар сирек жалғыз жұмыс істейді. Сызықтар ақуызды онымен әрекеттесетін немесе бір процеске қатысатын серіктестерімен байланыстырады. Сызық неғұрлым жуан болса, байланыс соғұрлым сенімді расталған.',
      struct: 'Бұл AlphaFold нейрожелісі болжаған ақуыздың үш өлшемді моделі. Көк бөліктерді модель сенімді біледі, сары және қызғылт сары бөліктер — иілгіш немесе реттелмеген. Модельді тінтуірмен немесе саусақпен айналдыруға болады.',
      clin: 'Нұсқа — ДНҚ-ның эталондық тізбектен айырмашылығы. Патогенді нұсқалар ауру тудырады, қатерсіздері зиянсыз, ал маңызы белгісіз нұсқалар туралы деректер әзірге жеткіліксіз. Жұлдыздар қорытындының қаншалықты мұқият тексерілгенін көрсетеді: 0-ден 4-ке дейін.'
    }
  }
};
/* Stage 3 strings: AI summary, translation, comparison, export. */
const T3 = {
  ru: {
    ai: 'ИИ-резюме', aiIntro: 'ИИ коротко перескажет данные этой страницы на выбранном языке.', aiGo: 'Написать резюме', aiWait: 'Жду загрузки данных…',
    aiLoading: 'ИИ пишет резюме…', aiNews: 'Что изучают сейчас', aiRedo: 'Написать заново',
    aiNote: 'Текст написал ИИ по данным с этой страницы. Он может ошибаться, поэтому сверяйтесь с источниками.',
    aiErr: { rate: 'Слишком много запросов. Подождите несколько минут и попробуйте снова.', default: 'ИИ-сервис сейчас недоступен. Попробуйте позже.' },
    trGo: 'Перевести на русский', trOrig: 'Показать оригинал', trShow: 'Показать перевод', trLoading: 'Перевожу…', trNote: 'Перевод сделал ИИ.', trErr: 'Не удалось перевести. Попробуйте позже.',
    cmp: 'Сравнение', cmpWith: 'Сравнить с геном, например MDM2', cmpGo: 'Сравнить', cmpClose: 'Закрыть', cmpTitle: 'Сравнение: {a} и {b}', cmpName: 'Полное название',
    plddtShort: 'Средний pLDDT', partners: 'Партнёров в сети', shared: 'Общие партнёры', noShared: 'Общих партнёров среди главных связей нет.',
    direct: 'Прямая связь в STRING: уверенность {s}', noDirect: 'Прямой связи в STRING нет.', commonDis: 'Общие болезни выделены цветом.', openB: 'Открыть досье {b} →',
    cmpSame: 'Это тот же ген. Введите другой символ.', cmpNotFound: 'Ген «{q}» не найден среди генов вида «{sp}».',
    expMd: 'Скачать .md', expPdf: 'Печать / PDF', exported: 'Сформировано в Gene Dossier',
    x3: { cmp: 'Сравнение показывает, что у двух генов общего: болезни, ткани и белки-партнёры. Общие партнёры часто означают, что белки работают в одном процессе.' }
  },
  en: {
    ai: 'AI summary', aiIntro: 'AI will briefly retell the data on this page in the selected language.', aiGo: 'Write summary', aiWait: 'Waiting for data…',
    aiLoading: 'AI is writing…', aiNews: 'What researchers study now', aiRedo: 'Rewrite',
    aiNote: 'Written by AI from the data on this page. It can make mistakes, so check against the sources.',
    aiErr: { rate: 'Too many requests. Wait a few minutes and try again.', default: 'The AI service is unavailable right now. Try again later.' },
    trGo: 'Translate', trOrig: 'Show original', trShow: 'Show translation', trLoading: 'Translating…', trNote: 'Translated by AI.', trErr: 'Translation failed. Try again later.',
    cmp: 'Comparison', cmpWith: 'Compare with a gene, e.g. MDM2', cmpGo: 'Compare', cmpClose: 'Close', cmpTitle: 'Comparison: {a} and {b}', cmpName: 'Full name',
    plddtShort: 'Mean pLDDT', partners: 'Network partners', shared: 'Shared partners', noShared: 'No shared partners among the top links.',
    direct: 'Direct STRING link: confidence {s}', noDirect: 'No direct STRING link.', commonDis: 'Shared diseases are highlighted.', openB: 'Open {b} dossier →',
    cmpSame: 'That is the same gene. Enter another symbol.', cmpNotFound: 'No {sp} gene matches “{q}”.',
    expMd: 'Download .md', expPdf: 'Print / PDF', exported: 'Generated with Gene Dossier',
    x3: { cmp: 'The comparison shows what two genes share: diseases, tissues and protein partners. Shared partners often mean the proteins work in the same process.' }
  },
  kk: {
    ai: 'ЖИ-түйіндеме', aiIntro: 'ЖИ осы беттегі деректерді таңдалған тілде қысқаша баяндайды.', aiGo: 'Түйіндеме жазу', aiWait: 'Деректердің жүктелуін күтудемін…',
    aiLoading: 'ЖИ түйіндеме жазуда…', aiNews: 'Қазір не зерттелуде', aiRedo: 'Қайта жазу',
    aiNote: 'Мәтінді осы беттегі деректер бойынша ЖИ жазды. Ол қателесуі мүмкін, сондықтан дереккөздермен салыстырыңыз.',
    aiErr: { rate: 'Сұраулар тым көп. Бірнеше минут күтіп, қайталап көріңіз.', default: 'ЖИ қызметі қазір қолжетімсіз. Кейінірек қайталап көріңіз.' },
    trGo: 'Қазақ тіліне аудару', trOrig: 'Түпнұсқаны көрсету', trShow: 'Аударманы көрсету', trLoading: 'Аударылуда…', trNote: 'Аударманы ЖИ жасады.', trErr: 'Аудару мүмкін болмады. Кейінірек қайталап көріңіз.',
    cmp: 'Салыстыру', cmpWith: 'Генмен салыстыру, мысалы MDM2', cmpGo: 'Салыстыру', cmpClose: 'Жабу', cmpTitle: 'Салыстыру: {a} және {b}', cmpName: 'Толық атауы',
    plddtShort: 'Орташа pLDDT', partners: 'Желідегі серіктестер', shared: 'Ортақ серіктестер', noShared: 'Негізгі байланыстар арасында ортақ серіктестер жоқ.',
    direct: 'STRING-тегі тікелей байланыс: сенімділік {s}', noDirect: 'STRING-те тікелей байланыс жоқ.', commonDis: 'Ортақ аурулар түспен белгіленген.', openB: '{b} досьесін ашу →',
    cmpSame: 'Бұл сол ген. Басқа символ енгізіңіз.', cmpNotFound: '«{sp}» түрінің гендері арасында «{q}» табылмады.',
    expMd: '.md жүктеу', expPdf: 'Басып шығару / PDF', exported: 'Gene Dossier арқылы жасалды',
    x3: { cmp: 'Салыстыру екі геннің ортақ белгілерін көрсетеді: аурулар, тіндер және ақуыз серіктестері. Ортақ серіктестер көбіне ақуыздардың бір процесте жұмыс істейтінін білдіреді.' }
  }
};
for (const k of Object.keys(T2)) { const { x2, ...rest } = T2[k]; Object.assign(T[k], rest); Object.assign(T[k].x, x2); }
for (const k of Object.keys(T3)) { const { x3, ...rest } = T3[k]; Object.assign(T[k], rest); Object.assign(T[k].x, x3); }

