# Plano: Implementar o Sinal Zero no projeto Lovable

## Objetivo
Transformar a especificação do app Sinal Zero em uma aplicação real dentro do projeto TanStack Start, substituindo a página placeholder atual por uma ferramenta de prospecção de leads para restaurantes sem presença digital.

## Escopo
- App 100% client-side: sem backend próprio, sem banco de dados externo.
- APIs públicas gratuitas: countries.dev, CountriesNow, Nominatim e Overpass API (com espelhos).
- Persistência apenas no localStorage do navegador (leads salvos).
- Responsivo, pensado para uso em celular durante prospecção de rua.

## Etapas

### 1. Design system no `src/styles.css`
- Aplicar tema "radar/scanner de sinal" com fundo escuro tipo blueprint e grade sutil.
- Definir tokens semânticos: laranja-sinal vibrante para leads quentes, ciano para digitalizados, cinzas para superfícies.
- Importar fontes Space Grotesk (display) e IBM Plex Mono (dados técnicos/coordenadas) via `<link>` no `__root.tsx`.
- Adicionar utilitários CSS para glow pulsante, animação de radar e bordas de cards.

### 2. Estrutura de rotas
- Reescrever `src/routes/index.tsx` para conter o app completo.
- Adicionar `head()` na home com título, descrição, OG e Twitter específicos do Sinal Zero.
- Manter `__root.tsx` como layout raiz, ajustando metadados globais e carregando fontes.

### 3. Clientes de API com retry e fallback
- Criar módulo `src/lib/apis.ts` com funções para:
  - countries.dev (GET) com retry e fallback para lista fixa de países comuns.
  - CountriesNow (POST) para estados e cidades, tratando países sem estados.
  - Nominatim (GET) para geocodificação, com retry e mensagens de erro específicas.
  - Overpass API (POST) com fallback entre 3 espelhos e retry.
- Todas as chamadas com 2-3 tentativas e atraso crescente.

### 4. Estado e tipos
- Criar `src/lib/types.ts` com tipos para país, estado, cidade, estabelecimento, lead e nível de sinal.
- Criar `src/lib/store.ts` para gerenciar leads salvos no localStorage (salvar, listar, remover, exportar CSV).

### 5. Interface principal
- Painel de controle com:
  - Selects em cascata: País → Estado → Cidade.
  - Chips de categoria (múltipla escolha): Restaurante, Lanchonete, Café, Bar, Pub.
  - Slider de raio (500m a 8km).
  - Botão "Escanear área" com animação de scanner/radar durante a busca.
- Dashboard com contadores: Sinal Zero, Sinal Fraco, Sinal Pleno.
- Lista de cards de resultado com:
  - Nome, endereço montado a partir de `addr:*`, categoria.
  - Barras de sinal (0 a 3).
  - Badges ✓/✕ para Site, Instagram e Telefone.
  - Selo colorido do nível do lead, com glow pulsante no Sinal Zero.
  - Botões "Salvar lead" e "Verificar agora" (abre busca Google em nova aba).
- Painel lateral ou seção de "Leads salvos" com exportação CSV.

### 6. Lógica de qualificação
- Verificar tags: `website/contact:website`, `contact:instagram`, `contact:facebook`, `contact:email`.
- Classificar:
  - 0 sinais → Sinal Zero.
  - 1 sinal → Sinal Fraco.
  - 2+ sinais → Sinal Pleno.
- Filtrar resultados sem campo `name`.

### 7. Componentes reutilizáveis
- `RadarAnimation`, `SignalBadge`, `LeadCard`, `CategoryChips`, `RadiusSlider`, `SavedLeadsDrawer`, `ExportCsvButton`.
- Usar componentes shadcn/ui já disponíveis (Select, Slider, Button, Badge, Card, Sheet, ScrollArea) sempre que possível.

### 8. Responsividade e polimento
- Layout adaptativo: controles empilhados no mobile, cards em coluna única, drawer de leads salvos no mobile.
- Estados de loading, erro e vazio com mensagens acionáveis.
- Testar visual no preview em viewport mobile.

### 9. SEO e metadados
- `head()` da rota `/` com título, descrição, OG e Twitter cards.
- Não adicionar `og:image` sem uma imagem real; deixar o hosting injetar preview quando disponível.

## Entregáveis
- `src/routes/index.tsx` substituído pelo app Sinal Zero.
- `src/routes/__root.tsx` ajustado com fontes e metadados.
- `src/styles.css` com design system radar.
- `src/lib/apis.ts`, `src/lib/types.ts`, `src/lib/store.ts` e componentes em `src/components/sinal-zero/`.
- App funcional no preview, pronto para publicação.
