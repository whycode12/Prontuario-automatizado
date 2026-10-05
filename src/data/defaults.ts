import type { SystemTemplates, SystemPrompts, HppData } from '../types';

export function parseHppText(text: string): HppData {
  const result: HppData = {
    alergias: `Nega alergias medicamentosas conhecidas.`,
    comorbidades: `Nega.`,
    muc: `Nega medicações de uso contínuo.`,
    cirurgias: `Nega cirurgias prévias.`,
    tabagismo: `Nega.`,
    etilismo: `Nega.`
  };
  if (!text || typeof text !== 'string') return result;

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  let matched = false;

  for (const line of lines) {
    if (/^alergia(s)?(\s*medicamentosa(s)?)?(\s*conhecida(s)?)?:/i.test(line)) {
      result.alergias = line.replace(/^[^:]+:\s*/i, '').trim();
      matched = true;
    } else if (/^comorbidade(s)?:/i.test(line)) {
      result.comorbidades = line.replace(/^[^:]+:\s*/i, '').trim();
      matched = true;
    } else if (/^muc(\s*\(.*\))?:/i.test(line)) {
      result.muc = line.replace(/^[^:]+:\s*/i, '').trim();
      matched = true;
    } else if (/^cirurgia(s)?(\s+pr[eé]via(s)?)?:/i.test(line)) {
      result.cirurgias = line.replace(/^[^:]+:\s*/i, '').trim();
      matched = true;
    } else if (/^tabagismo:/i.test(line)) {
      result.tabagismo = line.replace(/^[^:]+:\s*/i, '').trim();
      matched = true;
    } else if (/^etilismo:/i.test(line)) {
      result.etilismo = line.replace(/^[^:]+:\s*/i, '').trim();
      matched = true;
    }
  }

  if (!matched && lines.length > 0) {
    if (lines[0]) result.alergias = lines[0];
    if (lines[1]) result.comorbidades = lines[1];
    if (lines[2]) result.muc = lines[2];
    if (lines[3]) result.cirurgias = lines[3];
    if (lines[4]) result.tabagismo = lines[4];
    if (lines[5]) result.etilismo = lines[5];
  }

  return result;
}

