## What it is

Trustless Work describes its product as escrow as a service for stablecoin payments on Stellar, a public blockchain built for payments. An escrow holds money until agreed conditions are met. `trustlesswork-spikes` is the company's repository for "spikes, POCs, docs, and research": short experiments to find out whether an idea works. The repository was called `Product` until it was renamed, which is why my fork, [yogesh0509/Product](https://github.com/yogesh0509/Product), still has that name. The pull request came from its `feat/eliza-plugin` branch.

## The task

Trustless Work's API returns transactions that still need a signature, as XDR strings. XDR is the binary format Stellar uses for transactions, usually written as one long base64 string (bytes written as letters and digits). In February 2025 a maintainer opened [issue 46](https://github.com/Trustless-Work/trustlesswork-spikes/issues/46): build an elizaOS plugin that lets an AI agent sign Stellar transactions. elizaOS is an open-source framework for chat agents, and a plugin is a package that adds abilities to one. I took the issue. It also asked for tests on dummy transactions, a security and risk assessment, secure key handling and documentation.

## What I built

The plugin adds an action to an elizaOS agent, which is something the agent can do when a message calls for it. If a message contains a run of 50 or more base64 characters, the action takes the first such run as the transaction. It picks Stellar's test network when the message says "testnet" and the public network otherwise, signs the transaction with the secret key from the agent's settings through the Stellar SDK, and saves the signed string in the agent's database. The plugin also has an evaluator, a check that runs after the agent replies, which asks the language model to pull XDR strings out of the recent chat.

The excerpt is the signing method, from `eliza-plugin-stellar/src/plugins/plugin-stellar/actions/index.ts` at commit `1a0f782`. It is a method of a class, which is why it starts indented.

The pull request added 18,722 lines, and 17,222 of them (92%) are two `pnpm-lock.yaml` files. The signing action, the evaluator's prompt and examples, the plugin registration, a sample script and the character file are mine. The settings check, the runner script and the package files are adapted from elizaOS's own `plugin-starknet` and agent startup code and from a plugin starter template.

## Status

It is a spike: merged on 5 March 2025 and unchanged on `main` since. It signs a transaction. It does not send it to Stellar, and it does not call Trustless Work's API, which the issue lists as a future task. The change has no tests, no risk assessment and no hardware-protected key storage.

These notes come from reading the plugin and the elizaOS 0.1.7 source it pins. I have not run it.

- The signed string is saved but never sent back to the chat.
- The included script never runs the evaluator, and the evaluator names an action the plugin does not define.
- The character file's secret is the placeholder `{{STELLAR_SECRET_KEY}}`, which nothing replaces, and the runner opens `data/db.sqlite` without creating the `data` folder. A fresh clone probably fails before it signs anything.
- It signs any transaction found in a message, without checking the source account, the operations or who asked. If the key setting is missing, the action's check throws on every message.
