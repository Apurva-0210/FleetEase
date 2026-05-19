const express = require('express');
const pool = require('../db');
const { generateInvoicePDF } = require('../utils/pdfInvoice');
const router = express.Router();

router.get('/:booking_id', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM invoices WHERE booking_id=$1', [req.params.booking_id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Invoice not found' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: 'Failed to fetch invoice' }); }
});

router.get('/:booking_id/pdf', async (req, res) => {
  try {
    const bookingId = req.params.booking_id;
    const { stream, filename } = await generateInvoicePDF(bookingId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=${filename}`);
    stream.pipe(res);
  } catch (e) { res.status(500).json({ error: 'Failed to generate invoice PDF' }); }
});

module.exports = router;