export const DEFAULT_TEMPLATES: SystemTemplates = {
  hpp: `Alergias: Nega alergias medicamentosas conhecidas.
Comorbidades: Nega.
MUC: Nega medicações de uso contínuo.
Cirurgias prévias: Nega cirurgias prévias.
Tabagismo: Nega.
Etilismo: Nega.`,
  exameFisico: `BEG, afebril, hidratado, corado, anictérico, acianótico, hemodinamicamente estável.
AR: Eupneico, sem sinais de esforço respiratório. Sons respiratórios normais, sem RA.
ACV: RCR 2T, BNF, sem sopros. Pulsos periféricos cheios e simétricos. TEC <3s. Extremidades bem aquecidas e perfundidas.
AGI: Abdome plano, normotenso, RHA+, indolor a palpação superficial e profunda, sem sinais de irritação peritoneal. Murphy/Blumberg/Giordano negativos. Não palpo massas ou visceromegalias
MMII: Panturrilhas livres, sem edema.
Neurológico: Glasgow 15, pupilas isocóricas e fotorreagentes, sem déficits focais, sem sinais meníngeos.`,
  prontuario: `#QP: {{QP}}

#HMA: {{HMA}}

#HPP:
| Alergias: {{ALERGIAS}}
| Comorbidades: {{COMORBIDADES}}
| MUC: {{MUC}}
| Cirurgias prévias: {{CIRURGIAS}}
| Tabagismo: {{TABAGISMO}}
| Etilismo: {{ETILISMO}}

#EXAME FÍSICO:
PA: {{PA}} mmHg | FC: {{FC}} bpm | FR: {{FR}} irpm | SatO2: {{SAT}}% | Tax: {{TAX}}ºC
{{EXAME_FISICO}}

#HIPÓTESE DIAGNÓSTICA: {{HIPOTESE}}

#CONDUTAS:
{{CONDUTAS}}
- {{orientacoes_prontuario}}
- {{alarme_prontuario}}`,
  receitaInterna: `PRESCRIÇÃO UNIDADE / PRONTO ATENDIMENTO
Paciente: {{NOME}} | Idade: {{IDADE}} anos | Data: {{DATA}}
———————————————————————————————————
{{MEDICACOES_UNIDADE}}`,
  receitaDomiciliar: `RECEITUÁRIO MÉDICO
Paciente: {{NOME}} | Idade: {{IDADE}} anos | Data: {{DATA}}
———————————————————————————————————
USO ORAL:
{{MEDICACOES_CASA}}

———————————————————————————————————
ORIENTAÇÕES GERAIS: {{orientacoes_paciente}}

SINAIS DE ALARME: {{alarme_paciente}}`,
  passagemPlantao: `PASSAGEM DE CASO CLÍNICO:
Paciente {{NOME}}, {{IDADE}} anos, sexo {{SEXO}}.
Quadro principal: {{QP}}
Histórico e contexto: {{HMA_RESUMO}}
Dados objetivos: PA {{PA}}, FC {{FC}}, Tax {{TAX}}. Exame: {{EXAME_RESUMO}}
HD: {{HIPOTESE}}
Condutas efetuadas na unidade: {{CONDUTAS_UNIDADE}}
Exames/Pendências: {{PENDENCIAS}}
Status atual: {{STATUS}}`,
  passometro: `[PASSÔMETRO]
- LEITO / PACIENTE: {{NOME}} ({{IDADE}}a, {{SEXO}})
- DIAGNÓSTICO: {{HIPOTESE}}
- CONDUTAS REALIZADAS: {{CONDUTAS_FEITAS}}
- PENDÊNCIAS ATIVAS: {{PENDENCIAS}}
- SINAIS DE ALERTA / SE PIORAR: {{SINAIS_ALERTA}}`,
  evolucao: `#EVOLUÇÃO MÉDICA
Data e Horário: {{DATA_HORA}}
Paciente: {{NOME}} | Idade: {{IDADE}} | Sexo: {{SEXO}} | Leito de Observação

#HIPÓTESE INICIAL: {{HIPOTESE_INICIAL}}

#MEDICAÇÕES ADMINISTRADAS NA UNIDADE:
{{MEDICACOES_UNIDADE}}

#RESULTADOS DE EXAMES (LABORATÓRIO E IMAGEM):
{{RESULTADOS_EXAMES}}

#REAVALIAÇÃO CLÍNICA:
{{REAVALIACAO_TEXTO}}

#CONCLUSÃO / NOVA HIPÓTESE:
{{NOVA_HIPOTESE}}

#CONDUTAS:
{{NOVAS_CONDUTAS}}`,
  payloadCaso: `=== DADOS DO PACIENTE ===
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
Pendências da Reavaliação: {{PENDENCIAS_OBSERVACAO}}
Resultados de Exames na Observação: {{RESULTADOS_EXAMES}}
Reavaliação Clínica: {{REAVALIACAO_TEXTO}}
Nova Hipótese / Conclusão: {{NOVA_HIPOTESE}}
Novas Condutas: {{NOVAS_CONDUTAS}}`,
  payloadHma: `IDENTIFICAÇÃO:
Nome: {{NOME}}
Idade: {{IDADE}} anos
Sexo: {{SEXO}}
Peso: {{PESO}}
Altura: {{ALTURA}}

QUEIXA PRINCIPAL: {{QP}}

HISTÓRIA DA MOLÉSTIA ATUAL:
{{HMA}}`,
  payloadExameFisico: `IDENTIFICAÇÃO:
Nome: {{NOME}}
Idade: {{IDADE}} anos
Sexo: {{SEXO}}
Peso: {{PESO}}
Altura: {{ALTURA}}

QUEIXA PRINCIPAL: {{QP}}

HISTÓRIA DA MOLÉSTIA ATUAL:
{{HMA}}

HISTÓRIA PATOLÓGICA PREGRESSA:
Alergias: {{ALERGIAS}}
Comorbidades: {{COMORBIDADES}}
MUC (Medicações em Uso Contínuo): {{MUC}}
Cirurgias Prévias: {{CIRURGIAS}}
Tabagismo: {{TABAGISMO}}
Etilismo: {{ETILISMO}}

EXAME FÍSICO:
PA: {{PA}} mmHg
FC: {{FC}} bpm
FR: {{FR}} irpm
SatO2: {{SAT}} %
TAX: {{TAX}} ºC

{{EXAME_FISICO}}`,
  payloadDiagnostico: `IDENTIFICAÇÃO:
Nome: {{NOME}}
Idade: {{IDADE}} anos
Sexo: {{SEXO}}
Peso: {{PESO}}
Altura: {{ALTURA}} {{IMC}}

QUEIXA PRINCIPAL: {{QP}}

HISTÓRIA DA MOLÉSTIA ATUAL:
{{HMA}}

HISTÓRIA PATOLÓGICA PREGRESSA:
Alergias: {{ALERGIAS}}
Comorbidades: {{COMORBIDADES}}
MUC (Medicações em Uso Contínuo): {{MUC}}
Cirurgias Prévias: {{CIRURGIAS}}
Tabagismo: {{TABAGISMO}}
Etilismo: {{ETILISMO}}

EXAME FÍSICO:
PA: {{PA}} mmHg
FC: {{FC}} bpm
FR: {{FR}} irpm
SatO2: {{SAT}} %
TAX: {{TAX}} ºC

{{EXAME_FISICO}}`,
  payloadConduta: `IDENTIFICAÇÃO:
Nome: {{NOME}}
Idade: {{IDADE}} anos
Sexo: {{SEXO}}
Peso: {{PESO}}
Altura: {{ALTURA}} {{IMC}}

QUEIXA PRINCIPAL: {{QP}}

HISTÓRIA DA MOLÉSTIA ATUAL:
{{HMA}}

HISTÓRIA PATOLÓGICA PREGRESSA:
Alergias: {{ALERGIAS}}
Comorbidades: {{COMORBIDADES}}
MUC (Medicações em Uso Contínuo): {{MUC}}
Cirurgias Prévias: {{CIRURGIAS}}
Tabagismo: {{TABAGISMO}}
Etilismo: {{ETILISMO}}

EXAME FÍSICO:
PA: {{PA}} mmHg
FC: {{FC}} bpm
FR: {{FR}} irpm
SatO2: {{SAT}} %
TAX: {{TAX}} ºC

{{EXAME_FISICO}}

HIPÓTESE DIAGNÓSTICA: {{HIPOTESE}}
{{DIFERENCIAIS}}`,
  payloadOrientacoes: `IDENTIFICAÇÃO:
Nome: {{NOME}}
Idade: {{IDADE}} anos
Sexo: {{SEXO}}
Peso: {{PESO}}
Altura: {{ALTURA}}

QUEIXA PRINCIPAL: {{QP}}

HISTÓRIA DA MOLÉSTIA ATUAL:
{{HMA}}

HISTÓRIA PATOLÓGICA PREGRESSA:
Alergias: {{ALERGIAS}}
Comorbidades: {{COMORBIDADES}}
MUC (Medicações em Uso Contínuo): {{MUC}}
Cirurgias Prévias: {{CIRURGIAS}}
Tabagismo: {{TABAGISMO}}
Etilismo: {{ETILISMO}}

EXAME FÍSICO:
PA: {{PA}} mmHg
FC: {{FC}} bpm
FR: {{FR}} irpm
SatO2: {{SAT}} %
TAX: {{TAX}} ºC
{{EXAME_FISICO}}

HIPÓTESE DIAGNÓSTICA: {{HIPOTESE}}
{{DIFERENCIAIS}}`,
  payloadPassagemPlantao: `IDENTIFICAÇÃO:
Nome: {{NOME}}
Idade: {{IDADE}} anos
Sexo: {{SEXO}}
Peso: {{PESO}}
Altura: {{ALTURA}}

QUEIXA PRINCIPAL: {{QP}}

HISTÓRIA DA MOLÉSTIA ATUAL:
{{HMA}}

HISTÓRIA PATOLÓGICA PREGRESSA:
Alergias: {{ALERGIAS}}
Comorbidades: {{COMORBIDADES}}
MUC (Medicações em Uso Contínuo): {{MUC}}
Cirurgias Prévias: {{CIRURGIAS}}
Tabagismo: {{TABAGISMO}}
Etilismo: {{ETILISMO}}

EXAME FÍSICO:
PA: {{PA}} mmHg
FC: {{FC}} bpm
FR: {{FR}} irpm
SatO2: {{SAT}} %
TAX: {{TAX}} ºC
{{EXAME_FISICO}}

HIPÓTESE DIAGNÓSTICA: {{HIPOTESE}}
{{DIFERENCIAIS}}

CONDUTAS:
{{CONDUTAS}}`,
  payloadPassometro: `IDENTIFICAÇÃO:
Nome: {{NOME}}
Idade: {{IDADE}} anos
Sexo: {{SEXO}}
Peso: {{PESO}}
Altura: {{ALTURA}}

QUEIXA PRINCIPAL: {{QP}}

HISTÓRIA DA MOLÉSTIA ATUAL:
{{HMA}}

HISTÓRIA PATOLÓGICA PREGRESSA:
Alergias: {{ALERGIAS}}
Comorbidades: {{COMORBIDADES}}
MUC (Medicações em Uso Contínuo): {{MUC}}
Cirurgias Prévias: {{CIRURGIAS}}
Tabagismo: {{TABAGISMO}}
Etilismo: {{ETILISMO}}

EXAME FÍSICO:
PA: {{PA}} mmHg
FC: {{FC}} bpm
FR: {{FR}} irpm
SatO2: {{SAT}} %
TAX: {{TAX}} ºC
{{EXAME_FISICO}}

HIPÓTESE DIAGNÓSTICA: {{HIPOTESE}}

CONDUTAS REALIZADAS:
{{CONDUTAS}}

RESULTADOS DE EXAMES (LABORATÓRIO / IMAGEM): {{RESULTADOS_EXAMES}}

EVOLUÇÃO:
Em observação: {{STATUS_OBSERVACAO}}
Pendências da Reavaliação: {{PENDENCIAS_OBSERVACAO}}
Resultados de Exames na Observação: {{RESULTADOS_EXAMES}}
Reavaliação Clínica: {{REAVALIACAO_TEXTO}}
Nova Hipótese / Conclusão: {{NOVA_HIPOTESE}}
Novas Condutas: {{NOVAS_CONDUTAS}}`,
  payloadReavaliacao: `IDENTIFICAÇÃO:
Nome: {{NOME}}
Idade: {{IDADE}} anos
Sexo: {{SEXO}}
Peso: {{PESO}}
Altura: {{ALTURA}}

QUEIXA PRINCIPAL: {{QP}}

HISTÓRIA DA MOLÉSTIA ATUAL:
{{HMA}}

HISTÓRIA PATOLÓGICA PREGRESSA:
Alergias: {{ALERGIAS}}
Comorbidades: {{COMORBIDADES}}
MUC (Medicações em Uso Contínuo): {{MUC}}
Cirurgias Prévias: {{CIRURGIAS}}
Tabagismo: {{TABAGISMO}}
Etilismo: {{ETILISMO}}

EXAME FÍSICO:
PA: {{PA}} mmHg
FC: {{FC}} bpm
FR: {{FR}} irpm
SatO2: {{SAT}} %
TAX: {{TAX}} ºC
{{EXAME_FISICO}}

HIPÓTESE DIAGNÓSTICA: {{HIPOTESE}}
{{DIFERENCIAIS}}`,
  payloadConclusaoObs: `IDENTIFICAÇÃO:
Nome: {{NOME}}
Idade: {{IDADE}} anos
Sexo: {{SEXO}}
Peso: {{PESO}}
Altura: {{ALTURA}}

QUEIXA PRINCIPAL: {{QP}}

HISTÓRIA DA MOLÉSTIA ATUAL:
{{HMA}}

HISTÓRIA PATOLÓGICA PREGRESSA:
Alergias: {{ALERGIAS}}
Comorbidades: {{COMORBIDADES}}
MUC (Medicações em Uso Contínuo): {{MUC}}
Cirurgias Prévias: {{CIRURGIAS}}
Tabagismo: {{TABAGISMO}}
Etilismo: {{ETILISMO}}

EXAME FÍSICO:
PA: {{PA}} mmHg
FC: {{FC}} bpm
FR: {{FR}} irpm
SatO2: {{SAT}} %
TAX: {{TAX}} ºC
{{EXAME_FISICO}}

HIPÓTESE DIAGNÓSTICA: {{HIPOTESE}}
{{DIFERENCIAIS}}

CONDUTAS:
{{CONDUTAS}}

OBSERVAÇÃO:
Pendências da Reavaliação: {{PENDENCIAS_OBSERVACAO}}

REAVALIAÇÃO CLÍNICA: {{REAVALIACAO_TEXTO}}`
};

