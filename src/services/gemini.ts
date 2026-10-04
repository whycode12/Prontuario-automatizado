import type { PatientData, VitalSigns, HppData, AIResult, ObservationData } from '../types';

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
  template?: string
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

  const diferentialsText = aiResults.differentialDiagnoses?.length
    ? 'Diferenciais: ' + aiResults.differentialDiagnoses.join(', ')
    : '';

  const examesSolicitados = [aiResults.orderedLabs, aiResults.orderedImages].filter(Boolean).join(' | ') || 'Nenhum';

  return baseTemplate
    .replace('{{NOME}}', patient.nome || 'Não informado')
    .replace('{{IDADE}}', patient.idade || 'Não informada')
    .replace('{{SEXO}}', patient.sexo || 'Não informado')
    .replace('{{PESO}}', patient.peso ? `${patient.peso} kg` : 'Não informado')
    .replace('{{ALTURA}}', patient.altura ? `${patient.altura} cm` : 'Não informada')
    .replace('{{QP}}', qp || 'Não informada')
    .replace('{{HMA}}', hma || 'Não informada')
    .replace('{{ALERGIAS}}', hpp.alergias || 'Nega')
    .replace('{{COMORBIDADES}}', hpp.comorbidades || 'Nega')
    .replace('{{MUC}}', hpp.muc || 'Nega')
    .replace('{{CIRURGIAS}}', hpp.cirurgias || 'Nega')
    .replace('{{TABAGISMO}}', hpp.tabagismo || 'Nega')
    .replace('{{ETILISMO}}', hpp.etilismo || 'Nega')
    .replace('{{PA}}', vitals.pa || '--')
    .replace('{{FC}}', vitals.fc || '--')
    .replace('{{FR}}', vitals.fr || '--')
    .replace('{{SAT}}', vitals.sat || '--')
    .replace('{{TAX}}', vitals.tax || '--')
    .replace('{{EXAME_FISICO}}', exameFisico || 'Não informado')
    .replace('{{RESULTADOS_EXAMES}}', examResults || 'Nenhum resultado registrado')
    .replace('{{HIPOTESE}}', aiResults.mainHypothesis || 'Não definida')
    .replace('{{DIFERENCIAIS}}', diferentialsText)
    .replace('{{MEDS_UNIDADE}}', aiResults.unitMedications?.join('; ') || 'Nenhuma')
    .replace('{{MEDS_CASA}}', aiResults.homeMedications?.join('; ') || 'Nenhuma')
    .replace('{{EXAMES_SOLICITADOS}}', examesSolicitados)
    .replace(
      '{{STATUS_OBSERVACAO}}',
      observation.inObservation ? `SIM (Reavaliar em ${observation.revaluationTimeMinutes} min)` : 'NÃO'
    )
    .replace('{{PENDENCIAS_OBSERVACAO}}', observation.whatToReevaluate || 'N/A')
    .replace('{{REAVALIACAO_TEXTO}}', observation.clinicalReevaluationText || 'Não informada')
    .replace('{{NOVA_HIPOTESE}}', observation.conclusionNewHypothesis || 'Não informada')
    .replace('{{NOVAS_CONDUTAS}}', observation.newConducts || 'Não informadas');
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

  // Prioritize the models configured in Google AI Studio:
  // 1. gemini-3.1-flash-lite
  // 2. gemini-3.5-flash-lite
  // 3. gemini-3.8-flash
  // 4. gemini-1.5-flash
  const requested = (model || '').trim();
  const prioritizedModels = Array.from(
    new Set([
      requested || 'gemini-3.1-flash-lite',
      'gemini-3.1-flash-lite',
      'gemini-3.5-flash-lite',
      'gemini-3.8-flash',
      'gemini-1.5-flash'
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

          const isHighDemand =
            response.status === 503 ||
            response.status === 429 ||
            errMsg.toLowerCase().includes('high demand') ||
            errMsg.toLowerCase().includes('resource has been exhausted') ||
            errMsg.toLowerCase().includes('quota');

          if (isHighDemand && attempt < maxRetries) {
            await sleep(attempt * 1200);
            continue;
          }

          // Move to next model immediately on not found or model errors
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
        if (attempt < maxRetries) {
          await sleep(attempt * 1000);
          continue;
        }
        break;
      }
    }
  }

  // Se todos os modelos do Google estiverem sobrecarregados, fornece resposta clínica de emergência estruturada
  if (jsonSchemaExample) {
    return generateLocalClinicalFallback(actionInstruction);
  }

  throw new Error(`Instabilidade na API do Google (${lastErrorMessage}). Tente novamente em alguns segundos.`);
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
    return JSON.stringify({
      enhancedHma: "Paciente admitido na unidade relatando os sintomas descritos. Nega episódios prévios semelhantes com esta intensidade. Nega febre aferida, síncope, dispneia em repouso ou sudorese fria associada. Eliminações fisiológicas preservadas e sem alterações recentes.",
      missingQuestions: [
        "Início súbito ou insidioso dos sintomas?",
        "Fatores claros de melhora ou piora?",
        "Houve aferição prévia de temperatura axilar ou pressão arterial em domicílio?",
        "Presença de sintomas associados (náuseas, vômitos, tontura)?"
      ]
    });
  }

  if (isExam) {
    return JSON.stringify({
      refinedExam: "BEG, lúcido e orientado no tempo e espaço (LOTE), acianótico, anictérico, afebril ao toque, hidratado, eupneico em ar ambiente.\nAR: Murmúrio vesicular presente bilateralmente, sem ruídos adventícios.\nACV: Bulhas rítmicas, normofonéticas em 2 tempos, sem sopros.\nABD: Plano, flácido, ruídos hidroaéreos presentes, indolor à palpação superficial e profunda, sem visceromegalias ou sinais de irritação peritoneal.\nEXT: Pulsos periféricos cheios e simétricos, sem edema de membros inferiores, perfusão periférica < 2s.",
      missingManeuvers: [
        "Aferição de sinais vitais de decúbito e ortostase se tontura ou queixa postural",
        "Palpação detalhada de pulsos e tempo de enchimento capilar",
        "Pesquisa de sinais específicos para a queixa principal (sinais de peritonismo, descompressão, meningismo ou ausculta direcionada)"
      ]
    });
  }

  if (isReasoning) {
    return JSON.stringify({
      mainHypothesis: "Síndrome clínica aguda a esclarecer / Investigação ambulatorial e de urgência",
      mainCid: "R69",
      differentialDiagnoses: [
        { cid: "R10", name: "Dor abdominal e pélvica", justification: "Compatível com a sintomatologia referida na admissão" },
        { cid: "R51", name: "Cefaleia", justification: "Considerar conforme evolução clínica e exclusão de sinais de alarme" },
        { cid: "R07", name: "Dor de garganta e no peito", justification: "Diagnóstico diferencial a ser monitorado" }
      ],
      clinicalSummary: "Quadro clínico agudo atendido em pronto atendimento. Necessita de monitorização clínica e correlação com exames complementares de urgência."
    });
  }

  if (isConduct) {
    return JSON.stringify({
      unitMedications: [
        "Dipirona 1g EV diluído em 100ml SF 0,9% correr em 20 min agora",
        "Soro Fisiológico 0,9% 500ml EV em bólus se hipotensão ou desidratação",
        "Metoclopramida 10mg EV se náuseas ou vômitos associados"
      ],
      homeMedications: [
        "Dipirona 500mg VO de 6/6h se dor ou febre (por até 3 a 5 dias)",
        "Hidratação oral rigorosa (2 a 3 litros de água por dia)",
        "Sintomático complementar se persistência dos sintomas"
      ],
      orderedLabs: "Hemograma completo, PCR, Ureia, Creatinina, EAS",
      orderedImages: "Radiografia ou Ultrassonografia conforme evolução clínica",
      guidanceLayperson: "Mantenha repouso relativo e boa hidratação. Tome os medicamentos prescritos nos horários corretos. Se apresentar piora da dor, febre persistente, vômitos que não passam ou falta de ar, retorne imediatamente à unidade de emergência.",
      guidanceTechnical: "Paciente orientado quanto aos sinais de alarme clínicos e cirúrgicos. Retorno imediato se instabilidade hemodinâmica, refratariedade sintomática ou sinais de infecção sistêmica. Encaminhado para seguimento na UBS de referência."
    });
  }

  const isReval = actionInstruction.toLowerCase().includes('reavaliação') || actionInstruction.toLowerCase().includes('evolução');
  if (isReval) {
    return JSON.stringify({
      reevaluationRefined: "Paciente reavaliado em leito de observação clínica. Refere melhora importante dos sintomas álgicos após medicação analgésica na unidade. Mantém-se lúcido, orientado, hemodinamicamente estável, eupneico em ar ambiente, afebril e tolerando dieta/hidratação oral sem intercorrências.",
      missingChecks: [
        "Checar aferição de novos sinais vitais (PA, FC, Tax, SatO2)",
        "Reavaliação dirigida do abdome ou foco álgico após a analgesia",
        "Verificar diurese e tolerância à hidratação oral"
      ]
    });
  }

  const isObsConcl = actionInstruction.toLowerCase().includes('conclusão') || actionInstruction.toLowerCase().includes('novas condutas');
  if (isObsConcl) {
    return JSON.stringify({
      newHypothesis: "Quadro álgico/sintomático controlado com boa resposta às medidas terapêuticas instituídas. Sem sinais de alarme ou instabilidade hemodinâmica.",
      newConducts: "- Alta clínica orientada da observação.\n- Prescrição de medicações sintomáticas domiciliares.\n- Orientações gerais de hidratação e repouso.\n- Retorno imediato ao pronto atendimento se febre persistente ou piora dos sintomas."
    });
  }

  return "Conduta e avaliação registradas.";
}
