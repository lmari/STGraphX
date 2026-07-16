# Template della 8-upla

La finestra `Help -> Genera 8-upla...` legge i propri testi da:

- `help/eight-tuple-template.json`

Il file contiene:

- titolo e introduzione della finestra;
- etichette dei pulsanti di copia/esportazione;
- testi di supporto usati per costruire la 8-upla;
- titoli delle sezioni.

## Localizzazione

Ogni testo può essere:

- una stringa semplice;
- oppure un oggetto con chiavi di lingua, per esempio `it` ed `en`.

Esempio:

```json
{
  "title": {
    "it": "8-upla del modello attivo",
    "en": "8-tuple of the active model"
  }
}
```

La lingua corrente viene scelta dall'applicazione. Se manca una traduzione, STGraphX prova prima `en`, poi `it`.

## Struttura minima

Le chiavi principali sono:

- `title`
- `intro`
- `copyMarkdownLabel`
- `exportMarkdownLabel`
- `exportPickerTitle`
- `exportSuccess`
- `exportFailed`
- `sections`
- `text`

## Layout e formattazione

Il layout della finestra continua a essere gestito dal codice HTML/CSS dell'applicazione; questo file controlla solo il contenuto testuale e il testo esportato/copiato in Markdown.
