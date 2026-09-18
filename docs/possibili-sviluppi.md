## Priorità Alta

1. Ridurre il monolite app.js.
   Il file concentra canvas, selezione, tab, dashboard, finestre, menu, editor, persistence, esecuzione e coordinamento UI. È il principale rischio di regressione e rende costoso intervenire. Separerei progressivamente:
   - canvas-controller.js
   - workspace-tabs.js
   - selection-controller.js
   - expression-editor-ui.js
   - sidebar-panels.js
   - dashboard-ui.js
   - menu-controller.js
   - model-document-controller.js
Non serve introdurre un framework: moduli JavaScript espliciti, con stato e API limitate, sarebbero già un miglioramento sostanziale.

2. Formalizzare il formato JSON del modello.
   Il modello esportato ha version: 1, ma non emerge una vera pipeline di migrazione e validazione. Serve:
   - schema JSON versionato;
   - validatore separato dal renderer;
   - migrazioni esplicite v1 -> v2;
   - messaggi di compatibilità chiari all’apertura;
   - test con modelli storici.
Questo diventa importante prima che molti studenti producano modelli da conservare negli anni.

3. Test end-to-end delle shell.
   Le regressioni recenti su campi read-only, recenti, widget, menu touch e runtime mostrano che i test unitari non bastano. Introdurrei test browser automatizzati, idealmente con Playwright:
   - apertura, salvataggio e riapertura di un modello;
   - recenti in Chrome e Firefox;
   - esecuzione per passo e temporizzata;
   - widget di input durante l’esecuzione;
   - sottomodelli e tab;
   - dashboard;
   - player embedded;
   - viewport tablet.
Per Electron e Tauri bastano inizialmente smoke test di avvio e caricamento modello.

4. Rendere affidabile la gestione dei file web.
   Il browser impone limiti reali sui file locali, diversi fra Chrome e Firefox. La funzione “Recenti” dovrebbe rendere evidente lo stato di ciascuna voce:
   - file riapribile direttamente;
   - contenuto archiviato nel browser;
   - cartella/sottomodelli disponibili;
   - autorizzazione da rinnovare;
   - file non più disponibile.
Conviene inoltre mostrare dimensione e data del contenuto archiviato e offrire “Ricollega file/cartella” senza ambiguità.

## Priorità Media

1. Unificare editor e player.
   README-PLAYER.md dichiara che il rendering dei widget nel player è ancora dedicato. Questa è una fonte strutturale di divergenze. La direzione migliore è estrarre una libreria di rendering widget parametrica:
   - stesso rendering;
   - adapter diversi per editing e sola esecuzione;
   - configurazione comune di scala, stile e interazione;
   - test visuali condivisi.

2. Rendere il runtime più osservabile.
   Il debugger watch è un ottimo punto di partenza. Aggiungerei:
   - profiler per nodo: tempo totale, numero valutazioni, errori;
   - inspector della dipendenza effettiva di un nodo;
   - cronologia consultabile dei watch;
   - confronto fra due passi temporali;
   - diagnostica dei colli di bottiglia nei modelli ABM.

3. Esperimenti e riproducibilità.
   Per la didattica e l’uso scientifico, la funzionalità più utile dopo l’editor è un runner sperimentale:
   - sweep di parametri;
   - repliche con seed casuale esplicito;
   - esportazione CSV aggregata;
   - statistiche min/max/media/deviazione;
   - metadati dell’esperimento: modello, versione, data, seed e parametri.

4. Consolidare la documentazione.
   La documentazione è ampia e utile, ma distribuita in molti file. README-ARCHITECTURE.md dichiara per esempio una data del 31 agosto 2026, mentre esistono release successive. Suggerisco:
   - una pagina indice della documentazione;
   - guida utente orientata a flussi didattici;
   - guida di riferimento tecnica generata quando possibile;
   - changelog per release;
   - convenzione unica per date e versione.

## Usabilità

1. Percorso guidato per nuovi utenti.
   Una modalità “Primo modello” potrebbe accompagnare lo studente in pochi passi: tempo, parametro, stato, widget, grafico, esecuzione, salvataggio.

2. Migliorare la scoperta delle funzioni.
   La finestra delle funzioni ha già filtro e documentazione. I miglioramenti più utili sarebbero:
   - preferiti e funzioni recenti;
   - inserimento con doppio click;
   - esempi eseguibili;
   - segnalazione immediata di funzioni compatibili con il valore sotto cursore.

3. Analisi modello come assistente.
   L’analizzatore dovrebbe distinguere chiaramente:
   - errori che impediscono l’esecuzione;
   - avvisi semantici;
   - suggerimenti di modellazione;
   - ottimizzazioni possibili;
   - riferimenti cliccabili al nodo, arco, widget o formula.

4. Dashboard come modalità di presentazione.
   La dashboard è un’evoluzione promettente. Le aggiunte più efficaci sarebbero:
   - blocco della disposizione per evitare spostamenti accidentali;
   - modalità presentazione a schermo intero;
   - esportazione immagine/PDF;
   - layout responsive per pagina;
   - copie di dashboard o preset di visualizzazione.

## Qualità Di Rilascio

- Aggiungere CI GitHub: npm run check, build player, build Tauri frontend e smoke test.
- Generare automaticamente gli asset di release al push di un tag.
- Mantenere checksum e note di rilascio generate.
- Valutare firma/notarizzazione per macOS e firma Windows prima di una distribuzione più ampia.

## Sequenza Consigliata

1. Test end-to-end e robustezza file/recenti web.
2. Schema JSON, validazione e migrazioni.
3. Decomposizione progressiva di app.js.
4. Unificazione del rendering dei widget fra editor e player.
5. Runner di esperimenti con seed e sweep di parametri.
6. Profiler/debugger del runtime.