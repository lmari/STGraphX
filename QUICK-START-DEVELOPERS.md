# STGraphX: Quick start per sviluppatori

versione 31 agosto 2026

Copyright (c) 2026 Luca Mari

Questa guida serve a sviluppare e distribuire STGraphX.

Le modalità basilari sono:

- editor completo via web;
- editor desktop con Electron;
- editor desktop con Tauri;
- visualizzatore embedded via browser (player);
- API JavaScript, nel player o in Node.js.

Per l'uso dell'applicazione, invece che per il suo sviluppo, si veda `QUICK-START-USERS.md`. Per dettagli architetturali si veda `README-ARCHITECTURE.md`. Per il player si veda `README-PLAYER.md`.

## Licenza

STGraphX è distribuito sotto licenza Mozilla Public License 2.0 (`MPL-2.0`).

In ogni distribuzione si deve includere `LICENSE`. Se si distribuisce anche codice di terze parti separatamente, conservare le rispettive note di licenza.

## 1. Preparazione dell'ambiente di sviluppo

Nella radice del repository:

```bash
npm install
npm run check
```

Verificare le versioni di Node e npm:

```bash
node -v
npm -v
```

Per produrre la versione Tauri serve inoltre una toolchain Rust stabile:

```bash
rustup default stable
cargo --version
rustc --version
```

Su Linux, la macchina di build Tauri deve avere anche le librerie di sviluppo del WebView di sistema. Non sono richieste agli utenti finali che installano un pacchetto Tauri già costruito.

## 2. Editor completo

L'editor costruisce, modifica ed esegue modelli e comprende widget, help, analisi, debugger e generazione della 8-upla. Il renderer è condiviso tra le tre shell (web, Electron, Tauri); cambiano solo avvio, accesso al filesystem e packaging.

### 2.1 Componenti del renderer condiviso

Le shell usano `index.html` e i file JavaScript/CSS referenziati da esso. In particolare sono necessari:

- `app.js`, `styles.css`, `widgets.js`;
- `semantic.js`, `graph-functions.js`, `i18n-inline.js`;
- `runtime-*.js`;
- `local-functions-core.js`, `help-content.js`, `model-analysis-*.js`, `watch-debugger-*.js`;
- `platform/*.js`;
- `examples/`, `help/`, `icon.svg`, `icon.png`, `icon.ico`.

Non si dovrebbe creare a mano una lista alternativa per Electron o Tauri: i rispettivi processi di packaging includono le risorse necessarie.

### 2.2 Editor web

#### Sviluppo

```bash
npm run start:web
```

Aprire con:

```text
http://127.0.0.1:8000/
```

Il server di sviluppo fa riferimento alla radice del repository. L'editor web va usato tramite `http:` o `https:`. L'apertura diretta di `index.html` con `file:` ha limitazioni nel caricamento di risorse e nell'accesso ai file.

#### Distribuzione

Non esiste per ora un comando separato `build:web`: occorre preparare una directory pubblicabile che conservi la struttura relativa del renderer. Una distribuzione minima affidabile è:

```text
site/
  index.html
  styles.css
  app.js
  widgets.js
  semantic.js
  graph-functions.js
  i18n-inline.js
  runtime-shared.js
  runtime-core.js
  runtime-loader.js
  runtime-session.js
  runtime-controller.js
  local-functions-core.js
  help-content.js
  model-analysis-core.js
  model-analysis-ui.js
  watch-debugger-core.js
  watch-debugger-ui.js
  platform/
  examples/
  help/
  icon.svg
  icon.png
  icon.ico
  LICENSE
```

Pubblicare `site/` come document root di un server HTTP(S). I modelli dell'utente possono stare, per esempio, in `site/models/`; sottomodelli e CSV devono rispettare i path relativi dichiarati nel JSON.

Non distribuire `node_modules/`, `electron/`, `src-tauri/`, `package-lock.json` o gli script di sviluppo se si sta distribuendo soltanto l'editor web.

### 2.3 Shell desktop Electron

#### Sviluppo

