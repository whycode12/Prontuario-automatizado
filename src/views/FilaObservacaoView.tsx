import React from 'react';
import { Bed, ArrowRight, Clock, AlertTriangle, UserCheck } from 'lucide-react';
import type { SavedPatientRecord } from '../types';

interface FilaObservacaoViewProps {
  activeObsPatients: SavedPatientRecord[];
  currentRecordId: string;
  onSelectPatient: (rec: SavedPatientRecord) => void;
  onDischargePatient: (recordId: string) => void;
  computeCountdown: (startedAt?: string, revaluationMinutes?: number) => {
    status: 'ok' | 'soon' | 'overdue';
    text: string;
    badgeClass: string;
  };
}

export const FilaObservacaoView: React.FC<FilaObservacaoViewProps> = ({
  activeObsPatients,
  currentRecordId,
  onSelectPatient,
  onDischargePatient,
  computeCountdown,
}) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#ececeb] dark:border-[#333]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-500">
            <Bed className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-ice-50 tracking-tight">
              Fila de Leitos em Observação Clínica
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Controle em tempo real de reavaliações, metas e pendências clínicas dos pacientes em observação.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            {activeObsPatients.length} paciente{activeObsPatients.length === 1 ? '' : 's'} no leito
          </span>
        </div>
      </div>

      {/* Main Content */}
      {activeObsPatients.length === 0 ? (
        <div className="text-center py-16 px-6 bg-white dark:bg-[#252525] rounded-xl border border-dashed border-[#ececeb] dark:border-[#333] space-y-3">
          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-navy-900 flex items-center justify-center text-slate-400 mx-auto">
            <Bed className="w-7 h-7" />
          </div>
          <h2 className="text-base font-semibold text-slate-700 dark:text-neutral-200">
            Nenhum paciente colocado em observação no momento
          </h2>
          <p className="text-sm text-slate-400 dark:text-slate-500 max-w-md mx-auto">
            Para admitir um paciente no leito de observação, selecione <strong>Desfecho: Observação</strong> na aba de Atendimento Clínico ou clique no botão superior <strong>+ Observação</strong>.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeObsPatients.map((rec) => {
            const countdown = computeCountdown(
              rec.observation.startedAt,
              rec.observation.revaluationTimeMinutes || 120
            );
            const isSelected = rec.id === currentRecordId;

            return (
              <div
                key={rec.id}
                className={`rounded-xl border p-4 flex flex-col justify-between space-y-3 transition-all shadow-xs ${
                  isSelected
                    ? 'border-amber-400 dark:border-amber-500/80 bg-amber-50/20 dark:bg-amber-950/20 ring-1 ring-amber-400/30'
                    : 'border-[#ececeb] dark:border-[#333] bg-white dark:bg-[#252525] hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="space-y-2.5">
                  {/* Top Bar: Name, Sex/Age, Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-neutral-100 text-sm flex items-center gap-2">
                        <span>{rec.patient.nome || 'Paciente sem identificação'}</span>
                        {isSelected && (
                          <span className="text-[10px] uppercase px-1.5 py-0.5 rounded font-bold bg-amber-500 text-white">
                            Em edição
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {rec.patient.idade ? `${rec.patient.idade} anos` : 'Idade não inf.'}
                        {rec.patient.sexo ? ` ⬢ Sexo ${rec.patient.sexo}` : ''}
                      </span>
                    </div>

                    <span className={`text-xs px-2.5 py-1 rounded-md border whitespace-nowrap ${countdown.badgeClass}`}>
                      {countdown.text}
                    </span>
                  </div>

                  {/* Queixa Principal */}
                  <div className="text-xs text-slate-600 dark:text-neutral-300 bg-slate-50 dark:bg-[#202020]/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/60">
                    <strong className="text-slate-700 dark:text-neutral-200">QP:</strong> {rec.qp || 'Não informada'}
                  </div>

                  {/* Info: Início e Janela */}
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      Início: <strong>{rec.observation.startedAt || 'Recente'}</strong>
                    </span>
                    <span>⬢</span>
                    <span>
                      Janela: <strong>{rec.observation.revaluationTimeMinutes || 120} min</strong>
                    </span>
                  </div>

                  {/* O que avaliar */}
                  <div className="bg-amber-50/40 dark:bg-navy-950 p-3 rounded-lg border border-amber-200/60 dark:border-slate-800 text-xs space-y-1">
                    <span className="font-bold text-amber-900 dark:text-amber-300 block uppercase tracking-wider text-[11px] flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      O que reavaliar no leito:
                    </span>
                    <p className="text-slate-700 dark:text-neutral-200 leading-relaxed italic">
                      {rec.observation.whatToReevaluate || 'Reavaliação geral do estado clínico e checagem de condutas.'}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectPatient(rec)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors bg-ice-500 hover:bg-ice-600 text-white shadow-xs"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>{isSelected ? 'Abrir Evolução' : 'Atender / Evoluir'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onDischargePatient(rec.id)}
                    className="text-xs px-2 py-1 rounded text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                    title="Dar alta clínica e retirar o paciente da fila de observação"
                  >
                    Liberar Leito
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
