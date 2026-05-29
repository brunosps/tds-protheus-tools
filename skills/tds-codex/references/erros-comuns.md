# Erros Comuns em ADVPL — Diagnóstico e Solução

## Erros de Runtime Frequentes

### "Variable does not exist: nNomeVariavel"
**Causa:** Variável usada sem ser declarada.
**Solução:**
```advpl
// ❌ Errado
nResultado := nValor * 2

// ✅ Correto
Local nValor := 0
Local nResultado := 0
nResultado := nValor * 2
```

---

### "Type mismatch on +"
**Causa:** Tentativa de concatenar tipos incompatíveis (ex: string + NIL ou string + número).
**Solução:**
```advpl
// ❌ Errado
cMsg := "Valor: " + nTotal

// ✅ Correto — usar cValToChar() ou Str()
cMsg := "Valor: " + cValToChar(nTotal)
cMsg := "Valor: " + Str(nTotal, 10, 2)
```

---

### Variáveis com nomes de 10+ chars colidindo
**Causa:** ADVPL considera apenas os primeiros 10 chars do nome.
**Sintoma:** Uma variável "sobrescreve" outra sem motivo aparente.
**Solução:**
```advpl
// ❌ Colidem (mesmos 10 primeiros chars)
Local nTotalGeralAnual   := 300
Local nTotalGeralMensal  := 100  // Na prática é a mesma!

// ✅ Diferencia nos primeiros caracteres
Local nAnualTotal  := 300
Local nMensalTotal := 100
```

---

### Lock / Deadlock em tabelas
**Causa:** `RecLock()` não seguido de `MsUnlock()` (erro, exception, Return antecipado).
**Solução:**
```advpl
// ✅ Usar Begin Sequence para garantir destravamento
Begin Sequence
  RecLock("SB1", .F.)
    SB1->B1_DESC := "Novo"
  MsUnlock()
Recover With oErr
  MsUnlock()  // Garante desbloqueio mesmo em erro
  MsgStop(oErr:Description)
End Sequence
```

---

### Alias de TCQuery não fechado (vazamento de cursores)
**Causa:** `TCQuery()` sem `DBCloseArea()` correspondente.
**Sintoma:** Número crescente de cursores abertos no DBAccess, degradação de performance.
**Solução:**
```advpl
Local cAliasQ := GetNextAlias()
TCQuery(cQuery, .T., cAliasQ)

// ... processamento ...

(cAliasQ)->(DBCloseArea())  // SEMPRE fechar
```

---

### "PE MVC com mesmo nome do Model"
**Causa:** O arquivo fonte (User Function) tem o mesmo nome do ID do Model de dados.
**Solução:**
```advpl
// ❌ Fonte GPEA010 com Model ID = "GPEA010"
// ✅ Fonte GPEA010 com Model ID = "GPEA010MDL" (ou qualquer nome diferente)
```

---

### "D_E_L_E_T_ retornando registros excluídos"
**Causa:** Query SQL sem filtro de exclusão lógica do Protheus.
**Solução:**
```advpl
// ❌ Sem filtro
cQuery := "SELECT * FROM SB1010"

// ✅ Com filtro de exclusão lógica
cQuery := "SELECT * FROM " + RetSqlName("SB1")
cQuery += " WHERE D_E_L_E_T_ = ' '"
```

---

### Performance degradada em consultas SQL
**Causa:** Falta de filtro de filial, LIKE com wildcard no início, ou falta de índice.
**Soluções:**
```advpl
// ✅ Sempre filtrar por filial
cQuery += " WHERE B1_FILIAL = '" + xFilial("SB1") + "'"

// ✅ Evitar LIKE '%valor%' — não usa índice
// Preferir LIKE 'valor%' ou filtro exato

// ✅ ORDER BY apenas em campos indexados
```

---

### Função não encontrada em tempo de execução
**Causa:** Nome da função com mais de 10 chars — ADVPL trunca na compilação.
**Sintoma:** "Function 'OpenNoTaxReceipt' not found" mas a função existe.
**Solução:**
```advpl
// ADVPL vai procurar pelos primeiros 10 chars: "OpenNoTaxR"
// Se houver outra função OpenNoTaxReceiptBound, haverá colisão
// ✅ Estratégia: colocar diferenciador no início do nome
Function RecNoTaxOpen()   // Receipt No Tax Open
Function RecNoTaxClose()  // Receipt No Tax Close
```

---

## Erros de Ambiente

### Compilação com erro de #INCLUDE não encontrado
```advpl
// Verificar paths no TDS/VSCode e nos includes do appserver.ini
// Includes essenciais:
#INCLUDE "PROTHEUS.CH"
#INCLUDE "TOTVS.CH"
#INCLUDE "FWMVCDEF.CH"
```

### ConOut() não aparece no log
- Verificar se o nível de log do AppServer está configurado corretamente
- ConOut só aparece no console.log do Application Server
- Usar `ApMsgAlerta()` para debug com interface, ou `ConOut()` + visualizar via TDS Console

### Erro ao executar REST: "404 Not Found"
- Verificar se o `[HTTP]` e `[REST]` estão configurados no appserver.ini
- Certificar que o arquivo foi compilado no RPO correto
- Em TLPP: verificar se o `Namespace` e a `@Get`/`@Post` annotation estão corretos
