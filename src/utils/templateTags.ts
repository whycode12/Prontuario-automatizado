import type { PatientData, VitalSigns, HppData, AIResult, ObservationData } from '../types';

export interface TagContextData {
  patient: PatientData;
  qp?: string;
  hma?: string;
  hpp: HppData;
  vitals: VitalSigns;
  exameFisico?: string;
  examResults?: string;
  condutas?: string;
  aiResults: AIResult;
  observation: ObservationData;
  todayDate?: string;
  dataHora?: string;
  customReplacements?: Record<string, string>;
}

/**
 * Motor centralizado e unificado de substituição de tags {{TAG}} em qualquer documento ou payload.
 * Garante que todas as tags funcionem exatamente da mesma forma em todo o app.
 */
export function replaceTemplateTags(templateStr: string, data: TagContextData): string {
  if (!templateStr || typeof templateStr !== 'string') return '';

  const {
    patient,
    qp = '',
    hma = '',
    hpp,
    vitals,
    exameFisico = '',
    examResults = '',
    condutas = '',
    aiResults,
    observation,
    todayDate = new Date().toLocaleDateString('pt-BR'),
    dataHora = (() => {
      const now = new Date();
      return `${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    })(),
    customReplacements = {}
  } = data;

  const techOrient = aiResults.techOrientations?.trim() || '';
  const techAlarm = aiResults.techAlarmSignals?.trim() || '';
  const layOrient = aiResults.layOrientations?.trim() || '';
  const layAlarm = aiResults.layAlarmSignals?.trim() || '';

  const hasSeparateTechAlarm = /\{\{(alarme_prontuario|sinais_alarme_prontuario|alarme_tecnico|sinais_alarme_tecnicos)\}\}/i.test(templateStr);

  const diferentialsText = aiResults.differentialDiagnoses?.length
    ? aiResults.differentialDiagnoses.join(' • ')
    : '';

  const examesSolicitados = [aiResults.orderedLabs, aiResults.orderedImages].filter(Boolean).join('\n') || 'Nenhum exame solicitado.';
  const examesSolicitadosLinha = [aiResults.orderedLabs, aiResults.orderedImages].filter(Boolean).join(' | ') || 'Nenhum';

  const medsUnidadeText = (aiResults.unitMedications || []).join('\n') || 'Nenhuma medicação prescrita na unidade.';
  const medsUnidadeLinha = (aiResults.unitMedications || []).join('; ') || 'Nenhuma';
  const medsCasaText = (aiResults.homeMedications || []).join('\n\n') || 'Nenhuma medicação domiciliar.';
  const medsCasaLinha = (aiResults.homeMedications || []).join('; ') || 'Nenhuma';

  let output = templateStr;

  // 0. Custom replacements (highest priority if provided)
  for (const [key, val] of Object.entries(customReplacements)) {
    const escaped = key.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    output = output.replace(new RegExp(`\\{\\{${escaped}\\}\\}`, 'gi'), val);
  }

  // 1. Orientações e Alarmes (4 canais dedicados)
  output = output.replace(/\{\{(orientacoes_prontuario|orientacao_prontuario)\}\}/gi, techOrient);
  output = output.replace(/\{\{(alarme_prontuario|sinais_alarme_prontuario|alarme_tecnico|sinais_alarme_tecnicos)\}\}/gi, techAlarm);

  if (hasSeparateTechAlarm) {
    output = output.replace(/\{\{(orientacoes_tecnicas|orientacao_tecnica)\}\}/gi, techOrient);
  } else {
    const combinedTech = [techOrient, techAlarm].filter(Boolean).join('\n\n');
    output = output.replace(/\{\{(orientacoes_tecnicas|orientacao_tecnica)\}\}/gi, combinedTech);
  }

  output = output.replace(/\{\{(orientacoes_paciente|orientacao_paciente|orientacoes_receita|orientacoes_leigas)\}\}/gi, layOrient);
  output = output.replace(/\{\{(alarme_paciente|sinais_alarme_paciente|alarme_receita|sinais_alarme_leigos)\}\}/gi, layAlarm);

  // 2. Dados do Paciente
  output = output.replace(/\{\{NOME\}\}/gi, patient.nome || 'Não informado');
  output = output.replace(/\{\{IDADE\}\}/gi, patient.idade || '--');
  output = output.replace(/\{\{SEXO\}\}/gi, patient.sexo === 'M' ? 'Masculino' : patient.sexo === 'F' ? 'Feminino' : patient.sexo || 'Não informado');
  output = output.replace(/\{\{PESO\}\}/gi, patient.peso || '--');
  output = output.replace(/\{\{ALTURA\}\}/gi, patient.altura || '--');
  output = output.replace(/\{\{DATA\}\}/gi, todayDate);
  output = output.replace(/\{\{DATA_HORA\}\}/gi, dataHora);

  // 3. Clínica
  output = output.replace(/\{\{QP\}\}/gi, qp || 'Não informada');
  output = output.replace(/\{\{HMA\}\}/gi, hma || 'Não informada');
  output = output.replace(/\{\{HMA_RESUMO\}\}/gi, hma ? hma.slice(0, 150) + (hma.length > 150 ? '...' : '') : 'Não informada');

  // 4. HPP
  output = output.replace(/\{\{ALERGIAS\}\}/gi, hpp.alergias || 'Nega');
  output = output.replace(/\{\{COMORBIDADES\}\}/gi, hpp.comorbidades || 'Nega');
  output = output.replace(/\{\{MUC\}\}/gi, hpp.muc || 'Nega');
  output = output.replace(/\{\{CIRURGIAS\}\}/gi, hpp.cirurgias || 'Nega');
  output = output.replace(/\{\{TABAGISMO\}\}/gi, hpp.tabagismo || 'Nega');
  output = output.replace(/\{\{ETILISMO\}\}/gi, hpp.etilismo || 'Nega');

  // 5. Sinais Vitais
  output = output.replace(/\{\{PA\}\}/gi, vitals.pa || '--');
  output = output.replace(/\{\{FC\}\}/gi, vitals.fc || '--');
  output = output.replace(/\{\{FR\}\}/gi, vitals.fr || '--');
  output = output.replace(/\{\{SAT\}\}/gi, vitals.sat || '--');
  output = output.replace(/\{\{TAX\}\}/gi, vitals.tax || '--');

  // 6. Exame Físico e Resultados
  output = output.replace(/\{\{EXAME_FISICO\}\}/gi, exameFisico || 'Não informado');
  output = output.replace(/\{\{EXAME_RESUMO\}\}/gi, exameFisico ? exameFisico.slice(0, 100) + '...' : 'Sem alterações descritas');
  output = output.replace(/\{\{RESULTADOS_EXAMES\}\}/gi, examResults || 'Nenhum resultado informado');

  // 7. Hipóteses e CID
  output = output.replace(/\{\{HIPOTESE\}\}/gi, aiResults.mainHypothesis || 'A esclarecer');
  output = output.replace(/\{\{HIPOTESE_INICIAL\}\}/gi, aiResults.mainHypothesis || 'Não informada');
  output = output.replace(/\{\{DIFERENCIAIS\}\}/gi, diferentialsText ? `Diferenciais: ${diferentialsText}` : '');
  output = output.replace(/\{\{CID\}\}/gi, aiResults.selectedCid ? `CID: ${aiResults.selectedCid}` : '');
  output = output.replace(/\{\{CIDS\}\}/gi, aiResults.selectedCid ? `CID: ${aiResults.selectedCid}` : '');

  // 8. Condutas
  output = output.replace(/\{\{CONDUTAS\}\}/gi, condutas.trim() || 'Condutas sintomáticas e orientações');
  output = output.replace(/\{\{CONDUTAS_UNIDADE\}\}/gi, (aiResults.unitMedications || []).join(', ') || condutas || 'Sintomáticos');
  output = output.replace(/\{\{CONDUTAS_FEITAS\}\}/gi, (aiResults.unitMedications || []).join(', ') || 'Sintomáticos');
  output = output.replace(/\{\{MEDS_UNIDADE\}\}/gi, medsUnidadeLinha);
  output = output.replace(/\{\{MEDICACOES_UNIDADE\}\}/gi, medsUnidadeText);
  output = output.replace(/\{\{MEDS_CASA\}\}/gi, medsCasaLinha);
  output = output.replace(/\{\{MEDICACOES_CASA\}\}/gi, medsCasaText);
  output = output.replace(/\{\{EXAMES_SOLICITADOS\}\}/gi, templateStr.includes('=== DADOS') ? examesSolicitadosLinha : examesSolicitados);

  // 9. Observação
  output = output.replace(
    /\{\{STATUS_OBSERVACAO\}\}/gi,
    observation.inObservation ? `SIM (Reavaliar em ${observation.revaluationTimeMinutes} min)` : 'NÃO'
  );
  output = output.replace(/\{\{STATUS\}\}/gi, observation.inObservation ? 'Em observação clínica' : 'Em atendimento');
  output = output.replace(/\{\{PENDENCIAS_OBSERVACAO\}\}/gi, observation.whatToReevaluate || 'N/A');
  output = output.replace(/\{\{PENDENCIAS\}\}/gi, observation.whatToReevaluate || (examResults ? 'Conferir exames' : 'Reavaliação clínica'));
  output = output.replace(/\{\{REAVALIACAO_TEXTO\}\}/gi, observation.clinicalReevaluationText || 'Paciente reavaliado em leito de observação, mantendo estabilidade clínica.');
  output = output.replace(/\{\{NOVA_HIPOTESE\}\}/gi, observation.conclusionNewHypothesis || aiResults.mainHypothesis || 'Quadro clínico inalterado.');
  output = output.replace(/\{\{NOVAS_CONDUTAS\}\}/gi, observation.newConducts || '- Alta clínica orientada com receitas e orientações domiciliares.');
  output = output.replace(/\{\{SINAIS_ALERTA\}\}/gi, 'Piora hemodinâmica ou dor refratária');

  return output;
}
