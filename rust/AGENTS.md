# Istruzioni per il motore Rust

Queste istruzioni si applicano a tutto il sottoalbero `rust/`.

- Il motore deve rimanere indipendente dalla UI e da Electron o Tauri.
- `stgraphx-engine` non deve dipendere da API del sistema operativo, DOM,
  Node.js o Tauri e deve restare compilabile in WebAssembly.
- Il precedente prototipo Rust separato non è una sorgente da importare.
- Non modificare `semantic.js`, `graph-functions.js`, `runtime-core.js` o gli
  altri file del motore JavaScript, salvo richiesta esplicita.
- Il motore JavaScript è inizialmente l'implementazione di riferimento, ma
  ogni correzione semantica deve essere fissata anche da risultati attesi e da
  un test di regressione.
- Non dividere l'esecuzione di uno stesso modello tra Rust e JavaScript.
- Ogni nuova capacità semantica deve avere test Rust e, quando disponibile,
  un test di parità condiviso.
- Prima di proporre modifiche, eseguire `cargo fmt`, `cargo clippy` e
  `cargo test` sull'intero workspace.
