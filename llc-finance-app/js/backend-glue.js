// Minimal client for FastAPI. No cookies. Sends X-API-Key on each call.
// Reads apiBase and apiKey from sessionStorage or from URL params (?apiBase=&apiKey=)
(function(){
  function param(k){ return new URLSearchParams(location.search).get(k) || ''; }
  const apiBase = sessionStorage.getItem('apiBase') || param('apiBase') || '';
  const apiKey  = sessionStorage.getItem('apiKey')  || param('apiKey')  || '';
  if (param('apiBase')) sessionStorage.setItem('apiBase', param('apiBase').replace(/\/+$/,''));
  if (param('apiKey'))  sessionStorage.setItem('apiKey', param('apiKey'));

  function getBase(){ const b = sessionStorage.getItem('apiBase') || apiBase; if(!b) throw new Error('API base not set'); return b; }
  function getKey(){  const k = sessionStorage.getItem('apiKey')  || apiKey;  if(!k) throw new Error('API key not set');  return k; }

  async function api(path, init={}){
    const res = await fetch(getBase() + path, {
      ...init,
      headers: { 'Content-Type':'application/json','X-API-Key': getKey(), ...(init.headers||{}) }
    });
    if(!res.ok){ throw new Error(`${res.status} ${await res.text().catch(()=>res.statusText)}`); }
    const text = await res.text(); return text ? JSON.parse(text) : {};
  }

  // Backend routes (exact names)
  async function getState(){ return api('/state'); }
  async function putState(state){ return api('/state',{method:'PUT',body:JSON.stringify({state})}); }
  async function createLinkToken(){ return api('/plaid/link-token',{method:'POST'}); }
  async function exchangePublicToken(public_token,institution){
    return api('/plaid/exchange',{method:'POST',body:JSON.stringify({ public_token, institution: institution||null })});
  }
  async function refreshBalances(){ return api('/plaid/refresh-balances',{method:'POST'}); }

  window.Backend = { api, getState, putState, createLinkToken, exchangePublicToken, refreshBalances };
})();
