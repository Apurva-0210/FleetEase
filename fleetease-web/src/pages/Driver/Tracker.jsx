import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader2, MapPin, Clock, Users, ArrowLeft, AlertTriangle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import io from 'socket.io-client';
import api from '../../utils/api';
import { SOCKET_URL } from '../../config/env';
import { toast } from 'react-hot-toast';

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

const LiveTracker = () => {
  const [position, setPosition] = useState([20.5937, 78.9629]); // Default to India center
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const [route, setRoute] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [searchParams] = useSearchParams();
  const tripId = searchParams.get('trip');
  const navigate = useNavigate();
  const mapRef = useRef();

  useEffect(() => {
    if (!tripId) {
      toast.error('No trip specified');
      navigate('/driver');
      return;
    }

    const fetchTripDetails = async () => {
      try {
        const response = await api.get(`/trips/${tripId}`);
        setTrip(response.data);
        
        // Set initial route if available
        if (response.data.route?.coordinates?.length > 0) {
          setRoute(response.data.route.coordinates);
          // Set initial map view to the first coordinate
          setPosition([
            response.data.route.coordinates[0][0],
            response.data.route.coordinates[0][1]
          ]);
        }
      } catch (error) {
        console.error('Error fetching trip details:', error);
        toast.error('Failed to load trip details');
      } finally {
        setLoading(false);
      }
    };

    fetchTripDetails();

    // Initialize WebSocket connection
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    // Set up event listeners
    newSocket.on('connect', () => {
      console.log('Connected to WebSocket server');
      newSocket.emit('joinTrip', { tripId });
    });

    newSocket.on('locationUpdate', (data) => {
      if (data.tripId === tripId) {
        setPosition([data.lat, data.lng]);
        // Add new position to route
        setRoute(prev => [...prev, [data.lat, data.lng]]);
      }
    });

    newSocket.on('alert', (alertData) => {
      if (alertData.tripId === tripId) {
        setAlerts(prev => [{
          id: Date.now(),
          message: alertData.message,
          type: alertData.type || 'info',
          timestamp: new Date().toISOString()
        }, ...prev]);
        
        // Show toast notification
        toast(alertData.message, {
          icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
          style: {
            background: '#FEF3C7',
            color: '#92400E',
          },
        });
      }
    });

    // Clean up on unmount
    return () => {
      if (newSocket) {
        newSocket.emit('leaveTrip', { tripId });
        newSocket.disconnect();
      }
    };
  }, [tripId, navigate]);

  // Update map view when position changes
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView(position, 13);
    }
  }, [position]);

  const handleEmergency = async () => {
    if (window.confirm('Are you sure you want to send an emergency alert?')) {
      try {
        await api.post(`/trips/${tripId}/emergency`, {
          type: 'emergency',
          message: 'Driver has reported an emergency!',
          location: position
        });
        toast.success('Emergency alert sent!');
      } catch (error) {
        console.error('Error sending emergency alert:', error);
        toast.error('Failed to send emergency alert');
      }
    }
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading trip details...</p>
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800">Trip Not Found</h2>
          <p className="text-gray-600 mt-2">The requested trip could not be found or you don't have permission to view it.</p>
          <button
            onClick={() => navigate('/driver')}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Live Trip Tracker</h1>
              <div className="flex items-center mt-1 text-sm text-gray-600">
                <MapPin className="h-4 w-4 mr-1" />
                <span>{trip.route?.source} → {trip.route?.destination}</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-sm text-gray-500">Departure</div>
                  <div className="font-medium">{formatTime(trip.departureTime)}</div>
                </div>
                <div className="h-10 w-px bg-gray-200"></div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">Arrival</div>
                  <div className="font-medium">{formatTime(trip.arrivalTime)}</div>
                </div>
                <div className="h-10 w-px bg-gray-200"></div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">Passengers</div>
                  <div className="font-medium flex items-center">
                    <Users className="h-4 w-4 mr-1" />
                    {trip.passengerCount || 0} / {trip.vehicle?.capacity || 0}
                  </div>
                </div>
              </div>
              <button
                onClick={handleEmergency}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Emergency
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative">
        <MapContainer
          center={position}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          whenCreated={map => {
            mapRef.current = map;
          }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <Marker position={position}>
            <Popup>
              <div className="font-medium">Your Location</div>
              <div className="text-sm text-gray-600">
                {new Date().toLocaleTimeString()}
              </div>
            </Popup>
          </Marker>
          {route.length > 1 && (
            <Polyline
              positions={route}
              color="#3B82F6"
              weight={4}
              opacity={0.7}
            />
          )}
        </MapContainer>

        {/* Alerts Panel */}
        {alerts.length > 0 && (
          <div className="absolute top-4 right-4 w-80 bg-white rounded-lg shadow-lg overflow-hidden z-10">
            <div className="bg-blue-600 px-4 py-2">
              <h3 className="text-sm font-medium text-white">Alerts & Notifications</h3>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {alerts.map(alert => (
                <div key={alert.id} className="border-b border-gray-200 last:border-0">
                  <div className="p-3">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 pt-0.5">
                        <AlertTriangle className={`h-5 w-5 ${
                          alert.type === 'emergency' ? 'text-red-500' : 'text-yellow-500'
                        }`} />
                      </div>
                      <div className="ml-3 flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {alert.message}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {new Date(alert.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveTracker;
