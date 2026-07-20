# STGraphX Quick Start For Developers

Luca Mari, versione 20 luglio 2026

Copyright (c) 2026 Luca Mari

Questo file descrive ciò che serve a chi sviluppa o distribuisce STGraphX nelle tre modalità basilari:

- editor completo;
- visualizzatore via browser;
- API JavaScript.

Per dettagli ulteriori:

- `README.md`
- `README-ARCHITECTURE.md`
- `README-PLAYER.md`

## Licenza

STGraphX è distribuito sotto licenza Mozilla Public License 2.0 (`MPL-2.0`).

Quando distribuisci l'editor, il player o l'API JavaScript, includi sempre anche il file `LICENSE`.

## 1. Prima di cominciare

### 1.1 Prerequisiti generali

Nella cartella del progetto:

```bash
npm install
npm run check
```

Versioni utili da verificare:

```bash
node -v
npm -v
```

### 1.2 Risorse da tenere presenti

In tutte le modalità possono entrare in gioco anche:

- file JSON di modelli;
- file JSON di sottomodelli;
- file CSV usati da `readData(...)`.

Quando prepari distribuzioni o demo, devi includere anche queste risorse, non solo gli script.

## 2. Editor completo

### 2.1 A cosa serve

L'editor serve per:

- costruire modelli;
- modificarli;
- eseguirli;
- configurare widget;
- usare strumenti di supporto come help, analisi, debugger e 8-upla.

L'editor ha due shell:

- web;
- desktop con Electron.

### 2.2 Cosa ti serve per svilupparlo

Ti serve il repository completo, con almeno:

- `index.html`
- `styles.css`
- `app.js`
- `widgets.js`
- `semantic.js`
- `graph-functions.js`
- `i18n-inline.js`
- `examples/`
- `help/`
- `electron/main.js`
- `electron/preload.js`
- `scripts/dev-server.js`
- `package.json`

### 2.3 Quali file devono essere presenti per farlo funzionare

Per la shell web editor:

- `index.html`
- `styles.css`
- `app.js`
- `widgets.js`
- `semantic.js`
- `graph-functions.js`
- `i18n-inline.js`
- `examples/`
- `help/`

Per la shell desktop editor:

- tutti i file della shell web;
- `electron/main.js`
- `electron/preload.js`
- `package.json`

Se vuoi aprire modelli di esempio o modelli reali che usano risorse esterne, devono essere presenti anche:

- i modelli `.json`;
- i sottomodelli;
- i file CSV.

### 2.4 Dove devono stare i file

Nel repository di sviluppo, i file stanno già nelle posizioni corrette.

Per una distribuzione web dell'editor, una struttura minima coerente è:

```text
site/
  index.html
  styles.css
  app.js
  widgets.js
  semantic.js
  graph-functions.js
  i18n-inline.js
  examples/
  help/
```

Per la distribuzione desktop, non devi ricostruire a mano la struttura: la genera il packaging Electron.

### 2.5 Serve un server web?

Per la shell web:

- sì, di fatto sì;
- l'uso corretto è via `http:` o `https:`.

Avvio in sviluppo:

```bash
npm run start:web
```

URL tipico:

```text
http://localhost:8080/
```

Per la shell desktop:

- no, non serve un server web separato.

Avvio in sviluppo:

```bash
npm run start:desktop
```

Lingua forzata:

```bash
npm run start:desktop -- --lang=it
npm run start:desktop -- --lang=en
```

### 2.6 Cosa distribuire

Per distribuire l'editor web:

- `index.html`
- `styles.css`
- `app.js`
- `widgets.js`
- `semantic.js`
- `graph-functions.js`
- `i18n-inline.js`
- `examples/`
- `help/`

Per distribuire l'editor desktop:

1. genera la build unpacked:

```bash
npm run pack
```

2. genera il pacchetto distribuibile:

```bash
npm run dist
```

oppure:

