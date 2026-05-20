import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader2, Search, MapPin, Clock, Bus as BusIcon, ArrowLeft } from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import io from 'socket.io-client';
import { SOCKET_URL } from '../config/env';
import api from '../utils/api';
import { toast } from 'react-hot-toast';

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Custom bus icon
const busIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/2909/2909448.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const TrackBus = () => {
  const [position, setPosition] = useState([20.5937, 78.9629]); // Default to India center
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const [route, setRoute] = useState([]);
  const [stops, setStops] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef(null);
  const { tripId } = useParams();
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('booking');
  const navigate = useNavigate();
  const mapRef = useRef();

  useEffect(() => {
    // Close search results when clicking outside
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!tripId && !bookingId) {
      toast.error('No trip specified');
      navigate('/');
      return;
    }

    const fetchTripDetails = async () => {
      try {
        let response;
        if (bookingId) {
          // If booking ID is provided, get trip details from booking
          const bookingResponse = await api.get(`/bookings/${bookingId}`);
          response = await api.get(`/trips/${bookingResponse.data.tripId}`);
        } else {
          // Otherwise use the trip ID directly
          response = await api.get(`/trips/${tripId}`);
        }
        
        setTrip(response.data);
        
        // Set route if available
        if (response.data.route?.coordinates?.length > 0) {
          setRoute(response.data.route.coordinates);
          // Set initial map view to the first coordinate
          const initialPosition = [
            response.data.route.coordinates[0][0],
            response.data.route.coordinates[0][1]
          ];
          setPosition(initialPosition);
          
          // If there are stops, set them
          if (response.data.route.stops) {
            setStops(response.data.route.stops);
          }
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
      newSocket.emit('subscribeToTrip', { tripId: tripId });
    });

    newSocket.on('locationUpdate', (data) => {
      if (data.tripId === tripId) {
        setPosition([data.lat, data.lng]);
      }
    });

    // Clean up on unmount
    return () => {
      if (newSocket) {
        newSocket.emit('unsubscribeFromTrip', { tripId: tripId });
        newSocket.disconnect();
      }
    };
  }, [tripId, bookingId, navigate]);

  // Update map view when position changes
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView(position, 13);
    }
  }, [position]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await api.get(`/trips/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchResults(response.data);
      setShowSearchResults(true);
    } catch (error) {
      console.error('Error searching trips:', error);
      toast.error('Failed to search trips');
    }
  };

  const selectTrip = (selectedTrip) => {
    setTrip(selectedTrip);
    setSearchQuery(`${selectedTrip.route.source} to ${selectedTrip.route.destination}`);
    setShowSearchResults(false);
    
    if (selectedTrip.route?.coordinates?.length > 0) {
      const newPosition = [
        selectedTrip.route.coordinates[0][0],
        selectedTrip.route.coordinates[0][1]
      ];
      setPosition(newPosition);
      setRoute(selectedTrip.route.coordinates);
      setStops(selectedTrip.route.stops || []);
    }
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateProgress = () => {
    if (!trip || !trip.departureTime || !trip.arrivalTime) return 0;
    
    const now = new Date();
    const start = new Date(trip.departureTime);
    const end = new Date(trip.arrivalTime);
    
    if (now <= start) return 0;
    if (now >= end) return 100;
    
    const totalDuration = end - start;
    const elapsed = now - start;
    return Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
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
          <MapPin className="h-12 w-12 text-blue-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800">Trip Not Found</h2>
          <p className="text-gray-600 mt-2">The requested trip could not be found or you don't have permission to view it.</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Search Bar */}
      <div className="bg-white shadow-sm z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="relative" ref={searchRef}>
            <form onSubmit={handleSearch}>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Search for a route (e.g., Mumbai to Pune)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Search
                </button>
              </div>
            </form>

            {/* Search Results Dropdown */}
            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                {searchResults.map((result) => (
                  <div
                    key={result.id}
                    className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-gray-100"
                    onClick={() => selectTrip(result)}
                  >
                    <div className="flex items-center">
                      <BusIcon className="h-5 w-5 text-gray-400" />
                      <span className="font-normal ml-3 block truncate">
                        {result.route.source} to {result.route.destination}
                      </span>
                    </div>
                    <div className="ml-8 text-xs text-gray-500">
                      {new Date(result.departureTime).toLocaleDateString()} • {result.vehicle?.model}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Trip Info Bar */}
      <div className="bg-blue-50 border-b border-blue-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-medium text-gray-900">
                {trip.route?.source} <span className="text-blue-600">→</span> {trip.route?.destination}
              </h2>
              <div className="flex items-center mt-1 text-sm text-gray-600">
                <BusIcon className="h-4 w-4 mr-1" />
                <span>{trip.vehicle?.model} • {trip.vehicle?.vehicleNumber}</span>
              </div>
            </div>
            <div className="mt-2 md:mt-0 flex items-center space-x-6">
              <div className="text-center">
                <div className="text-sm text-gray-500">Departure</div>
                <div className="font-medium">{formatTime(trip.departureTime)}</div>
              </div>
              <div className="relative w-32">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${calculateProgress()}%` }}
                  ></div>
                </div>
                <div className="text-xs text-center mt-1 text-gray-500">
                  {Math.round(calculateProgress())}% completed
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-500">Arrival</div>
                <div className="font-medium">{formatTime(trip.arrivalTime)}</div>
              </div>
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
          
          {/* Bus Marker */}
          <Marker position={position} icon={busIcon}>
            <Popup>
              <div className="font-medium">
                {trip.vehicle?.model} ({trip.vehicle?.vehicleNumber})
              </div>
              <div className="text-sm text-gray-600">
                Last updated: {new Date().toLocaleTimeString()}
              </div>
            </Popup>
          </Marker>
          
          {/* Route Line */}
          {route.length > 1 && (
            <Polyline
              positions={route}
              color="#3B82F6"
              weight={4}
              opacity={0.7}
            />
          )}
          
          {/* Stops */}
          {stops.map((stop, index) => (
            <Marker 
              key={index} 
              position={[stop.lat, stop.lng]}
              icon={L.divIcon({
                className: 'custom-div-icon',
                html: `<div class="bg-white rounded-full p-1 border-2 border-blue-600">
                        <div class="bg-blue-600 w-3 h-3 rounded-full"></div>
                      </div>`,
                iconSize: [20, 20],
                iconAnchor: [10, 10],
                popupAnchor: [0, -10]
              })}
            >
              <Popup>
                <div className="font-medium">{stop.name}</div>
                {stop.arrivalTime && (
                  <div className="text-sm text-gray-600">
                    Arrival: {formatTime(stop.arrivalTime)}
                  </div>
                )}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
        
        {/* Overlay with ETA and Next Stop */}
        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-4 max-w-xs">
          <h3 className="font-medium text-gray-900 mb-2">Trip Status</h3>
          <div className="space-y-3">
            <div>
              <div className="text-sm text-gray-500">Next Stop</div>
              <div className="font-medium">
                {stops.length > 0 ? stops[0].name : 'No upcoming stops'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Estimated Arrival</div>
              <div className="font-medium">
                {new Date(Date.now() + 15 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            <div className="pt-2 border-t border-gray-200">
              <div className="text-sm text-gray-500">Current Speed</div>
              <div className="font-medium">45 km/h</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackBus;
