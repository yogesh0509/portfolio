## What it does

Forest carbon credits today rely on intermediaries to certify them. RaCoTo, the Rainforest Proof-of-Conservation Token, replaces the certifier with public satellite data.

1. A forest owner registers their land with a wallet and ownership documents.
2. After an ownership check, an admin whitelists the owner.
3. The contract sends a Chainlink Functions request: JavaScript that Chainlink's oracle network runs off-chain. It asks Global Forest Watch how much CO2 the registered area absorbed since the last request.
4. The callback awards one token per tonne. 1% goes to the treasury and 99% waits for the owner to claim.

The team built it over two Chainlink hackathons. The second version subtracts areas with recent deforestation alerts from the estimate.

## My part

My commits are in the team's backend repository, which is private. The public [RaCoTo repository](https://github.com/Rainforest-Conservation-Tokens/RaCoTo) holds a copy of the backend as it was submitted in June 2023.

- **Spring 2023:** I wrote the owner registration function and its test. In the token contract I changed the Chainlink Functions callback to book the new tokens to the owner who made the request, so each owner claims their own balance later; before, claims were keyed by request ID. I added a check that only the approved JavaScript source can be sent, by fixing its keccak256 hash when the contract is deployed. I also wrote the deploy and verify scripts and the whitelist tests, and fixed bugs in the Global Forest Watch query.
- **Constellation, December 2023:** I integrated the Global Forest Watch request with Chainlink Functions and redeployed the contracts.

## Status

The contracts ran on Polygon's Mumbai testnet, which was shut down in 2024, so the deployed demo no longer works.
