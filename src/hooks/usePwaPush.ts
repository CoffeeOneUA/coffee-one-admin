import { useCallback, useEffect, useState } from 'react';
import { supabaseAdmin as supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';

// Реєстрація Web Push для IT Дашборда: service worker + підписка браузера
// + збереження підписки в pwa_push_subscriptions, щоб it-task-notify /
// it-task-deadline-cron знали, кому слати. Працює лише там, де є PushManager
// (нема сенсу навіть пробувати в середовищах без підтримки — просто
// лишаємо кнопку неактивною).

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64Safe);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function usePwaPush() {
  const { admin } = useAuth();
  const [supported] = useState(() => 'serviceWorker' in navigator && 'PushManager' in window);
  const [permission, setPermission] = useState<NotificationPermission>(
    supported ? Notification.permission : 'denied',
  );
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);

  const checkSubscribed = useCallback(async () => {
    if (!supported) return;
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    setSubscribed(!!sub);
  }, [supported]);

  useEffect(() => {
    checkSubscribed();
  }, [checkSubscribed]);

  const subscribe = useCallback(async () => {
    if (!supported || !admin) return;
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') return;

      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      const json = sub.toJSON();

      await supabase.from('pwa_push_subscriptions').upsert(
        {
          admin_user_id: admin.id,
          endpoint: json.endpoint!,
          p256dh: json.keys!.p256dh,
          auth: json.keys!.auth,
        },
        { onConflict: 'endpoint' },
      );
      setSubscribed(true);
    } finally {
      setBusy(false);
    }
  }, [supported, admin]);

  const unsubscribe = useCallback(async () => {
    if (!supported) return;
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await supabase.from('pwa_push_subscriptions').delete().eq('endpoint', sub.endpoint);
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } finally {
      setBusy(false);
    }
  }, [supported]);

  return { supported, permission, subscribed, busy, subscribe, unsubscribe };
}
