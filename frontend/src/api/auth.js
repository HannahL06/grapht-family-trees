import client from './client'

// Registering does NOT log you in: the backend returns the new user but no
// tokens, so callers must call login() afterwards.
export async function register(name, email, password) {
  const { data } = await client.post('/auth/register', { name, email, password })
  return data
}

export async function login(email, password) {
  const { data } = await client.post('/auth/login', { email, password })
  localStorage.setItem('access_token', data.access_token)
  localStorage.setItem('refresh_token', data.refresh_token)
}

export function logout() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
}
