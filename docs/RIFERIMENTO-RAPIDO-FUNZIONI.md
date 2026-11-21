# STGraphX - Riferimento rapido alle funzioni

Generato automaticamente da `i18n-inline.js` e `graph-functions.js` (release 2026.11.21).

Rigenerare con `npm run docs:functions`.

Elenco delle funzioni, delle variabili di sistema e delle utility disponibili nelle espressioni.

## Notazione speciale

### `_`

**Firma:** `_`

Segnaposto della pipeline `|>`. Nella parte destra rappresenta il valore, calcolato una sola volta, della parte sinistra. `|>` ha la precedenza più bassa ed è associativo a sinistra.

*Esempi*
- `x |> _ + 1 |> _ * 2`
- `[1,2,3] |> _[0]`
- `sin(time) |> if(_ > 0, 2*_, -_)`

---

### `|>`

**Firma:** `value |> expression`

Applica l'espressione a destra al valore prodotto a sinistra. Nella parte destra `_` indica quel valore, calcolato una sola volta. `|>` ha la precedenza più bassa ed è associativo a sinistra; `_` è valido solo a destra di una pipeline.

*Esempi*
- `x |> _ + 1 |> _ * 2`
- `[1,2,3] |> _[0]`
- `sin(time) |> if(_ > 0, 2*_, -_)`

## Variabili disponibili

### `$0`

**Firma:** `$0, $1, ...`

In array(...), indice da zero della prima dimensione ($0), della seconda ($1), e cosi via.

---

### `dt`

**Firma:** `dt`

Passo temporale dell'esecuzione.

---

### `t0`

**Firma:** `t0`

Istante iniziale dell'esecuzione.

---

### `t1`

**Firma:** `t1`

Istante finale dell'esecuzione.

---

### `this`

**Firma:** `this`

Valore corrente della variabile di stato.

---

### `time`

**Firma:** `time`

Istante corrente dell'esecuzione.

## Funzioni generali

### `getModelProperty`

**Firma:** `getModelProperty(name, fallback)`

Una proprietà custom del modello.

*Esempi*
- `getModelProperty("title", "untitled")`

---

### `getProperty`

**Firma:** `getProperty(name, fallback)`

Una proprietà custom della variabile.

*Esempi*
- `getProperty("unit", "")`

---

### `if`

**Firma:** `if(condition, value[, condition, value, ...], defaultValue)`

Valore associato alla prima condizione vera, valutata in ordine, oppure defaultValue. La valutazione è pigra e opera elemento per elemento con condizioni vettoriali o matriciali.

*Esempi*
- `if(x > 0, x, 0)`
- `if(x < 0, -1, x == 0, 0, 1)`

---

### `integral`

**Firma:** `integral(x)`

Un'approssimazione discreta dell'integrale di x nel tempo. Con integratore Euler equivale a this + x * dt; con RK4 usa automaticamente il metodo di Runge-Kutta del quarto ordine sulle chiamate integral(...) presenti nelle transizioni di stato.

*Esempi*
- `integral(flow)`

---

### `map`

**Firma:** `map(expr, array)`

Trasformazione elemento per elemento di un vettore o di una matrice. Dentro expr, $value è il valore corrente e $0, $1, ... sono gli indici locali.

*Esempi*
- `map($value*2, [1,2,3])`
- `map($0+$value, [10,20,30])`
- `map($0+$1, [[1,2],[3,4]])`

---

### `range`

**Firma:** `range(stop) | range(start, stop[, step])`

Una successione numerica con estremo finale escluso.

*Esempi*
- `range(4) -> [0,1,2,3]`

---

### `readData`

**Firma:** `readData(path, sheet, row, column) | readData(path, sheet, row1, column1, row2, column2)`

Legge valori da un file XLSX relativo alla cartella del modello. Con quattro argomenti restituisce una cella; con sei argomenti legge un intervallo con estremi inclusi, restituendo uno scalare, un vettore o una matrice. Righe e colonne iniziano da 1 e possono essere espressioni che producono interi positivi.

*Esempi*
- `readData("data/values.xlsx", "Dati", time+1, 3)`
`readData("data/values.xlsx", "Dati", 2, 1, 10, 4)`

---

### `reduce`

**Firma:** `reduce(op|fn, vector[, init]) | reduce(op|fn, matrix, axis[, init])`

Riduzione progressiva di un vettore o di una matrice mediante un operatore o una funzione. Per le matrici axis=0 riduce per colonne, axis=1 per righe.

