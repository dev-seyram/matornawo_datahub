/**
 * Sends Telegram alerts to the admin when a new order is placed.
 * Requires TELEGRAM_BOT_TOKEN and TELEGRAM_ADMIN_CHAT_ID (see .env.example).
 */

function getTelegramConfig() {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatIdRaw = process.env.TELEGRAM_ADMIN_CHAT_ID?.trim();
  if (!token || !chatIdRaw) return null;

  // Keep as string so large group/channel IDs are not rounded by Number()
  return { token, chatId: chatIdRaw };
}

function formatOrderMessage(order) {
  const price = Number(order.price);
  const serviceFee = Number(order.service_fee);
  const total = Number(order.total);
  const created = order.created_at
    ? new Date(order.created_at).toLocaleString('en-GH', { timeZone: 'Africa/Accra' })
    : new Date().toLocaleString('en-GH', { timeZone: 'Africa/Accra' });

  return [
    '🛒 New order placed',
    '',
    `Order ID: ${order.order_id}`,
    `Network: ${order.network}`,
    `Package: ${order.package}`,
    `Recipient: ${order.recipient_phone}`,
    `Email: ${order.email}`,
    `Price: GH₵${price.toFixed(2)}`,
    `Service fee: GH₵${serviceFee.toFixed(2)}`,
    `Total: GH₵${total.toFixed(2)}`,
    `Status: ${order.status || 'Pending'}`,
    `Time: ${created}`,
  ].join('\n');
}

export function isAdminNotifyConfigured() {
  return getTelegramConfig() !== null;
}

const TELEGRAM_TIMEOUT_MS = 8000;

async function sendTelegramMessage(text) {
  const config = getTelegramConfig();
  if (!config) {
    throw new Error('TELEGRAM_BOT_TOKEN and TELEGRAM_ADMIN_CHAT_ID must be set');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TELEGRAM_TIMEOUT_MS);

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${config.token}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: config.chatId,
          text,
          disable_web_page_preview: true,
        }),
        signal: controller.signal,
      }
    );

    const body = await res.json();
    if (!res.ok || !body.ok) {
      console.error(
        JSON.stringify({
          level: 'error',
          context: 'telegram/sendMessage',
          status: res.status,
          statusText: res.statusText,
          body,
        })
      );
      const detail = body.description || JSON.stringify(body);
      throw new Error(`Telegram API error: ${detail}`);
    }
    return body;
  } finally {
    clearTimeout(timeout);
  }
}

export async function notifyAdminNewOrder(order) {
  if (!isAdminNotifyConfigured()) {
    console.warn(
      'Admin Telegram notifications skipped: set TELEGRAM_BOT_TOKEN and TELEGRAM_ADMIN_CHAT_ID'
    );
    return;
  }
  await sendTelegramMessage(formatOrderMessage(order));
}

export async function sendTelegramTestMessage() {
  const text = [
    '✅ MATOE CONNECT — test alert',
    '',
    'Telegram notifications are configured correctly.',
    `Time: ${new Date().toLocaleString('en-GH', { timeZone: 'Africa/Accra' })}`,
  ].join('\n');
  await sendTelegramMessage(text);
}
