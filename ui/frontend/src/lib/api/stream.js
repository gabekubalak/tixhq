// Minimal EventSource wrapper with auto-reconnect.
export function subscribeStream(url, onMessage, onError) {
  let es = null;
  let stopped = false;
  let backoff = 500;

  const connect = () => {
    if (stopped) return;
    es = new EventSource(url);
    es.onmessage = (ev) => {
      backoff = 500;
      try { onMessage(JSON.parse(ev.data)); }
      catch (e) { onError?.(e); }
    };
    es.onerror = (e) => {
      onError?.(e);
      es?.close();
      if (!stopped) setTimeout(connect, backoff);
      backoff = Math.min(8000, backoff * 2);
    };
  };
  connect();
  return () => { stopped = true; es?.close(); };
}
