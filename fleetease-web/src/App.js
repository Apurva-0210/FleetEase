import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import RoleRedirect from './components/RoleRedirect';

// Public Pages
import Home from './pages/Home';
import BookingSearch from './pages/BookingSearch';
import BookingSeat from './pages/BookingSeat';
import BookingCheckout from './pages/BookingCheckout';
import BookingDetails from './pages/BookingDetails';
import Login from './pages/Login';
import Register from './pages/Register';
import Contact from './pages/Contact';
import Testimonials from './pages/Testimonials';
import Gallery from './pages/Gallery';

// Admin Pages
import AdminDashboard from './pages/Admin/Dashboard';
import AdminBookingsList from './pages/Admin/BookingsList';
import AdminBills from './pages/Admin/Bills';
import AdminSchedules from './pages/Admin/Schedules';
import AdminVehicles from './pages/Admin/Vehicles';
import AdminUsers from './pages/Admin/Users';
import AdminTolls from './pages/Admin/Tolls';
import AdminRefunds from './pages/Admin/Refunds';
import AdminCorporate from './pages/Admin/CorporateApprovals';
import AdminContacts from './pages/Admin/Contacts';
import AdminGallery from './pages/Admin/Gallery';

// Agent Pages
import AgentTrips from './pages/Agent/Trips';
import AgentDashboard from './pages/Agent/Dashboard';

// Driver Pages
import DriverDashboard from './pages/Driver/Dashboard';
import DriverRoutes from './pages/Driver/Routes';
import DriverSeats from './pages/Driver/Seats';
import DriverTrips from './pages/Driver/Trips';
import DriverLiveTracker from './pages/Driver/Tracker';

// Manager Pages
import ManagerFleet from './pages/Manager/Fleet';

// Company Admin Pages
import CompanyCharter from './pages/Company/Charter';
import CompanyRequests from './pages/Company/CharterRequests';

// Customer Pages
import Bookings from './pages/customer/Bookings';
import TrackBus from './pages/TrackBus';
import Profile from './pages/Profile';

export default function App() {
  const location = useLocation();
  const token = localStorage.getItem('token');
  const user = token ? JSON.parse(atob(token.split('.')[1])) : null;

  // Redirect logged-in users from home to their dashboard
  const HomeRedirect = () => {
    if (!token) return <Home />;
    
    switch(user?.role) {
      case 'admin': return <Navigate to="/admin/dashboard" replace />;
      case 'agent': return <Navigate to="/agent/trips" replace />;
      case 'driver': return <Navigate to="/driver/dashboard" replace />;
      case 'manager': return <Navigate to="/manager/fleet" replace />;
      case 'company_admin': return <Navigate to="/company/charter" replace />;
      case 'customer': return <Navigate to="/my-bookings" replace />;
      default: return <Home />;
    }
  };

  return (
    <div className="d-flex flex-column min-vh-100">
      {/* Show navbar on all routes, including admin */}
      <Navbar />
      <div className="flex-grow-1">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/search" element={<BookingSearch />} />
          <Route path="/seats" element={<BookingSeat />} />
          <Route path="/checkout" element={<BookingCheckout />} />
          <Route path="/booking/:id" element={<BookingDetails />} />
          <Route path="/login" element={!token ? <Login /> : <Navigate to="/" replace />} />
          <Route path="/register" element={!token ? <Register /> : <Navigate to="/" replace />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/testimonials" element={<Testimonials />} />
          <Route path="/gallery" element={<Gallery />} />

          {/* Admin Routes */}
          <Route path="/admin/dashboard" element={
            <ProtectedRoute role="admin">
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin/bookings" element={
            <ProtectedRoute role="admin">
              <AdminBookingsList />
            </ProtectedRoute>
          } />
          <Route path="/admin/bills" element={
            <ProtectedRoute role="admin">
              <AdminBills />
            </ProtectedRoute>
          } />
          <Route path="/admin/schedules" element={
            <ProtectedRoute role="admin">
              <AdminSchedules />
            </ProtectedRoute>
          } />
          <Route path="/admin/vehicles" element={
            <ProtectedRoute role="admin">
              <AdminVehicles />
            </ProtectedRoute>
          } />
          <Route path="/admin/users" element={
            <ProtectedRoute role="admin">
              <AdminUsers />
            </ProtectedRoute>
          } />
          <Route path="/admin/tolls" element={
            <ProtectedRoute role="admin">
              <AdminTolls />
            </ProtectedRoute>
          } />
          <Route path="/admin/refunds" element={
            <ProtectedRoute role="admin">
              <AdminRefunds />
            </ProtectedRoute>
          } />
          <Route path="/admin/corporate" element={
            <ProtectedRoute role="admin">
              <AdminCorporate />
            </ProtectedRoute>
          } />
          <Route path="/admin/contacts" element={
            <ProtectedRoute role="admin">
              <AdminContacts />
            </ProtectedRoute>
          } />
          <Route path="/admin/gallery" element={
            <ProtectedRoute role="admin">
              <AdminGallery />
            </ProtectedRoute>
          } />

          {/* Agent Routes */}
          <Route path="/agent/trips" element={
            <ProtectedRoute role="agent">
              <AgentTrips />
            </ProtectedRoute>
          } />
          <Route path="/agent/dashboard" element={
            <ProtectedRoute role="agent">
              <AgentDashboard />
            </ProtectedRoute>
          } />

          {/* Driver Routes */}
          <Route path="/driver/dashboard" element={
            <ProtectedRoute role="driver">
              <DriverDashboard />
            </ProtectedRoute>
          } />
          <Route path="/driver/routes" element={
            <ProtectedRoute role="driver">
              <DriverRoutes />
            </ProtectedRoute>
          } />
          <Route path="/driver/seats" element={
            <ProtectedRoute role="driver">
              <DriverSeats />
            </ProtectedRoute>
          } />
          <Route path="/driver/trips" element={
            <ProtectedRoute role="driver">
              <DriverTrips />
            </ProtectedRoute>
          } />
          <Route path="/driver/tracker" element={
            <ProtectedRoute role="driver">
              <DriverLiveTracker />
            </ProtectedRoute>
          } />

          {/* Manager Routes */}
          <Route path="/manager/fleet" element={
            <ProtectedRoute role="manager">
              <ManagerFleet />
            </ProtectedRoute>
          } />

          {/* Company Admin Routes */}
          <Route path="/company/charter" element={
            <ProtectedRoute role="company_admin">
              <CompanyCharter />
            </ProtectedRoute>
          } />
          <Route path="/company/requests" element={
            <ProtectedRoute role="company_admin">
              <CompanyRequests />
            </ProtectedRoute>
          } />

          {/* Customer Routes */}
          <Route path="/my-bookings" element={
            <ProtectedRoute>
              <Bookings />
            </ProtectedRoute>
          } />
          <Route path="/track-bus" element={<TrackBus />} />
          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />

          {/* 404 - Not Found */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <Footer />
    </div>
  );
}
