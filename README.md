# Signal Seeker

Prompt finalizado e testado — App de captação de leads (restaurantes sem presença digital)

100% gratuito, sem cartão de crédito, sem chave paga — APIs verificadas na prática

Copie o texto do bloco "PROMPT" abaixo e cole em qualquer IA de código (Claude Code, Cursor, v0, Bolt). Esse prompt corresponde ao app Sinal Zero que já te entreguei rodando, e que acabei de revisar e corrigir depois de checar cada API uma por uma.

O que eu encontrei e corrigi antes de fechar esse prompt: a API que eu tinha usado inicialmente para a lista de países (REST Countries v3.1) foi descontinuada recentemente — quem ainda chama ela recebe erro. Troquei pela alternativa gratuita e sem chave countries.dev, e também adicionei repetição automática (retry) e espelhos alternativos nas chamadas mais sensíveis, pra o app não travar se uma API gratuita ficar instável por alguns segundos (é comum acontecer com serviços gratuitos, então isso deixa a ferramenta bem mais confiável no uso real de campo).

PROMPT

Construa uma aplicação web de página única (HTML + CSS + JavaScript puro, sem backend, sem banco de dados externo) para encontrar restaurantes físicos sem presença digital, com o objetivo de gerar leads de prospecção comercial. Rode 100% no navegador usando apenas estas APIs públicas, gratuitas, sem chave e sem cartão de crédito:

countries.dev — GET https://countries.dev/countries?fields=name&sort=name → lista de todos os países do mundo, sem chave, CORS liberado. (Não usar restcountries.com — a versão gratuita dele foi descontinuada.)

CountriesNow — POST https://countriesnow.space/api/v0.1/countries/states, /countries/state/cities e /countries/cities → estados e cidades em cascata a partir do país escolhido. Tratar países sem divisão em estados na base, indo direto para a lista de cidades do país.

Nominatim (OpenStreetMap) — GET https://nominatim.openstreetmap.org/search?format=json&q=... → geocodifica "cidade, estado, país" em latitude/longitude.

Overpass API (OpenStreetMap) — POST https://overpass-api.de/api/interpreter → busca estabelecimentos reais dentro de um raio (around:RAIO,LAT,LON), filtrando por amenity (restaurant, fast_food, cafe, bar, pub). Implementar também 2 espelhos alternativos (overpass.kumi.systems e overpass.openstreetmap.fr) para tentar automaticamente se o principal estiver sobrecarregado.

Robustez (obrigatório)

Toda chamada de rede deve ter lógica de nova tentativa automática (retry com pequeno atraso crescente, 2-3 tentativas) antes de mostrar erro ao usuário.

Se a lista de países falhar mesmo após retry, cair para uma lista fixa de 8-10 países comuns como fallback, para o app nunca ficar sem nenhuma opção selecionável.

Mensagens de erro devem ser específicas e acionáveis (ex: "cidade não encontrada, tente sem o bairro" em vez de "erro genérico").

Filtrar da lista de resultados estabelecimentos sem campo name preenchido no OpenStreetMap.

Fluxo da interface

Três selects em cascata (País → Estado → Cidade).

Chips de categoria com múltipla escolha (Restaurante, Lanchonete, Café, Bar, Pub).

Slider de raio de busca (500m a 8km).

Botão "Escanear área": geocodifica a cidade → busca no Overpass (com fallback de espelhos) → processa e classifica os resultados.

Animação de scanner/radar como feedback visual enquanto a busca roda.

Lógica de qualificação do lead

Para cada estabelecimento, verificar as tags: website/contact:website, contact:instagram, contact:facebook, contact:email. Contar quantos sinais digitais existem:

0 sinais → "Sinal Zero": lead ideal.

1 sinal → "Sinal Fraco": ainda vale abordagem.

2+ sinais → "Sinal Pleno": já digitalizado, baixa prioridade.

Como o OpenStreetMap é mantido por voluntários e pode estar incompleto, cada card deve ter um botão "Verificar agora" que abre em nova aba uma busca do nome do estabelecimento no Google, para confirmação manual em segundos antes da abordagem.

Cards de resultado

Nome, endereço (montado a partir de addr:*), categoria.

Indicador visual tipo "barras de sinal" (0 a 3) — 0 barras = lead mais quente.

Badges ✓/✕ para Site, Instagram e Telefone.

Selo colorido do nível do lead, com leve destaque/glow no nível "Sinal Zero" para chamar atenção do usuário no meio da lista.

Botões "Salvar lead" e "Verificar agora".

Funcionalidades extras

Dashboard com contadores de Sinal Zero / Fraco / Pleno encontrados na varredura.

Lista de leads salvos, persistente entre sessões.

Exportar leads salvos em CSV.

Totalmente responsivo, pensado para uso no celular durante prospecção de rua.

Direção visual

Tema "radar/scanner de sinal", coerente com o objetivo do produto (caçar quem "não emite sinal digital"): fundo escuro tipo blueprint com grade sutil, acento laranja-sinal vibrante para leads quentes, ciano para leads já digitalizados, tipografia com uma fonte display (ex: Space Grotesk) e uma mono (ex: IBM Plex Mono) para dados técnicos/coordenadas. Animação de radar durante a busca, leve elevação e destaque de borda ao passar o mouse nos cards, glow pulsante sutil no selo do lead mais quente. Evitar visual genérico de dashboard SaaS — as cores e a tipografia devem reforçar a ideia de "escaneando o território em busca de sinal".

Já está pronto — arquivo sinal-zero.html

Esse prompt corresponde exatamente ao app que já te entreguei, agora corrigido e reforçado. Use esse prompt caso queira pedir modificações a alguma IA depois (ex: "adicione busca por padaria e sorveteria também"), ou simplesmente guarde como documentação do projeto.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://signal-zero-hunter.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ea811e14-2518-4044-aaea-075d46a2d17a).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
