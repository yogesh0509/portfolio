## The problem

A Bitcoin light wallet cannot read the blockchain itself, so it asks an Electrum server about every address it owns. That includes change addresses and the next unused ones. The questions arrive together on one connection, so the server learns the whole wallet: which addresses are mine, what they hold and where they have been.

Hashing the addresses does not hide them. The protocol sends the SHA-256 of the address's script, byte-reversed, and anyone can compute that from an address.

## What Haystack does

Each real address is sent together with `padding − 1` decoys of the same script type, shuffled. At padding 10 the server receives 1,000 addresses for a 100-address wallet and answers all of them. The wallet keeps only its own answers.

The decoys are **fixed**, not redrawn. Each one is derived with an HMAC from a key built from the wallet's account public keys, so every sync, device and reinstall sends the same decoys. Redrawing them would be a mistake: a server that watches several rounds can intersect them, because real addresses show up every round and fresh decoys do not. At the pinned commit (`c745fe6`), `python3 -m attack strategies` shows exactly that over six rounds against an attacker who sees every query: redrawn decoys fall to 0 bits by the third round, while fixed ones hold at 3.32 bits in all six.

## Measuring privacy in bits

The `attack/` module plays the server. It ranks every queried address by how likely it is to be real, takes its top guesses, and computes how many of them are right. The score is `bits = −log₂(precision)`, never below what pure chance would give.

- Plain Electrum scores **0.00 bits**: the attacker is always right.
- At padding 10, an attacker who can do no better than chance scores **3.32 bits** (log₂ 10 = 3.32).

## What the project reports

These figures are from the project's own README and docs, not recomputed here.

- At padding 10 a sync costs about **8.4 times** the bytes of a plain one (regtest, steady state, with the saved cache, application bytes only).
- The attacker's score averages about **2.6 to 2.7 bits** over 13 test wallets: 12 synthetic wallets plus the demo wallet.

It is obfuscation, not cryptography, and the README says so. Funded addresses of a restored wallet stay exposed unless some decoys come from the chain, and those are fetched through the same server. Timing and on-chain linkability attacks are not built, and it has been tried against only two public servers.

## How it is built

- **Rust:** `haystack-electrum` is the padded Electrum client, with the same `full_scan` call as `bdk_electrum` (an app needs five changes to use it). It builds on `bdk_wallet` and ports parts of `bdk_electrum`, credited in the source.
- **Python (standard library only):** the attacker, its scoring and the experiments.
- **Demo wallet:** a local web page with a padding dial and a live score. It runs on your machine, not on this site.

Written by me over about four weeks, September to October 2026, for the BOSS Battle Cypherpunk track. GPL-3.0.
