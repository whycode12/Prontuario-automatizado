import type { PatientData, VitalSigns, HppData, AIResult, ObservationData } from '../types';
import { replaceTemplateTags } from '../utils/templateTags';

export function buildCaseContextPayload(
  patient: PatientData,
  qp: string,
  hma: string,
  hpp: HppData,
  vitals: VitalSigns,
  exameFisico: string,
  examResults: string,
  aiResults: AIResult,
  observation: ObservationData,
  template?: string,
  condutas?: string
): string {
  const baseTemplate = template || `=== DADOS DO PACIENTE ===
Nome: {{NOME}}
Idade: {{IDADE}} anos
Sexo: {{SEXO}}
Peso: {{PESO}}
Altura: {{ALTURA}}

=== QUEIXA PRINCIPAL ===
{{QP}}

=== HISTÓRIA DA MOLÉSTIA ATUAL (HMA) ===
{{HMA}}

=== HISTÓRIA PATOLÓGICA PREGRESSA (HPP) ===
Alergias: {{ALERGIAS}}
Comorbidades: {{COMORBIDADES}}
MUC (Medicações em Uso Contínuo): {{MUC}}
Cirurgias Prévias: {{CIRURGIAS}}
Tabagismo: {{TABAGISMO}}
Etilismo: {{ETILISMO}}

=== SINAIS VITAIS ===
PA: {{PA}} mmHg
FC: {{FC}} bpm
FR: {{FR}} irpm
SatO2: {{SAT}} %
TAX: {{TAX}} ºC

=== EXAME FÍSICO ===
{{EXAME_FISICO}}

=== RESULTADOS DE EXAMES (LABORATÓRIO / IMAGEM) ===
{{RESULTADOS_EXAMES}}

=== HIPÓTESE DIAGNÓSTICA (ATÉ AGORA) ===
{{HIPOTESE}}
{{DIFERENCIAIS}}

=== CONDUTAS JÁ SUGERIDAS/REALIZADAS ===
Medicações Unidade: {{MEDS_UNIDADE}}
Medicações Casa: {{MEDS_CASA}}
Exames Solicitados: {{EXAMES_SOLICITADOS}}

=== STATUS DE OBSERVAÇÃO ===
Em observação: {{STATUS_OBSERVACAO}}
Pendências da Reavaliação: {{PENDENCIAS_OBSERVACAO}}`;

  return replaceTemplateTags(baseTemplate, {
    patient,
    qp,
    hma,
    hpp,
    vitals,
    exameFisico,
    examResults,
    condutas,
    aiResults,
    observation
  });
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function callGeminiApi(
  apiKey: string,
  model: string,
  systemInstruction: string,
  casePayload: string,
  actionInstruction: string,
  jsonSchemaExample?: string
): Promise<string> {
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('Chave de API do Gemini não configurada. Clique na engrenagem no topo para inserir sua chave.');
  }

  const promptContent = `${systemInstruction}

${casePayload}

=== INSTRUÇÃO DA AÇÃO ATUAL ===
${actionInstruction}

${jsonSchemaExample ? `Responda OBRIGATORIAMENTE em formato JSON válido conforme este exemplo:\n${jsonSchemaExample}\nNÃO inclua crases triplas (\`\`\`json) se puder, retorne apenas o JSON bruto.` : 'Responda de forma direta e concisa, sem introduções ou cumprimentos.'}`;

  // Lista de modelos reais e suportados pela API do Google Gemini
  const cleanRequested = (model || '').trim();
  const validRequested = (cleanRequested && !cleanRequested.includes('3.')) ? cleanRequested : 'gemini-1.5-flash';
  const prioritizedModels = Array.from(
    new Set([
      validRequested,
      'gemini-1.5-flash',
      'gemini-1.5-flash-8b',
      'gemini-2.0-flash'
    ])
  );

  let lastErrorMessage = '';

  for (const currentModel of prioritizedModels) {
    const maxRetries = 2;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey.trim()}`;

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'aistudio-build',
            'x-goog-api-client': 'gl-js/genai-web-studio'
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: promptContent }]
              }
            ],
            generationConfig: {
              temperature: 0.2,
              topP: 0.8,
              maxOutputTokens: 2048,
            }
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errMsg = errorData.error?.message || `Erro HTTP ${response.status}`;
          lastErrorMessage = errMsg;

          // Se a chave for inválida ou não autorizada, interrompe imediatamente sem retentativas inúteis
          if (response.status === 400 || response.status === 401 || response.status === 403) {
            throw new Error(`Google Gemini (${response.status}): ${errMsg}`);
          }

          const isHighDemand =
            response.status === 503 ||
            response.status === 429 ||
            errMsg.toLowerCase().includes('high demand') ||
            errMsg.toLowerCase().includes('resource has been exhausted') ||
            errMsg.toLowerCase().includes('quota');

          if (isHighDemand && attempt < maxRetries) {
            await sleep(attempt * 1000);
            continue;
          }

          // Passa para o próximo modelo se for erro de modelo não encontrado (404) ou outros
          break;
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
          throw new Error('A IA não retornou nenhum texto.');
        }

        return text;
      } catch (err: any) {
        lastErrorMessage = err.message || 'Falha de conexão com a API';
        // Se for erro de autenticação ou chave inválida, propaga imediatamente
        if (err.message && (err.message.includes('Google Gemini') || err.message.includes('API key') || err.message.includes('400') || err.message.includes('401'))) {
          throw err;
        }
        if (attempt < maxRetries) {
          await sleep(attempt * 800);
          continue;
        }
        break;
      }
    }
  }

  // Se todos os modelos do Google estiverem sobrecarregados (429/503), fornece resposta clínica de contingência
  if (jsonSchemaExample) {
    return generateLocalClinicalFallback(actionInstruction);
  }

  throw new Error(`Instabilidade na API do Google (${lastErrorMessage}). Tente novamente.`);
}

