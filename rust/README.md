# Motore Rust di STGraphX

Questa cartella contiene il nuovo motore di esecuzione di STGraphX, sviluppato
da zero e indipendente dall'interfaccia utente.

## Stato

Il workspace esegue il primo sottoinsieme minimale di modelli: parametri e nodi
algebrici scalari con espressioni aritmetiche elementari e dipendenze esplicite.
Non è ancora collegato all'applicazione JavaScript.

Il motore JavaScript attuale rimane quindi l'unico motore usato da STGraphX e
il comportamento dell'applicazione non viene modificato.

## Obiettivi architetturali

- mantenere il core indipendente da browser, Electron e Tauri;
- compilare in futuro lo stesso core sia nativamente sia in WebAssembly;
- separare il documento JSON, il modello compilato e lo stato di simulazione;
- mantenere nel motore Rust lo stato durante l'esecuzione;
- usare chiamate a grana grossa tra JavaScript e Rust;
- verificare ogni funzionalità mediante test di parità con risultati attesi.

## Struttura iniziale

- `stgraphx-engine`: libreria pura e indipendente dalla piattaforma;
- `stgraphx-cli`: eseguibile minimale per test, benchmark ed esecuzione
  headless;
- `stgraphx-wasm`: binding WebAssembly previsto, non ancora creato.

Il codice Tauri esistente in `../src-tauri` è una shell desktop distinta e non
fa parte del motore.

## Primo sottoinsieme eseguibile

Sono supportati:

- documenti JSON STGraphX con `version: 1`;
- nodi `parameter` con espressioni numeriche costanti;
- nodi `algebraic` scalari;
- operatori `+`, `-`, `*`, `/`, `%`, `^` e `**`;
- dipendenze dichiarate mediante gli archi del modello;
- ordinamento topologico deterministico;
- diagnostica per nomi e identificativi duplicati, riferimenti mancanti,
  archi incoerenti e cicli algebrici.

Non sono ancora supportati nodi di stato, funzioni, valori non scalari,
variabili di sistema, sottomodelli o input esterni.

La CLI può eseguire un modello compatibile:

```bash
cargo run -p stgraphx-cli -- stgraphx-engine/tests/fixtures/scalar-algebraic.json
```

## Verifica

Da questa cartella:

```bash
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace --all-targets
```

La CI esegue gli stessi controlli quando cambia il workspace Rust.
