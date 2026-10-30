export const templates = [
  {
    category: '👨👩👧 Reuniões',
    title: 'Convocação para Reunião de Pais',
    description: 'Convite formal para reunião pedagógica.',
    body: 'Prezados pais e responsáveis, convidamos para a Reunião Pedagógica no dia {{Data}} às {{Hora}} para discutirmos o desempenho e próximos passos.',
    type: 'Convocação',
    actions: ['Li o comunicado', 'Confirmo presença'],
    updatedAt: '2026-07-19'
  },
  {
    category: '🚸 Disciplina',
    title: 'Advertência Escrita',
    description: 'Registro oficial de advertência disciplinar.',
    body: 'Prezado(a) {{Responsavel}}, comunicamos a aplicação de advertência ao aluno(a) {{NomeAluno}} por motivo de {{Motivo}}.',
    type: 'Advertência',
    actions: ['Li o comunicado', 'Estou ciente'],
    updatedAt: '2026-07-19'
  },
  {
    category: '🚌 Passeios e Eventos',
    title: 'Autorização para Passeio',
    description: 'Autorização para atividades externas.',
    body: 'Autorizo a participação do(a) aluno(a) {{NomeAluno}} no passeio pedagógico ao {{Local}} no dia {{Data}}.',
    type: 'Autoriza Passeio',
    actions: ['Li o comunicado', 'Autorizo meu filho(a)', 'Não autorizo'],
    updatedAt: '2026-07-19'
  },
  {
    category: '💰 Financeiro',
    title: 'Mensalidade em Aberto',
    description: 'Lembrete de pagamento de mensalidade.',
    body: 'Prezado(a) {{Responsavel}}, informamos que a mensalidade do mês de {{Mes}} encontra-se em aberto. Favor regularizar.',
    type: 'Informativo',
    actions: ['Li o comunicado'],
    updatedAt: '2026-07-19'
  }
];
