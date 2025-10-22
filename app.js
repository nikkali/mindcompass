const STORAGE_KEY = 'mindcompass_state_v1';
const STATUS_DURATION = 6000;

const SCORE_FIELDS = [
  {
    key: 'activityRate',
    label: 'Activity rate',
    hint: '≥5 round-trips in the last 24–48h',
  },
  {
    key: 'liquidityDiscipline',
    label: 'Liquidity discipline',
    hint: 'Trades liquid, untaxed tokens',
  },
  {
    key: 'holdingTime',
    label: 'Holding time',
    hint: 'Consistent scalp holds (minutes → hours)',
  },
  {
    key: 'venueConsistency',
    label: 'Venue consistency',
    hint: 'Uses repeatable routes (Jupiter / AMMs)',
  },
  {
    key: 'drawdownControl',
    label: 'Drawdown control',
    hint: 'Cuts losers quickly',
  },
];

const CHECKS = [
  {
    key: 'repeatAppearances',
    label: 'Repeat Birdeye hits (30m–2h window)',
  },
  {
    key: 'sensibleSizes',
    label: 'Ticket sizes in $1K–$10K / >$10K buckets',
  },
  {
    key: 'liquidPairs',
    label: 'Trades liquid pairs (no taxes/honeypots)',
  },
  {
    key: 'confirmedExits',
    label: 'Solscan shows round-trip exits',
  },
  {
    key: 'sessionConsistency',
    label: 'Multiple consistent sessions',
  },
];

const ALERT_STEPS = [
  {
    key: 'solscanWatchlist',
    label: 'Added to Solscan Watchlist',
  },
  {
    key: 'solscanAlerts',
    label: 'Enabled Solscan notification bot',
  },
  {
    key: 'birdeyePinned',
    label: 'Pinned Birdeye Find Trades tab',
  },
  {
    key: 'paperMirror',
    label: 'Paper-mirrored 10 trades',
  },
];

const defaultState = {
  wallets: [],
  settings: {
    birdeyeKey: '',
    solscanKey: '',
  },
};

let state = loadState();
let statusTimeout;

