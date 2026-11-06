import axios from 'axios'

// All calls go to /api/..., which the Vite dev proxy forwards to FastAPI.
const client = axios.create({ baseURL: '/api' })

// Attach the login token to every request that has one.
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// A wrong password (401) or taken email (400) on these two endpoints is an
// expected result the page has to show, so it must not trigger the
// "session expired" redirect below.
const AUTH_FORM_PATHS = ['/auth/login', '/auth/register']

// Expired or invalid token on any other call: clear it and go to /login.
client.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url ?? ''
    const isAuthForm = AUTH_FORM_PATHS.some((path) => url.startsWith(path))
    if (error.response?.status === 401 && !isAuthForm) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      if (window.location.pathname !== '/login') {
        window.location.assign('/login')
      }
    }
    return Promise.reject(error)
  },
)

export default client
