# STGraphX: un esperimento

Un esperimento: di reimplementazione "moderna" di STGraph (da Java a JavaScript), realizzata interamente in "vibe coding" (con GPT-Codex-5.3).

__Luca Mari, versione 1 marzo 2026__

(si può provare <a href="https://lmari.github.io/STGraphX" target="_blank" rel="noopener noreferrer">qui</a>)

Al momento implementati:
* editor per grafi orientati, con nodi di forme diverse, frecce spline, gestione di ridimensionamento, spostamento, cancellazione dei nodi, anche per selezioni multiple, zoom, griglia, clipboard, undo, ...;
* menu contestuale e pannello di configurazione aggiornato dinamicamente;
* gestione dei testi in italiano e inglese in file di configurazione e scelta in extraURL;
* gestione dei nodi algebrici, di stato, parametri, con funzioni in sintassi javascript (compresa la gestione locale di `this` come stato attuale) a valori scalari; controllo sintattico sul nome dei nodi; controllo sui parametri (valore non cambia dopo la prima esecuzione; frecce entranti non ammesse); controllo del numero di cifre decimali visualizzate;
* varie funzioni definite; mapping da valori booleani a valori numerici e funzione `if`; funzione `integral`, per ora solo per algoritmo di integrazione di Eulero; alcune funzioni per distribuzioni di probabilità;
* gestione di proprietà custom per il modello e i singoli nodi e funzioni `getModelProperty`/`getProperty` e `setModelProperty`/`setProperty`;
* gestione di nodi di output e di widget di output: grafici e tabelle; pannello di configurazione aggiornato dinamicamente;
* gestione di nodi di input e di widget di input, anche per parametri: slider; pannello di configurazione aggiornato dinamicamente;
* visualizzazione alternata per il grafo e i widget;
* definizione della base dei tempi e modalità varie di esecuzione; pannello di configurazione aggiornato dinamicamente;
* caricamento e salvataggio di modelli in file json;
* editor per funzioni con controllo sintattico interattivo e help;
* ...
* 
Al momento non implementati:
* altri widget e altre opzioni per i widget già presenti;
* funzioni a valori non scalari;
* altre funzioni;
* nodi di stato con output;
* algoritmi di integrazione espliciti;
* stati iniziali senza costanti esplicite;
* sottomodelli;
* interfaccia a tab per più grafi;
* ...
