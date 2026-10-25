# STGraphX: API JavaScript headless

versione 25 ottobre 2026

Copyright (c) 2026 Luca Mari

## Scopo

Il runtime headless di STGraphX carica ed esegue un modello JSON senza creare un editor, un canvas o widget. E utile per:

- automatizzare simulazioni;
- integrare un modello in uno script JavaScript;
- elaborare risultati e esportare gli output;
- eseguire modelli in Node.js o in una pagina web.

Per il player visuale incorporabile si veda `README-PLAYER.md`.

## File necessari

### Node.js

Copia nello stesso progetto i moduli runtime richiesti:

```txt
headless-runtime.js
runtime-core.js
runtime-loader.js
runtime-session.js
runtime-controller.js
runtime-shared.js
semantic.js
graph-functions.js
i18n-inline.js
```

Il repository include esempi pronti nella cartella `examples-headless/`.

### Browser

Il modo piu semplice per rendere disponibili i moduli e caricare il loader del player:

```html
<script src="player-runtime-loader.js"></script>
```

Il loader registra anche `STGraphXHeadlessRuntime`, ma non richiede l'uso del custom element `stgraphx-player`.

Per risolvere `src`, sottomodelli e `readData(...)` occorre normalmente servire i file via `http:` o `https:`. L'uso diretto con `file:` dipende dalle limitazioni del browser.

## Caricamento del runtime

In Node.js:

```js
const { STGraphXHeadlessRuntime } = require("./headless-runtime.js");

const runtime = await STGraphXHeadlessRuntime.load({
  src: "examples/sir.json",
  lang: "it"
});
```

In una pagina web, dopo il loader:

```js
const runtime = await STGraphXHeadlessRuntime.load({
  src: "models/sir.json",
  lang: "en"
});
```

Puoi anche caricare direttamente un oggetto o testo JSON:

```js
const runtime = await STGraphXHeadlessRuntime.loadFromObject(modelJson, {
  basePath: "./examples",
  lang: "en"
});

const fromText = await STGraphXHeadlessRuntime.loadFromJsonText(modelText, {
  basePath: "./examples",
  lang: "en"
});
```

Con un modello passato direttamente, `basePath` (Node.js) o `baseUrl` (browser) definiscono la base per sottomodelli e file `readData(...)`.

Sono disponibili anche gli helper CommonJS:

```js
const {
  loadHeadlessRuntimeFromObject,
  loadHeadlessRuntimeFromJsonText,
} = require("./headless-runtime.js");
```

## API

Il runtime espone:

- `reload()`
- `evaluate()`
- `step()`
- `run()`
- `runUntil(time)`
- `reset()`
- `setValue(name, value[, options])`
- `setValues(values[, options])`
- `getValue(name)`
- `getValues(names)`
- `getOutputs()`
- `getOutputHistory()`
- `getOutputHistoryCsv([options])`
- `writeOutputHistoryCsv(path[, options])` in Node.js
- `getTime()`
- `getStatus()`
- `getSettableNames()`
- `setProgressCallback(fn)`

I valori impostabili sono parametri e variabili di input. Per aggiornare subito il modello dopo un assegnamento:

```js
await runtime.setValues({
  beta: 0.4,
  gamma: 0.2,
}, { evaluate: true });
```

## Esempio completo

```js
const { STGraphXHeadlessRuntime } = require("./headless-runtime.js");

async function main() {
  const runtime = await STGraphXHeadlessRuntime.load({
    src: "examples/sir.json",
    lang: "it",
  });

  await runtime.setValues({ beta: 0.4, gamma: 0.2 }, { evaluate: true });
  await runtime.run();

  console.log(runtime.getTime());
  console.log(runtime.getOutputs());
  console.log(runtime.getOutputHistoryCsv());
}

main().catch(console.error);
```

## Output CSV

Per ottenere la storia dei nodi marcati come output:

```js
const csv = runtime.getOutputHistoryCsv();
```

Per limitare le colonne:

```js
const csv = runtime.getOutputHistoryCsv({
  names: ["S", "I", "R"],
});
```

In Node.js puoi scrivere direttamente il file:

```js
const filePath = await runtime.writeOutputHistoryCsv("./out/sir.csv", {
  names: ["S", "I", "R"],
});
```

## Avanzamento

Puoi fornire la callback durante il caricamento:

```js
const runtime = await STGraphXHeadlessRuntime.load({
  src: "examples/sir.json",
  onProgress(info) {
    console.log(info.phase, info.time, info.historyLength);
  },
});
```

Oppure successivamente:

```js
runtime.setProgressCallback((info) => {
  console.log(info.outputs);
});
```

L'oggetto `info` include `phase`, `time`, `outputs`, `historyLength` e `status`.

## Esempi del repository

Esegui l'esempio principale con:

```bash
node examples-headless/run-oscillator.js
```

L'esempio mostra caricamento, assegnazione di input, `runUntil(...)`, callback di avanzamento ed esportazione CSV.

## Licenza

Il runtime headless e distribuito sotto licenza Mozilla Public License 2.0 (`MPL-2.0`). Il testo completo e in `LICENSE`.
