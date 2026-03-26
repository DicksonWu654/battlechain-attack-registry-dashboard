# BattleChain Attack Registry Dashboard

The BattleChain Attack Registry Dashboard is a public, lightweight frontend that reads on-chain attack registration data directly from BattleChain testnet and renders what is currently in-bounds for attack coordination.

The app is intentionally read-only and does not use private keys.

## Features

- Queries `AttackRegistry` from BattleChain testnet using `viem` and public RPC.
- Decodes and renders agreement state updates from-chain.
- Highlights agreements by current state and whether top-level scope addresses are under active attack.
- One-click copy for agreement and scope addresses.
- Direct links to the BattleChain explorer for every displayed address.
- Light-to-dark theme tuned to match BattleChain docs visual language.

## Live on testnet

- RPC: `https://testnet.battlechain.com`
- Chain ID: `627`
- Default registry: `0xdD029a6374095EEb4c47a2364Ce1D0f47f007350`

## Requirements

- Node.js 18+
- npm

## Getting started

From this directory:

```bash
npm install
npm run dev
```

Then open the printed local URL (defaults to `http://127.0.0.1:4173`).

### Production build

```bash
npm run build
npm run preview
```

## Why hardcoded RPC/addresses

Everything here is currently read-only and public:

- no wallet connection required
- no API keys required
- no private signing flow

If the registry/chain configuration changes in the future, edit constants in `src/App.tsx`.

## Repository scripts

- `npm run dev`: start local dev server.
- `npm run start`: alias for `vite`.
- `npm run build`: compile TypeScript and bundle for production.
- `npm run typecheck`: run TypeScript checks.
- `npm run preview`: preview production build.

## Security

This repository is open and read-only by design:

- no secret management is required
- no signing capabilities are implemented
- no account storage or backend calls are performed

For the complete threat model and reporting process, see [SECURITY.md](SECURITY.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT. See [LICENSE](LICENSE).

## Screenshot

![Dashboard preview](dashboard.png)
