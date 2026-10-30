import React from 'react';
import { createPortal } from 'react-dom';
import { Scissors } from 'lucide-react';
import { RifaPageData, RifaTicketBaseInfo } from '../../utils/generateRifaPages';

interface PrintableRifasBatchProps {
  pages: RifaPageData[];
  rifaInfo: RifaTicketBaseInfo;
  rifasPorFolha: number;
  paperFormat?: 'a4' | 'a4_landscape' | 'carta' | 'oficio' | 'a5' | 'custom';
}

export function PrintableRifasBatch({
  pages,
  rifaInfo,
  rifasPorFolha,
  paperFormat = 'a4'
}: PrintableRifasBatchProps) {
  if (typeof document === 'undefined') return null;

  const isLandscape = paperFormat === 'a4_landscape';

  const getArtThemeStyles = (themeName: string) => {
    const themes: Record<string, { bg: string; text: string; border: string; accent: string; badge: string; borderHex: string; bgHex: string }> = {
      'Solidário': { bg: 'from-emerald-50 to-teal-50 text-emerald-950', text: 'text-emerald-900', border: 'border-emerald-300', accent: 'bg-emerald-600 text-white', badge: 'Ação Solidária 🤝', borderHex: '#6ee7b7', bgHex: '#f0fdf4' },
      'Festa Junina': { bg: 'from-amber-50 to-orange-100 text-amber-950', text: 'text-amber-900', border: 'border-amber-300', accent: 'bg-amber-600 text-white', badge: 'Arraial Escolar 🌽', borderHex: '#fcd34d', bgHex: '#fffbeb' },
      'Dia das Mães': { bg: 'from-pink-50 to-rose-100 text-pink-950', text: 'text-pink-900', border: 'border-pink-300', accent: 'bg-pink-600 text-white', badge: 'Dia das Mães 🌸', borderHex: '#f9a8d4', bgHex: '#fdf2f8' },
      'Dia dos Pais': { bg: 'from-blue-50 to-indigo-100 text-blue-950', text: 'text-blue-900', border: 'border-blue-300', accent: 'bg-blue-600 text-white', badge: 'Dia dos Pais 👔', borderHex: '#93c5fd', bgHex: '#eff6ff' },
      'Natal': { bg: 'from-red-50 to-rose-100 text-red-950', text: 'text-red-900', border: 'border-red-300', accent: 'bg-red-700 text-white', badge: 'Natal Solidário 🎄', borderHex: '#fca5a5', bgHex: '#fef2f2' },
      'Páscoa': { bg: 'from-indigo-50 to-purple-100 text-purple-950', text: 'text-purple-900', border: 'border-purple-300', accent: 'bg-purple-600 text-white', badge: 'Páscoa Feliz 🐰', borderHex: '#d8b4fe', bgHex: '#faf5ff' },
      'Feiras': { bg: 'from-sky-50 to-blue-100 text-sky-950', text: 'text-sky-900', border: 'border-sky-300', accent: 'bg-sky-600 text-white', badge: 'Feira de Ciências 🔬', borderHex: '#7dd3fc', bgHex: '#f0f9ff' },
      'Eventos': { bg: 'from-stone-50 to-amber-100 text-stone-900', text: 'text-stone-900', border: 'border-amber-400', accent: 'bg-amber-500 text-slate-950', badge: 'Evento Escolar ⭐', borderHex: '#fbbf24', bgHex: '#fbfaf8' },
      'Esportes': { bg: 'from-orange-50 to-red-100 text-orange-950', text: 'text-orange-900', border: 'border-orange-300', accent: 'bg-orange-600 text-white', badge: 'Esportes 🏆', borderHex: '#fdba74', bgHex: '#fff7ed' },
      'Campanhas': { bg: 'from-teal-50 to-cyan-100 text-teal-950', text: 'text-teal-900', border: 'border-teal-300', accent: 'bg-teal-600 text-white', badge: 'Campanha de Apoio 🌍', borderHex: '#5eead4', bgHex: '#f0fdfa' },
      'Projetos': { bg: 'from-slate-50 to-blue-100 text-slate-950', text: 'text-blue-900', border: 'border-blue-200', accent: 'bg-blue-600 text-white', badge: 'Projeto Pedagógico 📘', borderHex: '#bfdbfe', bgHex: '#f8fafc' },
      'Reuniões': { bg: 'from-gray-100 to-slate-200 text-slate-900', text: 'text-slate-900', border: 'border-slate-300', accent: 'bg-slate-600 text-white', badge: 'Fórum & Reunião 🤝', borderHex: '#cbd5e1', bgHex: '#f1f5f9' },
      'Pedagógico': { bg: 'from-[#fdfbf7] to-amber-50 text-slate-900', text: 'text-slate-900', border: 'border-amber-300', accent: 'bg-amber-600 text-white', badge: 'Pedagógico ✏️', borderHex: '#fcd34d', bgHex: '#fdfbf7' },
      'Segurança': { bg: 'from-yellow-50 to-stone-100 text-slate-900', text: 'text-slate-900', border: 'border-yellow-400', accent: 'bg-yellow-500 text-slate-950', badge: 'Segurança Escolar 🛡️', borderHex: '#facc15', bgHex: '#fefce8' },
    };
    return themes[themeName] || themes['Solidário'];
  };

  const theme = getArtThemeStyles(rifaInfo.selectedArtTemplate);
  const digits = Math.max(3, String(rifaInfo.totalQuantity).length);
  const formatTicketNum = (num: number) => String(num).padStart(digits, '0');

  // Dynamic grid setup based on count of tickets per sheet
  const getGridClass = () => {
    if (rifasPorFolha <= 5) return 'grid-cols-1 gap-2.5';
    if (rifasPorFolha <= 10) return 'grid-cols-2 gap-2';
    if (rifasPorFolha <= 15) return 'grid-cols-3 gap-1.5';
    return 'grid-cols-4 gap-1';
  };

  // Fixed height for reliable A4 sheet pagination without overflow
  const getTicketHeightStyle = (): React.CSSProperties => {
    if (rifasPorFolha <= 2) return { height: '122mm', maxHeight: '124mm' };
    if (rifasPorFolha <= 4) return { height: '62mm', maxHeight: '63mm' };
    if (rifasPorFolha <= 5) return { height: '49mm', maxHeight: '50mm' };
    if (rifasPorFolha <= 8) return { height: '58mm', maxHeight: '60mm' };
    if (rifasPorFolha <= 10) return { height: '49mm', maxHeight: '50mm' };
    return { height: '40mm', maxHeight: '42mm' };
  };

  return createPortal(
    <div id="print-area-rifas" className="print-area-rifas-root">
      {pages.map((page) => (
        <div
          key={`page-${page.pageNumber}`}
          className={`print-page-rifas ${isLandscape ? 'page-landscape' : ''} bg-white text-slate-900`}
        >
          {/* Page Top Header */}
          <div className="flex justify-between items-center text-[8px] text-slate-500 font-mono border-b pb-1.5 mb-2 shrink-0">
            <span className="font-bold tracking-wider">CLASSIUM SOLIDÁRIO — LOTE DE IMPRESSÃO OFICIAL</span>
            <span className="font-extrabold bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
              FOLHA {page.pageNumber}/{page.totalPages} (BILHETES Nº {page.startTicketFormatted} A Nº {page.endTicketFormatted})
            </span>
            <span>FORMATO: {paperFormat.toUpperCase()}</span>
          </div>

          {/* Grid of tickets on current sheet */}
          <div className={`grid ${getGridClass()} flex-1 content-start`}>
            {page.tickets.map((ticketNum) => {
              const numStr = formatTicketNum(ticketNum);
              return (
                <div
                  key={`ticket-${ticketNum}`}
                  className={`bg-gradient-to-tr ${theme.bg} border ${theme.border} rounded-lg p-2.5 text-slate-900 flex text-left relative overflow-hidden transition-all shadow-sm`}
                  style={{
                    ...getTicketHeightStyle(),
                    boxSizing: 'border-box',
                    breakInside: 'avoid',
                    pageBreakInside: 'avoid',
                    borderColor: theme.borderHex,
                    backgroundColor: theme.bgHex
                  }}
                >
                  {/* CANHOTO / STUB (Left part - 30% width) */}
                  <div className="w-[30%] border-r border-dashed border-slate-400 pr-2 flex flex-col justify-between shrink-0">
                    <div>
                      <div className="flex justify-between items-center font-bold">
                        <span className="text-[7.5px] font-black uppercase tracking-wider text-slate-900">CANHOTO</span>
                        <span className="font-mono text-slate-950 font-black text-[9px]">Nº {numStr}</span>
                      </div>
                      <p className="border-b border-slate-300/80 pb-0.5 mt-0.5 font-mono text-[7.5px] font-bold text-slate-900">
                        VALOR: R$ {rifaInfo.value.toFixed(2)}
                      </p>
                      {/* Manual buyer completion fields */}
                      <div className="space-y-1 text-[6.5px] text-slate-700 leading-tight pt-1 font-medium">
                        <p>Nome: _________________</p>
                        <p>CPF:  _________________</p>
                        <p>Fone: _________________</p>
                      </div>
                    </div>

                    <div className="pt-1 flex items-end justify-between border-t border-slate-300/60 mt-0.5">
                      <div className="text-[6px] text-slate-500 leading-tight font-mono">
                        <p className="font-bold text-slate-700">Classium Solidário</p>
                        <p className="text-[5.5px]">ID: {rifaInfo.auditId}</p>
                      </div>
                      {rifaInfo.pixKey && (
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=48x48&data=pix:${encodeURIComponent(rifaInfo.pixKey)}`}
                          alt="Pix QR"
                          className="w-5 h-5 border border-slate-300 p-0.5 bg-white rounded shrink-0"
                        />
                      )}
                    </div>
                  </div>

                  {/* BILHETE / TICKET (Right part - 70% width) */}
                  <div className="flex-1 pl-2.5 flex flex-col justify-between relative">
                    <div>
                      {/* Top Bar of Ticket */}
                      <div className="flex justify-between items-start gap-1">
                        <div className="min-w-0 flex-1">
                          <span className="font-black text-[6.5px] uppercase tracking-wider text-slate-500 block leading-none">
                            Ação Escolar Beneficente
                          </span>
                          <h4 className="font-extrabold text-slate-950 text-[9px] leading-tight pt-0.5 truncate">
                            {rifaInfo.title}
                          </h4>
                          <span className="text-[6.5px] text-slate-500 block leading-none pt-0.5 truncate">
                            {rifaInfo.schoolName || 'Escola Municipal Vereador José Ferreira de Aguiar'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="bg-slate-900 text-white font-mono font-black px-1.5 py-0.5 rounded text-[8px]">
                            Nº {numStr}
                          </span>
                        </div>
                      </div>

                      {/* Description */}
                      {rifaInfo.text && (
                        <p className="mt-1 text-[7px] text-slate-700 line-clamp-2 leading-relaxed font-medium">
                          {rifaInfo.text}
                        </p>
                      )}
                    </div>

                    {/* Prize, Value, and Sorteio Details */}
                    <div className="space-y-0.5 mt-1">
                      <div className="bg-slate-950/5 border border-slate-300/60 p-1 rounded flex justify-between items-center text-slate-950 text-[7px] font-bold">
                        <span className="flex items-center gap-1 truncate max-w-[65%]">
                          <span className="truncate">🏆 PRÊMIO: {rifaInfo.prize}</span>
                        </span>
                        <span className="font-mono text-[7px] font-extrabold text-slate-900">
                          SORTEIO: {rifaInfo.date}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-[6.5px] text-slate-600 font-medium pt-0.5">
                        <span className="font-bold text-slate-900 font-mono">VALOR: R$ {rifaInfo.value.toFixed(2)}</span>
                        {rifaInfo.sponsors && (
                          <span className="truncate max-w-[40%] text-slate-600">Apoio: {rifaInfo.sponsors}</span>
                        )}
                        <span className="font-mono text-[6px]">AUT: {rifaInfo.auditId}</span>
                      </div>
                    </div>

                    {/* Cut Scissor indicators */}
                    {rifaInfo.showCropLines !== false && (
                      <div className="absolute right-1 top-1/2 transform -translate-y-1/2 opacity-30 pointer-events-none">
                        <Scissors className="w-3 h-3 text-slate-600" />
                      </div>
                    )}

                    {/* Fold Mark indicator */}
                    {rifaInfo.showFoldMarks !== false && (
                      <div className="absolute -left-[1px] top-0 bottom-0 border-l border-amber-500/40 opacity-40 pointer-events-none"></div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Page Bottom Footer */}
          <div className="pt-2 border-t text-center text-[7.5px] text-slate-400 font-mono shrink-0 mt-2">
            Documento oficial gerado pelo ecossistema Classium • ID de Autenticidade: {rifaInfo.auditId} • Folha {page.pageNumber} de {page.totalPages}
          </div>
        </div>
      ))}
    </div>,
    document.body
  );
}

