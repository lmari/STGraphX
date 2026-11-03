# Motore Rust di STGraphX

Questa cartella contiene il nuovo motore di esecuzione di STGraphX, sviluppato
da zero e indipendente dall'interfaccia utente.

## Stato

Il workspace esegue un primo sottoinsieme verticale di modelli: parametri, nodi
algebrici e nodi di stato scalari o tensoriali con espressioni aritmetiche
elementari, dipendenze esplicite e simulazione temporale mediante Eulero. Non è
ancora collegato all'applicazione JavaScript.

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

## Sottoinsieme eseguibile

Sono supportati:

- documenti JSON STGraphX con `version: 1`;
- nodi `parameter` con espressioni numeriche costanti;
- nodi `algebraic` scalari;
- nodi `state` scalari con `initialState` e `stateTransition`;
- valori numerici scalari, vettoriali, matriciali e tensoriali rettangolari;
- letterali come `[1,2]` e `[[1,2],[3,4]]`;
- aritmetica elemento per elemento, con diffusione di uno scalare su un tensore;
- confronti e operatori logici, anche elemento per elemento;
- espressioni condizionali `if(...)` scalari o tensoriali;
- prime funzioni matematiche vettorializzate, tra cui `abs`, `sqrt`,
  `min`, `max` e le principali funzioni trigonometriche;
- riduttori `sum`, `average` e `count(array[, axis])`, con supporto degli assi per
  vettori e matrici;
- funzione strutturale `size`;
- operatori `+`, `-`, `*`, `/`, `%`, `^` e `**`;
- variabili di esecuzione `time`, `t0`, `t1` e `dt`;
- alias `this` nelle transizioni di stato;
- transizioni discrete e `integral(...)` scalare o tensoriale con metodo di
  Eulero;
- serie temporali da `t0` a `t1`, con aggiornamento simultaneo degli stati;
- dipendenze dichiarate mediante gli archi del modello;
- ordinamento topologico deterministico;
- diagnostica per nomi e identificativi duplicati, riferimenti mancanti,
  archi incoerenti e cicli algebrici.

Non sono ancora supportati RK4, indicizzazione dei tensori, funzioni locali
definite dal modello, sottomodelli o input esterni.

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
