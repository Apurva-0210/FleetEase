import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../utils/api';

export default function Dashboard(){
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [start, setStart] = React.useState('');
  const [end, setEnd] = React.useState('');
  const [selectedBus, setSelectedBus] = React.useState('');
  const nav = useNavigate();
  const location = useLocation();
  const onlineRef = React.useRef(null);
  const offlineRef = React.useRef(null);
  const busRef = React.useRef(null);
  const [echartsReady, setEchartsReady] = React.useState(!!(window.echarts));
  const calRef = React.useRef(null);
  const stackedRef = React.useRef(null);
  const pieRef = React.useRef(null);

  const loadSummary = React.useCallback(async () => {
    try {
      setLoading(true);
      const params = { start, end };
      if (selectedBus) params.vehicle_id = selectedBus;
      const qs = new URLSearchParams(params);
      const r = await api.get(`/admin/summary?${qs.toString()}`);
      setData(r.data || {});
    } catch {
      setData({});
    } finally {
      setLoading(false);
    }
  }, [start, end, selectedBus]);

  React.useEffect(() => {
    const t = localStorage.getItem('token');
    let role = null;
    try { role = t ? JSON.parse(atob(t.split('.')[1]))?.role : null; } catch {}
    if (role !== 'admin') { nav('/'); return; }
    loadSummary();
  }, [nav, location, loadSummary]);

  React.useEffect(()=>{
    if (window.echarts){ setEchartsReady(true); return; }
    const id = 'echarts-cdn-script';
    if (document.getElementById(id)) return;
    const s = document.createElement('script');
    s.id = id; s.src = 'https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js';
    s.async = true; s.onload = ()=> setEchartsReady(true);
    document.body.appendChild(s);
  },[]);

  // Do not return before hooks below to keep hooks order stable across renders
  const safeData = data || {};

  const kpi = [
    { label: 'Total Revenue', value: `₹${safeData.total_revenue ?? 0}` },
    { label: 'Today Revenue', value: `₹${safeData.today_revenue ?? 0}` },
    { label: 'Online Revenue', value: `₹${safeData.online_revenue ?? 0}` },
    { label: 'Today Online Revenue', value: `₹${safeData.today_online_revenue ?? 0}` },
    { label: 'Offline Revenue', value: `₹${safeData.offline_revenue ?? 0}` },
    { label: 'Today Offline Revenue', value: `₹${safeData.today_offline_revenue ?? 0}` },
    { label: 'Online Bookings', value: safeData.online_bookings ?? 0 },
    { label: 'Offline Bookings', value: safeData.offline_bookings ?? 0 },
    { label: 'Agent Commission (Total)', value: `₹${safeData.agent_commission_total ?? 0}` },
    { label: 'Today Agent Commission', value: `₹${safeData.today_agent_commission ?? 0}` },
    { label: 'Total Bookings', value: safeData.total_bookings ?? 0 },
    { label: 'Seats Sold', value: safeData.seats_sold ?? 0 },
    { label: 'Fuel Bills', value: `₹${safeData.fuel_total ?? 0}` },
    { label: 'Toll Bills', value: `₹${safeData.toll_total ?? 0}` },
    { label: 'Permit Bills', value: `₹${safeData.permit_total ?? 0}` },
  ];

  const dayWise = safeData.day_wise || [];
  const offlineDayWise = safeData.offline_day_wise || [];
  const busWise = safeData.bus_wise || [];
  const busByDay = safeData.bus_by_day || [];
  const busOptions = React.useMemo(()=> busWise.map(b=> ({ id: (b.vehicle_id), label: (b.bus_number || b.vehicle_number || b.vehicle_id), revenue: Number(b.revenue||0) })), [busWise]);
  const selectedBusData = React.useMemo(()=> busOptions.find(b=> String(b.id)===String(selectedBus)), [busOptions, selectedBus]);

  React.useEffect(()=>{
    if (!echartsReady) return;
    const echarts = window.echarts;
    if (onlineRef.current){
      const inst = echarts.init(onlineRef.current);
      const dates = dayWise.map(d=> d.date || d.day);
      const values = dayWise.map(d=> Number(d.revenue||0));
      inst.setOption({
        tooltip: { trigger: 'axis' },
        toolbox: { feature: { saveAsImage: {}, dataZoom: {} } },
        dataZoom: [{ type:'inside' }, { type:'slider' }],
        grid: { left: 32, right: 16, top: 24, bottom: 24 },
        xAxis: { type:'category', data: dates, axisLine:{ lineStyle:{ color:'#cbd5e1' } }, axisLabel:{ color:'#64748b' } },
        yAxis: { type:'value', axisLine:{ lineStyle:{ color:'#cbd5e1' } }, splitLine:{ lineStyle:{ color:'#e2e8f0' } }, axisLabel:{ color:'#64748b' } },
        series: [{
          type:'line', smooth:true, name:'Online Revenue', data: values,
          lineStyle:{ width:2, color:'#0ea5e9' },
          areaStyle:{ color: { type:'linear', x:0, y:0, x2:0, y2:1, colorStops:[{ offset:0, color:'rgba(14,165,233,.35)' },{ offset:1, color:'rgba(14,165,233,.05)'}] } }
        }],
      });
    }
    if (offlineRef.current){
      const inst = echarts.init(offlineRef.current);
      const dates = offlineDayWise.map(d=> d.date || d.day);
      const values = offlineDayWise.map(d=> Number(d.revenue||0));
      inst.setOption({
        tooltip: { trigger: 'axis' },
        toolbox: { feature: { saveAsImage: {}, dataZoom: {} } },
        dataZoom: [{ type:'inside' }, { type:'slider' }],
        grid: { left: 32, right: 16, top: 24, bottom: 24 },
        xAxis: { type:'category', data: dates, axisLine:{ lineStyle:{ color:'#cbd5e1' } }, axisLabel:{ color:'#64748b' } },
        yAxis: { type:'value', axisLine:{ lineStyle:{ color:'#cbd5e1' } }, splitLine:{ lineStyle:{ color:'#e2e8f0' } }, axisLabel:{ color:'#64748b' } },
        series: [{ type:'bar', data: values, name:'Offline Revenue', itemStyle:{ color:'#0369a1', borderRadius:[6,6,0,0] } }],
      });
    }
    if (busRef.current){
      const inst = echarts.init(busRef.current);
      const list = selectedBus ? busWise.filter(b=> String(b.bus_number || b.vehicle_number || b.vehicle_id)===String(selectedBus)) : busWise;
      const labels = list.map(b=> b.bus_number || b.vehicle_number || b.vehicle_id);
      const vals = list.map(b=> Number(b.revenue||0));
      inst.setOption({
        tooltip: { trigger: 'axis' },
        toolbox: { feature: { saveAsImage: {} } },
        grid: { left: 32, right: 16, top: 24, bottom: 24 },
        xAxis: { type:'category', data: labels, axisLabel:{ rotate:45, color:'#64748b' }, axisLine:{ lineStyle:{ color:'#cbd5e1' } } },
        yAxis: { type:'value', axisLabel:{ color:'#64748b' }, axisLine:{ lineStyle:{ color:'#cbd5e1' } }, splitLine:{ lineStyle:{ color:'#e2e8f0' } } },
        series: [{ type:'bar', data: vals, name:'Revenue', itemStyle:{ color:'#0ea5e9', borderRadius:[6,6,0,0] } }],
      });
    }
    // Calendar heatmap using combined (online) dayWise for now
    if (calRef.current){
      const inst = echarts.init(calRef.current);
      const dataArr = dayWise.map(d=> [d.date, Number(d.revenue||0)]);
      const range = dataArr.length? [dataArr[0][0], dataArr[dataArr.length-1][0]] : [new Date().toISOString().slice(0,10), new Date().toISOString().slice(0,10)];
      inst.setOption({
        tooltip: { position: 'top' },
        visualMap: {
          min: 0,
          max: Math.max(1, ...dataArr.map(x=>x[1])),
          calculable: true,
          orient: 'horizontal', left: 'center',
          inRange: { color: ['#e0f2fe','#7dd3fc','#0ea5e9'] }
        },
        calendar: { range, cellSize: ['auto', 18], itemStyle:{ borderColor:'#e2e8f0' } },
        series: [{ type:'heatmap', coordinateSystem:'calendar', data: dataArr }]
      });
    }
    // Stacked area by bus using bus_by_day
    if (stackedRef.current){
      const inst = echarts.init(stackedRef.current);
      const dates = Array.from(new Set(busByDay.map(r=> r.date))).sort();
      const buses = Array.from(new Set(busByDay.map(r=> r.vehicle_number || r.vehicle_id)));
      const series = buses.map(name=> ({
        name,
        type:'line',
        stack:'total',
        areaStyle:{},
        emphasis:{ focus:'series' },
        data: dates.map(dt=> {
          const item = busByDay.find(x=> (x.vehicle_number||x.vehicle_id)===name && x.date===dt);
          return Number(item?.revenue||0);
        })
      }));
      inst.setOption({
        tooltip:{ trigger:'axis' },
        legend:{ type:'scroll' },
        grid: { left: 32, right: 16, top: 24, bottom: 24 },
        xAxis:{ type:'category', data: dates, axisLabel:{ color:'#64748b' }, axisLine:{ lineStyle:{ color:'#cbd5e1' } } },
        yAxis:{ type:'value', axisLabel:{ color:'#64748b' }, axisLine:{ lineStyle:{ color:'#cbd5e1' } }, splitLine:{ lineStyle:{ color:'#e2e8f0' } } },
        series
      });
    }
    // Mode split pie (online vs offline)
    if (pieRef.current){
      const inst = echarts.init(pieRef.current);
      const online = Number(safeData.online_revenue||0);
      const offline = Number(safeData.offline_revenue||0);
      inst.setOption({
        tooltip:{ trigger:'item' },
        legend:{ orient:'horizontal', left:'center' },
        color: ['#0ea5e9','#0369a1'],
        series:[{
          name:'Revenue Split', type:'pie', radius:['30%','70%'], avoidLabelOverlap:true,
          data:[{ name:'Online', value: online }, { name:'Offline', value: offline }]
        }]
      });
    }
    const onResize = ()=>{ try{ window.echarts?.getInstanceByDom(onlineRef.current)?.resize(); }catch{} try{ window.echarts?.getInstanceByDom(offlineRef.current)?.resize(); }catch{} try{ window.echarts?.getInstanceByDom(busRef.current)?.resize(); }catch{} };
    window.addEventListener('resize', onResize);
    return ()=> window.removeEventListener('resize', onResize);
  },[echartsReady, dayWise, offlineDayWise, busWise, busByDay, selectedBus, safeData.online_revenue, safeData.offline_revenue]);

  return (
    <div className="container py-4">
      <h3 className="mb-3">Admin — Dashboard</h3>
      {loading && (
        <>
          <div className="card p-3 mb-3">
            <div className="skeleton skeleton-line mb-2" style={{ width: '18%' }}></div>
            <div className="row g-2">
              <div className="col-auto"><div className="skeleton skeleton-line" style={{ width: 160, height: 38 }}></div></div>
              <div className="col-auto"><div className="skeleton skeleton-line" style={{ width: 160, height: 38 }}></div></div>
              <div className="col-auto"><div className="skeleton skeleton-line" style={{ width: 180, height: 38 }}></div></div>
            </div>
          </div>
          <div className="row g-3 mb-4">
            {Array.from({length:4}).map((_,i)=> (
              <div className="col-6 col-md-3" key={i}>
                <div className="card kpi-card">
                  <div className="skeleton skeleton-line mb-2" style={{width:'60%'}}></div>
                  <div className="skeleton skeleton-line" style={{height:18, width:'40%'}}></div>
                </div>
              </div>
            ))}
          </div>
          <div className="row g-4">
            {Array.from({length:3}).map((_,i)=> (
              <div className="col-md-4" key={i}>
                <div className="card p-3">
                  <div className="skeleton skeleton-line mb-3" style={{width:'70%'}}></div>
                  <div className="skeleton skeleton-chart"></div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      {!loading && !data && <div className="mb-3">No data</div>}
      <div className="row g-2 align-items-end mb-3">
        <div className="col-auto">
          <label className="form-label">Start</label>
          <input type="date" className="form-control" value={start} onChange={e=>setStart(e.target.value)} />
        </div>
        <div className="col-auto">
          <label className="form-label">End</label>
          <input type="date" className="form-control" value={end} onChange={e=>setEnd(e.target.value)} />
        </div>
        <div className="col-auto">
          <button className="btn btn-outline-secondary mt-4" onClick={()=>{ setStart(''); setEnd(''); }}>Reset</button>
        </div>
        <div className="col-auto">
          <label className="form-label">Bus</label>
          <select className="form-select" value={selectedBus} onChange={e=>setSelectedBus(e.target.value)}>
            <option value="">All</option>
            {busOptions.map(b=> (
              <option key={b.id} value={b.id}>{b.label}</option>
            ))}
          </select>
        </div>
      </div>
      {!loading && (
      <div className="row g-3 mb-4">
        {kpi.map((x,i)=> (
          <div className="col-6 col-md-3" key={i}>
            <div className="card kpi-card text-center">
              <div className="kpi-title">{x.label}</div>
              <div className="kpi-value">{x.value}</div>
            </div>
          </div>
        ))}
        {selectedBus && (
          <div className="col-6 col-md-3">
            <div className="card kpi-card text-center">
              <div className="kpi-title">Selected Bus Revenue</div>
              <div className="kpi-value">₹{selectedBusData?.revenue ?? 0}</div>
            </div>
          </div>
        )}
      </div>
      )}

      {!loading && (
      <div className="row g-4">
        <div className="col-md-4">
          <div className="card p-3">
            <h6 className="mb-3">Online Day-wise Revenue</h6>
            {dayWise.length===0 && <div className="text-muted">No data</div>}
            {dayWise.length>0 && (<div ref={onlineRef} style={{width:'100%', height:260}} />)}
          </div>
        </div>
        <div className="col-md-4">
          <div className="card p-3">
            <h6 className="mb-3">Offline Day-wise Revenue</h6>
            {offlineDayWise.length===0 && <div className="text-muted">No data</div>}
            {offlineDayWise.length>0 && (<div ref={offlineRef} style={{width:'100%', height:260}} />)}
          </div>
        </div>
        <div className="col-md-4">
          <div className="card p-3">
            <h6 className="mb-3">Bus-wise Revenue</h6>
            {(selectedBus ? busWise.filter(b=> String(b.bus_number || b.vehicle_number || b.vehicle_id)===String(selectedBus)) : busWise).length===0 && <div className="text-muted">No data</div>}
            {(selectedBus ? busWise.filter(b=> String(b.bus_number || b.vehicle_number || b.vehicle_id)===String(selectedBus)) : busWise).length>0 && (<div ref={busRef} style={{width:'100%', height:260}} />)}
          </div>
        </div>
      </div>
      )}

      {!loading && (
      <div className="row g-4 mt-1">
        <div className="col-md-6">
          <div className="card p-3">
            <h6 className="mb-3">Calendar Heatmap (Online)</h6>
            <div ref={calRef} style={{width:'100%', height:240}} />
          </div>
        </div>
        <div className="col-md-6">
          <div className="card p-3">
            <h6 className="mb-3">Mode Split</h6>
            <div ref={pieRef} style={{width:'100%', height:240}} />
          </div>
        </div>
      </div>
      )}

      {!loading && (
      <div className="row g-4 mt-1">
        <div className="col-12">
          <div className="card p-3">
            <h6 className="mb-3">Stacked Area by Bus (Combined)</h6>
            {busByDay.length===0 ? <div className="text-muted">No data</div> : <div ref={stackedRef} style={{width:'100%', height:300}} />}
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
