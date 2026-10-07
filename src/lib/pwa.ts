// Single guarded service-worker registration + install prompt capture.
type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

let deferred: BIPEvent | null = null;
const listeners = new Set<() => void>();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BIPEvent;
    listeners.forEach((l) => l());
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    listeners.forEach((l) => l());
  });
}

export const canInstall = () => !!deferred;
export const onInstallChange = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
export const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true;

/** Returns true if the install prompt was shown and accepted. */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const e = deferred;
  deferred = null;
  try {
    await e.prompt();
    const { outcome } = await e.userChoice;
    return outcome === 'accepted';
  } catch {
    return false;
  }
}

function refused() {
  const h = location.hostname;
  let inIframe = true;
  try { inIframe = window.self !== window.top; } catch { /* cross-origin */ }
  return (
    !import.meta.env.PROD ||
    inIframe ||
    h.startsWith('id-preview--') ||
    h.startsWith('preview--') ||
    h === 'lovableproject.com' || h.endsWith('.lovableproject.com') ||
    h === 'lovableproject-dev.com' || h.endsWith('.lovableproject-dev.com') ||
    h === 'beta.lovable.dev' || h.endsWith('.beta.lovable.dev') ||
    new URLSearchParams(location.search).get('sw') === 'off'
  );
}

export async function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  if (refused()) {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      regs.filter((r) => r.active?.scriptURL.endsWith('/sw.js')).map((r) => r.unregister()),
    );
    return;
  }
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
