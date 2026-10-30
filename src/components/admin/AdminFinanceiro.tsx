import React, { useState } from 'react';
import { 
  DollarSign, Percent, TrendingUp, TrendingDown, ArrowRight, Download, 
  CheckCircle2, RefreshCw, FileText, Calendar, Sparkles
} from 'lucide-react';

export function AdminFinanceiro() {
  // Renegociação state
  const [selectedDebtor, setSelectedDebtor] = useState('Família Silva (João Silva)');
  const [originalDebt, setOriginalDebt] = useState<number>(3200);
  const [discountPercent, setDiscountPercent] = useState<number>(15);
  const [installments, setInstallments] = useState<number>(6);
  const [renegociationSuccess, setRenegociationSuccess] = useState(false);

  // Calculate renegociação
  const discountAmount = originalDebt * (discountPercent / 100);
  const finalDebt = originalDebt - discountAmount;
  const installmentValue = finalDebt / installments;

  const handleApplyNegotiation = () => {
    setRenegociationSuccess(true);
    setTimeout(() => {
      setRenegociationSuccess(false);
      setOriginalDebt(0);
    }, 4000);
  };

  // Accounting DRE rows
  const dreRevenues = [
    { label: 'Mensalidades Escolares', value: 142000 },
    { label: 'Venda de Uniformes', value: 8500 },
    { label: 'Biblioteca / Multas / Taxas', value: 3700 }
  ];

  const dreExpenses = [
    { label: 'Folha de Pagamento (Docentes & Apoio)', value: 82000 },
    { label: 'Custos Operacionais (Água, Energia, Internet)', value: 12500 },
    { label: 'Infraestrutura de TI & Licenças Cloud', value: 4500 },
    { label: 'Impostos & Taxas Fiscais', value: 9200 }
  ];

  const totalRevenues = dreRevenues.reduce((a, b) => a + b.value, 0);
  const totalExpenses = dreExpenses.reduce((a, b) => a + b.value, 0);
  const netProfit = totalRevenues - totalExpenses;

  return (
    <div className="space-y-6 text-left">
      
      {/* KPI Cards row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* KPI 1: Faturamento */}
        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl relative overflow-hidden flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-900/30 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Faturamento Mensal</p>
            <p className="text-xl font-bold text-white">R$ 154.200</p>
            <p className="text-[10px] text-green-400 font-medium">+4.2% vs mês anterior</p>
          </div>
        </div>

        {/* KPI 2: Arrecadado */}
        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl relative overflow-hidden flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-900/30 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Total Arrecadado</p>
            <p className="text-xl font-bold text-white">R$ 148.330</p>
            <p className="text-[10px] text-green-400 font-medium">96.2% de adimplência</p>
          </div>
        </div>

        {/* KPI 3: Inadimplência */}
        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl relative overflow-hidden flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-900/30 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <TrendingDown className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Inadimplência Ativa</p>
            <p className="text-xl font-bold text-white">R$ 5.870</p>
            <p className="text-[10px] text-rose-400 font-medium">3.8% de atraso ativo</p>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Renegociação Wizard (Col 5) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
              <Percent className="w-5 h-5 text-[#D4AF37]" />
              <h3 className="font-serif text-sm font-bold text-white">Renegociador de Dívidas (SaaS)</h3>
            </div>

            {renegociationSuccess ? (
              <div className="p-4 bg-green-950/30 border border-green-500/20 rounded-xl space-y-2 text-center">
                <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto" />
                <p className="text-xs font-bold text-white">Contrato de Acordo Emitido!</p>
                <p className="text-[11px] text-slate-300">
                  Enviado boleto unificado e termo de renegociação no e-mail do responsável financeiro.
                </p>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase">Devedor Selecionado</label>
                  <select
                    value={selectedDebtor}
                    onChange={(e) => {
                      setSelectedDebtor(e.target.value);
                      setOriginalDebt(e.target.value.includes('Silva') ? 3200 : 1800);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-semibold"
                  >
                    <option value="Família Silva (João Silva)">Família Silva (João Silva) - Atraso: R$ 3.200</option>
                    <option value="Família Souza (Pedro Souza)">Família Souza (Pedro Souza) - Atraso: R$ 1.800</option>
                  </select>
                </div>

                {originalDebt > 0 && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold uppercase">Desconto Proposto (%)</label>
                        <input
                          type="number"
                          value={discountPercent}
                          onChange={(e) => setDiscountPercent(Number(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono"
                          max={90}
                          min={0}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold uppercase">Nº de Parcelas</label>
                        <select
                          value={installments}
                          onChange={(e) => setInstallments(Number(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono"
                        >
                          <option value={1}>1x (À Vista)</option>
                          <option value={3}>3x sem juros</option>
                          <option value={6}>6x mensais</option>
                          <option value={12}>12x anuais</option>
                        </select>
                      </div>
                    </div>

                    {/* Live values math */}
                    <div className="p-3 bg-slate-950 rounded-xl space-y-1.5 text-[11px] font-mono">
                      <div className="flex justify-between text-slate-400">
                        <span>Valor Original:</span>
                        <span>R$ {originalDebt.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-green-400">
                        <span>Desconto IA:</span>
                        <span>- R$ {discountAmount.toFixed(2)} ({discountPercent}%)</span>
                      </div>
                      <div className="flex justify-between text-white font-bold border-t border-slate-900 pt-1.5">
                        <span>Dívida Negociada:</span>
                        <span>R$ {finalDebt.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-[#D4AF37] font-semibold">
                        <span>Valor por parcela:</span>
                        <span>{installments}x de R$ {installmentValue.toFixed(2)}</span>
                      </div>
                    </div>

                    <button
                      onClick={handleApplyNegotiation}
                      className="w-full py-2.5 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-slate-950 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-1.5"
                    >
                      Homologar Acordo Financeiro <ArrowRight className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Corporate DRE table (Col 7) */}
        <div className="lg:col-span-7 bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-serif text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#D4AF37]" /> DRE (Demonstrativo do Resultado do Exercício)
              </h3>
              <p className="text-[10px] text-slate-400">Sincronizado automaticamente com o sistema fiscal da receita.</p>
            </div>
            <button className="p-1.5 bg-slate-950 border border-slate-800 rounded-lg text-[10px] text-slate-300 hover:text-white flex items-center gap-1">
              <Download className="w-3.5 h-3.5" /> Exportar Planilha
            </button>
          </div>

          <div className="space-y-4 text-xs font-mono">
            {/* Revenues Section */}
            <div className="space-y-1.5">
              <p className="font-bold text-[#D4AF37] text-[10px] uppercase tracking-wider border-b border-slate-900 pb-1">1. RECEITAS OPERACIONAIS BRUTAS (+)</p>
              {dreRevenues.map(r => (
                <div key={r.label} className="flex justify-between text-slate-300 text-[11px]">
                  <span>{r.label}</span>
                  <span>R$ {r.value.toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between text-white font-bold pt-1 border-t border-slate-900/50">
                <span>TOTAL DE RECEITAS:</span>
                <span>R$ {totalRevenues.toLocaleString()}</span>
              </div>
            </div>

            {/* Expenses Section */}
            <div className="space-y-1.5">
              <p className="font-bold text-rose-400 text-[10px] uppercase tracking-wider border-b border-slate-900 pb-1">2. DESPESAS E CUSTOS OPERACIONAIS (-)</p>
              {dreExpenses.map(e => (
                <div key={e.label} className="flex justify-between text-slate-300 text-[11px]">
                  <span>{e.label}</span>
                  <span>R$ {e.value.toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between text-white font-bold pt-1 border-t border-slate-900/50">
                <span>TOTAL DE DESPESAS:</span>
                <span>R$ {totalExpenses.toLocaleString()}</span>
              </div>
            </div>

            {/* Net profit result */}
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 flex justify-between items-center text-xs">
              <div>
                <p className="font-bold text-white">3. RESULTADO LÍQUIDO DO EXERCÍCIO (=)</p>
                <p className="text-[10px] text-slate-400 font-sans">Superávit operacional líquido da escola</p>
              </div>
              <span className="text-md font-bold text-emerald-400">R$ {netProfit.toLocaleString()}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Open finance syncing bar */}
      <div className="p-3.5 bg-slate-950 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#D4AF37] animate-pulse" />
          <span className="text-slate-400">Sincronizador Open Finance & Pix Escolar:</span>
          <span className="text-green-500 font-bold">● Ativo & Conectado</span>
        </div>
        <span className="text-[10px] text-slate-500 font-mono">Última checagem bancária: há 2 min</span>
      </div>

    </div>
  );
}
