-- ====================================================================
-- BANCO DE DADOS DE RECEITAS MÉDICAS - SCHEMA RELACIONAL SQL
-- Compatível com SQLite, PostgreSQL e MySQL
-- ====================================================================

-- 1. Categorias Clínicas
CREATE TABLE IF NOT EXISTS categorias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome VARCHAR(100) UNIQUE NOT NULL,
    ordem INTEGER DEFAULT 0
);

-- 2. Tabela Mestra de Medicamentos
CREATE TABLE IF NOT EXISTS medicamentos (
    id VARCHAR(64) PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    nome_busca TEXT,
    categoria_id INTEGER,
    via_administracao_padrao VARCHAR(50),
    grupo_administracao VARCHAR(50),
    posicao_grupo INTEGER DEFAULT 0,
    tem_adulto BOOLEAN DEFAULT 0,
    tem_pediatrico BOOLEAN DEFAULT 0,
    peso_min_pediatrico INTEGER,
    peso_max_pediatrico INTEGER,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id)
);

-- 3. Receitas e Posologia Adulto
CREATE TABLE IF NOT EXISTS receitas_adulto (
    medicamento_id VARCHAR(64) PRIMARY KEY,
    texto_completo TEXT NOT NULL,
    texto_selecionado TEXT,
    apresentacao VARCHAR(255),
    quantidade VARCHAR(100),
    posologia TEXT,
    sugestao_horarios TEXT,
    marcas_referencia TEXT, -- JSON Array
    FOREIGN KEY (medicamento_id) REFERENCES medicamentos(id)
);

-- 4. Receitas Pediátricas Padrão / Genéricas
CREATE TABLE IF NOT EXISTS receitas_pediatricas (
    medicamento_id VARCHAR(64) PRIMARY KEY,
    texto_padrao TEXT,
    apresentacao_padrao VARCHAR(255),
    quantidade_padrao VARCHAR(100),
    posologia_padrao TEXT,
    sugestao_horarios_padrao TEXT,
    marcas_referencia TEXT, -- JSON Array
    peso_min_kg INTEGER,
    peso_max_kg INTEGER,
    FOREIGN KEY (medicamento_id) REFERENCES medicamentos(id)
);

-- 5. Doses Pediátricas Calculadas por Peso Específico (4kg a 39kg)
CREATE TABLE IF NOT EXISTS doses_pediatricas_peso (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    medicamento_id VARCHAR(64) NOT NULL,
    peso_kg INTEGER NOT NULL,
    texto_completo TEXT NOT NULL,
    texto_selecionado TEXT,
    apresentacao VARCHAR(255),
    quantidade VARCHAR(100),
    posologia TEXT,
    sugestao_horarios TEXT,
    marcas_referencia TEXT, -- JSON Array
    UNIQUE(medicamento_id, peso_kg),
    FOREIGN KEY (medicamento_id) REFERENCES medicamentos(id)
);

-- 6. Vias Alternativas e Prescrições Hospitalares
CREATE TABLE IF NOT EXISTS vias_administracao (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    medicamento_id VARCHAR(64) NOT NULL,
    via VARCHAR(50) NOT NULL,
    origem VARCHAR(50), -- 'remedios' ou 'remedios_prescricao_interna'
    texto_prescricao TEXT NOT NULL,
    FOREIGN KEY (medicamento_id) REFERENCES medicamentos(id)
);

-- Índices de Alta Performance
CREATE INDEX IF NOT EXISTS idx_med_nome ON medicamentos(nome);
CREATE INDEX IF NOT EXISTS idx_med_cat ON medicamentos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_dose_peso ON doses_pediatricas_peso(peso_kg);
CREATE INDEX IF NOT EXISTS idx_dose_med ON doses_pediatricas_peso(medicamento_id);
