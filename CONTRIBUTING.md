# Contributing

Thanks for working on this dashboard.

## Development flow

1. Install dependencies:

```bash
npm install
```

2. Start the app:

```bash
npm run dev
```

3. Make focused changes and keep dependencies minimal.
4. Run:

```bash
npm run typecheck
npm run build
```

before suggesting a merge.

## Style

- Keep UI styling aligned to the existing dark, high-contrast theme.
- Prefer small, targeted patches.
- Do not introduce unnecessary dependencies.
- Keep on-chain reads read-only.

## Notes

This is a standalone project intended for public dashboards only; keep any hardcoded endpoints explicit and documented.
