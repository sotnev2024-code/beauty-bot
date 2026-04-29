import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  timeout: 15_000,
});

api.interceptors.request.use((config) => {
  const initData = window.Telegram?.WebApp?.initData;
  if (initData) {
    config.headers.set?.('X-Telegram-Init-Data', initData);
  }
  return config;
});
