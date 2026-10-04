import React from 'react';
import { History, X, Search, Calendar, User, Trash2, ArrowUpRight } from 'lucide-react';
import type { SavedPatientRecord } from '../types';

interface PatientHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: SavedPatientRecord[];
  onLoadRecord: (record: SavedPatientRecord) => void;
  onDeleteRecord: (id: string) => void;
}

export const PatientHistoryModal: React.FC<PatientHistoryModalProps> = ({
  isOpen,
  onClose,
  records,
  onLoadRecord,
  onDeleteRecord,
}) => {
  const [search, setSearch] = React.useState('');

  if (!isOpen) return null;

  const filtered = records.filter(
    (r) =>
      r.patient.nome.toLowerCase().includes(search.toLowerCase()) ||
      r.qp.toLowerCase().includes(search.toLowerCase()) ||
      (r.aiResults.mainHypothesis || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.aiResults.selectedCid || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-[#252525] rounded-lg shadow-2xl border border-[#ececeb] dark:border-[#333] w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        <div className="px-4 py-3 bg-slate-50 dark:bg-[#202020] border-b border-[#ececeb] dark:border-[#333] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-800 dark:text-neutral-100">
              Histórico de Atendimentos Salvos ({records.length})
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-ice-200 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 border-b border-[#ececeb] dark:border-[#333] bg-white dark:bg-navy-900">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por nome do paciente, queixa ou hipótese diagnóstica..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded border border-[#ececeb] dark:border-[#333] bg-slate-50 dark:bg-navy-950 text-slate-800 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-500"
            />
          </div>
        </div>

        <div className="p-4 flex-1 overflow-y-auto space-y-2 text-xs">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-400 dark:text-slate-500">
              <User className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              Nenhum paciente encontrado no histórico.
            </div>
          ) : (
            filtered.map((rec) => (
              <div
                key={rec.id}
                className="p-3 border border-[#ececeb] dark:border-[#333] rounded-md hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-navy-900 transition-all flex items-start justify-between gap-3 shadow-2xs"
              >
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800 dark:text-neutral-100 text-sm truncate">
                      {rec.patient.nome || 'Paciente sem nome'}
                    </span>
                    <span className="text-[11px] bg-slate-100 dark:bg-navy-800 text-slate-600 dark:text-neutral-200 px-1.5 py-0.5 rounded">
                      {rec.patient.idade ? `${rec.patient.idade}a` : '--'} {rec.patient.sexo || ''}
                    </span>
                    {rec.observation.inObservation && (
                      <span className="text-[10px] bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded font-medium">
                        Em Observação
                      </span>
                    )}
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 truncate">
                    <strong className="text-slate-400 dark:text-slate-500 font-normal">QP:</strong> {rec.qp || 'Não informada'}
                  </p>
                  {(rec.aiResults.mainHypothesis || rec.aiResults.selectedCid) && (
                    <p className="text-ice-600 dark:text-neutral-300 font-medium truncate flex items-center gap-1.5">
                      {rec.aiResults.mainHypothesis && <span>HD: {rec.aiResults.mainHypothesis}</span>}
                      {rec.aiResults.selectedCid && (
                        <span className="font-mono text-[10px] bg-slate-100 dark:bg-navy-900 text-slate-700 dark:text-ice-300 px-1 py-0.2 rounded border border-slate-200 dark:border-slate-800">
                          CID: {rec.aiResults.selectedCid}
                        </span>
                      )}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 dark:text-slate-500 pt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(rec.savedAt).toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      onLoadRecord(rec);
                      onClose();
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-ice-500/10 text-ice-600 dark:text-neutral-300 hover:bg-ice-500/20 font-medium text-xs transition-colors"
                    title="Carregar atendimento"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    Abrir
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Excluir o registro de ${rec.patient.nome || 'paciente'}?`)) {
                        onDeleteRecord(rec.id);
                      }
                    }}
                    className="p-1.5 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                    title="Excluir do histórico"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-4 py-2.5 bg-slate-50 dark:bg-[#202020] border-t border-[#ececeb] dark:border-[#333] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white bg-white dark:bg-navy-800 border border-[#ececeb] dark:border-[#333] rounded"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
