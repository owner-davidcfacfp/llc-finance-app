# CODEx_TASK.md

Author: David’s assistant

## Objective
Create a minimal static frontend that talks **directly to the existing FastAPI backend** using the `X-API-Key` header. Do **not** add Node/Express, cookies, or JWT. Implement Plaid Link flow and balances display using the backend’s real endpoints.

## Non‑Goals
- No changes to the backend routes, data model, or auth.
- No `/auth/*`, no `/balances`, no `/plaid/create_link_token`, no cookies.

## Backend Contract (must match exactly)
- Auth: `X-API-Key: <value>` header on **every** request.
- Endpoints used by the UI:
  - `POST /plaid/link-token` → `{ link_token: string }`
  - `POST /plaid/exchange` → body `{ public_token: string, institution?: string | null }`
  - `POST /plaid/refresh-balances` → returns `{ accounts: Account[] }` or compatible

## Deliverables
Create these files under `llc-finance-app/`:
```
index.html          # dashboard
access.html         # one-time API key gate
js/api.js           # fetch helper that attaches X-API-Key
js/app.js           # Plaid Link flow + balances UI
css/style.css       # optional (Tailwind via CDN used)
```

> Keep the code **vanilla JS**. No bundlers. Use Tailwind via CDN.

---

## 1) `index.html`
```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>LLC Finance Dashboard</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- Plaid Link -->
  <script src="https://cdn.plaid.com/link/v2/stable/link-initialize.js"></script>
</head>
<body class="bg-slate-50">
  <header class="max-w-4xl mx-auto p-4 flex items-center justify-between">
    <h1 class="text-xl font-semibold text-slate-800">LLC Finance</h1>
    <div class="flex items-center gap-3">
      <button id="refreshBtn" class="px-3 py-2 rounded-lg border border-slate-300 text-slate-700">Refresh balances</button>
      <button id="clearKeyBtn" class="px-3 py-2 rounded-lg border border-rose-300 text-rose-600">Clear API key</button>
    </div>
  </header>

  <main class="max-w-4xl mx-auto p-4">
    <section class="mb-6">
      <div class="p-4 bg-white rounded-xl shadow border border-slate-200">
        <h2 class="text-lg font-medium text-slate-800 mb-2">Bank connection</h2>
        <p class="text-sm text-slate-600 mb-3">
          Connect with Plaid. We never store credentials.
        </p>
        <div class="flex items-center gap-3">
          <button id="connectBankBtn" class="px-4 py-2 rounded-lg bg-emerald-600 text-white">Connect bank with Plaid</button>
          <button id="whyBtn" class="text-blue-600 underline text-sm">Why?</button>
        </div>
        <div id="whyPanel" class="hidden mt-3 text-sm text-slate-700">
          Plaid handles authentication. We request balances and account metadata only.
        </div>
      </div>
    </section>

    <section>
      <div class="p-4 bg-white rounded-xl shadow border border-slate-200">
        <h2 class="text-lg font-medium text-slate-800 mb-3">Accounts</h2>
        <ul id="accountsList" class="divide-y divide-slate-200"></ul>
        <p id="emptyMsg" class="text-sm text-slate-500">No accounts yet.</p>
      </div>
    </section>
  </main>

  <script src="js/api.js"></script>
  <script src="js/app.js"></script>
</body>
</html>
```

---

## 2) `access.html`
```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Enter API Key</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 min-h-screen grid place-items-center">
  <div class="bg-white p-6 rounded-xl shadow border border-slate-200 w-full max-w-md">
    <h1 class="text-xl font-semibold text-slate-800 mb-4">Enter API key</h1>
    <p class="text-sm text-slate-600 mb-3">
      Stored only in <code>sessionStorage</code>. Sent as <code>X-API-Key</code> header.
    </p>
    <input id="apiKeyInput" type="password" class="w-full border rounded-lg px-3 py-2 mb-3" placeholder="API key" />
    <input id="apiBaseInput" type="text" class="w-full border rounded-lg px-3 py-2 mb-4" placeholder="API base, e.g. http://localhost:8000" />
    <button id="saveBtn" class="w-full bg-indigo-600 text-white rounded-lg px-3 py-2">Continue</button>
  </div>
  <script>
    document.getElementById('saveBtn').onclick = () => {
      const key = (document.getElementById('apiKeyInput').value || '').trim();
      const base = (document.getElementById('apiBaseInput').value || '').trim();
      if (!key || !base) return alert('Provide API key and base URL');
      sessionStorage.setItem('apiKey', key);
      sessionStorage.setItem('apiBase', base.replace(/\/+$/,''));
      location.href = 'index.html';
    };
  </script>
</body>
</html>
```

---

