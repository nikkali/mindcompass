const STORAGE_KEY = 'mindcompass_journal_v1';
const KEY_STORAGE_KEY = 'mindcompass_journal_key_v1';
const LOCAL_MODE_KEY = 'mindcompass_local_only';

const ROUTE_LIBRARY = {
  peace: {
    scriptures: [
      ['John 14:27 — “Peace I leave with you; my peace I give to you.”', 'Psalm 46:10 — “Be still, and know that I am God.”'],
      ['Isaiah 26:3 — “You keep him in perfect peace whose mind is stayed on you.”']
    ],
    prayers: [
      [
        'Jesus, thank You for being the Prince of Peace.',
        'I hand You the burden that is weighing on me today.',
        'Where do You want to settle my heart right now?' 
      ],
      [
        'Spirit, breathe calm into the places that feel anxious.',
        'Show me how to root my thoughts in Your promises.',
        'Help me notice Your presence in the next hour.'
      ]
    ],
    obedience: [
      'Take a slow, five-minute walk outside and recite the verse softly.',
      'Send a message of encouragement to someone who might need peace too.'
    ]
  },
  truth: {
    scriptures: [
      ['John 8:32 — “You will know the truth, and the truth will set you free.”'],
      ['Philippians 4:8 — “Whatever is true, noble, right… think on these things.”', 'Psalm 25:5 — “Lead me in your truth and teach me.”']
    ],
    prayers: [
      [
        'Father, reveal any lies I have been believing today.',
        'Jesus, anchor me in what You say is true.',
        'Spirit, highlight a Scripture that corrects my thinking.'
      ],
      [
        'Lord, give me courage to speak truth in love.',
        'Help me notice where truth brings freedom in this moment.',
        'Let Your Word be louder than any other voice.'
      ]
    ],
    obedience: [
      'Write the key verse on a card and place it where you will see it.',
      'Replace one negative thought with a spoken Scripture affirmation.'
    ]
  },
  hope: {
    scriptures: [
      ['Romans 15:13 — “May the God of hope fill you with all joy and peace.”'],
      ['Hebrews 6:19 — “We have this hope as an anchor for the soul.”']
    ],
    prayers: [
      [
        'God of hope, lift my eyes from what I fear.',
        'Show me where You are already at work.',
        'Who can I encourage with hope today?'
      ],
      [
        'Lord, awaken wonder for what You are doing.',
        'Spirit, steady my heart in Your promises.',
        'Help me celebrate even the small wins today.'
      ]
    ],
    obedience: [
      'Identify one gratitude from today and speak it out loud to God.',
      'Do one small act of kindness for someone nearby.'
    ]
  },
  joy: {
    scriptures: [
      ['Psalm 16:11 — “In Your presence there is fullness of joy.”'],
      ['Nehemiah 8:10 — “The joy of the Lord is your strength.”', 'John 15:11 — “That my joy may be in you.”']
    ],
    prayers: [
      [
        'Lord, thank You for the gifts of today.',
        'Show me where joy is trying to break through.',
        'Teach me how to rejoice with You in this moment.'
      ],
      [
        'Spirit, lighten any heaviness that lingers.',
        'Jesus, help me notice joy in others and call it out.',
        'Let gratitude lead me deeper into Your heart.'
      ]
    ],
    obedience: [
      'Pause to sing or hum a worship song for two minutes.',
      'Share one joy point with a trusted friend or journal entry.'
    ]
  },
  courage: {
    scriptures: [
      ['Joshua 1:9 — “Be strong and courageous… the Lord your God is with you.”'],
      ['2 Timothy 1:7 — “God gave us a spirit not of fear but of power.”']
    ],
    prayers: [
      [
        'Father, remind me that You are with me in this challenge.',
        'Jesus, give me boldness rooted in love.',
        'Spirit, show me the next faithful step.'
      ],
      [
        'Lord, replace my fear with a vision of what You can do.',
        'Highlight someone I can invite to pray with me.',
        'Strengthen me to obey even when it feels small.'
      ]
    ],
    obedience: [
      'Name the fear out loud, then pray the Scripture over it.',
      'Take the first small action toward what you have been avoiding.'
    ]
  }
};

