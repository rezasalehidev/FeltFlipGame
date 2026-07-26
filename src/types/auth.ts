export interface LoginCredentials {
  username: string
  password: string
}

export interface AuthUser {
  username: string
}

export interface LoginResult {
  ok: boolean
  user?: AuthUser
  message?: string
}
