import React from 'react';
import { Eye, Edit3, Sparkles, X, RotateCcw, User, Globe, Code2, Copy, Check } from 'lucide-react';

export const DEFAULT_JSON_SCHEMAS: Record<string, string> = {
  hma: JSON.stringify({
    hmaRefinada: "Texto fluido, técnico e cronológico da HMA refinada pelo modelo...",
    perguntasFaltantes: [
      "Início súbito ou insidioso dos sintomas?",
      "Fatores claros de melhora ou piora?",
      "Aferição prévia de temperatura axilar ou pressão arterial?"
    ]
  }, null, 2),

  exameFisico: JSON.stringify({
    exameRefinado: "BEG, lúcido e orientado no tempo e espaço (LOTE), acianótico, anictérico, afebril...\nAR: Murmúrio vesicular presente bilateralmente, sem ruídos adventícios.\nACV: Bulhas rítmicas normofonéticas em 2T, sem sopros.\nABD: Plano, flácido, indolor à palpação, sem visceromegalias.",
    manobrasFaltantes: [
      "Aferição de sinais vitais posturais (decúbito e ortostase) se queixa de tontura",
      "Palpação detalhada de pulsos periféricos e tempo de enchimento capilar",
      "Pesquisa de sinais específicos para o quadro clínico"
    ]
  }, null, 2),

  diagnostico: JSON.stringify({
    hipotesePrincipal: "Cistite aguda não complicada",
    rankingHipoteses: [
      { nome: "Cistite aguda não complicada", tipo: "Principal", prob: "Alta" },
      { nome: "Pielonefrite aguda", tipo: "Diferencial", prob: "Média" },
      { nome: "Cálculo ureteral", tipo: "Diferencial", prob: "Baixa" }
    ],
    diagnosticosDiferenciais: [
      "Pielonefrite aguda",
      "Cálculo ureteral"
    ],
    cids: [
      { cid: "N39.0", desc: "Infecção do trato urinário de localização não especificada", prob: "Alta" },
      { cid: "N30.0", desc: "Cistite aguda", prob: "Média" },
      { cid: "N10", desc: "Nefrite túbulo-intersticial aguda (pielonefrite)", prob: "Baixa" },
      { cid: "N20.1", desc: "Cálculo do ureter", prob: "Baixa" },
      { cid: "R30.0", desc: "Disúria", prob: "Baixa" }
    ],
    notificacaoCompulsoria: false,
    detalhesNotificacao: "",
    escoresClinicos: [
      { name: "Centor / McIsaac", score: "0 pontos", interpretation: "Baixo risco de infecção estreptocócica" }
    ]
  }, null, 2),

  conduta: JSON.stringify({
    medicacoesUnidade: [
      "Dipirona 1g EV diluído em 100ml SF 0,9% agora em 20 min",
      "Cetoprofeno 100mg EV em SF 0,9% 100ml agora"
    ],
    medicacoesCasa: [
      "Fosfomicina Trometamol 3g dose única VO à noite",
      "Dipirona 500mg VO de 6/6h se dor ou febre (por até 3 a 5 dias)"
    ],
    disclaimers: [
      { med: "Cetoprofeno 100mg", type: "warning", note: "Cuidado em idoso frágil e nefropatas (risco renal)." },
      { med: "Dipirona", type: "contraindication", note: "ATENÇÃO: Paciente relata alergia se houver, não prescrever!" }
    ],
    alertaProfilaxiaVacinal: "Avaliar VAT se ferimento perfurocortante.",
    examesLaboratorio: "1. EAS / Urina 1\n2. Urocultura com antibiograma se falha terapêutica",
    examesImagem: "Sem indicação no momento",
    desfechoSugerido: "alta",
    motivoDesfecho: "Boa resposta clínica esperada, ausência de sinais de sepse ou abdome cirúrgico.",
    encaminhamentoUbs: true,
    motivoEncaminhamento: "Revisão e seguimento de urocultura na UBS de referência.",
    atestadoNecessario: true,
    diasAtestado: "1 dia",
    motivoAtestado: "Repouso e realização de medicações na fase álgica aguda."
  }, null, 2),

  melhorarCondutas: JSON.stringify({
    condutasRefinadas: "- Dipirona 1g EV diluído em 100ml SF 0,9% agora em 20 min\n- Hidratação com SF 0,9% 500ml EV em bólus\n- Reavaliação clínica e aferição de sinais vitais após término das medicações"
  }, null, 2),

  orientacoes: JSON.stringify({
    orientacoesProntuario: "Orientado repouso relativo, hidratação oral contínua e seguimento com médico assistente / UBS.",
    sinaisAlarmeProntuario: "Febre persistente acima de 38,5°C refratária a antitérmicos, piora acentuada da dor, vômitos incoercíveis, síncope ou dispneia.",
    orientacoesReceita: "Mantenha repouso em casa e tome bastante água e sucos naturais. Tome as medicações receitadas rigorosamente nos horários indicados.",
    sinaisAlarmeReceita: "Retorne imediatamente ao pronto atendimento se apresentar: febre alta que não baixa com os remédios, dor intensa que piore, vômitos que impeçam beber água ou falta de ar."
  }, null, 2),

  reavaliacao: JSON.stringify({
    reavaliacaoRefinada: "Paciente mantido em repouso e sob analgesia venosa. No momento, refere melhora expressiva do quadro álgico (EVA 2/10), nega novos picos febris ou episódios de êmese. Aceitando hidratação oral. Mantém estabilidade hemodinâmica.",
    checagensFaltantes: [
      "Aferir novos sinais vitais de controle (PA, FC, Tax, SatO2)",
      "Palpação abdominal de controle pós-analgesia",
      "Checar débito urinário e aceitação oral"
    ]
  }, null, 2),

  conclusaoObs: JSON.stringify({
    novaHipotese: "Cistite aguda não complicada com boa resposta inicial a sintomáticos e hidratação.",
    novasCondutas: "- Alta médica da observação com receitas e orientações domiciliares.\n- Fosfomicina 3g dose única VO hoje à noite.\n- Dipirona 500mg VO de 6/6h se dor ou febre.\n- Manter hidratação vigorosa e retorno à UBS para seguimento.\n- Sinais de alarme orientados (febre refratária, dor lombar ou vômitos)."
  }, null, 2)
};

