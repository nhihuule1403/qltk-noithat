import { useState } from 'react';
import { Link } from 'react-router-dom';
import { App, Button, Card, Checkbox, Flex, Form, Input, InputNumber, Modal, Select, Switch, Table, Tag } from 'antd';
import { EditOutlined, HistoryOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { api, errorMessage } from '../api';
import { useAuth } from '../auth';
import { PageHeader, useFetch } from '../components/common';
import { ROLE, money, num } from '../constants';

export default function Products() {
  const { message } = App.useApp();
  const { hasRole } = useAuth();
  const isAdmin = hasRole(ROLE.ADMIN);
  const [filters, setFilters] = useState({ TrangThai: 1 });
  const { data, loading, reload } = useFetch('/products', filters);
  const { data: categories } = useFetch('/categories');
  const { data: units } = useFetch('/units');
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const open = (row) => {
    setEditing(row);
    form.setFieldsValue(row.MaSanPham ? { ...row, TrangThai: row.TrangThai === 1 } : { MucTonToiThieu: 0, TrangThai: true });
  };

  const save = async (values) => {
    setSaving(true);
    try {
      const body = { ...values, TrangThai: values.TrangThai ? 1 : 0 };
      if (editing.MaSanPham) await api.put(`/products/${editing.MaSanPham}`, body);
      else await api.post('/products', body);
      message.success('Đã lưu sản phẩm');
      setEditing(null);
      reload();
    } catch (err) {
      message.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { title: 'SKU', dataIndex: 'MaSKU', fixed: 'left', width: 130 },
    { title: 'Tên sản phẩm', dataIndex: 'TenSanPham' },
    { title: 'Danh mục', dataIndex: 'TenDanhMuc' },
    { title: 'ĐVT', dataIndex: 'TenDonVi', width: 70 },
    { title: 'Giá bán', dataIndex: 'GiaBan', align: 'right', render: money, sorter: (a, b) => a.GiaBan - b.GiaBan },
    {
      title: 'Tồn', dataIndex: 'SoLuongTon', align: 'right', sorter: (a, b) => a.SoLuongTon - b.SoLuongTon,
      render: (v, r) => (
        <Flex gap={6} justify="flex-end" align="center">
          {v === 0 ? <Tag color="red">Hết</Tag> : r.TonThap ? <Tag color="orange">Thấp</Tag> : null}
          <b>{num(v)}</b>
        </Flex>
      ),
    },
    { title: 'Tối thiểu', dataIndex: 'MucTonToiThieu', align: 'right' },
    { title: 'Trạng thái', dataIndex: 'TrangThai', render: (v) => (v ? <Tag color="green">Đang bán</Tag> : <Tag>Ngừng</Tag>) },
    {
      title: '', key: 'a', width: 90, align: 'right',
      render: (_, r) => (
        <Flex gap={4} justify="flex-end">
          {hasRole(ROLE.ADMIN, ROLE.KHO) && (
            <Link to={`/stock-movements?MaSanPham=${r.MaSanPham}`}><Button size="small" type="text" icon={<HistoryOutlined />} title="Lịch sử tồn" /></Link>
          )}
          {isAdmin && <Button size="small" type="text" icon={<EditOutlined />} onClick={() => open(r)} />}
        </Flex>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Sản phẩm"
        subtitle="Tồn kho chỉ thay đổi qua phiếu nhập, hóa đơn và phiếu kiểm kê"
        extra={isAdmin && <Button type="primary" icon={<PlusOutlined />} onClick={() => open({})}>Thêm sản phẩm</Button>}
      />
      <Card styles={{ body: { padding: 0 } }}>
        <Flex gap={8} wrap style={{ padding: 12 }}>
          <Input allowClear prefix={<SearchOutlined />} placeholder="Tìm theo SKU hoặc tên" style={{ width: 240 }}
            onPressEnter={(e) => setFilters((f) => ({ ...f, q: e.target.value || undefined }))}
            onChange={(e) => !e.target.value && setFilters((f) => ({ ...f, q: undefined }))} />
          <Select allowClear placeholder="Danh mục" style={{ width: 170 }}
            options={(categories ?? []).map((c) => ({ value: c.MaDanhMuc, label: c.TenDanhMuc }))}
            onChange={(v) => setFilters((f) => ({ ...f, MaDanhMuc: v }))} />
          <Select value={filters.TrangThai ?? ''} style={{ width: 150 }}
            options={[{ value: 1, label: 'Đang kinh doanh' }, { value: 0, label: 'Ngừng kinh doanh' }, { value: '', label: 'Tất cả' }]}
            onChange={(v) => setFilters((f) => ({ ...f, TrangThai: v === '' ? undefined : v }))} />
          <Checkbox onChange={(e) => setFilters((f) => ({ ...f, tonThap: e.target.checked || undefined }))}>Chỉ hàng tồn thấp</Checkbox>
        </Flex>
        <Table rowKey="MaSanPham" loading={loading} dataSource={data ?? []} columns={columns}
          scroll={{ x: 'max-content' }} pagination={{ pageSize: 20, hideOnSinglePage: true }} />
      </Card>

      <Modal title={editing?.MaSanPham ? 'Sửa sản phẩm' : 'Thêm sản phẩm'} open={!!editing} onCancel={() => setEditing(null)}
        onOk={() => form.submit()} confirmLoading={saving} okText="Lưu" destroyOnHidden>
        <Form form={form} layout="vertical" onFinish={save}>
          <Form.Item name="MaSKU" label="Mã SKU" rules={[{ required: true, message: 'Nhập mã SKU' }]}
            extra={editing?.MaSanPham ? 'Mã SKU không đổi được sau khi tạo' : null}>
            <Input maxLength={50} disabled={!!editing?.MaSanPham} />
          </Form.Item>
          <Form.Item name="TenSanPham" label="Tên sản phẩm" rules={[{ required: true, message: 'Nhập tên sản phẩm' }]}>
            <Input maxLength={200} />
          </Form.Item>
          <Flex gap={12}>
            <Form.Item name="MaDanhMuc" label="Danh mục" rules={[{ required: true, message: 'Chọn danh mục' }]} style={{ flex: 1 }}>
              <Select options={(categories ?? []).map((c) => ({ value: c.MaDanhMuc, label: c.TenDanhMuc }))} />
            </Form.Item>
            <Form.Item name="MaDonVi" label="Đơn vị tính" rules={[{ required: true, message: 'Chọn đơn vị' }]} style={{ flex: 1 }}>
              <Select options={(units ?? []).map((u) => ({ value: u.MaDonVi, label: u.TenDonVi }))} />
            </Form.Item>
          </Flex>
          <Flex gap={12}>
            <Form.Item name="GiaBan" label="Giá bán (₫)" rules={[{ required: true, message: 'Nhập giá bán' }]} style={{ flex: 1 }}>
              <InputNumber min={1} step={10000} style={{ width: '100%' }} formatter={(v) => (v ? Number(v).toLocaleString('vi-VN') : '')} parser={(v) => v.replace(/\D/g, '')} />
            </Form.Item>
            <Form.Item name="MucTonToiThieu" label="Mức tồn tối thiểu" rules={[{ required: true }]} style={{ flex: 1 }}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </Flex>
          {editing?.MaSanPham && (
            <Form.Item name="TrangThai" label="Đang kinh doanh" valuePropName="checked"><Switch /></Form.Item>
          )}
        </Form>
      </Modal>
    </>
  );
}
