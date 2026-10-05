import { useState } from 'react';
import type { SystemPrompts, SystemTemplates, AIResult, FinalDocuments } from '../types';
import { callGeminiApi } from '../services/gemini';
import { safeJsonParse } from '../utils/jsonSafe';
import { DEFAULT_PROMPTS } from '../data/defaults';

interface UseAiWorkflowParams {
  apiKey: string;
  model: string;
  prompts: SystemPrompts;
  getCasePayload: (templateKey: keyof SystemTemplates) => string;
  condutas: string;
  susFilter: boolean;
  setAiResults: React.Dispatch<React.SetStateAction<AIResult>>;
  setDocuments: React.Dispatch<React.SetStateAction<FinalDocuments>>;
  showToast: (msg: string) => void;
}

export function useAiWorkflow({
  apiKey,
  model,
  prompts,
  getCasePayload,
  condutas,
  susFilter,
  setAiResults,
  setDocuments,
  showToast
}: UseAiWorkflowParams) {
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});

  const runAiHma = async () => {
    setAiLoading((prev) => ({ ...prev, hma: true }));
    try {
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
      showToast('Sugestão de HMA gerada pela IA abaixo do campo.');
    } catch (err: any) {
      alert(`Falha na IA (HMA): ${err.message}`);
    } finally {
      setAiLoading((prev) => ({ ...prev, hma: false }));
    }
  };

  const runAiExameFisico = async () => {
    setAiLoading((prev) => ({ ...prev, exame: true }));
    try {
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
      showToast('Sugestão de exame físico gerada pela IA abaixo do campo.');
    } catch (err: any) {
      alert(`Falha na IA (Exame Físico): ${err.message}`);
    } finally {
      setAiLoading((prev) => ({ ...prev, exame: false }));
    }
  };

  const runAiDiagnostico = async () => {
    setAiLoading((prev) => ({ ...prev, diagnostico: true }));
    try {
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
        'Elabore a hipótese principal, ranking de hipóteses (principal e diferenciais) com probabilidade (Alta, Média ou Baixa), ranking de 5 CIDs com probabilidade, verificação de notificação compulsória e escores clínicos pertinentes.',
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
      showToast('Diagnósticos e CID gerados pela IA!');
    } catch (err: any) {
      alert(`Falha na IA (Diagnóstico): ${err.message}`);
    } finally {
      setAiLoading((prev) => ({ ...prev, diagnostico: false }));
    }
  };

  const runAiConduta = async () => {
    setAiLoading((prev) => ({ ...prev, conduta: true }));
    try {
      const jsonExample = `{
  "medicacoesUnidade": ["Cetoprofeno 100mg EV em SF 0,9% 100ml", "Dipirona 1g EV"],
  "medicacoesCasa": ["Fosfomicina Trometamol 3g dose única VO", "Dipirona 500mg VO até de 6/6h se dor"],
  "disclaimers": [
    {"med": "Cetoprofeno 100mg", "type": "warning", "note": "Cuidado em idoso frágil e nefropatas (risco renal)."},
    {"med": "Dipirona", "type": "contraindication", "note": "ATENÇÃO: Paciente relata alergia se houver, não prescrever!"}
  ],
  "alertaProfilaxiaVacinal": "Avaliar VAT se ferimento perfurocortante.",
  "examesLaboratorio": "EAS / Urina 1, Urocultura com antibiograma se falha",
  "examesImagem": "Sem indicação no momento",
  "desfechoSugerido": "alta",
  "motivoDesfecho": "Boa resposta clínica esperada, ausência de sinais de sepse ou abdome cirúrgico.",
  "encaminhamentoUbs": true,
  "motivoEncaminhamento": "Revisão e seguimento de urocultura na UBS de referência.",
  "atestadoNecessario": true,
  "diasAtestado": "1 dia",
  "motivoAtestado": "Repouso e realização de medicações na fase álgica aguda."
}`;
      const instruction = `Gere as condutas com prescrições (Unidade vs Domiciliar), checagem estrita de alergias conforme a HPP, avisos para idoso frágil, escores, profilaxia de tétano/raiva se aplicável, exames e desfecho clínico. ${
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
      setAiResults((prev) => ({
        ...prev,
        unitMedications: parsed.medicacoesUnidade || [],
        homeMedications: parsed.medicacoesCasa || [],
        medicationDisclaimers: parsed.disclaimers || [],
        tetanusRabiesAlert: parsed.alertaProfilaxiaVacinal || '',
        orderedLabs: parsed.examesLaboratorio || '',
        orderedImages: parsed.examesImagem || '',
        clinicalOutcome: parsed.desfechoSugerido || 'alta',
        outcomeReason: parsed.motivoDesfecho || '',
        referralNeeded: !!parsed.encaminhamentoUbs,
        medicalLeaveNeeded: !!parsed.atestadoNecessario,
        medicalLeaveDays: parsed.diasAtestado || '',
        medicalLeaveReason: parsed.motivoAtestado || ''
      }));
      showToast('Condutas, prescrições e alertas de segurança gerados!');
    } catch (err: any) {
      alert(`Falha na IA (Condutas): ${err.message}`);
    } finally {
      setAiLoading((prev) => ({ ...prev, conduta: false }));
    }
  };

  const runAiMelhorarCondutas = async () => {
    setAiLoading((prev) => ({ ...prev, melhorarCondutas: true }));
    try {
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
      showToast('Sugestão de condutas gerada pela IA abaixo do campo!');
    } catch (err: any) {
      alert(`Falha na IA (Condutas): ${err.message}`);
    } finally {
      setAiLoading((prev) => ({ ...prev, melhorarCondutas: false }));
    }
  };

  const runAiOrientacoes = async () => {
    setAiLoading((prev) => ({ ...prev, orientacoes: true }));
    try {
      const jsonExample = `{
  "orientacoesProntuario": "Orientado repouso relativo, hidratação oral contínua e seguimento com médico assistente / UBS.",
  "sinaisAlarmeProntuario": "Febre persistente acima de 38,5°C refratária a antitérmicos, piora acentuada da dor, vômitos incoercíveis, síncope ou dispneia.",
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
        techOrientations: parsed.orientacoesProntuario || parsed.textoTecnico || '',
        techAlarmSignals: parsed.sinaisAlarmeProntuario || '',
        layOrientations: parsed.orientacoesReceita || parsed.textoLeigo || '',
        layAlarmSignals: parsed.sinaisAlarmeReceita || ''
      }));
      showToast('Orientações e sinais de alarme gerados pela IA!');
    } catch (err: any) {
      alert(`Falha na IA (Orientações): ${err.message}`);
    } finally {
      setAiLoading((prev) => ({ ...prev, orientacoes: false }));
    }
  };

  const runAiPassagemPlantao = async () => {
    setAiLoading((prev) => ({ ...prev, passagem: true }));
    try {
      const payload = getCasePayload('payloadPassagemPlantao');
      const response = await callGeminiApi(
        apiKey,
        model,
        prompts.passagemPlantao,
        payload,
        'Gere a passagem de caso oral sintetizada, direta ao ponto, para passagem de plantão.'
      );
      setDocuments((prev: FinalDocuments) => ({ ...prev, passagemPlantao: response.trim() }));
      showToast('Passagem de plantão oral gerada!');
    } catch (err: any) {
      alert(`Falha na IA (Passagem de plantão): ${err.message}`);
    } finally {
      setAiLoading((prev) => ({ ...prev, passagem: false }));
    }
  };

  const runAiPassometro = async () => {
    setAiLoading((prev) => ({ ...prev, passometro: true }));
    try {
      const payload = getCasePayload('payloadPassometro');
      const response = await callGeminiApi(
        apiKey,
        model,
        prompts.passometro,
        payload,
        'Preencha o passômetro do paciente de forma ultra-objetiva com base em todo o caso.'
      );
      setDocuments((prev: FinalDocuments) => ({ ...prev, passometro: response.trim() }));
      showToast('Passômetro gerado pela IA!');
    } catch (err: any) {
      alert(`Falha na IA (Passômetro): ${err.message}`);
    } finally {
      setAiLoading((prev) => ({ ...prev, passometro: false }));
    }
  };

  const runAiReavaliacao = async () => {
    setAiLoading((prev) => ({ ...prev, reavaliacao: true }));
    try {
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
      showToast('Sugestão de reavaliação gerada pela IA abaixo do campo.');
    } catch (err: any) {
      alert(`Falha na IA (Reavaliação): ${err.message}`);
    } finally {
      setAiLoading((prev) => ({ ...prev, reavaliacao: false }));
    }
  };

  const runAiConclusaoObs = async () => {
    setAiLoading((prev) => ({ ...prev, conclusaoObs: true }));
    try {
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
      showToast('Sugestão de nova hipótese e condutas gerada abaixo dos campos.');
    } catch (err: any) {
      alert(`Falha na IA (Conclusão da Observação): ${err.message}`);
    } finally {
      setAiLoading((prev) => ({ ...prev, conclusaoObs: false }));
    }
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
    runAiReavaliacao,
    runAiConclusaoObs
  };
}
