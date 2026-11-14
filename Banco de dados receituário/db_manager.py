"""
Módulo de Gerenciamento do Banco de Dados de Receitas Médicas
Permite:
1. Buscar medicamentos por nome, marca ou categoria (FTS5 ou JSON)
2. Gerar receita formatada exatamente no padrão médico (exemplo da foto)
3. Catalogar novos medicamentos e doses adulto/pediátrico de forma confiável
4. Exportar para múltiplos formatos
"""

import sqlite3
import json
import os
import re
from typing import Optional, List, Dict, Any, Union

DB_PATH = os.path.join(os.path.dirname(__file__), 'receitas.db')
JSON_PATH = os.path.join(os.path.dirname(__file__), 'banco_receitas.json')

class ReceitasDB:
    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path

    def _get_con(self):
        con = sqlite3.connect(self.db_path)
        con.row_factory = sqlite3.Row
        return con

    def buscar(self, termo: str, limit: int = 20) -> List[Dict[str, Any]]:
        """
        Busca medicamentos por nome genérico, comercial ou categoria.
        Usa o índice FTS5 de alta performance com fallback para LIKE.
        """
        termo = termo.strip()
        if not termo:
            return []
            
        con = self._get_con()
        cur = con.cursor()
        
        # Limpar termo para FTS5
        clean_term = re.sub(r'[^a-zA-Z0-9\u00C0-\u00FF\s]', '', termo)
        fts_query = f"{clean_term}*" if clean_term else termo
        
        try:
            cur.execute("""
                SELECT m.*, c.nome as categoria_nome
                FROM medicamentos_fts f
                JOIN medicamentos m ON m.id = f.medicamento_id
                LEFT JOIN categorias c ON c.id = m.categoria_id
                WHERE medicamentos_fts MATCH ?
                ORDER BY rank
                LIMIT ?
            """, (fts_query, limit))
            rows = cur.fetchall()
        except sqlite3.OperationalError:
            # Fallback para LIKE
            like_term = f"%{termo}%"
            cur.execute("""
                SELECT m.*, c.nome as categoria_nome
                FROM medicamentos m
                LEFT JOIN categorias c ON c.id = m.categoria_id
                WHERE m.nome LIKE ? OR m.nome_busca LIKE ?
                LIMIT ?
            """, (like_term, like_term, limit))
            rows = cur.fetchall()
            
        result = [dict(r) for r in rows]
        con.close()
        return result

    def obter_medicamento(self, medicamento_id: str) -> Optional[Dict[str, Any]]:
        """Retorna todos os dados detalhados de um medicamento."""
        con = self._get_con()
        cur = con.cursor()
        
        cur.execute("""
            SELECT m.*, c.nome as categoria_nome
            FROM medicamentos m
            LEFT JOIN categorias c ON c.id = m.categoria_id
            WHERE m.id = ?
        """, (medicamento_id,))
        med = cur.fetchone()
        if not med:
            con.close()
            return None
            
        med_dict = dict(med)
        
        # Receita adulto
        cur.execute("SELECT * FROM receitas_adulto WHERE medicamento_id = ?", (medicamento_id,))
        ad = cur.fetchone()
        med_dict['receita_adulto'] = dict(ad) if ad else None
        
        # Receita pediatrica padrao
        cur.execute("SELECT * FROM receitas_pediatricas WHERE medicamento_id = ?", (medicamento_id,))
        ped = cur.fetchone()
        med_dict['receita_pediatrica'] = dict(ped) if ped else None
        
        # Vias
        cur.execute("SELECT * FROM vias_administracao WHERE medicamento_id = ?", (medicamento_id,))
        med_dict['vias_administracao'] = [dict(r) for r in cur.fetchall()]
        
        con.close()
        return med_dict

    def obter_receita(self, medicamento_id: str, peso: Union[str, int, float] = 'adulto') -> Optional[Dict[str, Any]]:
        """
        Retorna a receita exata para a modalidade solicitada:
        - peso='adulto' ou >= 40: receita adulta
        - peso='pediatrico' ou None: receita pediátrica padrão
        - peso=4..39: receita calculada exatamente para aquele peso em kg
        """
        con = self._get_con()
        cur = con.cursor()
        
        is_adult = False
        if isinstance(peso, str) and peso.lower() in ('adulto', 'adult'):
            is_adult = True
        elif isinstance(peso, (int, float)) and peso >= 40:
            is_adult = True
            
        if is_adult:
            cur.execute("""
                SELECT m.nome, m.via_administracao_padrao, r.*
                FROM receitas_adulto r
                JOIN medicamentos m ON m.id = r.medicamento_id
                WHERE r.medicamento_id = ?
            """, (medicamento_id,))
            res = cur.fetchone()
            con.close()
            return dict(res) if res else None
            
        # Pediátrico com peso numérico
        if isinstance(peso, (int, float)):
            w = round(peso)
            cur.execute("""
                SELECT m.nome, m.via_administracao_padrao, d.*
                FROM doses_pediatricas_peso d
                JOIN medicamentos m ON m.id = d.medicamento_id
                WHERE d.medicamento_id = ? AND d.peso_kg = ?
            """, (medicamento_id, w))
            res = cur.fetchone()
            if res:
                con.close()
                return dict(res)
                
        # Fallback para receita pediátrica padrão
        cur.execute("""
            SELECT m.nome, m.via_administracao_padrao, p.*
            FROM receitas_pediatricas p
            JOIN medicamentos m ON m.id = p.medicamento_id
            WHERE p.medicamento_id = ?
        """, (medicamento_id,))
        res = cur.fetchone()
        con.close()
        return dict(res) if res else None

    def formatar_prescricao(self, medicamento_id: str, peso: Union[str, int, float] = 'adulto', item_num: int = 1, incluir_via: bool = True) -> str:
        """
        Gera o texto de prescrição formatado exatamente no padrão médico conforme a foto do usuário:
        
        USO ORAL:
        
        1. Nitrofurantoína 5mg/mL (HANTINA®) . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 2 frascos
        Tomar 5mL, de 6/6 horas, por 7 dias.
        Sugestão de horários: 6h, 12h, 18h e 24h.
        """
        rec = self.obter_receita(medicamento_id, peso)
        if not rec:
            return f"Medicamento {medicamento_id} não encontrado para o peso informado."
            
        via = rec.get('via_administracao_padrao', 'USO ORAL')
        texto_receita = rec.get('texto_completo') or rec.get('texto_padrao', '')
        
        # Prefixo do item na primeira linha
        lines = texto_receita.strip().split('\n')
        if lines:
            lines[0] = f"{item_num}. {lines[0]}"
        formatted_body = "\n".join(lines)
        
        if incluir_via:
            return f"{via.upper()}:\n\n{formatted_body}"
        return formatted_body

    def catalogar_medicamento(self, dados: Dict[str, Any]) -> str:
        """
        Permite catalogar um novo medicamento ou atualizar dados existentes.
        Garante persistência tanto no banco SQLite quanto no JSON mestre.
        """
        import uuid
        med_id = dados.get('id') or str(uuid.uuid4())
        nome = dados['nome'].strip()
        categoria = dados.get('categoria', 'Geral').strip()
        via_adm = dados.get('via_administracao_padrao', 'USO ORAL')
        
        con = self._get_con()
        cur = con.cursor()
        
        # Categoria
        cur.execute("SELECT id FROM categorias WHERE nome = ?", (categoria,))
        cat_row = cur.fetchone()
        if cat_row:
            cat_id = cat_row['id']
        else:
            cur.execute("INSERT INTO categorias (nome, ordem) VALUES (?, 9999)", (categoria,))
            cat_id = cur.lastrowid
            
        tem_adulto = 1 if dados.get('receita_adulto') else 0
        tem_ped = 1 if dados.get('receita_pediatrica') else 0
        
        cur.execute("""
            INSERT OR REPLACE INTO medicamentos (
                id, nome, nome_busca, categoria_id, via_administracao_padrao,
                grupo_administracao, posicao_grupo, tem_adulto, tem_pediatrico
            ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)
        """, (
            med_id, nome, dados.get('nome_busca', nome.lower()), cat_id,
            via_adm, via_adm, tem_adulto, tem_ped
        ))
        
        # Adulto
        if dados.get('receita_adulto'):
            ra = dados['receita_adulto']
            cur.execute("""
                INSERT OR REPLACE INTO receitas_adulto (
                    medicamento_id, texto_completo, texto_selecionado,
                    apresentacao, quantidade, posologia, sugestao_horarios, marcas_referencia
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                med_id, ra.get('texto_completo', ''), ra.get('texto_selecionado', ''),
                ra.get('apresentacao', ''), ra.get('quantidade', ''),
                ra.get('posologia', ''), ra.get('sugestao_horarios', ''),
                json.dumps(ra.get('marcas_referencia', []), ensure_ascii=False)
            ))
            
        # Pediátrico
        if dados.get('receita_pediatrica'):
            rp = dados['receita_pediatrica']
            cur.execute("""
                INSERT OR REPLACE INTO receitas_pediatricas (
                    medicamento_id, texto_padrao, apresentacao_padrao,
                    quantidade_padrao, posologia_padrao, sugestao_horarios_padrao,
                    marcas_referencia, peso_min_kg, peso_max_kg
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                med_id, rp.get('texto_padrao', ''), rp.get('apresentacao_padrao', ''),
                rp.get('quantidade_padrao', ''), rp.get('posologia_padrao', ''),
                rp.get('sugestao_horarios_padrao', ''),
                json.dumps(rp.get('marcas_referencia', []), ensure_ascii=False),
                rp.get('peso_min_kg'), rp.get('peso_max_kg')
            ))
            
            for w_str, dose in rp.get('doses_por_peso', {}).items():
                w = int(w_str)
                cur.execute("""
                    INSERT OR REPLACE INTO doses_pediatricas_peso (
                        medicamento_id, peso_kg, texto_completo, texto_selecionado,
                        apresentacao, quantidade, posologia, sugestao_horarios, marcas_referencia
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    med_id, w, dose.get('texto_completo', ''), dose.get('texto_selecionado', ''),
                    dose.get('apresentacao', ''), dose.get('quantidade', ''),
                    dose.get('posologia', ''), dose.get('sugestao_horarios', ''),
                    json.dumps(dose.get('marcas_referencia', []), ensure_ascii=False)
                ))
                
        con.commit()
        con.close()
        
        # Sincronizar com banco_receitas.json se existir
        if os.path.exists(JSON_PATH):
            try:
                with open(JSON_PATH, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                # Atualizar ou adicionar medicamento
                meds = data.get('medicamentos', [])
                found_idx = next((i for i, m in enumerate(meds) if m['id'] == med_id), None)
                
                med_entry = {
                    'id': med_id,
                    'nome': nome,
                    'nome_busca': dados.get('nome_busca', nome.lower()),
                    'categoria': categoria,
                    'ordem_categoria': 9999,
                    'via_administracao_padrao': via_adm,
                    'grupo_administracao': via_adm,
                    'posicao_grupo': 0,
                    'tem_adulto': bool(tem_adulto),
                    'tem_pediatrico': bool(tem_ped),
                    'receita_adulto': dados.get('receita_adulto'),
                    'receita_pediatrica': dados.get('receita_pediatrica', {
                        'tem_pediatrico': False,
                        'texto_padrao': None,
                        'apresentacao_padrao': None,
                        'quantidade_padrao': None,
                        'posologia_padrao': None,
                        'sugestao_horarios_padrao': None,
                        'marcas_referencia': [],
                        'peso_min_kg': None,
                        'peso_max_kg': None,
                        'doses_por_peso': {}
                    }),
                    'vias_administracao': dados.get('vias_administracao', [])
                }
                
                if found_idx is not None:
                    meds[found_idx] = med_entry
                else:
                    meds.append(med_entry)
                    
                data['metadados']['total_medicamentos'] = len(meds)
                with open(JSON_PATH, 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
            except Exception as e:
                print(f"Aviso ao sincronizar JSON: {e}")
                
        return med_id

    def listar_categorias(self) -> List[Dict[str, Any]]:
        """Lista todas as categorias e a quantidade de medicamentos."""
        con = self._get_con()
        cur = con.cursor()
        cur.execute("""
            SELECT c.id, c.nome, c.ordem, COUNT(m.id) as total_medicamentos
            FROM categorias c
            LEFT JOIN medicamentos m ON m.categoria_id = c.id
            GROUP BY c.id
            ORDER BY c.ordem
        """)
        cats = [dict(r) for r in cur.fetchall()]
        con.close()
        return cats

if __name__ == '__main__':
    db = ReceitasDB()
    print("Testando busca por 'nitrofurantoína'...")
    res = db.buscar('nitrofurantoína')
    if res:
        med_id = res[0]['id']
        print(f"Encontrado: {res[0]['nome']} (ID: {med_id})")
        
        print("\\n--- RECEITA ADULTA FORMATADA ---")
        print(db.formatar_prescricao(med_id, peso='adulto', item_num=1))
        
        print("\\n--- RECEITA PEDIÁTRICA (20kg) FORMATADA (CONFORME FOTO) ---")
        print(db.formatar_prescricao(med_id, peso=20, item_num=1))
