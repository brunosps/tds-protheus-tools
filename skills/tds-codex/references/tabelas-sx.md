# Tabelas SX — Dicionário de Dados Protheus

## Tabelas do Dicionário (SX*)

| Tabela | Descrição                                    | Campos Principais                         |
|--------|----------------------------------------------|-------------------------------------------|
| SX2    | Dicionário de Tabelas                        | X2_CHAVE, X2_NOME, X2_NUMCAM             |
| SX3    | Dicionário de Campos                         | X3_ARQUIVO, X3_CAMPO, X3_TIPO, X3_TAMANHO, X3_DECIMAL, X3_TITULO |
| SX5    | Tabelas de Domínio (Tabelas Genéricas)       | X5_TABELA, X5_CHAVE, X5_DESCRI           |
| SX6    | Parâmetros do Sistema (MV_*)                 | X6_VAR, X6_TIPO, X6_CONTEUD, X6_DESCRIC |
| SX7    | Gatilhos                                     | X7_CAMPO, X7_REGRA, X7_ALIAS             |
| SXA    | Opções de campos tipo Combo                  | XA_ALIAS, XA_CAMPO, XA_OPCAO, XA_DESCRI |
| SXB    | Consultas Padrão (F3)                        | XB_ALIAS, XB_TIPO, XB_SEQ, XB_COLUNA    |
| SXD    | Pastas (Folders de tela)                     | XD_ROTINA, XD_SEQUEN, XD_DESCRI         |
| SXE    | Numerações Automáticas                        | XE_SEQUEN, XE_CAMPO, XE_CHAVE           |
| SXF    | Número de campos por tabela                   | —                                        |
| SXG    | Índices do dicionário                         | XG_INDICE, XG_ORDEM, XG_CHAVE           |

## Como ler parâmetros SX6 (MV_PAR*)

```advpl
// Lê valor do parâmetro MV_XXXX
Local cValor := SuperGetMV("MV_NOMEPAR")

// Com valor default caso não exista
Local cValor := SuperGetMV("MV_NOMEPAR", .F., "valorpadrao")

// Tipos de retorno dependem do tipo do parâmetro (C, N, D, L)
Local nDias  := Val(SuperGetMV("MV_PRAZO"))
Local lAtivo := SuperGetMV("MV_ATIVO") == "1"
```

## Como ler SX5 (tabelas de domínio)

```advpl
// Função padrão para buscar descrição em tabela de domínio
Local cDescri := ""

// Usando Posicione()
cDescri := Posicione("SX5", 1, xFilial("SX5") + "XX" + cChave, "X5_DESCRI")

// Ou via DbSeek direto
If SX5->(DbSeek( xFilial("SX5") + "XX" + cChave ))
  cDescri := AllTrim(SX5->X5_DESCRI)
EndIf
```

## Tabelas de Dados Principais

### Financeiro
| Tabela | Módulo    | Descrição                    |
|--------|-----------|------------------------------|
| SE1    | SIGAFIN   | Contas a Receber             |
| SE2    | SIGAFIN   | Contas a Pagar               |
| SE5    | SIGAFIN   | Movimentação Bancária        |
| SA6    | SIGAFIN   | Bancos                       |

### Estoque / Produtos
| Tabela | Módulo    | Descrição                    |
|--------|-----------|------------------------------|
| SB1    | SIGAEST   | Cadastro de Produtos         |
| SB2    | SIGAEST   | Saldos em Estoque            |
| SB8    | SIGAEST   | Rastreabilidade (Lotes)      |
| SD3    | SIGAEST   | Movimentações de Estoque     |

### Compras / Faturamento
| Tabela | Módulo    | Descrição                    |
|--------|-----------|------------------------------|
| SC1    | SIGACOM   | Solicitações de Compra       |
| SC7    | SIGACOM   | Pedidos de Compra            |
| SD1    | SIGACOM   | Itens de NF de Entrada       |
| SF1    | SIGACOM   | Cabeçalho de NF de Entrada   |
| SF2    | SIGAFAT   | Cabeçalho de NF de Saída     |
| SD2    | SIGAFAT   | Itens de NF de Saída         |
| SC5    | SIGAFAT   | Cabeçalho de Pedido de Venda |
| SC6    | SIGAFAT   | Itens de Pedido de Venda     |

### Cadastros Gerais
| Tabela | Módulo    | Descrição                    |
|--------|-----------|------------------------------|
| SA1    | Geral     | Clientes                     |
| SA2    | Geral     | Fornecedores                 |
| SA3    | Geral     | Vendedores                   |
| SA4    | Geral     | Transportadoras              |
| SCC    | Geral     | Centro de Custos             |
| CTT    | SIGACTB   | Centro de Custo              |

## Campos Especiais de Controle

| Campo        | Descrição                                     |
|--------------|-----------------------------------------------|
| D_E_L_E_T_   | Marca de exclusão lógica (`'*'` = excluído, `' '` = ativo) |
| R_E_C_N_O_   | Número do registro físico (interno)           |
| R_E_C_D_E_L_ | Índice de exclusão lógica                    |
| `*_FILIAL`   | Código da filial (ex: B1_FILIAL, A1_FILIAL)  |

```advpl
// Sempre filtrar registros ativos:
cQuery += " WHERE D_E_L_E_T_ = ' '"

// E por filial (em tabelas multi-empresa):
cQuery += "   AND B1_FILIAL = '" + xFilial("SB1") + "'"
```

## Função Posicione() — Referência Rápida

```advpl
// Syntax: Posicione(cAlias, nOrdem, cChave, cCampo)
// Retorna o valor do campo sem alterar o posicionamento atual

Local cNomeCli := Posicione("SA1", 1, xFilial("SA1") + cCodCli, "A1_NOME")
Local cNomeProd := Posicione("SB1", 1, xFilial("SB1") + cCodProd, "B1_DESC")
Local nSaldo := Val(Posicione("SB2", 1, xFilial("SB2") + cCodProd + cArmazem, "B2_QATU"))
```
