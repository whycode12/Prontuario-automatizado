import { useState } from 'react';
import type { SystemPrompts, SystemTemplates, AIResult, FinalDocuments } from '../types';
import { callGeminiApi } from '../services/gemini';
import { safeJsonParse } from '../utils/jsonSafe';
import { DEFAULT_PROMPTS } from '../data/defaults';
import { addAiLog, updateAiLog } from '../utils/aiLogger';
import { formatUsoWithColon, ensureOriento } from '../utils/templateTags';

export const DEFAULT_ENCAMINHAMENTO_PROMPT = `Você é um médico experiente atuando na UPA de Mateus Leme - MG.
Elabore um relatório de encaminhamento médico para o PSF (Posto de Saúde da Família / Atenção Básica) de forma humanizada, profissional, empática e sem qualquer aspecto robótico de inteligência artificial.
DIRETRIZES OBRIGATÓRIAS:
1. Inclua os dados do paciente (nome completo e idade).
2. Redija em texto corrido, contínuo e fluido (sem divisões em tópicos excessivos), uma história clínica BREVE e concisa, relatando em ordem cronológica que o paciente foi consultado na UPA de Mateus Leme nesta data.
3. Descreva de forma direta e objetiva o que foi investigado e administrado na unidade (exames complementares e medicações administradas).
4. Explique com clareza e justifique por QUAL motivo o paciente necessita de seguimento ambulatorial na Atenção Básica (ex: investigação etiológica de ITU de repetição, ajuste de anti-hipertensivo, controle glicêmico, acompanhamento de lesão, propedêutica complementar, etc.).
5. Mantenha tom colegial, respeitoso e colaborativo de médico da urgência para médico da atenção primária.`;

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
  openAiLogModal
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
    await executeAiAction('Condutas, Prescrições e Orientações', 'conduta', async () => {
      const jsonExample = `{
  "medicacoesUnidade": [
    "USO INTRAMUSCULAR:\\n\\n1. Cloridrato de Ondansetrona (2mg/mL) —————————— 1 ampola (2 mL)\\nAdministrar 1 ampola (2 mL), IM, sem diluição, agora."
  ],
  "medicacoesCasa": [
    "USO ORAL:\\n\\n1. Amoxicilina + Clavulanato 875mg + 125mg —————— 1 caixa\\nTomar 1 comprimido, via oral, de 8 em 8 horas, por 10 dias.\\n\\n2. Dipirona 500mg ——————————————————————————————— 1 caixa\\nTomar 2 comprimidos, via oral, até de 6 em 6 horas, se dor ou febre."
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
  "diasAtestado": "1 dia",
  "motivoAtestado": "Repouso durante fase álgica aguda.",
  "condutasSintetizadas": "- Prescrevo Ondansetrona IM na unidade.\\n- Solicito RX de braço esquerdo AP e PERFIL na unidade.\\n- Solicito HMG, Ur e Cr na unidade.\\n- Prescrevo Amoxicilina + Clavulanato VO e Dipirona VO para uso domiciliar.\\n- Alta médica com orientações",
  "orientacoesProntuario": "Oriento hidratação oral vigorosa e repouso relativo durante a fase sintomática.",
  "sinaisAlarmeProntuario": "Oriento retorno imediato ao pronto atendimento se febre persistente, vômitos refratários ou piora da dor.",
  "orientacoesReceita": "Repouso relativo, hidratação hídrica adequada e tomar os medicamentos nos horários prescritos.",
  "sinaisAlarmeReceita": "Retorne imediatamente ao pronto atendimento se apresentar: febre alta que não cede, dor intensa ou vômitos recorrentes."
}`;
      const instruction = `Você é um médico experiente atuando no Brasil (UPA/SUS). Gere a conduta médica completa e rigorosa para este caso, preenchendo todos os campos do JSON.
DIRETRIZES OBRIGATÓRIAS:
1. RIGOR EXTREMO EM EXAMES E PRESCRIÇÕES: Seja estritamente criterioso. NÃO seja permissivo. Só prescreva medicações ou solicite exames laboratoriais / exames de imagem se forem REALMENTE estritamente necessários para o caso clínico apresentado. Se não houver indicação clara para exames, retorne vazio ("") em "examesLaboratorio" e "examesImagem".
2. PRESCRIÇÃO INTERNA (Unidade) E DOMICILIAR:
   - PREFIRA via Intramuscular (IM) quando não for fazer várias medicações simultâneas ou quando a medicação não exigir infusão contínua em bolsa de soro, para não puncionar acesso venoso sem real necessidade.
   - OBRIGATÓRIO: Sempre que indicar uma via de administração em prescrições (USO ORAL, USO INTRAMUSCULAR, USO ENDOVENOSO, etc.), coloque SEMPRE os dois-pontos logo após a via (ex: 'USO ORAL:', 'USO INTRAMUSCULAR:', 'USO ENDOVENOSO:').
   - Siga rigorosamente o padrão com blocos de via, itens com travessões para a quantidade (ex: '1 ampola (2 mL)', '———— 1 caixa', '——— 04 envelopes'), seguido da posologia por extenso e instruções de preparo/uso se necessário. Use sempre as apresentações e posologias mais habituais no Brasil e no SUS.
3. CONDUTAS SINTETIZADAS ('condutasSintetizadas'):
   - Use a MENOR quantidade de palavras possível, direto ao ponto e objetivo, sintetizando o que foi feito na unidade e domiciliar em tópicos com palavras-chave e abreviações médicas habituais (ex: 'HMG', 'Ur', 'Cr', 'RX AP e PERFIL', 'VO', 'IM', 'EV'). NÃO inclua doses ou tempos desnecessários já descritos nas receitas.
   - OBRIGATÓRIO: O último tópico DEVE ser o desfecho do paciente, exatamente no padrão: '- Alta médica com orientações' OU '- Em observação para reavaliação após medicação/exames'.
4. ORIENTAÇÕES E SINAIS DE ALARME:
   - Personalize estritamente adaptado ao agravo e à pessoa consultada (faixa etária e contexto do paciente). Jamais utilize orientações genéricas desconexas (ex: jamais cite amamentação se for paciente adulto).
   - OBRIGATÓRIO: Em 'orientacoesProntuario' e 'sinaisAlarmeProntuario' para o prontuário, comece SEMPRE obrigatoriamente com a palavra 'Oriento...'. Seja conciso e objetivo com poucas palavras.
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

      if (parsed.condutasSintetizadas && setCondutas) {
        setCondutas(parsed.condutasSintetizadas);
      }

      const aiSuggested = (parsed.desfechoSugerido as 'alta' | 'observacao' | 'internacao' | 'transferencia') || 'alta';

      setAiResults((prev) => ({
        ...prev,
        unitMedications: formatMedList(parsed.medicacoesUnidade).map(formatUsoWithColon),
        homeMedications: formatMedList(parsed.medicacoesCasa).map(formatUsoWithColon),
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
        medicalLeaveDays: parsed.diasAtestado || '',
        medicalLeaveReason: parsed.motivoAtestado || '',
        condutasSuggestion: parsed.condutasSintetizadas || '',
        techOrientations: ensureOriento(parsed.orientacoesProntuario || parsed.textoTecnico || ''),
        techAlarmSignals: ensureOriento(parsed.sinaisAlarmeProntuario || ''),
        layOrientations: parsed.orientacoesReceita || parsed.textoLeigo || '',
        layAlarmSignals: parsed.sinaisAlarmeReceita || ''
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
      const response = await callGeminiApi(
        apiKey,
        model,
        prompts.passometro,
        payload,
        'Preencha o passômetro do paciente respeitando estritamente a estrutura solicitada (PACIENTE, IDADE, ADMISSÃO::, MÉDICO RESPONSÁVEL, LOCAL DO PACIENTE::, BREVE CONTEXTO, VÍCIOS, COMORBIDADES, MEDICAÇÕES DE USO CONTÍNUO, ALERGIAS MEDICAMENTOSAS, EXAME FÍSICO ATUAL, HIPÓTESES DIAGNÓSTICAS, CONDUTAS, PROPOSTAS).'
      );
      setDocuments((prev: FinalDocuments) => ({ ...prev, passometro: response.trim() }));
    });
  };

  const runAiEncaminhamento = async () => {
    await executeAiAction('Encaminhamento PSF', 'encaminhamento', async () => {
      const payload = getCasePayload('payloadEncaminhamento');
      const response = await callGeminiApi(
        apiKey,
        model,
        prompts.encaminhamento || DEFAULT_ENCAMINHAMENTO_PROMPT,
        payload,
        'Gere o relatório de encaminhamento médico para o PSF em texto corrido humanizado, conciso e direto ao ponto, relatando atendimento na UPA de Mateus Leme e o motivo clínico do seguimento ambulatorial.'
      );
      setDocuments((prev: FinalDocuments) => ({ ...prev, encaminhamento: response.trim() }));
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

  return {
    aiLoading,
    setAiLoading,
    runAiHma,
    runAiExameFisico,
    runAiDiagnostico,
    runAiConduta,
    runAiMelhorarCondutas,
    runAiOrientacoes,
    runAiPassagemPlantao,
    runAiPassometro,
    runAiEncaminhamento,
    runAiReavaliacao,
    runAiConclusaoObs
  };
}
