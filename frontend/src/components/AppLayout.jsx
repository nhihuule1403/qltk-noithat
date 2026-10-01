import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { App, Avatar, Button, Drawer, Dropdown, Flex, Form, Grid, Input, Layout, Menu, Modal, Typography } from 'antd';
import {
  AppstoreOutlined, BarChartOutlined, DashboardOutlined, FileDoneOutlined, HistoryOutlined, ImportOutlined,
  LogoutOutlined, MenuOutlined, KeyOutlined, ShopOutlined, ShoppingCartOutlined, TagsOutlined, TeamOutlined,
  UserOutlined, AuditOutlined,
} from '@ant-design/icons';
import { useAuth } from '../auth';
import { api, errorMessage } from '../api';
import { ROLE } from '../constants';

const { ADMIN, KHO, BANHANG } = ROLE;

const MENU = [
  { key: '/', icon: <DashboardOutlined />, label: 'Tổng quan' },
  { key: '/products', icon: <AppstoreOutlined />, label: 'Sản phẩm' },
  { key: '/catalog', icon: <TagsOutlined />, label: 'Danh mục & đơn vị', roles: [ADMIN] },
  { key: '/suppliers', icon: <ShopOutlined />, label: 'Nhà cung cấp', roles: [ADMIN, KHO] },
  { key: '/customers', icon: <TeamOutlined />, label: 'Khách hàng', roles: [ADMIN, BANHANG] },
  { key: '/purchase-orders', icon: <ImportOutlined />, label: 'Nhập hàng', roles: [ADMIN, KHO] },
  { key: '/sales-invoices', icon: <ShoppingCartOutlined />, label: 'Bán hàng', roles: [ADMIN, BANHANG] },
  { key: '/inventory-checks', icon: <AuditOutlined />, label: 'Kiểm kê', roles: [ADMIN, KHO] },
  { key: '/stock-movements', icon: <HistoryOutlined />, label: 'Lịch sử tồn kho', roles: [ADMIN, KHO] },
  { key: '/reports', icon: <BarChartOutlined />, label: 'Báo cáo' },
  { key: '/users', icon: <UserOutlined />, label: 'Tài khoản', roles: [ADMIN] },
];

function ChangePasswordModal({ open, onClose }) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const submit = async (values) => {
    setSaving(true);
    try {
      await api.post('/auth/change-password', values);
      message.success('Đã đổi mật khẩu');
      form.resetFields();
      onClose();
    } catch (err) {
      message.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal title="Đổi mật khẩu" open={open} onCancel={onClose} onOk={() => form.submit()} confirmLoading={saving} okText="Lưu">
      <Form form={form} layout="vertical" onFinish={submit}>
        <Form.Item name="MatKhauCu" label="Mật khẩu hiện tại" rules={[{ required: true }]}><Input.Password /></Form.Item>
        <Form.Item name="MatKhauMoi" label="Mật khẩu mới" rules={[{ required: true, min: 6 }]}><Input.Password /></Form.Item>
      </Form>
    </Modal>
  );
}

export default function AppLayout({ children }) {
  const { user, logout, hasRole } = useAuth();
  const location = useLocation();
  const screens = Grid.useBreakpoint();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);

  const items = MENU.filter((m) => !m.roles || hasRole(...m.roles)).map((m) => ({
    key: m.key, icon: m.icon, label: <Link to={m.key} onClick={() => setDrawerOpen(false)}>{m.label}</Link>,
  }));
  const selected = MENU.map((m) => m.key).filter((k) => k !== '/' && location.pathname.startsWith(k));
  const menu = (
    <Menu mode="inline" selectedKeys={selected.length ? selected : ['/']} items={items} style={{ borderInlineEnd: 0 }} />
  );
  const brand = (
    <Flex align="center" gap={8} style={{ padding: '18px 20px' }}>
      <FileDoneOutlined style={{ fontSize: 22, color: '#8b5e34' }} />
      <Typography.Text strong style={{ fontSize: 16 }}>Nội Thất Kho</Typography.Text>
    </Flex>
  );
  const isMobile = !screens.lg;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {!isMobile && (
        <Layout.Sider width={230} theme="light" style={{ borderRight: '1px solid #eee', position: 'sticky', top: 0, height: '100vh', overflow: 'auto' }}>
          {brand}
          {menu}
        </Layout.Sider>
      )}
      <Drawer open={isMobile && drawerOpen} onClose={() => setDrawerOpen(false)} placement="left" size={240} styles={{ body: { padding: 0 } }} title={null} closable={false}>
        {brand}
        {menu}
      </Drawer>
      <Layout>
        <Layout.Header style={{ background: '#fff', padding: '0 16px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {isMobile ? <Button type="text" icon={<MenuOutlined />} onClick={() => setDrawerOpen(true)} /> : <span />}
          <Dropdown
            menu={{
              items: [
                { key: 'pw', icon: <KeyOutlined />, label: 'Đổi mật khẩu', onClick: () => setPwOpen(true) },
                { key: 'logout', icon: <LogoutOutlined />, label: 'Đăng xuất', onClick: logout },
              ],
            }}
          >
            <Flex align="center" gap={8} style={{ cursor: 'pointer' }}>
              <Avatar style={{ background: '#8b5e34' }} icon={<UserOutlined />} />
              <Flex vertical style={{ lineHeight: 1.2 }}>
                <Typography.Text strong>{user.HoTen}</Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>{user.TenVaiTro}</Typography.Text>
              </Flex>
            </Flex>
          </Dropdown>
        </Layout.Header>
        <Layout.Content style={{ padding: isMobile ? 16 : 24 }}>{children}</Layout.Content>
      </Layout>
      <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
    </Layout>
  );
}
