# Conversione da STGraph

`scripts/convert-stgraph-xml.js` converte la parte strutturale di un modello XML legacy di STGraph (`.stg`) nel formato JSON di STGraphX.

## Uso

```bash
node scripts/convert-stgraph-xml.js percorso/modello.stg
```

Senza un secondo argomento, il file JSON viene creato nella stessa cartella, con lo stesso nome base:

```text
percorso/modello.stg -> percorso/modello.json
```

Per scegliere il file di output e produrre anche un report leggibile da altri strumenti:

```bash
node scripts/convert-stgraph-xml.js modello.stg converted/modello.json --report converted/modello.report.json
```

Il comando mostra sempre a terminale il numero di elementi convertiti e gli avvisi rilevati. Un avviso non impedisce la creazione del JSON: apre il modello convertito in STGraphX, quindi rivedi le formule e usa `Help > Analizza modello` prima di eseguirlo.

## Convertito

* intestazione del modello e base dei tempi: `time0`, `timeD`, `time1`, ritardo e zoom;
* nodi `ValueNode` e `AuxiliaryNode`: parametri, variabili algebriche e di stato;
* posizione, dimensione, colori, descrizione e proprietà custom dei nodi;
* frecce, inclusi i punti di controllo intermedi;
* testi inseriti nel canvas;
* riferimenti a `SubmodelNode` e `ModelNode`: l'estensione `.stg` viene sostituita con `.json` e i binding espliciti vengono mantenuti quando sono presenti.

## Non Convertito

La prima versione non converte widget, gruppi grafici e report legacy. Il report indica il numero e i tipi di widget incontrati. I sottomodelli non vengono convertiti ricorsivamente: converti ogni file `.stg` separatamente e mantieni i JSON nella struttura di cartelle attesa dal modello padre.

Le formule non sono riscritte automaticamente in generale. STGraph e STGraphX hanno parti di linguaggio comuni, ma differiscono in alcune funzioni e convenzioni. Il convertitore adatta le riduzioni associative legacy `+/x` e `*/x` nella forma rispettivamente `reduce(+, x, 0)` e `reduce(*, x, 1)`, anche se l'argomento e fra parentesi, indicizzato o una riduzione annidata. Converte anche vettori di intervallo `[1:5]` e `[1:2:5]` in `range(1, 6)` e `range(1, 6, 2)`, l'operatore dimensionale `@x` in `size(x)`, e gli indici locali `$i0`, `$i1`, ... in `$0`, `$1`, ... ma solo nel corpo di `array(...)`. Le forme non associative `-/x` e `//x` restano invece da rivedere manualmente. Il convertitore segnala inoltre costrutti sospetti, come indici legacy residui, l'operatore `#`, letture da foglio elettronico e `&&`/`||`. I nodi legacy di stato con un'espressione di output separata vengono convertiti in nodi di stato e quell'espressione viene conservata nelle `formula notes`, perché STGraphX non usa quel costrutto.

I metodi di integrazione legacy diversi da Eulero richiedono una verifica manuale: il JSON prodotto imposta `euler` e registra un avviso.

## Verifica Del Convertitore

```bash
node tests/convert-stgraph-xml.test.js
```

Il test usa un piccolo modello XML sintetico e controlla la conversione di nodi, frecce, testi, colori, proprietà e widget esclusi.
