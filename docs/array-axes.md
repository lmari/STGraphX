# Array con assi espliciti

La funzione `array` supporta sia la sintassi storica basata sulle dimensioni, sia una nuova sintassi basata sugli assi.

## Sintassi storica

Restano valide senza modifiche:

```text
array(dim, expr)
array([d0,d1,...], expr)
```

Un intero `n` indica un asse standard con coordinate `0,1,...,n-1`. Per esempio:

```text
array(5, $0)
```

produce:

```text
[0,1,2,3,4]
```

mentre:

```text
array([2,3], $0+$1)
```

produce una matrice 2 x 3:

```text
[[0,1,2],[1,2,3]]
```

## Assi espliciti

La forma generale è:

```text
array(axis0, axis1, ..., expr)
```

Ogni asse può essere:

- un intero non negativo `n`, che rappresenta le coordinate `0,1,...,n-1`;
- un vettore di valori, tipicamente prodotto da `range(...)`, i cui elementi sono le coordinate dell'asse.

Dentro `expr`, `$0`, `$1`, ... indicano le coordinate correnti dei rispettivi assi.

Per un vettore unidimensionale, una chiamata diretta a `range(...)` distingue l'asse esplicito dalla vecchia forma basata sulle dimensioni:

```text
array(range(-2,3), $0)
```

produce:

```text
[-2,-1,0,1,2]
```

In particolare:

```text
array(range(2,4), $0)
```

produce il vettore unidimensionale:

```text
[2,3]
```

mentre la forma storica:

```text
array([2,3], $0+$1)
```

continua a interpretare `[2,3]` come shape e produce quindi una matrice 2 x 3.

## Matrici e prodotto cartesiano degli assi

Con due assi, `array` valuta `expr` sul prodotto cartesiano dei domini. Per esempio:

```text
array(range(-2,3), range(10,13), $0+$1)
```

usa:

```text
$0 = -2,-1,0,1,2
$1 = 10,11,12
```

e produce:

```text
[
  [ 8,  9, 10],
  [ 9, 10, 11],
  [10, 11, 12],
  [11, 12, 13],
  [12, 13, 14]
]
```

Gli assi possono essere misti. Per esempio:

```text
array(3, range(-2,3), $0*$1)
```

usa un primo asse standard `0,1,2` e un secondo asse esplicito `-2,-1,0,1,2`.

La nuova forma rende anche possibile scrivere la shape senza vettore:

```text
array(2, 3, $0+$1)
```

che è equivalente alla forma storica:

```text
array([2,3], $0+$1)
```

## Coordinate degli assi e indici posizionali

Le coordinate degli assi non cambiano la semantica dell'indicizzazione degli array.

Se `m` è costruita con:

```text
m = array(range(-2,3), range(10,13), $0+$1)
```

allora `m[0,0]` indica comunque il primo elemento della matrice, cioè `8`. Non significa elemento alle coordinate `(0,0)`.

STGraphX distingue quindi:

- la **posizione interna** dell'elemento, usata da `m[i,j]`, slicing e funzioni analoghe;
- la **coordinata dell'asse**, usata durante la costruzione da `$0`, `$1`, ... e come informazione di presentazione.

## Metadati degli assi

Gli array costruiti da `array` conservano internamente le coordinate dei propri assi come metadati non enumerabili. I valori restano normali array JavaScript e continuano a essere utilizzabili dalle funzioni matematiche e dagli operatori esistenti.

Quando un'operazione mantiene la stessa shape e deriva in modo non ambiguo da un array dotato di assi, STGraphX conserva i metadati. Per esempio:

```text
m2 = m * 2
```

mantiene gli stessi assi di `m`.

Se una trasformazione cambia la struttura in modo da rendere gli assi non più determinabili in modo univoco, i metadati possono essere persi; l'array numerico resta comunque valido.

## Widget matrice

Se il valore visualizzato possiede metadati sugli assi e l'opzione `Mostra indici` è attiva, il widget matrice mostra le coordinate reali degli assi al posto delle posizioni `0,1,2,...`.

Per esempio, per:

```text
array(range(-2,3), range(10,13), $0+$1)
```

le intestazioni delle righe sono:

```text
-2, -1, 0, 1, 2
```

e quelle delle colonne:

```text
10, 11, 12
```

In assenza di metadati sugli assi, il widget continua a mostrare gli indici posizionali standard, come nelle versioni precedenti.

## Compatibilità

La modifica è retrocompatibile con le espressioni esistenti:

```text
array(3, 0)
array(3, $0*2)
array([2,3], $0+$1)
```

mantengono il significato precedente.

La distinzione importante nel caso unidimensionale è quindi:

```text
array(range(2,4), expr)   # asse esplicito con coordinate 2,3
array([2,3], expr)        # forma storica: shape 2 x 3
```