*Esempi*
- `reduce(+, [1,2,3])`
- `reduce(max, [3,7,2])`
- `reduce(+, [[1,2],[3,4]], 0)`

---

### `setModelProperty`

**Firma:** `setModelProperty(name, value)`

Assegnazione di una proprietà custom del modello, con restituzione del valore assegnato.

*Esempi*
- `setModelProperty("title", "Experiment")`

---

### `setProperty`

**Firma:** `setProperty(name, value)`

Assegnazione di una proprietà custom della variabile, con restituzione del valore assegnato.

*Esempi*
- `setProperty("unit", "kg")`

## Funzioni per array

### `append`

**Firma:** `append(value1, value2[, value3, ...]) | append(vector|matrix, ..., axis)`

Concatena in sequenza due o piu valori. Su vettori aggiunge elementi o concatena vettori. Se è presente una matrice, axis=0 (default) concatena righe e axis=1 colonne: l'ordine degli argomenti stabilisce se sono inserite prima o dopo la matrice. Le matrici agents supportano solo axis=0.

*Esempi*
- `append([1,2], 3, [4,5])`
- `append([[1,2]], [3,4], [5,6])`
- `append([[1,2],[3,4]], [5,6], 1)`
- `append([5,6], [[1,2],[3,4]], 1)`

---

### `appendRow`

**Firma:** `appendRow(matrix, row|value)`

Una copia della matrice con una nuova riga aggiunta in fondo. Il secondo argomento puo essere un vettore riga o uno scalare, ripetuto in ogni colonna. Per matrici agents aggiunge un nuovo agente.

*Esempi*
- `appendRow([[1,2]], [3,4])`
- `appendRow([[1,2]], 0)`
- `appendRow(agents, [3,1])`

---

### `argmax`

**Firma:** `argmax(vector|matrix)`

L'indice del primo valore massimo. Per un vettore restituisce un indice; per una matrice restituisce [riga, colonna]. In caso di parita sceglie il primo elemento in ordine di righe e colonne.

*Esempi*
- `argmax([2,7,4]) -> 1`
- `argmax([[1,5],[5,2]]) -> [0,1]`

---

### `argmin`

**Firma:** `argmin(vector|matrix)`

L'indice del primo valore minimo. Per un vettore restituisce un indice; per una matrice restituisce [riga, colonna]. In caso di parita sceglie il primo elemento in ordine di righe e colonne.

*Esempi*
- `argmin([2,-1,4]) -> 1`
- `argmin([[3,2],[1,1]]) -> [1,0]`

---

### `array`

**Firma:** `array(n0[, n1, ...], expr) | array(columnNames, rows, cols, expr)`

Costruisce un array valutando expr per ogni combinazione delle dimensioni. Ogni dimensione n deve essere un intero non negativo; $0, $1, ... sono gli indici correnti da zero. La forma array(columnNames, rows, cols, expr) crea una matrice con colonne nominate, accessibili anche con matrice["nome"].

*Esempi*
- `array(3, $0*2)`
- `array(5, ($0-2)^2)`
- `array(["quantità","prezzo"], 5, 2, 0)`

---

### `col`

**Firma:** `col(matrix, j)`

La colonna j-esima della matrice come vettore. j puo essere anche il nome di una colonna nominata.

*Esempi*
- `col([[1,2],[3,4]], 1) -> [2,4]`
- `col(agents, ENERGY)`

---

### `coords`

**Firma:** `coords(matrix[, value])`

Le coordinate [riga, colonna] delle celle non nulle della matrice, oppure solo di quelle uguali a valore se specificato.

*Esempi*
- `coords([[0,1,0],[2,0,3]]) -> [[0,1],[1,0],[1,2]]`
- `coords([[0,1,0],[2,0,3]], 2) -> [[1,0]]`

---

### `filter`

**Firma:** `filter(cond, array[, mode])`

Selezione da un vettore o una matrice. Con modo omesso o 'elements' mantiene gli elementi per cui la condizione è vera. Con modo='rows' filtra le righe di una matrice, dove $value è la riga corrente e $0 il suo indice. Con modo='cols' filtra le colonne, dove $value è la colonna corrente e $0 il suo indice.

*Esempi*
- `filter($value>0, [-2,0,3])`
- `filter($0===$1, [[1,2],[3,4]])`
- `filter(griglia[$value]==1, coordinate, 'rows')`

---

### `flatten`

**Firma:** `flatten(matrix)`

Matrice trasformata in vettore concatenando le righe.