const SENTIMENT_MAP = [
  { id: 'settled', label: 'Your words carry a calm, settled tone.', angle: 350 },
  { id: 'open', label: 'You seem open but processing through a few tensions.', angle: 30 },
  { id: 'wrestling', label: 'There is some wrestling or discouragement in what you shared.', angle: 120 },
  { id: 'anxious', label: 'It sounds like anxiety or heaviness is close to the surface.', angle: 190 },
  { id: 'weary', label: 'Your check-in feels weary—Jesus meets you right here.', angle: 230 }
];

const positiveWords = ['grateful', 'peace', 'calm', 'hope', 'joy', 'loved', 'rested', 'thankful', 'steady'];
const negativeWords = ['anxious', 'stressed', 'tired', 'worried', 'fear', 'afraid', 'overwhelmed', 'sad', 'lonely'];

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function toBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

function fromBase64(base64) {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getOrCreateKey() {
  try {
    const stored = localStorage.getItem(KEY_STORAGE_KEY);
    if (stored) {
      const keyBytes = fromBase64(stored);
      return await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', true, ['encrypt', 'decrypt']);
    }
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    const exported = await crypto.subtle.exportKey('raw', key);
    localStorage.setItem(KEY_STORAGE_KEY, toBase64(exported));
    return key;
  } catch (error) {
    console.warn('Secure storage unavailable, falling back to plain text.', error);
    return null;
  }
}

async function encryptPayload(key, data) {
  if (!key) {
    return btoa(data);
  }
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, textEncoder.encode(data));
  const payload = new Uint8Array(iv.byteLength + cipher.byteLength);
  payload.set(iv, 0);
  payload.set(new Uint8Array(cipher), iv.byteLength);
  return toBase64(payload);
}

async function decryptPayload(key, payload) {
  if (!payload) return '';
  if (!key) {
    return atob(payload);
  }
  const raw = fromBase64(payload);
  const iv = raw.slice(0, 12);
  const data = raw.slice(12);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  return textDecoder.decode(plain);
}

async function loadEntries(key) {
  try {
    const encrypted = localStorage.getItem(STORAGE_KEY);
    if (!encrypted) return [];
    const plain = await decryptPayload(key, encrypted);
    return JSON.parse(plain);
  } catch (error) {
    console.error('Unable to load entries', error);
    return [];
  }
}

async function saveEntries(key, entries) {
  try {
    const payload = JSON.stringify(entries);
    const encrypted = await encryptPayload(key, payload);
    localStorage.setItem(STORAGE_KEY, encrypted);
  } catch (error) {
    console.error('Unable to save entries', error);
  }
}

function analyseSentiment(text) {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  let score = 0;
  tokens.forEach((token) => {
    if (positiveWords.includes(token)) score += 1;
    if (negativeWords.includes(token)) score -= 1;
  });
  if (score >= 2) return SENTIMENT_MAP[0];
  if (score === 1) return SENTIMENT_MAP[1];
  if (score === 0) return SENTIMENT_MAP[2];
  if (score === -1) return SENTIMENT_MAP[3];
  return SENTIMENT_MAP[4];
}

function rotateNeedle(angle) {
  const needle = document.getElementById('compassNeedle');
  needle.style.transform = `rotate(${angle}deg)`;
}

function updateInsight(insight) {
  const container = document.getElementById('checkinInsight');
  container.querySelector('.insight-body').textContent = insight.label;
  container.hidden = false;
}

