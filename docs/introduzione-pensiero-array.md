# Pensare per array con STGraphX

Molti modelli non descrivono un solo valore alla volta. Possono riguardare le
temperature in molte celle di una griglia, le caratteristiche di una
popolazione di agenti, le osservazioni di una serie di dati o le grandezze
misurate in piu' punti dello spazio. In questi casi e' utile pensare non a un
numero isolato, ma a un *array*: una raccolta ordinata di valori su cui si puo'
calcolare nel suo insieme.

STGraphX usa gli array come valori ordinari delle espressioni. Un nodo puo'
quindi contenere uno scalare, un vettore o una matrice; le funzioni e gli
operatori lavorano, quando ha senso, elemento per elemento. Questo permette di
scrivere modelli compatti e di avvicinare la struttura dell'espressione alla
struttura del fenomeno rappresentato.

## Scalare, vettore, matrice

Uno *scalare* e' un singolo valore:

```text
12
```

Un *vettore* e' una sequenza ordinata di valori:

```text
[10, 20, 30]
```

Una *matrice* e' una raccolta organizzata in righe e colonne:

```text
[[1, 2, 3],
 [4, 5, 6]]
```

La funzione `size()` rende esplicita la forma di un valore:

| Espressione | Risultato |
| --- | --- |
| `size(12)` | `[]` |
| `size([10, 20, 30])` | `[3]` |
| `size([[1, 2], [3, 4]])` | `[2, 2]` |

La forma fa parte del significato del valore. Un vettore di tre temperature non
e' equivalente alla loro media; una matrice di celle non e' equivalente a un
vettore ottenuto accostandone le righe. Prima di scrivere una formula e' quindi
utile chiedersi: il nodo rappresenta un valore, una lista ordinata, una
griglia, oppure una tabella di osservazioni?

## Calcolare elemento per elemento

Le operazioni aritmetiche applicate a un array vengono normalmente eseguite su
ogni suo elemento. Per esempio:

```text
[10, 20, 30] * 1.1
```

restituisce:

```text
[11, 22, 33]
```

Lo stesso vale per molte funzioni matematiche:

```text
sqrt([1, 4, 9, 16])
```

restituisce `[1, 2, 3, 4]`. Se le forme sono compatibili, anche due array
possono essere combinati elemento per elemento:

```text
[2, 4, 6] + [1, 3, 5]
```

restituisce `[3, 7, 11]`.

Questa proprieta' e' spesso preferibile a una serie di nodi ripetuti. Se un
modello deve aumentare del 5% il prezzo di cento prodotti, un solo nodo con
`prezzi * 1.05` esprime direttamente la regola per tutti i prodotti.

Quando si combinano due array, occorre controllare che descrivano insiemi di
elementi corrispondenti. Sommare due vettori della stessa lunghezza ha un
significato naturale solo se il primo elemento dell'uno corrisponde al primo
elemento dell'altro, e cosi' via.

## Ridurre un array a un valore

Altre funzioni sintetizzano molti elementi in un risultato piu' piccolo. Alcuni
esempi sono:

```text
sum([10, 20, 30])       // 60
average([10, 20, 30])   // 20
min([10, 20, 30])       // 10
max([10, 20, 30])       // 30
argmax([10, 20, 30])    // 2
```

`argmax()` restituisce l'indice del valore massimo, non il valore massimo
stesso. Gli indici iniziano da zero: nel vettore dell'esempio `30` si trova in
posizione `2`.

Nelle matrici si puo' spesso scegliere un asse. Per esempio, se `vendite` ha
una riga per prodotto e una colonna per mese, `sum(vendite, 1)` somma i mesi di
ogni prodotto, mentre `sum(vendite, 0)` somma i prodotti di ogni mese. La scelta
dell'asse deve seguire la domanda del modello: vogliamo un totale per riga, per
colonna, oppure un unico totale complessivo?

## Accedere a elementi, righe e colonne

Gli indici degli array iniziano da zero. Per un vettore:

```text
v = [10, 20, 30]
v[0]       // 10
v[2]       // 30
v[[0, 2]]  // [10, 30]
```

La forma `v[[0, 2]]` permette di selezionare elementi non contigui. In una
matrice si possono usare indici per selezionare righe e colonne; le funzioni
`row()` e `col()` rendono spesso l'intenzione piu' chiara:

```text
m = [[1, 2, 3], [4, 5, 6]]
row(m, 0)  // [1, 2, 3]
col(m, 1)  // [2, 5]
```

Le stesse funzioni si applicano alle matrici che rappresentano agenti, ma non
dipendono dalla nozione di agente. Per modificare senza alterare la matrice
originale si possono usare `setRow()` e `setCol()`; il nuovo contenuto puo'
essere un vettore oppure uno scalare, ripetuto nella riga o nella colonna:

```text
setRow(m, 0, [8, 9, 10])  // [[8,9,10], [4,5,6]]
setCol(m, 1, 0)           // [[1,0,3], [4,0,6]]
```

`nrows(m)` e `ncols(m)` restituiscono le dimensioni della matrice. Sono utili
quando la dimensione puo' cambiare nel tempo oppure quando una formula deve
adattarsi alla forma del dato che riceve.

L'indicizzazione e' utile, ma non dovrebbe diventare il modo principale per
scrivere un modello. Se una formula contiene molti numeri di indice, puo'
essere un segnale che conviene dare un nome alle colonne, introdurre un nodo
intermedio o riorganizzare la matrice.

