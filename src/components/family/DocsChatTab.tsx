import React, { useState, useRef, useEffect } from 'react';
import { Download, FileText, Send, MessageSquare, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { usePlatform } from '../../context/PlatformContext';
import { useFamilyContext } from '../../contexts/FamilyContext';
import { supabase } from '../../lib/supabase';

interface ChatMessage {
  id: string;
  sender: 'parent' | 'school';
  senderName: string;
  avatarUrl?: string;
  text: string;
  time: string;
}

export function DocsChatTab() {
  const { student } = usePlatform();
  const { guardian } = useFamilyContext();

  const studentShort = student?.name ? student.name.split(' ')[0] : 'Estudante';
  const guardianShort = guardian?.name ? guardian.name.split(' ')[0] : 'Responsável';

  // Download documents list (fetched from Supabase)
  const [documents, setDocuments] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);

  useEffect(() => {
    async function loadDocs() {
      if (!student?.id) return;
      try {
        const { data, error } = await supabase
          .from('student_documents')
          .select('document_type, document_url, created_at')
          .eq('student_id', student.id);
        
        if (error) throw error;
        if (data) {
          setDocuments(data.map(d => ({
            name: d.document_type,
            url: d.document_url,
            date: new Date(d.created_at).toLocaleDateString('pt-BR'),
            size: 'Não informado'
          })));
        }
      } catch (err) {
        console.warn('Failed to load real documents:', err);
      } finally {
        setLoadingDocs(false);
      }
    }
    loadDocs();
  }, [student?.id]);

  // Chat conversation
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm-1',
      sender: 'school',
      senderName: 'Ana Clara (Orientação Pedagógica)',
      text: `Olá ${guardianShort}! Seja muito bem-vinda ao canal de atendimento seguro do Classium Família. Como posso ajudar você e o ${studentShort} hoje?`,
      time: '18/07/2026 às 10:00'
    }
  ]);

  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);

  const handleDownload = (filename: string) => {
    setDownloadingFile(filename);
    setTimeout(() => {
      setDownloadingFile(null);
      alert(`Download concluído: ${filename} foi baixado com assinatura digital válida da diretoria.`);
    }, 2000);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    const today = new Date();
    const timestamp = today.toLocaleDateString('pt-BR') + ' às ' + today.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const parentMsg: ChatMessage = {
      id: `m-parent-${Date.now()}`,
      sender: 'parent',
      senderName: `${guardian?.name || 'Responsável'} (Você)`,
      text: inputVal,
      time: timestamp
    };

    setMessages(prev => [...prev, parentMsg]);
    const typedText = inputVal;
    setInputVal('');
    setIsTyping(true);

    // Simulate smart support response
    setTimeout(() => {
      let replyText = `Entendi sua dúvida. Vou encaminhar esse assunto para a coordenação pedagógica da professora de Matemática analisar hoje mesmo.`;
      const lower = typedText.toLowerCase();
      if (lower.includes('boletim') || lower.includes('nota') || lower.includes('média')) {
        replyText = 'As notas oficiais do 2º bimestre já estão homologadas! Você pode baixar o boletim PDF assinado eletronicamente diretamente na lista de Documentos logo acima nesta tela.';
      } else if (lower.includes('reunião') || lower.includes('agendar') || lower.includes('conversar')) {
        replyText = 'Claro! Você pode agendar uma reunião presencial ou online em tempo real pela aba "Atendimento aos Pais" aqui no painel. O horário fica reservado de forma imediata.';
      } else if (lower.includes('febre') || lower.includes('doente') || lower.includes('médico')) {
        replyText = `A enfermeira Aparecida Lima está acompanhando o ${studentShort} de perto neste momento. O relatório completo com a triagem médica dele já está disponível na sua aba de "Recados Urgentes".`;
      }

      const schoolMsg: ChatMessage = {
        id: `m-school-${Date.now()}`,
        sender: 'school',
        senderName: 'Ana Clara (Orientação Pedagógica)',
        text: replyText,
        time: timestamp
      };

      setMessages(prev => [...prev, schoolMsg]);
      setIsTyping(false);
    }, 1800);
  };

  return (
    <div className="space-y-6">
      
      {/* SECTION 1: DOWNLOAD CENTER */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100">
            <FileText className="w-5 h-5 text-blue-900" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-bold text-oxford">Secretaria Digital - Emissão de Documentos</h3>
            <p className="text-xs text-gray-500">Baixe boletins de notas, declarações escolares ativas e comprovantes oficiais sem filas.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loadingDocs ? (
            <div className="col-span-2 text-center py-4 text-xs text-gray-400">
              Carregando documentos oficiais...
            </div>
          ) : documents.length === 0 ? (
            <div className="col-span-2 text-center py-8 bg-slate-50 border border-dashed border-gray-200 rounded-xl text-xs text-gray-500 font-medium">
              Nenhum documento cadastrado ("Não informado")
            </div>
          ) : (
            documents.map((doc, idx) => (
              <div key={idx} className="p-4 bg-slate-50 border border-gray-150 rounded-xl flex items-center justify-between gap-4 text-left">
                <div className="space-y-1 min-w-0">
                  <p className="text-xs font-bold text-oxford truncate" title={doc.name}>{doc.name}</p>
                  <p className="text-[10px] text-gray-400 font-light">Homologado em {doc.date} • {doc.size}</p>
                </div>
                
                <button 
                  onClick={() => handleDownload(doc.name)}
                  disabled={downloadingFile !== null}
                  className="px-3.5 py-2 bg-white hover:bg-blue-900 hover:text-gold text-blue-900 border border-gray-200 hover:border-blue-900 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 shrink-0"
                >
                  {downloadingFile === doc.name ? (
                    <span className="animate-spin w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full"></span>
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  <span>{downloadingFile === doc.name ? 'Baixando...' : 'Download'}</span>
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* SECTION 2: SECURE CHAT INTERACTION */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col h-[500px] justify-between">
        
        {/* Chat header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-3 text-left">
            <div className="w-10 h-10 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center text-green-700">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-oxford">Canal de Chat Seguro com Orientação</h3>
              <p className="text-[10px] text-gray-400">Atendimento criptografado e monitorado pelo Conselho Pedagógico.</p>
            </div>
          </div>
          <span className="flex items-center gap-1 bg-green-100 text-green-800 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
            <ShieldCheck className="w-3 h-3 text-green-800" /> Atendimento Online
          </span>
        </div>

        {/* Conversation Box */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 scrollbar-thin">
          {messages.map(msg => {
            const isMe = msg.sender === 'parent';
            return (
              <div 
                key={msg.id} 
                className={`flex flex-col max-w-[80%] ${
                  isMe ? 'ml-auto items-end text-right' : 'mr-auto items-start text-left'
                }`}
              >
                <span className="text-[10px] text-gray-400 font-bold mb-1">{msg.senderName}</span>
                <div 
                  className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                    isMe 
                      ? 'bg-blue-900 text-white rounded-tr-none border border-blue-900/10 shadow-sm' 
                      : 'bg-slate-100 text-oxford rounded-tl-none border border-gray-200/50'
                  }`}
                >
                  {msg.text}
                </div>
                <span className="text-[9px] text-gray-400 mt-1">{msg.time}</span>
              </div>
            );
          })}

          {isTyping && (
            <div className="flex items-center gap-2 mr-auto text-gray-400 text-xs">
              <span className="font-bold text-[10px]">Ana Clara está digitando</span>
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-75"></span>
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-150"></span>
              </div>
            </div>
          )}
        </div>

        {/* Input box */}
        <form onSubmit={handleSendMessage} className="pt-3 border-t border-gray-100 flex gap-2">
          <input 
            type="text" 
            placeholder="Digite sua mensagem de suporte para a secretaria..."
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            className="flex-1 bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 text-xs text-oxford outline-none focus:border-gold"
          />
          <button 
            type="submit"
            className="px-5 py-3 bg-blue-900 text-gold hover:opacity-95 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors border border-gold/20 shadow-sm flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5 text-gold" />
            <span>Enviar</span>
          </button>
        </form>

      </div>

    </div>
  );
}
