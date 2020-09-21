import { useEffect, useRef } from "react";

// From here https://overreacted.io/making-setinterval-declarative-with-react-hooks/
export const usePolling = (callback: () => void, intervalMs: number | null) => {
  const savedCallback = useRef<() => void>(() => null);

  // Remember the latest callback.
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval.
  useEffect(() => {
    function tick() {
      savedCallback.current();
    }

    if (intervalMs != null) {
      const id = setInterval(tick, intervalMs);
      return () => clearInterval(id);
    }
  }, [intervalMs]);
};