interface AIActionProps {
  label: string;
  onExecute: () => void;
  isLoading: boolean;
  promptKey: string;
  currentPrompt: string;
  onSavePrompt: (newPrompt: string) => void;
  onSaveGlobalPrompt?: (newPrompt: string) => void;
  onResetPrompt?: () => void;
  contextPayload: string;
  payloadTemplate: string;
  onSavePayloadTemplate: (newTemplate: string) => void;
  onSaveGlobalPayloadTemplate?: (newTemplate: string) => void;
  onResetPayloadTemplate: () => void;
  compact?: boolean;
}

export const AIActionButton: React.FC<AIActionProps> = ({
  label,
  onExecute,
  isLoading,
  promptKey,
  currentPrompt,
  onSavePrompt,
  onSaveGlobalPrompt,
  onResetPrompt,
  contextPayload,
  payloadTemplate,
  onSavePayloadTemplate,
  onSaveGlobalPayloadTemplate,
  onResetPayloadTemplate,
}) => {
  const [modalOpen, setModalOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'prompt' | 'payload_preview' | 'payload_template' | 'json_schema'>('prompt');
  const [editedPrompt, setEditedPrompt] = React.useState(currentPrompt);
  const [editedPayloadTemplate, setEditedPayloadTemplate] = React.useState(payloadTemplate);
  const [savedNotice, setSavedNotice] = React.useState<string | null>(null);
  const [copiedJson, setCopiedJson] = React.useState(false);

  React.useEffect(() => {
    setEditedPrompt(currentPrompt);
  }, [currentPrompt]);

  React.useEffect(() => {
    setEditedPayloadTemplate(payloadTemplate);
  }, [payloadTemplate]);

  const handleSavePromptUser = () => {
    onSavePrompt(editedPrompt);
    setSavedNotice('✓ Prompt salvo no seu usuário!');
    setTimeout(() => setSavedNotice(null), 2500);
  };

  const handleSavePromptGlobal = () => {
    if (onSaveGlobalPrompt) {
      if (window.confirm('Tem certeza que deseja definir este prompt como o PADRÃO GLOBAL do sistema? Todos os usuários e novos logins usarão este prompt.')) {
        onSaveGlobalPrompt(editedPrompt);
        setSavedNotice('✓ Prompt definido como Padrão Global do Sistema!');
        setTimeout(() => setSavedNotice(null), 2500);
      }
    }
  };

  const handleResetPromptAction = () => {
    if (onResetPrompt && window.confirm('Deseja restaurar o prompt deste botão para o original de fábrica?')) {
      onResetPrompt();
      setSavedNotice('✓ Prompt restaurado para o original!');
      setTimeout(() => setSavedNotice(null), 2000);
    }
  };

  const handleSavePayloadUser = () => {
    onSavePayloadTemplate(editedPayloadTemplate);
    setSavedNotice('✓ Template de dados salvo no seu usuário!');
    setTimeout(() => setSavedNotice(null), 2500);
  };

  const handleSavePayloadGlobal = () => {
    if (onSaveGlobalPayloadTemplate) {
      if (window.confirm('Tem certeza que deseja definir este template de dados como o PADRÃO GLOBAL do sistema?')) {
        onSaveGlobalPayloadTemplate(editedPayloadTemplate);
        setSavedNotice('✓ Template de dados definido como Padrão Global!');
        setTimeout(() => setSavedNotice(null), 2500);
      }
    }
  };

  const handleResetPayloadAction = () => {
    if (window.confirm('Deseja restaurar o template de envio de dados para o original de fábrica?')) {
      onResetPayloadTemplate();
      setSavedNotice('✓ Template de dados restaurado para o original!');
      setTimeout(() => setSavedNotice(null), 2000);
    }
  };

  return (
    <>
      <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-[#383838] bg-white dark:bg-[#252525] shadow-2xs overflow-hidden h-8">
        <button
          type="button"
          onClick={onExecute}
          disabled={isLoading}
          className="h-full px-2.5 text-slate-600 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white hover:bg-[#f5f5f5] dark:hover:bg-[#2e2e2e] transition-colors disabled:opacity-50 flex items-center justify-center"
          title={`Executar IA: ${label}`}
        >
          <Sparkles className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="h-full border-l border-slate-200 dark:border-[#383838] px-2.5 text-slate-600 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white hover:bg-[#f5f5f5] dark:hover:bg-[#2e2e2e] transition-colors flex items-center justify-center"
          title={`Ver prompt e dados enviados (${label})`}
        >
          <Edit3 className="w-4 h-4" />
        </button>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-[#252525] rounded-lg shadow-2xl border border-[#ececeb] dark:border-[#333] w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="px-4 py-3 bg-slate-50 dark:bg-[#202020] border-b border-[#ececeb] dark:border-[#333]/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-800 dark:text-neutral-100">Controle de IA: {label}</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sub-header / Tabs */}
            <div className="flex border-b border-[#ececeb] dark:border-[#333]/80 bg-slate-100/60 dark:bg-black/20 px-4 text-xs font-medium">
              <button
                type="button"
                onClick={() => setActiveTab('prompt')}
                className={`py-2 px-3 border-b-2 flex items-center gap-1.5 ${
                  activeTab === 'prompt'
                    ? 'border-slate-800 text-slate-900 dark:border-neutral-200 dark:text-white bg-white dark:bg-[#252525] font-semibold'
                    : 'border-transparent text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                1. Prompt da IA (Instruções)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('payload_preview')}
                className={`py-2 px-3 border-b-2 flex items-center gap-1.5 ${
                  activeTab === 'payload_preview'
                    ? 'border-slate-800 text-slate-900 dark:border-neutral-200 dark:text-white bg-white dark:bg-[#252525] font-semibold'
                    : 'border-transparent text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                2. Dados Enviados (Preview)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('payload_template')}
                className={`py-2 px-3 border-b-2 flex items-center gap-1.5 ${
                  activeTab === 'payload_template'
                    ? 'border-slate-800 text-slate-900 dark:border-neutral-200 dark:text-white bg-white dark:bg-[#252525] font-semibold'
                    : 'border-transparent text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5 text-amber-500" />
                3. Editar Template dos Dados
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('json_schema')}
                className={`py-2 px-3 border-b-2 flex items-center gap-1.5 ${
                  activeTab === 'json_schema'
                    ? 'border-slate-800 text-slate-900 dark:border-neutral-200 dark:text-white bg-white dark:bg-[#252525] font-semibold'
                    : 'border-transparent text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                <Code2 className="w-3.5 h-3.5 text-blue-500" />
                4. Estrutura JSON (Somente Leitura)
              </button>
            </div>

            {/* Content */}
            <div className="p-4 flex-1 overflow-y-auto text-xs">
              {activeTab === 'prompt' && (
                <div className="space-y-2">
                  <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                    Edite as instruções enviadas para a IA neste botão. Escolha se deseja salvar apenas para o seu usuário ou como o padrão global do sistema.
                  </p>
                  <textarea
                    value={editedPrompt}
                    onChange={(e) => setEditedPrompt(e.target.value)}
                    rows={12}
                    className="w-full font-mono text-xs p-3 rounded border border-[#e5e5e5] dark:border-[#333] focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-neutral-500 leading-relaxed bg-slate-50 dark:bg-[#202020] text-slate-800 dark:text-neutral-100"
                  />
                  <div className="flex flex-wrap items-center justify-between pt-2 gap-2">
                    <button
                      type="button"
                      onClick={handleResetPromptAction}
                      className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                      title="Restaurar o prompt original de fábrica"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Restaurar Original
                    </button>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 text-[11px] font-medium">
                        {savedNotice}
                      </span>
                      <button
                        type="button"
                        onClick={handleSavePromptUser}
                        className="inline-flex items-center gap-1.5 bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors"
                        title="Salvar somente para o meu usuário"
                      >
                        <User className="w-3.5 h-3.5" />
                        Salvar no Meu Usuário
                      </button>
                      {onSaveGlobalPrompt && (
                        <button
                          type="button"
                          onClick={handleSavePromptGlobal}
                          className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors shadow-2xs"
                          title="Definir como padrão global de todo o sistema no Firebase"
                        >
                          <Globe className="w-3.5 h-3.5" />
                          Definir Padrão Global
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'payload_preview' && (
                <div className="space-y-2">
                  <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                    Texto exato gerado a partir do seu template e preenchido com as informações atuais do caso clínico:
                  </p>
                  <pre className="w-full font-mono text-[11px] p-3 rounded bg-slate-900 text-slate-100 border border-slate-800 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[350px]">
                    {contextPayload}
                  </pre>
                </div>
              )}

              {activeTab === 'payload_template' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                      Template padrão que monta os dados do caso enviados à IA. Você pode adicionar ou remover variáveis como <code className="bg-slate-200 dark:bg-black/40 px-1 py-0.5 rounded text-[10px]">{'{{NOME}}'}</code>, <code className="bg-slate-200 dark:bg-black/40 px-1 py-0.5 rounded text-[10px]">{'{{HMA}}'}</code>, etc.
                    </p>
                  </div>
                  <textarea
                    value={editedPayloadTemplate}
                    onChange={(e) => setEditedPayloadTemplate(e.target.value)}
                    rows={12}
                    className="w-full font-mono text-xs p-3 rounded border border-[#e5e5e5] dark:border-[#333] focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-neutral-500 leading-relaxed bg-slate-50 dark:bg-[#202020] text-slate-800 dark:text-neutral-100"
                  />
                  <div className="flex flex-wrap items-center justify-between pt-2 gap-2">
                    <button
                      type="button"
                      onClick={handleResetPayloadAction}
                      className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                      title="Restaurar o template original de envio de dados"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Restaurar Original
                    </button>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 text-[11px] font-medium">
                        {savedNotice}
                      </span>
                      <button
                        type="button"
                        onClick={handleSavePayloadUser}
                        className="inline-flex items-center gap-1.5 bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors"
                        title="Salvar somente para o meu usuário"
                      >
                        <User className="w-3.5 h-3.5" />
                        Salvar no Meu Usuário
                      </button>
                      {onSaveGlobalPayloadTemplate && (
                        <button
                          type="button"
                          onClick={handleSavePayloadGlobal}
                          className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors shadow-2xs"
                          title="Definir como padrão global de todo o sistema no Firebase"
                        >
                          <Globe className="w-3.5 h-3.5" />
                          Definir Padrão Global
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'json_schema' && (
                <div className="space-y-3">
                  <div className="p-2.5 rounded bg-blue-50/70 dark:bg-navy-900 border border-blue-200/80 dark:border-blue-800/60 text-blue-900 dark:text-ice-200 text-[11px] leading-relaxed">
                    <p className="font-semibold mb-1 flex items-center gap-1.5">
                      <Code2 className="w-3.5 h-3.5 text-blue-600 dark:text-ice-300" />
                      Contrato de Retorno da Inteligência Artificial
                    </p>
                    <p>
                      Este é o formato de dados em JSON que a Inteligência Artificial deve retornar para preencher automaticamente os campos, caixas de texto e gavetas na tela.
                    </p>
                    <p className="mt-1 text-[10px] text-blue-800/80 dark:text-ice-300/80">
                      🔒 <strong>Somente leitura:</strong> O formato JSON é fixado pelo sistema para assegurar que a extração de dados e as funções clínicas funcionem sem quebras.
                    </p>
                  </div>

                  {DEFAULT_JSON_SCHEMAS[promptKey] ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-500 dark:text-neutral-400 font-medium">
                          Estrutura esperada ({promptKey}):
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(DEFAULT_JSON_SCHEMAS[promptKey]);
                            setCopiedJson(true);
                            setTimeout(() => setCopiedJson(false), 2000);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border border-slate-200 dark:border-neutral-700 bg-white dark:bg-[#2e2e2e] text-slate-600 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-neutral-800 transition-colors"
                        >
                          {copiedJson ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-600 font-medium">Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 text-slate-500" />
                              <span>Copiar JSON</span>
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="w-full font-mono text-[11px] p-3 rounded bg-slate-900 text-slate-100 border border-slate-800 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[350px]">
                        {DEFAULT_JSON_SCHEMAS[promptKey]}
                      </pre>
                    </div>
                  ) : (
                    <div className="p-3 rounded bg-slate-50 dark:bg-[#202020] border border-[#e5e5e5] dark:border-[#333] text-slate-600 dark:text-neutral-300 text-xs">
                      Esta ação produz texto livre formatado diretamente (não utiliza estrutura JSON intermediária).
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 bg-slate-50 dark:bg-[#202020] border-t border-[#ececeb] dark:border-[#333]/80 flex justify-end">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white bg-white dark:bg-[#2b2b2b] border border-[#ececeb] dark:border-[#333] rounded"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
