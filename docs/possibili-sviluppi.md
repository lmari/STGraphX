# Possibili sviluppi di STGraphX

Documento di pianificazione aggiornato al 23 ottobre 2026. Non e' una roadmap vincolante: distingue le basi gia' disponibili dalle aree in cui un intervento produrrebbe il maggior beneficio per affidabilita', didattica e capacita' di modellazione.

## Stato attuale

STGraphX dispone gia' di una base funzionale ampia:

- editor web, shell Electron e build Tauri sperimentale;
- player incorporabile e API JavaScript headless;
- nodi parametro, algebrici, di stato, bozza e sottomodello, comprese variabili globali e unita' di misura esplicite o inferite;
- widget di input e output, dashboard, gruppi di visualizzazione, testo Markdown/LaTeX e appunti del modello;
- analisi del modello, controlli di coerenza delle unita', watch, breakpoint tecnici e semantici, cicli di feedback e seed casuale ripetibile;
- funzioni locali, importazione iniziale da STGraph XML, esportazione CSV, supporto ABM e strumenti di documentazione;
- moduli runtime e di piattaforma gia' condivisi fra editor, player e Tauri.

Le proposte seguenti non devono quindi duplicare queste funzioni, ma consolidarle, renderle verificabili e svilupparne i punti ancora deboli.

## Priorita' alta

### 1. Test end-to-end delle shell e del player

Le regressioni osservate su campi editabili, menu touch, file recenti, widget, dashboard e player mostrano che i test di logica non sono sufficienti. Introdurre test browser automatizzati, preferibilmente con Playwright, per:

- apertura, modifica, salvataggio e riapertura di modelli;
- recenti e File System Access API in Chrome e Firefox;
- esecuzione completa, per passi e temporizzata, inclusi input durante l'esecuzione;
- sottomodelli, tab, dashboard, appunti e modelli con unita' di misura;
- player embedded, API headless e viewport tablet;
- smoke test di avvio, caricamento e arresto per Electron e Tauri.

Ogni correzione di regressione dovrebbe aggiungere almeno un caso che la renda riproducibile automaticamente.

### 2. Affidabilita' della persistenza web

Browser diversi impongono limiti diversi sui file locali e sui permessi. Le voci dei recenti dovrebbero indicare in modo esplicito se il modello e':

- riapribile direttamente tramite handle autorizzato;
- disponibile solo come copia archiviata nel browser;
- collegato a una cartella da riautorizzare;
- non piu' disponibile nel percorso originario.

Servono inoltre azioni chiare per ricollegare file e cartelle, mantenere i sottomodelli, risolvere conflitti fra copia locale e file esterno e spiegare quando il browser non puo' garantire un salvataggio diretto.

### 3. Formato JSON, validazione e migrazioni

Il formato del modello e' cresciuto molto: dashboard, unita', appunti, breakpoint semantici, opzioni di visualizzazione, funzioni locali e nuove proprieta' dei widget richiedono una politica di compatibilita' esplicita.

- Definire uno schema JSON versionato e validabile fuori dalla UI.
- Separare normalizzazione, migrazione e caricamento grafico.
- Introdurre migrazioni esplicite fra versioni e messaggi leggibili.
- Conservare modelli storici come fixture di regressione.
- Documentare le parti stabili del formato destinate a player e API.

Questo e' particolarmente importante prima di accumulare archivi di modelli prodotti da studenti e docenti nel tempo.

### 4. Consolidare editor, player e runtime

Il refactoring ha gia' estratto runtime, analisi, piattaforma e parte delle UI, ma il rendering dei widget e alcune interazioni restano in percorsi distinti. La direzione dovrebbe essere una libreria comune di rendering widget con:

- configurazione e serializzazione comuni;
- adapter distinti per editor, player e dashboard;
- interazioni abilitate o disabilitate in base al contesto;
- test di parita' funzionale e, dove utile, visuale.

L'obiettivo non e' una riscrittura totale, ma ridurre i casi in cui una nuova proprieta' deve essere implementata e corretta due volte.

## Priorita' media

### 5. Completare la decomposizione di app.js

La separazione recente ha ridotto il rischio, ma `app.js` conserva ancora molto coordinamento di canvas, selezione, menu, finestre, documenti e UI. Conviene proseguire solo per confini ad alto valore:

- controller del canvas e delle gesture;
- controller di selezione e menu contestuali;
- pannelli di configurazione e finestre;
- ciclo di vita del documento, tab e sottomodelli;
- adattatore fra stato di esecuzione e aggiornamento UI.

Non e' necessario introdurre un framework: moduli JavaScript con API piccole, stato esplicito e testabili sono preferibili a un refactoring cosmetico.

### 6. Osservabilita' e prestazioni del runtime

Il piano di esecuzione persistente e altre ottimizzazioni recenti sono una base utile. I prossimi passi dovrebbero essere guidati da misure:

- profiler per variabile: tempo totale, numero di valutazioni e allocazioni;
- diagnostica delle dipendenze effettive e cache invalidate;
- confronto fra passi e cronologia dei watch;
- analisi dei colli di bottiglia per vettori, matrici, ABM e widget;
- benchmark riproducibili, con seed e risultati numerici confrontati.