*Esempi*
- `flatten([[1,2],[3,4]]) -> [1,2,3,4]`

---

### `frequency`

**Firma:** `frequency(vector[, n|bins, mode])`

Matrice a due colonne `[centro, frequenza]` calcolata da un vettore numerico. Senza altri argomenti usa come categorie i valori distinti, in ordine crescente. Con `n` intero costruisce n bin uniformi fra minimo e massimo. Con `mode='categories'` il vettore indica le categorie; con `mode='edges'` indica i limiti crescenti degli intervalli, chiusi a sinistra e aperti a destra salvo l'ultimo.

*Esempi*
- `frequency([1,2,2,3])`
- `frequency([1,2,2,3], 2)`
- `frequency([0,10,10,20], [0,10,20], "categories")`
- `frequency([0.2,0.8,1.1], [0,1,2], "edges")`

---

### `grid`

**Firma:** `grid(rows, cols[, [nRows, nCols][, collisions[, value]]])`

Una matrice spaziale a partire da coordinate intere non negative. Se si specifica `[nRow, nCols]`, la matrice risultante ha dimensione fissa e genera errore se qualche coordinata esce dai limiti. `collisions` puo valere `error`, `first` oppure `sum`: il primo genera errore sulle coordinate coincidenti, il secondo tiene il valore della prima occorrenza, il terzo somma i valori coincidenti. Se `value` manca, usa `1`; se è scalare usa `value` in tutte le celle occupate; se è un vettore usa `value[i]` nella cella di riga `rows[i]` e colonna `cols[i]`.

*Esempi*
- `grid([1,1], [0,2]) -> [[0,0,0],[1,0,1]]`
- `grid([1,1], [0,2], [4,5])`
- `grid([1,1], [0,0], 'sum') -> [[0],[2]]`
- `grid([1,1], [0,2], [4,5], 'error', [1,2])`

---

### `indicesWhere`

**Firma:** `indicesWhere(array) | indicesWhere(cond, array)`

Gli indici degli elementi truthy oppure di quelli che soddisfano la condizione. Per un vettore restituisce un vettore di indici; per una matrice restituisce un vettore di coppie [riga,colonna].

*Esempi*
- `indicesWhere([0,1,0,1]) -> [1,3]`
- `indicesWhere($value>0, [-2,0,3]) -> [2]`
- `indicesWhere($0===$1, [[1,2],[3,4]]) -> [[0,0],[1,1]]`

---

### `intersection`

**Firma:** `intersection(vectorA, vectorB)`

Gli elementi presenti in entrambi i vettori, senza duplicati e mantenendo l'ordine del primo vettore.

*Esempi*
- `intersection([1,2,2,3], [2,3,4]) -> [2,3]`

---

### `ncols`

**Firma:** `ncols(matrix)`

Il numero di colonne della matrice. Per una popolazione di agenti coincide con il numero di proprietà.

*Esempi*
- `ncols([[1,2],[3,4]]) -> 2`
- `ncols(agents)`

---

### `neighbors`

**Firma:** `neighbors(matrix, row, col[, diagonals[, toroidal]])`

I valori delle celle vicine a quella indicata. Con `diagonals=true` usa il vicinato di Moore, con `diagonals=false` solo sopra, sotto, sinistra e destra. Con `toroidal=true` lo spazio si richiude sui bordi.

*Esempi*
- `neighbors([[1,2,3],[4,5,6],[7,8,9]], 1, 1) -> [1,2,3,4,6,7,8,9]`
- `neighbors([[1,2,3],[4,5,6],[7,8,9]], 1, 1, false) -> [2,4,6,8]`
- `neighbors([[1,2,3],[4,5,6],[7,8,9]], 0, 0, false, true) -> [2,4,3,7]`

---

### `nrows`

**Firma:** `nrows(matrix)`

Il numero di righe della matrice. Per una popolazione di agenti coincide con il numero di agenti.

*Esempi*
- `nrows([[1,2],[3,4]]) -> 2`
- `nrows(agents)`

---

### `remove`

**Firma:** `remove(array, n) | remove(n, array)`

Copia di un vettore senza gli ultimi n elementi, oppure senza i primi n elementi se n è il primo argomento. Per una matrice rimuove righe. n deve essere un intero non negativo; se supera la dimensione restituisce un array vuoto.

*Esempi*
- `remove([1,2,3,4], 2) -> [1,2]`
- `remove(2, [1,2,3,4]) -> [3,4]`
- `remove([[1,2],[3,4],[5,6]], 1) -> [[1,2],[3,4]]`

