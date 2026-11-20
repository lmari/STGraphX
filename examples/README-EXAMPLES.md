# Pagina Esempi

Questa cartella contiene anche tutti i file che controllano la finestra `Help -> Modelli di esempio...`.

## File coinvolti

- `examples-catalog.json`
  Catalogo effettivamente usato dall'applicazione.
- `examples-catalog.template.json`
  Modello minimo da cui partire per creare o rifare il catalogo.
- `examples-help.css`
  Stili specifici della finestra esempi.

## Obiettivo

L'idea è che la gestione della pagina esempi sia modificabile senza intervenire in `app.js` o `styles.css`, salvo cambiamenti strutturali del renderer.

## Struttura del catalogo

Il file `examples-catalog.json` supporta questi campi:

- `title`
- `intro`
- `layout`
- `entries`
- `sections`

I testi possono essere:

- stringhe semplici
- oggetti localizzati con chiavi `it` e `en`

## Layout dal JSON

La sezione `layout` controlla il layout di base:

- `variant`: `list`, `compact`, `stack`
- `showPaths`: mostra o nasconde il path `examples/...`
- `dense`: riduce gli spazi verticali
- `openLabel`: testo del pulsante di apertura

## Organizzazione degli esempi

Puoi usare:

- `entries` per un elenco semplice
- `sections` per raggruppare gli esempi per tema

Ogni entry supporta:

- `file`
- `label`
- `summary`

## Layout dal CSS

Se vuoi cambiare l'aspetto grafico, intervieni in:

- `examples-help.css`

Classi principali:

- `.examples-help-card`
- `.examples-help-content`
- `.example-entry`
- `.example-entry-title`
- `.example-entry-path`
- `.example-entry-desc`
- `.examples-section`
- `.examples-section-title`
- `.examples-section-intro`
- `.examples-section-list`

Attributi/classi dinamiche applicate dal renderer:

- `data-layout-variant="list|compact|stack"` su `.examples-help-content`
- `.dense` su `.examples-help-content`

## Nota tecnica

Il renderer carica dinamicamente:

- `examples/examples-catalog.json`
- `examples/examples-help.css`

Questo vale sia nella shell web sia nella shell desktop pacchettizzata, perché `examples/**/*` è incluso nel packaging.

## Regressione lineare con SGD

[`sgd.json`](sgd.json) contiene un esempio documentato di regressione lineare
con mini-batch. Le note interne descrivono formule, configurazione e limiti;
i riferimenti nelle note sono link cliccabili ai nodi, che includono una
descrizione del proprio ruolo.

- `X` e `Y` contengono le coppie del dataset, sintetiche per impostazione
  predefinita, sostituibili con vettori o letture XLSX. Il numero di dati è
  ricavato automaticamente. Servono almeno tre coppie e almeno due ascisse
  distinte nel training.
- `trainFraction` e la permutazione fissa `split` separano training e testing.
  Per dati già separati, concatenare training e test, usare `split=range(n)`
  e impostare `nTrain` al numero di osservazioni di training.
- `bSize` controlla i mini-batch (1 per SGD, `nTrain` per full batch), `lr`
  il learning rate e `trainSteps` il numero di aggiornamenti. Mantenere
  `t0=0`, `dt=1`; estendere `t1` oltre `trainSteps` per vedere i pesi congelati.
- `trainRMSE` e `testRMSE` distinguono adattamento e generalizzazione.
  La prima è calcolata fino a `trainSteps` incluso, la seconda solo da quel
  passo in avanti, a pesi congelati. Fuori dalla fase pertinente valgono `null`:
  il grafico omette i punti e conserva lo storico. Al confine sono disponibili
  entrambe per il confronto finale.
  Il precedente nodo `test` misurava soltanto l’errore di training.
  Anche il riferimento ai minimi quadrati usa esclusivamente il training.

Il seme predefinito è 42. Il test `node tests/sgd-example.test.js`, incluso in
`npm run check`, verifica riproducibilità, partizioni, mini-batch, congelamento,
metriche, dati personalizzati e indipendenza dell’apprendimento dai target di test.

## Multi-layer perceptron

[`mlp.json`](mlp.json) apprende la relazione non lineare `y=x²` con una rete
1–4–1: un ingresso, uno strato nascosto `tanh` e un’uscita lineare. Il numero
di neuroni nascosti è configurabile tramite `hiddenSize` (intero positivo).
Le note interne, con link ai nodi, spiegano forward pass e backpropagation.

Il modello espone i pesi `W1`, `W2`, i bias `b1`, `b2` e i rispettivi gradienti.
Ottimizza metà dell’errore quadratico medio mediante aggiornamenti simultanei.
Di default usa tutto il training per ogni aggiornamento; `bSize` permette di
passare a SGD o mini-batch. `X`, `Y`, split e dimensioni dei dati sono
personalizzabili come nell’esempio SGD; adattare anche la griglia `plotX`.

Con seme 42, learning rate 0.1 e 1500 aggiornamenti, l’RMSE finale è circa
0.043 sul training e 0.098 sul test. `trainRMSE` è disponibile fino all’ultimo
aggiornamento incluso, `testRMSE` solo da quel passo in avanti; poi i pesi
restano congelati. Non sono previste normalizzazione automatica, classificazione,
regolarizzazione o selezione degli iperparametri tramite validation set.

Il test `node tests/mlp-example.test.js`, incluso in `npm run check`, verifica
il modello con il motore JavaScript: gradienti mediante differenze finite,
aggiornamenti simultanei, convergenza, riproducibilità, congelamento, variazioni
del numero di neuroni e indipendenza dai target del testing.
