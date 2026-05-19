const pool = require('../db');
module.exports = async (req, res) => {
  try {
    // Ensure required tables exist (especially offline_bookings) to avoid errors on fresh DBs
    await pool.query(`CREATE TABLE IF NOT EXISTS offline_bookings (
      id SERIAL PRIMARY KEY,
      agent_user_id INT,
      customer_name TEXT,
      customer_phone TEXT,
      route_id INT,
      schedule_id INT,
      seats TEXT,
      amount NUMERIC,
      payment_method VARCHAR(10),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    const { start, end, vehicle_id } = req.query || {};
    const payWhere = [];
    const payArgs = [];
    payWhere.push("status='success'");
    if (start) { payArgs.push(start); payWhere.push(`transaction_time >= $${payArgs.length}`); }
    if (end) { payArgs.push(end); payWhere.push(`transaction_time < ($${payArgs.length}+ INTERVAL '1 day')`); }
    const payWhereSql = payWhere.length ? ('WHERE ' + payWhere.join(' AND ')) : '';

    // Online (customer) revenue/bookings via payments table
    const totalRevenueQ = await pool.query("SELECT COALESCE(SUM(amount),0) AS total FROM payments WHERE status='success'");
    const todayRevenueQ = await pool.query("SELECT COALESCE(SUM(amount),0) AS total FROM payments WHERE status='success' AND DATE(transaction_time)=CURRENT_DATE");
    const onlineWhere = [];
    const onlineArgs = [];
    onlineWhere.push("status='success'");
    if (start) { onlineArgs.push(start); onlineWhere.push(`transaction_time >= $${onlineArgs.length}`); }
    if (end) { onlineArgs.push(end); onlineWhere.push(`transaction_time < ($${onlineArgs.length}+ INTERVAL '1 day')`); }
    const onlineWhereSql = onlineWhere.length ? ('WHERE ' + onlineWhere.join(' AND ')) : '';
    const onlineRevenueQ = await pool.query(`SELECT COALESCE(SUM(amount),0) AS total, COUNT(*) AS cnt FROM payments ${onlineWhereSql}`, onlineArgs);
    const todayOnlineQ = await pool.query(`SELECT COALESCE(SUM(amount),0) AS total, COUNT(*) AS cnt FROM payments WHERE status='success' AND DATE(transaction_time)=CURRENT_DATE`);
    // Offline bookings totals (agent)
    const offWhere = [];
    const offArgs = [];
    if (start) { offArgs.push(start); offWhere.push(`created_at >= $${offArgs.length}`); }
    if (end) { offArgs.push(end); offWhere.push(`created_at < ($${offArgs.length}+ INTERVAL '1 day')`); }
    const offWhereSql = offWhere.length ? ('WHERE ' + offWhere.join(' AND ')) : '';
    const offlineRevenueQ = await pool.query(`SELECT COALESCE(SUM(amount),0) AS total, COUNT(*) AS cnt FROM offline_bookings ${offWhereSql}`, offArgs);
    const todayOfflineRevenueQ = await pool.query(`SELECT COALESCE(SUM(amount),0) AS total, COUNT(*) AS cnt FROM offline_bookings WHERE DATE(created_at)=CURRENT_DATE`);
    const totalBookingsQ = await pool.query("SELECT COUNT(*) AS cnt FROM bookings");
    const seatsSoldQ = await pool.query("SELECT COUNT(*) AS cnt FROM booking_seats");

    // Online revenue day-wise; if vehicle_id provided, join bookings to filter
    let dayWiseQ;
    if (vehicle_id) {
      const args = [...payArgs, Number(vehicle_id)];
      dayWiseQ = await pool.query(`
        SELECT to_char(p.transaction_time,'YYYY-MM-DD') AS date, SUM(p.amount) AS revenue
        FROM payments p
        JOIN bookings b ON b.booking_id = p.booking_id
        WHERE ${payWhere.join(' AND ').replace("status='success'", "p.status='success'")} AND b.vehicle_id = $${args.length}
        GROUP BY 1
        ORDER BY 1 DESC
        LIMIT 7
      `, args);
    } else {
      dayWiseQ = await pool.query(`
        SELECT to_char(transaction_time,'YYYY-MM-DD') AS date, SUM(amount) AS revenue
        FROM payments
        ${payWhereSql}
        GROUP BY 1
        ORDER BY 1 DESC
        LIMIT 7`, payArgs);
    }

    const busWiseQ = await pool.query(`
      SELECT b.vehicle_id,
             COALESCE(v.vehicle_number, CONCAT('VID-', b.vehicle_id)) AS vehicle_number,
             COALESCE(SUM(p.amount),0) AS revenue
      FROM bookings b
      LEFT JOIN vehicles v ON v.vehicle_id=b.vehicle_id
      LEFT JOIN payments p ON p.booking_id=b.booking_id AND p.status='success'
      GROUP BY b.vehicle_id, v.vehicle_number
      ORDER BY revenue DESC`);

    // Offline day-wise revenue
    const offDayWhere = [];
    const offDayArgs = [];
    if (start) { offDayArgs.push(start); offDayWhere.push(`created_at >= $${offDayArgs.length}`); }
    if (end) { offDayArgs.push(end); offDayWhere.push(`created_at < ($${offDayArgs.length}+ INTERVAL '1 day')`); }
    const offDayWhereSql = offDayWhere.length ? ('WHERE ' + offDayWhere.join(' AND ')) : '';
    // Offline day-wise revenue; if vehicle_id provided, join schedules to filter by vehicle
    let offlineDayWiseQ;
    if (vehicle_id){
      const args = [...offDayArgs, Number(vehicle_id)];
      offlineDayWiseQ = await pool.query(`
        SELECT to_char(ob.created_at,'YYYY-MM-DD') AS date, SUM(ob.amount) AS revenue
        FROM offline_bookings ob
        LEFT JOIN schedules sc ON sc.schedule_id = ob.schedule_id
        ${offDayWhereSql ? offDayWhereSql + ' AND' : 'WHERE'} sc.vehicle_id = $${args.length}
        GROUP BY 1
        ORDER BY 1 DESC
        LIMIT 7
      `, args);
    } else {
      offlineDayWiseQ = await pool.query(`
        SELECT to_char(created_at,'YYYY-MM-DD') AS date, SUM(amount) AS revenue
        FROM offline_bookings
        ${offDayWhereSql}
        GROUP BY 1
        ORDER BY 1 DESC
        LIMIT 7`, offDayArgs);
    }

    const dayWise = dayWiseQ.rows.map(r=> ({ date: r.date, revenue: Number(r.revenue||0) })).reverse();
    const busWise = busWiseQ.rows.map(r=> ({ vehicle_id: r.vehicle_id, vehicle_number: r.vehicle_number, revenue: Number(r.revenue||0) }));
    const offlineDayWise = offlineDayWiseQ.rows.map(r=> ({ date: r.date, revenue: Number(r.revenue||0) })).reverse();

    // Bus-by-day (online + offline) for stacked area
    // Online by day and vehicle
    const onlineByDayArgs = [];
    const onlineByDayWhere = ["p.status='success'"];
    if (start) { onlineByDayArgs.push(start); onlineByDayWhere.push(`p.transaction_time >= $${onlineByDayArgs.length}`); }
    if (end) { onlineByDayArgs.push(end); onlineByDayWhere.push(`p.transaction_time < ($${onlineByDayArgs.length}+ INTERVAL '1 day')`); }
    if (vehicle_id) { onlineByDayArgs.push(Number(vehicle_id)); onlineByDayWhere.push(`b.vehicle_id = $${onlineByDayArgs.length}`); }
    const onlineByDaySql = `
      SELECT to_char(p.transaction_time,'YYYY-MM-DD') AS date,
             b.vehicle_id,
             COALESCE(v.vehicle_number, CONCAT('VID-', b.vehicle_id)) AS vehicle_number,
             SUM(p.amount) AS revenue
      FROM payments p
      JOIN bookings b ON b.booking_id = p.booking_id
      LEFT JOIN vehicles v ON v.vehicle_id = b.vehicle_id
      WHERE ${onlineByDayWhere.join(' AND ')}
      GROUP BY 1,2,3
    `;
    const onlineByDayQ = await pool.query(onlineByDaySql, onlineByDayArgs);

    // Offline by day and vehicle
    const offByDayArgs = [];
    const offByDayWhere = [];
    if (start) { offByDayArgs.push(start); offByDayWhere.push(`ob.created_at >= $${offByDayArgs.length}`); }
    if (end) { offByDayArgs.push(end); offByDayWhere.push(`ob.created_at < ($${offByDayArgs.length}+ INTERVAL '1 day')`); }
    if (vehicle_id) { offByDayArgs.push(Number(vehicle_id)); offByDayWhere.push(`sc.vehicle_id = $${offByDayArgs.length}`); }
    const offByDayWhereSql = offByDayWhere.length ? ('WHERE ' + offByDayWhere.join(' AND ')) : '';
    const offlineByDayQ = await pool.query(`
      SELECT to_char(ob.created_at,'YYYY-MM-DD') AS date,
             sc.vehicle_id,
             COALESCE(v.vehicle_number, CONCAT('VID-', sc.vehicle_id)) AS vehicle_number,
             SUM(ob.amount) AS revenue
      FROM offline_bookings ob
      LEFT JOIN schedules sc ON sc.schedule_id = ob.schedule_id
      LEFT JOIN vehicles v ON v.vehicle_id = sc.vehicle_id
      ${offByDayWhereSql}
      GROUP BY 1,2,3
    `, offByDayArgs);

    const busByDayMap = new Map(); // key: date|vehicle_id -> { date, vehicle_id, vehicle_number, revenue }
    for (const r of onlineByDayQ.rows){
      const key = `${r.date}|${r.vehicle_id}`;
      busByDayMap.set(key, { date: r.date, vehicle_id: r.vehicle_id, vehicle_number: r.vehicle_number, revenue: Number(r.revenue||0) });
    }
    for (const r of offlineByDayQ.rows){
      const key = `${r.date}|${r.vehicle_id}`;
      const prev = busByDayMap.get(key) || { date: r.date, vehicle_id: r.vehicle_id, vehicle_number: r.vehicle_number, revenue: 0 };
      prev.revenue += Number(r.revenue||0);
      busByDayMap.set(key, prev);
    }
    const bus_by_day = Array.from(busByDayMap.values()).sort((a,b)=> a.date.localeCompare(b.date));

    // Bills totals
    const billsWhere = [];
    const billsArgs = [];
    if (start) { billsArgs.push(start); billsWhere.push(`billed_at >= $${billsArgs.length}`); }
    if (end) { billsArgs.push(end); billsWhere.push(`billed_at < ($${billsArgs.length}+ INTERVAL '1 day')`); }
    const billsWhereSql = billsWhere.length ? ('WHERE ' + billsWhere.join(' AND ')) : '';
    const fuelTotalQ = await pool.query(`SELECT COALESCE(SUM(total),0) AS total FROM fuel_bills ${billsWhereSql}`, billsArgs);
    const tollTotalQ = await pool.query(`SELECT COALESCE(SUM(amount),0) AS total FROM toll_bills ${billsWhereSql}`, billsArgs);
    const permitTotalQ = await pool.query(`SELECT COALESCE(SUM(amount),0) AS total FROM permit_bills ${billsWhereSql}`, billsArgs);

    // Agent commission totals from offline bookings
    const commWhere = [];
    const commArgs = [];
    if (start) { commArgs.push(start); commWhere.push(`ob.created_at >= $${commArgs.length}`); }
    if (end) { commArgs.push(end); commWhere.push(`ob.created_at < ($${commArgs.length}+ INTERVAL '1 day')`); }
    const commWhereSql = commWhere.length ? ('WHERE ' + commWhere.join(' AND ')) : '';
    const commissionQ = await pool.query(`
      SELECT COALESCE(SUM(ob.amount * COALESCE(a.commission_rate,0.05)),0) AS total
      FROM offline_bookings ob
      LEFT JOIN agents a ON a.agent_user_id = ob.agent_user_id
      ${commWhereSql}
    `, commArgs);
    const todayCommissionQ = await pool.query(`
      SELECT COALESCE(SUM(ob.amount * COALESCE(a.commission_rate,0.05)),0) AS total
      FROM offline_bookings ob
      LEFT JOIN agents a ON a.agent_user_id = ob.agent_user_id
      WHERE DATE(ob.created_at)=CURRENT_DATE
    `);

    // Offline seats count (sum of comma-separated labels)
    const offSeatsTotalQ = await pool.query(`SELECT COALESCE(SUM(array_length(string_to_array(NULLIF(seats,''), ','),1)),0) AS cnt FROM offline_bookings`);
    const offSeatsTodayQ = await pool.query(`SELECT COALESCE(SUM(array_length(string_to_array(NULLIF(seats,''), ','),1)),0) AS cnt FROM offline_bookings WHERE DATE(created_at)=CURRENT_DATE`);

    // Combined revenues
    const totalCombined = Number(onlineRevenueQ.rows[0].total||0) + Number(offlineRevenueQ.rows[0].total||0);
    const todayCombined = Number(todayOnlineQ.rows[0].total||0) + Number(todayOfflineRevenueQ.rows[0].total||0);

    const resp = {
      total_revenue: totalCombined,
      today_revenue: todayCombined,
      online_revenue: Number(onlineRevenueQ.rows[0].total||0),
      online_bookings: Number(onlineRevenueQ.rows[0].cnt||0),
      today_online_revenue: Number(todayOnlineQ.rows[0].total||0),
      today_online_bookings: Number(todayOnlineQ.rows[0].cnt||0),
      total_bookings: Number(totalBookingsQ.rows[0].cnt||0) + Number(offlineRevenueQ.rows[0].cnt||0),
      seats_sold: Number(seatsSoldQ.rows[0].cnt||0) + Number(offSeatsTotalQ.rows[0].cnt||0),
      day_wise: dayWise,
      offline_day_wise: offlineDayWise,
      bus_by_day,
      bus_wise: busWise,
      max_day_revenue: dayWise.reduce((m,x)=> Math.max(m,x.revenue),0),
      max_offline_day_revenue: offlineDayWise.reduce((m,x)=> Math.max(m,x.revenue),0),
      max_bus_revenue: busWise.reduce((m,x)=> Math.max(m,x.revenue),0),
      fuel_total: Number(fuelTotalQ.rows[0].total||0),
      toll_total: Number(tollTotalQ.rows[0].total||0),
      permit_total: Number(permitTotalQ.rows[0].total||0),
      offline_revenue: Number(offlineRevenueQ.rows[0].total||0),
      offline_bookings: Number(offlineRevenueQ.rows[0].cnt||0),
      today_offline_revenue: Number(todayOfflineRevenueQ.rows[0].total||0),
      today_offline_bookings: Number(todayOfflineRevenueQ.rows[0].cnt||0),
      offline_seats: Number(offSeatsTotalQ.rows[0].cnt||0),
      today_offline_seats: Number(offSeatsTodayQ.rows[0].cnt||0),
      agent_commission_total: Number(commissionQ.rows[0].total||0),
      today_agent_commission: Number(todayCommissionQ.rows[0].total||0)
    };
    res.json(resp);
  } catch (e) { res.status(500).json({ error: 'Failed to compute summary', details: e.message }); }
};