## 3) `js/api.js`
```js
(function(){
  const getBase = () => sessionStorage.getItem('apiBase') || '';
  const getKey  = () => sessionStorage.getItem('apiKey') || '';

  async function api(path, init={}) {
    const base = getBase();
    if (!base) throw new Error('API base not set');
    const headers = Object.assign(
      { 'Content-Type': 'application/json', 'X-API-Key': getKey() },
      init.headers || {}
    );
    const res = await fetch(base + path, Object.assign({ headers }, init));
    if (!res.ok) {
      const msg = await res.text().catch(()=>res.statusText);
      throw new Error(`${res.status} ${msg}`);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : {};
  }

  window.API = { api, getBase, getKey };
})();
```

---

## 4) `js/app.js`
```js
document.addEventListener('DOMContentLoaded', async () => {
  if (!API.getBase() || !API.getKey()) { location.href = 'access.html'; return; }

  const connectBtn = document.getElementById('connectBankBtn');
  const whyBtn     = document.getElementById('whyBtn');
  const whyPanel   = document.getElementById('whyPanel');
  const listEl     = document.getElementById('accountsList');
  const emptyMsg   = document.getElementById('emptyMsg');
  const refreshBtn = document.getElementById('refreshBtn');
  const clearKeyBtn= document.getElementById('clearKeyBtn');

  whyBtn.onclick = () => { whyPanel.classList.toggle('hidden'); };
  clearKeyBtn.onclick = () => { sessionStorage.clear(); location.href='access.html'; };

  function renderAccounts(accounts){
    listEl.innerHTML = '';
    if (!accounts || !accounts.length) { emptyMsg.classList.remove('hidden'); return; }
    emptyMsg.classList.add('hidden');
    for (const a of accounts) {
      const li = document.createElement('li');
      li.className = 'py-2 flex items-center justify-between';
      const name = a.name || a.official_name || a.plaid_account_id || 'Account';
      const amt = (a.current ?? a.balances?.current ?? 0);
      const cur = a.currency || a.balances?.iso_currency_code || '';
      li.innerHTML = `<span class="text-slate-800">${name}</span>
                      <span class="font-mono text-slate-700">${amt} ${cur}</span>`;
      listEl.appendChild(li);
    }
  }

  async function refreshBalances() {
    const data = await API.api('/plaid/refresh-balances', { method:'POST' });
    renderAccounts(data.accounts || data || []);
  }

  try { await refreshBalances(); } catch (e) { /* ok: not connected yet */ }

  connectBtn.onclick = async () => {
    connectBtn.disabled = true;
    connectBtn.textContent = 'Connecting…';
    try {
      const { link_token } = await API.api('/plaid/link-token', { method:'POST' });
      const handler = Plaid.create({
        token: link_token,
        onSuccess: async (public_token, metadata) => {
          try {
            await API.api('/plaid/exchange', {
              method:'POST',
              body: JSON.stringify({ public_token, institution: metadata?.institution?.name || null })
            });
            await refreshBalances();
          } catch (e) { alert('Exchange failed: ' + e.message); }
        },
        onExit: () => {}
      });
      handler.open();
    } catch (e) {
      alert('Link init failed: ' + e.message);
    } finally {
      connectBtn.disabled = false;
      connectBtn.textContent = 'Connect bank with Plaid';
    }
  };

  refreshBtn.onclick = refreshBalances;
});
```

---

## Acceptance Tests
1. Backend up with env: `API_KEY`, `FERNET_KEY`, `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV`, `DATABASE_URL`.
2. `curl -i -X POST "$API_BASE/plaid/link-token" -H "X-API-Key: $API_KEY"` returns 200 and a `link_token`.
3. `index.html` loads without console errors.
4. Enter API key and base in `access.html`. Verify they are in `sessionStorage` only.
5. Click **Connect bank with Plaid**. Complete Plaid sandbox flow. No cookies set by our app.
6. After success, accounts render with amounts and currency. Clicking **Refresh balances** updates values.
7. **Clear API key** clears `sessionStorage` and redirects to `access.html`.

## Constraints Checklist (do not deviate)
- Use only `X-API-Key` header for auth on each call.
- Call exactly these endpoints: `/plaid/link-token`, `/plaid/exchange`, `/plaid/refresh-balances`.
- No cookies, no JWT, no `/auth/*`, no `/balances`, no `/plaid/create_link_token`.
- No server changes. No new backend dependencies.
- Plain JS. No build step.

## Optional: Compatibility Shims (only if explicitly requested)
If compatibility with prewritten UI paths is required, add **server-side aliases** with zero business logic:
- `/plaid/create_link_token` → 307 redirect to `/plaid/link-token`
- `/plaid/exchange_public_token` → 307 redirect to `/plaid/exchange`
- `GET /balances` → call `/plaid/refresh-balances`
These shims are not part of this task by default.

## Handover Notes
- Distribute the API key out-of-band. Rotate if exposed.
- If hosting the frontend on a different origin, cookies are still unused; CORS credentials can remain off.
- Keep `/state` payloads small if you later use it. Current UI does not persist large blobs.

