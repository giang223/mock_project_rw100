let currentSession = null;
const listeners = new Set();

export function getSession() {
  return currentSession;
}

export function setSession(session) {
  currentSession = session;
  listeners.forEach((listener) => listener(currentSession));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("miniSocialAccountUpdated"));
  }
}

export function subscribeToSession(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
