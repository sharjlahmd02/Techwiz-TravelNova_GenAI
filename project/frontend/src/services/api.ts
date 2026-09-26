import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'

import { useAuthStore } from '../store/authStore'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState()
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

let refreshPromise: Promise<string> | null = null

async function refreshAccessToken(): Promise<string> {
  const { refreshToken, setAccessToken, logout } = useAuthStore.getState()
  if (!refreshToken) {
    logout()
    throw new Error('No refresh token available')
  }

  try {
    const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/refresh`, {
      refresh_token: refreshToken,
    })
    const newAccessToken = response.data.access_token as string
    setAccessToken(newAccessToken)
    return newAccessToken
  } catch (error) {
    logout()
    throw error
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true

      refreshPromise ??= refreshAccessToken().finally(() => {
        refreshPromise = null
      })

      try {
        const newAccessToken = await refreshPromise
        originalRequest.headers = originalRequest.headers ?? {}
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        return api(originalRequest)
      } catch (refreshError) {
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)
