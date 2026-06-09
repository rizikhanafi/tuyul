const BASE = '/api';

async function request(url, options) {
  const res = await fetch(BASE + url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Request failed');
  }
  return res.json();
}

// Auth
export const signup = (data) => request('/signup', { method: 'POST', body: JSON.stringify(data) });
export const login  = (data) => request('/login',  { method: 'POST', body: JSON.stringify(data) });

// Characters — all scoped to user_id
export const getCharacters   = (user_id)            => request(`/characters?user_id=${user_id}`);
export const addCharacter    = (data)                => request('/characters',        { method: 'POST',   body: JSON.stringify(data) });
export const updateCharacter = (id, data)            => request(`/characters/${id}`, { method: 'PUT',    body: JSON.stringify(data) });
export const deleteCharacter = (id, data)            => request(`/characters/${id}`, { method: 'DELETE', body: JSON.stringify(data) });
export const resetDungeons   = (data)                => request('/reset-dungeons',    { method: 'POST',   body: JSON.stringify(data) });
