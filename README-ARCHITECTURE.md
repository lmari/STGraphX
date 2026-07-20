# STGraphX: readme tecnico

Luca Mari, versione 20 luglio 2026

STGraphX è un editor ed esecutore di modelli dinamici a grafo orientato.

## Architettura

STGraphX mantiene un unico codice applicativo per due shell:

- web, per accesso da browser via `http:` (e con qualche limitazione anche `file:`);
- desktop, mediante `Electron`.

L'obiettivo è evitare duplicazione del codice applicativo e isolare le differenze di piattaforma, relative solo al layer di accesso a file e cartelle.

## Struttura del progetto

Frontend condiviso:

- `index.html`
- `styles.css`
- `app.js`
- `widgets.js`
- `semantic.js`
- `graph-functions.js`
- `i18n-inline.js`

Shell Electron:

- `electron/main.js`
- `electron/preload.js`

Supporto sviluppo:

- `scripts/dev-server.js`
- `package.json`

## i18n

La localizzazione runtime è concentrata in:

- `i18n-inline.js`

Il renderer legge i testi tramite:

- `window.STGraphXI18nBundles`

Questo evita dipendenze da `fetch(...)` e riduce i problemi in esecuzione locale o in ambienti con policy diverse sui file.

## Separazione delle responsabilità

### Renderer condiviso

Il renderer contiene:

- editor del grafo
- pannelli di configurazione
- runtime dei modelli
- integrazione UI della semantica delle espressioni
- risoluzione dei sottomodelli a livello logico

`app.js` resta il punto di orchestrazione principale della UI:

- selezione e navigazione sul canvas
- menu e finestre flottanti
- gestione file e recenti
- esecuzione del modello
- coordinamento tra sidebar, canvas, semantica e widget

### Modulo widget

`widgets.js` contiene la logica specifica dei widget:

- creazione dei widget
- sanificazione delle opzioni
- rendering dei widget
- rendering del grafico XY
- aggiornamento runtime dei widget
- pannello di configurazione dei widget

Espone nel renderer un namespace condiviso:

- `window.Widgets`

In particolare:

- `window.Widgets.renderWidgets(...)`
- `window.Widgets.refreshWidgetConfigPanel(...)`
- helper di creazione come `addTableWidget(...)`, `addMatrixWidget(...)`, `addSliderWidget(...)`, `addXYChartWidget(...)`

### Modulo funzioni

`graph-functions.js` contiene il catalogo centralizzato del linguaggio:

- funzioni matematiche built-in
- funzioni su vettori e matrici
- generatori casuali
- distribuzioni probabilistiche
- metadatazione delle funzioni e variabili di sistema usata dall'editor e dall'help

Espone in particolare:

- `window.GraphFunctions.createMathScope(...)`
- `window.GraphFunctions.probability`
- `window.GraphFunctions.expressionDocs`

### Modulo semantico

`semantic.js` contiene:

- parser delle espressioni
- AST
- valutazione delle espressioni
- special forms del linguaggio:
  - `array(...)`
  - `map(...)`
  - `filter(...)`
  - `reduce(...)`
  - `append(...)`
  - forme condizionali di `count(...)` e `indicesWhere(...)`
- runtime dei modelli e delle transizioni di stato

In pratica:

- `graph-functions.js` definisce cosa il linguaggio sa fare
- `semantic.js` definisce come il linguaggio viene interpretato

### Layer di piattaforma

`app.js` usa wrapper compatibili per:

- apertura file
- salvataggio file
- scelta cartella

API usate dal renderer:

- `showOpenFilePickerCompat(...)`
- `showSaveFilePickerCompat(...)`
- `showDirectoryPickerCompat(...)`

Questi wrapper preferiscono:

1. `window.STGraphXPlatform` se disponibile
2. API native del browser come fallback
3. fallback HTML input dove necessario

## Electron bridge

### Main process

`electron/main.js` crea la finestra e gestisce tre canali IPC:

- `stgraphx:show-open-dialog`
- `stgraphx:show-save-dialog`
- `stgraphx:show-directory-dialog`

### Preload

`electron/preload.js` espone nel renderer:

- `window.STGraphXPlatform.showOpenFilePicker(...)`
- `window.STGraphXPlatform.showSaveFilePicker(...)`
- `window.STGraphXPlatform.showDirectoryPicker(...)`

Le API esposte imitano il più possibile gli handle del File System Access API del browser, così il renderer non deve conoscere la piattaforma concreta.

## Packaging

Il packaging desktop usa `electron-builder` via `package.json`.

### Primo packaging, passo per passo

La procedura consigliata è questa.

1. Verifica la versione di Node:

```bash
node -v
npm -v
```

2. Installa le dipendenze del progetto:

```bash
npm install
```

3. Controlla che il codice sia sintatticamente coerente:

```bash
npm run check
```

4. Avvia l'app in modalità desktop, prima di impacchettarla:

```bash
npm run start:desktop
```

Se vuoi forzare la lingua della UI nella shell Electron:

```bash
npm run start:desktop -- --lang=en
```

oppure:

```bash
npm run start:desktop -- --lang=it
```

Se non passi `--lang`, la shell Electron prova a usare la lingua del sistema operativo.

## Pagina esempi

La gestione della finestra `Help -> Modelli di esempio...` è mantenuta nella cartella `examples/`.

File principali:

- `examples/examples-catalog.json`
- `examples/examples-catalog.template.json`
- `examples/examples-help.css`
- `examples/README-EXAMPLES.md`

Il renderer carica dinamicamente catalogo e CSS, così contenuti e layout della pagina esempi possono essere mantenuti localmente in quella cartella.

5. Genera una build unpacked di prova:

```bash
npm run pack
```

Questo produce una versione non installer, utile per capire se la shell Electron funziona correttamente.
Provala con un comando come

```bash
./dist/linux-unpacked/stgraphx
```

6. Genera il pacchetto distribuibile per la piattaforma corrente:

```bash
npm run dist
```

7. Se vuoi forzare una piattaforma specifica:

```bash
npm run dist:win
npm run dist:linux
npm run dist:mac
```

### Cosa aspettarsi nella cartella `dist/`

A seconda del sistema operativo, `electron-builder` produrrà file diversi:

- Windows: installer `nsis` e pacchetto `portable`
- Linux: `AppImage` e archivio `tar.gz`
- macOS: `dmg` e `zip`

### Risorse opzionali ma consigliate

La cartella `build/` è predisposta per contenere risorse di packaging, in particolare:

- icone applicative
- eventuali immagini usate dagli installer

Se non inserisci icone personalizzate, il packaging funziona comunque, ma userà i default di Electron o di `electron-builder`.

### Nota sui target cross-platform

In generale, il packaging funziona meglio quando viene eseguito sulla piattaforma destinazione:

- build Windows su Windows
- build macOS su macOS
- build Linux su Linux

Alcuni target possono essere generati anche da altri sistemi, ma per una prima esperienza conviene evitare cross-build aggressivi.

Output previsto:

- cartella `dist/`

### Estensioni possibili

Passi successivi plausibili:

1. icone dedicate per Windows/macOS/Linux
2. packaging firmato
3. eventuale layer di persistenza più esplicito per preferenze applicative
4. eventuale toolbar o splash specifici per la shell desktop

## Avvio

### Versione web

Modalità consigliata:

```bash
npm run start:web
```

In alternativa puoi usare un altro server statico, per esempio:

```bash
python3 -m http.server
```

Note pratiche:

- con Firefox e Chrome funziona spesso anche `file:`, mentre Opera può essere meno affidabile;
- per un uso regolare è preferibile `http:`.