```bash
npm run start:desktop
```

Per forzare la lingua:

```bash
npm run start:desktop -- --lang=it
npm run start:desktop -- --lang=en
```

Electron non richiede un server web esterno: carica l'editor dal pacchetto dell'applicazione e il preload espone il bridge filesystem.

#### Build di prova

```bash
npm run pack
```

Questo genera una directory completa, non un installer. Su Linux corrente il risultato è tipicamente:

```text
dist/linux-unpacked/
  stgraphx
  resources/
  ... librerie Electron necessarie ...
```

Per una prova interna eseguire `dist/linux-unpacked/stgraphx`. Se si distribuisce questa variante, occorre distribuire l'intera directory `linux-unpacked/`, e non il solo eseguibile.

#### Build da distribuire

```bash
npm run dist
```

Oppure, quando supportato dalla macchina o dalla CI:

```bash
npm run dist:linux
npm run dist:win
npm run dist:mac
```

Gli artefatti finali sono in `dist/`. In base al target configurato possono essere:

- Linux: `.AppImage` e archivio `.tar.gz`;
- Windows: installer NSIS e variante portabile;
- macOS: `.dmg` e `.zip`.

Distribuire il singolo installer, archivio o artefatto portabile destinato alla piattaforma dell'utente. Non distribuire l'intera cartella `dist/`, che contiene anche file tecnici di `electron-builder`, metadata e, se presente, lo staging Tauri `dist/tauri/`.

### 2.4 Shell desktop Tauri

Tauri è una build desktop alternativa sperimentale. Riusa il renderer dell'editor, ma usa WebView di sistema e comandi Rust per file, cartelle, dialoghi e clipboard.

#### Sviluppo

```bash
npm run start:tauri
```

Per forzare la lingua:

```bash
npm run start:tauri -- --lang=it
npm run start:tauri -- --lang=en
```

Il comando avvia il server web di sviluppo sulla porta `8000` e la finestra Tauri. Non avviare separatamente `npm run start:web` sulla stessa porta.

#### Staging del frontend

```bash
npm run build:tauri:frontend
```

Questo copia gli asset del renderer in:

```text
dist/tauri/
```

Quella cartella è un input temporaneo del packaging Tauri. Non contiene l'eseguibile Rust e non è, da sola, una distribuzione desktop Tauri. Può essere rigenerata e non va consegnata agli utenti finali.

#### Build di prova

```bash
npm run build:tauri -- --debug --no-bundle
```

Questo compila un eseguibile di debug, tipicamente:

```text
src-tauri/target/debug/stgraphx-tauri
```

È utile per verifiche locali, ma non è da distribuire: non è un pacchetto installabile e dipende dall'ambiente di build.

#### Build da distribuire

```bash
npm run build:tauri
```

Il comando esegue prima lo staging `dist/tauri/`, poi la build Rust in release. Gli artefatti distribuibili sono generati sotto:

```text
src-tauri/target/release/bundle/
```

Le sottocartelle e i formati dipendono dal sistema operativo e dagli strumenti presenti nella macchina di build. Su Linux la build corrente genera AppImage, `.deb` e `.rpm`; su Windows e macOS vengono generati i formati previsti da Tauri per quelle piattaforme. Sui sistemi Linux recenti, lo script imposta automaticamente `NO_STRIP=1` per l'AppImage: evita un'incompatibilita di `linuxdeploy` con librerie che usano `SHT_RELR`, al solo costo di un possibile aumento delle dimensioni del pacchetto.

Distribuisci il pacchetto o installer nella sottocartella `bundle/` appropriata, non `dist/tauri/`, `src-tauri/target/debug/`, `src-tauri/target/release/` nel suo insieme, né il repository. In una release pubblica includi anche `LICENSE` accanto all'artefatto se il formato non la incorpora visibilmente.

### 2.5 Confronto rapido delle build desktop

