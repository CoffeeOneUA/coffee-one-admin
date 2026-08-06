import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './lib/auth';
import RequireAuth from './components/RequireAuth';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import AdminUsersPage from './pages/AdminUsersPage';
import DashboardPage from './pages/DashboardPage';
import ModerationPage from './pages/moderation/ModerationPage';
import ContentPage from './pages/ContentPage';
import CitiesPage from './pages/CitiesPage';
import LeadsPage from './pages/LeadsPage';
import WarrantiesPage from './pages/WarrantiesPage';
import NotificationsPage from './pages/NotificationsPage';
import FiltersPage from './pages/FiltersPage';
import OrdersPage from './pages/OrdersPage';
import CategoriesPage from './pages/CategoriesPage';
import BrandsPage from './pages/BrandsPage';
import ModelsPage from './pages/ModelsPage';
import PaymentSettingsPage from './pages/PaymentSettingsPage';
import MaintenancePage from './pages/MaintenancePage';
import ProductsPage from './pages/ProductsPage';
import BloggersPage from './pages/BloggersPage';
import SupportPage from './pages/SupportPage';
import ServiceCentersPage from './pages/ServiceCentersPage';
import DealsPage from './pages/DealsPage';
import UsersPage from './pages/UsersPage';
import SiteSettingsPage from './pages/SiteSettingsPage';
import ListingsPage from './pages/ListingsPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="moderation" element={<ModerationPage />} />
            <Route path="content" element={<ContentPage />} />
            <Route path="cities" element={<CitiesPage />} />
            <Route path="leads" element={<LeadsPage />} />
            <Route path="warranties" element={<WarrantiesPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="filters" element={<FiltersPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="brands" element={<BrandsPage />} />
            <Route path="models" element={<ModelsPage />} />
            <Route path="listings" element={<ListingsPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="bloggers" element={<BloggersPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="payment-settings" element={<PaymentSettingsPage />} />
            <Route path="maintenance" element={<MaintenancePage />} />
            <Route path="support" element={<SupportPage />} />
            <Route path="service-centers" element={<ServiceCentersPage />} />
            <Route path="deals" element={<DealsPage />} />
            <Route path="site-settings" element={<SiteSettingsPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route
              path="admin-users"
              element={
                <RequireAuth role="superadmin">
                  <AdminUsersPage />
                </RequireAuth>
              }
            />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}