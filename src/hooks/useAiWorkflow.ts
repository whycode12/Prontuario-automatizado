import { useState } from 'react';
import type { SystemPrompts, SystemTemplates, AIResult, FinalDocuments, ObservationData } from '../types';
import { callGeminiApi } from '../services/gemini';
import { safeJsonParse } from '../utils/jsonSafe';
import { DEFAULT_PROMPTS } from '../data/defaults';
import { addAiLog, updateAiLog } from '../utils/aiLogger';
import { formatUsoWithColon, ensureOriento } from '../utils/templateTags';
import { ensureReceituarioDb, standardizePrescriptionList } from '../services/receituarioService';

export const DEFAULT_ENCAMINHAMENTO_PROMPT = `Você é um médico experiente atuando na UPA de Mateus Leme - MG.
Elabore um relatório de encaminhamento médico para o PSF (Posto de Saúde da Família / Atenção Básica) de forma humanizada, profissional, empática e sem qualquer aspecto robótico de inteligência artificial.
DIRETRIZES OBRIGATÓRIAS:
1. Inclua os dados do paciente (nome completo e idade).
2. Redija em texto corrido, contínuo e fluido (sem divisões em tópicos excessivos), uma história clínica BREVE e concisa, relatando em ordem cronológica que o paciente foi consultado na UPA de Mateus Leme nesta data.
3. Descreva de forma direta e objetiva o que foi investigado e administrado na unidade (exames complementares e medicações administradas).
4. Explique com clareza e justifique por QUAL motivo o paciente necessita de seguimento ambulatorial na Atenção Básica (ex: investigação etiológica de ITU de repetição, ajuste de anti-hipertensivo, controle glicêmico, acompanhamento de lesão, propedêutica complementar, etc.).
5. Mantenha tom colegial, respeitoso e colaborativo de médico da urgência para médico da atenção primária.
6. Concordância estrita de gênero: se o paciente for do sexo masculino, use exclusivamente termos masculinos ("o paciente", "atendido", "encaminhado", "avaliado"). Se for do sexo feminino, use exclusivamente termos femininos ("a paciente", "atendida", "encaminhada", "avaliada"). NUNCA use "o(a)", "(a)" ou barras de gênero.`;

export const DEFAULT_GERAR_CONDUTAS_PROMPT = `Você é um médico experiente atuando no pronto atendimento (UPA/SUS).
Gere APENAS as condutas médicas objetivas do atendimento em tópicos com hífen (- ), de forma ultra concisa, profissional e direta ao ponto, baseando-se estritamente no que foi decidido e realizado no caso clínico.

PADRÃO E ESTRUTURA DOS TÓPICOS:
1. Medicações prescritas:
   - Sintetize as classes e os nomes principais dos medicamentos prescritos (na unidade e/ou domiciliar), agrupando sintomáticos.
   - Exemplos:
     "- Prescrevo ATB (Amoxicilina-Clavulanato) e sintomáticos."
     "- Prescrevo sintomáticos e analgesia venosa na unidade."
     "- Prescrevo sintomáticos via oral para uso domiciliar."
2. Exames solicitados (se houver pedido de exames laboratoriais ou de imagem):
   - Cite diretamente os exames pedidos usando siglas médicas habituais.
   - Exemplos:
     "- Solicito RX de tórax em AP e PERFIL."
     "- Solicito HMG, Cr, Ur, K, Na."
3. Orientações clínicas dadas ao paciente (extraídas das orientações):
   - Exemplo: "- Oriento hidratação oral frequente, dieta pastosa e repouso relativo."
4. Sinais de alarme alertados ao paciente (extraídos dos sinais de alarme):
   - Exemplo: "- Oriento retorno imediato se surgimento de exantema, dificuldade respiratória, trismo ou incapacidade de deglutir saliva."
5. Documentos emitidos (leia se foi fornecido atestado médico ou relatório):
   - Se houver relatório/encaminhamento gerado ou indicado: "- Fornecido relatório para continuidade do acompanhamento em PSF."
   - Se houver atestado médico gerado ou indicado: "- Fornecido atestado médico de 01 dias." (o padrão em pronto atendimento é sempre 01 dia, nunca 03).
6. Desfecho clínico (OBRIGATORIAMENTE o último tópico):
   - Se alta médica: "- Alta médica com orientações."
   - Se em observação: "- Mantenho em observação, reavaliar após resultados de exames." (ou reavaliar após término da medicação).

DIRETRIZES:
- Retorne APENAS os tópicos iniciados com hífen (- ), sem introduções, sem saudações e sem comentários adicionais.`;

interface UseAiWorkflowParams {
  apiKey: string;
  model: string;
  prompts: SystemPrompts;
  getCasePayload: (templateKey: keyof SystemTemplates) => string;
  condutas: string;
  setCondutas?: (val: string) => void;
  susFilter: boolean;
  setAiResults: React.Dispatch<React.SetStateAction<AIResult>>;
  setDocuments: React.Dispatch<React.SetStateAction<FinalDocuments>>;
  showToast: (msg: string) => void;
  openAiLogModal?: () => void;
  patient?: any;
  aiResults?: AIResult;
  documents?: FinalDocuments;
  observation?: ObservationData;
  setObservation?: React.Dispatch<React.SetStateAction<ObservationData>>;
  examResults?: string;
}

