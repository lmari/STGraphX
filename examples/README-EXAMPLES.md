# Pagina Esempi

Questa cartella contiene anche tutti i file che controllano la finestra `Help -> Modelli di esempio...`.

## File coinvolti

- `examples-catalog.json`
  Catalogo effettivamente usato dall'applicazione.
- `examples-catalog.template.json`
  Modello minimo da cui partire per creare o rifare il catalogo.
- `examples-help.css`
  Stili specifici della finestra esempi.

## Obiettivo

L'idea è che la gestione della pagina esempi sia modificabile senza intervenire in `app.js` o `styles.css`, salvo cambiamenti strutturali del renderer.

## Struttura del catalogo

Il file `examples-catalog.json` supporta questi campi:

- `title`
- `intro`
- `layout`
- `entries`
- `sections`

I testi possono essere:

- stringhe semplici
- oggetti localizzati con chiavi `it` e `en`

## Layout dal JSON

La sezione `layout` controlla il layout di base:

- `variant`: `list`, `compact`, `stack`
- `showPaths`: mostra o nasconde il path `examples/...`
- `dense`: riduce gli spazi verticali
- `openLabel`: testo del pulsante di apertura

## Organizzazione degli esempi

Puoi usare:

- `entries` per un elenco semplice
- `sections` per raggruppare gli esempi per tema

Ogni entry supporta:

- `file`
- `label`
- `summary`

## Layout dal CSS

Se vuoi cambiare l'aspetto grafico, intervieni in:

- `examples-help.css`

Classi principali:

- `.examples-help-card`
- `.examples-help-content`
- `.example-entry`
- `.example-entry-title`
- `.example-entry-path`
- `.example-entry-desc`
- `.examples-section`
- `.examples-section-title`
- `.examples-section-intro`
- `.examples-section-list`

Attributi/classi dinamiche applicate dal renderer:

- `data-layout-variant="list|compact|stack"` su `.examples-help-content`
- `.dense` su `.examples-help-content`

## Nota tecnica

Il renderer carica dinamicamente:

- `examples/examples-catalog.json`
- `examples/examples-help.css`

Questo vale sia nella shell web sia nella shell desktop pacchettizzata, perché `examples/**/*` è incluso nel packaging.
