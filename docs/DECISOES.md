# Decisões e trade-offs

## Gerenciador de pacotes: npm

O pnpm usa `node_modules` isolado por symlinks. O Metro e o autolinking do Expo funcionam com ele, mas pedem `node-linker=hoisted` e costumam causar erros de módulos duplicados ou não encontrados em libs nativas. O npm é o padrão dos templates do Expo, o que o `npx expo install` assume e o que o EAS Build testa primeiro. Também era o único instalado na máquina de desenvolvimento.

## Banco: expo-sqlite + SQL puro (sem Drizzle)

| Opção                       | Prós                                                                    | Contras                                                                                           |
| --------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| **expo-sqlite (escolhido)** | Módulo oficial, roda no Expo Go, transações, WAL, sem dependência extra | SQL escrito à mão                                                                                 |
| Drizzle ORM                 | Tipos inferidos do schema                                               | Babel plugin e drizzle-kit para migrações `.sql`, testes acoplados ao driver, mais peso no bundle |
| WatermelonDB                | Ótimo para listas enormes e sync                                        | Sync não é necessário; exige dev build e muita configuração                                       |
| AsyncStorage/MMKV para tudo | Simples                                                                 | Sem consultas por período, sem transações nem integridade                                         |

Os repositórios dependem de uma interface mínima (`SqlDb`: `exec/run/all/first/transaction`). No app, o adaptador é `expoAdapter.ts`. Nos testes, é o **`node:sqlite`**, nativo do Node 22.13+, sem dependência extra. Assim, os testes de migração e repositórios rodam o **mesmo SQL** que o app, em um banco em memória.

**Integridade:**

- CHECKs no schema (enumerações, valores ≥ 0) e FKs com `ON DELETE CASCADE` (itens, exercícios do treino, dias).
- `workout_sessions.workout_id` usa `ON DELETE SET NULL`, com o título guardado como snapshot, para preservar o histórico.
- `workout_exercises.exercise_id` não tem FK, porque a tabela `exercises` é recarregada pelo seed.

**IDs:** UUID v4 em texto (`expo-crypto`), estáveis entre aparelhos, o que facilita o "mesclar" do backup.

## Preferências leves: AsyncStorage (não MMKV)

O MMKV exige development build e a nova arquitetura. O AsyncStorage roda no Expo Go e basta para três chaves: ID anônimo da instalação, contador e limite de scans. O perfil fica no SQLite, porque o guard de rotas e o backup dependem dele.

> Alternativa a considerar: `expo-sqlite/kv-store` tem a mesma API do AsyncStorage e eliminaria uma dependência. Seria uma troca de uma linha em `src/services/appStorage.ts`.

## Dependências além das listadas no pedido

| Pacote                   | Por quê                                                                                                                                                                                         |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `expo-crypto`            | UUID v4 seguro para IDs estáveis                                                                                                                                                                |
| `expo-image-manipulator` | Redimensiona para 1024 px e comprime (JPEG 0,6) antes do scan; reduz custo, latência e cota                                                                                                     |
| `react-dom`              | Peer de `expo-router` (instalado pelo `expo install` para alinhar com o React 19.3)                                                                                                             |
| `xlsx` (SheetJS, dev)    | Ler a planilha oficial da TACO. Instalado pelo tarball oficial do CDN da SheetJS, porque a versão do registro npm (0.18.5) está parada e tem CVEs. Só é usado nos scripts e não entra no bundle |
| `tsx` (dev)              | Rodar os scripts TypeScript de dados                                                                                                                                                            |
| `@types/node` (dev)      | Tipos para scripts e testes                                                                                                                                                                     |

## Busca de alimentos

O Fuse.js roda sobre os nomes normalizados (sem acento, singular, sem stopwords). Por cima dele há um reordenamento simples:

- o primeiro termo coincide com o nome;
- todos os termos estão presentes;
- formas preparadas (cozido, grelhado) têm leve preferência;
- um mapa de **alimentos padrão** para termos genéricos (ex.: "arroz" → arroz tipo 1 cozido).

Os sinônimos regionais (aipim, mexerica, etc.) ficam em `normalize.ts`. Todos os IDs padrão são conferidos em teste contra a TACO real.

**Limitação conhecida:** a TACO não tem "leite integral" válido. Ele está marcado `*` (em reavaliação) e foi excluído, então "leite" cai em outras opções (condensado, de cabra). O app precisa deixar o usuário escolher entre as alternativas ou cadastrar o valor do rótulo.

## Limites do free tier

- **Gemini API (free tier):** limites por minuto (RPM) e por dia (RPD) que variam por modelo e mudam com frequência. Consulte https://ai.google.dev/gemini-api/docs/rate-limits. O proxy:
  - limita por instalação (5/dia, configurável) e por IP;
  - faz retry curto em 429/503;
  - responde 503 (`upstream_busy`) quando a cota acaba, e o app mostra "tente mais tarde".
  - O modelo é configurável (`GEMINI_MODEL`); o padrão é `gemini-3.5-flash-lite`.
- **Cloudflare Workers:** 100 mil requisições/dia.
- **Cloudflare KV:** 1.000 escritas/dia, o que dá uns 500 scans/dia no total. Se o app crescer, migrar os contadores para Durable Objects ou D1.
- **Open Food Facts:** gratuito e sem chave; pede `User-Agent` identificado e uso razoável.

## Privacidade e LGPD

- **Dado de saúde é dado pessoal sensível** (LGPD, art. 5º, II, e art. 11). Peso, altura, alimentação e treinos entram nisso. Mitigações adotadas:
  - Os dados ficam **apenas no aparelho**. Não há servidor nem conta, e o backup é um arquivo que o próprio usuário guarda.
  - O relatório PDF e o backup só saem do aparelho por ação explícita do usuário (compartilhar).
- **Foto do prato vai ao Google:** no scan, a imagem passa pelo nosso Worker (que não a armazena) e é enviada à API do Gemini. No **free tier**, os termos do Gemini permitem que o Google use o conteúdo enviado para melhorar seus produtos, e pode haver revisão humana. Por isso:
  - a **política de privacidade deve dizer isso explicitamente** (o que é enviado, para quem, para quê e por quanto tempo);
  - antes do primeiro scan, o app deve pedir **consentimento específico e destacado** (art. 11, I), com a opção de registrar por texto ou código de barras sem enviar foto;
  - oriente o usuário a fotografar só o prato (sem rostos ou documentos);
  - se o app tiver receita, considere o plano pago do Gemini, cujos dados não são usados para treinamento.
- **Insights por IA:** vão apenas números agregados, sem sexo, idade, altura ou nomes de alimentos. O endpoint rejeita campos extras.
- **Identificador:** `installId` é um UUID aleatório gerado no aparelho, usado só para o rate limit. Não é ligado a nenhum dado pessoal.
- **Exclusão:** como tudo é local, apagar o app (ou uma futura opção "apagar meus dados") remove tudo. O Worker guarda só contadores diários, que expiram em 48 h.
- **Pendências para o lançamento:**
  - política de privacidade publicada (URL na ficha da Play Store);
  - seção "Segurança dos dados" da Play Console coerente com o que está acima;
  - tela de consentimento do scan;
  - créditos da TACO, do Open Food Facts e do free-exercise-db.