export function useAiWorkflow({
  apiKey,
  model,
  prompts,
  getCasePayload,
  condutas,
  setCondutas,
  susFilter,
  setAiResults,
  setDocuments,
  showToast,
  openAiLogModal,
  patient,
  aiResults,
  documents,
  observation,
  setObservation,
  examResults
}: UseAiWorkflowParams) {
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});

  const executeAiAction = async (
    actionName: string,
    loadingKey: string,
    actionFn: (logId: string) => Promise<void>
  ) => {
    setAiLoading((prev) => ({ ...prev, [loadingKey]: true }));
    const startTime = Date.now();
    const currentModel = (model || '').trim() || 'gemini-3.1-flash-lite';
    const logId = addAiLog({
      action: actionName,
      model: currentModel,
      status: 'running',
      message: `Enviando requisição clínica para o modelo ${currentModel}...`
    });

    try {
      await actionFn(logId);
      updateAiLog(logId, {
        status: 'success',
        durationMs: Date.now() - startTime,
        message: `${actionName} processado com sucesso.`
      });
    } catch (err: any) {
      const errMsg = err?.message || 'Falha na comunicação com a API do Google';
      updateAiLog(logId, {
        status: 'error',
        durationMs: Date.now() - startTime,
        message: `Erro na execução: ${errMsg}`,
        errorDetails: err?.stack || String(err)
      });
      openAiLogModal?.();
      showToast(`Falha na IA (${actionName}): ${errMsg}`);
    } finally {
      setAiLoading((prev) => ({ ...prev, [loadingKey]: false }));
    }
  };

  const runAiHma = async () => {
    await executeAiAction('Sugestão de HMA', 'hma', async () => {
      const jsonExample = `{"hmaRefinada": "texto fluido e técnico...", "perguntasFaltantes": ["Pergunta 1", "Pergunta 2"]}`;
      const payload = getCasePayload('payloadHma');
      const response = await callGeminiApi(
        apiKey,
        model,
        prompts.hma,
        payload,
        'Analise a QP e HMA informadas. Melhore a redação da HMA e liste o que faltou perguntar.',
        jsonExample
      );

      const parsed = safeJsonParse(response);
      setAiResults((prev) => ({
        ...prev,
        hmaSuggestion: parsed.hmaRefinada || '',
        hmaMissingQuestions: parsed.perguntasFaltantes || []
      }));
    });
  };

  const runAiExameFisico = async () => {
    await executeAiAction('Exame Físico', 'exame', async () => {
      const jsonExample = `{"exameRefinado": "BEG, (...)", "manobrasFaltantes": ["Manobra 1", "Manobra 2"]}`;
      const payload = getCasePayload('payloadExameFisico');
      const response = await callGeminiApi(
        apiKey,
        model,
        prompts.exameFisico,
        payload,
        'Analise o exame físico e a queixa. Refine a redação mantendo o padrão e indique partes ou manobras faltantes.',
        jsonExample
      );

      const parsed = safeJsonParse(response);
      setAiResults((prev) => ({
        ...prev,
        physicalExamSuggestion: parsed.exameRefinado || '',
        physicalExamMissingManeuvers: parsed.manobrasFaltantes || []
      }));
    });
  };

  const runAiDiagnostico = async () => {
    await executeAiAction('Diagnóstico e CIDs', 'diagnostico', async () => {
      const jsonExample = `{
  "hipotesePrincipal": "Cistite Aguda Não Complicada",
  "rankingHipoteses": [
    {"nome": "Cistite Aguda Não Complicada", "tipo": "Principal", "prob": "Alta"},
    {"nome": "Pielonefrite Aguda", "tipo": "Diferencial", "prob": "Média"},
    {"nome": "Vaginite Infecciosa", "tipo": "Diferencial", "prob": "Baixa"},
    {"nome": "Urolitíase", "tipo": "Diferencial", "prob": "Baixa"}
  ],
  "diagnosticosDiferenciais": [
    {"nome": "Pielonefrite Aguda", "prob": "Média"},
    {"nome": "Vaginite Infecciosa", "prob": "Baixa"},
    {"nome": "Urolitíase", "prob": "Baixa"}
  ],
  "cids": [
    {"cid": "N30.0", "desc": "Cistite aguda", "prob": "Alta"},
    {"cid": "N39.0", "desc": "Infecção do trato urinário de localização não especificada", "prob": "Média"},
    {"cid": "N10", "desc": "Nefrite túbulo-intersticial aguda (Pielonefrite)", "prob": "Baixa"},
    {"cid": "N20.0", "desc": "Cálculo do rim / urolitíase", "prob": "Baixa"},
    {"cid": "R10.2", "desc": "Dor pélvica e perineal", "prob": "Baixa"}
  ],
  "notificacaoCompulsoria": false,
  "detalhesNotificacao": "",
  "escoresClinicos": [
    {"name": "Centor / McIsaac", "score": "0 pontos", "interpretation": "Baixo risco de infecção estreptocócica"}
  ]
}`;
      const payload = getCasePayload('payloadDiagnostico');
      const response = await callGeminiApi(
        apiKey,
        model,
        prompts.diagnostico,
        payload,
        'Elabore a hipótese principal (usando obrigatoriamente a nomenclatura médica oficial equivalente do CID-10), ranking de hipóteses (principal e diferenciais) com probabilidade (Alta, Média ou Baixa), ranking de 5 CIDs com probabilidade utilizando a nomenclatura estritamente oficial da tabela CID-10 (DATASUS/OMS), verificação de notificação compulsória e escores clínicos pertinentes.',
        jsonExample
      );

      const parsed = safeJsonParse(response);

      // Monta o ranking estruturado de hipóteses
      let rankingHipoteses = parsed.rankingHipoteses || [];
      if (!rankingHipoteses.length && parsed.hipotesePrincipal) {
        rankingHipoteses.push({
          nome: parsed.hipotesePrincipal,
          tipo: 'Principal',
          prob: 'Alta'
        });
        if (Array.isArray(parsed.diagnosticosDiferenciais)) {
          parsed.diagnosticosDiferenciais.forEach((item: any, idx: number) => {
            if (typeof item === 'string') {
              rankingHipoteses.push({
                nome: item,
                tipo: 'Diferencial',
                prob: idx === 0 ? 'Média' : 'Baixa'
              });
            } else if (item && typeof item === 'object') {
              rankingHipoteses.push({
                nome: item.nome || item.name || item.hipotese || '',
                tipo: 'Diferencial',
                prob: item.prob || item.probabilidade || (idx === 0 ? 'Média' : 'Baixa')
              });
            }
          });
        }
      }

      const diffStrings = rankingHipoteses
        .filter((h: any) => h.tipo?.toLowerCase() !== 'principal' && h.nome !== parsed.hipotesePrincipal)
        .map((h: any) => h.nome);

      const cids = parsed.cids || [];
      const defaultCid = cids.length > 0 ? `${cids[0].cid} - ${cids[0].desc}` : undefined;

      setAiResults((prev) => ({
        ...prev,
        mainHypothesis: parsed.hipotesePrincipal || prev.mainHypothesis,
        hypothesisRankings: rankingHipoteses,
        differentialDiagnoses: diffStrings.length ? diffStrings : (parsed.diagnosticosDiferenciais || []),
        cidRankings: cids,
        selectedCid: prev.selectedCid || defaultCid,
        isCompulsoryNotification: !!parsed.notificacaoCompulsoria,
        compulsoryDetails: parsed.detalhesNotificacao || '',
        clinicalScores: parsed.escoresClinicos || []
      }));
    });
  };

  const runAiConduta = async () => {
    await executeAiAction('Prescrições e Orientações', 'conduta', async () => {
      const jsonExample = `{
  "medicacoesUnidade": [
    "USO INTRAMUSCULAR:\\n\\n1. Cloridrato de Ondansetrona (2mg/mL) —————————— 1 ampola (2 mL)\\nAdministrar 1 ampola (2 mL), IM, sem diluição, agora."
  ],
  "medicacoesCasa": [
    "USO ORAL:\\n\\n1. Amoxicilina + Clavulanato 875mg + 125mg —————— 1 caixa\\nTomar 1 comprimido, via oral, de 8 em 8 horas, por 10 dias.\\n\\n2. Dipirona 500mg ——————————————————————————————— 1 caixa\\nTomar 2 comprimidos, via oral, podendo repetir de 6 em 6 horas, se dor ou febre."
  ],
  "disclaimers": [
    {"med": "Cetoprofeno", "type": "warning", "note": "Cuidado em idoso frágil e nefropatas (risco renal)."},
    {"med": "Dipirona", "type": "contraindication", "note": "ATENÇÃO: Checagem estrita de alergias conforme HPP."}
  ],
  "alertaProfilaxiaVacinal": "",
  "examesLaboratorio": "HMG, Ur, Cr",
  "examesImagem": "RX de braço esquerdo AP e PERFIL",
  "desfechoSugerido": "alta",
  "motivoDesfecho": "Quadro clínico controlado com boa tolerância oral.",
  "encaminhamentoUbs": true,
  "motivoEncaminhamento": "Seguimento ambulatorial na UBS de referência.",
  "atestadoNecessario": true,
  "diasAtestado": "01 dia",
  "motivoAtestado": "Repouso durante fase álgica aguda.",
  "orientacoesProntuario": "Oriento hidratação oral vigorosa e repouso relativo durante a fase sintomática.",
  "sinaisAlarmeProntuario": "Oriento retorno imediato ao pronto atendimento se febre persistente, vômitos refratários ou piora da dor.",
  "orientacoesReceita": "Repouso relativo, hidratação hídrica adequada e tomar os medicamentos nos horários prescritos.",
  "sinaisAlarmeReceita": "Retorne imediatamente ao pronto atendimento se apresentar: febre alta que não cede, dor intensa ou vômitos recorrentes."
}`;
      const instruction = `Você é um médico experiente atuando no Brasil (UPA/SUS). Decida as prescrições (unidade e domiciliar), exames estritamente necessários e orientações para este caso clínico.
DIRETRIZES OBRIGATÓRIAS:
1. RIGOR EXTREMO EM EXAMES E PRESCRIÇÕES: Seja estritamente criterioso. NÃO seja permissivo. Só prescreva medicações ou solicite exames se forem estritamente necessários para o caso clínico apresentado. Se não houver indicação clara para exames, retorne vazio ("") em "examesLaboratorio" e "examesImagem".
2. PRESCRIÇÃO INTERNA (Unidade) E DOMICILIAR:
   - Defina as medicações clínicas indicadas. O aplicativo consultará o banco de dados oficial do sistema para formatar a prescrição no padrão rigoroso cadastrado.
   - Na prescrição domiciliar, utilize APENAS o princípio ativo com dosagem (nunca inclua nomes comerciais entre parênteses). Redija a posologia com via explícita (ex: 'Tomar 1 comprimido, via oral, podendo repetir de 8 em 8 horas, por até 5 dias, se dor ou febre.' ou 'Tomar 1 comprimido, via oral, de 8 em 8 horas, por 10 dias.').
   - PREFIRA via Intramuscular (IM) na unidade quando não for fazer várias medicações simultâneas ou quando não exigir infusão venosa contínua.
3. ORIENTAÇÕES E SINAIS DE ALARME:
   - Personalize estritamente adaptado ao agravo e à pessoa consultada (faixa etária e contexto do paciente). Jamais utilize orientações genéricas desconexas.
   - OBRIGATÓRIO: Em 'orientacoesProntuario' e 'sinaisAlarmeProntuario' para o prontuário, comece SEMPRE com a palavra 'Oriento...'. Seja conciso e objetivo.
4. ATESTADO MÉDICO: O padrão de dias de atestado em Pronto Atendimento / UPA é RIGOROSAMENTE 01 dia ("01 dia"). NUNCA sugira 3 dias nem prazos estendidos; em UPA o padrão é estritamente 01 dia para o repouso imediato.
5. SEGURANÇA E SUS: Checagem estrita de alergias conforme a HPP, avisos para idoso frágil/nefropatas em 'disclaimers', profilaxia de tétano/raiva se aplicável em 'alertaProfilaxiaVacinal'. ${
        susFilter ? 'PRIORIZE FORTEMENTE FÁRMACOS DA RENAME / FARMÁCIA BÁSICA DO SUS.' : ''
      }`;

      const payload = getCasePayload('payloadConduta');
      const response = await callGeminiApi(
        apiKey,
        model,
        prompts.conduta,
        payload,
        instruction,
        jsonExample
      );

      const parsed = safeJsonParse(response);
      const formatExamList = (val: any): string => {
        if (!val) return '';
        if (Array.isArray(val)) {
          return val.map((item) => String(item).trim()).filter(Boolean).join('\n');
        }
        if (typeof val === 'string') {
          const trimmed = val.trim();
          if (trimmed.includes('\n')) return trimmed;
          if (trimmed.includes(',')) {
            return trimmed
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
              .join('\n');
          }
          return trimmed;
        }
        return String(val);
      };

      const formatMedList = (val: any): string[] => {
        if (!val) return [];
        if (Array.isArray(val)) {
          return val.map((item) => String(item).trim()).filter(Boolean);
        }
        if (typeof val === 'string') {
          const trimmed = val.trim();
          return trimmed ? [trimmed] : [];
        }
        return [String(val)];
      };

      await ensureReceituarioDb();
      const rawUnit = formatMedList(parsed.medicacoesUnidade);
      const rawHome = formatMedList(parsed.medicacoesCasa);
      const stdUnit = standardizePrescriptionList(rawUnit, 'interna', patient?.peso);
      const stdHome = standardizePrescriptionList(rawHome, 'domiciliar', patient?.peso);

      const finalUnit = stdUnit.length > 0 ? stdUnit.map(formatUsoWithColon) : rawUnit.map(formatUsoWithColon);
      const finalHome = stdHome.length > 0 ? stdHome.map(formatUsoWithColon) : rawHome.map(formatUsoWithColon);

      const aiSuggested = (parsed.desfechoSugerido as 'alta' | 'observacao' | 'internacao' | 'transferencia') || 'alta';

      setAiResults((prev) => ({
        ...prev,
        unitMedications: finalUnit,
        homeMedications: finalHome,
        medicationDisclaimers: parsed.disclaimers || [],
        tetanusRabiesAlert: parsed.alertaProfilaxiaVacinal || '',
        orderedLabs: formatExamList(parsed.examesLaboratorio),
        orderedImages: formatExamList(parsed.examesImagem),
        suggestedOutcome: aiSuggested,
        clinicalOutcome: aiSuggested,
        outcomeReason: parsed.motivoDesfecho || '',
        referralNeeded: !!parsed.encaminhamentoUbs,
        referralReason: parsed.motivoEncaminhamento || '',
        medicalLeaveNeeded: !!parsed.atestadoNecessario,
        medicalLeaveDays: (() => {
          const raw = parsed.diasAtestado || '';
          const m = String(raw).match(/\d+/);
          let n = m ? parseInt(m[0], 10) : 1;
          if (n === 3 || isNaN(n) || n <= 0) n = 1;
          const formattedN = n <= 9 ? `0${n}` : String(n);
          const p = n === 1 ? 'dia' : 'dias';
          return `${formattedN} ${p}`;
        })(),
        medicalLeaveReason: parsed.motivoAtestado || '',
        techOrientations: ensureOriento(parsed.orientacoesProntuario || parsed.textoTecnico || ''),
        techAlarmSignals: ensureOriento(parsed.sinaisAlarmeProntuario || ''),
        layOrientations: parsed.orientacoesReceita || parsed.textoLeigo || '',
        layAlarmSignals: parsed.sinaisAlarmeReceita || ''
      }));
    });
  };

  const runAiGerarCondutas = async () => {
    await executeAiAction('Gerar Condutas', 'gerarCondutas', async () => {
      const payloadBase = getCasePayload('payloadConduta');

      const medsUnidadeText = Array.isArray(aiResults?.unitMedications)
        ? aiResults.unitMedications.join('\n\n').trim()
        : (aiResults?.unitMedications || '').trim();
      const medsCasaText = Array.isArray(aiResults?.homeMedications)
        ? aiResults.homeMedications.join('\n\n').trim()
        : (aiResults?.homeMedications || '').trim();
      const labsText = (aiResults?.orderedLabs || '').trim();
      const imagesText = (aiResults?.orderedImages || '').trim();
      const orientText = (aiResults?.techOrientations || '').trim();
      const alarmText = (aiResults?.techAlarmSignals || '').trim();
      const outcomeText = observation?.inObservation
        ? 'Em observação clínica para reavaliação após medicação/exames'
        : (aiResults?.clinicalOutcome === 'observacao' ? 'Em observação clínica' : 'Alta médica com orientações');

      const atestadoText = (documents?.atestado || '').trim() || (aiResults?.medicalLeaveDays ? `${aiResults.medicalLeaveDays}` : '');
      const relatorioText = (documents?.encaminhamento || '').trim() || (aiResults?.referralReason ? `Sim (${aiResults.referralReason})` : '');

      const factualActionsPayload = `=== AÇÕES CLÍNICAS REALIZADAS E DEFINIDAS NESTE ATENDIMENTO ===
- PRESCRIÇÃO INTERNA (Unidade):
${medsUnidadeText || 'Nenhuma medicação prescrita na unidade'}

- PRESCRIÇÃO DOMICILIAR:
${medsCasaText || 'Nenhuma medicação domiciliar prescrita'}

- EXAMES LABORATORIAIS SOLICITADOS:
${labsText || 'Nenhum exame laboratorial solicitado'}

- EXAMES DE IMAGEM SOLICITADOS:
${imagesText || 'Nenhum exame de imagem solicitado'}

- ORIENTAÇÕES CLÍNICAS (Prontuário):
${orientText || 'Orientações gerais de repouso e hidratação'}

- SINAIS DE ALARME (Prontuário):
${alarmText || 'Retorno imediato se piora dos sintomas ou sinais de alerta'}

- ATESTADO MÉDICO:
${atestadoText ? `Sim (${atestadoText})` : 'Não emitido'}

- RELATÓRIO / ENCAMINHAMENTO:
${relatorioText ? `Sim (${relatorioText})` : 'Não emitido'}

- DESFECHO CLÍNICO:
${outcomeText}`;

      const fullPayload = `${payloadBase}\n\n${factualActionsPayload}`;

      const activePrompt = prompts.gerarCondutas || DEFAULT_GERAR_CONDUTAS_PROMPT;
      const response = await callGeminiApi(
        apiKey,
        model,
        activePrompt,
        fullPayload,
        'Gere a síntese final de condutas em tópicos objetivos com hífen (- ), cobrindo estritamente as medicações feitas e prescritas, exames pedidos, orientações dadas, documentos emitidos (se houver atestado médico, o padrão da unidade é estritamente 01 dias) e o desfecho do paciente como último tópico.'
      );

      const cleaned = response
        .replace(/```[a-z]*\r?\n?/gi, '')
        .replace(/```/g, '')
        .trim();

      if (setCondutas) {
        setCondutas(cleaned);
      }
      setAiResults((prev) => ({
        ...prev,
        condutasSuggestion: cleaned
      }));
    });
  };

  const runAiMelhorarCondutas = async () => {
    await executeAiAction('Refinar Condutas', 'melhorarCondutas', async () => {
      const jsonExample = `{"condutasRefinadas": "- Dipirona 1g EV diluído em 100ml SF 0,9% agora em 20 min\\n- Hidratação com SF 0,9% 500ml EV\\n- Reavaliação clínica e sinais vitais após término das medicações"}`;
      const payload = `${getCasePayload('payloadConduta')}\n\n=== TEXTO ATUAL DE CONDUTAS DIGITADO PELO MÉDICO ===\n${condutas || 'Sem condutas descritas ainda'}`;
      const response = await callGeminiApi(
        apiKey,
        model,
        prompts.melhorarCondutas || DEFAULT_PROMPTS.melhorarCondutas || 'Aprimore a redação médica das condutas.',
        payload,
        'Analise todo o caso e o texto digitado em Condutas. Refine e melhore a redação médica das condutas mantendo padrão hospitalar/ambulatorial claro e organizado.',
        jsonExample
      );

      const parsed = safeJsonParse(response);
      setAiResults((prev) => ({
        ...prev,
        condutasSuggestion: parsed.condutasRefinadas || ''
      }));
    });
  };

  const runAiOrientacoes = async () => {
    await executeAiAction('Orientações e Alarmes', 'orientacoes', async () => {
      const jsonExample = `{
  "orientacoesProntuario": "Oriento repouso relativo, hidratação oral contínua e seguimento com médico assistente / UBS.",
  "sinaisAlarmeProntuario": "Oriento retorno imediato ao pronto atendimento se febre persistente, piora acentuada da dor ou dispneia.",
  "orientacoesReceita": "Mantenha repouso em casa e tome bastante água e sucos naturais. Tome as medicações receitadas rigorosamente nos horários indicados.",
  "sinaisAlarmeReceita": "Retorne imediatamente ao pronto atendimento se apresentar: febre alta que não baixa com os remédios, dor intensa que piore, vômitos que impeçam beber água ou falta de ar."
}`;
      const payload = getCasePayload('payloadOrientacoes');
      const response = await callGeminiApi(
        apiKey,
        model,
        prompts.orientacoes,
        payload,
        'Gere as orientações gerais e sinais de alarme em 4 campos distintos: orientações para prontuário, sinais de alarme para prontuário, orientações para receita e sinais de alarme para receita.',
        jsonExample
      );

      const parsed = safeJsonParse(response);
      setAiResults((prev) => ({
        ...prev,
        techOrientations: ensureOriento(parsed.orientacoesProntuario || parsed.textoTecnico || ''),
        techAlarmSignals: ensureOriento(parsed.sinaisAlarmeProntuario || ''),
        layOrientations: parsed.orientacoesReceita || parsed.textoLeigo || '',
        layAlarmSignals: parsed.sinaisAlarmeReceita || ''
      }));
    });
  };

  const runAiPassagemPlantao = async () => {
    await executeAiAction('Passagem de Plantão', 'passagem', async () => {
      const payload = getCasePayload('payloadPassagemPlantao');
      const response = await callGeminiApi(
        apiKey,
        model,
        prompts.passagemPlantao,
        payload,
        'Gere a passagem de caso oral sintetizada, direta ao ponto, para passagem de plantão.'
      );
      setDocuments((prev: FinalDocuments) => ({ ...prev, passagemPlantao: response.trim() }));
    });
  };

  const runAiPassometro = async () => {
    await executeAiAction('Passômetro', 'passometro', async () => {
      const payload = getCasePayload('payloadPassometro');
      const activePrompt = (prompts.passometro && !prompts.passometro.includes('Identificação e Leito') && prompts.passometro.includes('PACIENTE:'))
        ? prompts.passometro
        : DEFAULT_PROMPTS.passometro;
      const userInstruction = `Preencha o PASSÔMETRO respeitando ESTRITAMENTE a seguinte estrutura e ordem de campos:\n\nPACIENTE: [Nome]\nIDADE: [Idade] anos\nADMISSÃO:: [Data e hora: DD/MM/AAAA - HH:MM]\nMÉDICO RESPONSÁVEL: Dr.\nLOCAL DO PACIENTE:: [SALA DE MEDICAÇÃO // ENFERMARIA // SALA VERMELHA]\nBREVE CONTEXTO: [HMA reduzida com o que é importante]\n\nVÍCIOS: [Tabagista, etilista ou Nega]\nCOMORBIDADES: [HAS, DM2NIR ou Nega]\nMEDICAÇÕES DE USO CONTÍNUO: [Medicações ou Nega]\nALERGIAS MEDICAMENTOSAS: [Alergias ou Nega]\nEXAME FÍSICO ATUAL (somente dados relevantes ao caso): [Dados relevantes]\nHIPÓTESES DIAGNÓSTICAS: [Hipótese]\n\nCONDUTAS:\n-\n\nPROPOSTAS:\n- Aguardar RL para definição de conduta\n\nDiretrizes obrigatórias: Siga estritamente esta estrutura exata de tópicos.`;
      const response = await callGeminiApi(
        apiKey,
        model,
        activePrompt,
        payload,
        userInstruction
      );
      setDocuments((prev: FinalDocuments) => ({ ...prev, passometro: response.trim() }));
    });
  };

  const runAiEncaminhamento = async (customInstruction?: string) => {
    await executeAiAction('Relatório', 'encaminhamento', async () => {
      const payload = getCasePayload('payloadEncaminhamento');
      let userInstruction =
        'Gere o relatório de encaminhamento médico para o PSF em texto corrido humanizado, conciso e direto ao ponto, relatando atendimento na UPA de Mateus Leme e o motivo clínico do seguimento ambulatorial. Respeite rigorosamente o gênero do paciente (se masculino trate no masculino, se feminino trate no feminino), nunca utilize barras como "o(a)".';

      if (customInstruction && customInstruction.trim()) {
        userInstruction += `\n\n=== DIRETRIZ ESPECÍFICA DO MÉDICO PARA ESTE RELATÓRIO ===\n${customInstruction.trim()}`;
      }

      const response = await callGeminiApi(
        apiKey,
        model,
        prompts.encaminhamento || DEFAULT_ENCAMINHAMENTO_PROMPT,
        payload,
        userInstruction
      );
      let cleanResponse = response.trim();
      if (patient?.sexo === 'M') {
        cleanResponse = cleanResponse
          .replace(/\bo\(a\)\b/gi, 'o')
          .replace(/\bdo\(a\)\b/gi, 'do')
          .replace(/\bno\(a\)\b/gi, 'no')
          .replace(/\bao\(à\)\b/gi, 'ao')
          .replace(/atendido\(a\)/gi, 'atendido')
          .replace(/identificado\(a\)/gi, 'identificado')
          .replace(/encaminhado\(a\)/gi, 'encaminhado')
          .replace(/internado\(a\)/gi, 'internado')
          .replace(/portador\(a\)/gi, 'portador');
      } else if (patient?.sexo === 'F') {
        cleanResponse = cleanResponse
          .replace(/\bo\(a\)\b/gi, 'a')
          .replace(/\bdo\(a\)\b/gi, 'da')
          .replace(/\bno\(a\)\b/gi, 'na')
          .replace(/\bao\(à\)\b/gi, 'à')
          .replace(/atendido\(a\)/gi, 'atendida')
          .replace(/identificado\(a\)/gi, 'identificada')
          .replace(/encaminhado\(a\)/gi, 'encaminhada')
          .replace(/internado\(a\)/gi, 'internada')
          .replace(/portador\(a\)/gi, 'portadora');
      }
      setDocuments((prev: FinalDocuments) => ({ ...prev, encaminhamento: cleanResponse }));
    });
  };

  const runAiReavaliacao = async () => {
    await executeAiAction('Reavaliação Clínica', 'reavaliacao', async () => {
      const jsonExample = `{
  "reavaliacaoRefinada": "Paciente mantido em repouso e sob analgesia venosa. No momento, refere melhora expressiva do quadro álgico (EVA 2/10), nega novos picos febris ou episódios de êmese. Aceitando hidratação oral. Mantém estabilidade hemodinâmica.",
  "checagensFaltantes": ["Aferir novos sinais vitais de controle", "Palpação abdominal de controle pós-analgesia", "Checar débito urinário"]
}`;
      const payload = getCasePayload('payloadReavaliacao');
      const response = await callGeminiApi(
        apiKey,
        model,
        prompts.reavaliacao,
        payload,
        'Analise a evolução e reavaliação clínica. Estruture a redação e aponte checagens essenciais pendentes.',
        jsonExample
      );

      const parsed = safeJsonParse(response);
      setAiResults((prev) => ({
        ...prev,
        reevaluationSuggestion: parsed.reavaliacaoRefinada || '',
        missingReevaluationChecks: parsed.checagensFaltantes || []
      }));
    });
  };

  const runAiConclusaoObs = async () => {
    await executeAiAction('Conclusão da Observação', 'conclusaoObs', async () => {
      const jsonExample = `{
  "novaHipotese": "Cistite aguda não complicada com boa resposta inicial a sintomáticos e hidratação.",
  "novasCondutas": "- Alta médica da observação com receitas e orientações domiciliares.\\n- Fosfomicina 3g dose única VO hoje à noite.\\n- Dipirona 500mg VO de 6/6h se dor ou febre.\\n- Manter hidratação vigorosa e retorno à UBS para seguimento.\\n- Sinais de alarme orientados (febre refratária, dor lombar ou vômitos)."
}`;
      const payload = getCasePayload('payloadConclusaoObs');
      const response = await callGeminiApi(
        apiKey,
        model,
        prompts.conclusaoObs,
        payload,
        'Analise o caso, medicações feitas, exames realizados e reavaliação clínica para indicar a nova hipótese e as novas condutas.',
        jsonExample
      );

      const parsed = safeJsonParse(response);
      const novaHipotese = parsed.novaHipotese || parsed.novaHipótese || parsed.conclusao || '';
      const novasCondutas = parsed.novasCondutas || parsed.novasCondutasTexto || '';

      setAiResults((prev) => ({
        ...prev,
        conclusionHypothesisSuggestion: novaHipotese,
        newConductsSuggestion: novasCondutas
      }));
    });
  };

  const runAiDiagnosticoEvolucao = async () => {
    await executeAiAction('Hipótese Final (Evolução)', 'diagnosticoEvolucao', async () => {
      const jsonExample = `{
  "hipotesePrincipal": "Cistite Aguda Não Complicada",
  "rankingHipoteses": [
    {"nome": "Cistite Aguda Não Complicada", "tipo": "Principal", "prob": "Alta"},
    {"nome": "Pielonefrite Aguda", "tipo": "Diferencial", "prob": "Média"},
    {"nome": "Vaginite Infecciosa", "tipo": "Diferencial", "prob": "Baixa"},
    {"nome": "Urolitíase", "tipo": "Diferencial", "prob": "Baixa"}
  ],
  "cids": [
    {"cid": "N30.0", "desc": "Cistite aguda", "prob": "Alta"},
    {"cid": "N39.0", "desc": "Infecção do trato urinário de localização não especificada", "prob": "Média"},
    {"cid": "N10", "desc": "Nefrite túbulo-intersticial aguda (Pielonefrite)", "prob": "Baixa"},
    {"cid": "N20.0", "desc": "Cálculo do rim / urolitíase", "prob": "Baixa"},
    {"cid": "R10.2", "desc": "Dor pélvica e perineal", "prob": "Baixa"}
  ],
  "notificacaoCompulsoria": false,
  "detalhesNotificacao": "",
  "escoresClinicos": [
    {"name": "Centor / McIsaac", "score": "0 pontos", "interpretation": "Baixo risco de infecção estreptocócica"}
  ]
}`;
      const basePayload = getCasePayload('payloadCaso');
      const evolutionAddon = `\n=== DADOS COMPLETOS DA EVOLUÇÃO ATÉ O MOMENTO ===
RESULTADOS DE EXAMES (LABORATÓRIO / IMAGEM):
${examResults?.trim() || 'Nenhum exame informado até o momento'}

REAVALIAÇÃO CLÍNICA ATUAL:
${observation?.clinicalReevaluationText?.trim() || 'Reavaliação clínica não descrita'}

STATUS DE OBSERVAÇÃO:
${observation?.inObservation ? 'Em observação clínica' : 'Em atendimento'}`;

      const payload = `${basePayload}\n${evolutionAddon}`;

      const activePrompt = prompts.diagnosticoEvolucao || prompts.diagnostico;
      const response = await callGeminiApi(
        apiKey,
        model,
        activePrompt,
        payload,
        'Você é um médico assistente experiente em uma UPA no Brasil reavaliando a evolução clínica de um paciente. Analise rigorosamente TODO o caso (atendimento clínico inicial completo, queixa principal, HMA, HPP, exame físico, medicações já recebidas na unidade, resultados de exames complementares e a reavaliação clínica atual). Elabore a HIPÓTESE DIAGNÓSTICA FINAL refinada para a evolução médica (utilizando a nomenclatura médica oficial equivalente da tabela CID-10), o ranking de hipóteses diagnósticas (principal e diferenciais) com probabilidade (Alta, Média ou Baixa), ranking de 5 CIDs com probabilidade utilizando a nomenclatura estritamente oficial da tabela CID-10 (DATASUS/OMS), verificação de notificação compulsória (SINAN) e escores clínicos pertinentes ao momento evolutivo.',
        jsonExample
      );

      const parsed = safeJsonParse(response);

      let rankingHipoteses = parsed.rankingHipoteses || [];
      if (!rankingHipoteses.length && parsed.hipotesePrincipal) {
        rankingHipoteses.push({
          nome: parsed.hipotesePrincipal,
          tipo: 'Principal',
          prob: 'Alta'
        });
        if (Array.isArray(parsed.diagnosticosDiferenciais)) {
          parsed.diagnosticosDiferenciais.forEach((item: any, idx: number) => {
            if (typeof item === 'string') {
              rankingHipoteses.push({
                nome: item,
                tipo: 'Diferencial',
                prob: idx === 0 ? 'Média' : 'Baixa'
              });
            } else if (item && typeof item === 'object') {
              rankingHipoteses.push({
                nome: item.nome || item.name || item.hipotese || '',
                tipo: 'Diferencial',
                prob: item.prob || item.probabilidade || (idx === 0 ? 'Média' : 'Baixa')
              });
            }
          });
        }
      }

      const cids = parsed.cids || [];
      const defaultCid = cids.length > 0 ? `${cids[0].cid} - ${cids[0].desc}` : undefined;

      if (setObservation) {
        setObservation((prev) => ({
          ...prev,
          conclusionNewHypothesis: parsed.hipotesePrincipal || prev.conclusionNewHypothesis,
          conclusionCid: defaultCid || prev.conclusionCid,
          hypothesisRankings: rankingHipoteses,
          cidRankings: cids,
          isCompulsoryNotification: !!parsed.notificacaoCompulsoria,
          compulsoryDetails: parsed.detalhesNotificacao || '',
          clinicalScores: parsed.escoresClinicos || []
        }));
      }
    });
  };

  const runAiCondutaEvolucao = async () => {
    await executeAiAction('Prescrições e Orientações (Evolução)', 'condutaEvolucao', async () => {
      const jsonExample = `{
  "medicacoesUnidade": [
    "USO INTRAMUSCULAR:\\n\\n1. Cloridrato de Ondansetrona (2mg/mL) —————————— 1 ampola (2 mL)\\nAdministrar 1 ampola (2 mL), IM, sem diluição, agora."
  ],
  "medicacoesCasa": [
    "USO ORAL:\\n\\n1. Amoxicilina + Clavulanato 875mg + 125mg —————— 1 caixa\\nTomar 1 comprimido, via oral, de 8 em 8 horas, por 10 dias.\\n\\n2. Dipirona 500mg ——————————————————————————————— 1 caixa\\nTomar 2 comprimidos, via oral, podendo repetir de 6 em 6 horas, se dor ou febre."
  ],
  "disclaimers": [
    {"med": "Cetoprofeno", "type": "warning", "note": "Cuidado em idoso frágil e nefropatas (risco renal)."},
    {"med": "Dipirona", "type": "contraindication", "note": "ATENÇÃO: Checagem estrita de alergias conforme HPP."}
  ],
  "alertaProfilaxiaVacinal": "",
  "examesLaboratorio": "",
  "examesImagem": "",
  "desfechoSugerido": "alta",
  "motivoDesfecho": "Paciente apresentou melhora clínica expressiva dos sintomas, afebril, hemodinamicamente estável, tolerando dieta via oral e exames sem sinais de gravidade, permitindo alta médica segura com prescrição domiciliar.",
  "encaminhamentoUbs": true,
  "motivoEncaminhamento": "Seguimento ambulatorial na UBS de referência.",
  "atestadoNecessario": true,
  "diasAtestado": "01 dia",
  "motivoAtestado": "Repouso durante fase de recuperação.",
  "orientacoesProntuario": "Oriento hidratação oral vigorosa e repouso relativo durante a fase sintomática.",
  "sinaisAlarmeProntuario": "Oriento retorno imediato ao pronto atendimento se febre persistente, vômitos refratários ou piora da dor.",
  "orientacoesReceita": "Repouso relativo, hidratação hídrica adequada e tomar os medicamentos nos horários prescritos.",
  "sinaisAlarmeReceita": "Retorne imediatamente ao pronto atendimento se apresentar: febre alta que não cede, dor intensa ou vômitos recorrentes."
}`;

      const basePayload = getCasePayload('payloadCaso');
      const evolutionAddon = `\n=== DADOS COMPLETOS DA EVOLUÇÃO ATÉ O MOMENTO ===
RESULTADOS DE EXAMES:
${examResults?.trim() || 'Nenhum exame informado até o momento'}

REAVALIAÇÃO CLÍNICA ATUAL:
${observation?.clinicalReevaluationText?.trim() || 'Reavaliação clínica não descrita'}

HIPÓTESE DIAGNÓSTICA FINAL:
${observation?.conclusionNewHypothesis?.trim() || aiResults?.mainHypothesis || 'Em investigação'} ${observation?.conclusionCid ? `(CID ${observation.conclusionCid})` : ''}

STATUS ATUAL:
${observation?.inObservation ? 'Em observação clínica' : 'Em atendimento'}`;

      const payload = `${basePayload}\n${evolutionAddon}`;

      const instruction = `Você é um médico assistente experiente atuando no Brasil (UPA/SUS) definindo as novas condutas, prescrições, orientações e o DESFECHO ATUAL na EVOLUÇÃO MÉDICA do paciente.
Analise rigorosamente todo o caso: dados do atendimento inicial, medicações recebidas, exames complementares realizados, reavaliação clínica atual e hipótese diagnóstica final.
DIRETRIZES OBRIGATÓRIAS:
1. DESFECHO ATUAL DA EVOLUÇÃO:
   - Calcule e sugira com rigor clínico o DESFECHO ATUAL do paciente, escolhendo OBRIGATORIAMENTE um entre:
     * "alta": paciente clinicamente estável, afebril, assintomático ou com dor aliviada, tolerância oral e exames sem critérios de gravidade. Indique alta médica segura com prescrição domiciliar e orientações.
     * "observacao": se ainda necessitar de vigilância clínica, término de hidratação ou medicação na unidade, dose adicional ou aguardo de exames.
     * "internacao": presença de critérios de gravidade, instabilidade hemodinâmica, necessidade de antibioticoterapia venosa contínua ou leito hospitalar/enfermaria.
     * "transferencia": necessidade de CTI/UTI, intervenção cirúrgica de urgência ou suporte especializado não disponível na unidade.
   - Forneça justificativa clínica clara e detalhada em "motivoDesfecho".
2. PRESCRIÇÕES:
   - Se o desfecho for "observacao", defina novas medicações na unidade em "medicacoesUnidade".
   - Se o desfecho for "alta", "internacao" ou "transferencia", retorne vazio ("" ou []) em "medicacoesUnidade".
   - Se o desfecho for "alta", prescreva medicações domiciliares com posologia completa e via explícita em "medicacoesCasa" (apenas princípio ativo com dosagem, sem marcas comerciais).
3. EXAMES LABORATORIAIS E IMAGEM:
   - Só solicite novos exames se houver estrita indicação clínica. Se não houver, retorne vazio ("").
4. ORIENTAÇÕES E SINAIS DE ALARME:
   - Personalize de forma estrita adaptada ao agravo e paciente. Em "orientacoesProntuario" e "sinaisAlarmeProntuario", inicie SEMPRE com a palavra "Oriento...".
5. ATESTADO MÉDICO: O padrão em UPA é RIGOROSAMENTE 01 dia ("01 dia").
6. SEGURANÇA E SUS: Checagem estrita de alergias conforme HPP, disclaimers farmacológicos e profilaxia de tétano/raiva se trauma/ferimento. ${
        susFilter ? 'PRIORIZE FORTEMENTE MEDICAMENTOS DA RENAME / FARMÁCIA BÁSICA DO SUS.' : ''
      }`;

      const activePrompt = prompts.condutaEvolucao || prompts.conduta;
      const response = await callGeminiApi(
        apiKey,
        model,
        activePrompt,
        payload,
        instruction,
        jsonExample
      );

      const parsed = safeJsonParse(response);

      const formatExamList = (val: any): string => {
        if (!val) return '';
        if (Array.isArray(val)) {
          return val.map((item) => String(item).trim()).filter(Boolean).join('\n');
        }
        if (typeof val === 'string') {
          const trimmed = val.trim();
          if (trimmed.includes('\n')) return trimmed;
          if (trimmed.includes(',')) {
            return trimmed
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
              .join('\n');
          }
          return trimmed;
        }
        return String(val);
      };

      const formatMedList = (val: any): string[] => {
        if (!val) return [];
        if (Array.isArray(val)) {
          return val.map((item) => String(item).trim()).filter(Boolean);
        }
        if (typeof val === 'string') {
          const trimmed = val.trim();
          return trimmed ? [trimmed] : [];
        }
        return [String(val)];
      };

      await ensureReceituarioDb();
      const rawUnit = formatMedList(parsed.medicacoesUnidade);
      const rawHome = formatMedList(parsed.medicacoesCasa);
      const stdUnit = standardizePrescriptionList(rawUnit, 'interna', patient?.peso);
      const stdHome = standardizePrescriptionList(rawHome, 'domiciliar', patient?.peso);

      const finalUnit = stdUnit.length > 0 ? stdUnit.map(formatUsoWithColon) : rawUnit.map(formatUsoWithColon);
      const finalHome = stdHome.length > 0 ? stdHome.map(formatUsoWithColon) : rawHome.map(formatUsoWithColon);

      const aiSuggested = (parsed.desfechoSugerido as 'alta' | 'observacao' | 'internacao' | 'transferencia') || 'alta';

      const formattedDias = (() => {
        const raw = parsed.diasAtestado || '';
        const m = String(raw).match(/\d+/);
        let n = m ? parseInt(m[0], 10) : 1;
        if (n === 3 || isNaN(n) || n <= 0) n = 1;
        const formattedN = n <= 9 ? `0${n}` : String(n);
        const p = n === 1 ? 'dia' : 'dias';
        return `${formattedN} ${p}`;
      })();

      if (setObservation) {
        setObservation((prev) => ({
          ...prev,
          outcome: aiSuggested,
          outcomeReason: parsed.motivoDesfecho || '',
          inObservation: aiSuggested === 'observacao',
          startedAt: aiSuggested === 'observacao' ? (prev.startedAt || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })) : undefined,
          unitMedications: finalUnit,
          homeMedications: finalHome,
          orderedLabs: formatExamList(parsed.examesLaboratorio),
          orderedImages: formatExamList(parsed.examesImagem),
          medicationDisclaimers: parsed.disclaimers || [],
          tetanusRabiesAlert: parsed.alertaProfilaxiaVacinal || '',
          techOrientations: ensureOriento(parsed.orientacoesProntuario || parsed.textoTecnico || ''),
          techAlarmSignals: ensureOriento(parsed.sinaisAlarmeProntuario || ''),
          layOrientations: parsed.orientacoesReceita || parsed.textoLeigo || '',
          layAlarmSignals: parsed.sinaisAlarmeReceita || '',
          medicalLeaveNeeded: !!parsed.atestadoNecessario,
          medicalLeaveDays: formattedDias,
          referralNeeded: !!parsed.encaminhamentoUbs,
          referralReason: parsed.motivoEncaminhamento || ''
        }));
      }
    });
  };

  const runAiGerarCondutasEvolucao = async () => {
    await executeAiAction('Gerar Condutas da Evolução', 'gerarCondutasEvolucao', async () => {
      const payloadBase = getCasePayload('payloadCaso');

      const medsUnidadeText = Array.isArray(observation?.unitMedications)
        ? observation.unitMedications.join('\n\n').trim()
        : '';
      const medsCasaText = Array.isArray(observation?.homeMedications)
        ? observation.homeMedications.join('\n\n').trim()
        : '';
      const labsText = (observation?.orderedLabs || '').trim();
      const imagesText = (observation?.orderedImages || '').trim();
      const orientText = (observation?.techOrientations || '').trim();
      const alarmText = (observation?.techAlarmSignals || '').trim();
      
      const outcomeVal = observation?.outcome || (observation?.inObservation ? 'observacao' : 'alta');
      const outcomeTextMap: Record<string, string> = {
        alta: '- Alta médica com receitas e orientações domiciliares.',
        observacao: '- Mantido em leito de observação clínica para continuidade do cuidado.',
        internacao: '- Solicitada vaga de internação hospitalar via regulação (SUS Fácil / NIR).',
        transferencia: '- Solicitada transferência inter-hospitalar / vaga de CTI via SAMU/SUS Fácil.'
      };
      const finalOutcomeText = outcomeTextMap[outcomeVal] || '- Alta médica com orientações.';

      const atestadoText = (documents?.atestado || '').trim() || (aiResults?.medicalLeaveDays ? `${aiResults.medicalLeaveDays}` : '');
      const relatorioText = (documents?.encaminhamento || '').trim() || (aiResults?.referralReason ? `Sim (${aiResults.referralReason})` : '');

      const factualActionsPayload = `=== AÇÕES CLÍNICAS E DEFINIÇÕES DA EVOLUÇÃO MÉDICA ===
- RESULTADOS DE EXAMES:
${examResults?.trim() || 'Nenhum exame informado'}

- REAVALIAÇÃO CLÍNICA:
${observation?.clinicalReevaluationText?.trim() || 'Sem queixas agudas'}

- HIPÓTESE DIAGNÓSTICA FINAL:
${observation?.conclusionNewHypothesis?.trim() || aiResults?.mainHypothesis || 'Em investigação'}

- PRESCRIÇÃO INTERNA:
${medsUnidadeText || 'Nenhuma medicação na unidade'}

- PRESCRIÇÃO DOMICILIAR:
${medsCasaText || 'Nenhuma medicação domiciliar prescrita'}

- EXAMES SOLICITADOS:
${[labsText, imagesText].filter(Boolean).join('\n') || 'Nenhum exame solicitado'}

- ORIENTAÇÕES E ALARME:
${orientText || 'Orientações clínicas'} | ${alarmText || 'Sinais de alarme'}

- DOCUMENTOS EMITIDOS:
Atestado: ${atestadoText ? `Sim (${atestadoText})` : 'Não'} | Relatório: ${relatorioText ? `Sim` : 'Não'}

- DESFECHO DEFINIDO:
${finalOutcomeText}`;

      const fullPayload = `${payloadBase}\n\n${factualActionsPayload}`;

      const activePrompt = prompts.gerarCondutas || DEFAULT_GERAR_CONDUTAS_PROMPT;
      const response = await callGeminiApi(
        apiKey,
        model,
        activePrompt,
        fullPayload,
        'Gere a síntese das NOVAS CONDUTAS da EVOLUÇÃO MÉDICA em tópicos objetivos com hífen (- ), cobrindo medicações realizadas/prescritas, exames se houver, orientações dadas, documentos emitidos e OBRIGATORIAMENTE o desfecho atual do paciente como último tópico.'
      );

      const cleaned = response
        .replace(/```[a-z]*\r?\n?/gi, '')
        .replace(/```/g, '')
        .trim();

      if (setObservation) {
        setObservation((prev) => ({
          ...prev,
          newConducts: cleaned
        }));
      }
    });
  };

  return {
    aiLoading,
    setAiLoading,
    runAiHma,
    runAiExameFisico,
    runAiDiagnostico,
    runAiConduta,
    runAiGerarCondutas,
    runAiMelhorarCondutas,
    runAiOrientacoes,
    runAiPassagemPlantao,
    runAiPassometro,
    runAiEncaminhamento,
    runAiReavaliacao,
    runAiConclusaoObs,
    runAiDiagnosticoEvolucao,
    runAiCondutaEvolucao,
    runAiGerarCondutasEvolucao
  };
}