export const DEFAULT_PROMPTS: SystemPrompts = {
  hma: `Você é um médico assistente experiente em uma UPA (Unidade de Pronto Atendimento) no Brasil.
Com base nos dados do paciente (Idade, Sexo, Peso, Altura, Queixa Principal e texto inicial da HMA), realize duas tarefas de forma direta, concisa e sem prolixidade:

1. Melhore a redação da HMA tornando-a técnica, fluida, cronológica e padrão médico, mas sem usar uma linguagem muito formal, com palavras difíceis e pouco usuais ou com aspecto robótico ou feito por inteligência artificial, tente preservar o aspecto humano da escrita.

2. Sugira perguntas ou dados de anamnese essenciais que faltaram investigar para este caso específico, levando em consideração todo o caso, apresente as perguntas em ordem de prioridade ao caso.

Retorne no formato JSON especificado.`,
  exameFisico: `Você é um médico assistente experiente em uma UPA (Unidade de Pronto Atendimento) no Brasil.

Com base nos dados do paciente (Idade, Sexo, Peso, Altura, Queixa Principal e texto inicial da HMA), realize duas tarefas de forma direta, concisa e sem prolixidade:

1. Melhore a redação do exame físico de forma fluida e padrão médico, mas sem usar uma linguagem muito formal, com palavras difíceis e pouco usuais ou com aspecto robótico ou feito por inteligência artificial, tente preservar o aspecto humano da escrita. Porém, compare o exame físico do caso com o template padrão abaixo e só altere o que for diferente do template padrão, que se tratam de coisas que eu adicionei ao caso gostaria que você revisasse. Mantenha a quebra de linha conforme no template padrão.

2. Sugira perguntas ou dados de anamnese essenciais que faltaram investigar para este caso específico, levando em consideração todo o caso, apresente as perguntas em ordem de prioridade ao caso.

Template padrão:
'BEG, afebril, hidratado, corado, anictérico, acianótico, hemodinamicamente estável.
AR: Eupneico, sem sinais de esforço respiratório. Sons respiratórios normais, sem RA.
ACV: RCR 2T, BNF, sem sopros. Pulsos periféricos cheios e simétricos. TEC <3s. Extremidades bem aquecidas e perfundidas.
AGI: Abdome plano, normotenso, RHA+, indolor a palpação superficial e profunda, sem sinais de irritação peritoneal. Murphy/Blumberg/Giordano negativos. Não palpo massas ou visceromegalias
MMII: Panturrilhas livres, sem edema.
Neurológico: Glasgow 15, pupilas isocóricas e fotorreagentes, sem déficits focais, sem sinais meníngeos.'

Retorne no formato JSON especificado.`,
  diagnostico: `Você é um médico assistente experiente em uma UPA (Unidade de Pronto Atendimento) no Brasil.

Analise todo o caso clínico até agora (Identificação, QP, HMA, HPP, Sinais Vitais, Exame Físico).

1. Indique a Hipótese Diagnóstica Principal.
2. Indique até 3 Diagnósticos Diferenciais pertinentes.
3. Elenque 3 CIDs (CID-10) prováveis em ranking (do mais provável para o menos provável), com código e descrição.
4. Identifique se é Agravo de Notificação Compulsória (SINAN).
5. Sugira escores de risco pertinentes se houver (ex: Centor, CURB-65, HEART, Wells, etc.) com cálculo e interpretação.

Retorne no formato JSON especificado.`,
  conduta: `Você é um médico assistente experiente em uma UPA (Unidade de Pronto Atendimento) no Brasil.

Analise todo o caso clínico até o momento.

1. Sugira medicações para administrar na unidade (PA) com dose e via. Antes de cada medicação, enumere assim '1.', '2.', e assim por diante.
2. Sugira medicações para uso domiciliar com posologia. Antes de cada medicação, enumere assim '1.', '2.', e assim por diante.
3. PRIORIZE medicações disponíveis no SUS / RENAME / Farmácia Básica quando aplicável.
4. ALERTA CRÍTICO: Verifique as alergias registradas na HPP e interação medicamentosa com medicações em uso. Se qualquer medicação for contraindicada, avise explicitamente.
5. Disclaimers clínicos objetivos: ajuste de dose para idoso frágil, disfunção renal/hepática ou cuidados essenciais de infusão ou informações relevantes sobre cuidados com determinados fármacos.
6. Lembrete de profilaxia antitetânica ou antirrábica se ferimento/mordedura/trauma.
7. Exames laboratoriais e de imagem a solicitar para o caso. Antes de cada exame, enumere assim '1.', '2.', e assim por diante, separando-os por uma quebra de linha.
8. Sugira o desfecho: alta orientada, observação, internação ou transferência, com justificativa concisa.
9. Indique se necessita encaminhamento para UBS/Ambulatório com justificativa, além de breve prognóstico mais provável do quadro.
10. Indique se necessita atestado médico, com dias sugeridos e justificativa.

Retorne no formato JSON especificado.`,
  melhorarCondutas: `Você é um médico assistente experiente em uma UPA (Unidade de Pronto Atendimento) no Brasil.

Com base no caso clínico acumulado (Identificação, QP, HMA, HPP, Sinais Vitais, Exame Físico, Hipóteses) e no texto digitado no campo de Condutas:

1. Melhore a redação das condutas médicas, tornando-a técnica, fluida e padrão médico, mas sem usar uma linguagem muito formal, com palavras difíceis e pouco usuais ou com aspecto robótico ou feito por inteligência artificial, tente preservar o aspecto humano da escrita.

Retorne no formato JSON especificado.`,
  orientacoes: `Você é um médico assistente experiente em uma UPA (Unidade de Pronto Atendimento) no Brasil.

Com base em todo o caso clínico:

1. Gere ORIENTAÇÕES GERAIS e SINAIS DE ALARME em TEXTO TÉCNICO para constar no Prontuário. Inicie sempre as ORIENTAÇÕES com 'Oriento ...' e os SINAIS DE ALARME COM 'Oriento retornar ao pronto atendimento se sinais de alarmes como ...'. Seja conciso, objetivo e direto ao ponto.

2. Gere ORIENTAÇÕES GERAIS e SINAIS DE ALARME em LINGUAGEM LEIGA, clara e acessível, para 
constar na Receita Domiciliar do paciente. Em orientações, faça em formato instrucional. Em sinais de alarme, comece com 'Retornar ao pronto atendimento se sinais de alarmes como ...'. Seja conciso, objetivo e direto ao ponto.

3. Utilize linguagem fluida e em padrão médico, mas sem usar uma linguagem muito formal, com palavras difíceis e pouco usuais ou com aspecto robótico ou feito por inteligência artificial, tente preservar o aspecto humano da escrita. Mantenha objetivo, direto ao ponto e sem enrolação.

Retorne no formato JSON especificado.`,
  passagemPlantao: `Você é um médico assistente experiente em uma UPA (Unidade de Pronto Atendimento) no Brasil, passando um caso para outro médico plantonista para receber conselhos sobre hipótese diagnóstica e condutas do caso.

Com base em todo o caso clínico acumulado, gere uma passagem de caso oral sintetizada, direta ao ponto, em texto contínuo, como se fosse para ser lido em uma conversa, com:
Idade, Sexo, QP, tempo de evolução, dados vitais alterados, exame físico relevante, HD principal e o quais as condutas elencadas atualmente.

Máxima objetividade, linguagem médica fluida de beira de leito, com linguagem humanizada e não robótica ou com aspectos de inteligência artificial, não use palavras exageradamente técnicas ou incomuns. Priorize apenas aspectos relevantes ao caso, ao entendimento de quem está ouvindo.`,
  passometro: `Você é um médico emergencista.
Preencha o Passômetro com máxima objetividade para o caso clínico acumulado:
- Identificação e Leito
- Diagnóstico Principal
- Condutas já realizadas
- Pendências ativas (exames pendentes, resposta a drogas)
- Sinais de alerta / Conduta se piorar.`,
  reavaliacao: `Você é um médico assistente experiente em uma UPA (Unidade de Pronto Atendimento) no Brasil.

Com base no histórico do caso, queixa inicial, medicações administradas e no texto inicial digitado da reavaliação:

1. Melhore e estruture a redação da Reavaliação Clínica (Estado Atual) em padrão médico de evolução (evolução dos sintomas, alívio da dor/febre, estabilidade hemodinâmica, tolerância oral), de forma fluida, cronológica e padrão médico, mas sem usar uma linguagem muito formal, com palavras difíceis e pouco usuais ou com aspecto robótico ou feito por inteligência artificial, tente preservar o aspecto humano da escrita.

2. Aponte de 2 a 4 dados essenciais ou omissões que faltaram checar nesta reavaliação (ex: reavaliação de abdome pós-analgesia, diurese, saturação, novos sinais vitais).

Retorne no formato JSON especificado.`,
  conclusaoObs: `Você é um médico assistente experiente em uma UPA (Unidade de Pronto Atendimento) no Brasil.

Com base em todo o caso (admissão, medicações recebidas, resultados de exames inseridos e estado atual da reavaliação):
1. Defina a Conclusão / Nova Hipótese Diagnóstica (se mantida, refinada ou resolvida).
2. Estabeleça as Novas Condutas Sugeridas (ex: alta médica com orientações/receitas domiciliares, manter em observação com nova dose, solicitar exames adicionais ou solicitar vaga de internação/transferência).
Retorne no formato JSON especificado.`
};
