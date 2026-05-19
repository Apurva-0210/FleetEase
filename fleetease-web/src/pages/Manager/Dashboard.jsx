import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Calendar, Users, Bus, Ticket, DollarSign, BarChart } from 'lucide-react';

export default function ManagerDashboard() {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    todayRevenue: 0,
    activeBookings: 0,
    availableVehicles: 0,
    activeDrivers: 0,
    pendingApprovals: 0
  });
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // Fetch manager dashboard data
        const [statsRes, bookingsRes] = await Promise.all([
          api.get('/manager/dashboard/stats', { params: dateRange }),
          api.get('/manager/bookings/recent')
        ]);
        
        setStats(statsRes.data);
        setRecentBookings(bookingsRes.data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [dateRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const kpiCards = [
    { 
      title: 'Total Revenue', 
      value: `₹${stats.totalRevenue.toLocaleString()}`, 
      icon: <DollarSign className="h-6 w-6 text-blue-500" />,
      change: '+12%',
      changeType: 'increase'
    },
    { 
      title: 'Active Bookings', 
      value: stats.activeBookings, 
      icon: <Ticket className="h-6 w-6 text-green-500" />,
      change: '+5%',
      changeType: 'increase'
    },
    { 
      title: 'Available Vehicles', 
      value: stats.availableVehicles, 
      icon: <Bus className="h-6 w-6 text-yellow-500" />,
      change: '0%',
      changeType: 'neutral'
    },
    { 
      title: 'Pending Approvals', 
      value: stats.pendingApprovals, 
      icon: <Users className="h-6 w-6 text-red-500" />,
      change: '+2',
      changeType: 'decrease'
    },
  ];

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manager Dashboard</h1>
          <p className="text-gray-500">Welcome back! Here's what's happening with your fleet.</p>
        </div>
        <div className="flex space-x-2">
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
            className="px-3 py-2 border rounded-md text-sm"
          />
          <span className="flex items-center">to</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
            className="px-3 py-2 border rounded-md text-sm"
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {kpiCards.map((card, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                {card.title}
              </CardTitle>
              <div className="p-2 rounded-lg bg-blue-50">
                {card.icon}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className={`text-xs mt-1 ${
                card.changeType === 'increase' ? 'text-green-600' : 
                card.changeType === 'decrease' ? 'text-red-600' : 'text-gray-500'
              }`}>
                {card.change} from last period
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="bookings">Recent Bookings</TabsTrigger>
          <TabsTrigger value="vehicles">Vehicle Status</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center bg-gray-50 rounded-lg">
                  <BarChart className="h-12 w-12 text-gray-300" />
                  <p className="text-gray-500">Revenue chart will be displayed here</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Vehicle Utilization</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center bg-gray-50 rounded-lg">
                  <Bus className="h-12 w-12 text-gray-300" />
                  <p className="text-gray-500">Utilization chart will be displayed here</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="bookings">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Recent Bookings</CardTitle>
                <Button onClick={() => navigate('/manager/bookings')} variant="outline">
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Booking ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Route</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentBookings.map((booking) => (
                      <tr key={booking.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/manager/bookings/${booking.id}`)}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#{booking.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{booking.customerName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{booking.route}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(booking.date).toLocaleDateString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                            booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {booking.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₹{booking.amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vehicles">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Vehicle Status</CardTitle>
                <Button onClick={() => navigate('/manager/vehicles')} variant="outline">
                  Manage Vehicles
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((vehicle) => (
                  <div key={vehicle} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">BR01AB{1000 + vehicle}</h3>
                        <p className="text-sm text-gray-500">Volvo B9R (2x2 Seater)</p>
                      </div>
                      <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                        Available
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-gray-500">Last Service</p>
                        <p>15 days ago</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Next Service</p>
                        <p>In 15 days</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Mileage</p>
                        <p>45,678 km</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Status</p>
                        <p>Active</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="mt-4 w-full" onClick={() => navigate(`/manager/vehicles/${vehicle}`)}>
                      View Details
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <h3 className="font-medium mb-2">Financial Report</h3>
                  <p className="text-sm text-gray-500 mb-4">Generate detailed financial reports for the selected period.</p>
                  <Button onClick={() => window.alert('Generating financial report...')}>
                    Generate Financial Report
                  </Button>
                </div>
                <div className="p-4 border rounded-lg">
                  <h3 className="font-medium mb-2">Vehicle Utilization Report</h3>
                  <p className="text-sm text-gray-500 mb-4">View vehicle utilization and performance metrics.</p>
                  <Button variant="outline" onClick={() => window.alert('Generating utilization report...')}>
                    Generate Utilization Report
                  </Button>
                </div>
                <div className="p-4 border rounded-lg">
                  <h3 className="font-medium mb-2">Driver Performance</h3>
                  <p className="text-sm text-gray-500 mb-4">Analyze driver performance and safety metrics.</p>
                  <Button variant="outline" onClick={() => window.alert('Generating driver performance report...')}>
                    Generate Driver Report
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
