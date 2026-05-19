const PDFDocument = require('pdfkit');
const pool = require('../db');
const { generateBarcodePNG } = require('./barcode');
const fs = require('fs');
const path = require('path');

async function generateInvoicePDF(bookingId) {
  const br = await pool.query('SELECT * FROM bookings WHERE booking_id=$1', [bookingId]);
  if (!br.rows.length) throw new Error('Booking not found');
  const booking = br.rows[0];
  const sched = await pool
    .query('SELECT * FROM schedules WHERE schedule_id=$1', [booking.schedule_id])
    .then(r=> r.rows[0] || null);
  const customer = await pool
    .query('SELECT user_id, name, email, phone, address, role FROM users WHERE user_id=$1', [booking.user_id])
    .then(r=> r.rows[0] || {});
  const pRes = await pool.query('SELECT amount, method, status, created_at FROM payments WHERE booking_id=$1 AND status=$2 ORDER BY created_at DESC LIMIT 1', [bookingId, 'success']);
  const lastPay = pRes.rows[0] || null;
  const totalPaidRes = await pool.query('SELECT COALESCE(SUM(amount),0) AS paid FROM payments WHERE booking_id=$1 AND status=$2', [bookingId, 'success']);
  const paid = Number(totalPaidRes.rows[0].paid || 0);

  const company = {
    name: 'Fleetease Mobility Pvt. Ltd.',
    email: 'care@fleetease.in',
    phone: '+91 20 6718 6800',
    addr1: 'Unit 804, Phoenix Workspaces',
    addr2: 'Baner–Pashan Link Road, Pune 411045',
    addr3: 'Maharashtra, India',
    gstin: '27AAACF1234Z1Z5'
  };

  const filename = `ticket_receipt_${bookingId}.pdf`;
  const doc = new PDFDocument({ margin: 40 });
  const stream = doc;

  const drawCell = (x, y, w, h, text, align='left', bold=false) => {
    doc.rect(x, y, w, h).strokeColor('#cccccc').lineWidth(0.8).stroke();
    if (bold) doc.font('Helvetica-Bold'); else doc.font('Helvetica');
    doc.fontSize(10).fillColor('#111').text(text||'', x+6, y+6, { width: w-12, height: h-12, align });
  };

  // Optional logo on the top-left if available
  try{
    const logoPath = path.join(__dirname, '..', 'assets', 'fleetease-logo.png');
    if (fs.existsSync(logoPath)){
      doc.image(logoPath, 40, 32, { fit: [120, 36] });
    }
  }catch{}
  doc.fillColor('#4b5563').font('Helvetica-Bold').fontSize(16).text('BUS TICKET RECEIPT', { align: 'center' });
  doc.moveDown(0.5);

  const startX = 40, fullW = doc.page.width - 80; // 40 margin each side
  let cy = 80;

  drawCell(startX, cy, fullW/3, 18, 'Company Name', 'center', true);
  drawCell(startX+fullW/3, cy, fullW/3, 18, 'Company Email Address', 'center', true);
  drawCell(startX+2*fullW/3, cy, fullW/3, 18, 'Company Phone Number', 'center', true);
  cy += 18;
  drawCell(startX, cy, fullW/3, 36, company.name, 'center');
  drawCell(startX+fullW/3, cy, fullW/3, 36, company.email, 'center');
  drawCell(startX+2*fullW/3, cy, fullW/3, 36, company.phone, 'center');
  cy += 36;
  drawCell(startX, cy, fullW/3, 18, 'Address Line 1', 'center', true);
  drawCell(startX+fullW/3, cy, fullW/3, 18, 'Address Line 2', 'center', true);
  drawCell(startX+2*fullW/3, cy, fullW/3, 18, 'GSTIN', 'center', true);
  cy += 18;
  drawCell(startX, cy, fullW/3, 36, company.addr1, 'center');
  drawCell(startX+fullW/3, cy, fullW/3, 36, company.addr2, 'center');
  drawCell(startX+2*fullW/3, cy, fullW/3, 36, company.gstin, 'center');
  cy += 48;

  const leftW = (fullW*2)/3, rightW = fullW/3;
  drawCell(startX, cy, leftW, 18, 'CUSTOMER', 'left', true);
  drawCell(startX+leftW, cy, rightW, 18, 'DETAILS', 'left', true);
  cy += 18;
  drawCell(startX, cy, leftW, 18, `${customer.name||booking.customer_name||'Customer Name'}`);
  drawCell(startX+leftW, cy, rightW, 18, `Receipt Number\nINV-${bookingId}`);
  cy += 18;
  drawCell(startX, cy, leftW, 18, `${(customer.address||'').split('\n')[0]||''}`);
  drawCell(startX+leftW, cy, rightW, 18, `Receipt Date\n${new Date(lastPay?.created_at||booking.created_at||Date.now()).toLocaleString()}`);
  cy += 18;
  drawCell(startX, cy, leftW, 18, `${(customer.address||'').split('\n')[1]||''}`);
  drawCell(startX+leftW, cy, rightW, 18, `Payment Method\n${lastPay?.method||'—'}`);
  cy += 24;

  const qtyW = fullW*0.12, descW = fullW*0.48, unitW = fullW*0.13, subW = fullW*0.13, taxW = fullW*0.14;
  drawCell(startX, cy, qtyW, 22, 'QUANTITY', 'center', true);
  drawCell(startX+qtyW, cy, descW, 22, 'DESCRIPTION', 'center', true);
  drawCell(startX+qtyW+descW, cy, unitW, 22, 'UNIT PRICE', 'center', true);
  drawCell(startX+qtyW+descW+unitW, cy, subW, 22, 'SUBTOTAL', 'center', true);
  drawCell(startX+qtyW+descW+unitW+subW, cy, taxW, 22, 'TAX', 'center', true);
  cy += 22;

  const fare = Number(booking.fare || paid || 0);
  // Determine GST: customer 5%, corporate 18%, agent 0%
  let isCorporate = false;
  try {
    const chk = await pool.query('SELECT 1 FROM corp_bookings WHERE booking_id=$1 LIMIT 1', [bookingId]);
    if (chk.rows.length) isCorporate = true;
  } catch {}
  const role = (customer.role||'').toLowerCase();
  const taxRate = role==='agent' ? 0 : (isCorporate ? 0.18 : 0.05);
  const subtotal = fare;
  const tax = Math.round(subtotal * taxRate);
  const total = subtotal + tax;

  drawCell(startX, cy, qtyW, 22, '1', 'center');
  const desc = `Bus Ticket — ${sched?.source||booking.source||''} → ${sched?.destination||booking.destination||''}\nDate: ${sched?.departure? new Date(sched.departure).toLocaleString() : ''}\nSeat: ${booking.seat_number||booking.seat||'—'}  Bus: ${sched?.bus_number||'—'}`;
  drawCell(startX+qtyW, cy, descW, 44, desc);
  drawCell(startX+qtyW+descW, cy, unitW, 22, `₹${fare.toFixed(2)}`, 'right');
  drawCell(startX+qtyW+descW+unitW, cy, subW, 22, `₹${subtotal.toFixed(2)}`, 'right');
  drawCell(startX+qtyW+descW+unitW+subW, cy, taxW, 22, `₹${tax.toFixed(2)}`, 'right');
  cy += 44;

  const notes = booking.notes || '';
  drawCell(startX, cy, fullW*0.6, 50, notes||'[Notes]');
  drawCell(startX+fullW*0.6, cy, fullW*0.25, 22, 'Subtotal', 'left', true);
  drawCell(startX+fullW*0.6+fullW*0.25, cy, fullW*0.15, 22, `₹${subtotal.toFixed(2)}`, 'right');
  cy += 22;
  drawCell(startX+fullW*0.6, cy, fullW*0.25, 22, `Tax (${(taxRate*100).toFixed(0)}%)`, 'left', true);
  drawCell(startX+fullW*0.6+fullW*0.25, cy, fullW*0.15, 22, `₹${tax.toFixed(2)}`, 'right');
  cy += 22;
  drawCell(startX+fullW*0.6, cy, fullW*0.25, 22, 'Total', 'left', true);
  drawCell(startX+fullW*0.6+fullW*0.25, cy, fullW*0.15, 22, `₹${total.toFixed(2)}`, 'right');
  cy += 40;

  const barcode = await generateBarcodePNG(String(bookingId));
  doc.image(barcode, startX, cy, { fit: [200, 60] });
  doc.font('Helvetica').fontSize(9).fillColor('#6b7280').text('THANK YOU FOR THE PAYMENT!', startX, cy+70, { align: 'left' });
  doc.end();
  return { stream, filename };
}

module.exports = { generateInvoicePDF };
