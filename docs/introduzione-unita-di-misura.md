# Ragionare con le unità di misura in STGraphX

Un modello dinamico non contiene soltanto numeri. Una variabile può indicare
una popolazione, una distanza, un flusso di denaro o una temperatura. Il numero
`12`, da solo, non chiarisce se rappresenti 12 persone, 12 metri oppure 12 euro
all'anno. L'unità di misura completa il significato di un valore e aiuta a
controllare che le relazioni scritte nel modello abbiano senso.

STGraphX consente di associare un'unità a parametri, variabili di input e
variabili di stato. A partire da queste dichiarazioni può inferire le unità
delle variabili dipendenti e segnalare molte incompatibilità dimensionali.
Questo controllo non sostituisce il giudizio del modellista, ma rende più
facile individuare errori che altrimenti produrrebbero numeri apparentemente
plausibili.

## Numeri con un significato

Consideriamo una distanza `d` di 120 metri e un tempo `t` di 15 secondi. La
velocità media è:

$$
v=\frac{d}{t}.
$$

Se `d` ha unità `m` e `t` ha unità `s`, la variabile

```text
v = d / t
```

ha unità `m/s`. L'espressione aritmetica da sola calcola correttamente il
numero `8`; l'informazione sulle unità permette però di leggere quel numero
come 8 metri al secondo.

Le unità hanno soprattutto una funzione di controllo. Possiamo sommare due
distanze, per esempio `d1 + d2`, ma non è normalmente sensato sommare una
distanza e un tempo. Analogamente, una quantità di denaro non può essere
sommata direttamente a un flusso di denaro per unità di tempo:

$$
\text{euro}+\frac{\text{euro}}{\text{anno}}
$$

non è un'espressione dimensionalmente omogenea.

## Dichiarare un'unità in un nodo

Nella barra di configurazione di un nodo e nella finestra dell'editor delle
espressioni è disponibile il campo **Unità**. Qui si scrive il simbolo o
l'espressione dimensionale associata al valore del nodo.

Per esempio, in un modello di crescita di un capitale possiamo dichiarare:

| Variabile | Ruolo | Unità |
| --- | --- | --- |
| `capitale0` | parametro | `€` |
| `tasso` | parametro | `1/anno` |
| `capitale` | stato | ereditata da `capitale0` |
| `interessi` | algebrica | inferita |

Se lo stato iniziale di `capitale` è l'espressione `capitale0`, STGraphX può
ereditarne l'unità. Se il suo stato prossimo è:

```text
this + capitale * tasso * dt
```

il termine aggiunto ha ancora unità `€`: `tasso` è espresso per anno e `dt`
ha l'unità di tempo del modello. La somma è quindi coerente.

L'unità di `dt` si definisce nella configurazione del modello, nel campo
**Unità di tempo**. È importante dichiararla quando il modello usa
`integral(...)`, derivate, flussi oppure equazioni di transizione con `dt`.

## Le regole elementari

Le regole dimensionali seguono l'algebra ordinaria delle unità:

| Operazione | Esempio | Unità del risultato |
| --- | --- | --- |
| somma o sottrazione | `d1 + d2` | le due unità devono essere compatibili; il risultato è espresso nella scala della variabile di riferimento |
| prodotto | `forza * distanza` | prodotto delle unità |
| divisione | `d / t` | rapporto delle unità |
| potenza intera | `l ^ 2` | unità elevata alla stessa potenza |
| radice | `sqrt(area)` | radice dell'unità, se definibile |
| integrale | `integral(v)` | unità di `v` moltiplicata per l'unità di tempo |

Per esempio, se `forza` è in `N` e `massa` in `kg`, l'espressione

```text
forza / massa
```

ha unità `m/s^2`. STGraphX conosce le principali relazioni del Sistema
Internazionale, fra cui `N = kg*m/s^2`, `J = N*m` e `W = J/s`.

Le funzioni trigonometriche richiedono argomenti adimensionali o angoli in
radianti. Il radiante viene mantenuto come indicazione semantica: una velocità
angolare può quindi essere visualizzata come `rad/s`, non soltanto come `1/s`.

## Unità equivalenti e prefissi

Un modello può usare unità compatibili ma espresse con scale diverse. Per
esempio 1 metro e 100 centimetri rappresentano la stessa dimensione. Nelle
operazioni additive STGraphX converte il valore nella scala dell'operando che
funge da riferimento:

```text
lunghezzaMetri + lunghezzaCentimetri
```

può quindi produrre `1.1 m` se i valori sono rispettivamente `1 m` e `10 cm`.

Sono gestiti i prefissi SI più comuni, compresi `k`, `M`, `m`, `c`, `u`/`µ`,
`n` e `p`, per le unità alle quali essi si applicano. I prefissi non vengono
invece applicati automaticamente a valute e temperature affine come `°C` e
`°F`.

## Definire nuove unità

La voce **Strumenti → Unità di misura...** apre la finestra di gestione delle
unità definite dal modello. Per ogni riga si possono specificare:

| Campo | Significato |
| --- | --- |
| **Simbolo** | la forma tecnica da usare nelle espressioni e nei campi delle unità |
| **Definizione** | la relazione dimensionale del simbolo |
| **Nome singolare** | la forma mostrata con valori `1` e `-1` |
| **Nome plurale** | la forma mostrata con gli altri valori scalari |

Per esempio, per contare oggetti si può introdurre:

```text
Simbolo:        pezzo
Definizione:    1
Nome singolare: pezzo
Nome plurale:   pezzi
```

