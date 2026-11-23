# STGraphX: sorgente matematico

Il formato testuale `.stgx` (UTF-8) descrive le definizioni matematiche di un
modello. È una rappresentazione alternativa per importazione ed esportazione;
il salvataggio ordinario del modello resta nel formato JSON esistente.
Il salvataggio in due file separati, matematica e presentazione, non è ancora
implementato.

## Comandi dell'editor

Nel menu **File**:

- **Salva sorgente…** salva direttamente le definizioni del modello corrente in
  un file `.stgx`, senza modificare lo stato del salvataggio JSON.
- **Nuovo modello da sorgente…** apre un editor ridimensionabile e spostabile
  per scrivere, incollare o importare un file `.stgx`/`.txt`. Il testo ha
  evidenziazione della sintassi e validazione automatica; **Vai all’errore**
  raggiunge la posizione segnalata. Ctrl+Spazio offre completamenti dei nomi
  presenti nel testo, delle parole chiave e del catalogo delle espressioni,
  con firme e descrizioni delle funzioni. Il catalogo comprende anche funzioni
  utilizzabili solo in contesti specifici: la validazione verifica il sorgente
  completo. Frecce selezionano un suggerimento, Invio/Tab lo inseriscono,
  Esc chiude la lista. Tab/Maiusc+Tab regolano il rientro delle righe;
  Invio mantiene il rientro. Il menu contestuale offre selezione, taglio,
  copia e incolla, ed è accessibile anche con Maiusc+F10.
  **Crea in una nuova scheda** (Ctrl+Invio) valida il sorgente e crea un modello
  indipendente, da salvare poi in JSON. Il modello precedente e le sue modifiche
  restano nella propria scheda. Chiudendo l’editor il testo viene conservato
  per la successiva apertura nella sessione corrente.

L'importazione genera nodi con stili predefiniti, disposti su una griglia,
e archi ricavati dai riferimenti nelle espressioni, comprese le dipendenze di
inizializzazione degli stati. Non crea widget. Gli errori riportano la posizione
della dichiarazione e il nome coinvolto; gli errori di parentesi riportano la
posizione del carattere. Un errore impedisce la creazione del nuovo modello.

## Sintassi v1

```text
# STGraphX mathematical source v1
t0 = 0
t1 = 100
dt = 1 / 10

parameter k = 0.2
input u = sin(time)
output x = 0; this + dt * (u - k * this)
y = 2 * x
```

Una dichiarazione occupa una riga logica:

| Forma | Significato |
| --- | --- |
| `u = espressione` | Variabile algebrica |
| `parameter k = espressione` | Parametro, valutato all'inizializzazione |
| `x = iniziale; prossimo` | Nodo di stato |
| `input u = espressione` | Variabile algebrica impostabile dall'esterno |
| `output y = espressione` | Variabile marcata come output |
| `global parameter k = espressione` | Parametro globale |

`output` è combinabile con gli altri qualificatori, anche su uno stato.
`input` è ammesso solo sulle variabili algebriche senza dipendenze da altri nodi, `global` solo sui parametri.
Un valore costante scritto senza `parameter` resta una variabile algebrica:
non viene indovinato il tipo dalla formula.

I tempi sono facoltativi, con default `t0 = 0`, `t1 = 10`, `dt = 1`.
Accettano costanti numeriche e operazioni aritmetiche, senza riferimenti a
variabili o chiamate a funzioni. `dt` deve essere diverso da zero e orientato
da `t0` verso `t1`; sono ammessi passi negativi.

Le espressioni usano il linguaggio STGraphX esistente, inclusi vettori, matrici,
condizionali e `integral(...)` nelle transizioni. `this` mantiene il significato
di valore corrente dello stato. Le definizioni possono riferirsi a variabili
scritte successivamente. Gli stati avanzano secondo la semantica simultanea del
runtime: l'ordine delle righe non li trasforma in assegnamenti sequenziali.
Si mantiene l'ordine delle dichiarazioni per la valutazione di nodi indipendenti,
quindi riordinare estrazioni casuali può cambiare la sequenza associata ai nodi.

`#` e `//` iniziano commenti fino a fine riga, salvo all'interno di stringhe.
Le righe continuano all'interno di parentesi; per esempio:

```text
output x = (
  1 + 2
); (
  this + dt * u
)
v = [
  1, 2, 3
]
```

Il punto e virgola separa le due formule di uno stato; non termina le
istruzioni. Non sono ammessi nomi duplicati, nomi riservati, riferimenti
sconosciuti o dipendenze cicliche di inizializzazione/algebriche. Sono ammessi
i cicli che passano attraverso transizioni di stato.

Due direttive facoltative conservano le scelte numeriche che incidono sui
risultati:

```text
@integrator = rk4
@seed = 12345
```

Gli integratori ammessi sono `euler` (default) e `rk4`. Il seme è un intero
fra 0 e 4294967295; se manca, il modello non ha un seme fissato. Non sono
incluse modalità manuali/temporizzate, ritardi o comandi di esecuzione.

Le unità fanno parte della matematica perché possono introdurre conversioni
numeriche. Si conservano tramite annotazioni facoltative, anche prima della
definizione della variabile:

