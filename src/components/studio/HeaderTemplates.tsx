import React from 'react';
import { HeaderData, HeaderModel } from './EducaStudioTypes';
import { Building2, Award, QrCode, Sparkles, Upload, Image as ImageIcon, Trash2 } from 'lucide-react';

interface HeaderTemplatesProps {
  headerData: HeaderData;
  onChangeHeader: (updated: HeaderData) => void;
  isEditable?: boolean;
}

export function HeaderTemplates({ headerData, onChangeHeader, isEditable = true }: HeaderTemplatesProps) {
  const updateField = (field: keyof HeaderData, value: any) => {
    onChangeHeader({
      ...headerData,
      [field]: value
    });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        updateField('logoUrl', event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="relative group/header border border-transparent hover:border-amber-300/40 rounded-2xl p-1 transition-all">
      {/* Quick Model Selector Toolbar if editable */}
      {isEditable && (
        <div className="no-print mb-3 p-2 bg-slate-900/90 border border-gold/30 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-gold font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="text-[10px] uppercase tracking-wider">Modelo de Cabeçalho:</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {[
              { id: 'tradicional', label: '1. Tradicional' },
              { id: 'moderno', label: '2. Moderno' },
              { id: 'infantil', label: '3. Ed. Infantil' },
              { id: 'municipal', label: '4. Rede Municipal' },
              { id: 'estadual', label: '5. Rede Estadual' },
              { id: 'particular', label: '6. Colégio Particular' },
            ].map(model => (
              <button
                key={model.id}
                type="button"
                onClick={() => updateField('model', model.id as HeaderModel)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                  headerData.model === model.id
                    ? 'bg-gold text-slate-950 shadow-md font-extrabold'
                    : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
              >
                {model.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 border-l border-slate-700 pl-2">
            <label className="cursor-pointer px-2 py-1 bg-amber-500/20 text-gold hover:bg-amber-500/30 rounded-lg text-[10px] font-bold flex items-center gap-1 border border-gold/30">
              <Upload className="w-3 h-3" />
              <span>{headerData.logoUrl ? 'Trocar Logo' : 'Inserir Logo'}</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            </label>
            {headerData.logoUrl && (
              <button
                type="button"
                onClick={() => updateField('logoUrl', '')}
                className="p-1 text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded"
                title="Remover Logo"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* MODEL 1: TRADICIONAL */}
      {headerData.model === 'tradicional' && (
        <div className="border-b-2 border-double border-slate-800 pb-4 mb-4 font-serif text-slate-900">
          <div className="flex justify-between items-center gap-4">
            {headerData.logoUrl && (
              <img src={headerData.logoUrl} alt="Logo Escola" className="h-12 w-auto object-contain shrink-0" />
            )}
            <div className="flex-1 text-center">
              <input
                type="text"
                value={headerData.schoolName}
                onChange={(e) => updateField('schoolName', e.target.value)}
                placeholder="NOME DA ESCOLA / INSTITUIÇÃO"
                className="w-full text-center font-extrabold uppercase text-base md:text-lg text-slate-900 bg-transparent outline-none focus:bg-amber-50 rounded"
              />
              <p className="text-xs italic text-slate-600 mt-0.5">Educação Básica • Excelência de Ensino</p>
            </div>
            {headerData.logoUrl && <div className="w-12 h-12" />}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 text-[11px] font-sans">
            <div className="flex items-center gap-1">
              <span className="font-bold text-slate-800">Estudante:</span>
              <input
                type="text"
                value={headerData.studentNameLine}
                onChange={(e) => updateField('studentNameLine', e.target.value)}
                placeholder="_________________________________________________"
                className="flex-1 bg-transparent border-b border-dashed border-slate-400 outline-none font-medium"
              />
            </div>
            <div className="flex items-center justify-end gap-1 text-right">
              <span className="font-bold text-slate-800">Professor:</span>
              <input
                type="text"
                value={headerData.teacherName}
                onChange={(e) => updateField('teacherName', e.target.value)}
                className="bg-transparent font-medium border-b border-transparent focus:border-slate-400 outline-none"
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="font-bold text-slate-800">Série/Ano:</span>
              <input
                type="text"
                value={headerData.grade}
                onChange={(e) => updateField('grade', e.target.value)}
                className="bg-transparent font-medium border-b border-transparent focus:border-slate-400 outline-none"
              />
            </div>
            <div className="flex justify-end items-center gap-4 text-right">
              <div>
                <span className="font-bold text-slate-800">Data:</span>{' '}
                <input
                  type="text"
                  value={headerData.date}
                  onChange={(e) => updateField('date', e.target.value)}
                  className="w-20 bg-transparent font-medium border-b border-transparent focus:border-slate-400 outline-none text-right"
                />
              </div>
              <div>
                <span className="font-bold text-slate-800">Nota:</span>{' '}
                <input
                  type="text"
                  value={headerData.maxPoints || '______ / 10.0'}
                  onChange={(e) => updateField('maxPoints', e.target.value)}
                  className="w-24 bg-transparent font-medium border-b border-transparent focus:border-slate-400 outline-none text-right"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODEL 2: MODERNO */}
      {headerData.model === 'moderno' && (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl mb-4 font-sans text-slate-900 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-3">
              {headerData.logoUrl && (
                <img src={headerData.logoUrl} alt="Logo Escola" className="h-10 w-auto object-contain shrink-0" />
              )}
              <div>
                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 font-bold text-[9px] uppercase rounded tracking-wider">
                  Classium Studio Premium
                </span>
                <input
                  type="text"
                  value={headerData.schoolName}
                  onChange={(e) => updateField('schoolName', e.target.value)}
                  placeholder="Nome do Colégio"
                  className="block font-extrabold text-base text-slate-900 bg-transparent outline-none focus:bg-amber-50/50 rounded w-full mt-0.5"
                />
              </div>
            </div>
            <div className="text-right text-[10px]">
              <span className="block font-bold text-indigo-600 uppercase tracking-wider">Componente Curricular</span>
              <input
                type="text"
                value={headerData.subject}
                onChange={(e) => updateField('subject', e.target.value)}
                placeholder="Disciplina"
                className="font-bold text-slate-800 uppercase text-xs text-right bg-transparent outline-none focus:bg-amber-50/50 rounded"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2.5 border-t border-slate-200 text-[10px]">
            <div>
              <strong className="text-slate-500 block uppercase">Estudante</strong>
              <input
                type="text"
                value={headerData.studentNameLine}
                onChange={(e) => updateField('studentNameLine', e.target.value)}
                placeholder="________________________"
                className="w-full bg-transparent font-semibold text-slate-800 outline-none"
              />
            </div>
            <div>
              <strong className="text-slate-500 block uppercase">Professor Titular</strong>
              <input
                type="text"
                value={headerData.teacherName}
                onChange={(e) => updateField('teacherName', e.target.value)}
                className="w-full bg-transparent font-semibold text-slate-800 outline-none"
              />
            </div>
            <div className="text-right">
              <strong className="text-slate-500 block uppercase">Ano & Data</strong>
              <div className="flex justify-end gap-1 font-semibold text-slate-800">
                <input
                  type="text"
                  value={headerData.grade}
                  onChange={(e) => updateField('grade', e.target.value)}
                  className="bg-transparent text-right outline-none w-28"
                />
                <span>•</span>
                <input
                  type="text"
                  value={headerData.date}
                  onChange={(e) => updateField('date', e.target.value)}
                  className="bg-transparent text-right outline-none w-16"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODEL 3: EDUCAÇÃO INFANTIL */}
      {headerData.model === 'infantil' && (
        <div className="p-4 bg-amber-50/60 border-2 border-dashed border-amber-300 rounded-2xl mb-4 font-sans text-slate-900">
          <div className="flex justify-between items-center gap-3 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🌟</span>
              {headerData.logoUrl && (
                <img src={headerData.logoUrl} alt="Logo" className="h-10 w-auto object-contain" />
              )}
              <input
                type="text"
                value={headerData.schoolName}
                onChange={(e) => updateField('schoolName', e.target.value)}
                placeholder="Nome da Escola Infantil"
                className="font-extrabold text-base text-amber-900 bg-transparent outline-none focus:bg-white/80 rounded"
              />
            </div>
            <span className="text-2xl">🎨</span>
          </div>

          <div className="space-y-2 pt-2 border-t border-amber-200 text-xs font-medium">
            <div className="flex items-center gap-2 bg-white/80 p-2 rounded-xl border border-amber-200">
              <span className="font-extrabold text-amber-800 shrink-0">MEU NOME É:</span>
              <input
                type="text"
                value={headerData.studentNameLine}
                onChange={(e) => updateField('studentNameLine', e.target.value)}
                placeholder="__________________________________________________"
                className="w-full bg-transparent font-bold text-amber-900 text-sm outline-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-2 text-[11px]">
              <div className="bg-white/80 p-1.5 rounded-lg border border-amber-200 text-center">
                <span className="text-slate-500 block text-[9px] font-bold">PROFESSOR(A)</span>
                <input
                  type="text"
                  value={headerData.teacherName}
                  onChange={(e) => updateField('teacherName', e.target.value)}
                  className="w-full text-center font-bold text-slate-800 bg-transparent outline-none"
                />
              </div>
              <div className="bg-white/80 p-1.5 rounded-lg border border-amber-200 text-center">
                <span className="text-slate-500 block text-[9px] font-bold">TURMA</span>
                <input
                  type="text"
                  value={headerData.grade}
                  onChange={(e) => updateField('grade', e.target.value)}
                  className="w-full text-center font-bold text-slate-800 bg-transparent outline-none"
                />
              </div>
              <div className="bg-white/80 p-1.5 rounded-lg border border-amber-200 text-center">
                <span className="text-slate-500 block text-[9px] font-bold">DATA</span>
                <input
                  type="text"
                  value={headerData.date}
                  onChange={(e) => updateField('date', e.target.value)}
                  className="w-full text-center font-bold text-slate-800 bg-transparent outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODEL 4: MUNICIPAL */}
      {headerData.model === 'municipal' && (
        <div className="border-b-4 border-emerald-600 pb-3 mb-4 font-sans text-slate-900">
          <div className="flex items-center gap-3">
            {headerData.logoUrl ? (
              <img src={headerData.logoUrl} alt="Brasão" className="h-12 w-auto object-contain shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-emerald-100 border border-emerald-300 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 text-emerald-700" />
              </div>
            )}
            <div className="flex-1">
              <input
                type="text"
                value={headerData.departmentName || 'PREFEITURA MUNICIPAL • SECRETARIA DE EDUCAÇÃO'}
                onChange={(e) => updateField('departmentName', e.target.value)}
                className="w-full font-bold uppercase text-[10px] tracking-widest text-emerald-800 bg-transparent outline-none"
              />
              <input
                type="text"
                value={headerData.schoolName}
                onChange={(e) => updateField('schoolName', e.target.value)}
                placeholder="NOME DA ESCOLA MUNICIPAL"
                className="w-full font-extrabold uppercase text-sm text-slate-900 bg-transparent outline-none focus:bg-amber-50 rounded"
              />
            </div>
          </div>

          <div className="grid grid-cols-12 gap-2 mt-3 text-[10px] bg-emerald-50/50 p-2 rounded-lg border border-emerald-100">
            <div className="col-span-8">
              <span className="text-slate-500 uppercase font-bold text-[9px] block">ALUNO(A):</span>
              <input
                type="text"
                value={headerData.studentNameLine}
                onChange={(e) => updateField('studentNameLine', e.target.value)}
                placeholder="_________________________________________________"
                className="w-full font-bold text-slate-800 bg-transparent outline-none"
              />
            </div>
            <div className="col-span-4 text-right">
              <span className="text-slate-500 uppercase font-bold text-[9px] block">SÉRIE / TURMA:</span>
              <input
                type="text"
                value={headerData.grade}
                onChange={(e) => updateField('grade', e.target.value)}
                className="w-full font-bold text-slate-800 text-right bg-transparent outline-none"
              />
            </div>
            <div className="col-span-6">
              <span className="text-slate-500 uppercase font-bold text-[9px] block">DISCIPLINA:</span>
              <input
                type="text"
                value={headerData.subject}
                onChange={(e) => updateField('subject', e.target.value)}
                className="w-full font-bold text-slate-800 bg-transparent outline-none"
              />
            </div>
            <div className="col-span-6 text-right">
              <span className="text-slate-500 uppercase font-bold text-[9px] block">PROFESSOR(A):</span>
              <input
                type="text"
                value={headerData.teacherName}
                onChange={(e) => updateField('teacherName', e.target.value)}
                className="w-full font-bold text-slate-800 text-right bg-transparent outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* MODEL 5: ESTADUAL */}
      {headerData.model === 'estadual' && (
        <div className="border-b-4 border-blue-700 pb-3 mb-4 font-sans text-slate-900">
          <div className="flex justify-between items-start gap-3">
            <div>
              <input
                type="text"
                value={headerData.departmentName || 'GOVERNO DO ESTADO • SECRETARIA DE ESTADO DA EDUCAÇÃO'}
                onChange={(e) => updateField('departmentName', e.target.value)}
                className="w-full font-extrabold uppercase text-[9px] tracking-widest text-blue-800 bg-transparent outline-none"
              />
              <input
                type="text"
                value={headerData.schoolName}
                onChange={(e) => updateField('schoolName', e.target.value)}
                placeholder="ESCOLA ESTADUAL DE ENSINO FUNDAMENTAL E MÉDIO"
                className="w-full font-extrabold uppercase text-sm text-slate-900 bg-transparent outline-none focus:bg-amber-50 rounded mt-0.5"
              />
            </div>
            {headerData.logoUrl && (
              <img src={headerData.logoUrl} alt="Brasão Estado" className="h-10 w-auto object-contain shrink-0" />
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 mt-3 pt-2 border-t border-blue-200 text-[10px]">
            <div>
              <span className="text-slate-500 block uppercase font-bold text-[9px]">ESTUDANTE</span>
              <input
                type="text"
                value={headerData.studentNameLine}
                onChange={(e) => updateField('studentNameLine', e.target.value)}
                placeholder="______________________"
                className="w-full font-semibold text-slate-800 bg-transparent outline-none"
              />
            </div>
            <div>
              <span className="text-slate-500 block uppercase font-bold text-[9px]">PROFESSOR</span>
              <input
                type="text"
                value={headerData.teacherName}
                onChange={(e) => updateField('teacherName', e.target.value)}
                className="w-full font-semibold text-slate-800 bg-transparent outline-none"
              />
            </div>
            <div className="text-right">
              <span className="text-slate-500 block uppercase font-bold text-[9px]">COMPONENTES & DATA</span>
              <span className="font-semibold text-slate-800">{headerData.subject} • {headerData.date}</span>
            </div>
          </div>
        </div>
      )}

      {/* MODEL 6: PARTICULAR */}
      {headerData.model === 'particular' && (
        <div className="p-4 bg-slate-900 text-white rounded-2xl mb-4 font-sans shadow-md border border-amber-500/30">
          <div className="flex justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              {headerData.logoUrl ? (
                <img src={headerData.logoUrl} alt="Logo Particular" className="h-10 w-auto object-contain shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center shrink-0 text-sm">
                  COL
                </div>
              )}
              <div>
                <span className="text-[9px] font-black uppercase text-gold tracking-widest block">SISTEMA DE ENSINO DE ALTA PERFORMANCE</span>
                <input
                  type="text"
                  value={headerData.schoolName}
                  onChange={(e) => updateField('schoolName', e.target.value)}
                  placeholder="COLÉGIO EXCELÊNCIA INTEGRADA"
                  className="w-full font-black text-base text-white bg-transparent outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 text-right">
              <div className="text-[10px]">
                <span className="text-amber-400 font-bold block">{headerData.subject}</span>
                <span className="text-slate-400 block">{headerData.grade}</span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-slate-800 border border-gold/30 flex items-center justify-center">
                <QrCode className="w-5 h-5 text-gold" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-3 mt-3 border-t border-slate-800 text-[10px] text-slate-300">
            <div>
              <span className="text-slate-400 block text-[8px] uppercase font-bold">ALUNO(A)</span>
              <input
                type="text"
                value={headerData.studentNameLine}
                onChange={(e) => updateField('studentNameLine', e.target.value)}
                placeholder="_______________________"
                className="w-full font-bold text-white bg-transparent outline-none"
              />
            </div>
            <div>
              <span className="text-slate-400 block text-[8px] uppercase font-bold">DOCENTE</span>
              <input
                type="text"
                value={headerData.teacherName}
                onChange={(e) => updateField('teacherName', e.target.value)}
                className="w-full font-bold text-white bg-transparent outline-none"
              />
            </div>
            <div className="text-right">
              <span className="text-slate-400 block text-[8px] uppercase font-bold">DATA / NOTA MÁXIMA</span>
              <span className="font-bold text-gold">{headerData.date} • {headerData.maxPoints || '10.0 pts'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
