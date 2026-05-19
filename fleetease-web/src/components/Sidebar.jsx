import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Bus, 
  Route as RouteIcon, 
  Calendar, 
  FileText,
  MapPin,
  Settings,
  Home,
  UserCircle,
  LogOut
} from 'lucide-react';

const Sidebar = () => {
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const isActive = (path) => {
    return location.pathname === path;
  };

  const adminNav = [
    { name: 'Dashboard', path: '/admin', icon: <LayoutDashboard className="h-5 w-5" /> },
    { name: 'Users', path: '/admin/users', icon: <Users className="h-5 w-5" /> },
    { name: 'Vehicles', path: '/admin/vehicles', icon: <Bus className="h-5 w-5" /> },
    { name: 'Routes', path: '/admin/routes', icon: <RouteIcon className="h-5 w-5" /> },
    { name: 'Schedules', path: '/admin/schedules', icon: <Calendar className="h-5 w-5" /> },
  ];

  const driverNav = [
    { name: 'Dashboard', path: '/driver', icon: <LayoutDashboard className="h-5 w-5" /> },
    { name: 'My Trips', path: '/driver/trips', icon: <RouteIcon className="h-5 w-5" /> },
    { name: 'Live Tracker', path: '/driver/tracker', icon: <MapPin className="h-5 w-5" /> },
  ];

  const agentNav = [
    { name: 'Dashboard', path: '/agent', icon: <LayoutDashboard className="h-5 w-5" /> },
    { name: 'Bookings', path: '/agent/bookings', icon: <FileText className="h-5 w-5" /> },
    { name: 'Schedules', path: '/agent/schedules', icon: <Calendar className="h-5 w-5" /> },
  ];

  const customerNav = [
    { name: 'Home', path: '/', icon: <Home className="h-5 w-5" /> },
    { name: 'Book a Trip', path: '/search', icon: <RouteIcon className="h-5 w-5" /> },
    { name: 'My Bookings', path: '/my-bookings', icon: <FileText className="h-5 w-5" /> },
  ];

  const getNavItems = () => {
    switch(user.role) {
      case 'admin':
        return adminNav;
      case 'driver':
        return driverNav;
      case 'agent':
        return agentNav;
      default:
        return customerNav;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  return (
    <div className="h-screen w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-800">FleetEase</h1>
      </div>
      
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="px-2 space-y-1">
          {getNavItems().map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                isActive(item.path)
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className={`mr-3 ${
                isActive(item.path) ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
              }`}>
                {item.icon}
              </span>
              {item.name}
            </Link>
          ))}
        </nav>
      </div>

      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <UserCircle className="h-10 w-10 text-gray-400" />
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-700">{user.name || 'User'}</p>
            <p className="text-xs text-gray-500 capitalize">{user.role || 'Customer'}</p>
          </div>
          <button
            onClick={handleLogout}
            className="ml-auto text-gray-400 hover:text-gray-500"
            title="Logout"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
