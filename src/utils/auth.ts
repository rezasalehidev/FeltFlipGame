import type { AuthUser, LoginCredentials, LoginResult } from '../types'

/** Demo login — simple hardcoded account for this project. */
export const DEMO_CREDENTIALS: LoginCredentials = {
  username: 'Reza',
  password: 'QWE123456!',
}

const SESSION_KEY = 'feltflip-auth-user'

export function login(credentials: LoginCredentials): LoginResult {
  const username = credentials.username.trim()
  const password = credentials.password

  if (!username || !password) {
    return { ok: false, message: 'Enter username and password.' }
  }

  if (
    username.toLowerCase() === DEMO_CREDENTIALS.username.toLowerCase() &&
    password === DEMO_CREDENTIALS.password
  ) {
    const user: AuthUser = { username: DEMO_CREDENTIALS.username }
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user))
    return { ok: true, user }
  }

  return { ok: false, message: 'Wrong username or password.' }
}

export function logout(): void {
  sessionStorage.removeItem(SESSION_KEY)
}

export function getSessionUser(): AuthUser | null {
  const raw = sessionStorage.getItem(SESSION_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as AuthUser
    if (parsed?.username) return parsed
  } catch {
    /* ignore */
  }
  return null
}
