import { writable } from 'svelte/store';

export const shieldNotifications = writable([]);

export function triggerShield(message, type = 'TACTICAL', duration = 4000) {
  // Generate unique string ID for list mapping
  const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 7);

  shieldNotifications.update(n => [
    ...n,
    { id, message, type, duration }
  ]);

  // Self-destruct timeout sequence
  setTimeout(() => {
    shieldNotifications.update(n => n.filter(item => item.id !== id));
  }, duration);
}
