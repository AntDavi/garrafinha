# Garrafinha

App de treino e alimentação (pt-BR), local-first, em Expo SDK 58 + React Native + TypeScript.
Este repositório tem **a base** do app: tema, banco, domínio, serviços, dados embarcados, esqueleto de rotas e o proxy de IA. **As telas ainda não existem.**

## Requisitos

- Node.js ≥ 22.13 (testado com 24.x; os testes de banco usam `node:sqlite`)
- npm (gerenciador oficial do projeto; ver `docs/DECISOES.md`)
- Para Android: Expo Go ou um development build; para gerar APK/AAB, uma conta Expo (EAS) ou Android Studio

## Setup

```bash
npm install
cp .env.example .env      # preencha EXPO_PUBLIC_PROXY_URL depois do deploy do proxy
npm start                 # abre o Expo (a = Android)
```

Sem `EXPO_PUBLIC_PROXY_URL`, o app funciona normalmente. Só o scan por foto fica indisponível (erro `not_configured`), e os insights usam só as regras locais.

## Scripts

| Comando                  | O que faz                                                        |
| ------------------------ | ---------------------------------------------------------------- |
| `npm run check`          | typecheck + lint + testes                                        |
| `npm run typecheck`      | `tsc --noEmit`                                                   |
| `npm run lint`           | ESLint (config Expo + Prettier), zero warnings                   |
| `npm test`               | Vitest (domínio, banco com SQLite em memória, serviços, scripts) |
| `npm run format`         | Prettier                                                         |
| `npm run data:exercises` | Gera `assets/data/exercises.pt.json`                             |
| `npm run data:foods`     | Gera `assets/data/foods.json`                                    |
| `npm run proxy:check`    | typecheck + testes do Worker                                     |

## Dados embarcados (seed)

Os JSONs gerados **já estão versionados** em `assets/data/`. Só regenere quando mudar a fonte ou o glossário.

### Exercícios: free-exercise-db (Unlicense)

```bash
npm run data:exercises                      # baixa dist/exercises.json do GitHub
npm run data:exercises -- --input arq.json  # ou usa um arquivo local
```

- Grupos musculares, equipamentos, categoria e nível são traduzidos pelo glossário `scripts/exercises-glossary.pt.json`. O script **falha** se surgir um termo sem tradução.
- Nome e instruções em pt-BR existem para os 15 exercícios do protótipo. Os outros ficam `translationStatus: "pending"`, com o texto original em inglês, prontos para tradução em lote: basta adicionar entradas em `exercises` no glossário (chave = `id` do dataset) e rodar o script de novo.

### Alimentos: TACO 4ª edição (NEPA/UNICAMP)

```bash
npm run data:foods                          # usa scripts/sources/taco.xlsx; se não existir, baixa do NEPA
npm run data:foods -- --input caminho.xlsx  # ou outro arquivo
```

Se o download automático falhar:

1. Baixe a planilha oficial **`Taco-4a-Edicao.xlsx`** em https://nepa.unicamp.br/ (link "TACO 4ª edição"; endereço direto atual: https://nepa.unicamp.br/wp-content/uploads/sites/27/2023/10/Taco-4a-Edicao.xlsx).
2. Salve como **`scripts/sources/taco.xlsx`**. A pasta é ignorada pelo git.
3. Rode `npm run data:foods`.

Formato esperado: a aba **`CMVCol taco3`**, com cabeçalho em 3 linhas contendo "Número do Alimento", "Descrição dos alimentos", "Energia (kcal)", "Proteína (g)", "Lipídeos (g)" e "Carboidrato (g)", e linhas de categoria intercaladas. Como `Tr`, `NA` e `*` são tratados: `docs/LICENCAS.md`.

### Carga no aparelho

No primeiro uso, e sempre que a versão (hash do conteúdo) de um JSON muda, `app/_layout.tsx` chama o `bootstrap()`. Ele roda `runSeed`, que valida o arquivo com Zod e substitui as tabelas `exercises` e `foods`. As versões ficam em `app_meta` (`seed_exercises_version`, `seed_foods_version`). Os dados do usuário não são afetados.

## Proxy de IA (Cloudflare Workers)

Passo a passo completo em [`proxy/README.md`](proxy/README.md). Resumo:

```bash
cd proxy && npm install
npx wrangler login
npx wrangler kv namespace create RATE_KV     # cole o id em wrangler.jsonc
npx wrangler secret put GEMINI_API_KEY        # chave do Google AI Studio
npm run deploy
```

Depois, coloque a URL do Worker em `EXPO_PUBLIC_PROXY_URL` no `.env`.

## Build Android

O jeito mais simples é o EAS Build, na nuvem, sem Android Studio:

```bash
npx eas-cli@latest login
npx eas-cli@latest build:configure            # cria eas.json (uma vez)
npx eas-cli@latest build -p android --profile preview      # APK para testar
npx eas-cli@latest build -p android --profile production   # AAB para a Play Store
```

- Defina `EXPO_PUBLIC_PROXY_URL` e `EXPO_PUBLIC_CONTACT` no ambiente do build: `eas env:create` ou `env` no `eas.json`.
- Build local (com Android SDK instalado): `npx expo run:android`.
- O pacote Android está definido como `app.garrafinha` em `app.json`. Troque antes de publicar, se necessário.

## Documentação

- `CLAUDE.md`: visão, arquitetura, convenções e regras do projeto
- `docs/DECISOES.md`: trade-offs técnicos, limites do free tier e privacidade/LGPD
- `docs/LICENCAS.md`: licenças da TACO, do free-exercise-db e do Open Food Facts