---

### `removeAt`

**Firma:** `removeAt(vector, index) | removeAt(matrix, index[, axis])`

Una copia senza l'elemento indicato del vettore oppure senza la riga o la colonna indicate della matrice. Per le matrici axis=0 rimuove una riga, axis=1 una colonna.

*Esempi*
- `removeAt([1,2,3], 1) -> [1,3]`
- `removeAt([[1,2],[3,4]], 0) -> [[3,4]]`
- `removeAt([[1,2],[3,4]], 1, 1) -> [[1],[3]]`

---

### `removeRow`

**Firma:** `removeRow(matrix, i)`

Una copia della matrice senza la riga i. Per matrici agents elimina l'agente i.

*Esempi*
- `removeRow([[1,2],[3,4]], 0) -> [[3,4]]`
- `removeRow(agents, 2)`

---

### `resize`

**Firma:** `resize(vector, length) | resize(matrix, rows, cols)`

Copia di un vettore o di una matrice con dimensioni diverse. Mantiene le posizioni esistenti, elimina quelle eccedenti e riempie con zeri quelle nuove. Le matrici agents non sono supportate.

*Esempi*
- `resize([1,2], 4) -> [1,2,0,0]`
- `resize([[1,2],[3,4]], 3, 4) -> [[1,2,0,0],[3,4,0,0],[0,0,0,0]]`

---

### `row`

**Firma:** `row(matrix, i)`

La riga i-esima della matrice. Se la matrice rappresenta agenti, restituisce il vettore proprietà dell'agente i.

*Esempi*
- `row([[1,2],[3,4]], 0) -> [1,2]`
- `row(agents, 0)`

---

### `set`

**Firma:** `set(vector)`

Vettore senza duplicati, nell'ordine della prima apparizione.

*Esempi*
- `set([3,1,3,2,1]) -> [3,1,2]`

---

### `setAt`

**Firma:** `setAt(vector, index, value) | setAt(matrix, [row,col], value) | setAt(matrix, row, rowVector)`

Una copia con l'elemento o la riga sostituiti.

*Esempi*
- `setAt([1,2,3], 1, 9) -> [1,9,3]`
- `setAt([[1,2],[3,4]], [1,0], 8) -> [[1,2],[8,4]]`

---

### `setCol`

**Firma:** `setCol(matrix, j, vector|value)`

Una copia della matrice con la colonna j sostituita da un vettore o da uno scalare ripetuto in ogni riga. j puo essere anche il nome di una colonna nominata.

*Esempi*
- `setCol([[1,2],[3,4]], 1, [8,9])`
- `setCol([[1,2],[3,4]], 0, 7)`
- `setCol(agents, ENERGY, newEnergy)`

---

### `setRow`

**Firma:** `setRow(matrix, i, row|value)`

Una copia della matrice con la riga i sostituita da un vettore o da uno scalare ripetuto in ogni colonna.

*Esempi*
- `setRow([[1,2],[3,4]], 1, [8,9])`
- `setRow([[1,2],[3,4]], 0, 7)`
- `setRow(agents, 3, [10,1,4,7])`

---

### `shuffle`

**Firma:** `shuffle(vector|matrix)`

Una copia del vettore con gli elementi mescolati casualmente oppure una copia della matrice con le righe mescolate casualmente.

*Esempi*
- `shuffle([1,2,3,4])`
- `shuffle([[1,2],[3,4],[5,6]])`

---

### `size`

**Firma:** `size(array[, axis])`

La dimensione di un vettore o di una matrice. Per un vettore restituisce la lunghezza; per una matrice restituisce [righe, colonne]. Con axis=0 o axis=1 restituisce una singola dimensione.

*Esempi*
- `size([1,2,3]) -> 3`
- `size([[1,2],[3,4]]) -> [2,2]`
- `size([[1,2],[3,4]], 1) -> 2`

---

### `sort`

**Firma:** `sort(vector)`

Una copia del vettore ordinata in senso crescente.

*Esempi*
- `sort([3,1,2]) -> [1,2,3]`

---

### `sum`

**Firma:** `sum(array[, axis])`

Somma degli elementi di un vettore o di una matrice. Per una matrice, senza axis restituisce la somma complessiva; con axis=0 restituisce le somme per colonna, con axis=1 le somme per riga.