```bash
npm run dist:linux
npm run dist:win
npm run dist:mac
```

Distribuisci:

- il contenuto generato in `dist/`;
- oppure, per test interni, la build unpacked nella sottocartella della piattaforma, per esempio `dist/linux-unpacked/`.

## 3. Visualizzatore Via Browser

### 3.1 A cosa serve

Il visualizzatore via browser, cioè il player, serve per:

- pubblicare un modello già costruito;
- usarlo senza strumenti di editing;
- incorporarlo in pagine web.

### 3.2 Cosa ti serve per svilupparlo

Ti serve il repository completo oppure almeno questi file:

- `player-runtime-loader.js`
- `i18n-inline.js`
- `graph-functions.js`
- `semantic.js`
- `runtime-shared.js`
- `runtime-core.js`
- `runtime-loader.js`
- `runtime-session.js`
- `runtime-controller.js`
- `player-shell.js`
- `scripts/build-player-bundle.js`

Se vuoi usare il bundle unico, devi anche generarlo.

### 3.3 Quali file devono essere presenti per farlo funzionare

Configurazione consigliata:

- una pagina HTML che usa il player;
- `player-runtime-loader.js`;
- `build/player/stgraphx-player.min.js`
- il modello JSON;
- eventuali sottomodelli;
- eventuali CSV.

Se non usi il bundle unico, devono essere presenti invece i singoli file runtime:

- `i18n-inline.js`
- `graph-functions.js`
- `semantic.js`
- `runtime-shared.js`
- `runtime-core.js`
- `runtime-loader.js`
- `runtime-session.js`
- `runtime-controller.js`
- `player-shell.js`

### 3.4 Dove devono stare i file

Una struttura semplice e consigliata è:

```text
site/
  mypage.html
  player-runtime-loader.js
  build/
    player/
      stgraphx-player.min.js
  models/
    mio-modello.json
    sotto1.json
    dati.csv
```

Esempio minimo in `mypage.html`:

```html
<script src="player-runtime-loader.js"></script>

<stgraphx-player
  src="models/mio-modello.json"
  lang="it"
  zoom="0.9"
  controls="full">
</stgraphx-player>
```

### 3.5 Serve un server web?

Sì.

Per sviluppare e provare il player usa:

```bash
npm run build:player
npm run start:web
```

URL utili:

```text
http://localhost:8080/player-demo.html
http://localhost:8080/tests/index.html
http://localhost:8080/tests/player_smoke_widgets.html
http://localhost:8080/tests/player_matrix_smoke.html
http://localhost:8080/tests/player_abm_space_smoke.html
```

Il caricamento diretto via `file:` non è una base affidabile per il player.

### 3.6 Cosa distribuire

Strada consigliata:

- `player-runtime-loader.js`
- `build/player/stgraphx-player.min.js`
- la tua pagina HTML
- i modelli JSON
- sottomodelli e CSV, se presenti

Alternativa non minificata:

- `player-runtime-loader.js`
- `build/player/stgraphx-player.js`
- la tua pagina HTML
- le risorse del modello

Per generare il bundle:

```bash
npm run build:player
```

Per ottenere anche la versione minificata:

```bash
npm install --save-dev terser
npm run build:player
```

## 4. API JavaScript

### 4.1 A cosa serve

L'API JavaScript serve per controllare STGraphX da codice.

Ci sono due casi:

- API del player dentro una pagina web;
- runtime headless in Node.js.

### 4.2 Cosa ti serve per svilupparla

Per l'API web ti serve:

- tutto ciò che serve al player;
- una tua pagina HTML;
- un tuo script JavaScript.

Per il runtime headless Node.js ti serve:

- `headless-runtime.js`
- `i18n-inline.js`
- `graph-functions.js`
- `semantic.js`
- `runtime-shared.js`
- `runtime-core.js`
- `runtime-loader.js`
- `runtime-session.js`
- `runtime-controller.js`
- il tuo script Node.js

