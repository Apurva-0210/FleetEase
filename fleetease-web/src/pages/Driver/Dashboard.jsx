import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Bus, MapPin, Calendar, Clock } from 'lucide-react';

export default function DriverDashboard() {
  const [vehicle, setVehicle] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();

  useEffect(() => {
    const t = localStorage.getItem('token');
    let role = null; try { role = t ? JSON.parse(atob(t.split('.')[1]))?.role : null; } catch {}
    if (role !== 'driver') { nav('/'); return; }

    const load = async () => {
      try {
        setLoading(true);
        const [vehRes, asgRes] = await Promise.all([
          api.get('/driver/vehicle'),
          api.get('/driver/assignments')
        ]);
        setVehicle(vehRes.data || null);
        setAssignments(Array.isArray(asgRes.data) ? asgRes.data : []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [nav]);

  const today = new Date();
  today.setHours(0,0,0,0);
  const todaysTrips = assignments.filter(a => {
    if (!a.departure) return false;
    const d = new Date(a.departure);
    const dDay = new Date(d); dDay.setHours(0,0,0,0);
    return dDay.getTime() === today.getTime();
  });
  const nextTrip = assignments[0];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500" />
          <p className="text-sm text-slate-500">Loading driver dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <p className="text-xs font-semibold tracking-wide text-blue-600 uppercase mb-1">Driver Workspace</p>
          <h1 className="text-2xl font-bold text-slate-900">Driver Dashboard</h1>
          <p className="text-slate-500 text-sm">View your assigned bus and upcoming trips.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card className="md:col-span-1 border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-600">Assigned Vehicle</CardTitle>
            </CardHeader>
            <CardContent>
              {vehicle ? (
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Bus className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">{vehicle.vehicle_number}</div>
                    <div className="text-xs text-slate-500">{vehicle.type || 'Bus'}</div>
                    <div className="text-xs text-slate-500 mt-1">Capacity: {vehicle.capacity || '—'}</div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500">No vehicle assigned. Please contact your manager.</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-600">Today&apos;s Trips</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{todaysTrips.length}</div>
              <p className="text-xs text-slate-500 mt-1">Trips scheduled for today.</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-600">Upcoming Trips</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{assignments.length}</div>
              <p className="text-xs text-slate-500 mt-1">Next 50 assignments from your manager.</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-1">
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-sm">Next Trip</CardTitle>
                <CardDescription>Your very next assignment.</CardDescription>
              </CardHeader>
              <CardContent>
                {!nextTrip ? (
                  <p className="text-sm text-slate-500">No route assigned.</p>
                ) : (
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      <span>{nextTrip.source} → {nextTrip.destination}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <span>{nextTrip.departure ? new Date(nextTrip.departure).toLocaleDateString() : '—'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-slate-400" />
                      <span>{nextTrip.departure ? new Date(nextTrip.departure).toLocaleTimeString() : '—'}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-2">
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-sm">Upcoming Assignments</CardTitle>
                <CardDescription>Routes assigned to you by the manager.</CardDescription>
              </CardHeader>
              <CardContent>
                {assignments.length === 0 ? (
                  <p className="text-sm text-slate-500">No routes assigned.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-slate-500 font-medium">Route</th>
                          <th className="px-3 py-2 text-left text-slate-500 font-medium">Departure</th>
                          <th className="px-3 py-2 text-left text-slate-500 font-medium">Bus</th>
                          <th className="px-3 py-2 text-left text-slate-500 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {assignments.map((r, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="px-3 py-2">{r.source && r.destination ? `${r.source} → ${r.destination}` : 'No route assigned'}</td>
                            <td className="px-3 py-2">{r.departure ? new Date(r.departure).toLocaleString() : '—'}</td>
                            <td className="px-3 py-2">{r.bus_number || r.vehicle_number || '—'}</td>
                            <td className="px-3 py-2 text-xs text-slate-700">{r.status || 'scheduled'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