*Esempi*
- `sum([1,2,3]) -> 6`
- `sum([[1,2],[3,4]]) -> 10`
- `sum([[1,2],[3,4]], 0) -> [4,6]`

---

### `transpose`

**Firma:** `transpose(vector|matrix)`

Matrice con righe e colonne scambiate. Un vettore diventa una matrice colonna. Le matrici agents non sono supportate.

*Esempi*
- `transpose([1,2,3]) -> [[1],[2],[3]]`
- `transpose([[1,2,3],[4,5,6]]) -> [[1,4],[2,5],[3,6]]`

---

### `union`

**Firma:** `union(vectorA, vectorB)`

Unione di due vettori, senza duplicati e nell'ordine della prima apparizione.

*Esempi*
- `union([1,2], [2,3]) -> [1,2,3]`

## Funzioni statistiche e probabilistiche

### `average`

**Firma:** `average(array[, axis])`

Media aritmetica di un vettore o di una matrice. Per una matrice, senza `axis` restituisce la media complessiva; con `axis=0` per colonna, con `axis=1` per riga.

*Esempi*
- `average([1,2,3]) -> 2`
- `average([[1,2],[3,4]]) -> 2.5`
- `average([[1,2],[3,4]], 0) -> [2,3]`

---

### `bernoulli`

**Firma:** `bernoulli([p], x, mode)`

Distribuzione di Bernoulli (parametro predefinito: `p=0.5`). Se `x` manca, estrae un campione. Con `mode=0` calcola la pmf, con `mode=1` la cdf, con `mode=2` il quantile discreto.

*Esempi*
- `bernoulli()`
- `bernoulli([0.3], 1, 0)`

---

### `binomial`

**Firma:** `binomial([n, p], x, mode)`

Distribuzione binomiale (parametri predefiniti: `n=1`, `p=0.5`). Se `x` manca, estrae un campione. Con `mode=0` calcola la pmf, con `mode=1` la cdf, con `mode=2` il quantile discreto.

*Esempi*
- `binomial()`
- `binomial([10,0.2], 3, 0)`

---

### `choice`

**Firma:** `choice(vector|matrix)`

Elemento estratto casualmente da un vettore non vuoto oppure riga estratta casualmente da una matrice non vuota.

*Esempi*
- `choice([10,20,30])`
- `choice([[1,2],[3,4]])`

---

### `correlation`

**Firma:** `correlation(x, y)`

Coefficiente di correlazione lineare di Pearson tra due vettori numerici della stessa lunghezza, con almeno due valori. Restituisce un numero tra -1 e 1; genera un errore se uno dei vettori è costante.

*Esempi*
- `correlation([1,2,3],[2,4,6]) -> 1`

---

### `count`

**Firma:** `count(array[, axis]) | count(cond, array[, axis])`

Numero degli elementi truthy oppure di quelli che soddisfano la condizione `cond`, usando `$value` e gli indici locali `$0`, `$1`, ... (vedi per analogia `filter()`).

*Esempi*
- `count([1,0,1]) -> 2`
- `count($value>0, [-2,0,3]) -> 1`
- `count($value==1, [[1,0],[1,1]], 1) -> [1,2]`

---

### `exponential`

**Firma:** `exponential([params], x, mode)`

Distribuzione di probabilità esponenziale (parametro di default: `rate=1`). Se `x` manca, estrae un campione. Con `mode=0` calcola la pdf, con `mode=1` la cdf, con `mode=2` la icdf.

*Esempi*
- `exponential()`
- `exponential([2])`
- `exponential([2], 1.5, 0)`
- `exponential([2], 0.9, 2)`

---

### `gaussian`

**Firma:** `gaussian([mu, sigma], x, mode)`

Distribuzione di probabilità gaussiana (parametri di default: `mu=0`, `sigma=1`). Se `x` manca, estrae un campione. Con `mode=0` calcola la pdf, con `mode=1` la cdf, con `mode=2` la icdf.

*Esempi*
- `gaussian()`
- `gaussian([0,1])`
- `gaussian([0,1], 0, 0)`
- `gaussian([0,1], 0.95, 2)`

---

### `linearRegression`

**Firma:** `linearRegression(x, y)`

Regressione lineare ai minimi quadrati con intercetta, equivalente a polynomialRegression(x,y,1). Restituisce il vettore [a0,a1,...,R²,RMSE]: coefficienti in ordine crescente di potenza (a0+a1*x+...) seguiti da R² e RMSE. RMSE è sqrt(sum((y-yStimata)^2)/n), nelle unità di y, senza correzione per i gradi di libertà. Richiede almeno due coppie numeriche e valori x non tutti uguali.

