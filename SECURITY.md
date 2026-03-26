# Security Policy

This project is intended to be a read-only, public dashboard for BattleChain testnet data.

## Security model

- No private keys are used.
- No user authentication is performed.
- No transaction execution or signing is included.
- RPC access is over public endpoints only.

Because the app never holds secrets and only reads public on-chain logs and contract views, the attack surface is limited to standard frontend concerns (dependency integrity, supply-chain risk, UI trust boundaries).

## Reporting issues

If you find a security issue, please report privately using the repository issue tracker and tag it with `[security]`.

Please include:

- reproducible steps
- browser and OS details
- proof-of-concept impact

## Response expectations

- We review critical reports with high priority and keep follow-ups transparent in the issue thread.
- Non-security bugs should go through standard issue templates.
