# Funções ADVPL Essenciais — Referência Rápida

## Strings

| Função         | Uso                                              | Exemplo                            |
|----------------|--------------------------------------------------|------------------------------------|
| `AllTrim()`    | Remove espaços no início e fim                   | `AllTrim(SA1->A1_NOME)`            |
| `SubStr()`     | Extrai substring                                 | `SubStr(cStr, 1, 5)`               |
| `At()`         | Posição de substring                             | `At(".", cEmail)`                  |
| `Len()`        | Comprimento da string                            | `Len(cStr)`                        |
| `Upper()`      | Converte para maiúsculas                         | `Upper(cCod)`                      |
| `Lower()`      | Converte para minúsculas                         | `Lower(cEmail)`                    |
| `StrZero()`    | Número para string com zeros à esquerda          | `StrZero(nNum, 6)` → `"000001"`    |
| `PadR()`       | Preenche à direita com espaços                   | `PadR(cNome, 50)`                  |
| `PadL()`       | Preenche à esquerda com espaços                  | `PadL(cCod, 10)`                   |
| `cValToChar()` | Converte qualquer tipo para string               | `cValToChar(nTotal)`               |
| `Str()`        | Numérico para caracter                           | `Str(nVal, 10, 2)`                 |
| `Val()`        | String para numérico                             | `Val("123.45")`                    |
| `Empty()`      | Verifica se está vazio (qualquer tipo)           | `If Empty(cCod)`                   |

## Datas

| Função         | Uso                                              | Exemplo                            |
|----------------|--------------------------------------------------|------------------------------------|
| `Date()`       | Data de hoje                                     | `dHoje := Date()`                  |
| `CToD()`       | String para data                                 | `CToD("31/12/2025")`               |
| `DToC()`       | Data para string                                 | `DToC(dData)` → `"31/12/2025"`     |
| `DToS()`       | Data para string no formato YYYYMMDD             | `DToS(dData)` → `"20251231"`       |
| `SToD()`       | String YYYYMMDD para data                        | `SToD("20251231")`                 |
| `Month()`      | Mês da data                                      | `Month(Date())` → `3`              |
| `Year()`       | Ano da data                                      | `Year(Date())` → `2025`            |
| `Day()`        | Dia da data                                      | `Day(Date())` → `31`              |
| `LastDay()`    | Último dia do mês                                | `LastDay(1, 2025)` → `31`         |

## Arrays

| Função         | Uso                                              | Exemplo                            |
|----------------|--------------------------------------------------|------------------------------------|
| `AAdd()`       | Adiciona elemento ao final                       | `AAdd(aLista, "item")`             |
| `ASize()`      | Redimensiona array                               | `ASize(aArr, 10)`                  |
| `Len()`        | Tamanho do array                                 | `Len(aArr)`                        |
| `AScan()`      | Busca em array (retorna índice ou 0)             | `AScan(aArr, "valor")`             |
| `AFill()`      | Preenche array com valor                         | `AFill(aArr, 0)`                   |
| `AClone()`     | Copia um array                                   | `aCopia := AClone(aOrig)`          |
| `ASort()`      | Ordena array                                     | `ASort(aArr)`                      |
| `DEL()`        | Remove elemento por índice                       | `ADel(aArr, nIdx); ASize(aArr, Len(aArr)-1)` |

## Banco de Dados (modo ERP)

| Função           | Uso                                            |
|------------------|------------------------------------------------|
| `RecLock()`      | Trava registro para alterar (.F.) ou incluir (.T.) |
| `MsUnlock()`     | Destrava registro após inclusão/alteração      |
| `BeginTran()`    | Inicia transação no banco                      |
| `EndTran()`      | Confirma transação                             |
| `RollBackTran()` | Desfaz transação                               |
| `MsSeek()`       | Posiciona em registro por chave + alias + índice |
| `xFilial()`      | Retorna código de filial para filtros          |
| `RetSqlName()`   | Retorna nome real da tabela no SQL             |
| `TCQuery()`      | Executa query SQL e cria alias temporário      |
| `GetNextAlias()` | Obtém próximo nome de alias disponível         |
| `DBCloseArea()`  | Fecha área de trabalho (alias)                 |
| `DBSkip()`       | Avança para próximo registro                   |
| `DBGoTop()`      | Vai para o primeiro registro                   |
| `DBSetOrder()`   | Define ordem/índice ativo                      |
| `DBSeek()`       | Busca registro pela chave do índice ativo      |

## Ambiente / Configuração

| Função           | Uso                                            |
|------------------|------------------------------------------------|
| `GetArea()`      | Salva áreas de trabalho abertas                |
| `RestArea()`     | Restaura áreas de trabalho salvas              |
| `GetEnvServer()` | Retorna nome do ambiente                       |
| `FunName()`      | Nome da função em execução                     |
| `ThreadId()`     | ID da thread atual                             |
| `SuperGetMV()`   | Lê parâmetro do SX6 (configurações do sistema) |

## Interface / Mensagens

| Função           | Uso                                            |
|------------------|------------------------------------------------|
| `MsgInfo()`      | Caixa de mensagem informativa                  |
| `MsgStop()`      | Caixa de aviso (ponto de atenção)              |
| `MsgYesNo()`     | Pergunta Sim/Não, retorna lógico               |
| `ApMsgYesNo()`   | Versão "Ap" do MsgYesNo                        |
| `ConOut()`       | Grava no log do console do servidor            |
| `Alert()`        | Mensagem simples (somente com SmartClient)     |
| `Help()`         | Exibe ajuda contextual do campo                |

## Conversão / Validação

| Função           | Uso                                            |
|------------------|------------------------------------------------|
| `ValType()`      | Retorna tipo da variável: C, N, D, L, A, O, B, U |
| `IsNil()`        | Verifica se é NIL                              |
| `Type()`         | Verifica tipo de variável PUBLIC/PRIVATE por nome |
| `cValToChar()`   | Converte qualquer tipo para string             |
| `Posicione()`    | Posiciona em tabela e retorna valor do campo   |
| `ExistCpo()`     | Verifica se campo existe na tabela             |
| `ExistAlias()`   | Verifica se alias está aberto                  |

## JSON (TLPP / ADVPL moderno)

```advpl
// Criar JSON
Local jObj := JsonObject():New()
jObj["nome"]  := "Produto A"
jObj["preco"] := 99.90
jObj["ativo"] := .T.
cJson := jObj:toJson()

// Ler JSON
Local jParsed := JsonObject():New()
jParsed:fromJson(cJson)
cNome := jParsed["nome"]

// Array JSON
Local aItens := {}
Local jItem  := JsonObject():New()
jItem["id"]  := 1
AAdd(aItens, jItem)
jObj["itens"] := aItens
```
