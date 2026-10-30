/**
 * Central Oficial de Modelos de Documentos Escolares - Classium
 * Biblioteca expandida de modelos prontos, personalizáveis e profissionais.
 */

export interface DynamicField {
  key: string;
  label: string;
  placeholder: string;
  defaultValue?: string;
  type?: 'text' | 'date' | 'time' | 'textarea';
}

export interface SchoolTemplate {
  id: string;
  category: string;
  title: string;
  description: string;
  subject: string;
  greeting: string;
  intro: string;
  development: string;
  guidelines: string;
  observations: string;
  closing: string;
  signatureRole: string;
  signatureName: string;
  type: string;
  actions: string[] | Record<string, any>;
  requiresSignature?: boolean;
  dynamicFields?: DynamicField[];
  themeAccent?: string;
  themeIcon?: string;
}

export interface TemplateMeta {
  id: string;
  category: string;
  title: string;
  description: string;
  type: string;
  actions: string[] | Record<string, any>;
  requiresSignature?: boolean;
  dynamicFields?: DynamicField[];
  themeAccent?: string;
  themeIcon?: string;
  customContent?: Partial<SchoolTemplate>;
}

export const templateMetadata: TemplateMeta[] = [
  // ==========================================
  // 1. CONVITES PARA EVENTOS (NOVA EXPANSÃO MASTER)
  // ==========================================
  {
    id: 'conv-festa-junina',
    category: 'Convites para Eventos',
    title: 'Festa Junina e Arraiá Escolar',
    description: 'Convite festivo e formal para a tradicional Festa Junina com horários, atrações e convites.',
    type: 'Convite',
    actions: ['Confirmar presença'],
    requiresSignature: false,
    themeAccent: 'amber',
    themeIcon: 'Sparkles',
    dynamicFields: [
      { key: 'DATA_EVENTO', label: 'Data da Festa', placeholder: '14 de Junho de 2026', defaultValue: '14/06/2026', type: 'text' },
      { key: 'HORARIO', label: 'Horário de Início', placeholder: '14:00 às 19:00', defaultValue: '14:00', type: 'text' },
      { key: 'LOCAL_EVENTO', label: 'Local / Pátio', placeholder: 'Pátio Principal e Quadra Poliesportiva', defaultValue: 'Quadra Poliesportiva da Escola', type: 'text' },
      { key: 'ATRACOES', label: 'Principais Atrações', placeholder: 'Quadrilhas temáticas, barracas típicas e brincadeiras', defaultValue: 'Apresentação de Danças Folclóricas, Quadrilha Tradicional e Barracas de Comidas Típicas', type: 'textarea' }
    ],
    customContent: {
      subject: 'ASSUNTO: CONVITE OFICIAL — FESTA JUNINA DA COMUNIDADE ESCOLAR',
      greeting: 'Prezadas Famílias, Estudantes e Comunidade Escolar,',
      intro: '<p>A Direção Escolar e a Coordenação Pedagógica têm a honra de convidar toda a comunidade escolar para prestigiar a nossa tradicional <strong>Celebração Junina</strong>, momento de celebração cultural, integração e valorização das tradições folclóricas brasileiras.</p>',
      development: '<p>O evento contará com apresentações artísticas e danças preparadas com dedicação pelos nossos estudantes, além de barracas com iguarias típicas e jogos recreativos coordenados pelo Grêmio Estudantil e APMF.</p><p><strong>Cronograma do Evento:</strong><br/>• <strong>Data:</strong> [DATA_EVENTO]<br/>• <strong>Horário:</strong> [HORARIO]<br/>• <strong>Local:</strong> [LOCAL_EVENTO]<br/>• <strong>Programação:</strong> [ATRACOES]</p>',
      guidelines: '<p>• Os estudantes participantes das quadrilhas deverão se apresentar com 30 minutos de antecedência ao horário previsto de suas apresentações.<br/>• A entrada é gratuita para familiares e responsáveis credenciados.<br/>• Haverá controle de acesso e segurança em todas as dependências da instituição.</p>',
      observations: '<p>Contamos com a calorosa presença e colaboração de todos para realizarmos uma comemoração inesquecível e segura para nossas crianças e jovens.</p>',
      closing: 'Com estima e espírito de confraternização,',
      signatureRole: 'Direção Geral e Comissão de Eventos',
      signatureName: 'Equipe Gestora Classium'
    }
  },

  {
    id: 'conv-dia-familia',
    category: 'Convites para Eventos',
    title: 'Dia da Família na Escola',
    description: 'Encontro de integração, oficinas participativas e estreitamento de laços escola-família.',
    type: 'Convite',
    actions: ['Confirmar presença'],
    requiresSignature: false,
    themeAccent: 'blue',
    themeIcon: 'Heart',
    dynamicFields: [
      { key: 'TEMA', label: 'Tema do Encontro', placeholder: 'Construindo Pontes de Amor e Conhecimento', defaultValue: 'União que Transforma: Família e Escola de Mãos Dadas', type: 'text' },
      { key: 'DATA_EVENTO', label: 'Data do Encontro', placeholder: '23 de Maio de 2026', defaultValue: '23/05/2026', type: 'text' },
      { key: 'HORARIO', label: 'Horário', placeholder: '08:30 às 12:00', defaultValue: '08:30', type: 'text' },
      { key: 'ATIVIDADES', label: 'Atividades Programadas', placeholder: 'Oficinas de arte, gincana cooperativa e café coletivo', defaultValue: 'Oficinas Pedagógicas Integradas, Dinâmicas Cooperativas e Roda de Conversa com Especialistas', type: 'textarea' }
    ],
    customContent: {
      subject: 'ASSUNTO: CONVITE ESPECIAL — DIA DA FAMÍLIA NA ESCOLA',
      greeting: 'Estimados Pais, Mães e Responsáveis Legais,',
      intro: '<p>A presença ativa da família no ecossistema escolar é a chave mestra para o pleno desenvolvimento cognitivo, ético e socioemocional dos estudantes. Convidamos vossas senhorias para participarem do nosso <strong>Dia da Família na Escola</strong>.</p>',
      development: '<p>Sob a temática <em>"[TEMA]"</em>, preparamos uma manhã de vivências significativas, oficinas interdisciplinares e momentos de conexão genuína entre educadores, familiares e estudantes.</p><p><strong>Informações Gerais:</strong><br/>• <strong>Data:</strong> [DATA_EVENTO]<br/>• <strong>Horário:</strong> [HORARIO]<br/>• <strong>Atividades:</strong> [ATIVIDADES]</p>',
      guidelines: '<p>• Recomendamos o uso de calçados e vestimentas confortáveis para participação nas atividades dinâmicas.<br/>• A confirmação antecipada de presença é imprescindível para o planejamento dos materiais das oficinas.</p>',
      observations: '<p>Sua participação faz toda a diferença na caminhada formativa de nossas crianças. Aguardamos com carinho a presença de sua família.</p>',
      closing: 'Atenciosamente e em permanente parceria,',
      signatureRole: 'Coordenação Pedagógica e Orientação Educacional',
      signatureName: 'Equipe Diretiva'
    }
  },

  {
    id: 'conv-consciencia-negra',
    category: 'Convites para Eventos',
    title: 'Semana da Consciência Negra e Diversidade',
    description: 'Convite para palestras, exposições culturais e mostras artísticas sobre a história e cultura afro-brasileira.',
    type: 'Convite',
    actions: ['Confirmar presença'],
    requiresSignature: false,
    themeAccent: 'amber',
    themeIcon: 'Award',
    dynamicFields: [
      { key: 'DATA_EVENTO', label: 'Data do Evento', placeholder: '20 de Novembro de 2026', defaultValue: '20/11/2026', type: 'text' },
      { key: 'HORARIO', label: 'Horário', placeholder: '19:00 às 21:30', defaultValue: '19:00', type: 'text' },
      { key: 'LOCAL_EVENTO', label: 'Local', placeholder: 'Auditório Nobre da Instituição', defaultValue: 'Auditório Principal', type: 'text' },
      { key: 'PROGRAMACAO', label: 'Destaques da Programação', placeholder: 'Exposição de arte, apresentações musicais e palestras', defaultValue: 'Exposição de Painéis Biográficos, Apresentação do Coral e Mesa Redonda sobre Cidadania e Igualdade', type: 'textarea' }
    ],
    customContent: {
      subject: 'ASSUNTO: CONVITE CULTURAL — JORNADA DA CONSCIÊNCIA NEGRA E CIDADANIA',
      greeting: 'Prezada Comunidade Escolar,',
      intro: '<p>Em consonância com as diretrizes curriculares nacionais e a Lei nº 10.639/03, temos a satisfação de convidar as famílias para a culminância das atividades pedagógicas alusivas à <strong>Semana da Consciência Negra</strong>.</p>',
      development: '<p>Nossos estudantes desenvolveram pesquisas profundas, painéis artísticos e intervenções literárias que valorizam o legado, a resistência e a inestimável contribuição do povo negro na formação cultural, científica e social do Brasil.</p><p><strong>Dados do Evento:</strong><br/>• <strong>Data:</strong> [DATA_EVENTO]<br/>• <strong>Horário:</strong> [HORARIO]<br/>• <strong>Local:</strong> [LOCAL_EVENTO]<br/>• <strong>Atrações:</strong> [PROGRAMACAO]</p>',
      guidelines: '<p>• O evento é aberto a todos os membros da família e convidados da comunidade.<br/>• Solicitamos pontualidade para o início solene da cerimônia no auditório.</p>',
      observations: '<p>Educar para o respeito, a equidade e a valorização da diversidade é um compromisso contínuo de nossa comunidade escolar.</p>',
      closing: 'Respeitosamente,',
      signatureRole: 'Direção Pedagógica e Núcleo de Diversidade',
      signatureName: 'Corpo Docente e Gestão Escolar'
    }
  },

  {
    id: 'conv-dia-mulher',
    category: 'Convites para Eventos',
    title: 'Dia Internacional da Mulher',
    description: 'Mensagem de homenagem e convite formal para palestra ou encontro comemorativo.',
    type: 'Convite',
    actions: ['Confirmar presença'],
    requiresSignature: false,
    themeAccent: 'rose',
    themeIcon: 'Heart',
    dynamicFields: [
      { key: 'DATA_EVENTO', label: 'Data do Encontro', placeholder: '08 de Março de 2026', defaultValue: '08/03/2026', type: 'text' },
      { key: 'HORARIO', label: 'Horário', placeholder: '18:30 às 20:30', defaultValue: '18:30', type: 'text' },
      { key: 'LOCAL_EVENTO', label: 'Local', placeholder: 'Espaço Cultural da Escola', defaultValue: 'Auditório e Espaço Cultural', type: 'text' },
      { key: 'TEMA_PAINEL', label: 'Tema da Homenagem', placeholder: 'Mulheres que Inspiram Gerações', defaultValue: 'Protagonismo Feminino, Ciência e Transformação Social', type: 'text' }
    ],
    customContent: {
      subject: 'ASSUNTO: HOMENAGEM INSTITUCIONAL E CONVITE — DIA INTERNACIONAL DA MULHER',
      greeting: 'Prezadas Mães, Educadoras, Estudantes e Responsáveis,',
      intro: '<p>Em celebração ao <strong>Dia Internacional da Mulher</strong>, expressamos nosso mais profundo reconhecimento a todas as mulheres que, com sabedoria, determinação e afeto, edificam diariamente o futuro de nossa comunidade e sociedade.</p>',
      development: '<p>Para marcar esta data solene, realizaremos um encontro especial com foco em reflexões, homenagens artísticas desenvolvidas pelos alunos e uma palestra magna com o tema: <em>"[TEMA_PAINEL]"</em>.</p><p><strong>Detalhes do Encontro:</strong><br/>• <strong>Data:</strong> [DATA_EVENTO]<br/>• <strong>Horário:</strong> [HORARIO]<br/>• <strong>Local:</strong> [LOCAL_EVENTO]</p>',
      guidelines: '<p>• Convidamos calorosamente todas as mães, avós, responsáveis e alunas a estarem presentes neste momento de celebração e partilha.</p>',
      observations: '<p>Haverá uma recepção com café de boas-vindas e distribuição de lembranças confeccionadas pelos discentes nas aulas de artes.</p>',
      closing: 'Com sincero respeito e admiração,',
      signatureRole: 'Direção Escolar',
      signatureName: 'Equipe Diretiva Classium'
    }
  },

  {
    id: 'conv-dia-maes',
    category: 'Convites para Eventos',
    title: 'Celebração do Dia das Mães',
    description: 'Convite solene e afetuoso para a celebração e apresentações artísticas em homenagem às mães.',
    type: 'Convite',
    actions: ['Confirmar presença'],
    requiresSignature: false,
    themeAccent: 'pink',
    themeIcon: 'Heart',
    dynamicFields: [
      { key: 'DATA_EVENTO', label: 'Data da Homenagem', placeholder: '09 de Maio de 2026', defaultValue: '09/05/2026', type: 'text' },
      { key: 'HORARIO', label: 'Horário das Apresentações', placeholder: '09:00 (Manhã) / 15:00 (Tarde)', defaultValue: '09:00', type: 'text' },
      { key: 'LOCAL_EVENTO', label: 'Local', placeholder: 'Teatro / Pátio Principal', defaultValue: 'Auditório Nobre da Instituição', type: 'text' },
      { key: 'ORIENTACOES', label: 'Orientações Específicas', placeholder: 'Acomodação dos convidados e registro fotográfico', defaultValue: 'Abertura dos portões com 20 minutos de antecedência e espaço reservado para fotos', type: 'textarea' }
    ],
    customContent: {
      subject: 'ASSUNTO: CONVITE OFICIAL — HOMENAGEM DO DIA DAS MÃES',
      greeting: 'Queridas Mães e Responsáveis que Exercem a Função Materna,',
      intro: '<p>O amor materno é o primeiro e mais seguro esteio na trajetória de toda criança e jovem. É com imensa alegria e carinho que o Colégio Classium as convida para uma comemoração inesquecível em sua honra.</p>',
      development: '<p>Nossos estudantes ensaiaram com dedicação cantos corais, poemas e números teatrais preparados especialmente para expressar gratidão por toda a dedicação diária.</p><p><strong>Cronograma:</strong><br/>• <strong>Data:</strong> [DATA_EVENTO]<br/>• <strong>Horário:</strong> [HORARIO]<br/>• <strong>Local:</strong> [LOCAL_EVENTO]<br/>• <strong>Informações:</strong> [ORIENTACOES]</p>',
      guidelines: '<p>• Solicitamos a confirmação da presença para a adequada reserva de assentos e acomodação de todos os familiares.</p>',
      observations: '<p>Será um momento ímpar de emoção e celebração dos mais puros vínculos familiares.</p>',
      closing: 'Com os mais afetuosos cumprimentos,',
      signatureRole: 'Coordenação Pedagógica e Direção de Ensino',
      signatureName: 'Equipe Pedagógica'
    }
  },

  {
    id: 'conv-dia-pais',
    category: 'Convites para Eventos',
    title: 'Celebração do Dia dos Pais',
    description: 'Convite oficial para evento de confraternização e atividades interativas de pais e filhos.',
    type: 'Convite',
    actions: ['Confirmar presença'],
    requiresSignature: false,
    themeAccent: 'indigo',
    themeIcon: 'Award',
    dynamicFields: [
      { key: 'DATA_EVENTO', label: 'Data do Encontro', placeholder: '08 de Agosto de 2026', defaultValue: '08/08/2026', type: 'text' },
      { key: 'HORARIO', label: 'Horário', placeholder: '09:00 às 11:30', defaultValue: '09:00', type: 'text' },
      { key: 'LOCAL_EVENTO', label: 'Local', placeholder: 'Complexo Esportivo e Pátio Central', defaultValue: 'Quadra Poliesportiva e Áreas Verdes', type: 'text' },
      { key: 'PROGRAMACAO', label: 'Atividades Programadas', placeholder: 'Jogos integrados, torneio relâmpago e café da manhã', defaultValue: 'Gincana Cooperativa Pais e Filhos, Circuito de Atividades e Homenagem Musical', type: 'textarea' }
    ],
    customContent: {
      subject: 'ASSUNTO: CONVITE OFICIAL — DIA DOS PAIS E FIGURAS PATERNAS',
      greeting: 'Estimados Pais e Responsáveis de Referência Paterna,',
      intro: '<p>A presença, o exemplo e o apoio paterno constituem alicerces sólidos na construção do caráter e da confiança de nossos educandos. Convidamos os senhores para uma manhã especial de integração e celebração.</p>',
      development: '<p>Preparamos um circuito de vivências descontraídas para que pais e filhos compartilhem memórias felizes em nosso ambiente escolar.</p><p><strong>Programação Oficial:</strong><br/>• <strong>Data:</strong> [DATA_EVENTO]<br/>• <strong>Horário:</strong> [HORARIO]<br/>• <strong>Local:</strong> [LOCAL_EVENTO]<br/>• <strong>Atividades:</strong> [PROGRAMACAO]</p>',
      guidelines: '<p>• Sugerimos o comparecimento com vestimenta desportiva confortável.<br/>• Favor confirmar a presença pelo portal até a data estipulada.</p>',
      observations: '<p>Sua presença é o maior presente na vida escolar de seu(sua) filho(a).</p>',
      closing: 'Atenciosamente,',
      signatureRole: 'Direção Geral e Departamento de Esportes e Cultura',
      signatureName: 'Equipe Gestora'
    }
  },

  {
    id: 'conv-feira-ciencias',
    category: 'Convites para Eventos',
    title: 'Feira de Ciências e Mostra Cultural',
    description: 'Convite formal para a visitação dos estandes científicos, projetos de inovação e pesquisa dos estudantes.',
    type: 'Convite',
    actions: ['Confirmar presença'],
    requiresSignature: false,
    themeAccent: 'emerald',
    themeIcon: 'Layers',
    dynamicFields: [
      { key: 'TEMA_GERAL', label: 'Tema da Feira', placeholder: 'Inovação, Sustentabilidade e Futuro', defaultValue: 'Ciência, Tecnologia e Sustentabilidade para o Século XXI', type: 'text' },
      { key: 'DATA_EVENTO', label: 'Data da Mostra', placeholder: '17 de Outubro de 2026', defaultValue: '17/10/2026', type: 'text' },
      { key: 'HORARIO', label: 'Horário de Visitação', placeholder: '08:30 às 16:30', defaultValue: '09:00 às 16:00', type: 'text' },
      { key: 'LOCAL_EVENTO', label: 'Local', placeholder: 'Salas de Aula e Laboratórios Integrados', defaultValue: 'Laboratórios de Ciências e Pavilhão Pedagógico', type: 'text' }
    ],
    customContent: {
      subject: 'ASSUNTO: CONVITE DE VISITAÇÃO — FEIRA DE CIÊNCIAS E MOSTRA CIENTÍFICA',
      greeting: 'Prezados Pais, Responsáveis e Comunidade Acadêmica,',
      intro: '<p>Temos a satisfação de convidar vossas senhorias para prestigiarem a nossa <strong>Feira Anual de Ciências e Mostra Cultural de Inovação</strong>, cujo tema deste ano é <em>"[TEMA_GERAL]"</em>.</p>',
      development: '<p>Ao longo do semestre, nossos estudantes exerceram o método científico com rigor, curiosidade e criatividade, elaborando experimentos práticos, protótipos de robótica e pesquisas socioambientais de elevado mérito acadêmico.</p><p><strong>Cronograma de Visitação Pública:</strong><br/>• <strong>Data:</strong> [DATA_EVENTO]<br/>• <strong>Horário de Abertura:</strong> [HORARIO]<br/>• <strong>Localização:</strong> [LOCAL_EVENTO]</p>',
      guidelines: '<p>• Os estandes contarão com apresentações orais periódicas dos próprios estudantes pesquisadores.<br/>• A entrada é livre para familiares e membros da comunidade regional.</p>',
      observations: '<p>A valorização do esforço investigativo de nossos jovens fortalece o amor pelo saber e pela pesquisa.</p>',
      closing: 'Cordialmente,',
      signatureRole: 'Coordenação Pedagógica e Área de Ciências da Natureza',
      signatureName: 'Comitê Científico Escolar'
    }
  },

  {
    id: 'conv-formatura',
    category: 'Convites para Eventos',
    title: 'Formatura e Cerimônia de Colação de Grau',
    description: 'Convite solene para a solenidade oficial de conclusão de ciclo e entrega de certificados.',
    type: 'Convite',
    actions: ['Confirmar presença'],
    requiresSignature: false,
    themeAccent: 'amber',
    themeIcon: 'Award',
    dynamicFields: [
      { key: 'SEGMENTO', label: 'Segmento / Etapa', placeholder: 'Ensino Fundamental II / Ensino Médio', defaultValue: 'Concluintes do Ensino Fundamental e Médio', type: 'text' },
      { key: 'DATA_EVENTO', label: 'Data da Cerimônia', placeholder: '18 de Dezembro de 2026', defaultValue: '18/12/2026', type: 'text' },
      { key: 'HORARIO', label: 'Horário Solene', placeholder: '19:30', defaultValue: '19:30', type: 'text' },
      { key: 'LOCAL_EVENTO', label: 'Local da Cerimônia', placeholder: 'Teatro Municipal de Classium', defaultValue: 'Auditório Nobre / Centro de Convenções', type: 'text' },
      { key: 'TRAJE', label: 'Traje Recomendado', placeholder: 'Passeio Completo', defaultValue: 'Passeio Completo / Formal', type: 'text' }
    ],
    customContent: {
      subject: 'ASSUNTO: CONVITE SOLENE — CERIMÔNIA DE COLAÇÃO DE GRAU E FORMATURA',
      greeting: 'Ilustríssimos Pais, Familiares e Formandos,',
      intro: '<p>A Direção Geral e o Corpo Docente do Colégio Classium sentem-se profundamente honrados em convidar vossas famílias para a <strong>Sessão Solene de Colação de Grau e Encerramento de Ciclo</strong> dos estudantes do <strong>[SEGMENTO]</strong>.</p>',
      development: '<p>Esta cerimônia coroa anos de dedicação, superação intelectual e amadurecimento humano. Celebraremos em conjunto as conquistas que marcam a transição para novas etapas de sucesso formativo e cidadão.</p><p><strong>Dados da Solenidade:</strong><br/>• <strong>Data:</strong> [DATA_EVENTO]<br/>• <strong>Horário de Início:</strong> [HORARIO]<br/>• <strong>Local:</strong> [LOCAL_EVENTO]<br/>• <strong>Traje Recomendado:</strong> [TRAJE]</p>',
      guidelines: '<p>• Os formandos deverão chegar com 60 minutos de antecedência para os preparativos protocolares de vestimenta de becas e fotos oficiais.<br/>• Cada família receberá os convites individuais nominais de acesso com antecedência.</p>',
      observations: '<p>Que esta conquista seja o prenúncio de uma caminhada brilhante, ética e repleta de realizações.</p>',
      closing: 'Com os mais sinceros votos de júbilo e sucesso,',
      signatureRole: 'Direção Geral e Conselho Acadêmico',
      signatureName: 'Comissão de Formatura Classium'
    }
  },

  // ==========================================
  // 2. BILHETES & COMUNICADOS INFORMATIVOS (EXPANSÃO MASTER)
  // ==========================================
  {
    id: 'bil-boas-vindas',
    category: 'Bilhetes e Comunicados',
    title: 'Boas-vindas à Família e Início Letivo',
    description: 'Comunicado formal e acolhedor de início de ano letivo com diretrizes e valores institucionais.',
    type: 'Informativo',
    actions: ['Confirmar leitura'],
    requiresSignature: false,
    dynamicFields: [
      { key: 'ANO_LETIVO', label: 'Ano / Semestre', placeholder: '2026', defaultValue: '2026', type: 'text' },
      { key: 'DATA_INICIO', label: 'Data de Início das Aulas', placeholder: '02 de Fevereiro de 2026', defaultValue: '02/02/2026', type: 'text' },
      { key: 'HORARIO_ENTRADA', label: 'Horário de Entrada', placeholder: '07:30 (Matutino) / 13:15 (Vespertino)', defaultValue: '07:30', type: 'text' },
      { key: 'CANAIS_ATENDIMENTO', label: 'Canais de Atendimento', placeholder: 'Portal do Aluno e Secretaria Acadêmica', defaultValue: 'Portal Classium, Telefone Institucional e Secretaria Geral', type: 'text' }
    ],
    customContent: {
      subject: 'ASSUNTO: MENSAGEM OFICIAL DE BOAS-VINDAS — ANO LETIVO [ANO_LETIVO]',
      greeting: 'Prezadas Famílias e Queridos Estudantes,',
      intro: '<p>É com renovado entusiasmo e firme compromisso pedagógico que a Direção e o Corpo Docente do Colégio Classium acolhem cada estudante e seus familiares para a abertura do <strong>Ano Letivo de [ANO_LETIVO]</strong>.</p>',
      development: '<p>Iniciamos este ciclo letivo alicerçados na busca incessante pela excelência acadêmica, no acolhimento humanizado e na formação integral de nossos alunos como pensadores autônomos, solidários e conscientes de seu papel transformador na sociedade.</p><p><strong>Diretrizes Operacionais Iniciais:</strong><br/>• <strong>Início das Aulas:</strong> [DATA_INICIO]<br/>• <strong>Horário de Entrada:</strong> [HORARIO_ENTRADA]<br/>• <strong>Canais de Comunicação:</strong> [CANAIS_ATENDIMENTO]</p>',
      guidelines: '<p>• Solicitamos pontualidade rigorosa nos horários de entrada e saída para garantir a organização da rotina e a segurança de todos.<br/>• O uso do uniforme completo é obrigatório desde o primeiro dia de atividades.<br/>• Mantenham os dados cadastrais, telefones e e-mails sempre atualizados junto à Secretaria Escolar.</p>',
      observations: '<p>Reafirmamos que a parceria sólida entre família e escola é a base inegociável para o sucesso educacional. Estamos de portas abertas para construir mais um capítulo memorável.</p>',
      closing: 'Com os nossos melhores votos de um ano letivo fecundo e abençoado,',
      signatureRole: 'Direção Geral Pedagógica',
      signatureName: 'Equipe Diretiva Classium'
    }
  },

  {
    id: 'bil-reuniao-pais',
    category: 'Bilhetes e Comunicados',
    title: 'Lembrete de Reunião de Pais e Mestres',
    description: 'Convocação e lembrete objetivo com data, horário, pauta pedagógica e local da reunião.',
    type: 'Reunião',
    actions: ['Confirmar presença'],
    requiresSignature: false,
    dynamicFields: [
      { key: 'DATA_REUNIAO', label: 'Data da Reunião', placeholder: '15 de Abril de 2026', defaultValue: '15/04/2026', type: 'text' },
      { key: 'HORARIO_REUNIAO', label: 'Horário', placeholder: '19:00 às 20:30', defaultValue: '19:00', type: 'text' },
      { key: 'LOCAL', label: 'Local / Sala', placeholder: 'Salas de Aula e Auditório', defaultValue: 'Salas de Aula dos Respectivos Segmentos', type: 'text' },
      { key: 'PAUTA_PRINCIPAL', label: 'Pauta dos Debates', placeholder: '1. Diagnóstico do 1º Bimestre; 2. Hábitos de Estudo; 3. Atendimento com Professores', defaultValue: '1. Rendimento acadêmico do 1º Bimestre; 2. Frequência e pontualidade; 3. Calendário de avaliações e projetos; 4. Atendimento individual com os docentes de área.', type: 'textarea' }
    ],
    customContent: {
      subject: 'ASSUNTO: CONVOCAÇÃO — REUNIÃO DE PAIS E MESTRES',
      greeting: 'Prezados Senhores Pais e Responsáveis Legais,',
      intro: '<p>A Coordenação Pedagógica convoca formalmente os senhores para a nossa <strong>Reunião Pedagógica Periódica de Pais e Mestres</strong>, momento essencial para o acompanhamento sistemático da evolução acadêmica e comportamental dos discentes.</p>',
      development: '<p>Na oportunidade, os professores apresentarão o balanço pedagógico da etapa letiva, as estratégias de intervenção para os pontos de defasagem e o cronograma de projetos futuros.</p><p><strong>Dados da Reunião:</strong><br/>• <strong>Data:</strong> [DATA_REUNIAO]<br/>• <strong>Horário:</strong> [HORARIO_REUNIAO]<br/>• <strong>Local:</strong> [LOCAL]<br/>• <strong>Pauta Oficial:</strong><br/>[PAUTA_PRINCIPAL]</p>',
      guidelines: '<p>• Solicitamos pontualidade para que possamos cumprir integralmente a pauta nos horários programados.<br/>• A presença dos responsáveis é de suma relevância para o alinhamento das metas formativas.</p>',
      observations: '<p>Caso haja impossibilidade absoluta de comparecimento, solicitamos comunicação prévia para agendamento de atendimento individualizado.</p>',
      closing: 'Certos de contar com vossa costumeira cooperação,',
      signatureRole: 'Coordenação de Segmento',
      signatureName: 'Corpo Docente e Coordenação Pedagógica'
    }
  },

  {
    id: 'bil-agradecimento',
    category: 'Bilhetes e Comunicados',
    title: 'Agradecimento pela Parceria no Ano Letivo',
    description: 'Mensagem formal e cordial de encerramento do ano letivo e reconhecimento à parceria familiar.',
    type: 'Informativo',
    actions: ['Confirmar leitura'],
    requiresSignature: false,
    dynamicFields: [
      { key: 'ANO_CONCLUIDO', label: 'Ano Concluído', placeholder: '2026', defaultValue: '2026', type: 'text' },
      { key: 'DATA_RETORNO', label: 'Previsão de Retorno', placeholder: 'Fevereiro de 2027', defaultValue: '01/02/2027', type: 'text' }
    ],
    customContent: {
      subject: 'ASSUNTO: COMUNICADO DE ENCERRAMENTO E AGRADECIMENTO — ANO LETIVO [ANO_CONCLUIDO]',
      greeting: 'Prezadas Famílias e Comunidade Escolar,',
      intro: '<p>Ao concluirmos as atividades letivas do <strong>Ano de [ANO_CONCLUIDO]</strong>, dirigimo-nos a cada um dos senhores para externar nosso mais profundo e sincero agradecimento pela confiança, dedicação e sólida parceria demonstradas ao longo de toda esta jornada.</p>',
      development: '<p>Cada desafio superado e cada conquista alcançada por nossos discentes são frutos de um trabalho conjunto, onde escola e família caminharam lado a lado com o mesmo propósito: proporcionar a melhor formação humana e científica para nossas crianças e jovens.</p>',
      guidelines: '<p>• A Secretaria Escolar funcionará em regime de plantão no recesso para atendimento de renovações e certidões.<br/>• O início do próximo período letivo está previsto para [DATA_RETORNO].</p>',
      observations: '<p>Desejamos a todos os estudantes e familiares um período de férias revigorante, com muita paz, saúde e momentos inesquecíveis em família.</p>',
      closing: 'Com estima, respeito e admiração renovados,',
      signatureRole: 'Direção Geral e Corpo Docente',
      signatureName: 'Colégio Classium'
    }
  },

  {
    id: 'bil-esporte-passeio',
    category: 'Bilhetes e Comunicados',
    title: 'Eventos Esportivos e Passeios Pedagógicos',
    description: 'Orientações detalhadas de logística, horários, segurança e autorização de transporte para saídas de campo.',
    type: 'Autorização',
    actions: ['Autorizar', 'Recusar'],
    requiresSignature: false,
    dynamicFields: [
      { key: 'DESTINO_ATIVIDADE', label: 'Destino / Evento', placeholder: 'Jogos Interescolares Regionais / Museu de Ciências', defaultValue: 'Parque Ecológico Municipal e Museu Histórico', type: 'text' },
      { key: 'DATA_SAIDA', label: 'Data da Atividade', placeholder: '28 de Maio de 2026', defaultValue: '28/05/2026', type: 'text' },
      { key: 'HORARIO_SAIDA', label: 'Horário de Saída', placeholder: '07:45', defaultValue: '07:45', type: 'text' },
      { key: 'HORARIO_RETORNO', label: 'Previsão de Retorno', placeholder: '16:30', defaultValue: '16:30', type: 'text' },
      { key: 'ITENS_OBRIGATORIOS', label: 'Itens Obrigatórios', placeholder: 'Uniforme completo, garrafa d\'água e lanche leve', defaultValue: 'Uniforme escolar completo, documento de identificação original com foto, protetor solar e garrafa térmica para água.', type: 'textarea' }
    ],
    customContent: {
      subject: 'ASSUNTO: INFORMATIVO E AUTORIZAÇÃO — ATIVIDADE EXTRACLASSE / [DESTINO_ATIVIDADE]',
      greeting: 'Senhores Pais e Responsáveis,',
      intro: '<p>Informamos que realizaremos uma saída pedagógica / esportiva com foco na ampliação de repertório cultural e integração esportiva, com destino a: <strong>[DESTINO_ATIVIDADE]</strong>.</p>',
      development: '<p>A atividade contará com o acompanhamento direto e constante do corpo docente, monitores treinados e coordenação de segmento, assegurando total supervisão e segurança aos discentes.</p><p><strong>Logística e Cronograma:</strong><br/>• <strong>Data:</strong> [DATA_SAIDA]<br/>• <strong>Embarque / Saída da Escola:</strong> [HORARIO_SAIDA]<br/>• <strong>Previsão de Retorno ao Colégio:</strong> [HORARIO_RETORNO]<br/>• <strong>Transporte:</strong> Ônibus fretado com seguro integral de passageiros.</p>',
      guidelines: '<p><strong>Recomendações e Exigências:</strong><br/>[ITENS_OBRIGATORIOS]<br/>• Os discentes deverão seguir rigorosamente as orientações disciplinares dos professores responsáveis.</p>',
      observations: '<p>A participação do estudante está condicionada à autorização expressa do responsável legal por meio dos canais digitais do colégio.</p>',
      closing: 'Atenciosamente,',
      signatureRole: 'Coordenação de Eventos e Projetos Extracurriculares',
      signatureName: 'Comissão Pedagógica'
    }
  },

  {
    id: 'bil-feriado-recesso',
    category: 'Bilhetes e Comunicados',
    title: 'Aviso de Feriado e Recesso Escolar',
    description: 'Comunicado oficial de suspensão temporária das aulas e cronograma de retorno às atividades.',
    type: 'Informativo',
    actions: ['Confirmar leitura'],
    requiresSignature: false,
    dynamicFields: [
      { key: 'MOTIVO_RECESSO', label: 'Feriado / Motivo', placeholder: 'Feriado Nacional da Proclamação da República e Recesso', defaultValue: 'Feriado Nacional e Recesso Pedagógico Regulamentar', type: 'text' },
      { key: 'DATA_INICIO_PAUSA', label: 'Início da Suspensão', placeholder: '01 de Maio de 2026', defaultValue: '01/05/2026', type: 'text' },
      { key: 'DATA_RETORNO_AULAS', label: 'Data de Retorno às Aulas', placeholder: '04 de Maio de 2026', defaultValue: '04/05/2026', type: 'text' }
    ],
    customContent: {
      subject: 'ASSUNTO: COMUNICADO OFICIAL — SUSPENSÃO DE AULAS POR FERIADO / RECESSO',
      greeting: 'Prezada Comunidade Escolar,',
      intro: '<p>Comunicamos que, em virtude do <strong>[MOTIVO_RECESSO]</strong>, as atividades letivas e administrativas da instituição estarão temporariamente suspensas.</p>',
      development: '<p>O recesso terá início a partir de <strong>[DATA_INICIO_PAUSA]</strong>, com retorno regular de todas as turmas e expedientes no dia <strong>[DATA_RETORNO_AULAS]</strong>, nos horários habituais de cada turno.</p>',
      guidelines: '<p>• Orientamos os estudantes a utilizarem os momentos de pausa para descansar e colocar em dia as leituras complementares recomendadas pelos docentes.<br/>• Não haverá atendimento presencial na secretaria escolar nos dias de feriado oficial.</p>',
      observations: '<p>Agradecemos a atenção de todos e desejamos um excelente descanso.</p>',
      closing: 'Cordialmente,',
      signatureRole: 'Secretaria Geral e Direção Administrativa',
      signatureName: 'Direção do Colégio Classium'
    }
  },

  // ==========================================
  // 3. ADVERTÊNCIAS & NOTIFICAÇÕES (COM ASSINATURA DIGITAL)
  // ==========================================
  {
    id: 'dis-suspensao-oficial',
    category: 'Disciplina e Notificações',
    title: 'Notificação Oficial de Suspensão Disciplinar',
    description: 'Documento legal de suspensão temporária por infração grave com fundamentação regimental e assinatura digital obrigatória.',
    type: 'Suspensão',
    actions: ['Assinatura Digital', 'Confirmar leitura'],
    requiresSignature: true,
    themeAccent: 'red',
    themeIcon: 'ShieldAlert',
    dynamicFields: [
      { key: 'NOME_ALUNO', label: 'Nome do Estudante', placeholder: 'João Pedro da Silva', defaultValue: 'João Pedro da Silva', type: 'text' },
      { key: 'SERIE_TURMA', label: 'Série / Turma', placeholder: '8º Ano B - Ensino Fundamental', defaultValue: '8º Ano B', type: 'text' },
      { key: 'DIAS_SUSPENSAO', label: 'Quantidade de Dias', placeholder: '02 (dois) dias letivos', defaultValue: '02 (dois) dias', type: 'text' },
      { key: 'PERIODO_DATA', label: 'Período do Afastamento', placeholder: '26/08/2026 a 27/08/2026', defaultValue: '26/08/2026 a 27/08/2026', type: 'text' },
      { key: 'DATA_RETORNO', label: 'Data de Retorno às Aulas', placeholder: '28 de Agosto de 2026', defaultValue: '28/08/2026', type: 'text' },
      { key: 'DESCRICAO_FATO', label: 'Descrição Circunstanciada do Fato', placeholder: 'Relato objetivo da conduta em desacordo com o regimento escolar', defaultValue: 'Reincidência em comportamento de perturbação da ordem em sala de aula e desrespeito direto às orientações do corpo docente e equipe de monitoria, em infração expressa ao Art. 48 do Regimento Interno.', type: 'textarea' },
      { key: 'TAREFAS_DOMICILIARES', label: 'Obrigações Domiciliares', placeholder: 'Resolução das listas de exercícios do módulo 4', defaultValue: 'O discente deverá cumprir o roteiro de estudos e tarefas domiciliares disponibilizados no portal pedagógico para não sofrer defasagem no conteúdo programático.', type: 'textarea' }
    ],
    customContent: {
      subject: 'ASSUNTO: NOTIFICAÇÃO OFICIAL — SUSPENSÃO DISCIPLINAR TEMPORÁRIA',
      greeting: 'Prezado(a) Responsável Legal pelo(a) Estudante [NOME_ALUNO],',
      intro: '<p>A Direção Geral e o Setor de Orientação Educacional, no cumprimento das prerrogativas que lhes são conferidas pelo Regimento Escolar Interno e em observância aos princípios formativos da convivência cidadã, vêm notificar formalmente a aplicação de <strong>Medida Disciplinar de Suspensão Temporária</strong> ao(à) discente acima nominado(a), matriculado(a) na turma <strong>[SERIE_TURMA]</strong>.</p>',
      development: '<p><strong>1. Da Infração Disciplinar Cometida:</strong><br/>[DESCRICAO_FATO]</p><p><strong>2. Da Penalidade Aplicada:</strong><br/>Fica o(a) estudante suspenso(a) de suas atividades letivas regulares presenciais pelo período de <strong>[DIAS_SUSPENSAO]</strong>, compreendido entre <strong>[PERIODO_DATA]</strong>, devendo retornar às atividades no dia <strong>[DATA_RETORNO]</strong>.</p><p><strong>3. Dos Deveres Pedagógicos Domiciliares:</strong><br/>[TAREFAS_DOMICILIARES]</p>',
      guidelines: '<p>• A presente notificação fica averbada no prontuário escolar individual do discente para fins de acompanhamento socioemocional e disciplinar contínuo.<br/>• A reincidência em condutas gravosas poderá ensejar convocação extraordinária do Conselho de Classe e encaminhamento aos órgãos de proteção da criança e do adolescente (Conselho Tutelar / Vara da Infância), nos moldes da Lei Federal nº 8.069/1990 (ECA).</p>',
      observations: '<p>Solicitamos a leitura atenta e a assinatura digital deste documento pelo responsável legal para homologação do protocolo de ciência e compromisso.</p>',
      closing: 'Nestes termos, firmamos a presente notificação.',
      signatureRole: 'Setor de Orientação Educacional e Direção Disciplinar',
      signatureName: 'Profa. Clarissa Mendes Prado'
    }
  },

  {
    id: 'dis-advertencia-comportamento',
    category: 'Disciplina e Notificações',
    title: 'Advertência por Comportamento e Infração',
    description: 'Registro de infração disciplinar formal com medidas socioeducativas e solicitação de assinatura do responsável.',
    type: 'Advertência',
    actions: ['Assinatura Digital', 'Confirmar leitura'],
    requiresSignature: true,
    themeAccent: 'amber',
    themeIcon: 'AlertTriangle',
    dynamicFields: [
      { key: 'NOME_ALUNO', label: 'Nome do Estudante', placeholder: 'Ana Beatriz Souza', defaultValue: 'Ana Beatriz Souza', type: 'text' },
      { key: 'SERIE_TURMA', label: 'Turma', placeholder: '9º Ano A', defaultValue: '9º Ano A', type: 'text' },
      { key: 'DATA_OCORRIDO', label: 'Data da Ocorrência', placeholder: '24 de Agosto de 2026', defaultValue: '24/08/2026', type: 'text' },
      { key: 'DESCRICAO_OCORRENCIA', label: 'Descrição da Ocorrência', placeholder: 'Uso não autorizado de aparelhos eletrônicos durante a avaliação e recusa em guardar o dispositivo.', defaultValue: 'Uso indevido de aparelho celular durante o horário de aula após sucessivas advertências verbais e recusa em guardar o dispositivo conforme estipulado no regimento escolar.', type: 'textarea' },
      { key: 'MEDIDAS_ADOTADAS', label: 'Medidas Pedagógicas Adotadas', placeholder: 'Diálogo reflexivo na coordenação e recolhimento do aparelho', defaultValue: 'Encaminhamento à Coordenação Pedagógica, diálogo de conscientização sobre as regras de convivência e retenção preventiva do aparelho até o encerramento do turno.', type: 'textarea' }
    ],
    customContent: {
      subject: 'ASSUNTO: TERMO OFICIAL DE ADVERTÊNCIA ESCRITA — CONDUTA DISCIPLINAR',
      greeting: 'Prezado(a) Senhor(a) Responsável pelo(a) Estudante [NOME_ALUNO],',
      intro: '<p>A Equipe de Orientação Educacional deste Colégio leva ao conhecimento de Vossa Senhoria a lavratura da presente <strong>Advertência Formal Escrita</strong> em desfavor do(a) discente <strong>[NOME_ALUNO]</strong> (Turma: [SERIE_TURMA]), decorrente de conduta em desacordo com as normas regimentais da instituição.</p>',
      development: '<p><strong>Relato da Ocorrência:</strong><br/>Na data de [DATA_OCORRIDO], foi constatado o seguinte fato: [DESCRICAO_OCORRENCIA].</p><p><strong>Providências Tomadas no Âmbito Escolar:</strong><br/>[MEDIDAS_ADOTADAS]</p>',
      guidelines: '<p>• Ressaltamos que a disciplina e o respeito mútuo são condições imprescindíveis para o bom andamento das aulas e a segurança de toda a comunidade acadêmica.<br/>• Solicitamos que os responsáveis conversem em família com o estudante sobre a importância da observância das normas escolares.</p>',
      observations: '<p>Requer-se a aposição da assinatura digital do responsável legal para fins de ciência inequívoca e registro nos arquivos escolares.</p>',
      closing: 'Atenciosamente,',
      signatureRole: 'Coordenação Disciplinar e Orientação Educacional',
      signatureName: 'Equipe de Orientação e Convivência'
    }
  },

  {
    id: 'ped-baixo-desempenho',
    category: 'Disciplina e Notificações',
    title: 'Notificação de Baixo Desempenho e Apoio Pedagógico',
    description: 'Diagnóstico de notas e defasagem com cronograma de estudos de recuperação e apoio no contraturno.',
    type: 'Pedagógico',
    actions: ['Assinatura Digital', 'Confirmar leitura'],
    requiresSignature: true,
    themeAccent: 'blue',
    themeIcon: 'FileText',
    dynamicFields: [
      { key: 'NOME_ALUNO', label: 'Nome do Aluno', placeholder: 'Carlos Eduardo Mendes', defaultValue: 'Carlos Eduardo Mendes', type: 'text' },
      { key: 'SERIE_TURMA', label: 'Turma', placeholder: '7º Ano C', defaultValue: '7º Ano C', type: 'text' },
      { key: 'DISCIPLINAS_DEFASAGEM', label: 'Disciplinas com Defasagem', placeholder: 'Matemática (Média 4,2) e Ciências (Média 5,0)', defaultValue: 'Matemática (Nota 4.5) e Língua Portuguesa (Nota 5.0)', type: 'textarea' },
      { key: 'PLANO_INTERVENCAO', label: 'Plano de Apoio Proposto', placeholder: 'Aulas de nivelamento às terças e quintas no contraturno', defaultValue: 'Inclusão obrigatória no Plantão de Dúvidas e Nivelamento no Contraturno (Terças e Quintas, das 14:00 às 15:30) com acompanhamento individualizado.', type: 'textarea' }
    ],
    customContent: {
      subject: 'ASSUNTO: ALERTA PEDAGÓGICO — BAIXO RENDIMENTO E PLANO DE APOIO',
      greeting: 'Prezada Família do(a) Estudante [NOME_ALUNO],',
      intro: '<p>O Conselho Pedagógico deste Colégio realiza o monitoramento contínuo das avaliações e do engajamento acadêmico de cada estudante. Constatamos que o(a) discente <strong>[NOME_ALUNO]</strong> apresentou rendimento abaixo da média institucional nas avaliações recentes da turma <strong>[SERIE_TURMA]</strong>.</p>',
      development: '<p><strong>Componentes Curriculares com Necessidade de Intervenção:</strong><br/>[DISCIPLINAS_DEFASAGEM]</p><p><strong>Estratégia de Recuperação Paralela e Nivelamento:</strong><br/>[PLANO_INTERVENCAO]</p>',
      guidelines: '<p>• A frequência às aulas de reforço e o cumprimento das tarefas diárias em casa são essenciais para que o discente recupere as habilidades defasadas antes do fechamento bimestral.<br/>• Recomendamos o acompanhamento diário da rotina de estudos pela família através do Portal Classium.</p>',
      observations: '<p>Solicitamos a assinatura digital dos responsáveis para confirmar a concordância e participação do discente no plano de intervenção pedagógica formulado.</p>',
      closing: 'Comprometidos com o pleno sucesso escolar do estudante,',
      signatureRole: 'Coordenação Pedagógica de Segmento',
      signatureName: 'Profa. Regina Maria Albuquerque'
    }
  },

  {
    id: 'dis-termo-compromisso',
    category: 'Disciplina e Notificações',
    title: 'Termo de Compromisso e Alinhamento de Conduta',
    description: 'Pacto formal de metas de convivência, pontualidade e assiduidade firmado entre família, aluno e escola.',
    type: 'Termo',
    actions: ['Assinatura Digital', 'Confirmar leitura'],
    requiresSignature: true,
    themeAccent: 'purple',
    themeIcon: 'CheckCircle2',
    dynamicFields: [
      { key: 'NOME_ALUNO', label: 'Nome do Aluno', placeholder: 'Lucas Gabriel Vieira', defaultValue: 'Lucas Gabriel Vieira', type: 'text' },
      { key: 'SERIE_TURMA', label: 'Turma', placeholder: '1º Ano do Ensino Médio A', defaultValue: '1º Ano EM - Turma A', type: 'text' },
      { key: 'COMPROMISSOS_ALUNO', label: 'Compromissos do Estudante', placeholder: 'Manter pontualidade, não usar celular em aula e entregar trabalhos no prazo', defaultValue: '1. Manter 100% de pontualidade no início das aulas;\n2. Cumprir com presteza todas as tarefas domiciliares e projetos avaliativos;\n3. Respeitar as diretrizes de convivência ética e os colegas em sala de aula.', type: 'textarea' },
      { key: 'COMPROMISSOS_ESCOLA', label: 'Apoio da Escola', placeholder: 'Monitoramento semanal de frequência e canal aberto com a família', defaultValue: 'Fornecer feedback pedagógico quinzenal à família e disponibilizar monitoria acadêmica no contraturno.', type: 'textarea' }
    ],
    customContent: {
      subject: 'ASSUNTO: TERMO DE COMPROMISSO E COOPERAÇÃO PEDAGÓGICO-DISCIPLINAR',
      greeting: 'Pelo presente instrumento de alinhamento socioeducativo,',
      intro: '<p>De um lado, o Colégio Classium, por sua Direção e Coordenação, e de outro, os responsáveis legais pelo(a) estudante <strong>[NOME_ALUNO]</strong> (Turma: [SERIE_TURMA]), firmam de comum acordo o presente <strong>Termo de Compromisso e Conduta Escolar</strong>.</p>',
      development: '<p><strong>Cláusula 1ª — Dos Compromissos do Estudante e da Família:</strong><br/>[COMPROMISSOS_ALUNO]</p><p><strong>Cláusula 2ª — Do Acompanhamento Institucional:</strong><br/>[COMPROMISSOS_ESCOLA]</p>',
      guidelines: '<p>• O cumprimento integral das metas pactuadas será reavaliado no prazo de 30 (trinta) dias pela Orientação Educacional.<br/>• A formalização deste termo visa restaurar o pleno foco acadêmico e a harmonia no ambiente de aprendizagem.</p>',
      observations: '<p>As partes ratificam o compromisso mediante assinatura digital eletrônica certificada pelo portal.</p>',
      closing: 'Em fé do que foi acordado,',
      signatureRole: 'Direção Geral e Orientação Educacional',
      signatureName: 'Comissão Pedagógica de Alinhamento'
    }
  },
  {
    id: 'urg-saude-febre',
    category: 'Urgente / Saúde',
    title: 'Febre / Ocorrência de Saúde na Enfermaria',
    description: 'Notificação urgente de atendimento médico/enfermagem no colégio com registro de temperatura e solicitação de retirada.',
    type: 'Urgente',
    themeAccent: 'red',
    themeIcon: 'AlertTriangle',
    actions: {
      apenasLeitura: false,
      confirmarLeitura: true,
      assinaturaDigital: false,
      autorizar: false,
      recusar: false,
      confirmarPresenca: false,
      responderComunicado: true
    },
    dynamicFields: [
      { key: 'NOME_ALUNO', label: 'Nome do Estudante', placeholder: 'João Silva de Alencar', defaultValue: 'João Silva de Alencar', type: 'text' },
      { key: 'SERIE_TURMA', label: 'Turma', placeholder: '7º Ano B', defaultValue: '7º Ano B', type: 'text' },
      { key: 'TEMPERATURA', label: 'Temperatura Aferida (°C)', placeholder: '38.4°C', defaultValue: '38.4°C', type: 'text' },
      { key: 'SINTOMAS', label: 'Sintomas Observados', placeholder: 'Febre súbita, indisposição e cefaleia leve', defaultValue: 'Febre súbita, indisposição e cefaleia leve', type: 'textarea' },
      { key: 'HORARIO_OCORRENCIA', label: 'Horário do Atendimento', placeholder: '10:45', defaultValue: '10:45', type: 'text' }
    ],
    customContent: {
      subject: 'URGENTE: ATENDIMENTO EM ENFERMARIA ESCOLAR — ESTUDANTE EM OBSERVAÇÃO',
      greeting: 'Prezados Pais e Responsáveis Legais pelo(a) estudante [NOME_ALUNO],',
      intro: '<p>Comunicamos com urgência que o(a) estudante <strong>[NOME_ALUNO]</strong>, matriculado(a) no <strong>[SERIE_TURMA]</strong>, deu entrada na enfermaria do colégio às <strong>[HORARIO_OCORRENCIA]</strong> apresentando quadro clínico que requer atenção imediata.</p>',
      development: '<p><strong>Quadro clínico registrado na triagem:</strong><br/>• Temperatura aferida: <strong style="color:#dc2626;">[TEMPERATURA]</strong><br/>• Sintomas relatados e observados: [SINTOMAS]<br/>• Conduta inicial: Repouso sob supervisão profissional da enfermagem e hidratação oral.</p>',
      guidelines: '<p>• Solicitamos que um responsável legal compareça à recepção do colégio com a máxima brevidade para retirada do estudante.<br/>• Caso haja impossibilidade de comparecimento imediato, favor entrar em contato urgente pelo telefone da enfermaria ou responder este comunicado.</p>',
      observations: '<p>O colégio zela prioritariamente pelo bem-estar e saúde física de seus estudantes. Aguardamos o contato imediato dos responsáveis.</p>',
      closing: 'Com os devidos cuidados médicos e pedagógicos,',
      signatureRole: 'Coordenação de Enfermagem e Apoio ao Aluno',
      signatureName: 'Equipe de Saúde Escolar Classium'
    }
  },
  {
    id: 'aut-passeio-campo',
    category: 'Assinaturas & Termos',
    title: 'Autorização de Aula de Campo e Visita Técnica',
    description: 'Documento oficial para coleta de assinatura digital biométrica dos responsáveis para aula externa.',
    type: 'Autorização',
    requiresSignature: true,
    themeAccent: 'amber',
    themeIcon: 'FileSignature',
    actions: {
      apenasLeitura: false,
      confirmarLeitura: true,
      assinaturaDigital: true,
      autorizar: true,
      recusar: true,
      confirmarPresenca: false,
      responderComunicado: false
    },
    dynamicFields: [
      { key: 'NOME_ALUNO', label: 'Nome do Estudante', placeholder: 'João Silva de Alencar', defaultValue: 'João Silva de Alencar', type: 'text' },
      { key: 'SERIE_TURMA', label: 'Turma', placeholder: '7º Ano B', defaultValue: '7º Ano B', type: 'text' },
      { key: 'DESTINO_PASSEIO', label: 'Destino da Aula de Campo', placeholder: 'Museu da Cidade e Jardim Botânico', defaultValue: 'Museu da Cidade e Parque Ecológico', type: 'text' },
      { key: 'DATA_PASSEIO', label: 'Data da Saída', placeholder: '15/09/2026', defaultValue: '15/09/2026', type: 'text' },
      { key: 'HORARIO_SAIDA_RETORNO', label: 'Horário de Saída e Retorno', placeholder: '08:00 às 16:30', defaultValue: '08:00 às 16:30', type: 'text' },
      { key: 'VALOR_TAXA', label: 'Custo por Estudante', placeholder: 'R$ 45,00 ou Gratuito', defaultValue: 'Gratuito', type: 'text' }
    ],
    customContent: {
      subject: 'AUTORIZAÇÃO DE PARTICIPAÇÃO EM AULA DE CAMPO E VISITA TÉCNICA',
      greeting: 'Prezados Pais e Responsáveis pelo(a) estudante [NOME_ALUNO],',
      intro: '<p>A Coordenação Pedagógica do Colégio Classium solicita vossa autorização expressa para que o(a) estudante <strong>[NOME_ALUNO]</strong> participe da atividade pedagógica externa descrita a seguir.</p>',
      development: '<p><strong>Dados da Atividade Pedagógica:</strong><br/>• Local de Destino: <strong>[DESTINO_PASSEIO]</strong><br/>• Data de Realização: <strong>[DATA_PASSEIO]</strong><br/>• Janela de Horários: <strong>[HORARIO_SAIDA_RETORNO]</strong><br/>• Custo/Taxa de Acesso: <strong>[VALOR_TAXA]</strong><br/>• Transporte: Ônibus de turismo fretado e vistoriado pela ANTT com acompanhamento de professores e monitores.</p>',
      guidelines: '<p>• Os estudantes deverão trajar o uniforme escolar completo e portar documento de identidade.<br/>• É vedada a participação de estudantes sem a devida formalização da assinatura eletrônica deste termo até 48 horas antes da data do evento.</p>',
      observations: '<p>A assinatura registrada eletronicamente possui plena eficácia probatória nos termos da Lei 14.063/2020.</p>',
      closing: 'Certos da colaboração de vossa família,',
      signatureRole: 'Coordenação Pedagógica de Ensino Fundamental',
      signatureName: 'Equipe de Atividades Externas Classium'
    }
  },
  {
    id: 'conv-plantao-individual',
    category: 'Convocações Pedagógicas',
    title: 'Convocação para Reunião Individual com Coordenação',
    description: 'Convocação com data, horário e local marcados, habilitando botões de confirmação, justificativa e reagendamento.',
    type: 'Reunião',
    themeAccent: 'blue',
    themeIcon: 'Calendar',
    actions: {
      apenasLeitura: false,
      confirmarLeitura: true,
      assinaturaDigital: false,
      autorizar: false,
      recusar: false,
      confirmarPresenca: true,
      responderComunicado: true
    },
    dynamicFields: [
      { key: 'NOME_ALUNO', label: 'Nome do Estudante', placeholder: 'João Silva de Alencar', defaultValue: 'João Silva de Alencar', type: 'text' },
      { key: 'SERIE_TURMA', label: 'Turma', placeholder: '7º Ano B', defaultValue: '7º Ano B', type: 'text' },
      { key: 'DATA_REUNIAO', label: 'Data Agendada', placeholder: '25/08/2026', defaultValue: '25/08/2026', type: 'text' },
      { key: 'HORARIO_REUNIAO', label: 'Horário Marcado', placeholder: '14:30', defaultValue: '14:30', type: 'text' },
      { key: 'LOCAL_REUNIAO', label: 'Local do Encontro', placeholder: 'Sala de Reuniões Pedagógicas - Bloco B', defaultValue: 'Sala de Reuniões Pedagógicas - Bloco B', type: 'text' },
      { key: 'MOTIVO_PAUTA', label: 'Pauta Principal', placeholder: 'Alinhamento acadêmico e acompanhamento bimestral', defaultValue: 'Alinhamento acadêmico e acompanhamento bimestral', type: 'textarea' }
    ],
    customContent: {
      subject: 'CONVOCAÇÃO OFICIAL PARA REUNIÃO INDIVIDUAL COM A COORDENAÇÃO PEDAGÓGICA',
      greeting: 'Prezados Pais e Responsáveis pelo(a) estudante [NOME_ALUNO],',
      intro: '<p>A Orientação Educacional e Coordenação Pedagógica convoca os responsáveis legais pelo(a) estudante <strong>[NOME_ALUNO]</strong> para reunião presencial de alinhamento socioformativo.</p>',
      development: '<p><strong>Dados do Agendamento:</strong><br/>• Data: <strong>[DATA_REUNIAO]</strong><br/>• Horário: <strong>[HORARIO_REUNIAO]</strong><br/>• Local: <strong>[LOCAL_REUNIAO]</strong><br/>• Pauta: <em>[MOTIVO_PAUTA]</em></p>',
      guidelines: '<p>• Solicitamos a gentileza de confirmar vossa presença ou, em caso de força maior, apresentar justificativa ou sugestão de novo horário diretamente pelo Portal Família.<br/>• A presença de ao menos um dos responsáveis é de suma relevância para o êxito do percurso escolar do estudante.</p>',
      observations: '<p>Sua confirmação será recebida em tempo real pela equipe de atendimento escolar.</p>',
      closing: 'Atenciosamente,',
      signatureRole: 'Orientação Educacional e Pedagógica',
      signatureName: 'Coordenação Pedagógica Classium'
    }
  }
];

