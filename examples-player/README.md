# Esempi del player

Questa cartella contiene modelli STGraphX e pagine HTML che ne mostrano l'uso con il player incorporabile. Ogni pagina carica `../player-runtime-loader.js` e un file JSON collocato nella stessa cartella.

Avviare dalla radice del repository un server locale, dopo aver creato il bundle opzionale del player:

```bash
npm run build:player
npm run start:web
```

Aprire quindi una delle pagine, per esempio:

```text
http://127.0.0.1:8000/examples-player/oscillatore.html
```

Le pagine continuano a funzionare anche senza bundle, grazie al fallback del loader ai moduli sorgente.
Per distribuire il player in un sito separato, seguire invece le istruzioni in `README-PLAYER.md`.
