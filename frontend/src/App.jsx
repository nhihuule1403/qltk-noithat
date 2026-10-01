import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Flex, Result, Spin } from 'antd';
import { useAuth } from './auth';
import { ROLE } from './constants';
import AppLayout from './components/AppLayout';
import Login from './pages/Login';
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Products = lazy(() => import('./pages/Products'));
const Catalog = lazy(() => import('./pages/Catalog'));
const Suppliers = lazy(() => import('./pages/Suppliers'));
const Customers = lazy(() => import('./pages/Customers'));
const PurchaseOrderList = lazy(() => import('./pages/DocumentLists').then((m) => ({ default: m.PurchaseOrderList })));
const SalesInvoiceList = lazy(() => import('./pages/DocumentLists').then((m) => ({ default: m.SalesInvoiceList })));
const InventoryCheckList = lazy(() => import('./pages/DocumentLists').then((m) => ({ default: m.InventoryCheckList })));
const PurchaseOrderDetail = lazy(() => import('./pages/PurchaseOrderDetail'));
const SalesInvoiceDetail = lazy(() => import('./pages/SalesInvoiceDetail'));
const InventoryCheckDetail = lazy(() => import('./pages/InventoryCheckDetail'));
const StockMovements = lazy(() => import('./pages/StockMovements'));
const Reports = lazy(() => import('./pages/Reports'));
const Users = lazy(() => import('./pages/Users'));

const { ADMIN, KHO, BANHANG } = ROLE;

function Guard({ roles, children }) {
  const { hasRole } = useAuth();
  if (roles && !hasRole(...roles)) {
    return <Result status="403" title="Không có quyền" subTitle="Vai trò của bạn không được dùng chức năng này." />;
  }
  return children;
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <Flex justify="center" align="center" style={{ height: '100vh' }}><Spin size="large" /></Flex>;
  }
  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  return (
    <AppLayout>
      <Suspense fallback={<Flex justify="center" style={{ padding: 48 }}><Spin /></Flex>}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/products" element={<Products />} />
        <Route path="/catalog" element={<Guard roles={[ADMIN]}><Catalog /></Guard>} />
        <Route path="/suppliers" element={<Guard roles={[ADMIN, KHO]}><Suppliers /></Guard>} />
        <Route path="/customers" element={<Guard roles={[ADMIN, BANHANG]}><Customers /></Guard>} />
        <Route path="/purchase-orders" element={<Guard roles={[ADMIN, KHO]}><PurchaseOrderList /></Guard>} />
        <Route path="/purchase-orders/:id" element={<Guard roles={[ADMIN, KHO]}><PurchaseOrderDetail /></Guard>} />
        <Route path="/sales-invoices" element={<Guard roles={[ADMIN, BANHANG]}><SalesInvoiceList /></Guard>} />
        <Route path="/sales-invoices/:id" element={<Guard roles={[ADMIN, BANHANG]}><SalesInvoiceDetail /></Guard>} />
        <Route path="/inventory-checks" element={<Guard roles={[ADMIN, KHO]}><InventoryCheckList /></Guard>} />
        <Route path="/inventory-checks/:id" element={<Guard roles={[ADMIN, KHO]}><InventoryCheckDetail /></Guard>} />
        <Route path="/stock-movements" element={<Guard roles={[ADMIN, KHO]}><StockMovements /></Guard>} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/users" element={<Guard roles={[ADMIN]}><Users /></Guard>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </AppLayout>
  );
}
