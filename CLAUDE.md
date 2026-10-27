# Garrafinha

App de treino e alimentação em português do Brasil (Expo SDK 58 + React Native + TypeScript estrito). Objetivo: lançar rápido e com custo perto de zero. Sem login, sem backend de dados: tudo fica no aparelho.

> Guia específico do Expo (APIs mudam a cada SDK, docs versionadas): veja `AGENTS.md`.

## Arquitetura (decisões fixas)

- **Local-first:** os dados do usuário ficam em SQLite (`expo-sqlite`), com migrações versionadas em `src/db/migrations`. Preferências leves (ID anônimo da instalação, contador de scans) ficam no AsyncStorage. Sem login.
- **A IA só identifica, a TACO calcula:** o proxy (Gemini) devolve `{nome, gramas, confianca}`. Kcal e macros vêm **sempre** da TACO embarcada (`assets/data/foods.json` → tabela `foods`) ou do rótulo (Open Food Facts).
- **Proxy próprio** (`/proxy`, Cloudflare Worker): a chave do Gemini nunca vai para o app. Ao Gemini vão só a imagem (scan) ou números agregados (insights). Nenhum dado de perfil.
- **Relatório:** agregações apenas de registros reais (`src/domain/report/aggregate.ts`). Os insights saem das regras locais, e a IA é opcional, com fallback automático.
- **Estado:** Zustand só para UI/sessão (`src/store`). Dados persistentes vêm sempre dos repositórios.

## Estrutura

```
app/                 rotas expo-router (somente esqueleto; telas ainda não existem)
src/theme            tokens do design system (cores, espaço, raio, tipografia, sombras, tab bar)
src/components       <Icon> (registro de paths provisório) e <Text> tipado
src/domain           funções puras + testes (metas, água, macros, datas, relatório, insights, HTML)
src/db               interface SqlDb, adaptadores (expo / node:sqlite), migrações, repositórios, seed
src/data/schemas.ts  formatos Zod de exercises.pt.json e foods.json
src/services         foodSearch, parser de texto, openFoodFacts, scanApi, backup, report, permissions
scripts/             geração de dados (exercícios e TACO) + glossário pt-BR
proxy/               Cloudflare Worker (/scan, /insights)
docs/                DECISOES.md, LICENCAS.md
```

## Convenções

- **Código em inglês** (nomes, tipos, tabelas). **Textos para o usuário em português** (labels em `src/domain/types.ts`, `userMessage` dos erros, prompts).
- **Domínio puro:** `src/domain` não importa React, Expo nem banco. Toda regra de negócio fica lá, com testes.
- **Acesso a dados só via repositórios** (`createRepositories(db)`). Nada de SQL fora de `src/db` (exceção: `services/backup`, que copia tabelas inteiras).
- Módulos que importam `expo-*` ficam isolados (`db/client.ts`, `db/expoAdapter.ts`, `services/container.ts`, `services/imagePrep.ts`, `services/report/pdf.ts`, `services/backup/fileIO.ts`, `services/permissions.ts`, `services/appStorage.ts`). A lógica testável recebe dependências por parâmetro.
- **Datas:** `YYYY-MM-DD` em horário local (`toISODate`). **IDs:** UUID em texto (estáveis para backup).
- **Migrações:** nunca edite uma migração já publicada; crie `00N_*.ts` e adicione-a em `migrations/index.ts`. Atualize `services/backup/schema.ts` junto.
- **Erros de serviço:** `ServiceError` com `code` tipado e `userMessage` em pt-BR.

## Regra inegociável: não inventar dados nutricionais

- Nenhum valor de kcal/macro pode ser estimado pela IA ou fixado no código. As fontes são a TACO, o rótulo (OFF) ou o que o usuário digitou.
- Sem porção caseira cadastrada, o item fica `needs_quantity` (o usuário confirma as gramas). Não chute gramas.
- Alimento sem análise na TACO (`*` ou vazio) é excluído, não preenchido.
- Exercícios sem tradução ficam `translationStatus: "pending"`. Não traduza "no chute" no código; use o glossário.
- Insights são descritivos: sem diagnóstico, sem prescrever dieta ou treino.

## Comandos

```bash
npm start                  # Expo dev server
npm run check              # typecheck + lint + test (rode ao fim de cada etapa)
npm run typecheck | lint | test
npm run data:exercises     # regenera assets/data/exercises.pt.json
npm run data:foods         # regenera assets/data/foods.json (baixa a TACO do NEPA se faltar)
npm run proxy:check        # typecheck + testes do Worker
npx expo install <pkg>     # sempre use para dependências nativas (versões do SDK)
```

Pacotes: **npm** (não pnpm/yarn). Para instalar bibliotecas novas, justifique em `docs/DECISOES.md`.