```text
@timeUnit = "giorno"
a = 1
@unit a = "m"
b = 100
@unit b = "cm"
output totale = a + b
@unit totale = "m"
```

Il valore di `totale` nell'editor è `2`. Le stringhe usano la sintassi JSON
con virgolette doppie. La validazione dimensionale resta quella dell'editor;
il codec conserva le unità dichiarate senza reinterpretarle.

### Funzioni locali

```text
function affine(value, scale, offset) = value * scale + offset
function double(value) = affine(value, 2, 0)
output result = double(inputValue)
parameter inputValue = 3
```

Le funzioni possono comparire prima o dopo i nodi e le altre funzioni che le
richiamano. Sono ammessi zero o più parametri e corpi su più righe fra
parentesi. Valgono le regole delle funzioni locali dell'editor: nomi non
riservati, nessun conflitto con i nodi e nessun parametro duplicato. Il corpo
può usare i parametri, le funzioni del linguaggio e le altre funzioni locali;
i valori dei nodi vanno passati come argomenti. Non sono ammessi `this`,
`integral(...)`, chiamate ricorsive/cicliche o accessi alle proprietà/file
ancora esclusi dal formato. Il numero di argomenti delle chiamate locali è
controllato prima dell'importazione.

Le funzioni locali si richiamano con `f(...)`; non possono essere passate
come primo argomento di `reduce`, perché il runtime di riferimento non le
espone come callback. `reduce` con operatori e funzioni built-in resta
utilizzabile. Le descrizioni delle funzioni sono metadati esclusi dal sorgente.

### Definizioni personalizzate delle unità

```text
@unitDefinition ha = "10000*m^2"
a = 1
@unit a = "ha"
b = 5000
@unit b = "m^2"
output total = a + b
@unit total = "ha"
```

Nell'editor `total` vale `1.5`. Le definizioni riusano la sintassi delle unità
dell'applicazione e possono riferirsi a unità definite successivamente.
Simboli duplicati, sintassi non valida e dipendenze cicliche vengono segnalati
con la posizione della dichiarazione coinvolta. L'esportazione conserva simbolo
e definizione; i nomi estesi al singolare/plurale sono metadati esclusi.
Il controllo dimensionale delle formule rimane affidato all'editor.

Queste aggiunte estendono la sintassi v1 senza cambiare le dichiarazioni
precedenti né il formato JSON dei modelli.

## Ambito e limiti

Il formato supporta parametri, variabili algebriche, stati, funzioni locali
e definizioni personalizzate di unità.
L'esportazione rifiuta esplicitamente sottomodelli, nodi bozza,
proprietà del modello e formule che usano `readData`, `getProperty`,
`setProperty`, `getModelProperty` o `setModelProperty`. Non esporta un
sorgente parziale quando trova questi costrutti. ABM e altre estensioni del
linguaggio non hanno ancora una copertura di equivalenza dedicata a questo
formato.

Il sorgente conserva le definizioni, non uno snapshot della simulazione:
valori imposti da widget, scenari o API esterne non sostituiscono le formule.
Restano esclusi layout, stile, widget, note, titolo,
intervalli, scenari, debugger e controlli di esecuzione
(`strictDefinitions`, `stopOnRuntimeError`, `checkRanges`, ecc.). Gli archi
manuali privi di riferimenti nelle formule non sono conservati.

L'equivalenza numerica riguarda modelli validi nel sottoinsieme supportato,
con gli stessi input e senza dipendere da questi controlli o metadati esclusi.
I test confrontano gli output e i valori finali del modello JSON e della
versione esportata/reimportata, includendo il modello SIR con RK4 e
le fixture con funzioni locali e casualità riproducibile. Il test browser
verifica anche le conversioni numeriche con unità personalizzate.

## API JavaScript

`math-source-core.js` non dipende dal DOM né dalla shell. Per le definizioni
delle unità riusa `unit-analysis-core.js`, già caricato dall’editor; il modulo
va distribuito anche accanto al codec quando lo si usa in Node.js. In Node.js:

```js
const { STGraphXHeadlessRuntime } = require('./headless-runtime.js');
const { createCodec } = require('./math-source-core.js');
const codec = createCodec(globalThis.GraphSemantics);
const model = codec.parse('output x = 0; this + 1\nt1 = 10');
const runtime = await STGraphXHeadlessRuntime.loadFromObject(model);
await runtime.run();
console.log(runtime.getValue('x')); // 10
const source = codec.serialize(model);
```

Il codec produce normali documenti JSON versione 1. Non modifica il motore
JavaScript né il contratto del bridge Rust/WASM. Le possibilità del motore Rust
restano quelle documentate in `rust/README.md`.

## Verifiche

`npm run check` include i test del codec e di equivalenza numerica.
`npm run test:math-source:browser` esegue inoltre un test dell'interfaccia in
Firefox headless con un profilo temporaneo: errori di importazione, lettura di
un file sorgente, nuova scheda, conservazione del modello precedente,
esportazione e stato di salvataggio JSON. Richiede Firefox installato e la
possibilità di aprire un server su localhost; `STGRAPHX_FIREFOX` può indicare
un eseguibile alternativo di Firefox.
