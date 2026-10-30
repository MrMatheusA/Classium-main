import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  ImageIcon,
  Loader2,
  Plus,
  RotateCw,
  Trash2,
  Upload,
  Utensils,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { usePlatform } from '../../context/PlatformContext';
import { menuService, ActiveMenuDocument } from '../../services/menuService';
import { CardapioDocumentViewer } from '../cardapio/CardapioDocumentViewer';
import { Badge, Button, Card, EmptyState, Toast, cx } from '../ui/kit';
import { ConfirmModal, ModuleHeader } from '../ui/ModuleParts';

const MONTHS = [
  { num: 1, short: 'Jan', long: 'janeiro' },
  { num: 2, short: 'Fev', long: 'fevereiro' },
  { num: 3, short: 'Mar', long: 'março' },
  { num: 4, short: 'Abr', long: 'abril' },
  { num: 5, short: 'Mai', long: 'maio' },
  { num: 6, short: 'Jun', long: 'junho' },
  { num: 7, short: 'Jul', long: 'julho' },
  { num: 8, short: 'Ago', long: 'agosto' },
  { num: 9, short: 'Set', long: 'setembro' },
  { num: 10, short: 'Out', long: 'outubro' },
  { num: 11, short: 'Nov', long: 'novembro' },
  { num: 12, short: 'Dez', long: 'dezembro' },
];

/** Ano atual, dois para trás e um para frente */
const THIS_YEAR = new Date().getFullYear();
const AVAILABLE_YEARS = [THIS_YEAR - 2, THIS_YEAR - 1, THIS_YEAR, THIS_YEAR + 1];

export interface CardapioPanelProps {
  initialMonth?: number;
  initialYear?: number;
  schoolId?: string;
  organizationId?: string;
  readOnly?: boolean;
  className?: string;
}

