function estimateB2BFare({ distanceKm, fuelPricePerL = 100, avgKmPerL = 4, permitFee = 500, tolls = 300, driverCost = 1500, profitMargin = 0.15 }) {
  const fuelCost = (distanceKm / avgKmPerL) * fuelPricePerL;
  const base = fuelCost + permitFee + tolls + driverCost;
  const total = Math.round(base * (1 + profitMargin));
  return { fuelCost: Math.round(fuelCost), permitFee, tolls, driverCost, profitMargin, total };
}

module.exports = { estimateB2BFare };
