export interface RifaPageData {
  pageNumber: number;
  totalPages: number;
  startTicket: number;
  endTicket: number;
  startTicketFormatted: string;
  endTicketFormatted: string;
  tickets: number[];
}

export interface RifaTicketBaseInfo {
  title: string;
  prize: string;
  value: number;
  date: string;
  rules?: string;
  sponsors?: string;
  pixKey?: string;
  logoUrl?: string;
  imagePosition?: 'header' | 'right' | 'above_description';
  selectedArtTemplate: string;
  auditId: string;
  auditHash?: string;
  responsibleUser?: string;
  text?: string;
  totalQuantity: number;
  showCropLines?: boolean;
  showFoldMarks?: boolean;
  schoolName?: string;
}

/**
 * Generates all pagination sheets with exact sequential ticket numbering
 * e.g. 1000 tickets / 5 per page = 200 pages with 5 items each.
 */
export function generateRifaPages(
  startNum: number,
  endNum: number,
  rifasPorFolha: number,
  totalQuantity: number
): RifaPageData[] {
  const safeStart = Math.max(1, startNum);
  const safeEnd = Math.min(totalQuantity, Math.max(safeStart, endNum));
  const perPage = Math.max(1, rifasPorFolha);
  
  const allTickets: number[] = [];
  for (let i = safeStart; i <= safeEnd; i++) {
    allTickets.push(i);
  }

  const pages: RifaPageData[] = [];
  const totalPages = Math.ceil(allTickets.length / perPage);
  const digits = Math.max(3, String(totalQuantity).length);
  const formatNumber = (num: number) => String(num).padStart(digits, '0');

  for (let i = 0; i < allTickets.length; i += perPage) {
    const pageTickets = allTickets.slice(i, i + perPage);
    const pageNumber = Math.floor(i / perPage) + 1;
    const firstTicket = pageTickets[0];
    const lastTicket = pageTickets[pageTickets.length - 1];

    pages.push({
      pageNumber,
      totalPages,
      startTicket: firstTicket,
      endTicket: lastTicket,
      startTicketFormatted: formatNumber(firstTicket),
      endTicketFormatted: formatNumber(lastTicket),
      tickets: pageTickets
    });
  }

  return pages;
}