### 4.3 Quali file devono essere presenti per farla funzionare

Caso A: API del player in pagina web.

Devono essere presenti:

- la tua pagina HTML;
- `player-runtime-loader.js`;
- il bundle del player oppure i file sorgente del player;
- il file JSON del modello;
- il tuo script JavaScript, se separato.

Caso B: runtime headless in Node.js.

Devono essere presenti:

- `headless-runtime.js`
- `i18n-inline.js`
- `graph-functions.js`
- `semantic.js`
- `runtime-shared.js`
- `runtime-core.js`
- `runtime-loader.js`
- `runtime-session.js`
- `runtime-controller.js`
- il tuo script `.js`
- il modello JSON
- eventuali sottomodelli e CSV

### 4.4 Dove devono stare i file

Per l'API web, una struttura semplice può essere:

```text
site/
  api-demo.html
  player-runtime-loader.js
  build/
    player/
      stgraphx-player.min.js
  models/
    sir.json
```

Per l'API headless Node.js, una struttura semplice può essere:

```text
project/
  my-script.js
  headless-runtime.js
  i18n-inline.js
  graph-functions.js
  semantic.js
  runtime-shared.js
  runtime-core.js
  runtime-loader.js
  runtime-session.js
  runtime-controller.js
  models/
    sir.json
```

Se il modello usa sottomodelli o CSV, tienili in posizioni coerenti con i path usati dal modello. Se carichi il modello da oggetto invece che da file, devi passare un `basePath` corretto quando serve.

### 4.5 Serve un server web?

Per l'API del player in pagina web:

- sì, è fortemente consigliato usare un server web attivo;
- valgono le stesse considerazioni del player embedded.

Per il runtime headless in Node.js:

- no.

### 4.6 Cosa distribuire

Per uso in pagina web:

- gli stessi file del player embedded;
- il tuo script applicativo;
- la tua pagina HTML;
- i modelli e le loro risorse.

Per uso in Node.js:

- `headless-runtime.js`
- `i18n-inline.js`
- `graph-functions.js`
- `semantic.js`
- `runtime-shared.js`
- `runtime-core.js`
- `runtime-loader.js`
- `runtime-session.js`
- `runtime-controller.js`
- il tuo script
- i modelli e le loro risorse

### 4.7 Esempi minimi

API del player in pagina web:

```html
<script src="player-runtime-loader.js"></script>
<stgraphx-player id="p1" src="models/sir.json"></stgraphx-player>

<button id="stepBtn" type="button">Passo</button>
<pre id="outputBox"></pre>

<script>
  async function demo() {
    await customElements.whenDefined("stgraphx-player");
    const player = document.getElementById("p1");
    const stepBtn = document.getElementById("stepBtn");
    const outputBox = document.getElementById("outputBox");

    function refreshOutput() {
      outputBox.textContent = JSON.stringify({
        time: player.getTime(),
        outputs: player.getOutputs()
      }, null, 2);
    }

    await player.ready;
    refreshOutput();

    stepBtn.addEventListener("click", async () => {
      await player.step();
      refreshOutput();
    });
  }

  demo().catch(console.error);
</script>
```

Runtime headless in Node.js:

```js
const { STGraphXHeadlessRuntime } = require("./headless-runtime.js");

async function main() {
  const runtime = await STGraphXHeadlessRuntime.load({
    src: "models/sir.json",
    lang: "it"
  });

  await runtime.run();
  console.log(runtime.getOutputs());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

Esecuzione:

```bash
node my-script.js
```

## 5. Flussi Rapidi Consigliati

### 5.1 Editor

```bash
npm install
npm run check
npm run start:desktop
```

### 5.2 Player

```bash
npm run build:player
npm run start:web
```

Poi apri:

```text
http://localhost:8080/player-demo.html
```

### 5.3 API headless

```bash
node tests/headless-demo.js
```
