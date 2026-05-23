import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Calendar, Clock, MapPin, Clock as ClockIcon, ArrowRight, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import api from '../../utils/api';
import { toast } from 'react-hot-toast';

const DriverTrips = () => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetchTrips();
  }, [location]);

  const fetchTrips = async () => {
    try {
      setLoading(true);
      const response = await api.get('/driver/trips');
      setTrips(response.data);
    } catch (error) {
      toast('Failed to load trips','error');
    } finally {
      setLoading(false);
    }
  };

  const handleStartTrip = async (tripId) => {
    try {
      await api.post(`/trips/${tripId}/start`);
      toast('Trip started successfully','success');
      navigate(`/driver/tracker?trip=${tripId}`);
    } catch (error) {
      toast(error.response?.data?.message || 'Failed to start trip','error');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (trip) => {
    const now = new Date();
    const departure = new Date(trip.departureTime);
    const arrival = new Date(trip.arrivalTime);

    if (trip.status === 'completed') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="mr-1 h-3 w-3" />
          Completed
        </span>
      );
    } else if (trip.status === 'in_progress') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <AlertCircle className="mr-1 h-3 w-3" />
          In Progress
        </span>
      );
    } else if (trip.status === 'cancelled') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <XCircle className="mr-1 h-3 w-3" />
          Cancelled
        </span>
      );
    } else if (now > departure && now < arrival) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <AlertCircle className="mr-1 h-3 w-3" />
          Ongoing
        </span>
      );
    } else if (now > arrival) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          <CheckCircle className="mr-1 h-3 w-3" />
          Completed
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <ClockIcon className="mr-1 h-3 w-3" />
          Upcoming
        </span>
      );
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Trips</h1>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg
      ">
        <ul className="divide-y divide-gray-200">
          {trips.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No trips found</p>
            </div>
          ) : (
            trips.map((trip) => (
              <li key={trip.id} className="hover:bg-gray-50">
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-blue-100">
                        <Bus className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {trip.route?.source} <ArrowRight className="inline h-4 w-4 mx-1" /> {trip.route?.destination}
                        </div>
                        <div className="text-sm text-gray-500">
                          {trip.vehicle?.vehicleNumber} • {trip.vehicle?.model}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {formatDate(trip.departureTime)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatTime(trip.departureTime)} - {formatTime(trip.arrivalTime)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {trip.availableSeats} / {trip.vehicle?.capacity} seats
                        </div>
                        <div className="mt-1">
                          {getStatusBadge(trip)}
                        </div>
                      </div>
                      {trip.status === 'scheduled' && new Date(trip.departureTime) > new Date() && (
                        <button
                          onClick={() => handleStartTrip(trip.id)}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          Start Trip
                        </button>
                      )}
                      {trip.status === 'in_progress' && (
                        <button
                          onClick={() => navigate(`/driver/tracker?trip=${trip.id}`)}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        >
                          Track Trip
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
};

export default DriverTrips;
