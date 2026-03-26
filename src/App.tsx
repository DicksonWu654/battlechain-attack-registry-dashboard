import { useEffect, useMemo, useState, useTransition } from 'react';
import {
  createPublicClient,
  getAddress,
  http,
  isAddress,
  zeroAddress,
  parseAbi,
  parseAbiItem,
  type AbiEvent,
  type Address,
  type Hex,
} from 'viem';

const RPC_URL = 'https://testnet.battlechain.com';
const ATTACK_REGISTRY: Address = '0xdD029a6374095EEb4c47a2364Ce1D0f47f007350';
const CHAIN_ID = 627;
const EXPLORER_BASE = 'https://explorer.testnet.battlechain.com';

const registryAbi = parseAbi([
  'function getAgreementState(address agreementAddress) view returns (uint8)',
  'function isTopLevelContractUnderAttack(address contractAddress) view returns (bool)',
  'event ContractRegistered(address indexed first, address indexed second)',
  'event AgreementStateChanged(address indexed agreementAddress, uint8 state)',
]);

const agreementAbi = parseAbi([
  'function getProtocolName() view returns (string)',
  'function getBattleChainScopeAddresses() view returns (address[])',
]);

const STATE_CHANGED: AbiEvent = parseAbiItem(
  'event AgreementStateChanged(address indexed agreementAddress, uint8 state)',
);

const stateLabels: Record<number, { label: string; tone: string }> = {
  1: { label: 'NEW_DEPLOYMENT', tone: 'state-awaiting' },
  2: { label: 'ATTACK_REQUESTED', tone: 'state-warning' },
  3: { label: 'UNDER_ATTACK', tone: 'state-danger' },
  4: { label: 'PROMOTION_REQUESTED', tone: 'state-info' },
  5: { label: 'PROMOTION_APPROVED', tone: 'state-success' },
};

type ContractRow = {
  agreementAddress: Address;
  protocolName: string;
  state: number;
  stateLabel: string;
  stateTone: string;
  scopeAddresses: Address[];
  underAttack: boolean;
  underAttackCount: number;
  lastBlock: bigint;
};

type UiState = {
  contracts: ContractRow[];
  loading: boolean;
  error: string | null;
  lastUpdatedAt: Date | null;
};

const client = createPublicClient({
  transport: http(RPC_URL),
});

type AgreementStateLog = {
  args: {
    agreementAddress: Address;
    state: Hex | bigint;
  };
  blockNumber?: bigint;
};

const fromHexNumber = (value: unknown): number => {
  if (typeof value === 'bigint') {
    return Number(value);
  }
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string' && /^0x[0-9a-fA-F]+$/.test(value)) {
    return Number(BigInt(value));
  }
  return NaN;
};

const toShortAddress = (addr: Address) => `${addr.slice(0, 8)}...${addr.slice(-6)}`;

const formatTime = (time: Date | null) =>
  time ? new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC', timeStyle: 'medium', dateStyle: 'short' }).format(time) : '—';

const CopyIcon = () => (
  <svg
    aria-hidden="true"
    className="address-action-icon"
    fill="none"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M8 9.75A2.75 2.75 0 0 1 10.75 7h5a2.75 2.75 0 0 1 2.75 2.75v5A2.75 2.75 0 0 1 15.75 17H14V15.5h1.75a1.25 1.25 0 0 0 1.25-1.25v-5A1.25 1.25 0 0 0 15.75 8h-5A1.25 1.25 0 0 0 9.5 9.25V11H8v-.25Z"
      fill="currentColor"
    />
    <path
      d="M6.75 17h-.5a2.25 2.25 0 0 1-2.25-2.25v-7.5a2.25 2.25 0 0 1 2.25-2.25h.5v1.5h-.5a.75.75 0 0 0-.75.75v7.5c0 .414.336.75.75.75h.5V17Zm8.25 1.5H8.25A2.25 2.25 0 0 1 6 16.25V8.75A2.25 2.25 0 0 1 8.25 6.5h6.5A2.25 2.25 0 0 1 17 8.75v7.5a2.25 2.25 0 0 1-2.25 2.25h-4.5Zm1-6.25h-6.5a.75.75 0 0 0-.75.75v4.25h6.5a.75.75 0 0 0 .75-.75v-4.5h-.5a.75.75 0 0 1-.75-.75Zm-2.75 1h.75a.5.5 0 0 1 .5.5v3.5a.5.5 0 0 1-.5.5h-.75a.5.5 0 0 1-.5-.5v-3.5a.5.5 0 0 1 .5-.5Z"
      fill="currentColor"
    />
  </svg>
);