*Esempi*
- `linearRegression([0,1,2],[1,3,5]) -> circa [1,2,1,0]`

---

### `median`

**Firma:** `median(array[, axis])`

Mediana di un vettore o di una matrice numerici non vuoti. Con un numero pari di valori restituisce la media dei due centrali. Per una matrice, senza `axis` usa tutti i valori; con `axis=0` opera per colonna, con `axis=1` per riga.

*Esempi*
- `median([3,1,2]) -> 2`
- `median([1,4]) -> 2.5`

---

### `mode`

**Firma:** `mode(array[, axis])`

Moda di un vettore o di una matrice numerici non vuoti. Restituisce il valore più frequente; in caso di parità sceglie il più piccolo, anche quando tutti i valori sono distinti. Per una matrice, senza `axis` usa tutti i valori; con `axis=0` opera per colonna, con `axis=1` per riga.

*Esempi*
- `mode([3,1,3,1]) -> 1`

---

### `poisson`

**Firma:** `poisson([rate], x, mode)`

Distribuzione di Poisson (parametro predefinito: `rate=1`). Se `x` manca, estrae un campione. Con `mode=0` calcola la pmf, con `mode=1` la cdf, con `mode=2` il quantile discreto.

*Esempi*
- `poisson()`
- `poisson([4], 2, 0)`

---

### `polynomialRegression`

**Firma:** `polynomialRegression(x, y[, degree])`

Regressione polinomiale ai minimi quadrati, con intercetta. `degree` è un intero non negativo, predefinito 1; occorrono almeno degree+1 osservazioni e valori x distinti sufficienti. Restituisce il vettore [a0,a1,...,R²,RMSE]: coefficienti in ordine crescente di potenza (a0+a1*x+...) seguiti da R² e RMSE. RMSE è sqrt(sum((y-yStimata)^2)/n), nelle unità di y, senza correzione per i gradi di libertà. Il grado 0 stima la media. Con y costante R² vale 1. Usa QR con dati riscalati; segnala basi numericamente dipendenti o risultati non rappresentabili. Con gradi elevati o x molto traslati, i coefficienti nelle coordinate originali possono perdere precisione.

*Esempi*
- `polynomialRegression([0,1,2],[1,4,9],2) -> circa [1,2,1,1,0]`

---

### `rand`

**Firma:** `rand([max]) | rand(min, max)`

Numero casuale da una distribuzione di probabilità uniforme. Senza argomenti restituisce un valore tra `0` e `1`; con un argomento tra `0` e `max`; con due argomenti tra `min` e `max`.

*Esempi*
- `rand()`
- `rand(10)`
- `rand(-1, 1)`

---

### `randInt`

**Firma:** `randInt(max) | randInt(min, max)`

Numero intero casuale da una distribuzione di probabilità uniforme. Con un argomento restituisce un intero tra `0` e `max`; con due argomenti tra `min` e `max`.

*Esempi*
- `randInt(5)`
- `randInt(2, 7)`

---

### `stdev`

**Firma:** `stdev(array[, axis])`

Deviazione standard di un vettore o di una matrice. Per una matrice, senza `axis` restituisce la deviazione standard complessiva; con `axis=0` per colonna, con `axis=1` per riga.

*Esempi*
- `stdev([1,2,3])`
- `stdev([[1,2],[3,4]], 0)`

---

### `uniform`

**Firma:** `uniform([min, max], x, mode)`

Distribuzione di probabilità uniforme (parametri di default: `min=0`, `max=1`). Se `x` manca, estrae un campione. Con `mode=0` calcola la pdf, con `mode=1` la cdf, con `mode=2` la icdf.

*Esempi*
- `uniform()`
- `uniform([0,10], 3, 1)`
- `uniform([0,10], 0.25, 2)`

## Funzioni matematiche

### `%`

**Firma:** `a % b`

Resto euclideo della divisione di `a` per `b`. Con un divisore positivo il risultato è compreso tra `0` e `b-1`, anche se `a` è negativo. Opera elemento per elemento su vettori e matrici.

*Esempi*
- `7 % 3 -> 1`
- `-1 % 3 -> 2`
- `[1,2,3] % 2 -> [1,0,1]`

---

### `abs`

**Firma:** `abs(x)`

Valore assoluto di `x`.

*Esempi*
- `abs(-3) -> 3`

---

### `acos`

**Firma:** `acos(x)`

