import { useState, useEffect } from 'react'

function useDebounce<V = unknown>(
  value: V,
  /** in ms */
  delay: number,
) {
  const [debouncedValue, setDebouncedValue] = useState<V>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

export default useDebounce
