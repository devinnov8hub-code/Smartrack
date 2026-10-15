import { useEffect, useState } from 'react'

/** Runs `load` on mount and whenever `deps` change; returns undefined while loading. */
export function useAsync<T>(load: () => Promise<T>, deps: unknown[] = []): T | undefined {
  const [data, setData] = useState<T>()

  useEffect(() => {
    let cancelled = false
    load()
      .then((value) => {
        if (!cancelled) setData(value)
      })
      .catch((error) => console.error(error))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return data
}
