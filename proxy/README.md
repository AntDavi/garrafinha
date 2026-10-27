# garrafinha-proxy

Cloudflare Worker (plano gratuito) entre o app e a API do Gemini. A chave da API fica **só aqui**, como secret do Worker; ela nunca vai para o app.

## Endpoints

| Rota             | Entrada                                                                                 | Saída                                      |
| ---------------- | --------------------------------------------------------------------------------------- | ------------------------------------------ |
| `POST /scan`     | `{ image: base64, mime: "image/jpeg" \| "image/png" \| "image/webp", installId: uuid }` | `{ itens: [{ nome, gramas, confianca }] }` |
| `POST /insights` | `{ installId: uuid, metrics: { ...apenas números agregados } }`                         | `{ insights: [3 strings] }`                |
| `GET /health`    | –                                                                                       | `{ ok: true }`                             |

Erros: `{ error: "<código>" }` com status 400 (entrada inválida), 403 (origem), 413 (imagem grande), 415 (tipo de imagem), 429 (limite), 500 (`not_configured`), 502/503 (Gemini).

### Proteções

- **Imagem:** até 1,5 MB decodificada. Os bytes iniciais precisam bater com o `mime` declarado.
- **Limites:**
  - Rajada por IP: 10 req/60 s (binding Rate Limiting).
  - Diário por instalação (`SCAN_DAILY_LIMIT_PER_INSTALL`, padrão 5) e por IP (`SCAN_DAILY_LIMIT_PER_IP`, padrão 30), em KV. A cota da instalação só é descontada quando o scan dá certo (erro do Gemini não gasta o scan do usuário). O limite por IP conta toda chamada que chega ao Gemini.
- **CORS:** requisições sem `Origin` (o app nativo) passam. Navegadores só passam se a origem estiver em `ALLOWED_ORIGINS`.
- **Gemini 429/503:** até 3 tentativas, com espera de 250 ms e depois 500 ms (ou o `Retry-After`, limitado a 2 s).
- **Privacidade:** ao Gemini vão só a imagem e um prompt fixo. O `installId` (UUID aleatório) serve apenas para o limite e não é repassado. Nenhum dado de perfil é aceito.
- **/insights:**
  - O schema é estrito (campos extras dão 400).
  - Se a resposta tiver termos de diagnóstico ou prescrição, ela é descartada com 502, e o app usa as regras locais.

## Deploy passo a passo

Pré-requisitos: conta gratuita na Cloudflare e uma chave do Google AI Studio (https://aistudio.google.com/apikey).

```bash
cd proxy
npm install

# 1. Login na Cloudflare (abre o navegador)
npx wrangler login

# 2. Criar o namespace KV dos contadores e colar o id em wrangler.jsonc ("COLE_AQUI_O_ID_DO_NAMESPACE")
npx wrangler kv namespace create RATE_KV

# 3. Configurar a chave do Gemini como secret (será pedida no terminal)
npx wrangler secret put GEMINI_API_KEY

# 4. Publicar
npm run deploy
# → https://garrafinha-proxy.<seu-subdominio>.workers.dev
```

Depois coloque a URL no `.env` do app (`EXPO_PUBLIC_PROXY_URL=https://garrafinha-proxy.<seu-subdominio>.workers.dev`).

### Configuração (`wrangler.jsonc` → `vars`)

| Variável                           | Padrão                  | Uso                                                                                                                                                                                   |
| ---------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GEMINI_MODEL`                     | `gemini-3.5-flash-lite` | Modelo Flash/Flash-Lite do free tier. Confira os modelos disponíveis e os limites em https://ai.google.dev/gemini-api/docs/models e https://ai.google.dev/gemini-api/docs/rate-limits |
| `ALLOWED_ORIGINS`                  | vazio                   | Origens web permitidas, separadas por vírgula                                                                                                                                         |
| `SCAN_DAILY_LIMIT_PER_INSTALL`     | 5                       | Scans por instalação por dia (UTC)                                                                                                                                                    |
| `SCAN_DAILY_LIMIT_PER_IP`          | 30                      | Scans por IP por dia (UTC)                                                                                                                                                            |
| `INSIGHTS_DAILY_LIMIT_PER_INSTALL` | 10                      | Pedidos de insights por instalação por dia                                                                                                                                            |

### Desenvolvimento local

```bash
cp .dev.vars.example .dev.vars   # coloque sua chave
npm run dev                      # http://localhost:8787
npm run typecheck && npm test
```

## Limites do plano gratuito (atenção)

- **Workers:** 100 mil requisições/dia.
- **KV:** 1.000 escritas/dia. Cada scan bem-sucedido grava 2 contadores, o que limita a uns 500 scans/dia no total. Acima disso, troque por Durable Objects ou D1.
- **Gemini free tier:** limites por minuto e por dia, que variam por modelo e podem mudar. No free tier, o Google pode usar o conteúdo enviado para melhorar seus produtos. Isso deve constar na política de privacidade do app (ver `docs/DECISOES.md`).
