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

export function numeroPorExtenso(num: number): string {
  const unidades = [
    'zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove',
    'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete',
    'dezoito', 'dezenove', 'vinte', 'vinte e um', 'vinte e dois', 'vinte e três',
    'vinte e quatro', 'vinte e cinco', 'vinte e seis', 'vinte e sete', 'vinte e oito',
    'vinte e nove', 'trinta'
  ];
  if (num >= 0 && num < unidades.length) return unidades[num];
  return String(num);
}

export function getDataExtenso(d: Date = new Date()): string {
  const meses = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];
  return `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
}

export function formatUsoWithColon(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text.replace(/\b(USO\s+[A-ZÀ-Úa-zà-ú]+)(?!\s*:)\b/g, '$1:');
}

export function ensureOriento(text: string): string {
  if (!text || typeof text !== 'string') return '';
  const trimmed = text.trim();
  if (!trimmed) return '';

  if (/^oriento\b/i.test(trimmed)) {
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  }

  if (/^[-*•]\s*/.test(trimmed)) {
    const withoutBullet = trimmed.replace(/^[-*•]\s*/, '').trim();
    if (/^oriento\b/i.test(withoutBullet)) {
      return withoutBullet.charAt(0).toUpperCase() + withoutBullet.slice(1);
    }
    const isAcronym = /^[A-Z]{2,}\b/.test(withoutBullet);
    const firstChar = isAcronym ? withoutBullet.charAt(0) : withoutBullet.charAt(0).toLowerCase();
    const rest = withoutBullet.slice(1);
    return `Oriento ${firstChar}${rest}`;
  }

  const isAcronym = /^[A-Z]{2,}\b/.test(trimmed);
  const firstChar = isAcronym ? trimmed.charAt(0) : trimmed.charAt(0).toLowerCase();
  const rest = trimmed.slice(1);
  return `Oriento ${firstChar}${rest}`;
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

  const techOrient = ensureOriento(aiResults.techOrientations?.trim() || '');
  const techAlarm = ensureOriento(aiResults.techAlarmSignals?.trim() || '');
  const layOrient = aiResults.layOrientations?.trim() || '';
  const layAlarm = aiResults.layAlarmSignals?.trim() || '';

  const hasSeparateTechAlarm = /\{\{(alarme_prontuario|sinais_alarme_prontuario|alarme_tecnico|sinais_alarme_tecnicos)\}\}/i.test(templateStr);

  const diferentialsText = aiResults.differentialDiagnoses?.length
    ? aiResults.differentialDiagnoses.join(' • ')
    : '';

  const examesSolicitados = [aiResults.orderedLabs, aiResults.orderedImages].filter(Boolean).join('\n') || 'Nenhum exame solicitado.';
  const examesSolicitadosLinha = [aiResults.orderedLabs, aiResults.orderedImages].filter(Boolean).join(' | ') || 'Nenhum';

  const rawUnitMeds = (aiResults.unitMedications || []).map(formatUsoWithColon);
  const rawHomeMeds = (aiResults.homeMedications || []).map(formatUsoWithColon);

  const medsUnidadeText = rawUnitMeds.join('\n\n') || 'Nenhuma medicação prescrita na unidade.';
  const medsUnidadeLinha = rawUnitMeds.join('; ') || 'Nenhuma';
  const medsCasaText = rawHomeMeds.join('\n\n') || 'Nenhuma medicação domiciliar.';
  const medsCasaLinha = rawHomeMeds.join('; ') || 'Nenhuma';

  let output = templateStr;

  // 0. Custom replacements (highest priority if provided)
  for (const [key, val] of Object.entries(customReplacements)) {
    const escaped = key.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    output = output.replace(new RegExp(`\\{\\{${escaped}\\}\\}`, 'gi'), val);
  }

  // 1. Orientações e Alarmes (sempre iniciam com 'Oriento...' no prontuário)
  if (!techOrient) {
    output = output.replace(/^[ \t]*-[ \t]*\{\{(orientacoes_prontuario|orientacao_prontuario)\}\}[ \t]*(?:\r?\n)?/gmi, '');
    output = output.replace(/\{\{(orientacoes_prontuario|orientacao_prontuario)\}\}/gi, '');
  } else {
    output = output.replace(/\{\{(orientacoes_prontuario|orientacao_prontuario)\}\}/gi, techOrient);
  }

  if (!techAlarm) {
    output = output.replace(/^[ \t]*-[ \t]*\{\{(alarme_prontuario|sinais_alarme_prontuario|alarme_tecnico|sinais_alarme_tecnicos)\}\}[ \t]*(?:\r?\n)?/gmi, '');
    output = output.replace(/\{\{(alarme_prontuario|sinais_alarme_prontuario|alarme_tecnico|sinais_alarme_tecnicos)\}\}/gi, techAlarm);
  } else {
    output = output.replace(/\{\{(alarme_prontuario|sinais_alarme_prontuario|alarme_tecnico|sinais_alarme_tecnicos)\}\}/gi, techAlarm);
  }

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
  const idadeText = patient.idade || '--';
  if (/mes|ano/i.test(idadeText)) {
    output = output.replace(/\{\{IDADE\}\}\s*anos/gi, idadeText);
  }
  output = output.replace(/\{\{IDADE\}\}/gi, idadeText);
  output = output.replace(/\{\{SEXO\}\}/gi, patient.sexo === 'M' ? 'Masculino' : patient.sexo === 'F' ? 'Feminino' : patient.sexo || 'Não informado');
  output = output.replace(/\{\{PESO\}\}/gi, patient.peso || '--');
  output = output.replace(/\{\{ALTURA\}\}/gi, patient.altura || '--');
  output = output.replace(/\{\{DATA\}\}/gi, todayDate);
  output = output.replace(/\{\{DATA_HORA\}\}/gi, dataHora);
  const horaAdmissao = patient.horaInicio || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const admissaoFormatted = patient.dataHoraInicio || `${todayDate} - ${horaAdmissao}`;
  output = output.replace(/\{\{ADMISSAO\}\}/gi, admissaoFormatted);
  output = output.replace(/\{\{MEDICO_RESPONSAVEL\}\}/gi, 'Dr.');

  // 3. Clínica - não puxar se não preenchido
  output = output.replace(/\{\{QP\}\}/gi, qp.trim() || 'Não informada');
  output = output.replace(/\{\{HMA\}\}/gi, hma.trim() || 'Não informada');
  output = output.replace(/\{\{HMA_RESUMO\}\}/gi, hma ? hma.slice(0, 150) + (hma.length > 150 ? '...' : '') : 'Não informada');

  // 4. HPP - se não preencheu na página inicial, omitir a linha correspondente
  const hppFields = [
    { key: 'ALERGIAS', label: 'Alergias', val: hpp.alergias },
    { key: 'COMORBIDADES', label: 'Comorbidades', val: hpp.comorbidades },
    { key: 'MUC', label: 'MUC', val: hpp.muc },
    { key: 'CIRURGIAS', label: 'Cirurgias prévias', val: hpp.cirurgias },
    { key: 'TABAGISMO', label: 'Tabagismo', val: hpp.tabagismo },
    { key: 'ETILISMO', label: 'Etilismo', val: hpp.etilismo },
  ];

  for (const f of hppFields) {
    const val = f.val?.trim();
    if (!val) {
      const linePattern = new RegExp(`^[ \\t]*\\|[ \\t]*${f.label}:[ \\t]*\\{\\{${f.key}\\}\\}[ \\t]*(?:\\r?\\n)?`, 'gmi');
      output = output.replace(linePattern, '');
      output = output.replace(new RegExp(`\\{\\{${f.key}\\}\\}`, 'gi'), 'Nega');
    } else {
      output = output.replace(new RegExp(`\\{\\{${f.key}\\}\\}`, 'gi'), val);
    }
  }

  const viciosList: string[] = [];
  const tab = hpp.tabagismo?.trim();
  const etil = hpp.etilismo?.trim();
  if (tab && !/^nega\b/i.test(tab)) viciosList.push(tab);
  if (etil && !/^nega\b/i.test(etil)) viciosList.push(etil);
  const viciosFinal = viciosList.length > 0 ? viciosList.join(', ') : 'Nega';
  output = output.replace(/\{\{VICIOS\}\}/gi, viciosFinal);

  // 5. Sinais Vitais - omitir parâmetros não preenchidos (ex: se não preencheu FR, não puxa)
  const vitalsItems: string[] = [];
  if (vitals.pa?.trim()) vitalsItems.push(`PA: ${vitals.pa.trim()} mmHg`);
  if (vitals.fc?.trim()) vitalsItems.push(`FC: ${vitals.fc.trim()} bpm`);
  if (vitals.fr?.trim()) vitalsItems.push(`FR: ${vitals.fr.trim()} irpm`);
  if (vitals.sat?.trim()) vitalsItems.push(`SatO2: ${vitals.sat.trim()}%`);
  if (vitals.tax?.trim()) vitalsItems.push(`Tax: ${vitals.tax.trim()}ºC`);

  const vitalsLine = vitalsItems.join(' | ');
  output = output.replace(
    /^[ \t]*(?:(?:PA:\s*\{\{PA\}\}\s*mmHg|FC:\s*\{\{FC\}\}\s*bpm|FR:\s*\{\{FR\}\}\s*irpm|SatO2:\s*\{\{SAT\}\}%|Tax:\s*\{\{TAX\}\}ºC)(?:[ \t]*\|[ \t]*|\s*))+[ \t]*(?:\r?\n)?/gm,
    vitalsLine ? `${vitalsLine}\n` : ''
  );

  output = output.replace(/\{\{PA\}\}/gi, vitals.pa?.trim() || '');
  output = output.replace(/\{\{FC\}\}/gi, vitals.fc?.trim() || '');
  output = output.replace(/\{\{FR\}\}/gi, vitals.fr?.trim() || '');
  output = output.replace(/\{\{SAT\}\}/gi, vitals.sat?.trim() || '');
  output = output.replace(/\{\{TAX\}\}/gi, vitals.tax?.trim() || '');

  // 6. Exame Físico e Resultados
  output = output.replace(/\{\{EXAME_FISICO\}\}/gi, exameFisico.trim() || '');
  output = output.replace(/\{\{EXAME_RESUMO\}\}/gi, exameFisico ? exameFisico.slice(0, 100) + '...' : 'Sem alterações descritas');
  output = output.replace(/\{\{RESULTADOS_EXAMES\}\}/gi, examResults.trim() || 'Nenhum resultado informado');

  // 7. Hipóteses e CID - formato oficial: HIPÓTESE PRINCIPAL (CID CÓDIGO - NOME)
  let formattedHipotese = aiResults.mainHypothesis?.trim() || 'A esclarecer';
  if (aiResults.selectedCid?.trim()) {
    const cleanCid = aiResults.selectedCid.trim().replace(/^CID:?\s*/i, '');
    if (!formattedHipotese.includes(cleanCid)) {
      formattedHipotese = `${formattedHipotese} (CID ${cleanCid})`;
    }
  }

  output = output.replace(/\{\{HIPOTESE\}\}/gi, formattedHipotese);
  output = output.replace(/\{\{HIPOTESE_INICIAL\}\}/gi, aiResults.mainHypothesis?.trim() || 'Não informada');
  output = output.replace(/\{\{DIFERENCIAIS\}\}/gi, diferentialsText ? `Diferenciais: ${diferentialsText}` : '');
  output = output.replace(/\{\{CID\}\}/gi, aiResults.selectedCid ? `CID: ${aiResults.selectedCid}` : '');
  output = output.replace(/\{\{CIDS\}\}/gi, aiResults.selectedCid ? `CID: ${aiResults.selectedCid}` : '');

  // 8. Condutas
  const isPassometroTemplate = templateStr.includes('ADMISSÃO::') || templateStr.includes('LOCAL DO PACIENTE::');
  const condutasFallback = isPassometroTemplate ? '-' : 'Condutas sintomáticas e orientações';
  output = output.replace(/\{\{CONDUTAS\}\}/gi, condutas.trim() || condutasFallback);
  output = output.replace(/\{\{CONDUTAS_UNIDADE\}\}/gi, rawUnitMeds.join(', ') || condutas || 'Sintomáticos');
  output = output.replace(/\{\{CONDUTAS_FEITAS\}\}/gi, rawUnitMeds.join(', ') || 'Sintomáticos');
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
  const propostasDefault = observation.whatToReevaluate
    ? `- ${observation.whatToReevaluate}`
    : '- Aguardar RL para definição de conduta';
  output = output.replace(/\{\{PROPOSTAS\}\}/gi, customReplacements?.PROPOSTAS || propostasDefault);

  // 10. Injeção de Prescrição Interna no Prontuário se houver medicações na unidade
  const hasUnitMeds = rawUnitMeds.some((m) => m && m.trim() && !/^nenhuma\b/i.test(m.trim()));
  if (hasUnitMeds && /#CONDUTAS:/i.test(output) && !/PRESCRIÇÃO INTERNA:/i.test(output)) {
    const formattedInterna = rawUnitMeds.filter((m) => m && m.trim()).join('\n\n');
    const internalBlock = `———————————————————————————————————\n\nPRESCRIÇÃO INTERNA:\n\n${formattedInterna}`;

    const footerMatch = output.match(/(\n\s*(?:Paciente atendido|Atenciosamente|Dr\.|Acadêmico)[\s\S]*$)/i);
    if (footerMatch && footerMatch.index !== undefined) {
      const beforeFooter = output.slice(0, footerMatch.index).trimEnd();
      const footer = footerMatch[1];
      output = `${beforeFooter}\n\n${internalBlock}\n${footer}`;
    } else {
      output = `${output.trimEnd()}\n\n${internalBlock}\n`;
    }
  }

  // 11. Tags específicas para Atestado Médico e Encaminhamento PSF
  const cpfFormatted = patient.cpf?.trim() || '_________________';
  const portadorCpf = patient.sexo === 'M'
    ? `portador do CPF nº ${cpfFormatted}`
    : patient.sexo === 'F'
    ? `portadora do CPF nº ${cpfFormatted}`
    : `portador(a) do CPF nº ${cpfFormatted}`;

  const atendidoUnidade = patient.sexo === 'M'
    ? 'foi atendido'
    : patient.sexo === 'F'
    ? 'foi atendida'
    : 'foi atendido(a)';

  const dataExtenso = getDataExtenso();

  const rawDias = customReplacements?.DIAS || aiResults.medicalLeaveDays || '1';
  const diasNumMatch = String(rawDias).match(/\d+/);
  const diasNum = diasNumMatch ? parseInt(diasNumMatch[0], 10) : 1;
  const diasExtenso = numeroPorExtenso(diasNum);
  const diasFormatted = diasNum < 10 ? String(diasNum).padStart(2, '0') : String(diasNum);
  const palavraDia = diasNum === 1 ? 'dia' : 'dias';

  const cleanCidOnly = aiResults.selectedCid ? aiResults.selectedCid.replace(/^CID:?\s*/i, '').trim() : '';
  const includeCid = customReplacements?.INCLUIR_CID === 'true' || !!customReplacements?.BLOCO_CID;
  const blocoCidFinal = customReplacements?.BLOCO_CID !== undefined
    ? customReplacements.BLOCO_CID
    : includeCid
    ? `\n    CID-10: ${cleanCidOnly || '[Código]'}\n\nAssinatura do paciente:\n`
    : '';

  output = output.replace(/\{\{PORTADOR_CPF\}\}/gi, portadorCpf);
  output = output.replace(/\{\{ATENDIDO_UNIDADE\}\}/gi, atendidoUnidade);
  output = output.replace(/\{\{ATENDIDO\}\}/gi, atendidoUnidade);
  output = output.replace(/\{\{CPF\}\}/gi, cpfFormatted);
  output = output.replace(/\{\{DATA_EXTENSO\}\}/gi, dataExtenso);
  output = output.replace(/\{\{DIAS\}\}/gi, diasFormatted);
  output = output.replace(/\{\{DIAS_EXTENSO\}\}/gi, diasExtenso);
  output = output.replace(/\{\{DIA_OU_DIAS\}\}/gi, palavraDia);
  output = output.replace(/\{\{PALAVRA_DIA\}\}/gi, palavraDia);
  output = output.replace(/dia\(s\)/gi, palavraDia);
  output = output.replace(/\{\{BLOCO_CID\}\}/gi, blocoCidFinal ? `\n${blocoCidFinal.trim()}\n` : '');
  output = output.replace(/\{\{CID_CODIGO\}\}/gi, cleanCidOnly || '[Código]');

  // Encaminhamento PSF
  const textoEncaminhamentoDefault = `Encaminho o(a) paciente ${patient.nome || 'Não identificado(a)'}, ${patient.idade ? `${patient.idade} anos` : '--'}, atendido(a) na UPA de Mateus Leme nesta data com quadro de ${qp || 'queixa clínica'}. ${hma ? `Histórico clínico: ${hma.slice(0, 200)}... ` : ''}Foram realizadas condutas sintomáticas e estabilização clínica na unidade. Solicito seguimento ambulatorial junto à equipe da Atenção Primária à Saúde (PSF) para propedêutica e acompanhamento clínico continuado.`;
  output = output.replace(/\{\{TEXTO_ENCAMINHAMENTO\}\}/gi, customReplacements?.TEXTO_ENCAMINHAMENTO || textoEncaminhamentoDefault);

  // 12. Padronização de vias com dois pontos (ex: 'USO ORAL:', 'USO INTRAMUSCULAR:')
  output = formatUsoWithColon(output);

  return output.replace(/\n{3,}/g, '\n\n');
}