| Shell | Comando di prova | Output di prova | Comando distribuibile | Cosa distribuire |
| --- | --- | --- | --- | --- |
| Electron | `npm run pack` | `dist/<piattaforma>-unpacked/` | `npm run dist` | installer, archivio o portabile in `dist/` |
| Tauri | `npm run build:tauri -- --debug --no-bundle` | `src-tauri/target/debug/stgraphx-tauri` | `npm run build:tauri` | pacchetto in `src-tauri/target/release/bundle/` |

Le build sono native alla piattaforma sulla quale vengono eseguite. Per produrre tutte le piattaforme in modo affidabile, usa build machine o CI dedicate.

## 3. Visualizzatore via browser

### 3.1 A cosa serve

Il player pubblica un modello già costruito, senza strumenti di editing, e può essere incorporato in una pagina web.

### 3.2 Build del player

```bash
npm run build:player
```

Il comando genera:

```text
build/player/stgraphx-player.js
build/player/stgraphx-player.min.js
```

La versione `.min.js` viene generata perché `terser` è già una dipendenza di sviluppo del progetto. Non installarlo nuovamente.

### 3.3 Cosa distribuire

Distribuzione consigliata:

```text
site/
  mypage.html
  player-runtime-loader.js
  build/
    player/
      stgraphx-player.min.js
  models/
    mio-modello.json
    sotto-modello.json
    dati.csv
  LICENSE
```

In `mypage.html`:

```html
<script src="player-runtime-loader.js"></script>

<stgraphx-player
  src="models/mio-modello.json"
  lang="it"
  zoom="0.9"
  controls="full">
</stgraphx-player>
```

Servire la directory `site/` via HTTP(S). Il player non va distribuito o provato affidandosi a `file:`.

Se non si usa il bundle, distribuire invece `player-runtime-loader.js` e i singoli moduli runtime elencati in `scripts/build-player-bundle.js`, mantenendoli nelle stesse posizioni relative.

Per le prove locali:

```bash
npm run build:player
npm run start:web
```

Apri `http://127.0.0.1:8000/player-demo.html` oppure `http://127.0.0.1:8000/tests/index.html`.

## 4. API JavaScript

L'API può essere usata nel player in una pagina web oppure in modalità headless da Node.js.

### 4.1 API del player in una pagina web

Occorre distribuire gli stessi file del player embedded, più la pagina e gli script dell'applicazione. Serve un server HTTP(S).

```html
<script src="player-runtime-loader.js"></script>
<stgraphx-player id="p1" src="models/sir.json"></stgraphx-player>

<button id="stepBtn" type="button">Passo</button>
<pre id="outputBox"></pre>

<script>
  async function demo() {
    await customElements.whenDefined("stgraphx-player");
    const player = document.getElementById("p1");
    await player.ready;

    document.getElementById("stepBtn").addEventListener("click", async () => {
      await player.step();
      document.getElementById("outputBox").textContent = JSON.stringify({
        time: player.getTime(),
        outputs: player.getOutputs()
      }, null, 2);
    });
  }

  demo().catch(console.error);
</script>
```

### 4.2 Runtime headless Node.js

Non serve un server web. Metti insieme:

- `headless-runtime.js`;
- `i18n-inline.js`, `graph-functions.js`, `semantic.js`;
- `runtime-shared.js`, `runtime-core.js`, `runtime-loader.js`, `runtime-session.js`, `runtime-controller.js`;
- il tuo script Node.js;
- modelli, sottomodelli e CSV.

Una struttura possibile:

```text
project/
  my-script.js
  headless-runtime.js
  i18n-inline.js
  graph-functions.js
  semantic.js
  runtime-*.js
  models/
    sir.json
  LICENSE
```

Esempio:

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

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

Esegui:

```bash
node my-script.js
```

## 5. Flussi Rapidi

### Editor Electron

```bash
npm install
npm run check
npm run start:desktop
npm run pack
npm run dist
```

### Editor Tauri

```bash
rustup default stable
npm install
npm run check
npm run start:tauri
npm run build:tauri
```

### Player

```bash
npm run build:player
npm run start:web
```

### API Headless

```bash
node tests/headless-demo.js
```
