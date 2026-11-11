## What Djed is

Djed is a crypto-backed stablecoin protocol. Users mint a stable coin and a reserve coin against a reserve of a base coin. The contract prices them from an oracle, a contract that reports the base coin's price, and keeps the reserve ratio inside a band.

I worked on it for three years: first as an outside contributor from 2023, then as a **Google Summer of Code 2024** intern, then again in 2025 and 2026.

## What I built

- **Oracle adapters** (2023): wrappers that let Djed read prices from API3 and from Chainlink.
- **Deployment scripts** (2024): Foundry scripts and per-network settings for deploying the oracle and the Djed contract. I recorded the Sepolia oracle address in the deployment parameters.
- **Reserve-coin pricing:** I separated the reserve coin's minimum price from its initial price, then fixed a swapped pair of variables in the follow-up change.
- **The Shu oracle converter**, described below.
- **Dashboard changes:** in the web dashboard, I replaced hard-coded chain names and limits with environment variables, added a Sepolia build, and temporarily limited wallet support to MetaMask.

## The Shu oracle converter

Where Djed uses one price, Djed Shu uses two: a maximum and a minimum. Most oracles report only one price, so the converter turns a one-price oracle into a two-price one.

It keeps 24 hourly buckets. Each bucket holds the running mean of the prices observed during that hour. The reported maximum and minimum are the largest and smallest of the 24 buckets. Anyone can call the function that takes a new observation.

The excerpt in this folder is the version after my 2026 fix to my own earlier code. The earlier version compared absolute hours with a bucket index, filled skipped hours with the new price instead of the last recorded one, and rescanned the extremes only when the hour rolled over. The fix corrects the window logic and updates the tests whose expectations had encoded the old behaviour.

`DjedShu.sol` is a modified copy of `Djed.sol`, written by the protocol's authors. I adapted it to use the two prices.

## The demo video

The video in this folder, "Djed Shu Demo (Ethereum Classic Hackathon)", was posted by Stability Nexus on 10 March 2025 and is 82 seconds long. Its description says that Ethereum Classic, a public blockchain, had only a single-price oracle, so an oracle adapter was built that remembers prices over a range of time to produce the two prices Djed Shu needs. It also says the adapter and a Djed Shu contract were deployed to Mordor, Ethereum Classic's test network, where no real money is at stake.

By that behaviour, what the description calls an oracle adapter matches the converter above. My pull request for the converter was opened in May 2024 and merged on 10 March 2025, so the demo predates my 2026 fix. The description does not say who speaks in the video.

## Tests

`forge test` at the pinned commit runs 39 tests, all passing, including the three for the converter.