Possiamo anche definire un'unità di tempo leggibile a partire dal secondo:

```text
Simbolo:        giorno
Definizione:    86400*s
Nome singolare: giorno
Nome plurale:   giorni
```

Il simbolo deve essere quello usato per dichiarare le unità dei nodi. Le forme
singolare e plurale sono destinate alla visualizzazione e non cambiano il
significato dimensionale del modello.

Quando un valore scalare ha un'unità definita dal modello, STGraphX usa la
forma grammaticale appropriata nei tooltip e nell'help contestuale. Per
esempio, con l'unità `pezzo`:

```text
1 pezzo
2 pezzi
```

La stessa regola vale per unità composte nel cui numeratore compare l'unità
definita:

```text
1 pezzo/giorno
2 pezzi/giorno
```

Nei titoli di tabelle, negli assi dei grafici e nelle espressioni rimane invece
il simbolo tecnico, per esempio `pezzo/giorno`: in questi contesti non c'è un
singolo valore che permetta di scegliere tra singolare e plurale.

## Un esempio: un serbatoio

Supponiamo di descrivere l'acqua contenuta in un serbatoio. Indichiamo con
`volume` lo stato, con `ingresso` il flusso in entrata e con `uscita` quello in
uscita.

| Variabile | Tipo | Espressione | Unità |
| --- | --- | --- | --- |
| `volume0` | parametro | `100` | `m^3` |
| `ingresso` | parametro | `4` | `m^3/s` |
| `uscita` | parametro | `1` | `m^3/s` |
| `volume` | stato | stato iniziale: `volume0` | `m^3` |

Lo stato prossimo è:

```text
this + (ingresso - uscita) * dt
```

Il termine `(ingresso - uscita)` ha unità `m^3/s`; moltiplicandolo per `dt`,
espresso in secondi, otteniamo `m^3`. La somma con `this` è quindi lecita.

Se dimenticassimo `* dt`, l'espressione tenterebbe invece di sommare `m^3` e
`m^3/s`. Il controllo delle unità può segnalare il problema prima di fidarsi
di una simulazione che produce comunque dei numeri.

```mermaid
flowchart LR
    classDef default fill:none,stroke:none;
    i["ingresso<br/>m^3/s"] --> v["volume<br/>m^3"]
    u["uscita<br/>m^3/s"] --> v
    d["dt<br/>s"] --> v
```

## Unità inferite e unità dichiarate

Un'unità può essere **dichiarata** dal modellista oppure **inferita** da
STGraphX. Una dichiarazione esplicita è utile per le grandezze indipendenti e
per i nodi il cui significato deve restare ben documentato. L'inferenza è
particolarmente utile per risultati intermedi e variabili algebriche.

Se l'unità di una variabile dipendente viene inferita, il campo corrispondente
nell'interfaccia appare in sola lettura. Per modificarne il significato occorre
intervenire sulle unità delle variabili da cui dipende oppure sulla formula.

L'inferenza non determina automaticamente il significato fisico o economico di
una grandezza. Se un'espressione moltiplica due valori adimensionali, il
risultato resta adimensionale anche se il modellista, nel dominio applicativo,
vorrebbe chiamarlo “numero di persone”. In questi casi è opportuno dichiarare
un'unità o documentare esplicitamente la convenzione adottata.

## Errori, warning e definizioni rigorose

La funzione **Strumenti → Analizza modello...** include controlli sulle unità
di misura. Può segnalare, fra gli altri, i seguenti problemi:

- unità scritta con sintassi non valida;
- definizione di unità incompleta, duplicata o ricorsiva;
- somma, sottrazione o confronto tra unità incompatibili;
- unità dichiarata per un nodo incompatibile con quella inferita dalla sua
  espressione;
- stato iniziale e stato prossimo con unità incompatibili.

I risultati del controllo vengono mostrati nella finestra di analisi e, quando
le **Definizioni rigorose** sono attive, anche direttamente sul grafo. In tale
modalità, se le unità delle grandezze indipendenti sono specificate e viene
rilevata un'incompatibilità, l'esecuzione viene bloccata finché il problema non
è corretto oppure non si disattiva la modalità rigorosa.

Il controllo può essere disattivato dalle opzioni di visualizzazione quando si
sta ancora abbozzando un modello. Conviene però riattivarlo non appena le
principali variabili hanno acquisito un significato stabile.

## Vettori, matrici e limiti del controllo

In STGraphX un vettore o una matrice può cambiare dimensione durante
l'esecuzione. Per le unità di misura vale l'ipotesi di **omogeneità**: tutti
gli elementi di una stessa variabile non scalare hanno la stessa unità.

Per esempio, un vettore di velocità ha unità `m/s` per ogni suo elemento. Non
è invece possibile usare una sola dichiarazione di unità per un vettore che
mescoli metri, secondi ed euro in posizioni diverse. In quella situazione è
preferibile usare variabili distinte oppure una struttura esplicitamente
documentata.

Il sistema controlla le relazioni dimensionali, non tutte le questioni di
significato. Due grandezze possono entrambe essere espresse in euro e tuttavia
non essere sensato sommarle nel contesto del modello. Allo stesso modo, una
conversione numericamente possibile non sostituisce una scelta consapevole
delle scale, delle convenzioni e delle definizioni operative.

Le unità di misura sono quindi un supporto al ragionamento: rendono le ipotesi
più leggibili, aiutano a prevenire errori e collegano le formule del modello
alle grandezze reali o concettuali che esse intendono rappresentare.