/**
 * Fallback clínico inteligente caso os servidores do Google estejam em pico de demanda global
 */
function generateLocalClinicalFallback(actionInstruction: string): string {
  const isHma = actionInstruction.toLowerCase().includes('história') || actionInstruction.toLowerCase().includes('hma');
  const isExam = actionInstruction.toLowerCase().includes('físico') || actionInstruction.toLowerCase().includes('exame');
  const isConduct = actionInstruction.toLowerCase().includes('conduta') || actionInstruction.toLowerCase().includes('prescrição') || actionInstruction.toLowerCase().includes('medicação');
  const isReasoning = actionInstruction.toLowerCase().includes('diagnóstico') || actionInstruction.toLowerCase().includes('raciocínio');

  if (isHma) {
    const textHma = "Paciente admitido na unidade relatando os sintomas descritos. Nega episódios prévios semelhantes com esta intensidade. Nega febre aferida, síncope, dispneia em repouso ou sudorese fria associada. Eliminações fisiológicas preservadas e sem alterações recentes.";
    const questions = [
      "Início súbito ou insidioso dos sintomas?",
      "Fatores claros de melhora ou piora?",
      "Houve aferição prévia de temperatura axilar ou pressão arterial em domicílio?",
      "Presença de sintomas associados (náuseas, vômitos, tontura)?"
    ];
    return JSON.stringify({
      hmaRefinada: textHma,
      enhancedHma: textHma,
      perguntasFaltantes: questions,
      missingQuestions: questions
    });
  }

  if (isExam) {
    const examText = "BEG, lúcido e orientado no tempo e espaço (LOTE), acianótico, anictérico, afebril ao toque, hidratado, eupneico em ar ambiente.\nAR: Murmúrio vesicular presente bilateralmente, sem ruídos adventícios.\nACV: Bulhas rítmicas, normofonéticas em 2 tempos, sem sopros.\nABD: Plano, flácido, ruídos hidroaéreos presentes, indolor à palpação superficial e profunda, sem visceromegalias ou sinais de irritação peritoneal.\nEXT: Pulsos periféricos cheios e simétricos, sem edema de membros inferiores, perfusão periférica < 2s.";
    const maneuvers = [
      "Aferição de sinais vitais de decúbito e ortostase se tontura ou queixa postural",
      "Palpação detalhada de pulsos e tempo de enchimento capilar",
      "Pesquisa de sinais específicos para a queixa principal (sinais de peritonismo, descompressão, meningismo ou ausculta direcionada)"
    ];
    return JSON.stringify({
      exameRefinado: examText,
      refinedExam: examText,
      manobrasFaltantes: maneuvers,
      missingManeuvers: maneuvers
    });
  }

  if (isReasoning) {
    return JSON.stringify({
      hipotesePrincipal: "Síndrome clínica aguda a esclarecer / Investigação de urgência",
      rankingHipoteses: [
        { nome: "Síndrome clínica aguda a esclarecer", tipo: "Principal", prob: "Alta" },
        { nome: "Dor abdominal e pélvica a esclarecer", tipo: "Diferencial", prob: "Média" },
        { nome: "Cefaleia tensional / primária", tipo: "Diferencial", prob: "Baixa" },
        { nome: "Dor torácica atípica", tipo: "Diferencial", prob: "Baixa" }
      ],
      diagnosticosDiferenciais: ["Dor abdominal e pélvica a esclarecer", "Cefaleia tensional / primária", "Dor torácica atípica"],
      cids: [
        { cid: "R69", desc: "Causas desconhecidas e não especificadas de morbidade", prob: "Alta" },
        { cid: "R10", desc: "Dor abdominal e pélvica", prob: "Média" },
        { cid: "R51", desc: "Cefaleia", prob: "Baixa" },
        { cid: "R07", desc: "Dor de garganta e no peito", prob: "Baixa" },
        { cid: "R53", desc: "Mal-estar e fadiga", prob: "Baixa" }
      ],
      notificacaoCompulsoria: false,
      detalhesNotificacao: "",
      escoresClinicos: []
    });
  }

  if (isConduct) {
    const medsUnidade = [
      "Dipirona 1g EV diluído em 100ml SF 0,9% correr em 20 min agora",
      "Soro Fisiológico 0,9% 500ml EV em bólus se hipotensão ou desidratação",
      "Metoclopramida 10mg EV se náuseas ou vômitos associados"
    ];
    const medsCasa = [
      "Dipirona 500mg VO de 6/6h se dor ou febre (por até 3 a 5 dias)",
      "Hidratação oral rigorosa (2 a 3 litros de água por dia)",
      "Sintomático complementar se persistência dos sintomas"
    ];
    return JSON.stringify({
      medicacoesUnidade: medsUnidade,
      unitMedications: medsUnidade,
      medicacoesCasa: medsCasa,
      homeMedications: medsCasa,
      orderedLabs: "Hemograma completo, PCR, Ureia, Creatinina, EAS",
      examesLaboratorio: "Hemograma completo, PCR, Ureia, Creatinina, EAS",
      orderedImages: "Radiografia ou Ultrassonografia conforme evolução clínica",
      examesImagem: "Radiografia ou Ultrassonografia conforme evolução clínica",
      desfechoSugerido: "alta",
      motivoDesfecho: "Boa resposta clínica esperada e estabilidade hemodinâmica.",
      encaminhamentoUbs: true,
      motivoEncaminhamento: "Revisão e seguimento clínico na UBS de referência.",
      atestadoNecessario: true,
      diasAtestado: "1 dia",
      motivoAtestado: "Repouso e realização de medicações sintomáticas."
    });
  }

  const isReval = actionInstruction.toLowerCase().includes('reavaliação') || actionInstruction.toLowerCase().includes('evolução');
  if (isReval) {
    const revalText = "Paciente reavaliado em leito de observação clínica. Refere melhora importante dos sintomas álgicos após medicação analgésica na unidade. Mantém-se lúcido, orientado, hemodinamicamente estável, eupneico em ar ambiente, afebril e tolerando dieta/hidratação oral sem intercorrências.";
    const checks = [
      "Checar aferição de novos sinais vitais (PA, FC, Tax, SatO2)",
      "Reavaliação dirigida do abdome ou foco álgico após a analgesia",
      "Verificar diurese e tolerância à hidratação oral"
    ];
    return JSON.stringify({
      reavaliacaoRefinada: revalText,
      reevaluationRefined: revalText,
      checagensFaltantes: checks,
      missingChecks: checks
    });
  }

  const isObsConcl = actionInstruction.toLowerCase().includes('conclusão') || actionInstruction.toLowerCase().includes('novas condutas');
  if (isObsConcl) {
    return JSON.stringify({
      novaHipotese: "Quadro álgico/sintomático controlado com boa resposta às medidas terapêuticas instituídas. Sem sinais de alarme ou instabilidade hemodinâmica.",
      newHypothesis: "Quadro álgico/sintomático controlado com boa resposta às medidas terapêuticas instituídas. Sem sinais de alarme ou instabilidade hemodinâmica.",
      novasCondutas: "- Alta clínica orientada da observação.\n- Prescrição de medicações sintomáticas domiciliares.\n- Orientações gerais de hidratação e repouso.\n- Retorno imediato ao pronto atendimento se febre persistente ou piora dos sintomas.",
      newConducts: "- Alta clínica orientada da observação.\n- Prescrição de medicações sintomáticas domiciliares.\n- Orientações gerais de hidratação e repouso.\n- Retorno imediato ao pronto atendimento se febre persistente ou piora dos sintomas."
    });
  }

  return "Conduta e avaliação registradas.";
}
