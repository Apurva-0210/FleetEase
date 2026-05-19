const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const pool = require('../db');
const router = express.Router();

function getRazorpay() {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) return null;
  return new Razorpay({ key_id, key_secret });
}

// Create order (test mode)
router.post('/create-order', async (req, res) => {
  const { amount, currency = 'INR', receipt = `rcpt_${Date.now()}` } = req.body;
  try {
    const rzp = getRazorpay();
    if (!rzp) return res.status(200).json({ mock: true, id: `order_mock_${Date.now()}`, amount, currency, receipt });
    const order = await rzp.orders.create({ amount: Math.round(amount * 100), currency, receipt });
    res.json(order);
  } catch (e) { res.status(500).json({ error: 'Failed to create order' }); }
});

// Verify payment and record
router.post('/verify', async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, booking_id, amount } = req.body;
  try {
    let verified = true;
    if (razorpay_signature && process.env.RAZORPAY_KEY_SECRET) {
      const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
      hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
      const digest = hmac.digest('hex');
      verified = digest === razorpay_signature;
    }
    if (!verified) return res.status(400).json({ error: 'Signature mismatch' });
    await pool.query(
      'INSERT INTO payments (booking_id, amount, method, status) VALUES ($1,$2,$3,$4)',
      [booking_id, amount, 'razorpay', 'success']
    );
    await pool.query('UPDATE bookings SET payment_status=$1 WHERE booking_id=$2', ['paid', booking_id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Payment verify failed' }); }
});

module.exports = router;
