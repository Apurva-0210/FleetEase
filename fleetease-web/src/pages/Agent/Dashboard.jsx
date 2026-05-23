import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import api from '../../utils/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Search, Plus, Users, Calendar, Clock, MapPin, Bus, Ticket, User, Phone, Mail, DollarSign } from 'lucide-react';

export default function AgentDashboard() {
  const [stats, setStats] = useState({
    todayBookings: 0,
    pendingPayments: 0,
    totalCustomers: 0,
    availableBuses: 0
  });
  const [revenue, setRevenue] = useState({ today: 0, total: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [upcomingTrips, setUpcomingTrips] = useState([]);
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // Fetch agent dashboard data
        const [statsRes, tripsRes, bookingsRes, revRes] = await Promise.all([
          api.get('/agent/dashboard/stats'),
          api.get('/agent/trips/upcoming'),
          api.get('/agent/bookings/recent'),
          api.get('/agent/stats')
        ]);
        
        setStats(statsRes.data);
        setUpcomingTrips(tripsRes.data);
        setRecentBookings(bookingsRes.data);
        const todayAmt = Number(revRes?.data?.today?.amt || 0);
        const totalAmt = Number(revRes?.data?.total?.amt || 0);
        setRevenue({ today: todayAmt, total: totalAmt });
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [location]);

  const handleSearch = (e) => {
    e.preventDefault();
    // Implement search functionality
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500" />
          <p className="text-sm text-slate-500">Loading agent dashboard…</p>
        </div>
      </div>
    );
  }

  const kpiCards = [
    { 
      title: "Today's Bookings", 
      value: stats.todayBookings, 
      icon: <Ticket className="h-6 w-6 text-blue-500" />,
      bgColor: 'bg-blue-50'
    },
    { 
      title: 'Pending Payments', 
      value: stats.pendingPayments, 
      icon: <DollarSign className="h-6 w-6 text-yellow-500" />,
      bgColor: 'bg-yellow-50'
    },
    { 
      title: 'Total Customers', 
      value: stats.totalCustomers, 
      icon: <Users className="h-6 w-6 text-green-500" />,
      bgColor: 'bg-green-50'
    },
    { 
      title: 'Available Buses', 
      value: stats.availableBuses, 
      icon: <Bus className="h-6 w-6 text-purple-500" />,
      bgColor: 'bg-purple-50'
    },
  ];


  return (
        <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <div>
            <p className="text-xs font-semibold tracking-wide text-blue-600 uppercase mb-1">Agent Workspace</p>
            <h1 className="text-2xl font-bold text-slate-900">Agent Dashboard</h1>
            <p className="text-slate-500 text-sm">Create offline bookings, track trips and follow up customers.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <Button
              variant="outline"
              className="border-slate-300 text-slate-700 hover:bg-slate-100"
              onClick={() => navigate('/agent/trips')}
            >
              <Bus className="h-4 w-4 mr-2" /> Create Trip Booking
            </Button>
            <Button onClick={() => navigate('/agent/bookings/new')} className="bg-blue-600 hover:bg-blue-700 shadow-sm">
              <Plus className="h-4 w-4 mr-2" /> New Customer Booking
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search bookings, customers, or buses..."
                className="pl-10 pr-4 py-2 w-full border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button type="submit" variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-100">
              Search
            </Button>
          </form>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          {kpiCards.map((card, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow bg-white border-slate-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  {card.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${card.bgColor}`}>
                  {card.icon}
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{card.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Revenue summary chips */}
        <div className="flex flex-wrap gap-3 mb-6 text-xs sm:text-sm">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 text-emerald-800 px-3 py-1 border border-emerald-100">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="font-medium">Today&apos;s offline revenue:</span>
            <span className="font-semibold">₹{revenue.today.toLocaleString()}</span>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 text-slate-700 px-3 py-1 border border-slate-200">
            <span className="h-2 w-2 rounded-full bg-slate-400" />
            <span className="font-medium">Total offline revenue:</span>
            <span className="font-semibold">₹{revenue.total.toLocaleString()}</span>
          </div>
        </div>

        {/* Main content: Upcoming Trips + Recent Bookings */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle>Upcoming Trips</CardTitle>
                <CardDescription>Trips scheduled for today and upcoming days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {upcomingTrips.map(trip => (
                    <div key={trip.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{trip.routeName}</h3>
                          <div className="flex items-center text-sm text-gray-500 mt-1">
                            <Bus className="h-4 w-4 mr-1" />
                            <span>{trip.busNumber}</span>
                            <span className="mx-2">•</span>
                            <Users className="h-4 w-4 mr-1" />
                            <span>{trip.availableSeats} seats available</span>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate(`/agent/trips/${trip.id}/book`)}
                        >
                          Book Now
                        </Button>
                      </div>
                      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                          <div>
                            <div className="text-gray-500">Date</div>
                            <div>{format(new Date(trip.departureTime), 'MMM d, yyyy')}</div>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-2 text-gray-400" />
                          <div>
                            <div className="text-gray-500">Time</div>
                            <div>{format(new Date(trip.departureTime), 'h:mm a')}</div>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                          <div>
                            <div className="text-gray-500">From</div>
                            <div>{trip.source}</div>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                          <div>
                            <div className="text-gray-500">To</div>
                            <div>{trip.destination}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {upcomingTrips.length === 0 && (
                    <div className="text-center py-10 text-slate-500">
                      <p className="font-medium">No upcoming trips found.</p>
                      <p className="text-xs mt-1">Publish schedules from the admin panel or try a different date.</p>
                      <Button 
                        variant="link" 
                        className="mt-2"
                        onClick={() => navigate('/agent/schedules')}
                      >
                        View All Schedules
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Recent Bookings</CardTitle>
                    <CardDescription>Recently created and updated offline bookings</CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate('/agent/bookings')}
                  >
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Booking</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {recentBookings.map(booking => (
                        <tr key={booking.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 whitespace-nowrap">
                            <button 
                              onClick={() => navigate(`/agent/bookings/${booking.id}`)}
                              className="text-blue-600 hover:text-blue-900 font-medium"
                            >
                              #{booking.id}
                            </button>
                            <div className="text-xs text-gray-400">{booking.route}</div>
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            <div className="text-gray-800">{booking.customerName}</div>
                            <div className="text-xs text-gray-400">{booking.phone}</div>
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-gray-800">
                            ₹{booking.amount.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                      {recentBookings.length === 0 && (
                        <tr>
                          <td colSpan="3" className="px-4 py-8 text-center text-slate-500 text-sm">
                            No recent offline bookings yet. Use the <span className="font-semibold">New Booking</span> button above to create one.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Customers section */}
        <div className="mt-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Recent Customers</CardTitle>
                  <CardDescription>Recently added and active customers</CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate('/agent/customers')}
                >
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map(customer => (
                  <div key={customer} className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
                    <div className="flex items-start space-x-4">
                      <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                        <User className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium">Customer {customer}</h3>
                        <p className="text-sm text-gray-500">2 bookings</p>
                        <div className="mt-2 flex items-center text-sm text-gray-500">
                          <Phone className="h-4 w-4 mr-2" />
                          <span>+91 98765 4321{customer}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <Mail className="h-4 w-4 mr-2" />
                          <span>customer{customer}@example.com</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate(`/agent/customers/${customer}`)}
                      >
                        View
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => navigate(`/agent/bookings/new?customerId=${customer}`)}
                      >
                        New Booking
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-center">
                <Button 
                  variant="ghost" 
                  onClick={() => navigate('/agent/customers/new')}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <Plus className="h-4 w-4 mr-1" /> Add New Customer
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
  </div>
);
}