function formatDate(timestamp) {
  return new Intl.DateTimeFormat([], {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(timestamp));
}

function renderJournal(entries) {
  const list = document.getElementById('journalEntries');
  list.innerHTML = '';
  const template = document.getElementById('journalEntryTemplate');

  if (!entries.length) {
    const empty = document.createElement('p');
    empty.textContent = 'Your journal is ready when you are. Each route you complete will appear here.';
    empty.className = 'empty-state';
    list.append(empty);
    return;
  }

  entries
    .slice()
    .reverse()
    .forEach((entry) => {
      const fragment = template.content.cloneNode(true);
      fragment.querySelector('.entry-date').textContent = formatDate(entry.timestamp);
      fragment.querySelector('.entry-destination').textContent = `Destination: ${entry.destinationLabel}`;
      fragment.querySelector('.entry-feeling').textContent = entry.feeling;

      const steps = fragment.querySelector('.entry-steps');
      steps.innerHTML = '';

      const scriptureItem = document.createElement('li');
      scriptureItem.textContent = `Scripture: ${entry.scriptures.join(' | ')}`;
      steps.append(scriptureItem);

      const prayerItem = document.createElement('li');
      prayerItem.textContent = `Prayer prompts: ${entry.prayers.join(' • ')}`;
      steps.append(prayerItem);

      const obedienceItem = document.createElement('li');
      obedienceItem.textContent = `Tiny obedience: ${entry.obedience}`;
      steps.append(obedienceItem);

      list.append(fragment);
    });
}

function randomFrom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function selectRoute(destination) {
  const data = ROUTE_LIBRARY[destination];
  return {
    scriptures: randomFrom(data.scriptures),
    prayers: randomFrom(data.prayers),
    obedience: randomFrom(data.obedience)
  };
}

function setActiveDestination(button) {
  document.querySelectorAll('.destination').forEach((btn) => {
    btn.classList.remove('active');
    btn.setAttribute('aria-pressed', 'false');
  });
  button.classList.add('active');
  button.setAttribute('aria-pressed', 'true');
}

function renderRoute(route) {
  const routeSection = document.querySelector('.route');
  const scriptureList = document.getElementById('routeScripture');
  const prayerList = document.getElementById('routePrayer');
  const obedience = document.getElementById('routeObedience');
  const completeButton = document.getElementById('completeRoute');

  scriptureList.innerHTML = '';
  route.scriptures.forEach((verse, index) => {
    const item = document.createElement('li');
    const label = document.createElement('label');
    label.innerHTML = `<input type="checkbox" data-step="scripture" data-index="${index}" /> <span>${verse}</span>`;
    item.append(label);
    scriptureList.append(item);
  });

  prayerList.innerHTML = '';
  route.prayers.forEach((prompt, index) => {
    const item = document.createElement('li');
    const label = document.createElement('label');
    label.innerHTML = `<input type="checkbox" data-step="prayer" data-index="${index}" /> <span>${prompt}</span>`;
    item.append(label);
    prayerList.append(item);
  });

  obedience.innerHTML = '';
  const obedienceLabel = document.createElement('label');
  obedienceLabel.innerHTML = `<input type="checkbox" data-step="obedience" data-index="0" /> <span>${route.obedience}</span>`;
  obedience.append(obedienceLabel);

  completeButton.disabled = true;
  routeSection.hidden = false;
}

function routeCompleted() {
  return Array.from(document.querySelectorAll('.route input[type="checkbox"]')).every((checkbox) => checkbox.checked);
}

function trackRouteProgress() {
  const completeButton = document.getElementById('completeRoute');
  completeButton.disabled = !routeCompleted();
}

function hydrateLocalMode() {
  const stored = localStorage.getItem(LOCAL_MODE_KEY);
  const localMode = stored === null ? true : stored === 'true';
  const toggle = document.getElementById('localMode');
  toggle.checked = localMode;
  updateLocalModeState(localMode);
  toggle.addEventListener('change', () => {
    const enabled = toggle.checked;
    localStorage.setItem(LOCAL_MODE_KEY, String(enabled));
    updateLocalModeState(enabled);
  });
}

function updateLocalModeState(enabled) {
  const voiceButton = document.getElementById('voiceButton');
  const status = document.getElementById('voiceStatus');
  if (!voiceButton) {
    if (status) {
      status.textContent = enabled
        ? 'Local-only mode is on. Voice capture is paused to keep everything on-device.'
        : '';
    }
    return;
  }
  if (voiceButton.dataset.locked === 'true') {
    voiceButton.disabled = true;
    voiceButton.setAttribute('aria-disabled', 'true');
    if (status && !status.textContent) {
      status.textContent = 'Voice capture is not supported in this browser.';
    }
    return;
  }
  voiceButton.disabled = enabled;
  voiceButton.setAttribute('aria-disabled', String(enabled));
  if (enabled) {
    status.textContent = 'Local-only mode is on. Voice capture is paused to keep everything on-device.';
  } else {
    status.textContent = '';
  }
}

function initVoiceCapture() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const voiceButton = document.getElementById('voiceButton');
  const status = document.getElementById('voiceStatus');

  if (!SpeechRecognition || !voiceButton) {
    if (voiceButton) voiceButton.disabled = true;
    if (voiceButton) voiceButton.setAttribute('aria-disabled', 'true');
    if (voiceButton) voiceButton.dataset.locked = 'true';
    status.textContent = 'Voice capture is not supported in this browser.';
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  let listening = false;

  voiceButton.addEventListener('click', () => {
    if (document.getElementById('localMode').checked) {
      status.textContent = 'Disable local-only mode to use voice capture.';
      return;
    }

    if (!listening) {
      recognition.start();
    } else {
      recognition.stop();
    }
  });

  recognition.addEventListener('start', () => {
    listening = true;
    voiceButton.textContent = 'Listening… Tap to stop';
    status.textContent = 'Speak freely. MindCompass is listening.';
  });

  recognition.addEventListener('end', () => {
    listening = false;
    voiceButton.textContent = '🎙️ Speak';
    if (!document.getElementById('localMode').checked) {
      status.textContent = '';
    }
  });

  recognition.addEventListener('result', (event) => {
    const transcript = event.results[0][0].transcript;
    const textarea = document.getElementById('checkinInput');
    textarea.value = transcript;
    status.textContent = 'Voice note transcribed. Feel free to edit before logging.';
  });

  recognition.addEventListener('error', (event) => {
    status.textContent = `Voice capture error: ${event.error}`;
  });
}

function capitalise(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

async function init() {
  const key = await getOrCreateKey();
  let entries = await loadEntries(key);
  renderJournal(entries);
  hydrateLocalMode();
  initVoiceCapture();

  let currentCheckin = null;
  let currentDestination = null;
  let currentRoute = null;

  document.getElementById('checkinForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const textarea = document.getElementById('checkinInput');
    const text = textarea.value.trim();
    if (!text) return;

    const sentiment = analyseSentiment(text);
    currentCheckin = {
      feeling: text,
      sentimentId: sentiment.id,
      sentimentLabel: sentiment.label,
      timestamp: Date.now()
    };

    rotateNeedle(sentiment.angle);
    updateInsight(sentiment);

    const alert = document.createElement('div');
    alert.className = 'insight flash';
    alert.textContent = 'Feeling logged. Choose a destination with Jesus to keep going.';
    alert.setAttribute('role', 'status');
    document.querySelector('.checkin').append(alert);
    setTimeout(() => alert.remove(), 3200);

    textarea.value = '';
  });

  document.querySelectorAll('.destination').forEach((button) => {
    button.addEventListener('click', () => {
      if (!currentCheckin) {
        const status = document.getElementById('voiceStatus');
        status.textContent = 'Log how you are feeling first, then pick a destination.';
        return;
      }
      currentDestination = button.dataset.destination;
      currentRoute = selectRoute(currentDestination);
      setActiveDestination(button);
      renderRoute(currentRoute);
      document.querySelectorAll('.route input[type="checkbox"]').forEach((checkbox) => {
        checkbox.addEventListener('change', trackRouteProgress);
      });
    });
  });

  document.getElementById('completeRoute').addEventListener('click', async () => {
    if (!currentCheckin || !currentRoute || !currentDestination) return;
    if (!routeCompleted()) return;

    const entry = {
      timestamp: Date.now(),
      feeling: currentCheckin.feeling,
      sentimentLabel: currentCheckin.sentimentLabel,
      destination: currentDestination,
      destinationLabel: capitalise(currentDestination),
      scriptures: currentRoute.scriptures,
      prayers: currentRoute.prayers,
      obedience: currentRoute.obedience
    };

    const updated = entries.concat(entry);
    await saveEntries(key, updated);
    renderJournal(updated);
    entries = updated;

    const status = document.getElementById('voiceStatus');
    status.textContent = 'Route saved to your journal. Grace for the rest of your day!';

    document.querySelector('.route').hidden = true;
    document.querySelectorAll('.destination').forEach((btn) => btn.classList.remove('active'));
    currentDestination = null;
    currentRoute = null;
    currentCheckin = null;
  });
}

init();
