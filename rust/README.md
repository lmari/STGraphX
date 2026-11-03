# Motore Rust di STGraphX

Questa cartella contiene il nuovo motore di esecuzione di STGraphX, sviluppato
da zero e indipendente dall'interfaccia utente.

## Stato

Il workspace esegue un primo sottoinsieme verticale di modelli: parametri, nodi
algebrici e nodi di stato scalari o tensoriali con espressioni aritmetiche
elementari, dipendenze esplicite e simulazione temporale mediante Eulero o RK4.
Il collegamento sperimentale all'applicazione JavaScript usa un binding
WebAssembly a grana grossa: il browser invia un modello completo e riceve tutti
gli snapshot della simulazione.

Nell'interfaccia il comando `Completo con motore Rust`, nel menu `Esegui`, è
separato dai controlli ordinari. Carica il modulo WebAssembly solo al primo uso
e aggiorna valori, tabelle, grafici e storico CSV con gli snapshot restituiti.
Il motore JavaScript rimane il percorso predefinito per l'esecuzione completa,
manuale e temporizzata.

Il motore JavaScript attuale rimane il percorso predefinito e l'implementazione
di riferimento; l'uso del motore Rust richiede sempre il comando sperimentale
dedicato.

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
- `stgraphx-wasm`: binding WebAssembly che espone identità del motore ed
  esecuzione completa mediante payload JSON.

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
- indicizzazione e slicing di tensori, inclusi indici negativi, passi e
  selezioni multiple di righe o colonne;
- generazione di tensori con `array(...)`, inclusi assi vettoriali e variabili
  locali `$0`, `$1`, ... e `$i0`, `$i1`, ...;
- concatenazione di vettori e matrici con `append(...)`;
- parametri globali utilizzabili senza una freccia di dipendenza esplicita;
- funzioni locali definite dal modello, componibili e non ricorsive, con
  parametri e risultati scalari o tensoriali;
- integrazione RK4 di stati scalari o tensoriali con transizione
  `integral(derivata)`, inclusi sistemi accoppiati e derivate algebriche;
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

Non sono ancora supportate in RK4 le transizioni che combinano `integral(...)`
con altre operazioni esterne; non sono inoltre supportati sottomodelli o input
esterni.

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
