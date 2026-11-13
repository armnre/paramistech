import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminSession, useAdmin, type Area } from './session';
import Login from './Login';
import AdminLayout from './AdminLayout';
import Dashboard from './Dashboard';
import Invoices from './Invoices';
import Payments from './Payments';
import { Activity, Admins, Banks, Customers, Requests, Services } from './pages';
import { Company, Content, SiteSettings } from './content';

function Guard({ area, children }: { area: Area; children: JSX.Element }) {
  const { can } = useAdmin();
  return can(area) ? children : <Navigate to="/admin" replace />;
}

export default function AdminApp() {
  return (
    <AdminSession fallback={(onAuth) => <Login onAuth={onAuth} />}>
      <Routes>
        <Route element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="invoices" element={<Guard area="finance"><Invoices /></Guard>} />
          <Route path="payments" element={<Guard area="finance"><Payments /></Guard>} />
          <Route path="banks" element={<Guard area="finance"><Banks /></Guard>} />
          <Route path="customers" element={<Guard area="finance"><Customers /></Guard>} />
          <Route path="services" element={<Guard area="finance"><Services /></Guard>} />
          <Route path="requests" element={<Guard area="requests"><Requests /></Guard>} />
          <Route path="content" element={<Guard area="content"><Content /></Guard>} />
          <Route path="site" element={<Guard area="content"><SiteSettings /></Guard>} />
          <Route path="admins" element={<Guard area="system"><Admins /></Guard>} />
          <Route path="company" element={<Guard area="system"><Company /></Guard>} />
          <Route path="activity" element={<Guard area="system"><Activity /></Guard>} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
      </Routes>
    </AdminSession>
  );
}
