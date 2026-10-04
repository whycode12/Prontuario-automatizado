import React, { useState } from 'react';
import { History, Search, Trash2, ArrowRight, UserCheck, Calendar, Bed, Cloud } from 'lucide-react';
import type { SavedPatientRecord } from '../types';

interface HistoricoViewProps {
  records: SavedPatientRecord[];
  currentRecordId: string;
  onLoadRecord: (record: SavedPatientRecord) => void;
  onDeleteRecord: (id: string) => void;
  onOpenCloudSync?: () => void;
}

export const HistoricoView: React.FC<HistoricoViewProps> = ({
  records,
  currentRecordId,
  onLoadRecord,
  onDeleteRecord,
  onOpenCloudSync,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRecords = records.filter((r) => {
    const term = searchTerm.toLowerCase();
    const nome = (r.patient?.nome || '').toLowerCase();
    const qp = (r.qp || '').toLowerCase();
    const hd = (r.aiResults?.mainHypothesis || '').toLowerCase();
    return nome.includes(term) || qp.includes(term) || hd.includes(term);
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#ececeb] dark:border-[#333]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-ice-500/15 border border-ice-400/30 flex items-center justify-center text-ice-500">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-ice-50 tracking-tight">
              Histórico Geral de Atendimentos
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Todos os pacientes atendidos e salvos na memória local com busca e recuperação instantânea.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenCloudSync && (
            <button
              type="button"
              onClick={onOpenCloudSync}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-[#252525] border border-[#ececeb] dark:border-[#383838] hover:bg-slate-50 dark:hover:bg-[#2e2e2e] text-slate-700 dark:text-neutral-200 flex items-center gap-1.5 transition-colors shadow-xs"
              title="Sincronizar com Firebase na nuvem"
            >
              <Cloud className="w-3.5 h-3.5 text-ice-500" />
              <span>Nuvem Criptografada</span>
            </button>
          )}
          <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-[#252525] text-slate-700 dark:text-neutral-200 border border-[#ececeb] dark:border-[#333]">
            Total: {records.length} atendimento{records.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Buscar por nome do paciente, queixa principal ou hipótese diagnóstica..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#e5e5e5] dark:border-[#333] bg-white dark:bg-[#252525] text-slate-800 dark:text-neutral-100 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-500/50 shadow-xs"
        />
      </div>

      {/* List */}
      {filteredRecords.length === 0 ? (
        <div className="text-center py-16 px-6 bg-white dark:bg-[#252525] rounded-xl border border-dashed border-[#ececeb] dark:border-[#333] space-y-3">
          <History className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
          <h2 className="text-base font-semibold text-slate-700 dark:text-neutral-200">
            {searchTerm ? 'Nenhum paciente encontrado para esta busca.' : 'Nenhum atendimento salvo ainda.'}
          </h2>
          <p className="text-sm text-slate-400 dark:text-slate-500 max-w-md mx-auto">
            Os pacientes que você atender e salvar automaticamente aparecerão listados aqui com todos os dados preenchidos.
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
                        {rec.patient.sexo ? ` ⬢ Sexo ${rec.patient.sexo}` : ''}
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

                  {/* Sinais Vitais Resumo */}
                  {(rec.vitals.pa || rec.vitals.fc) && (
                    <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                      PA: {rec.vitals.pa || '--'} | FC: {rec.vitals.fc || '--'} | Sat: {rec.vitals.sat || '--'}%
                    </div>
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onLoadRecord(rec)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors bg-ice-500 hover:bg-ice-600 text-white shadow-xs"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>{isCurrent ? 'Continuar Atendimento' : 'Carregar no Prontuário'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Excluir permanentemente o registro de ${rec.patient.nome || 'paciente'}?`)) {
                        onDeleteRecord(rec.id);
                      }
                    }}
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