## Costruire array con `array()`

La funzione `array()` costruisce vettori e matrici calcolando un'espressione
per ogni posizione. La forma generale e':

```text
array(n0[, n1, ...], espressione)
```

Ogni argomento numerico prima dell'ultimo definisce la dimensione di un asse.
Le variabili di sistema `$0`, `$1`, e cosi' via sono gli indici correnti degli
assi, sempre a partire da zero.

```text
array(5, $0)
```

produce il vettore:

```text
[0, 1, 2, 3, 4]
```

Per costruire una matrice di tre righe e quattro colonne:

```text
array(3, 4, $0 + $1)
```

Il primo indice, `$0`, identifica la riga; il secondo, `$1`, la colonna. Il
risultato e':

```text
[[0, 1, 2, 3],
 [1, 2, 3, 4],
 [2, 3, 4, 5]]
```

Se si desidera un intervallo di coordinate diverso da `0, 1, ...`, lo si puo'
esprimere direttamente nella formula. Per esempio:

```text
array(5, ($0 - 2)^2)
```

produce `[4, 1, 0, 1, 4]`. Un'altra strategia, utile quando le coordinate sono
gia' disponibili nel modello, e' costruire prima un vettore e usarne gli
elementi:

```text
x = range(-2, 3)
array(size(x), x[$0]^2)
```

In molti casi e' ancora piu' semplice sfruttare il calcolo vettoriale:

```text
x ^ 2
```

Le tre forme sono equivalenti nel risultato, ma la scelta migliore dipende da
cio' che il lettore del modello deve capire: una griglia di indici, coordinate
gia' definite oppure una trasformazione diretta di un vettore.

## Matrici con colonne nominate

Una matrice puo' rappresentare una tabella: ogni riga e' un'osservazione e ogni
colonna una proprieta'. In questo caso i soli indici numerici diventano presto
fragili. STGraphX permette di dichiarare il nome delle colonne durante la
costruzione:

```text
array(["quantita", "prezzo"], 5, 2, 0)
```

L'esempio costruisce una matrice di cinque righe, due colonne, inizialmente
nulle. I nomi rendono possibile selezionare una colonna in modo esplicito:

```text
matrice["quantita"]
col(matrice, "prezzo")
```

Queste espressioni sono equivalenti, rispettivamente, a selezionare la prima e
la seconda colonna. I nomi sono anche riportati come intestazioni quando la
matrice e' mostrata in un widget tabella.

Le colonne nominate descrivono uno schema. Le righe possono crescere, diminuire
o essere aggiornate durante l'esecuzione; non e' invece ammesso modificare il
numero delle colonne con operazioni come `append(..., 1)`, `resize()` su un
numero diverso di colonne o un filtro di colonne. Questa limitazione evita che
un nome finisca associato alla colonna sbagliata.

Quando lo schema non e' piu' appropriato, per esempio dopo una trasposizione,
la matrice continua a essere utilizzabile come matrice ordinaria ma non conserva
i nomi delle colonne.

## Array dinamici e nodi di stato

Un array puo' essere il valore di un nodo di stato. Questo consente di
rappresentare insiemi che cambiano nel tempo: una coda di clienti, una serie di
misure o una popolazione. Funzioni come `append()`, `remove()`, `removeAt()` e
`resize()` permettono di costruire la trasformazione di stato.

Per esempio, se `coda` e' un nodo di stato vettoriale, lo stato prossimo puo'
aggiungere un nuovo valore:

```text
append(this, nuovoCliente)
```

oppure rimuovere un elemento iniziale:

```text
remove(1, this)
```

Per una matrice, `appendRow()` aggiunge una riga e `removeRow()` ne elimina una
data la posizione. Anche `appendRow(matrice, valore)` e' valido: il valore viene
ripetuto in tutte le colonne della nuova riga. Questo e' utile, per esempio,
per aggiungere una riga inizialmente nulla a una tabella di stato.

La dinamica dell'array deve restare coerente con il significato del modello.
Aggiungere una riga a una tabella di agenti puo' rappresentare la nascita di un
agente; eliminarla puo' rappresentarne l'uscita. In questi casi e' importante
aggiornare insieme tutte le proprieta' che devono restare allineate, oppure
rappresentarle come colonne della stessa matrice.

## Una strategia di modellazione

Pensare per array non significa trasformare ogni nodo in un vettore o in una
matrice. Conviene farlo quando una stessa regola si applica a molti elementi
omogenei e quando l'ordine degli elementi ha un significato controllato.

Prima di introdurre un array, sono utili alcune domande:

- che cosa rappresenta un elemento dell'array?
- che cosa rappresentano gli assi di una matrice?
- gli elementi delle diverse grandezze sono allineati nello stesso ordine?
- serve un risultato per ogni elemento oppure una sintesi, come una somma o una media?
- le colonne hanno un significato stabile tale da richiedere un nome?
- la dimensione puo' cambiare nel tempo, e se si' quale cambiamento rappresenta?

Un buon modello rende visibili queste risposte attraverso nomi di nodi,
espressioni compatte e, quando utile, colonne nominate. In questo modo gli
array non sono soltanto una tecnica per ridurre il numero di nodi: diventano un
modo per esprimere chiaramente la struttura ripetuta del sistema.
