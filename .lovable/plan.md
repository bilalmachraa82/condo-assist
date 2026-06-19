## Plano — auto-disparo do parse-pendency-pdf

Apenas `src/components/pendencies/CreatePendencyDialog.tsx`. Sem backend, sem migrations.

### Alterações

1. **Derivar `fileKey`** a partir de `file` no corpo do componente:
   ```ts
   const fileKey = file ? `${file.name}:${file.size}:${file.lastModified}` : null;
   ```

2. **Converter `runAutoFill` em `useCallback`** com deps `[file, buildings, suppliers, toast]`. Sem `eslint-disable`. Dentro, manter a verificação `activeFileKeyRef.current !== fileKeyAtStart` para descartar resposta obsoleta.

3. **Marcar `autoFillRanForFileKeyRef.current = fileKey` no início** de `runAutoFill` (antes do `await`), em vez de só no fim. Assim duas montagens/efeitos não disparam duas chamadas.

4. **Novo `useEffect`** com deps `[open, file, fileKey, aiBusy, runAutoFill]`:
   ```ts
   useEffect(() => {
     if (!open || !file || !fileKey) return;
     if (aiBusy) return;
     if (autoFillRanForFileKeyRef.current === fileKey) return;
     runAutoFill();
   }, [open, file, fileKey, aiBusy, runAutoFill]);
   ```

5. **Reset no `useEffect` de abertura**: já existe `autoFillRanForFileKeyRef.current = null` quando muda `open/initialFile/defaults`. Manter. Quando o utilizador troca de ficheiro via `handleFile`, NÃO mexer no ref — o novo `fileKey` diferente do último processado faz o auto-disparo correr novamente; o guard `activeFileKeyRef` no `runAutoFill` em curso descarta a resposta da chamada antiga.

6. **Botão manual mantido** — chama `runAutoFill()` diretamente; permite re-análise mesmo quando `autoFillRanForFileKeyRef.current === fileKey` (o botão limpa o ref antes de chamar):
   ```tsx
   onClick={() => { autoFillRanForFileKeyRef.current = null; runAutoFill(); }}
   ```

7. **UI**: texto do banner muda para "A analisar automaticamente…" quando `aiBusy`, e botão fica como "Voltar a analisar" (re-run manual).

### Critérios de aceitação cobertos

1. Anexar PDF → `useEffect` dispara `runAutoFill` automaticamente.
2. Mesmo ficheiro re-selecionado → `fileKey` igual → guard `autoFillRanForFileKeyRef` impede duplicado.
3. Trocar ficheiro → `activeFileKeyRef` no `runAutoFill` em voo descarta resposta antiga; novo `fileKey` dispara nova análise.
4. Campos tocados continuam protegidos pelo `touchedRef` já existente.

### Validação

Playwright headless contra preview local: abrir dialog, anexar PDF de teste, aguardar pelo toast "Auto-preenchido com IA" sem clicar no botão; confirmar 1 só request POST a `parse-pendency-pdf` na rede; trocar ficheiro e confirmar nova chamada.
