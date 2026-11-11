## What it does

Shikamaru runs three AI agents on elizaOS, an agent framework. Each agent is a character with one risk level: conservative, moderate or aggressive. An agent reads current yields from zkLend, a Starknet lending market, and Ekubo, a Starknet exchange, then decides how to split a sum between them and sends the Starknet transactions.

The risk level sets how much may go to each protocol. These bounds are percentages of the total.

| Risk level | Lending (zkLend) | Liquidity pools (Ekubo) |
|---|---|---|
| Conservative | 60 to 80 | 10 to 20 |
| Moderate | 45 to 65 | 25 to 35 |
| Aggressive | 25 to 45 | 35 to 55 |

## How a split is chosen

Each pool gets a risk-adjusted return: its yield minus a 2% risk-free rate, divided by a volatility proxy (24-hour volume over total value locked), and reduced when that proxy exceeds the tier's drawdown limit. Each protocol starts at its minimum share and grows towards its maximum as market conditions favour it. Its share is then divided among its best three pools in proportion to their risk-adjusted returns. The excerpt is that allocation code.

## Status

The repository holds the TypeScript agent only. It has no contracts of its own; the agents call zkLend and Ekubo directly. zkLend, one of the two protocols it allocates to, was drained in an exploit in February 2025.