/**
 * Retorna o documento escolar completo e profissional a partir da metadata.
 */
export function getCompleteTemplate(meta: TemplateMeta): SchoolTemplate {
  if (meta.customContent) {
    return {
      id: meta.id,
      category: meta.category,
      title: meta.title,
      description: meta.description,
      subject: meta.customContent.subject || `Assunto: ${meta.title.toUpperCase()}`,
      greeting: meta.customContent.greeting || 'Prezados Pais e Responsáveis,',
      intro: meta.customContent.intro || '',
      development: meta.customContent.development || '',
      guidelines: meta.customContent.guidelines || '',
      observations: meta.customContent.observations || '',
      closing: meta.customContent.closing || 'Atenciosamente,',
      signatureRole: meta.customContent.signatureRole || 'Direção Escolar',
      signatureName: meta.customContent.signatureName || 'Equipe Gestora Classium',
      type: meta.type,
      actions: meta.actions,
      requiresSignature: meta.requiresSignature ?? false,
      dynamicFields: meta.dynamicFields || [],
      themeAccent: meta.themeAccent || 'slate',
      themeIcon: meta.themeIcon || 'FileText'
    };
  }

  // Fallback generation for generic meta
  return {
    id: meta.id,
    category: meta.category,
    title: meta.title,
    description: meta.description,
    subject: `Assunto: ${meta.title.toUpperCase()}`,
    greeting: 'Prezados Pais e Responsáveis Legais,',
    intro: `<p>A Direção Escolar do Colégio Classium vem, por meio deste comunicado oficial, prestar orientações relativas ao tema <strong>${meta.title}</strong>.</p>`,
    development: `<p>Ressaltamos que todas as diretrizes institucionais visam assegurar a excelência formativa, a integridade dos discentes e o bom funcionamento da rotina acadêmica.</p>`,
    guidelines: `<p>Solicitamos a costumeira atenção de todos para as datas, prazos e procedimentos comunicados pelo colégio.</p>`,
    observations: `<p>Nossos canais de atendimento e a coordenação pedagógica permanecem à disposição para prestar quaisquer esclarecimentos adicionais.</p>`,
    closing: 'Certos de vossa colaboração e parceria contínua,',
    signatureRole: 'Direção Geral',
    signatureName: 'Equipe Pedagógica Classium',
    type: meta.type,
    actions: meta.actions,
    requiresSignature: meta.requiresSignature ?? false,
    dynamicFields: meta.dynamicFields || [],
    themeAccent: meta.themeAccent || 'slate',
    themeIcon: meta.themeIcon || 'FileText'
  };
}

export const initialSchoolTemplates: SchoolTemplate[] = templateMetadata.map(meta => getCompleteTemplate(meta));
