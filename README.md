# STGraphX: un esperimento

Un esperimento: di reimplementazione "moderna" di STGraph (da Java a JavaScript), realizzata interamente in "vibe coding" (con GPT-Codex-5.3, in febbraio 2026).

(si può provare <a href="https://lmari.github.io/STGraphX" target="_blank" rel="noopener noreferrer">qui</a>)

Al momento implementati:
* editor per il grafo, con nodi di forme diverse, frecce spline, gestione di ridimensionamento, spostamento, cancellazione, anche per selezioni multiple, zoom, griglia, clipboard, undo, ...;
* menu contestuale e pannello di configurazione aggiornato dinamicamente;
* gestione dei testi in italiano e inglese in file di configurazione e scelta in extraURL;
* gestione dei nodi algebrici, di stato, parametri, con funzioni in sintassi javascript (compresa la gestione locale di `this` come stato attuale) a valori scalari; controllo sintattico sul nome dei nodi; controllo sui parametri (valore non cambia dopo la prima esecuzione; frecce entranti non ammesse); controllo del numero di cifre decimali visualizzate;
* varie funzioni definite; mapping da valori booleani a valori numerici e funzione `if`; 
* gestione di nodi di output e di widget di output: grafici e tabelle; pannello di configurazione aggiornato dinamicamente;
* visualizzazione alternata per il grafo e i widget;
* definizione della base dei tempi e modalità varie di esecuzione; pannello di configurazione aggiornato dinamicamente;
* caricamento e salvataggio di modelli in file json;
* ...
* 
Al momento non implementati:
* nodi di input e widget di input; altri widget di output e altre opzioni per i widget di output già presenti;
* funzioni a valori non scalari;
* altre funzioni;
* nodi di stato con output;
* algoritmi di integrazione espliciti;
* editor per funzioni con controllo sintattico interattivo;
* stati iniziali non costanti esplicite;
* sottomodelli;
* interfaccia a tab per più grafi;
* ...
