import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Archive,
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  Edit3,
  Eye,
  Loader2,
  MapPin,
  Package,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Shirt,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { usePlatform } from '../../context/PlatformContext';
import { supabase } from '../../lib/supabase';
import { LostAndFoundService, LostAndFoundDbItem, DEFAULT_PHOTOS } from '../../services/lostFoundService';
import { Alert, Badge, Button, Card, EmptyState, Field, Modal, Skeleton, Toast, cx, inputCls } from '../ui/kit';
import { ConfirmModal, InfoRow, MetricStrip, ModuleHeader, RoundIconButton, Segmented } from '../ui/ModuleParts';

interface AdminLostFoundProps {
  selectedUnit?: string;
}

type StatusFilter = 'todos' | 'disponivel' | 'reservado' | 'entregue' | 'arquivado';

const CATEGORIES = ['Vestuário', 'Material Escolar', 'Acessórios/Eletrônicos', 'Garrafas/Utensílios', 'Outros'];
const SETORES = [
  { value: 'Quadra Poliesportiva', label: 'Quadra poliesportiva' },
  { value: 'Refeitório', label: 'Refeitório / pátio' },
  { value: 'Biblioteca', label: 'Biblioteca' },
  { value: 'Bloco A - Salas', label: 'Bloco A — salas de aula' },
  { value: 'Bloco B - Laboratórios', label: 'Bloco B — laboratórios' },
  { value: 'Portaria Principal', label: 'Portaria principal' },
];

const catLabel = (c?: string) => (c || 'Outros').replace('/', ' / ');

const isAvailableStatus = (s?: string) => s === 'disponivel' || s === 'available';
const isReservedStatus = (s?: string) => s === 'reservado' || s === 'reserved';
const isReturnedStatus = (s?: string) => s === 'entregue' || s === 'returned';
const isArchivedStatus = (s?: string) => s === 'arquivado' || s === 'discarded';

