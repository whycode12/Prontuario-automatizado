export interface CategoriaMedica {
  nome: string;
  ordem: number;
}

export interface ReceitaDetalhada {
  texto_original: string;
  medicamento_apresentacao: string | null;
  quantidade: string | null;
  posologia: string | null;
  sugestao_horarios: string | null;
  marcas_referencia: string[];
}

export interface ReceitaAdulto {
  texto_completo: string;
  texto_selecionado?: string;
  apresentacao: string | null;
  quantidade: string | null;
  posologia: string | null;
  sugestao_horarios: string | null;
  marcas_referencia: string[];
}

export interface DosePediatricaPorPeso {
  peso_kg: number;
  texto_completo: string;
  texto_selecionado?: string;
  apresentacao: string | null;
  quantidade: string | null;
  posologia: string | null;
  sugestao_horarios: string | null;
  marcas_referencia: string[];
}

export interface ReceitaPediatrica {
  tem_pediatrico: boolean;
  texto_padrao: string | null;
  apresentacao_padrao: string | null;
  quantidade_padrao: string | null;
  posologia_padrao: string | null;
  sugestao_horarios_padrao: string | null;
  marcas_referencia: string[];
  peso_min_kg: number | null;
  peso_max_kg: number | null;
  doses_por_peso: Record<string, DosePediatricaPorPeso>;
}

export interface ViaAdministracaoItem {
  adm: string;
  source: 'remedios' | 'remedios_prescricao_interna' | string;
  text: string;
}

export interface Medicamento {
  id: string;
  nome: string;
  nome_busca: string;
  categoria: string;
  ordem_categoria: number;
  via_administracao_padrao: string;
  grupo_administracao: string;
  posicao_grupo: number;
  tem_adulto: boolean;
  tem_pediatrico: boolean;
  receita_adulto: ReceitaAdulto | null;
  receita_pediatrica: ReceitaPediatrica;
  vias_administracao: ViaAdministracaoItem[];
}

export interface BancoReceitasJSON {
  metadados: {
    origem: string;
    data_extracao: string;
    total_medicamentos: number;
    total_adulto: number;
    total_pediatrico: number;
    total_categorias: number;
    faixas_peso_pediatrico_kg: number[];
    versao_schema: string;
  };
  categorias: CategoriaMedica[];
  medicamentos: Medicamento[];
}

export interface PrescricaoOption {
  id: string;
  label: string;
  badge?: string;
  subtitle?: string;
  fullText: string;
  route: string;
}
