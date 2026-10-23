# Esempi headless

Questa cartella contiene esempi Node.js che eseguono modelli STGraphX senza aprire editor, browser o player. Usano l'API definita in `headless-runtime.js`.

Eseguire dalla radice del repository:

```bash
node examples-headless/run-oscillator.js
node examples-headless/compare-oscillator.js
```

`run-oscillator.js` carica `examples/oscillator.json`, assegna un valore alla variabile di input `a`, avanza fino a `t = 2` e scrive lo storico degli output in `examples-headless/output/oscillator.csv`.

`compare-oscillator.js` esegue piu' volte lo stesso modello con valori diversi di `a` e mostra una tabella riassuntiva. E' un punto di partenza minimale per sweep di parametri e automazione di esperimenti.

Gli script richiedono Node.js e devono rimanere nella distribuzione sorgente di STGraphX, insieme ai moduli runtime caricati da `headless-runtime.js`.
