import { useState } from 'react';
import { App, Button, Card, Flex, Form, Input, Modal, Select, Switch, Table, Tag } from 'antd';
import { EditOutlined, KeyOutlined, PlusOutlined } from '@ant-design/icons';
import { api, errorMessage } from '../api';
import { useAuth } from '../auth';
import { PageHeader, useFetch } from '../components/common';

export default function Users() {
  const { message } = App.useApp();
  const { user: me } = useAuth();
  const { data, loading, reload } = useFetch('/users');
  const { data: roles } = useFetch('/users/roles');
  const [editing, setEditing] = useState(null);
  const [resetting, setResetting] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const [pwForm] = Form.useForm();

  const open = (row) => {
    setEditing(row);
    form.setFieldsValue(row.MaNguoiDung ? { ...row, TrangThai: row.TrangThai === 1 } : { TrangThai: true });
  };

  const save = async (values) => {
    setSaving(true);
    try {
      const body = { ...values, TrangThai: values.TrangThai ? 1 : 0 };
      if (editing.MaNguoiDung) await api.put(`/users/${editing.MaNguoiDung}`, body);
      else await api.post('/users', body);
      message.success('Đã lưu tài khoản');
      setEditing(null);
      reload();
    } catch (err) {
      message.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const resetPassword = async ({ MatKhau }) => {
    try {
      await api.post(`/users/${resetting.MaNguoiDung}/reset-password`, { MatKhau });
      message.success('Đã đặt lại mật khẩu');
      setResetting(null);
    } catch (err) {
      message.error(errorMessage(err));
    }
  };

  return (
    <>
      <PageHeader title="Tài khoản người dùng" subtitle="Phân quyền theo vai trò: Quản trị viên, Nhân viên kho, Nhân viên bán hàng"
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => open({})}>Thêm tài khoản</Button>} />
      <Card styles={{ body: { padding: 0 } }}>
        <Table rowKey="MaNguoiDung" loading={loading} dataSource={data ?? []} pagination={false} scroll={{ x: 'max-content' }}
          columns={[
            { title: 'Tên đăng nhập', dataIndex: 'TenDangNhap' },
            { title: 'Họ tên', dataIndex: 'HoTen' },
            { title: 'Email', dataIndex: 'Email' },
            { title: 'Vai trò', dataIndex: 'TenVaiTro', render: (v, r) => <Tag color={{ ADMIN: 'red', KHO: 'blue', BANHANG: 'green' }[r.KyHieu]}>{v}</Tag> },
            { title: 'Trạng thái', dataIndex: 'TrangThai', render: (v) => (v ? <Tag color="green">Hoạt động</Tag> : <Tag>Đã khóa</Tag>) },
            {
              title: '', key: 'a', align: 'right',
              render: (_, r) => (
                <Flex gap={4} justify="flex-end">
                  <Button size="small" type="text" icon={<KeyOutlined />} title="Đặt lại mật khẩu" onClick={() => { pwForm.resetFields(); setResetting(r); }} />
                  <Button size="small" type="text" icon={<EditOutlined />} onClick={() => open(r)} />
                </Flex>
              ),
            },
          ]} />
      </Card>

      <Modal title={editing?.MaNguoiDung ? 'Sửa tài khoản' : 'Thêm tài khoản'} open={!!editing} onCancel={() => setEditing(null)}
        onOk={() => form.submit()} confirmLoading={saving} okText="Lưu" destroyOnHidden>
        <Form form={form} layout="vertical" onFinish={save}>
          <Form.Item name="TenDangNhap" label="Tên đăng nhập" rules={[{ required: true }]}>
            <Input maxLength={50} disabled={!!editing?.MaNguoiDung} />
          </Form.Item>
          {!editing?.MaNguoiDung && (
            <Form.Item name="MatKhau" label="Mật khẩu" rules={[{ required: true, min: 6, message: 'Tối thiểu 6 ký tự' }]}><Input.Password /></Form.Item>
          )}
          <Form.Item name="HoTen" label="Họ tên" rules={[{ required: true }]}><Input maxLength={100} /></Form.Item>
          <Form.Item name="Email" label="Email" rules={[{ type: 'email', message: 'Email không hợp lệ' }]}><Input maxLength={100} /></Form.Item>
          <Form.Item name="MaVaiTro" label="Vai trò" rules={[{ required: true }]}>
            <Select disabled={editing?.MaNguoiDung === me.MaNguoiDung} options={(roles ?? []).map((r) => ({ value: r.MaVaiTro, label: r.TenVaiTro }))} />
          </Form.Item>
          {editing?.MaNguoiDung && (
            <Form.Item name="TrangThai" label="Đang hoạt động" valuePropName="checked">
              <Switch disabled={editing.MaNguoiDung === me.MaNguoiDung} />
            </Form.Item>
          )}
        </Form>
      </Modal>

      <Modal title={`Đặt lại mật khẩu: ${resetting?.TenDangNhap ?? ''}`} open={!!resetting} onCancel={() => setResetting(null)}
        onOk={() => pwForm.submit()} okText="Đặt lại" destroyOnHidden>
        <Form form={pwForm} layout="vertical" onFinish={resetPassword}>
          <Form.Item name="MatKhau" label="Mật khẩu mới" rules={[{ required: true, min: 6, message: 'Tối thiểu 6 ký tự' }]}><Input.Password /></Form.Item>
        </Form>
      </Modal>
    </>
  );
}
