import { useEffect, useState } from "react"

/** Current time as "HH:MM", updated every 10 seconds. */
export function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 10_000)
    return () => clearInterval(id)
  }, [])
  return now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
}
