import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { TokenResponse, User } from '../types/auth'

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  setSession: (tokens: TokenResponse) => void
  setAccessToken: (accessToken: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      setSession: (tokens) =>
        set({
          user: tokens.user,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          isAuthenticated: true,
        }),
      setAccessToken: (accessToken) => set({ accessToken }),
      logout: () =>
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false }),
    }),
    { name: 'supportnova-auth' }
  )
)
