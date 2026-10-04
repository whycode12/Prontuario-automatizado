# Diretrizes de Projeto: Design e Geração de Código

## 1. Minimalismo e Estilo Notion-Like
- **Estética visual:** Interface limpa, sóbria, monocromática ou com paleta neutra suave (tons de cinza sutis, bordas finas de 1px, sem sombras pesadas ou gradientes chamativos).
- **Tipografia e espaçamento:** Tipografia legível e sem serifa (sans-serif), espaçamento generoso, padding equilibrado e hierarquia visual discreta.
- **Micro-interações:** Estados de hover sutis (ex: background levemente escurecido/clareado) sem animações exageradas.

## 2. Higiene de Inputs e UI
- **Zero placeholders:** Nunca inclua textos de instrução ou placeholders em inputs, textareas ou caixas de texto vazias (omita o atributo `placeholder` ou use `placeholder=""`).
- **Zero tooltips/textos de ajuda:** Não adicione textos descritivos abaixo de campos (ex: "insira seu e-mail", "máximo 50 caracteres", "Clique para...") a menos que explicitamente solicitado.
- **Inputs silenciosos:** Os campos devem parecer páginas ou blocos em branco, seguindo a lógica do Notion (clicar e digitar diretamente).

## 3. Padrão de Código
- **Sem comentários instrucionais:** Não insira comentários didáticos, `// TODO`, ou explicações de uso no código.
- **Código direto e enxuto:** Entregue apenas o código funcional, sem boilerplate desnecessário ou componentes de suporte fictícios.
- **Proteção de Defaults:** NUNCA modifique ou sobrescreva `src/data/defaults.ts` sob nenhuma hipótese a menos que expressamente solicitado pelo usuário.