export const CardapioPanel: React.FC<CardapioPanelProps> = ({
  initialMonth = new Date().getMonth() + 1,
  initialYear = new Date().getFullYear(),
  schoolId,
  organizationId,
  readOnly = false,
  className = '',
}) => {
  const { profile, user } = useAuth();
  const { currentOrganizationId } = usePlatform();

  const activeOrgId = organizationId || profile?.organization_id || currentOrganizationId || null;
  const activeSchoolId = schoolId || profile?.school_id || (user as any)?.school_id || undefined;

  const [selectedYear, setSelectedYear] = useState<number>(initialYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(initialMonth);

  const [documents, setDocuments] = useState<ActiveMenuDocument[]>([]);
  const [selectedDocIndex, setSelectedDocIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [rotationDegrees, setRotationDegrees] = useState<number>(0);

  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadStatusText, setUploadStatusText] = useState<string>('');
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'danger' | 'info' } | null>(null);

  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [docToDelete, setDocToDelete] = useState<ActiveMenuDocument | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const monthInfo = MONTHS.find((m) => m.num === selectedMonth) || MONTHS[0];
  const periodLabel = `${monthInfo.long} de ${selectedYear}`;

  const showToast = (text: string, type: 'success' | 'danger' | 'info' = 'success') => setToast({ text, type });

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(t);
  }, [toast]);

  const loadDocuments = useCallback(
    async (shouldSelectLast = false) => {
      setIsLoading(true);
      try {
        const docs = await menuService.getMenuDocumentsForMonth(selectedYear, selectedMonth, activeSchoolId);
        setDocuments(docs);
        if (docs.length > 0) {
          if (shouldSelectLast) setSelectedDocIndex(docs.length - 1);
          else setSelectedDocIndex((prev) => (prev >= docs.length ? 0 : prev));
        } else {
          setSelectedDocIndex(0);
        }
      } catch (err) {
        console.error('[CardapioPanel] Erro ao carregar cardápios:', err);
        showToast('Não foi possível carregar os cardápios. Tente de novo.', 'danger');
      } finally {
        setIsLoading(false);
      }
    },
    [selectedYear, selectedMonth, activeSchoolId],
  );

  useEffect(() => {
    loadDocuments();
    const unsubscribe = menuService.subscribeToMenuChanges(selectedYear, selectedMonth, () => loadDocuments(), activeSchoolId);
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [loadDocuments, selectedYear, selectedMonth, activeSchoolId]);

  const activeDoc: ActiveMenuDocument | undefined = documents[selectedDocIndex];

  const resetView = () => {
    setRotationDegrees(0);
    setZoomLevel(100);
  };
  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 20, 250));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 20, 50));
  const handleRotate = () => setRotationDegrees((prev) => (prev + 90) % 360);

  const handlePrevDoc = () => {
    if (documents.length <= 1) return;
    setSelectedDocIndex((prev) => (prev > 0 ? prev - 1 : documents.length - 1));
    resetView();
  };
  const handleNextDoc = () => {
    if (documents.length <= 1) return;
    setSelectedDocIndex((prev) => (prev < documents.length - 1 ? prev + 1 : 0));
    resetView();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!activeOrgId) {
      showToast('Não identificamos a escola. Entre de novo no painel e tente outra vez.', 'danger');
      if (e.target) e.target.value = '';
      return;
    }

    setIsUploading(true);
    const monthName = monthInfo.short.toUpperCase();

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadStatusText(files.length > 1 ? `Enviando ${i + 1} de ${files.length}: ${file.name}` : `Enviando ${file.name}`);

        const cleanName = file.name.replace(/\.[^/.]+$/, '');
        const title = files.length === 1 ? `Cardápio — ${monthName}/${selectedYear}` : `Cardápio (${cleanName}) — ${monthName}/${selectedYear}`;

        await menuService.uploadAndPublishMenu({
          title,
          file,
          year: selectedYear,
          month: selectedMonth,
          school_id: activeSchoolId,
          organization_id: activeOrgId,
          is_published: true,
        });
      }

      showToast(files.length === 1 ? 'Cardápio publicado. As famílias já podem ver.' : `${files.length} cardápios publicados.`);
      await loadDocuments(true);
    } catch (err: any) {
      console.error('[Upload] Falha:', err);
      showToast(err?.message || 'Não foi possível enviar o arquivo.', 'danger');
    } finally {
      setIsUploading(false);
      setUploadStatusText('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const triggerFileInput = () => fileInputRef.current?.click();

  const confirmDeleteDoc = async () => {
    if (!docToDelete) return;
    setIsDeleting(true);
    try {
      await menuService.deleteMenuDocument(docToDelete.id, docToDelete.file_url);
      showToast('Cardápio excluído.', 'info');
      setDocToDelete(null);
      await loadDocuments();
    } catch (err) {
      console.error('[Delete] Erro ao excluir:', err);
      showToast('Não foi possível excluir o cardápio.', 'danger');
    } finally {
      setIsDeleting(false);
    }
  };

  const isCurrentPdf = Boolean(activeDoc && (activeDoc.file_type === 'pdf' || (activeDoc.file_url && activeDoc.file_url.toLowerCase().includes('.pdf'))));

  return (
    <div id="cardapio-modulo-raiz" className={cx('w-full space-y-6 text-left', className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,image/png,image/jpeg,image/webp,application/pdf"
        multiple
        onChange={handleFileChange}
        className="hidden"
        id="cardapio-file-native-input"
      />

      <ModuleHeader
        icon={Utensils}
        title="Cardápio escolar"
        text="Publique o cardápio de cada mês em PDF ou imagem. As famílias veem no Portal da Família."
        actions={
          !readOnly && (
            <Button icon={Plus} onClick={triggerFileInput} loading={isUploading}>
              Anexar cardápio
            </Button>
          )
        }
      >
        {/* Ano + meses */}
        <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-5 md:flex-row md:items-center md:justify-between">
          <div role="radiogroup" aria-label="Ano" className="inline-flex w-max rounded-full border border-[var(--border)] bg-[var(--bg-card-alt)] p-1">
            {AVAILABLE_YEARS.map((year) => {
              const active = selectedYear === year;
              return (
                <button
                  key={year}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setSelectedYear(year)}
                  className={cx(
                    'h-8 rounded-full px-3.5 text-[13px] font-semibold tabular-nums transition-colors',
                    active ? 'bg-[var(--bg-card)] text-[var(--text-heading)] shadow-[0_1px_3px_rgba(16,24,40,0.12)]' : 'text-[var(--text-muted)] hover:text-[var(--text-heading)]',
                  )}
                >
                  {year}
                </button>
              );
            })}
          </div>

          <div role="radiogroup" aria-label="Mês" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 md:pb-0">
            {MONTHS.map((m) => {
              const active = selectedMonth === m.num;
              return (
                <button
                  key={m.num}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={m.long}
                  onClick={() => setSelectedMonth(m.num)}
                  className={cx(
                    'h-9 shrink-0 rounded-full px-3 text-[13px] font-semibold transition-colors',
                    active ? '' : 'text-[var(--text-muted)] hover:bg-[var(--bg-card-alt)] hover:text-[var(--text-heading)]',
                  )}
                  style={active ? { background: 'var(--accent)', color: 'var(--accent-fg)' } : undefined}
                >
                  {m.short}
                </button>
              );
            })}
          </div>
        </div>
      </ModuleHeader>

      <Card padded={false} className="overflow-hidden">
        {/* Barra do documento */}
        {documents.length > 0 && activeDoc && !isLoading && (
          <div className="flex flex-col gap-3 border-b border-[var(--border)] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                {isCurrentPdf ? <FileText className="h-[18px] w-[18px]" /> : <ImageIcon className="h-[18px] w-[18px]" />}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold text-[var(--text-heading)]">{activeDoc.title || `Cardápio de ${periodLabel}`}</p>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-[var(--text-muted)]">
                  <span className="truncate">{activeDoc.file_name || (isCurrentPdf ? 'PDF' : 'Imagem')}</span>
                  {activeDoc.file_size && <span>· {activeDoc.file_size}</span>}
                  <Badge tone="success">Publicado</Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={activeDoc.file_url}
                target="_blank"
                rel="noreferrer"
                download
                className="inline-flex h-9 items-center gap-2 rounded-full border border-[var(--border)] px-3.5 text-[13px] font-semibold text-[var(--text-heading)] transition-colors hover:border-[var(--accent)]"
              >
                <Download className="h-4 w-4" />
                Baixar
              </a>
              {!readOnly && (
                <Button size="sm" variant="ghost" icon={Trash2} onClick={() => setDocToDelete(activeDoc)} aria-label="Excluir este cardápio">
                  Excluir
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Visualizador */}
        <div className="relative flex min-h-[460px] items-center justify-center bg-[var(--bg-card-alt)] p-3 sm:p-5">
          {isLoading ? (
            <div className="flex flex-col items-center gap-3 text-[var(--text-muted)]">
              <Loader2 className="h-7 w-7 animate-spin" style={{ color: 'var(--accent)' }} />
              <span className="text-[13px]">Carregando cardápios de {periodLabel}…</span>
            </div>
          ) : isUploading ? (
            <div className="flex max-w-sm flex-col items-center gap-3 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                <Upload className="h-6 w-6" />
              </span>
              <p className="text-[15px] font-semibold text-[var(--text-heading)]">{uploadStatusText || 'Enviando o cardápio…'}</p>
              <p className="text-[13px] text-[var(--text-muted)]">Assim que terminar, ele aparece aqui.</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="w-full max-w-lg">
              <EmptyState
                icon={Utensils}
                title={`Nenhum cardápio em ${periodLabel}`}
                text={readOnly ? 'A escola ainda não publicou o cardápio deste mês.' : 'Envie um PDF ou uma foto do cardápio. Dá para anexar mais de um arquivo.'}
                action={
                  !readOnly && (
                    <Button icon={Plus} onClick={triggerFileInput}>
                      Anexar cardápio
                    </Button>
                  )
                }
              />
            </div>
          ) : (
            <CardapioDocumentViewer
              fileUrl={activeDoc?.file_url || ''}
              fileType={activeDoc?.file_type || 'pdf'}
              fileName={activeDoc?.file_name || activeDoc?.title || 'Cardápio escolar'}
              zoom={zoomLevel}
              rotation={rotationDegrees}
              onZoomChange={setZoomLevel}
              onRotationChange={setRotationDegrees}
              hideControls={true}
              className="h-full w-full"
            />
          )}
        </div>

        {/* Controles */}
        {documents.length > 0 && !isLoading && !isUploading && (
          <div className="flex flex-col items-center justify-between gap-3 border-t border-[var(--border)] p-4 sm:flex-row sm:px-5">
            <div className="flex items-center gap-1">
              {documents.length > 1 ? (
                <>
                  <ToolButton icon={ChevronLeft} label="Cardápio anterior" onClick={handlePrevDoc} />
                  <span className="px-2 text-[13px] font-semibold tabular-nums text-[var(--text-heading)]">
                    {selectedDocIndex + 1} de {documents.length}
                  </span>
                  <ToolButton icon={ChevronRight} label="Próximo cardápio" onClick={handleNextDoc} />
                </>
              ) : (
                <span className="text-[13px] text-[var(--text-muted)]">1 arquivo neste mês</span>
              )}
            </div>

            <div className="flex items-center gap-1">
              <ToolButton icon={ZoomOut} label="Diminuir" onClick={handleZoomOut} disabled={zoomLevel <= 50} />
              <button
                type="button"
                onClick={resetView}
                title="Voltar ao tamanho normal"
                className="h-9 min-w-[64px] rounded-full px-2 text-[13px] font-semibold tabular-nums text-[var(--text-heading)] hover:bg-[var(--bg-card-alt)]"
              >
                {zoomLevel}%
              </button>
              <ToolButton icon={ZoomIn} label="Aumentar" onClick={handleZoomIn} disabled={zoomLevel >= 250} />
              <span className="mx-1 h-5 w-px bg-[var(--border)]" aria-hidden />
              <ToolButton icon={RotateCw} label="Girar 90°" onClick={handleRotate} />
            </div>
          </div>
        )}
      </Card>

      <ConfirmModal
        open={Boolean(docToDelete)}
        onClose={() => setDocToDelete(null)}
        onConfirm={confirmDeleteDoc}
        loading={isDeleting}
        title="Excluir cardápio?"
        confirmLabel="Excluir"
        icon={Trash2}
      >
        <strong className="text-[var(--text-heading)]">“{docToDelete?.title}”</strong> deixa de aparecer para as famílias e o arquivo é apagado. Não dá para desfazer.
      </ConfirmModal>

      <Toast message={toast?.text ?? null} tone={toast?.type} onClose={() => setToast(null)} />
    </div>
  );
};

function ToolButton({ icon: Icon, label, onClick, disabled }: { icon: React.ElementType; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-card-alt)] hover:text-[var(--text-heading)] disabled:opacity-40"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

export default CardapioPanel;