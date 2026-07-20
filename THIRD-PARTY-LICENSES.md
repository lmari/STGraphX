# STGraphX Third-Party Licenses

Luca Mari, versione 20 luglio 2026

Copyright (c) 2026 Luca Mari

## Scopo

Questo file riassume, in forma sintetica, le principali dipendenze terze parti usate da STGraphX e le rispettive licenze, sulla base del controllo locale di `package.json` e `package-lock.json`.

Non sostituisce i testi di licenza originali dei singoli pacchetti.

## Dipendenze dirette dichiarate

| Pacchetto | Versione | Uso principale | Licenza |
| --- | --- | --- | --- |
| `electron` | `^35.0.0` | shell desktop | `MIT` |
| `electron-builder` | `^24.13.3` | packaging desktop | `MIT` |
| `terser` | `^5.49.0` | minificazione bundle player | `BSD-2-Clause` |

## Quadro sintetico delle dipendenze transitive

Dal controllo locale delle dipendenze transitive attualmente installate emerge una prevalenza di licenze permissive, in particolare:

- `MIT`
- `ISC`
- `BSD-2-Clause`
- `BSD-3-Clause`
- `Apache-2.0`

Sono presenti anche alcuni casi isolati con licenze diverse ma comunque permissive o non copyleft forte, tra cui:

- `Python-2.0`
- `BlueOak-1.0.0`

## Nota pratica

Per la redistribuzione di STGraphX:

- includi sempre il file `LICENSE` del progetto;
- conserva i riferimenti alle licenze dei pacchetti terzi secondo quanto richiesto dai rispettivi ecosistemi e artefatti di distribuzione;
- se in futuro il set di dipendenze cambia in modo significativo, aggiorna questo file.
