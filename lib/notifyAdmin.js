/**
 * Sends Telegram alerts to the admin when a new order is placed.
 * Requires TELEGRAM_BOT_TOKEN and TELEGRAM_ADMIN_CHAT_ID (see .env.example).
 */

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
  return Boolean(
    process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_ADMIN_CHAT_ID
  );
}

export async function notifyAdminNewOrder(order) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;

  if (!token || !chatId) {
    console.warn(
      'Admin Telegram notifications skipped: set TELEGRAM_BOT_TOKEN and TELEGRAM_ADMIN_CHAT_ID'
    );
    return;
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: formatOrderMessage(order),
      disable_web_page_preview: true,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Telegram failed (${res.status}): ${body}`);
  }
}
