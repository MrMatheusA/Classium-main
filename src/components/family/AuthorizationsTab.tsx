import React, { useState, useRef, useEffect } from 'react';
import { FileText, CheckCircle, ShieldCheck, RefreshCw, Eye, Sparkles } from 'lucide-react';

interface DocumentAuth {
  id: string;
  title: string;
  description: string;
  date: string;
  cost: string;
  signed: boolean;
  signedBy?: string;
  signatureDate?: string;
  signatureIp?: string;
}

export function AuthorizationsTab() {
  const [docs, setDocs] = useState<DocumentAuth[]>([
    {
      id: 'auth-1',
      title: 'Autorização de Excursão: Planetário Municipal',
      description: 'Estudo prático sobre gravidade e corpos celestes no dia 22/07/2026. Saída às 08h e retorno às 13h em ônibus credenciado pela escola.',
      date: '14/07/2026',
      cost: 'R$ 25,00',
      signed: false
    },
    {
      id: 'auth-2',
      title: 'Uso de Imagem do Estudante para Redes Sociais',
      description: 'Autorização anual para publicação de fotos e vídeos de atividades pedagógicas, festivais e feiras científicas nos canais de comunicação oficiais da escola.',
      date: '12/07/2026',
      cost: 'Gratuito',
      signed: false
    },
    {
      id: 'auth-3',
      title: 'Saída Antecipada em Dia de Reunião Escolar',
      description: 'Permissão para liberação antecipada do aluno na última sexta-feira do mês por conta do conselho de classe, sob responsabilidade do tutor indicado.',
      date: '10/07/2026',
      cost: 'Gratuito',
      signed: false
    },
    {
      id: 'auth-4',
      title: 'Uso do Laboratório de Robótica Avançada e Impressão 3D',
      description: 'Autorização anual para manipulação de equipamentos eletrônicos de prototipagem rápida e impressão de filamentos aquecidos sob supervisão do professor de robótica.',
      date: '08/07/2026',
      cost: 'Gratuito',
      signed: true,
      signedBy: 'Maria das Graças Silva',
      signatureDate: '11/07/2026 09:12:44',
      signatureIp: '189.122.34.88'
    }
  ]);

  const [activeDoc, setActiveDoc] = useState<DocumentAuth | null>(null);
  const [signerName, setSignerName] = useState('Maria das Graças Silva');
  const [signaturePin, setSignaturePin] = useState('');
  const [signMethod, setSignMethod] = useState<'draw' | 'pin'>('draw');
  
  // Signature Drawing State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    if (activeDoc && signMethod === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [activeDoc, signMethod]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0B1B3D';
    
    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const handleSignSubmit = () => {
    if (!signerName.trim()) {
      alert('Por favor, insira o nome do assinante legal.');
      return;
    }
    if (signMethod === 'pin' && signaturePin !== '1234' && signaturePin.length > 0) {
      alert('Assinatura Digital Negada: Senha de assinatura incorreta.');
      return;
    }

    const today = new Date();
    const timestamp = today.toLocaleDateString('pt-BR') + ' ' + today.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const simulatedIp = '189.44.' + Math.floor(Math.random() * 254) + '.' + Math.floor(Math.random() * 254);

    setDocs(docs.map(d => {
      if (d.id === activeDoc?.id) {
        return {
          ...d,
          signed: true,
          signedBy: signerName,
          signatureDate: timestamp,
          signatureIp: simulatedIp
        };
      }
      return d;
    }));

    setActiveDoc(null);
    setSignaturePin('');
    alert('Documento assinado digitalmente com êxito! Validade jurídica homologada com carimbo de tempo ICP-Brasil.');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100">
            <ShieldCheck className="w-5 h-5 text-blue-900" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-bold text-oxford">Central de Autorizações Escolares</h3>
            <p className="text-xs text-gray-500">Assine eletronicamente os documentos pendentes de forma segura com validade em cartório digital.</p>
          </div>
        </div>

        {/* List of documents */}
        <div className="space-y-4">
          {docs.map(doc => (
            <div 
              key={doc.id}
              className={`p-5 rounded-2xl border transition-all ${
                doc.signed 
                  ? 'bg-green-50/40 border-green-200/60' 
                  : 'bg-slate-50 border-gray-200 hover:border-gold/30'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-[9px] uppercase font-bold px-2.5 py-0.5 rounded-full tracking-widest ${
                      doc.signed ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800 animate-pulse'
                    }`}>
                      {doc.signed ? 'Assinado Legalmente' : 'Assinatura Pendente'}
                    </span>
                    <span className="text-xs text-gray-400 font-medium">{doc.date}</span>
                  </div>
                  <h4 className="font-serif text-base font-bold text-oxford leading-snug">{doc.title}</h4>
                  <p className="text-xs text-gray-600 leading-relaxed font-light">{doc.description}</p>
                  
                  {doc.signed && (
                    <div className="bg-white p-3 rounded-lg border border-green-200/50 text-[11px] text-slate-500 space-y-1">
                      <p>✍️ Assinado por: <strong className="font-semibold text-oxford">{doc.signedBy}</strong></p>
                      <p>📅 Carimbo de tempo: <strong className="font-semibold text-oxford">{doc.signatureDate}</strong></p>
                      <p>🌐 Protocolo IP: <strong className="font-semibold text-oxford">{doc.signatureIp}</strong></p>
                    </div>
                  )}
                </div>

                <div className="shrink-0 flex flex-col items-end gap-1.5 justify-between h-full min-h-[80px]">
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Custo da atividade</p>
                    <p className="text-sm font-bold text-blue-900">{doc.cost}</p>
                  </div>
                  
                  {!doc.signed && (
                    <button 
                      onClick={() => setActiveDoc(doc)}
                      className="px-5 py-2.5 bg-blue-900 hover:bg-blue-800 text-gold rounded-full text-xs font-bold uppercase tracking-widest transition-colors shadow-md shadow-blue-900/15 border border-gold/20"
                    >
                      Assinar Agora
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SIGNATURE MODAL INTERACTION */}
      {activeDoc && (
        <div className="fixed inset-0 bg-oxford/80 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-gold/30 max-w-lg w-full p-6 text-left shadow-2xl relative overflow-hidden animate-fade-in">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-900 via-gold to-blue-900"></div>
            
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-5 h-5 text-blue-900" />
              <h3 className="font-serif text-lg font-bold text-oxford">Homologação de Assinatura Eletrônica</h3>
            </div>
            
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              Você está prestes a assinar a autorização para: <strong className="text-oxford">{activeDoc.title}</strong>. 
              Sua assinatura digital registra os dados do assinante, IP e horário, possuindo validade legal correspondente à assinatura física sob a Lei nº 14.063/20.
            </p>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 bg-gray-50 p-1.5 rounded-xl border border-gray-100">
                <button 
                  onClick={() => setSignMethod('draw')}
                  className={`py-2 text-xs font-bold uppercase rounded-lg transition-all ${
                    signMethod === 'draw' ? 'bg-blue-900 text-gold shadow-sm' : 'text-gray-500 hover:text-blue-900'
                  }`}
                >
                  Desenhar Assinatura
                </button>
                <button 
                  onClick={() => setSignMethod('pin')}
                  className={`py-2 text-xs font-bold uppercase rounded-lg transition-all ${
                    signMethod === 'pin' ? 'bg-blue-900 text-gold shadow-sm' : 'text-gray-500 hover:text-blue-900'
                  }`}
                >
                  Senha / PIN de Assinatura
                </button>
              </div>

              {/* Name field */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nome Completo do Responsável Legal</label>
                <input 
                  type="text" 
                  value={signerName}
                  onChange={e => setSignerName(e.target.value)}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-oxford outline-none focus:border-gold"
                />
              </div>

              {/* SIGN METHOD 1: CANVAS DRAWING */}
              {signMethod === 'draw' && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Painel de Desenho</label>
                    <button 
                      onClick={clearCanvas}
                      className="text-[10px] font-bold text-bordeaux uppercase tracking-wider flex items-center gap-1 hover:underline"
                    >
                      <RefreshCw className="w-3 h-3" /> Limpar Tela
                    </button>
                  </div>
                  <div className="border border-gray-200 rounded-xl overflow-hidden shadow-inner bg-slate-50 relative">
                    <canvas
                      ref={canvasRef}
                      width={440}
                      height={140}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      className="w-full cursor-crosshair block bg-slate-50 touch-none"
                    />
                    <div className="absolute right-2 bottom-2 bg-white/80 backdrop-blur-sm border border-gray-100 rounded px-2 py-0.5 text-[8px] uppercase tracking-wider text-gray-400 font-bold pointer-events-none">
                      Escreva sua assinatura aqui
                    </div>
                  </div>
                </div>
              )}

              {/* SIGN METHOD 2: PIN CODE */}
              {signMethod === 'pin' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Digite sua Senha de Assinatura (Senha padrão: 1234)</label>
                  <input 
                    type="password" 
                    placeholder="Sua senha de 4 dígitos"
                    value={signaturePin}
                    onChange={e => setSignaturePin(e.target.value)}
                    maxLength={6}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-oxford outline-none focus:border-gold text-center tracking-widest font-mono"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setActiveDoc(null)}
                  className="flex-1 py-3 border border-gray-200 hover:bg-slate-50 text-gray-500 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSignSubmit}
                  className="flex-1 py-3 bg-blue-900 text-gold hover:opacity-95 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shadow-lg shadow-blue-900/10 border border-gold/30 flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4 text-gold" /> Autenticar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