export function AdminLostFound({ selectedUnit: propUnit }: AdminLostFoundProps = {}) {
  const { schoolInfo, selectedUnit: contextUnit, user, addLostAndFoundItem, deliverLostAndFoundItem, archiveLostAndFoundItem } = usePlatform();

  const activeSchoolId = propUnit || contextUnit || schoolInfo?.id || user?.schoolId || '';

  const [dbItems, setDbItems] = useState<LostAndFoundDbItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'info' | 'danger' } | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');
  const [categoryFilter, setCategoryFilter] = useState<string>('Todas');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Janelas
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LostAndFoundDbItem | null>(null);
  const [selectedItemForDetails, setSelectedItemForDetails] = useState<LostAndFoundDbItem | null>(null);
  const [selectedItemForDelivery, setSelectedItemForDelivery] = useState<LostAndFoundDbItem | null>(null);
  const [itemToRelease, setItemToRelease] = useState<LostAndFoundDbItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<LostAndFoundDbItem | null>(null);
  const [busyAction, setBusyAction] = useState(false);

  // Formulário
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<string>('Material Escolar');
  const [formDescription, setFormDescription] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formSetor, setFormSetor] = useState('Quadra Poliesportiva');
  const [formPhotoUrl, setFormPhotoUrl] = useState('');
  const [formRegisteredBy, setFormRegisteredBy] = useState(user?.name || '');
  const [formError, setFormError] = useState<string | null>(null);

  // Entrega
  const [deliveryStaffName, setDeliveryStaffName] = useState(user?.name || '');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [isSubmittingDelivery, setIsSubmittingDelivery] = useState(false);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  const showToast = (text: string, type: 'success' | 'info' | 'danger' = 'success') => setToast({ text, type });

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(t);
  }, [toast]);

  const fetchItems = useCallback(async () => {
    try {
      setIsSyncing(true);
      setLoadError(null);
      const items = await LostAndFoundService.getItems(activeSchoolId);
      setDbItems(items);
    } catch (err) {
      console.warn('[AdminLostFound] Error fetching items:', err);
      setLoadError('Não foi possível carregar os objetos. Tente atualizar.');
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  }, [activeSchoolId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Atualização em tempo real
  useEffect(() => {
    const channel = supabase
      .channel(`admin_lost_found_realtime_${activeSchoolId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lost_and_found_items' }, () => fetchItems())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lost_and_found_reservations' }, () => fetchItems())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchItems, activeSchoolId]);

  // Números
  const todayBR = new Date().toLocaleDateString('pt-BR');
  const now = new Date();
  const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const registeredTodayCount = dbItems.filter((i) => i.found_date === todayBR || i.date_found === todayBR || i.found_date === todayISO).length;
  const reservedCount = dbItems.filter((i) => isReservedStatus(i.status)).length;
  const deliveredCount = dbItems.filter((i) => isReturnedStatus(i.status)).length;
  const availableCount = dbItems.filter((i) => isAvailableStatus(i.status)).length;
  const archivedCount = dbItems.filter((i) => isArchivedStatus(i.status)).length;

  const filteredItems = useMemo(
    () =>
      dbItems.filter((item) => {
        let matchesStatus = true;
        if (statusFilter === 'disponivel') matchesStatus = isAvailableStatus(item.status);
        else if (statusFilter === 'reservado') matchesStatus = isReservedStatus(item.status);
        else if (statusFilter === 'entregue') matchesStatus = isReturnedStatus(item.status);
        else if (statusFilter === 'arquivado') matchesStatus = isArchivedStatus(item.status);

        const matchesCategory = categoryFilter === 'Todas' || (item.category || '').toLowerCase() === categoryFilter.toLowerCase();

        const q = searchQuery.toLowerCase().trim();
        const matchesQuery =
          !q ||
          (item.name && item.name.toLowerCase().includes(q)) ||
          (item.description && item.description.toLowerCase().includes(q)) ||
          (item.location_found && item.location_found.toLowerCase().includes(q)) ||
          (item.setor && item.setor.toLowerCase().includes(q)) ||
          (item.reservation?.student_name && item.reservation.student_name.toLowerCase().includes(q)) ||
          (item.reservation?.responsible_name && item.reservation.responsible_name.toLowerCase().includes(q)) ||
          (item.claimed_by_name && item.claimed_by_name.toLowerCase().includes(q));

        return matchesStatus && matchesCategory && matchesQuery;
      }),
    [dbItems, statusFilter, categoryFilter, searchQuery],
  );

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingPhoto(true);
      const uploadedUrl = await LostAndFoundService.uploadPhoto(file, activeSchoolId);
      setFormPhotoUrl(uploadedUrl);
    } catch {
      setFormError('Não foi possível enviar a foto. Tente outra imagem.');
    } finally {
      setIsUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const openCreate = () => {
    setEditingItem(null);
    setFormName('');
    setFormDescription('');
    setFormLocation('');
    setFormSetor('Quadra Poliesportiva');
    setFormPhotoUrl('');
    setFormCategory('Material Escolar');
    setFormRegisteredBy(user?.name || '');
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (item: LostAndFoundDbItem) => {
    setEditingItem(item);
    setFormName(item.name || item.title || '');
    setFormCategory(item.category || 'Material Escolar');
    setFormDescription(item.description || '');
    setFormLocation(item.location_found || '');
    setFormSetor(item.setor || 'Quadra Poliesportiva');
    setFormPhotoUrl(item.photo_url || item.image_url || '');
    setFormRegisteredBy(item.registered_by || user?.name || '');
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleCreateOrEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return setFormError('Informe o nome do objeto.');
    setFormError(null);
    setIsSubmittingForm(true);
    const photoToSave = formPhotoUrl || DEFAULT_PHOTOS[formCategory] || DEFAULT_PHOTOS['Outros'];
    const registeredBy = formRegisteredBy.trim() || 'Secretaria';

    try {
      if (editingItem) {
        const result = await LostAndFoundService.updateItem(editingItem.id, {
          title: formName,
          category: formCategory,
          description: formDescription,
          locationFound: formLocation,
          setor: formSetor,
          photoUrl: photoToSave,
          registeredBy,
        });
        if (!result.success) throw new Error(result.error || 'Não foi possível salvar.');
        showToast('Objeto atualizado.');
      } else {
        const result = await LostAndFoundService.addItem({
          title: formName,
          category: formCategory,
          description: formDescription,
          locationFound: formLocation,
          setor: formSetor,
          photoUrl: photoToSave,
          schoolId: activeSchoolId,
          registeredBy,
        });
        if (!result.success) throw new Error(result.error || 'Não foi possível cadastrar.');
        addLostAndFoundItem({
          name: formName,
          category: formCategory as any,
          description: formDescription,
          locationFound: formLocation,
          setor: formSetor,
          dateFound: new Date().toLocaleDateString('pt-BR'),
          timeFound: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          photoUrl: photoToSave,
          registeredBy,
        });
        showToast('Objeto cadastrado. As famílias já podem ver no Portal da Família.');
      }
      setIsAddModalOpen(false);
      setEditingItem(null);
      await fetchItems();
    } catch (err: any) {
      setFormError(err?.message || 'Não foi possível salvar. Tente de novo.');
    } finally {
      setIsSubmittingForm(false);
    }
  };

  const openDelivery = (item: LostAndFoundDbItem) => {
    setSelectedItemForDelivery(item);
    setDeliveryStaffName(user?.name || '');
    setDeliveryNotes('');
  };

  const handleConfirmDeliverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForDelivery) return;
    try {
      setIsSubmittingDelivery(true);
      const res = await LostAndFoundService.deliverItem(selectedItemForDelivery.id, deliveryStaffName, deliveryNotes);
      if (!res.success) throw new Error(res.error || 'Não foi possível registrar a entrega.');
      deliverLostAndFoundItem(selectedItemForDelivery.id, deliveryStaffName, deliveryNotes);
      showToast('Entrega registrada.');
      setSelectedItemForDelivery(null);
      await fetchItems();
    } catch (err: any) {
      showToast(err?.message || 'Não foi possível registrar a entrega.', 'danger');
    } finally {
      setIsSubmittingDelivery(false);
    }
  };

  const handleReleaseReservation = async () => {
    if (!itemToRelease) return;
    setBusyAction(true);
    const res = await LostAndFoundService.releaseReservation(itemToRelease.id);
    setBusyAction(false);
    if (res.success) {
      showToast('Pedido recusado. O objeto voltou a ficar disponível.', 'info');
      setItemToRelease(null);
      await fetchItems();
    } else {
      showToast(res.error || 'Não foi possível recusar o pedido.', 'danger');
    }
  };

  const handleArchive = async (id: string) => {
    const res = await LostAndFoundService.archiveItem(id);
    if (res.success) {
      archiveLostAndFoundItem(id);
      showToast('Objeto arquivado.', 'info');
      await fetchItems();
    } else {
      showToast(res.error || 'Não foi possível arquivar.', 'danger');
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setBusyAction(true);
    const res = await LostAndFoundService.deleteItem(itemToDelete.id);
    setBusyAction(false);
    if (res.success) {
      showToast('Objeto excluído.', 'info');
      setItemToDelete(null);
      await fetchItems();
    } else {
      showToast(res.error || 'Não foi possível excluir.', 'danger');
    }
  };

  const photoOf = (item: LostAndFoundDbItem) => item.photo_url || item.image_url || DEFAULT_PHOTOS[item.category] || DEFAULT_PHOTOS['Outros'];

  const statusBadge = (item: LostAndFoundDbItem) =>
    isAvailableStatus(item.status) ? (
      <Badge tone="accent">Disponível</Badge>
    ) : isReservedStatus(item.status) ? (
      <Badge tone="warning">
        <Clock className="h-3.5 w-3.5" /> Aguardando retirada
      </Badge>
    ) : isReturnedStatus(item.status) ? (
      <Badge tone="success">
        <CheckCircle2 className="h-3.5 w-3.5" /> Entregue
      </Badge>
    ) : (
      <Badge>Arquivado</Badge>
    );

  const hasFilters = statusFilter !== 'todos' || categoryFilter !== 'Todas' || searchQuery.trim() !== '';

  return (
    <div className="space-y-6 text-left">
      <ModuleHeader
        icon={Shirt}
        title="Achados e perdidos"
        count={dbItems.length || undefined}
        text="Cadastre o que foi encontrado na escola. A família vê pelo Portal da Família, pede a retirada e você confirma a entrega."
        actions={
          <>
            <Button icon={Plus} onClick={openCreate}>
              Cadastrar objeto
            </Button>
            <RoundIconButton icon={RefreshCw} label="Atualizar" onClick={fetchItems} spinning={isSyncing} disabled={isSyncing} />
          </>
        }
      />

      <MetricStrip
        items={[
          { label: 'Cadastrados hoje', value: registeredTodayCount, icon: Calendar },
          { label: 'Aguardando retirada', value: reservedCount, icon: Clock, tone: reservedCount > 0 ? 'warning' : 'neutral', hint: 'Pedidos das famílias' },
          { label: 'Disponíveis', value: availableCount, icon: Package },
          { label: 'Entregues', value: deliveredCount, icon: CheckCircle2, tone: 'success' },
          { label: 'Arquivados', value: archivedCount, icon: Archive },
        ]}
      />

      {loadError && <Alert tone="danger">{loadError}</Alert>}

      {/* Filtros */}
      <Card className="!p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <Segmented<StatusFilter>
            label="Situação"
            value={statusFilter}
            onChange={setStatusFilter}
            items={[
              { id: 'todos', label: 'Todos', count: dbItems.length },
              { id: 'disponivel', label: 'Disponíveis', count: availableCount },
              { id: 'reservado', label: 'Pedidos', count: reservedCount },
              { id: 'entregue', label: 'Entregues', count: deliveredCount },
              { id: 'arquivado', label: 'Arquivados', count: archivedCount },
            ]}
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <select aria-label="Categoria" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={cx(inputCls, 'sm:w-52')}>
              <option value="Todas">Todas as categorias</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {catLabel(c)}
                </option>
              ))}
            </select>
            <div className="relative sm:w-72">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="search"
                aria-label="Buscar"
                placeholder="Objeto, local ou responsável"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cx(inputCls, 'pl-10')}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Lista */}
      {isLoading ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-96 rounded-3xl" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon={Package}
          title={hasFilters ? 'Nenhum objeto com esses filtros' : 'Nenhum objeto cadastrado'}
          text={hasFilters ? 'Tente outra busca ou limpe os filtros.' : 'Quando alguém achar algo na escola, cadastre aqui com uma foto. Fica mais fácil a família reconhecer.'}
          action={
            hasFilters ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setStatusFilter('todos');
                  setCategoryFilter('Todas');
                  setSearchQuery('');
                }}
              >
                Limpar filtros
              </Button>
            ) : (
              <Button icon={Plus} onClick={openCreate}>
                Cadastrar objeto
              </Button>
            )
          }
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredItems.map((item) => {
            const reserved = isReservedStatus(item.status);
            const returned = isReturnedStatus(item.status);
            const archived = isArchivedStatus(item.status);
            return (
              <article
                key={item.id}
                className={cx(
                  'group flex flex-col overflow-hidden rounded-3xl border bg-[var(--bg-card)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_40px_-26px_rgba(16,24,40,0.45)]',
                  reserved ? 'border-[#F5C26B]' : 'border-[var(--border)]',
                  archived && 'opacity-70',
                )}
              >
                <button type="button" onClick={() => setSelectedItemForDetails(item)} className="relative block h-44 overflow-hidden bg-[var(--bg-card-alt)]" aria-label={`Ver ${item.name}`}>
                  <Package className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-[var(--text-muted)] opacity-40" aria-hidden />
                  {photoOf(item) && (
                    <img
                      src={photoOf(item)}
                      alt=""
                      className="relative h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      referrerPolicy="no-referrer"
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                  )}
                  <span className="absolute left-3 top-3 rounded-full bg-[rgba(11,18,32,0.72)] px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">{catLabel(item.category)}</span>
                  <span className="absolute right-3 top-3">{statusBadge(item)}</span>
                </button>

                <div className="flex flex-1 flex-col p-5">
                  <h3 className="line-clamp-2 font-serif text-[18px] font-semibold leading-snug text-[var(--text-heading)]">{item.name}</h3>
                  {item.description && <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-[var(--text-muted)]">{item.description}</p>}

                  <ul className="mt-4 space-y-1.5 text-[13px] text-[var(--text-body)]">
                    <li className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                      <span className="truncate">
                        {item.location_found || 'Local não informado'}
                        {item.setor ? ` · ${item.setor}` : ''}
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                      Achado em {item.found_date || item.date_found || '—'}
                    </li>
                    {item.registered_by && (
                      <li className="flex items-center gap-2">
                        <User className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                        <span className="truncate">Por {item.registered_by}</span>
                      </li>
                    )}
                  </ul>

                  {reserved && item.reservation && (
                    <div className="mt-4 rounded-2xl p-3.5 text-[13px]" style={{ background: '#FEF4E6', color: '#7A4505' }}>
                      <p className="font-semibold">Pedido da família</p>
                      {item.reservation.responsible_name && <p className="mt-1 text-[var(--text-heading)]">{item.reservation.responsible_name}</p>}
                      {item.reservation.student_name && (
                        <p>
                          Estudante: {item.reservation.student_name}
                          {item.reservation.student_grade ? ` (${item.reservation.student_grade})` : ''}
                        </p>
                      )}
                      {item.reservation.responsible_phone && (
                        <p className="flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5" /> {item.reservation.responsible_phone}
                        </p>
                      )}
                      <p className="mt-1 text-[12px] opacity-80">
                        {item.reservation.reservation_date}
                        {item.reservation.reservation_time ? ` às ${item.reservation.reservation_time}` : ''}
                      </p>
                    </div>
                  )}

                  {returned && (
                    <div className="mt-4 rounded-2xl p-3.5 text-[13px]" style={{ background: '#E7F6EE', color: '#0E5A38' }}>
                      <p className="font-semibold">Entregue{item.delivered_date ? ` em ${item.delivered_date}` : ''}</p>
                      {(item.delivered_by_staff || item.delivered_by) && <p>Por {item.delivered_by_staff || item.delivered_by}</p>}
                      {item.delivery_notes && <p className="mt-1 opacity-80">{item.delivery_notes}</p>}
                    </div>
                  )}

                  <div className="min-h-[20px] flex-1" aria-hidden />
                  <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-4">
                    {reserved ? (
                      <>
                        <Button size="sm" icon={CheckCircle2} onClick={() => openDelivery(item)}>
                          Confirmar entrega
                        </Button>
                        <Button size="sm" variant="ghost" icon={X} onClick={() => setItemToRelease(item)}>
                          Recusar
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="secondary" icon={Eye} onClick={() => setSelectedItemForDetails(item)}>
                        Detalhes
                      </Button>
                    )}
                    <div className="ml-auto flex items-center">
                      <IconAction icon={Edit3} label="Editar" onClick={() => handleOpenEdit(item)} />
                      {!archived && <IconAction icon={Archive} label="Arquivar" onClick={() => handleArchive(item.id)} />}
                      <IconAction icon={Trash2} label="Excluir" danger onClick={() => setItemToDelete(item)} />
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Cadastro / edição */}
      <Modal
        open={isAddModalOpen}
        onClose={() => !isSubmittingForm && setIsAddModalOpen(false)}
        size="lg"
        icon={<Shirt className="h-5 w-5" />}
        title={editingItem ? 'Editar objeto' : 'Cadastrar objeto achado'}
        subtitle="Uma boa foto e detalhes ajudam a família a reconhecer"
        footer={
          <>
            <Button variant="secondary" disabled={isSubmittingForm} onClick={() => setIsAddModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="lost-found-form" loading={isSubmittingForm} disabled={isUploadingPhoto}>
              {editingItem ? 'Salvar alterações' : 'Cadastrar'}
            </Button>
          </>
        }
      >
        <form id="lost-found-form" onSubmit={handleCreateOrEditSubmit} className="space-y-5">
          {formError && <Alert tone="danger">{formError}</Alert>}

          <div>
            <p className="mb-1.5 text-[13px] font-semibold text-[var(--text-heading)]">Foto</p>
            {formPhotoUrl ? (
              <div className="relative h-48 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card-alt)]">
                <img src={formPhotoUrl} alt="Foto do objeto" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                <Button size="sm" variant="secondary" className="absolute right-3 top-3" onClick={() => setFormPhotoUrl('')}>
                  Trocar foto
                </Button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--bg-card-alt)] px-6 py-8 text-center transition-colors hover:border-[var(--accent)]">
                {isUploadingPhoto ? (
                  <>
                    <Loader2 className="h-7 w-7 animate-spin" style={{ color: 'var(--accent)' }} />
                    <span className="text-[13px] font-semibold text-[var(--text-heading)]">Enviando foto…</span>
                  </>
                ) : (
                  <>
                    <Camera className="h-7 w-7 text-[var(--text-muted)]" />
                    <span className="text-[14px] font-semibold text-[var(--text-heading)]">Tirar ou escolher uma foto</span>
                    <span className="text-[12px] text-[var(--text-muted)]">Sem foto, usamos uma imagem genérica da categoria.</span>
                  </>
                )}
                <input type="file" accept="image/*" capture="environment" onChange={handleFileUpload} className="sr-only" disabled={isUploadingPhoto} />
              </label>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome do objeto" required>
              {(id) => <input id={id} required placeholder="Ex.: Moletom azul tamanho M" value={formName} onChange={(e) => setFormName(e.target.value)} className={inputCls} />}
            </Field>
            <Field label="Categoria" required>
              {(id) => (
                <select id={id} value={formCategory} onChange={(e) => setFormCategory(e.target.value)} className={inputCls}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {catLabel(c)}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="Setor" required>
              {(id) => (
                <select id={id} value={formSetor} onChange={(e) => setFormSetor(e.target.value)} className={inputCls}>
                  {SETORES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="Onde exatamente">
              {(id) => <input id={id} placeholder="Ex.: Arquibancada, lado esquerdo" value={formLocation} onChange={(e) => setFormLocation(e.target.value)} className={inputCls} />}
            </Field>
          </div>

          <Field label="Detalhes para identificar">
            {(id) => (
              <textarea
                id={id}
                rows={3}
                placeholder="Ex.: Bordado com as iniciais J.S. no bolso"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className={cx(inputCls, 'resize-y')}
              />
            )}
          </Field>

          <Field label="Quem cadastrou">
            {(id) => <input id={id} placeholder="Nome do inspetor ou funcionário" value={formRegisteredBy} onChange={(e) => setFormRegisteredBy(e.target.value)} className={inputCls} />}
          </Field>
        </form>
      </Modal>

      {/* Detalhes */}
      <Modal
        open={Boolean(selectedItemForDetails)}
        onClose={() => setSelectedItemForDetails(null)}
        size="md"
        title={selectedItemForDetails?.name || ''}
        subtitle={selectedItemForDetails ? catLabel(selectedItemForDetails.category) : ''}
        footer={
          <>
            {selectedItemForDetails && (
              <Button
                variant="secondary"
                icon={Edit3}
                onClick={() => {
                  const it = selectedItemForDetails;
                  setSelectedItemForDetails(null);
                  handleOpenEdit(it);
                }}
              >
                Editar
              </Button>
            )}
            <Button onClick={() => setSelectedItemForDetails(null)}>Fechar</Button>
          </>
        }
      >
        {selectedItemForDetails && (
          <div className="space-y-4">
            <div className="h-52 overflow-hidden rounded-2xl bg-[var(--bg-card-alt)]">
              <img src={photoOf(selectedItemForDetails)} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <div className="flex items-center gap-2">{statusBadge(selectedItemForDetails)}</div>
            <p className="text-[14px] leading-relaxed text-[var(--text-body)]">{selectedItemForDetails.description || 'Sem detalhes cadastrados.'}</p>
            <div className="divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)] px-4 py-1">
              <InfoRow label="Setor">{selectedItemForDetails.setor || '—'}</InfoRow>
              <InfoRow label="Local">{selectedItemForDetails.location_found || '—'}</InfoRow>
              <InfoRow label="Achado em">{selectedItemForDetails.found_date || selectedItemForDetails.date_found || '—'}</InfoRow>
              <InfoRow label="Cadastrado por">{selectedItemForDetails.registered_by || '—'}</InfoRow>
            </div>
            {selectedItemForDetails.reservation && (
              <div className="rounded-2xl p-4 text-[13px]" style={{ background: '#FEF4E6', color: '#7A4505' }}>
                <p className="font-semibold">Pedido de retirada</p>
                <p className="mt-1">Responsável: {selectedItemForDetails.reservation.responsible_name || '—'}</p>
                <p>
                  Estudante: {selectedItemForDetails.reservation.student_name || '—'}
                  {selectedItemForDetails.reservation.student_grade ? ` (${selectedItemForDetails.reservation.student_grade})` : ''}
                </p>
                {selectedItemForDetails.reservation.responsible_phone && <p>Telefone: {selectedItemForDetails.reservation.responsible_phone}</p>}
                <p className="mt-1 text-[12px] opacity-80">
                  Pedido em {selectedItemForDetails.reservation.reservation_date}
                  {selectedItemForDetails.reservation.reservation_time ? ` às ${selectedItemForDetails.reservation.reservation_time}` : ''}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Entrega */}
      <Modal
        open={Boolean(selectedItemForDelivery)}
        onClose={() => !isSubmittingDelivery && setSelectedItemForDelivery(null)}
        size="md"
        icon={<ShieldCheck className="h-5 w-5" />}
        title="Confirmar entrega"
        subtitle="Registre quem entregou. A família é avisada."
        footer={
          <>
            <Button variant="secondary" disabled={isSubmittingDelivery} onClick={() => setSelectedItemForDelivery(null)}>
              Cancelar
            </Button>
            <Button type="submit" form="delivery-form" icon={CheckCircle2} loading={isSubmittingDelivery}>
              Registrar entrega
            </Button>
          </>
        }
      >
        {selectedItemForDelivery && (
          <form id="delivery-form" onSubmit={handleConfirmDeliverySubmit} className="space-y-4">
            <div className="rounded-2xl bg-[var(--bg-card-alt)] p-4 text-[13px]">
              <p className="text-[15px] font-semibold text-[var(--text-heading)]">{selectedItemForDelivery.name}</p>
              {selectedItemForDelivery.reservation?.responsible_name && <p className="mt-1">Retira: {selectedItemForDelivery.reservation.responsible_name}</p>}
              {selectedItemForDelivery.reservation?.student_name && <p>Estudante: {selectedItemForDelivery.reservation.student_name}</p>}
            </div>
            <Field label="Quem entregou" required>
              {(id) => <input id={id} required value={deliveryStaffName} onChange={(e) => setDeliveryStaffName(e.target.value)} className={inputCls} />}
            </Field>
            <Field label="Observações" hint="Ex.: documento conferido na secretaria.">
              {(id) => <textarea id={id} rows={2} value={deliveryNotes} onChange={(e) => setDeliveryNotes(e.target.value)} className={cx(inputCls, 'resize-y')} />}
            </Field>
          </form>
        )}
      </Modal>

      <ConfirmModal
        open={Boolean(itemToRelease)}
        onClose={() => setItemToRelease(null)}
        onConfirm={handleReleaseReservation}
        loading={busyAction}
        title="Recusar o pedido?"
        confirmLabel="Recusar pedido"
      >
        O pedido de <strong className="text-[var(--text-heading)]">{itemToRelease?.reservation?.responsible_name || 'retirada'}</strong> é cancelado e “{itemToRelease?.name}” volta a ficar disponível.
      </ConfirmModal>

      <ConfirmModal
        open={Boolean(itemToDelete)}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleDelete}
        loading={busyAction}
        title="Excluir objeto?"
        confirmLabel="Excluir"
        icon={Trash2}
      >
        <strong className="text-[var(--text-heading)]">“{itemToDelete?.name}”</strong> sai da lista e do Portal da Família. Se só quer tirar da vista, use Arquivar.
      </ConfirmModal>

      <Toast message={toast?.text ?? null} tone={toast?.type} onClose={() => setToast(null)} />
    </div>
  );
}

function IconAction({ icon: Icon, label, onClick, danger }: { icon: React.ElementType; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cx(
        'flex h-9 w-9 items-center justify-center rounded-xl text-[var(--text-muted)] transition-colors',
        danger ? 'hover:bg-[#FDECEC] hover:text-[#B42318]' : 'hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]',
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}