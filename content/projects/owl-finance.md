## The problem

DeFi lending protocols such as Aave ask for more collateral than the loan, because they know nothing about the borrower. Owl Finance tries to lend with less collateral to borrowers who can prove a good trading record.

The proof comes from zkTLS. zkTLS lets a user show that some data really came from a website over HTTPS, without the website's help and without trusting the user. Here the website is Binance, and the notary that attests the session is Opacity.

## My part

The team was Lumaen Labs. I wrote three pieces.

1. **The scoring service** ([leverage-scoring, `zktls` branch](https://github.com/Lumaen-Labs/leverage-scoring/tree/zktls)), in Rust with Axum. A webhook receives Opacity's results. For each one it recovers the address that signed it (an EIP-191 signature) and compares it with Opacity's published list of notary keys. It merges the Binance profile, balance, spot trades and futures income into one record, computes a score, and writes the score to Solana with a 30-day expiry.
2. **The on-chain credit score** ([lumaen, `leverage` branch](https://github.com/Lumaen-Labs/lumaen/tree/leverage)), an Anchor instruction. It stores the score, the proof's hash and the expiry in an account derived from the user's key. A score above 1,000 is rejected, a stored score can only go up, and reading an expired score returns 0.
3. **The protocol docs** ([owl-docs](https://github.com/Lumaen-Labs/owl-docs)): a whitepaper draft and the architecture pages.

## How the score adds up

The score is the sum of four parts, capped at 1,000: on-chain activity, assets, trading behaviour and repayment history. Take a borrower with a $12,000 Binance balance, 60 spot trades, $1,500 of realized futures profit and no liquidations.

- **Assets:** 90 for a balance of $10,000 or more, plus 10 for a profile, 20 for spot trades and 20 for futures activity, so 140.
- **Behaviour:** 60 for profit of $1,000 or more, plus 40 for 50 or more trades, so 100.
- **On-chain activity and history:** fixed at 200 and 50 for now (see Status).

The total is 200 + 140 + 100 + 50 = 490. The planned table in the program maps 400 to 599 to a maximum leverage of 3x, from 1.5x below 200 up to 5x at 800 and above.

## Status

This is hackathon code. Two of the four parts are placeholders that return fixed values. The branch computes the notary-key check but does not yet use it to reject a result.
