const Razorpay = require('razorpay');
const crypto = require('crypto');

function getClient() {
  const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) return null;
  return new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });
}

async function createOrder(amount, currency = 'INR', receipt = `rcpt_${Date.now()}`) {
  const client = getClient();
  if (!client) return { id: `order_mock_${Date.now()}`, amount: Math.round(amount * 100), currency, receipt, mock: true };
  return client.orders.create({ amount: Math.round(amount * 100), currency, receipt });
}

function verifySignature(orderId, paymentId, signature) {
  if (!signature || !process.env.RAZORPAY_KEY_SECRET) return true;
  const h = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
  h.update(`${orderId}|${paymentId}`);
  return h.digest('hex') === signature;
}

module.exports = { createOrder, verifySignature };
