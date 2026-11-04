# Istruzioni di sviluppo per STGraphX

Queste istruzioni si applicano all'intero repository. Devono restare concise e
stabili: lo stato dettagliato delle funzionalità appartiene ai README e ai
test, non a questo file.

## Fonti di riferimento

- `README-ARCHITECTURE.md` descrive l'architettura dell'applicazione.
- `rust/README.md` descrive lo stato, le capacità e i limiti correnti del
  motore Rust.
- I test e le fixture sono la specifica eseguibile del comportamento atteso.
- `main` è il ramo canonico e deve restare funzionante.

Prima di intervenire su una parte del progetto, leggere le relative fonti e
verificare lo stato del repository. Non copiare qui elenchi destinati a cambiare
frequentemente: aggiornare invece il README pertinente.

## Architettura e responsabilità

- STGraphX mantiene un frontend condiviso per web, Electron e Tauri. Il codice
  condiviso deve restare indipendente dalla shell e usare le astrazioni in
  `platform/` per le operazioni dipendenti dall'ambiente.
- Il motore JavaScript è il percorso di esecuzione predefinito e
  l'implementazione semantica di riferimento.
- Il motore Rust è un'alternativa sperimentale. Non sostituisce la UI e non
  dipende dalla scelta tra Electron e Tauri.
- L'integrazione JavaScript/Rust usa WebAssembly con chiamate a grana grossa:
  il modello viene eseguito interamente da un solo motore. Non dividere
  l'esecuzione dello stesso modello tra Rust e JavaScript.
- Conservare la compatibilità dei documenti salvati. Modifiche al formato JSON
  richiedono una scelta esplicita di versione o migrazione e test dedicati.
- Le stringhe visibili all'utente devono seguire il sistema di localizzazione
  esistente in `i18n-inline.js`; aggiornare insieme i bundle interessati.

## Come indirizzare le modifiche

- UI, editor, widget e comportamento delle shell: intervenire nel frontend
  condiviso o nel layer di piattaforma appropriato. Modificare il motore Rust
  solo se cambia anche il contratto di esecuzione del modello.
- Nuove capacità semantiche: definirle e stabilizzarle prima nel motore
  JavaScript, fissarne i risultati attesi con test o fixture, quindi
  implementarne la parità in Rust.
- Estensione Rust di una capacità JavaScript già stabile: non modificare
  opportunisticamente `semantic.js`, `graph-functions.js`, `runtime-core.js`,
  `runtime-shared.js` o gli altri file del motore JavaScript senza una richiesta
  esplicita.
- Correzione di un bug semantico: aggiungere un test di regressione al motore di
  riferimento, verificare se il problema riguarda anche Rust e, quando
  applicabile, usare la stessa fixture per entrambi.
- Ottimizzazione Rust: mantenere invariati i risultati, conservare i test di
  parità e aggiungere o aggiornare un benchmark quando la prestazione è
  l'obiettivo della modifica.
- ABM: per ora può evolvere nel solo motore JavaScript. Non implementarlo in
  Rust finché la sua semantica non sarà stabilizzata o finché non verrà
  richiesto esplicitamente.

## Stato strategico corrente

- Il percorso Rust deve restare esplicito e sperimentale: non renderlo il
  motore predefinito senza una decisione progettuale e una verifica di
  compatibilità adeguata.
- Prima di ampliare molto il sottoinsieme semantico Rust, i prossimi interventi
  infrastrutturali preferibili sono un controllo preventivo che segnali i
  costrutti non supportati e un corpus di benchmark comparabili tra JavaScript
  e Rust.
- Le successive estensioni non ABM vanno scelte sulla base dei modelli e degli
  esempi realmente usati, mantenendo test di parità. Il compito assegnato nella
  sessione corrente ha comunque precedenza su questa indicazione di roadmap.

## Vincoli del motore Rust

- `rust/stgraphx-engine` deve restare una libreria pura e indipendente da DOM,
  Node.js, Electron, Tauri e API del sistema operativo.
- Il core deve poter essere usato sia nativamente sia tramite WebAssembly.
- Conservare la separazione tra `stgraphx-engine`, `stgraphx-cli` e
  `stgraphx-wasm`.
- Il precedente prototipo Rust sviluppato in un progetto separato non è una
  sorgente da importare: il motore presente in questo repository è stato
  costruito da zero ed è quello canonico.
- Il confine WASM deve rimanere a grana grossa; evitare chiamate ripetute per
  singoli nodi o singole operazioni.
- Le funzioni casuali devono restare riproducibili quando è fornito un seme.
- `rust/Cargo.lock` è versionato. I comandi CI che risolvono o compilano le
  dipendenze devono usare `--locked` dove applicabile.
- Ogni nuova capacità semantica deve avere test Rust e, quando disponibile,
  un test di parità con il motore JavaScript.

## Test e artefatti generati

Per una modifica JavaScript o di integrazione, eseguire dalla radice:

```bash
npm run check
```

Le fixture condivise con Rust devono essere verificate anche dal motore di
riferimento:

```bash
node tests/rust-engine-reference.test.js
```

Per modifiche al workspace Rust, eseguire da `rust/`:

```bash
cargo fmt --all -- --check
cargo clippy --workspace --all-targets --locked -- -D warnings
cargo test --workspace --all-targets --locked
```

Dopo una modifica che incide sul binding o sul comportamento Rust, rigenerare e
verificare il bridge dalla radice:

```bash
npm run build:rust-engine:wasm
node tests/rust-engine-wasm.test.mjs
```

- Non modificare manualmente i file in `rust-engine-wasm/`: sono artefatti
  generati da `wasm-pack`.
- Quando il motore o il binding cambia, versionare insieme gli artefatti WASM
  rigenerati necessari all'applicazione.
- Aggiornare `rust/README.md` quando cambia il sottoinsieme di modelli
  supportato o una limitazione nota.
- Se un controllo non può essere eseguito localmente, dichiararlo e affidarsi
  alla CI prima del merge; non presentarlo come superato.

## Flusso Git

- Partire da un `main` pulito e aggiornato e creare un branch breve e mirato.
- Mantenere le modifiche circoscritte al compito e preservare eventuali
  cambiamenti dell'utente non correlati.
- Preferire pull request con squash merge, dopo il superamento della CI.
- Non lavorare contemporaneamente con più agenti sullo stesso branch non
  sincronizzato. Prima di passare il lavoro tra ambienti, creare commit e
  pubblicare il branch; nell'altro ambiente eseguire `git fetch`.
- Non riscrivere la cronologia o eliminare branch e file dell'utente senza una
  richiesta esplicita.

## Criteri di completamento

Una modifica è completa quando:

- il comportamento richiesto è coperto da test proporzionati al rischio;
- i controlli pertinenti sono superati localmente o in CI;
- la documentazione dello stato corrente è aggiornata;
- una nuova capacità Rust ha risultati attesi confrontabili con il motore
  JavaScript e il bridge WASM è stato verificato, quando coinvolto;
- non sono state introdotte modifiche collaterali non richieste.
