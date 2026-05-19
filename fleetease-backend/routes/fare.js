const express = require('express');
const { estimateB2BFare } = require('../utils/fareModel');
const { getFixedFare, getCorporateDailyRate } = require('../utils/routeFares');
const router = express.Router();

// POST /api/fare/estimate
// body: { distanceKm, fuelPricePerL?, avgKmPerL?, permitFee?, tolls?, driverCost?, profitMargin? }
router.post('/estimate', (req, res) => {
  try {
    const { distanceKm, fuelPricePerL, avgKmPerL, permitFee, tolls, driverCost, profitMargin } = req.body || {};
    if (distanceKm == null) return res.status(400).json({ error: 'distanceKm required' });
    const quote = estimateB2BFare({ distanceKm, fuelPricePerL, avgKmPerL, permitFee, tolls, driverCost, profitMargin });
    res.json(quote);
  } catch (e) {
    res.status(500).json({ error: 'Failed to estimate fare', details: e.message });
  }
});

module.exports = router;

// POST /api/fare/quote
// body: { source, destination, busType, date, seatsCount, role('customer'|'company_admin'|'agent'|...), method('fixed'|'cost'|'combined'), distanceKm, costParams }
// Returns: { mode: 'B2C'|'B2B', perSeat?, total, breakdown }
router.post('/quote', (req, res) => {
  try{
    const { source, destination, busType, date, seatsCount=1, role, method='fixed', distanceKm, costParams, days=1 } = req.body || {};
    const seats = Number(seatsCount)||1;
    const numDays = Math.max(1, Number(days)||1);
    const isCorporate = role === 'company_admin' || role === 'corporate' || method !== 'fixed' && role === 'admin' && req.body?.for==='B2B';

    // Get fixed table fares
    const fixed = getFixedFare({ source, destination, busType, date });

    if (!isCorporate){
      if (!fixed) return res.status(404).json({ error: 'No fixed fare found for route/bus type' });
      const perSeat = Number(fixed.customerFare);
      const total = Math.round(perSeat * seats);
      return res.json({ mode:'B2C', perSeat, seats, total, peak: fixed.peak, multiplier: fixed.multiplier, capacity: fixed.capacity });
    }

    // Corporate modes (route-agnostic per-day by bus type)
    const dailyRate = getCorporateDailyRate(busType);
    let fixedTotal = dailyRate != null ? (Number(dailyRate) * numDays) : (fixed ? Number(fixed.corporateFare) * numDays : null);
    let costQuote = null;
    if (distanceKm != null){
      const { fuelPricePerL, avgKmPerL, permitFee, tolls, driverCost, profitMargin } = costParams || {};
      costQuote = estimateB2BFare({ distanceKm: Number(distanceKm), fuelPricePerL, avgKmPerL, permitFee, tolls, driverCost, profitMargin });
    }

    if (method === 'cost'){
      if (!costQuote) return res.status(400).json({ error: 'distanceKm required for cost method' });
      return res.json({ mode:'B2B', method, total: Math.round(costQuote.total * numDays), breakdown: { costQuote, days: numDays } });
    }
    if (method === 'fixed'){
      if (fixedTotal == null) return res.status(404).json({ error: 'No fixed corporate fare found for route/bus type' });
      return res.json({ mode:'B2B', method, total: fixedTotal, breakdown: { dailyRate, days: numDays } });
    }
    // combined: blend fixed and cost-based if both present; if one missing, fallback to the other
    if (method === 'combined'){
      if (fixedTotal != null && costQuote){
        const costDays = Math.round(costQuote.total * numDays);
        const total = Math.round((fixedTotal + costDays)/2);
        return res.json({ mode:'B2B', method, total, breakdown: { dailyRate, days: numDays, costQuote, combine: 'average' } });
      }
      if (fixedTotal != null) return res.json({ mode:'B2B', method, total: fixedTotal, breakdown: { fixedCorporate: fixedTotal, note:'cost missing' } });
      if (costQuote) return res.json({ mode:'B2B', method, total: Math.round(costQuote.total * numDays), breakdown: { costQuote, days: numDays, note:'fixed missing' } });
      return res.status(404).json({ error: 'No data to compute combined' });
    }
    return res.status(400).json({ error: 'Unknown method' });
  }catch(e){
    res.status(500).json({ error: 'Failed to quote fare', details: e.message });
  }
});
