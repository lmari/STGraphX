# STGraphX: Manuale per la manutenzione dei testi di help delle funzioni

versione 11 settembre 2026

Copyright (c) 2026 Luca Mari

Questa guida descrive come aggiornare i testi mostrati sia nella finestra
**Help > Funzioni disponibili** sia nell'elenco dell'editor delle espressioni.

## File da modificare

I due livelli dell'help sono separati.

- `graph-functions.js` contiene il catalogo tecnico: nome, firma, categoria,
  chiave del testo, testo da inserire nell'editor e posizione iniziale del
  cursore.
- `i18n-inline.js` contiene i testi visibili, nelle sezioni `it` e `en`, con
  chiavi del tipo `expr.help.nomeFunzione`.

Per correggere o migliorare una spiegazione esistente, di norma basta
modificare la corrispondente voce in `i18n-inline.js`. Per introdurre una
nuova funzione o variabile, occorre aggiornare entrambi i file e la relativa
implementazione e i test.

## Catalogo tecnico

Le voci sono definite nell'oggetto `expressionDocs` di `graph-functions.js`.
Una funzione ha normalmente questa forma:

```js
myFunction: {
  kind: "function",
  signature: "myFunction(value[, option])",
  descriptionKey: "expr.help.myFunction",
  insertText: "myFunction()",
  cursorOffset: 11,
},
```

`signature` e' visualizzata separatamente dal testo descrittivo: deve quindi
essere completa, concisa e usare i nomi effettivi degli argomenti del
linguaggio. Le categorie disponibili sono `variable`, `function`, `array`,
`probability`, `math` e `agent`; per una categoria di visualizzazione diversa
si puo' usare anche `helpSection`.

## Testi localizzati

La chiave indicata da `descriptionKey` deve comparire sia nel dizionario
italiano sia in quello inglese di `i18n-inline.js`:

```js
"expr.help.myFunction": "Trasforma value secondo option. Esempio: myFunction(2)",
```

Convenzioni consigliate:

- iniziare con una frase che spieghi cosa produce la funzione, senza ripetere
  la firma gia' visualizzata sopra;
- chiamare gli argomenti con gli stessi nomi inglesi presenti nella firma;
- indicare i valori predefiniti degli argomenti opzionali quando rilevanti;
- mantenere una frase breve, poi eventuali dettagli e infine gli esempi;
- aggiornare sempre italiano e inglese nella stessa modifica.

Non usare HTML o Markdown: l'help viene inserito come testo e non interpreta
marcatori di formattazione.

## Formule ed esempi

La UI mette automaticamente in monospace le espressioni riconoscibili nella
descrizione, ad esempio `range(1, 6)`, `[1, 2]`, `$0`, `axis=0` e `mode=1`.

Per visualizzare esempi in un blocco separato, terminare la descrizione con
`Esempio:` oppure `Esempi:` in italiano, e con `Example:` oppure `Examples:`
in inglese. Piu' esempi sono separati da punto e virgola:

```js
"expr.help.myFunction": "Restituisce il valore trasformato. Esempi: myFunction(2); myFunction([1, 2])",
```

Ogni esempio sara' mostrato su una propria riga. Non usare il punto e virgola
all'interno di un singolo esempio.

## Controlli

Dopo una modifica eseguire:

```bash
npm run check
```

Poi avviare l'app, aprire **Help > Funzioni disponibili** e l'editor di
un'espressione. Verificare almeno:

- firma, testo ed esempi nella lingua attiva;
- ricerca per nome nella finestra generale;
- gruppo corretto nell'elenco;
- inserimento nell'editor per una nuova funzione;
- corrispondenza tra la documentazione e il comportamento effettivo.