Arcocoseno di `x`.

*Esempi*
- `acos(1) -> 0`

---

### `and`

**Firma:** `a and b`

Congiunzione logica (equivalente a `&&`).

*Esempi*
- `a and b`

---

### `asin`

**Firma:** `asin(x)`

Arcoseno di `x`.

*Esempi*
- `asin(0) -> 0`

---

### `atan`

**Firma:** `atan(x)`

Arcotangente di `x`.

*Esempi*
- `atan(0) -> 0`

---

### `atan2`

**Firma:** `atan2(y, x)`

Arcotangente con due argomenti `(y, x)`.

*Esempi*
- `atan2(0, 1) -> 0`

---

### `ceil`

**Firma:** `ceil(x)`

Arrotondamento per eccesso di `x`.

*Esempi*
- `ceil(1.2) -> 2`

---

### `cos`

**Firma:** `cos(x)`

Coseno di `x`.

*Esempi*
- `cos(0) -> 1`

---

### `cosh`

**Firma:** `cosh(x)`

Coseno iperbolico di `x`.

*Esempi*
- `cosh(0) -> 1`

---

### `exp`

**Firma:** `exp(x)`

Esponenziale naturale `e^x`.

*Esempi*
- `exp(0) -> 1`

---

### `floor`

**Firma:** `floor(x)`

Arrotondamento per difetto di `x`.

*Esempi*
- `floor(1.8) -> 1`

---

### `int`

**Firma:** `int(x)`

Parte intera di `x`.

*Esempi*
- `int(-1.8) -> -1`

---

### `log`

**Firma:** `log(x[, base])`

Logaritmo di x. Senza base calcola il logaritmo naturale; con base calcola log(x)/log(base). x e base possono essere scalari o array di forma compatibile.

*Esempi*
- `log(1) -> 0`
- `log(8, 2) -> 3`
- `log([1,10,100], 10) -> [0,1,2]`

---

### `max`

**Firma:** `max(x1, x2, ...)`

Massimo tra `x1`, `x2`, ... .

*Esempi*
- `max(2, 7, 4) -> 7`

---

### `min`

**Firma:** `min(x1, x2, ...)`

Minimo tra `x1`, `x2`, ... .

*Esempi*
- `min(2, 7, 4) -> 2`

---

### `not`

**Firma:** `not x`

Negazione logica (equivalente a `!`).

*Esempi*
- `not x. Esempio: `not active``

---

### `or`

**Firma:** `a or b`

Disgiunzione logica (equivalente a `||`).

*Esempi*
- `a or b`

---

### `piecewise`

**Firma:** `piecewise(cx, cy, x)`

Segnale definito dai punti di controllo `cx` e `cy` con interpolazione lineare: `cx` e `cy` sono vettori numerici della stessa lunghezza, con almeno due elementi; `cx` deve essere strettamente crescente. `x` puo essere scalare, vettore o matrice. Fuori dall'intervallo di `cx` restituisce il valore dell'estremo piu vicino.

*Esempi*
- `piecewise([0,2,5], [0,10,4], time)`

---

### `pos`

**Firma:** `pos(x)`

Parte positiva di `x`: `x` se positivo, altrimenti `0`.

*Esempi*
- `pos(-2) -> 0`

---

### `pow`

**Firma:** `pow(base, exp)`

Potenza: `base` elevata a `exp`.

*Esempi*
- `pow(2, 3) -> 8`

---

### `round`

**Firma:** `round(x)`

Arrotondamento all'intero più vicino di `x`.

*Esempi*
- `round(1.6) -> 2`

---

### `sign`

**Firma:** `sign(x)`

Segno di `x`: `-1`, `0` o `1`.

*Esempi*
- `sign(-4) -> -1`

---

### `sin`

**Firma:** `sin(x)`

Seno di `x`.

*Esempi*
- `sin(0) -> 0`

---

### `sinh`

**Firma:** `sinh(x)`

Seno iperbolico di `x`.

*Esempi*
- `sinh(0) -> 0`

---

### `spline`

**Firma:** `spline(cx, cy, x)`

Segnale definito dai punti di controllo `cx` e `cy` con spline cubica naturale: `cx` e `cy` sono vettori numerici della stessa lunghezza, con almeno due elementi; `cx` deve essere strettamente crescente. `x` puo essere scalare, vettore o matrice. Fuori dall'intervallo di `cx` restituisce il valore dell'estremo piu vicino.

*Esempi*
- `spline([0,2,5], [0,10,4], time)`

