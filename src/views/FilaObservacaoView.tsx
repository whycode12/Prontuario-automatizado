import React from 'react';
import { Bed, ArrowRight, RotateCcw } from 'lucide-react';
import type { SavedPatientRecord } from '../types';

interface FilaObservacaoViewProps {
  activeObsPatients: SavedPatientRecord[];
  currentRecordId: string;
  onSelectPatient: (rec: SavedPatientRecord) => void;
  onDischargePatient: (recordId: string) => void;
  onRestorePatient?: () => void;
  canRestore?: boolean;
  computeCountdown: (startedAt?: string, revaluationMinutes?: number) => {
    status: 'ok' | 'soon' | 'overdue';
    text: string;
    badgeClass: string;
    remaining?: number;
  };
}

function formatRevalWindow(minutes?: number): string {
  const m = minutes || 120;
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}min` : `${h}h`;
}

function calculateTargetRevalTime(startedAt?: string, minutes: number = 120): string {
  if (!startedAt) return '--:--';
  const match = startedAt.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return '--:--';
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const total = h * 60 + m + minutes;
  const targetH = Math.floor((total / 60) % 24);
  const targetM = total % 60;
  return `${String(targetH).padStart(2, '0')}:${String(targetM).padStart(2, '0')}`;
}

function formatConductsList(rawText: string): string[] {
  if (!rawText || !rawText.trim()) return ['Acompanhamento clínico'];
  // Separa por quebras de linha ou se tópicos estiverem com hífens no mesmo parágrafo
  const lines = rawText
    .split(/\n|(?<=[.;,\w])\s*-\s+/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return ['Acompanhamento clínico'];
  return lines;
}

export const FilaObservacaoView: React.FC<FilaObservacaoViewProps> = ({
  activeObsPatients,
  currentRecordId,
  onSelectPatient,
  onDischargePatient,
  onRestorePatient,
  canRestore,
  computeCountdown,
}) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#ececeb] dark:border-[#333]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-navy-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-700 dark:text-ice-200 shadow-2xs">
            <Bed className="w-4 h-4" />
          </div>
          <h1 className="text-base font-bold text-slate-900 dark:text-ice-50 uppercase tracking-wide">
            REAVALIAÇÕES
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {canRestore && onRestorePatient && (
            <button
              type="button"
              onClick={onRestorePatient}
              className="h-8 px-2.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-[#383838] bg-white dark:bg-[#252525] text-slate-700 dark:text-neutral-200 hover:bg-[#f5f5f5] dark:hover:bg-[#2e2e2e] flex items-center gap-1.5 transition-colors shadow-2xs"
              title="Restaurar último paciente liberado da observação"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Desfazer</span>
            </button>
          )}
          <span className="h-8 px-2.5 rounded-lg text-xs font-medium inline-flex items-center justify-center bg-slate-100 dark:bg-[#252525] text-slate-700 dark:text-neutral-200 border border-[#ececeb] dark:border-[#333]">
            Total: {activeObsPatients.length}
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
            Nenhum paciente em reavaliação no momento
          </h2>
          <p className="text-sm text-slate-400 dark:text-slate-500 max-w-md mx-auto">
            Os pacientes colocados em observação na tela de atendimento clínico aparecerão listados aqui ordenados por urgência da reavaliação.
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
                    ? 'border-ice-400 dark:border-ice-500 bg-ice-50/20 dark:bg-navy-800 ring-1 ring-ice-400/40'
                    : 'border-[#ececeb] dark:border-[#333] bg-white dark:bg-[#252525] hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="space-y-2.5">
                  {/* Top Bar: Name, Age, Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-900 dark:text-neutral-100 text-sm flex items-center gap-1.5 truncate">
                        <span className="truncate">{rec.patient.nome || 'Paciente sem nome'}</span>
                        {isSelected && (
                          <span className="text-[9px] uppercase px-1.5 py-0.5 rounded font-bold bg-ice-500 text-white shrink-0">
                            Em edição
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {rec.patient.idade ? `${rec.patient.idade} anos` : 'Idade --'}
                      </span>
                    </div>

                    <span className={`shrink-0 whitespace-nowrap ${countdown.badgeClass}`}>
                      {countdown.text}
                    </span>
                  </div>

                  {/* Horários: Início, Janela e Previsto */}
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between py-1 px-2 rounded-lg bg-slate-50 dark:bg-[#202020]/60 border border-slate-100 dark:border-slate-800/60 font-mono">
                    <span>Início: <strong className="text-slate-700 dark:text-neutral-200">{rec.observation.startedAt || '--:--'}</strong></span>
                    <span>Janela: <strong className="text-slate-700 dark:text-neutral-200">{formatRevalWindow(rec.observation.revaluationTimeMinutes)}</strong></span>
                    <span>Previsto: <strong className="text-slate-700 dark:text-neutral-200">{calculateTargetRevalTime(rec.observation.startedAt, rec.observation.revaluationTimeMinutes || 120)}</strong></span>
                  </div>

                  {/* QP */}
                  <div className="text-xs text-slate-600 dark:text-neutral-300 bg-slate-50 dark:bg-[#202020]/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/60">
                    <strong className="text-slate-700 dark:text-neutral-200">QP:</strong> {rec.qp || 'Não informada'}
                  </div>

                  {/* HD */}
                  <div className="text-xs text-slate-600 dark:text-neutral-300">
                    <strong className="text-slate-700 dark:text-neutral-200">HD:</strong> {rec.aiResults?.mainHypothesis || rec.observation?.conclusionNewHypothesis || 'A esclarecer'}
                  </div>

                  {/* Condutas com quebra inicial e quebra entre topicos */}
                  <div className="text-xs text-slate-600 dark:text-neutral-300 space-y-1">
                    <strong className="text-slate-700 dark:text-neutral-200 block">Condutas:</strong>
                    <div className="space-y-0.5 pl-0.5">
                      {formatConductsList(rec.condutas || '').map((item, idx) => (
                        <div key={idx} className="leading-snug">
                          {item.startsWith('-') ? item : `- ${item}`}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* O que reavaliar */}
                  <div className="text-xs text-slate-600 dark:text-neutral-300">
                    <strong className="text-slate-700 dark:text-neutral-200">Reavaliar:</strong>{' '}
                    {rec.observation?.whatToReevaluate || 'Reavaliação geral do estado clínico'}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectPatient(rec)}
                    className="h-8 w-8 rounded-lg text-slate-600 hover:text-slate-900 dark:text-neutral-300 dark:hover:text-white bg-slate-100 dark:bg-[#252525] hover:bg-slate-200 dark:hover:bg-[#2e2e2e] border border-slate-200 dark:border-[#383838] transition-colors shadow-2xs flex items-center justify-center shrink-0"
                    title={isSelected ? 'Abrir evolução médica' : 'Atender e evoluir paciente'}
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onDischargePatient(rec.id)}
                    className="h-8 px-2.5 rounded-lg text-xs text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                    title="Liberar leito de observação"
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
