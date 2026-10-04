import React, { useState } from 'react';
import { History, Search, Trash2, ArrowRight, Calendar, Bed, Cloud, RotateCcw } from 'lucide-react';
import type { SavedPatientRecord } from '../types';

interface HistoricoViewProps {
  records: SavedPatientRecord[];
  currentRecordId: string;
  onLoadRecord: (record: SavedPatientRecord) => void;
  onDeleteRecord: (id: string) => void;
  onRestoreRecord?: () => void;
  canRestore?: boolean;
  onOpenCloudSync?: () => void;
}

export const HistoricoView: React.FC<HistoricoViewProps> = ({
  records,
  currentRecordId,
  onLoadRecord,
  onDeleteRecord,
  onRestoreRecord,
  canRestore,
  onOpenCloudSync,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  const filteredRecords = records.filter((r) => {
    const term = searchTerm.toLowerCase();
    const nome = (r.patient?.nome || '').toLowerCase();
    const qp = (r.qp || '').toLowerCase();
    const hd = (r.aiResults?.mainHypothesis || '').toLowerCase();
    const matchesSearch = nome.includes(term) || qp.includes(term) || hd.includes(term);

    if (!selectedDate) return matchesSearch;
    const recordDateStr = new Date(r.savedAt).toLocaleDateString('en-CA'); // YYYY-MM-DD
    return matchesSearch && recordDateStr === selectedDate;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#ececeb] dark:border-[#333]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-navy-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-700 dark:text-ice-200 shadow-2xs">
            <History className="w-4 h-4" />
          </div>
          <h1 className="text-base font-bold text-slate-900 dark:text-ice-50 uppercase tracking-wide">
            HISTÓRICO
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {canRestore && onRestoreRecord && (
            <button
              type="button"
              onClick={onRestoreRecord}
              className="h-8 px-2.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-[#383838] bg-white dark:bg-[#252525] text-slate-700 dark:text-neutral-200 hover:bg-[#f5f5f5] dark:hover:bg-[#2e2e2e] flex items-center gap-1.5 transition-colors shadow-2xs"
              title="Restaurar último paciente excluído"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Desfazer</span>
            </button>
          )}
          {onOpenCloudSync && (
            <button
              type="button"
              onClick={onOpenCloudSync}
              className="h-8 px-2.5 rounded-lg text-xs font-medium bg-white dark:bg-[#252525] border border-[#ececeb] dark:border-[#383838] hover:bg-slate-50 dark:hover:bg-[#2e2e2e] text-slate-700 dark:text-neutral-200 flex items-center gap-1.5 transition-colors shadow-2xs"
              title="Sincronizar com Firebase na nuvem"
            >
              <Cloud className="w-3.5 h-3.5 text-ice-500" />
              <span>Nuvem</span>
            </button>
          )}
          <span className="h-8 px-2.5 rounded-lg text-xs font-medium inline-flex items-center justify-center bg-slate-100 dark:bg-[#252525] text-slate-700 dark:text-neutral-200 border border-[#ececeb] dark:border-[#333]">
            Total: {records.length}
          </span>
        </div>
      </div>

      {/* Search Bar & Date Filter */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#e5e5e5] dark:border-[#333] bg-white dark:bg-[#252525] text-slate-800 dark:text-neutral-100 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-400 shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-[#e5e5e5] dark:border-[#333] bg-white dark:bg-[#252525] text-slate-700 dark:text-neutral-200 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-400 shadow-2xs"
            title="Filtrar por data do atendimento"
          />
          {selectedDate && (
            <button
              type="button"
              onClick={() => setSelectedDate('')}
              className="px-3 py-2.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-[#333] text-slate-600 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-[#2e2e2e] bg-white dark:bg-[#252525] transition-colors"
              title="Limpar filtro de data"
            >
              Limpar data
            </button>
          )}
        </div>
      </div>

      {/* List */}
      {filteredRecords.length === 0 ? (
        <div className="text-center py-16 px-6 bg-white dark:bg-[#252525] rounded-xl border border-dashed border-[#ececeb] dark:border-[#333] space-y-3">
          <History className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
          <h2 className="text-base font-semibold text-slate-700 dark:text-neutral-200">
            {searchTerm || selectedDate ? 'Nenhum paciente encontrado para este filtro.' : 'Nenhum atendimento salvo ainda.'}
          </h2>
          <p className="text-sm text-slate-400 dark:text-slate-500 max-w-md mx-auto">
            Os pacientes que você atender e salvar aparecerão listados aqui.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRecords.map((rec) => {
            const isCurrent = rec.id === currentRecordId;
            const savedDate = new Date(rec.savedAt).toLocaleString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={rec.id}
                className={`rounded-xl border p-4 flex flex-col justify-between space-y-3 transition-all shadow-xs ${
                  isCurrent
                    ? 'border-ice-400 dark:border-ice-500 bg-ice-50/20 dark:bg-navy-800 ring-1 ring-ice-400/40'
                    : 'border-[#ececeb] dark:border-[#333] bg-white dark:bg-[#252525] hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="space-y-2">
                  {/* Top: Name, Date */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-neutral-100 text-sm flex items-center gap-2">
                        <span>{rec.patient.nome || 'Paciente sem nome'}</span>
                        {isCurrent && (
                          <span className="text-[10px] uppercase px-1.5 py-0.5 rounded font-bold bg-ice-500 text-white">
                            Em Aberto
                          </span>
                        )}
                        {rec.observation?.inObservation && (
                          <span className="text-[10px] uppercase px-1.5 py-0.5 rounded font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-400/30 flex items-center gap-1">
                            <Bed className="w-3 h-3" />
                            Observação
                          </span>
                        )}
                      </h3>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {rec.patient.idade ? `${rec.patient.idade} anos` : 'Idade --'}
                      </span>
                    </div>

                    <span className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1 whitespace-nowrap">
                      <Calendar className="w-3 h-3" />
                      {savedDate}
                    </span>
                  </div>

                  {/* QP */}
                  <div className="text-xs text-slate-600 dark:text-neutral-300 bg-slate-50 dark:bg-[#202020]/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/60">
                    <strong className="text-slate-700 dark:text-neutral-200">QP:</strong> {rec.qp || 'Não informada'}
                  </div>

                  {/* HD */}
                  {rec.aiResults?.mainHypothesis && (
                    <div className="text-xs text-slate-600 dark:text-neutral-300">
                      <strong className="text-slate-700 dark:text-neutral-200">HD:</strong> {rec.aiResults.mainHypothesis}
                    </div>
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onLoadRecord(rec)}
                    className="h-8 w-8 rounded-lg text-slate-600 hover:text-slate-900 dark:text-neutral-300 dark:hover:text-white bg-slate-100 dark:bg-[#252525] hover:bg-slate-200 dark:hover:bg-[#2e2e2e] border border-slate-200 dark:border-[#383838] transition-colors shadow-2xs flex items-center justify-center shrink-0"
                    title={isCurrent ? 'Continuar atendimento' : 'Carregar no prontuário'}
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onDeleteRecord(rec.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                    title="Excluir do histórico"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