const ChainIcon = () => (
  <svg
    aria-hidden="true"
    className="address-action-icon"
    fill="none"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M9.75 13A2.25 2.25 0 1 1 12 15.25 2.248 2.248 0 0 1 9.75 13Zm-3.25 0a3.75 3.75 0 1 0 3.75-3.75 3.75 3.75 0 0 0-3.75 3.75Zm3.5 5.5a3.75 3.75 0 1 0 3.75-3.75 3.75 3.75 0 0 0-3.75 3.75Zm4.5 0a2.25 2.25 0 1 1 2.25 2.25A2.25 2.25 0 0 1 14 18.5Z"
      fill="currentColor"
      fillOpacity="0.95"
    />
    <path
      d="M14.75 8.5H14a3.75 3.75 0 1 0-3.75 3.75h.75m3.25-3.75H15a.75.75 0 0 1 .75.75V10"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
    <path
      d="M9.25 15.5H10A3.75 3.75 0 1 0 13.75 11.75H13"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
  </svg>
);

export function App() {
  const [state, setState] = useState<UiState>({
    contracts: [],
    loading: true,
    error: null,
    lastUpdatedAt: null,
  });
  const [isPending, startTransition] = useTransition();
  const [copiedAddress, setCopiedAddress] = useState<Address | null>(null);

  const underAttackContracts = useMemo(
    () => state.contracts.filter((item) => item.underAttack),
    [state.contracts],
  );

  const load = async () => {
    try {
      const latestBlock = await client.getBlockNumber();
      const stateChangedLogs = (await client.getLogs({
        address: ATTACK_REGISTRY,
        event: STATE_CHANGED,
        fromBlock: 0n,
        toBlock: latestBlock,
      })) as unknown as AgreementStateLog[];

      const latestStateByAgreement = new Map<Address, number>();
      const agreementBlocks = new Map<Address, bigint>();
      for (const log of stateChangedLogs) {
        const agreement = getAddress(log.args.agreementAddress as Address);
        if (agreement === zeroAddress) {
          continue;
        }
        const stateValue = fromHexNumber(log.args.state);
        if (!Number.isNaN(stateValue)) {
          latestStateByAgreement.set(agreement, stateValue);
        }
        if (log.blockNumber) {
          agreementBlocks.set(agreement, log.blockNumber);
        }
      }

      const rows: ContractRow[] = await Promise.all(
        [...agreementBlocks.entries()].map(async ([agreementAddress, lastBlock]) => {
          const protocolName = await client
            .readContract({
              address: agreementAddress,
              abi: agreementAbi,
              functionName: 'getProtocolName',
            })
            .catch(() => 'Untitled protocol');

          const scopeAddresses = await client
            .readContract({
              address: agreementAddress,
              abi: agreementAbi,
              functionName: 'getBattleChainScopeAddresses',
            })
            .catch(() => [] as Address[]);

          const resolvedScopes = scopeAddresses.filter((scope) => isAddress(scope));

          const onChainState = await client
            .readContract({
              address: ATTACK_REGISTRY,
              abi: registryAbi,
              functionName: 'getAgreementState',
              args: [agreementAddress],
            })
            .catch(() => latestStateByAgreement.get(agreementAddress));

          const stateNumber = fromHexNumber(onChainState);
          const stateMeta = Number.isFinite(stateNumber) && stateNumber >= 0 ? stateLabels[stateNumber] : undefined;

          const underAttackFlags = await Promise.all(
            resolvedScopes.map((scope) =>
              client
                .readContract({
                  address: ATTACK_REGISTRY,
                  abi: registryAbi,
                  functionName: 'isTopLevelContractUnderAttack',
                  args: [scope],
                })
                .catch(() => false),
            ),
          );

          const underAttackCount = underAttackFlags.filter(Boolean).length;
          const underAttack = underAttackCount > 0;

          return {
            agreementAddress,
            protocolName,
            state: Number.isNaN(stateNumber) ? 0 : stateNumber,
            stateLabel: stateMeta?.label ?? 'UNKNOWN',
            stateTone: stateMeta?.tone ?? 'state-neutral',
            scopeAddresses: resolvedScopes,
            underAttack,
            underAttackCount,
            lastBlock,
          };
        }),
      );

      setState({
        contracts: rows.sort((a, b) => {
          if (a.underAttack === b.underAttack) {
            if (a.lastBlock === b.lastBlock) {
              return a.agreementAddress.localeCompare(b.agreementAddress);
            }
            return a.lastBlock > b.lastBlock ? -1 : 1;
          }
          return b.underAttack ? 1 : -1;
        }),
        loading: false,
        error: null,
        lastUpdatedAt: new Date(),
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Could not fetch on-chain data from BattleChain testnet registry';
      setState((current) => ({
        ...current,
        loading: false,
        error: message,
      }));
    }
  };

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 60_000);
    return () => clearInterval(timer);
  }, []);

  const refresh = () => {
    setState((current) => ({ ...current, loading: true }));
    startTransition(() => {
      void load();
    });
  };

  const copyAddress = async (address: Address) => {
    await navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    window.setTimeout(() => {
      setCopiedAddress((current) => (current === address ? null : current));
    }, 1250);
  };

  const getExplorerLink = (address: Address) => `${EXPLORER_BASE}/address/${address}`;
  const addressActions = (address: Address, label = 'Address') => {
    const isCopied = copiedAddress === address;
    return (
      <span className="address-actions">
        <button className={`address-action ${isCopied ? 'address-action-copied' : ''}`} onClick={() => copyAddress(address)} type="button">
          <CopyIcon />
          {isCopied ? 'Copied' : `Copy ${label}`}
        </button>
        <a className="address-action" href={getExplorerLink(address)} rel="noreferrer" target="_blank">
          <ChainIcon />
          Explorer
        </a>
      </span>
    );
  };

  return (
    <main className="shell">
      <div className="shell-bg" />
      <div className="shell-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">BattleChain Dashboard</p>
            <h1>Attack Registry</h1>
            <p className="subtext">
              Tracking agreement states from {ATTACK_REGISTRY} on BattleChain testnet ({`chainId ${CHAIN_ID}`}) and linked scope contracts.
            </p>
          </div>
          <button className="refresh" onClick={refresh} disabled={state.loading || isPending}>
            {state.loading || isPending ? 'Refreshing…' : 'Refresh'}
          </button>
        </header>

        <section className="metrics">
          <article className="metric-card reveal reveal-1">
            <p className="metric-kicker">Total agreements</p>
            <p className="metric-value">{state.contracts.length}</p>
          </article>
          <article className="metric-card reveal reveal-2">
            <p className="metric-kicker">Under attack</p>
            <p className="metric-value">{underAttackContracts.length}</p>
          </article>
          <article className="metric-card reveal reveal-3">
            <p className="metric-kicker">Last updated</p>
            <p className="metric-value metric-small">{formatTime(state.lastUpdatedAt)}</p>
          </article>
        </section>

        {state.error ? <p className="error-banner">{state.error}</p> : null}

        <section className="grid-cards">
          {!state.loading && state.contracts.length === 0 ? (
            <p className="state-message">No on-chain agreements found yet.</p>
          ) : null}

          {state.contracts.map((item, index) => {
            const toneClass = `contract-card ${item.stateTone}`;
            return (
              <article key={item.agreementAddress} className={`reveal reveal-${((index % 6) + 1).toString()}`}>
                <div className={toneClass}>
                  <div className="card-head">
                    <div>
                      <p className="protocol">{item.protocolName}</p>
                      <p className="agreement-address">
                        <span>Agreement</span> {toShortAddress(item.agreementAddress)}
                      </p>
                      <div className="address-row">
                        <span className="address-text">{item.agreementAddress}</span>
                        {addressActions(item.agreementAddress, 'agreement')}
                      </div>
                    </div>
                    <span className={`pill ${item.stateTone}`}>{item.stateLabel}</span>
                  </div>
                  <div className="card-meta">
                    <p>
                      <span className="meta-label">Scopes:</span> {item.scopeAddresses.length}
                    </p>
                    <p>
                      <span className="meta-label">Attack state:</span>{' '}
                      <strong>{item.underAttack ? `${item.underAttackCount} scope(s)` : 'none active'}</strong>
                    </p>
                  </div>
                  <div className="scope-list">
                    {item.scopeAddresses.length === 0 ? (
                      <p className="scope-item">No registered scope addresses</p>
                    ) : (
                      item.scopeAddresses.map((scope) => (
                        <div className="scope-item" key={scope}>
                          <span>{scope}</span>
                          {addressActions(scope, 'scope')}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </article>
            );
          })}

          {state.loading ? (
            <div className="loading-state reveal reveal-4">
              <p>Loading on-chain registry data from testnet...</p>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
