# Licenças e uso de dados de terceiros

Verificado em 27/10/2026.

## free-exercise-db (exercícios)

- **Fonte:** https://github.com/yuhonas/free-exercise-db (`dist/exercises.json`)
- **Licença:** The Unlicense (domínio público). Confirmado pela API do GitHub (`license.spdx_id = "Unlicense"`).
- **Uso:** permite copiar, modificar, distribuir e usar comercialmente, sem exigência de atribuição. Mesmo assim, citamos a fonte na tela "Sobre" (a ser criada) e em `assets/data/exercises.pt.json` (`source`).
- **Imagens:** ficam no mesmo repositório e sob a mesma licença. Não estão embarcadas nesta etapa; o JSON guarda só os caminhos relativos e o `imageBaseUrl`.
- **Traduções:** as traduções para pt-BR (em `scripts/exercises-glossary.pt.json`) são nossas e foram feitas a partir do texto original.

## TACO: Tabela Brasileira de Composição de Alimentos (alimentos)

- **Obra:** TACO, 4ª edição revisada e ampliada. NEPA/UNICAMP, Campinas, 2011.
- **Arquivo usado:** planilha oficial `Taco-4a-Edicao.xlsx`, aba `CMVCol taco3` (composição centesimal), baixada de https://nepa.unicamp.br/wp-content/uploads/sites/27/2023/10/Taco-4a-Edicao.xlsx (link publicado em https://nepa.unicamp.br/).
- **Termos de uso:** na ficha técnica do PDF oficial da 4ª edição (páginas iniciais) consta:
  > "É permitida a reprodução total ou parcial do material, desde que seja citada a fonte."
  > "É permitida a reprodução parcial ou total desta obra, desde que citada a fonte."
- **Obrigação:** citar a fonte. Faça isso no app (tela "Sobre" e rodapé do relatório PDF), na ficha da loja e neste repositório. Texto sugerido:
  > Dados nutricionais: Tabela Brasileira de Composição de Alimentos (TACO), 4ª ed. rev. e ampl. NEPA/UNICAMP, 2011.
- **Ponto de atenção:** o texto não fala explicitamente em uso comercial nem em redistribuição em software. A leitura comum é que a reprodução com citação é permitida, mas se o app tiver monetização, vale confirmar com o NEPA por e-mail e guardar a resposta.

### Tratamento dos valores (sem inventar dados)

| Valor na TACO            | Significado (legenda oficial)                    | Tratamento em `foods.json` |
| ------------------------ | ------------------------------------------------ | -------------------------- |
| número                   | valor analisado                                  | mantido (2 casas decimais) |
| `Tr`                     | traço: abaixo do limite de quantificação         | 0                          |
| `NA`                     | não aplicável (ex.: proteína em óleo)            | 0                          |
| negativo entre -0,05 e 0 | resíduo do carboidrato calculado "por diferença" | 0                          |
| `*`                      | análise em reavaliação                           | alimento **excluído**      |
| vazio                    | análise não solicitada                           | alimento **excluído**      |

Os excluídos ficam listados em `foods.json` (`excluded`). Na versão atual são 5, entre eles **Leite de vaca integral** e **Leite desnatado UHT**, ambos marcados com `*` pela própria TACO.

### Porções caseiras

A TACO não traz medidas caseiras. O campo `portions` existe, mas fica vazio até haver uma fonte oficial (por exemplo, a tabela de medidas referidas da POF/IBGE). Essa fonte terá a licença verificada e registrada aqui antes de ser usada.

## Open Food Facts (código de barras)

- **Fonte:** https://world.openfoodfacts.org (API v2), consultada em tempo real; nada é embarcado.
- **Licença dos dados:** Open Database License (ODbL). Exige atribuição ("dados de Open Food Facts") e compartilhamento pela mesma licença caso uma base derivada seja redistribuída. Guardar no aparelho os itens que o usuário registrou não é redistribuição.
- **Boas práticas da API:** enviar um `User-Agent` que identifique o app e um contato.

## Google Gemini (identificação por foto)

- Usado apenas via proxy próprio (Cloudflare Worker). Os termos da Gemini API no free tier permitem que o Google use os dados enviados para melhorar produtos. Isso precisa constar na política de privacidade (ver `docs/DECISOES.md`).
