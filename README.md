# STGraphX: readme

Luca Mari, versione 15 giugno 2026

## Contesto

STGraphX è un editor ed esecutore di modelli dinamici a grafo orientato.

È un esperimento di reimplementazione di STGraph, da Java a JavaScript, realizzata interamente in _vibe coding_ con GPT-Codex-5.x.

(si può provare <a href="https://lmari.github.io/STGraphX" target="_blank" rel="noopener noreferrer">qui</a>)

(come spiegato in README-ARCHITECTURE.md, dall'ambiente di sviluppo si può eseguire la versione Electron senza compilazione con `npm run start:desktop -- --lang=en`)

Ho guardato ma mai toccato il codice generato, che al momento è di circa 600 linee HTML (index.html), 3k linee CSS (styles.css), 29k linee JS (runtime*: 3k; player*: 2k; app.js: 13k, graph-functions.js: 2k, i18n-inline.js: 2k, semantic.js: 3k, widgets.js: 4k).

## Stato del progetto

Applicazione JavaScript con doppia shell e logica condivisa:

* web, per accesso da browser via `http:` (e con qualche limitazione anche `file:`);
* desktop, mediante `Electron`.

__Al momento implementati (senza librerie esterne):__

* editor per grafi orientati, con nodi di forme e colori diversi e tooltip, frecce spline, testi, gestione di ridimensionamento, spostamento, cancellazione dei nodi, anche per selezioni multiple, zoom, griglia, clipboard (anche condivisa tra instanze diverse dell'app), undo e redo, ...;
* menu, menu contestuale e pannello di configurazione aggiornato dinamicamente, con tooltip;
* interfaccia a tab per più modelli, con gestione contestuale della relazione tra modelli e sottomodelli;
* gestione dei testi dell'interfaccia utente in italiano, inglese e portoghese, con scelta via query string nella shell web (`?lang=it|en|pt`) e via parametro `--lang=it|en|pt` nella shell Electron;
* gestione dei nodi algebrici, di stato, parametri e sottomodelli, con funzioni in sintassi javascript (compresa la gestione locale di `this` come stato attuale); controllo sintattico sul nome dei nodi; controllo sui parametri (valore non cambia dopo la prima esecuzione; frecce entranti non ammesse); controllo sullo stato iniziale: solo espressioni locali o riferimenti a parametri; controllo del numero di cifre decimali visualizzate;
* variabili globali;
* gestione di esecuzione completa, passo-passo, temporizzata, con modello in modalità read-only durante l'esecuzione;
* gestione opzionale di blocco di esecuzione ed evidenziazione per nodi non definiti;
* editor per espressioni, con gestione ed help contestuale e controllo sintattico dinamico;
* varie funzioni definite; mapping da valori booleani a valori numerici e funzione `if`;
* funzione `integral`, con scelta dell'algoritmo di integrazione, se Eulero o RK4;
* alcune funzioni per distribuzioni di probabilità;
* generazione di vettori con la sintassi `range(inizio, fine, [passo])`; indicizzazione/slicing di vettori e matrici con la sintassi di NumPy, `[inizio:fine]` oppure `[inizio:fine:passo]`, anche con indici opzionali e negativi; gestione di funzioni a valori non scalari, per esempio `sin([1,2,3])`; gestione di operatori con argomenti non scalari;
* funzioni "special form" per operare su vettori e matrici: `array`, `reduce`, `map`, `filter`;
* una funzione per leggere il contenuto di file dati in formato csv;
* una voce di menu per esportare la serie storica dei valori delle variabili di output in un file csv;
* possibilità di definire funzioni locali ai modelli;
* gestione di proprietà custom per il modello e i singoli nodi e funzioni `getModelProperty`/`getProperty` e `setModelProperty`/`setProperty`;
* gestione di nodi di output e di widget di output: grafici, tabelle, matrici, led, testo; pannello di configurazione aggiornato dinamicamente;
* gestione di nodi di input e di widget di input, anche per parametri: slider, pulsante, selettore di testo; pannello di configurazione aggiornato dinamicamente;
* gestione dei sottomodelli con file JSON separati, con caricamento dalla stessa cartella del modello, binding dei nodi di input e accesso ai nodi di output con notazione `nomeSottomodello.nomeOutput`;
* prima gestione in logica ABM dichiarativa / funzionale, mediante variabili di sistema `self` e `$i$`;
* visualizzazione alternata per il grafo e i widget;
* enfatizzazione delle frecce sul nodo selezionato;
* editor per testi con formattazione HTML basilare;
* definizione della base dei tempi e modalità varie di esecuzione; pannello di configurazione aggiornato dinamicamente;
* caricamento e salvataggio di modelli in file JSON;
* editor per espressioni con controllo sintattico interattivo, visualizzazione dei valori attuali, help;
* menu di help;
* nel menu File, gestione dei modelli aperti di recente;
* una prima gestione di controllo di correttezza del modello;
* un primo debugger, con gestione di watch e breakpoint;
* un player per esecuzione di modelli in pagine HTML;
* un API JavaScript per esecuzione headless mediante script node.js;
* ...

__Al momento non implementati (rispetto a STGraph):__

* altri widget e altre opzioni per i widget già presenti;
* altre funzioni;
* nodi di stato con output;
* gestione di interrupt;
* playmode e altre modalità di esecuzione;
* una pagina di esempi;
* ...

## Appunti sul progetto

* Comprende le richieste molto bene e la qualità del codice prodotto è quasi sempre eccellente
* Anche senza che glielo si chieda, fa test sul codice che ha generato, e quasi sempre lo corregge da sé se trova degli errori
* Nel caso di estensioni a parti già realizzate, si fa carico automaticamente di mantenere la coerenza
* Le spiegazioni del lavoro compiuto sono chiare e corrette
* A volte prende iniziative proponendo o anche implementando estensioni a quanto richiesto
* È in grado di fare refactoring e ottimizzazione, e fa refactoring anche autonomamente quando si accorge che è opportuno
* Si possono chiedere pareri o comunque indicazioni su come si potrebbero risolvere problemi
* Una stessa richiesta può includere cose diverse da realizzare
* Quando si chiede di realizzare cose complesse, suggerisce di farlo per passi successivi ("Se vuoi, il prossimo passo utile è...")
* Scrive ottima documentazione a partire dal codice, e aggiorna automaticamente la documentazione
* È come un dialogo con uno sviluppatore esperto (inclusi suoi commenti come "Il patch è saltato su un punto di contesto nel CSS. Lo rifaccio in blocchi più piccoli così non rischiamo di lasciare roba a metà.")
* Sa usare il software che ha generato: dunque in questo caso sa creare modelli stg come file json del formato atteso e di contenuto appropriato
* ...

## Documentazione aggiuntiva

Per l'architettura tecnica e per le istruzioni su come sviluppare il progetto, si veda `README-ARCHITECTURE.md`.

Per l'uso del player e dell'API JavaScript, si veda `README-PLAYER.md`.

Per l'uso di funzioni nei modelli, si veda `README-USAGE.md`.