---

### `sqrt`

**Firma:** `sqrt(x)`

Radice quadrata di `x`.

*Esempi*
- `sqrt(9) -> 3`

---

### `tan`

**Firma:** `tan(x)`

Tangente di `x`.

*Esempi*
- `tan(0) -> 0`

---

### `tanh`

**Firma:** `tanh(x)`

Tangente iperbolica di `x`.

*Esempi*
- `tanh(0) -> 0`

---

### `trunc`

**Firma:** `trunc(x)`

Parte intera di `x`.

*Esempi*
- `trunc(-1.8) -> -1`

## Funzioni e variabili per agenti

### `$i`

**Firma:** `$i`

Indice di riga dell'agente o cella corrente. In esecuzione scalare vale 0; in esecuzione vettoriale identifica la componente locale; con matrici agent-based indica la riga corrente.

---

### `$j`

**Firma:** `$j`

Indice di colonna dell'agente o cella corrente nei contesti matriciali agent-based. Nelle strutture non matriciali non è disponibile.

---

### `agentIndicesWhere`

**Firma:** `agentIndicesWhere(cond, agents)`

Gli indici degli agenti per cui la condizione è vera. Nella condizione self è la riga dell'agente corrente e $i il suo indice.

*Esempi*
- `agentIndicesWhere(self[STATE] == 1, agents)`

---

### `agents`

**Firma:** `agents(fieldNames[, rowsOrCount])`

Crea una matrice di agenti con schema di proprietà. campi e un vettore di nomi di campo; il secondo argomento puo essere una matrice opzionale di agenti iniziali oppure un numero di agenti da inizializzare a zero.

*Esempi*
- `agents(["ID","STATE","X","Y"])`
- `agents(["ID","STATE"], [[1,0],[2,1]])`
- `agents(["X","Y","VX","VY"], 10)`

---

### `agentSpace`

**Firma:** `agentSpace(agents, xCol, yCol[, idCol][, [rows, cols][, neighborhood[, toroidal[, radius]]]])`

Un indice spaziale per una popolazione di agenti con coordinate intere non negative nelle colonne xCol e yCol. Se specifichi idCol, nelle celle dello spazio vengono memorizzati i valori di quella proprietà invece degli indici di riga. neighborhood puo valere 'moore' o 'vonNeumann'.

*Esempi*
- `agentSpace(agents, X, Y)`

---

### `allNeighborCounts`

**Firma:** `allNeighborCounts(agents, space)`

Un vettore con il numero di vicini di ogni agente.

*Esempi*
- `allNeighborCounts(agents, space)`

---

### `filterAgents`

**Firma:** `filterAgents(cond, agents)`

La sotto-popolazione degli agenti che soddisfano la condizione. Nella condizione self è la riga dell'agente corrente e $i il suo indice.

*Esempi*
- `filterAgents(self[ENERGY] > 0, agents)`

---

### `mapAgents`

**Firma:** `mapAgents(expr, agents)`

Trasformazione riga per riga di tutti gli agenti. expr deve restituire per ogni agente una nuova riga con la stessa lunghezza. In expr self è la riga dell'agente corrente e $i il suo indice.

*Esempi*
- `mapAgents(setAt(self, ENERGY, self[ENERGY] + 1), agents)`

---

### `neighborCountOf`

**Firma:** `neighborCountOf(agents, space, i)`

Quanti vicini ha l'agente i nello spazio dato.

*Esempi*
- `neighborCountOf(agents, space, 0)`

---

### `neighborsOf`

**Firma:** `neighborsOf(agents, space, i)`

I riferimenti degli agenti vicini all'agente di riga i, usando lo spazio costruito con agentSpace(...). Se agentSpace usa idCol, i riferimenti restituiti sono quei valori identificativi; altrimenti sono indici di riga. Esclude l'agente stesso.

*Esempi*
- `neighborsOf(agents, space, 0)`

---

### `self`

**Firma:** `self`

Valore locale corrente della variabile. In esecuzione scalare coincide con il valore della variabile; in esecuzione vettoriale indica la componente dell'agente corrente; nei contesti matriciali agent-based coincide con il valore della cella corrente.

---

### `spaceMatrix`

**Firma:** `spaceMatrix(space)`

La matrice dei conteggi di agenti per cella a partire da un valore agentSpace(...). Utile quando vuoi trattare lo spazio come matrice generica.

*Esempi*
- `spaceMatrix(agentSpace(agents, X, Y))`