Ogni ottimizzazione deve preservare ordine delle estrazioni casuali, semantica delle copie e risultati dei modelli di riferimento.

### 7. Esperimenti e riproducibilita'

Oltre al singolo run, un ambiente per modelli richiede un runner sperimentale:

- sweep di uno o piu' parametri;
- repliche con seed esplicito o serie di seed;
- raccolta degli output marcati e esportazione CSV;
- statistiche aggregate e grafici di confronto;
- metadati: hash/versione del modello, data, parametri, seed e ambiente.

Una prima versione puo' essere headless e usare l'API del player; la UI puo' seguire quando il flusso sperimentale sia consolidato.

### 8. Tipi e unita' di misura

Le unita' di misura sono gia' un controllo utile. Una gestione dei tipi deve restare graduale, per non rendere l'editor eccessivamente prescrittivo:

- distinguere forma del valore (scalare, vettore, matrice, oggetto agente) dalla sua unita';
- inferire quando possibile e segnalare incompatibilita' senza bloccare il lavoro esplorativo;
- rendere rigorosi i controlli solo in modalita' "Definizioni rigorose";
- trattare esplicitamente l'omogeneita' di unita' per vettori e matrici;
- documentare conversioni, simboli e limiti del sistema.

## Area di ricerca: loop algebrici impliciti

Attualmente i cicli composti solo da variabili algebriche sono correttamente vietati: non hanno un ordine topologico di valutazione. Ammetterli avrebbe senso per rappresentare relazioni simultanee, ma non come estensione trasparente dell'attuale semantica.

Una possibile evoluzione e' trattare ogni componente fortemente connessa come un **blocco implicito** opzionale:

1. rilevare il ciclo nella fase di compilazione del piano di esecuzione;
2. richiedere che il modellista abiliti esplicitamente la risoluzione;
3. stimare il blocco con Jacobi o Gauss-Seidel, inizializzandolo dal passo precedente o da valori dichiarati;
4. fermarsi a tolleranza e numero massimo di iterazioni configurabili;
5. riportare residuo, mancata convergenza e variabili coinvolte;
6. vietare o segnalare funzioni casuali e altri effetti collaterali nel blocco.

Prima di implementare servono casi didattici e test su scalari, vettori e matrici. Il comportamento con stato iniziale, unita' di misura e integrazione temporale deve essere definito formalmente. Per ora e' preferibile mantenere il rifiuto predefinito dei loop algebrici.

## ABM e spazio

La base per agenti, proprieta' nominate, spazi e query locali e' disponibile. Gli sviluppi con maggior ritorno sarebbero:

- operazioni vettoriali condizionali su popolazioni;
- strutture spaziali aggiornabili efficienti per agenti mobili;
- identificatori stabili, nascita, rimozione, fusione e tracciamento;
- strumenti di ispezione di un agente, vicinato e proprieta';
- esempi di riferimento e benchmark ABM di dimensione crescente.

Questa area va progettata assieme alle prestazioni del runtime: l'API deve restare leggibile, ma evitare cicli JavaScript nascosti e allocazioni ripetute.

## Usabilita', didattica e presentazione

### 9. Percorsi guidati e analisi come assistente

La guida operativa e gli esempi interattivi sono la base. Si possono aggiungere:

- percorso "Primo modello" con controlli contestuali e obiettivi brevi;
- analizzatore che separi errori bloccanti, warning, info e suggerimenti;
- riferimenti cliccabili a variabili, frecce, widget e formule;
- suggerimenti contestuali per definizioni mancanti, unita' e dipendenze;
- spiegazioni mirate per gli errori runtime.

### 10. Dashboard e comunicazione dei modelli

Dashboard, gruppi e appunti rendono gia' i modelli presentabili. Le estensioni piu' utili sono blocco del layout, modalita' presentazione, layout responsive per pagina, preset di visualizzazione ed esportazione immagine/PDF.

### 11. Accessibilita' e interazione touch

La modalita' responsive e le gesture devono essere coperte da test reali su Android, iPad e browser desktop ridotti. Priorita': menu, drag di nodi e widget, pannelli apribili, tastiera, focus, tooltip non invasivi e contrasto.

## Documentazione e rilascio

### 12. Documentazione mantenibile

- Creare un indice unico della documentazione per utenti, docenti e sviluppatori.
- Generare i riferimenti alle funzioni e allo schema quando possibile.
- Mantenere changelog e note di rilascio coerenti con versione e data.
- Estendere esempi, modelli di test e materiale didattico verificabile.

### 13. Qualita' delle release

- CI GitHub per `npm run check`, bundle player, build frontend Tauri e test.
- Build di release riproducibili per Electron e Tauri.
- Asset allegati a tag GitHub, checksum e note generate.
- Firma/notarizzazione per macOS e firma Windows prima di una diffusione ampia.

## Sequenza raccomandata

1. Test end-to-end e consolidamento dei flussi file web.
2. Schema JSON, validatore e migrazioni.
3. Parita' editor/player e confini modulari ancora ad alto rischio.
4. Benchmark, profiler e ottimizzazioni misurate del runtime.
5. Runner sperimentale e riproducibilita'.
6. Evoluzione controllata di tipi, ABM e, solo dopo una specifica formale, loop algebrici impliciti.