const template = document.getElementById('walletTemplate');
const board = document.querySelector('.board');
const candidateForm = document.getElementById('candidateForm');
const apiConfigForm = document.getElementById('apiConfigForm');
const exportButton = document.getElementById('exportButton');
const importInput = document.getElementById('importInput');
const statusBar = document.getElementById('statusBar');

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return deepClone(defaultState);
    const parsed = JSON.parse(raw);
    parsed.wallets = Array.isArray(parsed.wallets) ? parsed.wallets : [];
    parsed.settings = {
      ...defaultState.settings,
      ...(parsed.settings || {}),
    };
    return parsed;
  } catch (error) {
    console.warn('Failed to load state', error);
    return deepClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function deepClone(value) {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

function uniqueId(prefix = 'id') {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function showStatus(message, type = 'info') {
  statusBar.textContent = message;
  statusBar.dataset.type = type;
  statusBar.className = `status-bar ${type}`;
  clearTimeout(statusTimeout);
  statusTimeout = setTimeout(() => {
    statusBar.textContent = '';
    statusBar.className = 'status-bar';
  }, STATUS_DURATION);
}

function parseList(value) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function shortenAddress(address) {
  if (address.length <= 10) return address;
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

function formatDateTime(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function formatRelativeTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const diff = Date.now() - date.getTime();
  const minutes = Math.round(diff / (1000 * 60));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function getWallet(address) {
  return state.wallets.find((wallet) => wallet.address === address);
}

function calcScore(wallet) {
  return SCORE_FIELDS.reduce((total, field) => total + (Number(wallet.metrics?.[field.key]) || 0), 0);
}

function scoreClass(score) {
  if (score >= 7) return 'ready';
  if (score >= 4) return 'warning';
  return 'risk';
}

function addWallet(walletData) {
  if (getWallet(walletData.address)) {
    showStatus('Wallet already exists in MindCompass.', 'warning');
    return;
  }
  const now = Date.now();
  const wallet = {
    address: walletData.address,
    label: walletData.label,
    tokens: walletData.tokens,
    venues: walletData.venues,
    holding: walletData.holding,
    notes: walletData.notes,
    category: walletData.category,
    metrics: SCORE_FIELDS.reduce((acc, field) => {
      acc[field.key] = 0;
      return acc;
    }, {}),
    checks: CHECKS.reduce((acc, check) => {
      acc[check.key] = false;
      return acc;
    }, {}),
    alerts: ALERT_STEPS.reduce((acc, alert) => {
      acc[alert.key] = false;
      return acc;
    }, {}),
    observations: walletData.notes
      ? [
          {
            id: uniqueId('obs'),
            text: walletData.notes,
            createdAt: now,
          },
        ]
      : [],
    trades: [],
    importedTradeIds: [],
    createdAt: now,
    updatedAt: now,
  };
  state.wallets.push(wallet);
  saveState();
  render();
  showStatus('Wallet added to MindCompass.', 'success');
}

function updateWallet(address, updater) {
  const index = state.wallets.findIndex((wallet) => wallet.address === address);
  if (index === -1) return;
  const current = state.wallets[index];
  const updated = typeof updater === 'function' ? updater(deepClone(current)) : { ...deepClone(current), ...updater };
  updated.updatedAt = Date.now();
  state.wallets.splice(index, 1, updated);
  saveState();
  render();
}

function removeWallet(address) {
  state.wallets = state.wallets.filter((wallet) => wallet.address !== address);
  saveState();
  render();
  showStatus('Wallet removed from MindCompass.', 'warning');
}

function render() {
  renderSettings();
  renderBoard('watch');
  renderBoard('follow');
}

function renderSettings() {
  apiConfigForm.elements.birdeye.value = state.settings.birdeyeKey || '';
  apiConfigForm.elements.solscan.value = state.settings.solscanKey || '';
}

function renderBoard(category) {
  const column = document.querySelector(`.board-column[data-category="${category}"] .wallet-list`);
  const wallets = state.wallets.filter((wallet) => wallet.category === category);
  if (wallets.length === 0) {
    column.innerHTML = '<div class="empty-state">No wallets yet. Add one from the hunt form.</div>';
    return;
  }
  column.innerHTML = '';
  wallets
    .slice()
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .forEach((wallet) => {
      column.appendChild(buildWalletCard(wallet));
    });
}

function buildWalletCard(wallet) {
  const card = template.content.firstElementChild.cloneNode(true);
  card.dataset.address = wallet.address;

  const labelEl = card.querySelector('.wallet-label');
  labelEl.textContent = wallet.label || 'Untitled wallet';

  const addressEl = card.querySelector('.wallet-address');
  addressEl.innerHTML = '';
  const addressText = document.createElement('span');
  addressText.textContent = shortenAddress(wallet.address);
  addressText.title = wallet.address;
  const copyButton = document.createElement('button');
  copyButton.type = 'button';
  copyButton.dataset.action = 'copyAddress';
  copyButton.textContent = 'Copy';
  addressEl.append(addressText, copyButton);

  const score = calcScore(wallet);
  const scoreBadge = card.querySelector('.score-badge');
  scoreBadge.textContent = `${score}/10`;
  scoreBadge.classList.add(scoreClass(score));
  scoreBadge.title = `Score target: ${score >= 7 ? 'Ready to follow' : score >= 4 ? 'Needs more data' : 'High risk'}`;

  const meta = card.querySelector('.wallet-meta');
  meta.innerHTML = '';
  const metaItems = [
    wallet.tokens.length ? `Tokens: ${wallet.tokens.join(', ')}` : null,
    wallet.venues.length ? `Venues: ${wallet.venues.join(', ')}` : null,
    wallet.holding ? `Holding: ${wallet.holding}` : null,
  ].filter(Boolean);
  if (metaItems.length) {
    metaItems.forEach((item) => {
      const chip = document.createElement('span');
      chip.textContent = item;
      meta.appendChild(chip);
    });
  } else {
    const chip = document.createElement('span');
    chip.textContent = 'Add details to enrich this wallet.';
    meta.appendChild(chip);
  }

  const quickActions = card.querySelector('.quick-actions');
  quickActions.innerHTML = '';
  quickActions.append(
    createLinkButton(`https://birdeye.so/wallet/${wallet.address}?chain=solana`, 'Birdeye wallet'),
    createLinkButton(`https://solscan.io/account/${wallet.address}`, 'Solscan account')
  );
  const fetchBirdeyeButton = document.createElement('button');
  fetchBirdeyeButton.type = 'button';
  fetchBirdeyeButton.dataset.action = 'fetchBirdeye';
  fetchBirdeyeButton.textContent = 'Pull trades from Birdeye';
  quickActions.appendChild(fetchBirdeyeButton);
  const fetchSolscanButton = document.createElement('button');
  fetchSolscanButton.type = 'button';
  fetchSolscanButton.dataset.action = 'fetchSolscan';
  fetchSolscanButton.textContent = 'Fetch Solscan txs';
  quickActions.appendChild(fetchSolscanButton);
  const editButton = document.createElement('button');
  editButton.type = 'button';
  editButton.dataset.action = 'editWallet';
  editButton.textContent = 'Edit wallet details';
  quickActions.appendChild(editButton);

  const checksContainer = card.querySelector('.checks');
  checksContainer.innerHTML = '';
  CHECKS.forEach((check) => {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.dataset.check = check.key;
    input.checked = Boolean(wallet.checks?.[check.key]);
    label.append(input, document.createTextNode(check.label));
    checksContainer.appendChild(label);
  });

  const metricsContainer = card.querySelector('.metrics');
  metricsContainer.innerHTML = '';
  const metricsTable = document.createElement('table');
  SCORE_FIELDS.forEach((field) => {
    const row = document.createElement('tr');
    const labelCell = document.createElement('td');
    labelCell.textContent = field.label;
    const selectCell = document.createElement('td');
    const select = document.createElement('select');
    select.dataset.metric = field.key;
    [
      { value: 0, label: '0 – Not validated' },
      { value: 1, label: '1 – Partial evidence' },
      { value: 2, label: '2 – Strong evidence' },
    ].forEach((option) => {
      const opt = document.createElement('option');
      opt.value = option.value;
      opt.textContent = option.label;
      if (Number(wallet.metrics?.[field.key]) === option.value) {
        opt.selected = true;
      }
      select.appendChild(opt);
    });
    selectCell.appendChild(select);
    const hintCell = document.createElement('td');
    hintCell.textContent = field.hint;
    row.append(labelCell, selectCell, hintCell);
    metricsTable.appendChild(row);
  });
  metricsContainer.appendChild(metricsTable);

  const observationList = card.querySelector('.observation-list');
  observationList.innerHTML = '';
  if (wallet.observations.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'empty';
    empty.textContent = 'No observations yet. Add one after each review pass.';
    observationList.appendChild(empty);
  } else {
    wallet.observations
      .slice()
      .sort((a, b) => b.createdAt - a.createdAt)
      .forEach((item) => {
        const li = document.createElement('li');
        li.innerHTML = `<strong>${formatRelativeTime(item.createdAt)}</strong> – ${escapeHtml(item.text)}`;
        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.dataset.action = 'removeObservation';
        removeButton.dataset.id = item.id;
        removeButton.textContent = 'Delete';
        removeButton.className = 'tiny danger';
        li.appendChild(removeButton);
        observationList.appendChild(li);
      });
  }

  const tradeList = card.querySelector('.trade-list');
  tradeList.innerHTML = '';
  if (wallet.trades.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'empty';
    empty.textContent = 'No trades logged. Pull from Birdeye or add manually.';
    tradeList.appendChild(empty);
  } else {
    wallet.trades
      .slice()
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .forEach((trade) => {
        const li = document.createElement('li');
        const time = formatDateTime(trade.timestamp);
        const venue = trade.venue ? ` • ${escapeHtml(trade.venue)}` : '';
        const size = trade.size ? ` • ${escapeHtml(trade.size)}` : '';
        li.innerHTML = `<strong>${escapeHtml(trade.side)}</strong> ${escapeHtml(trade.token)}${size}${venue} – ${time}`;
        if (trade.notes) {
          const note = document.createElement('div');
          note.className = 'trade-note';
          note.textContent = trade.notes;
          li.appendChild(note);
        }
        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.dataset.action = 'removeTrade';
        removeButton.dataset.id = trade.id;
        removeButton.textContent = 'Delete';
        removeButton.className = 'tiny danger';
        li.appendChild(removeButton);
        tradeList.appendChild(li);
      });
  }

  const alertList = card.querySelector('.alert-list');
  alertList.innerHTML = '';
  ALERT_STEPS.forEach((alert) => {
    const item = document.createElement('li');
    const label = document.createElement('label');
    label.className = 'alert-item';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.dataset.alert = alert.key;
    input.checked = Boolean(wallet.alerts?.[alert.key]);
    label.append(input, document.createTextNode(alert.label));
    item.appendChild(label);
    alertList.appendChild(item);
  });

  const footer = card.querySelector('.wallet-footer');
  footer.innerHTML = '';
  const timestamps = document.createElement('div');
  timestamps.innerHTML = `<strong>Updated</strong> ${formatRelativeTime(wallet.updatedAt)} • Added ${formatDateTime(wallet.createdAt)}`;
  footer.appendChild(timestamps);
  const footerActions = document.createElement('div');
  footerActions.className = 'actions';
  const toggleButton = document.createElement('button');
  toggleButton.dataset.action = 'toggleCategory';
  toggleButton.className = wallet.category === 'watch' ? 'promote' : 'demote';
  toggleButton.textContent = wallet.category === 'watch' ? 'Promote to Follow' : 'Move to Watch';
  footerActions.appendChild(toggleButton);
  const removeButton = document.createElement('button');
  removeButton.dataset.action = 'removeWallet';
  removeButton.className = 'remove';
  removeButton.textContent = 'Archive';
  footerActions.appendChild(removeButton);
  footer.appendChild(footerActions);

  return card;
}

function escapeHtml(text = '') {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

function createLinkButton(href, text) {
  const link = document.createElement('a');
  link.href = href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = text;
  return link;
}

candidateForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(candidateForm);
  const address = (data.get('address') || '').trim();
  if (!address) {
    showStatus('Wallet address is required.', 'error');
    return;
  }
  addWallet({
    address,
    label: (data.get('label') || '').trim(),
    tokens: parseList((data.get('tokens') || '').trim()),
    venues: parseList((data.get('venues') || '').trim()),
    holding: (data.get('holding') || '').trim(),
    notes: (data.get('notes') || '').trim(),
    category: data.get('category') || 'watch',
  });
  candidateForm.reset();
});

apiConfigForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(apiConfigForm);
  state.settings.birdeyeKey = (data.get('birdeye') || '').trim();
  state.settings.solscanKey = (data.get('solscan') || '').trim();
  saveState();
  showStatus('API configuration updated.', 'success');
});

board.addEventListener('change', (event) => {
  const card = event.target.closest('.wallet-card');
  if (!card) return;
  const address = card.dataset.address;
  if (event.target.matches('select[data-metric]')) {
    const metric = event.target.dataset.metric;
    const value = Number(event.target.value);
    updateWallet(address, (wallet) => {
      wallet.metrics[metric] = value;
      return wallet;
    });
    showStatus('Score updated.', 'info');
  }
  if (event.target.matches('input[data-check]')) {
    const key = event.target.dataset.check;
    const checked = event.target.checked;
    updateWallet(address, (wallet) => {
      wallet.checks[key] = checked;
      return wallet;
    });
  }
  if (event.target.matches('input[data-alert]')) {
    const key = event.target.dataset.alert;
    const checked = event.target.checked;
    updateWallet(address, (wallet) => {
      wallet.alerts[key] = checked;
      return wallet;
    });
  }
});

board.addEventListener('submit', (event) => {
  const card = event.target.closest('.wallet-card');
  if (!card) return;
  const address = card.dataset.address;
  if (event.target.matches('.observation-form')) {
    event.preventDefault();
    const text = event.target.elements.text.value.trim();
    if (!text) return;
    updateWallet(address, (wallet) => {
      wallet.observations.push({
        id: uniqueId('obs'),
        text,
        createdAt: Date.now(),
      });
      return wallet;
    });
    event.target.reset();
    showStatus('Observation added.', 'success');
  }
  if (event.target.matches('.trade-form')) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const token = (formData.get('token') || '').trim();
    const side = formData.get('side') || 'Trade';
    if (!token) {
      showStatus('Trade token/pair is required.', 'error');
      return;
    }
    updateWallet(address, (wallet) => {
      wallet.trades.push({
        id: uniqueId('trade'),
        token,
        side,
        size: (formData.get('size') || '').trim(),
        venue: (formData.get('venue') || '').trim(),
        notes: (formData.get('notes') || '').trim(),
        timestamp: formData.get('timestamp') || new Date().toISOString(),
        source: 'manual',
      });
      return wallet;
    });
    event.target.reset();
    showStatus('Trade logged.', 'success');
  }
});

board.addEventListener('click', async (event) => {
  const card = event.target.closest('.wallet-card');
  if (!card) return;
  const address = card.dataset.address;
  if (event.target.dataset.action === 'copyAddress') {
    await copyToClipboard(address);
    showStatus('Address copied to clipboard.', 'success');
  }
  if (event.target.dataset.action === 'removeWallet') {
    if (confirm('Archive this wallet?')) {
      removeWallet(address);
    }
  }
  if (event.target.dataset.action === 'toggleCategory') {
    updateWallet(address, (wallet) => {
      wallet.category = wallet.category === 'watch' ? 'follow' : 'watch';
      return wallet;
    });
    showStatus('Wallet category updated.', 'success');
  }
  if (event.target.dataset.action === 'removeObservation') {
    const id = event.target.dataset.id;
    updateWallet(address, (wallet) => {
      wallet.observations = wallet.observations.filter((item) => item.id !== id);
      return wallet;
    });
  }
  if (event.target.dataset.action === 'removeTrade') {
    const id = event.target.dataset.id;
    updateWallet(address, (wallet) => {
      wallet.trades = wallet.trades.filter((item) => item.id !== id);
      return wallet;
    });
  }
  if (event.target.dataset.action === 'editWallet') {
    openEditDialog(address);
  }
  if (event.target.dataset.action === 'copyChecklist') {
    const wallet = getWallet(address);
    if (!wallet) return;
    const text = buildFollowChecklist(wallet);
    await copyToClipboard(text);
    showStatus('Checklist copied.', 'success');
  }
  if (event.target.dataset.action === 'fetchBirdeye') {
    const wallet = getWallet(address);
    if (!wallet) return;
    await fetchBirdeyeTrades(wallet);
  }
  if (event.target.dataset.action === 'fetchSolscan') {
    const wallet = getWallet(address);
    if (!wallet) return;
    await fetchSolscanTransactions(wallet);
  }
});

async function copyToClipboard(text) {
  if (navigator.clipboard) {
    return navigator.clipboard.writeText(text);
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

function openEditDialog(address) {
  const wallet = getWallet(address);
  if (!wallet) return;
  const label = prompt('Update label', wallet.label || '');
  if (label === null) return;
  const tokens = prompt('Update tokens (comma separated)', wallet.tokens.join(', '));
  if (tokens === null) return;
  const venues = prompt('Update venues (comma separated)', wallet.venues.join(', '));
  if (venues === null) return;
  const holding = prompt('Update holding pattern', wallet.holding || '');
  if (holding === null) return;
  updateWallet(address, (draft) => {
    draft.label = label.trim();
    draft.tokens = parseList(tokens || '');
    draft.venues = parseList(venues || '');
    draft.holding = holding.trim();
    return draft;
  });
  showStatus('Wallet details updated.', 'success');
}

function buildFollowChecklist(wallet) {
  const score = calcScore(wallet);
  const checkMarks = CHECKS.map((check) => `- [${wallet.checks?.[check.key] ? 'x' : ' '}] ${check.label}`).join('\n');
  const alertMarks = ALERT_STEPS.map((step) => `- [${wallet.alerts?.[step.key] ? 'x' : ' '}] ${step.label}`).join('\n');
  return `MindCompass follow card\nWallet: ${wallet.address}\nLabel: ${wallet.label || 'Untitled'}\nScore: ${score}/10\nTokens: ${wallet.tokens.join(', ') || 'Unknown'}\nVenues: ${wallet.venues.join(', ') || 'Unknown'}\n\nDiscovery checks:\n${checkMarks}\n\nFollow actions:\n${alertMarks}`;
}

async function fetchBirdeyeTrades(wallet) {
  const apiKey = state.settings.birdeyeKey;
  if (!apiKey) {
    showStatus('Set a Birdeye API key first.', 'warning');
    return;
  }
  const url = `https://public-api.birdeye.so/defi/wallet_trades?address=${wallet.address}&offset=0&limit=20&chain=solana`;
  try {
    showStatus('Fetching trades from Birdeye…', 'info');
    const response = await fetch(url, {
      headers: {
        'X-API-KEY': apiKey,
      },
    });
    if (!response.ok) {
      throw new Error(`Birdeye responded with ${response.status}`);
    }
    const json = await response.json();
    const items = Array.isArray(json?.data?.items)
      ? json.data.items
      : Array.isArray(json?.data)
      ? json.data
      : [];
    if (!items.length) {
      showStatus('No new trades found on Birdeye.', 'warning');
      return;
    }
    const seen = new Set(wallet.importedTradeIds || []);
    const trades = [];
    items.forEach((item) => {
      const id = item?.txHash || item?.signature || item?.transactionHash || `${item?.mint}-${item?.blockUnixTime}-${item?.amountUsd}`;
      if (!id) return;
      if (seen.has(id)) return;
      seen.add(id);
      trades.push({
        id,
        token: item?.symbol || item?.tokenSymbol || item?.mint || 'Unknown token',
        side: item?.side || item?.type || 'Trade',
        size: item?.amountUsd ? `$${Number(item.amountUsd).toLocaleString()}` : '',
        venue: item?.market || item?.source || '',
        timestamp: item?.blockUnixTime ? new Date(item.blockUnixTime * 1000).toISOString() : new Date().toISOString(),
        notes: 'Imported from Birdeye',
        source: 'birdeye',
      });
    });
    if (!trades.length) {
      showStatus('Birdeye trades already imported.', 'warning');
      return;
    }
    updateWallet(wallet.address, (draft) => {
      draft.trades.push(...trades);
      draft.importedTradeIds = Array.from(seen);
      return draft;
    });
    showStatus(`Imported ${trades.length} trades from Birdeye.`, 'success');
  } catch (error) {
    console.error(error);
    showStatus(`Birdeye fetch failed: ${error.message}`, 'error');
  }
}

async function fetchSolscanTransactions(wallet) {
  const apiKey = state.settings.solscanKey;
  const url = `https://public-api.solscan.io/account/transactions?address=${wallet.address}&limit=20`;
  try {
    showStatus('Fetching recent transactions from Solscan…', 'info');
    const response = await fetch(url, {
      headers: apiKey
        ? {
            token: apiKey,
          }
        : undefined,
    });
    if (!response.ok) {
      throw new Error(`Solscan responded with ${response.status}`);
    }
    const json = await response.json();
    const items = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
    if (!items.length) {
      showStatus('No Solscan transactions returned.', 'warning');
      return;
    }
    const seen = new Set(wallet.importedTradeIds || []);
    const trades = [];
    items.forEach((item) => {
      const id = item?.txHash || item?.signature || item?.transactionHash || JSON.stringify(item);
      if (seen.has(id)) return;
      seen.add(id);
      trades.push({
        id,
        token: item?.tokenAddress || item?.symbol || 'Unknown token',
        side: item?.parsedInstruction?.type || 'Tx',
        size: item?.lamport ? `${item.lamport} lamports` : '',
        venue: item?.program || '',
        timestamp: item?.blockTime ? new Date(item.blockTime * 1000).toISOString() : new Date().toISOString(),
        notes: 'Imported from Solscan',
        source: 'solscan',
      });
    });
    if (!trades.length) {
      showStatus('Solscan transactions already imported.', 'warning');
      return;
    }
    updateWallet(wallet.address, (draft) => {
      draft.trades.push(...trades);
      draft.importedTradeIds = Array.from(seen);
      return draft;
    });
    showStatus(`Imported ${trades.length} transactions from Solscan.`, 'success');
  } catch (error) {
    console.error(error);
    showStatus(`Solscan fetch failed: ${error.message}`, 'error');
  }
}

exportButton.addEventListener('click', () => {
  const data = JSON.stringify(state, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `mindcompass-${new Date().toISOString()}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

importInput.addEventListener('change', (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data || typeof data !== 'object') throw new Error('Invalid JSON');
      state = {
        wallets: Array.isArray(data.wallets) ? data.wallets : [],
        settings: {
          ...defaultState.settings,
          ...(data.settings || {}),
        },
      };
      saveState();
      render();
      showStatus('Import successful.', 'success');
    } catch (error) {
      console.error(error);
      showStatus('Failed to import file.', 'error');
    }
  };
  reader.readAsText(file);
  importInput.value = '';
});

render();
