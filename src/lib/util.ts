export function getLocalStorage<T>(key: string, defaultValue: T): T {
  if (typeof window !== 'undefined' && window.localStorage) {
    return localStorage.getItem(key) as T || defaultValue;
  }
  return defaultValue;
}