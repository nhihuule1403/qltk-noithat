import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { App, Button, Card, Checkbox, DatePicker, Flex, Form, Input, Modal, Select, Table } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { api, errorMessage } from '../api';
import { PageHeader, StatusTag, useFetch } from '../components/common';
import { CHECK_STATUS, DOC_STATUS, dateTime, money } from '../constants';

/** Danh sách chứng từ dùng chung: lọc trạng thái, khoảng ngày, phân trang phía server */
function DocumentList({ title, subtitle, endpoint, basePath, rowKey, columns, statusMap = DOC_STATUS, createLabel, CreateForm }) {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [params, setParams] = useState({ page: 1, pageSize: 20, TrangThai: searchParams.get('TrangThai') || undefined });
  const { data, loading } = useFetch(endpoint, params);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const create = async (values) => {
    setSaving(true);
    try {
      const res = await api.post(endpoint, values);
      navigate(`${basePath}/${res.data[rowKey]}`);
    } catch (err) {
      message.error(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title={title} subtitle={subtitle}
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setCreating(true); }}>{createLabel}</Button>} />
      <Card styles={{ body: { padding: 0 } }}>
        <Flex gap={8} wrap style={{ padding: 12 }}>
          <Select allowClear placeholder="Trạng thái" style={{ width: 160 }} value={params.TrangThai}
            options={Object.entries(statusMap).map(([value, s]) => ({ value, label: s.label }))}
            onChange={(v) => setParams((p) => ({ ...p, page: 1, TrangThai: v }))} />
          <DatePicker.RangePicker format="DD/MM/YYYY"
            onChange={(r) => setParams((p) => ({ ...p, page: 1, tuNgay: r?.[0]?.format('YYYY-MM-DD'), denNgay: r?.[1]?.format('YYYY-MM-DD') }))} />
        </Flex>
        <Table rowKey={rowKey} loading={loading} dataSource={data?.items ?? []} scroll={{ x: 'max-content' }}
          onRow={(r) => ({ onClick: () => navigate(`${basePath}/${r[rowKey]}`), style: { cursor: 'pointer' } })}
          pagination={{
            current: params.page, pageSize: params.pageSize, total: data?.total, showSizeChanger: false,
            showTotal: (t) => `${t} chứng từ`, onChange: (page) => setParams((p) => ({ ...p, page })),
          }}
          columns={[
            { title: 'Số', dataIndex: rowKey, width: 80, render: (v) => `#${v}` },
            ...columns,
            { title: 'Trạng thái', dataIndex: 'TrangThai', render: (v) => <StatusTag value={v} map={statusMap} /> },
            { title: 'Người lập', dataIndex: 'TenNguoiLap' },
          ]} />
      </Card>
      <Modal title={createLabel} open={creating} onCancel={() => setCreating(false)} onOk={() => form.submit()}
        confirmLoading={saving} okText="Tạo" destroyOnHidden>
        <Form form={form} layout="vertical" onFinish={create}><CreateForm /></Form>
      </Modal>
    </>
  );
}

function SupplierField() {
  const { data } = useFetch('/suppliers');
  return (
    <Form.Item name="MaNCC" label="Nhà cung cấp" rules={[{ required: true, message: 'Chọn nhà cung cấp' }]}>
      <Select showSearch optionFilterProp="label" options={(data ?? []).map((s) => ({ value: s.MaNCC, label: s.TenNCC }))} />
    </Form.Item>
  );
}

function CustomerField() {
  const { data } = useFetch('/customers');
  return (
    <Form.Item name="MaKhachHang" label="Khách hàng" initialValue={1}>
      <Select showSearch optionFilterProp="label"
        options={(data ?? []).map((c) => ({ value: c.MaKhachHang, label: c.SoDienThoai ? `${c.TenKhachHang} – ${c.SoDienThoai}` : c.TenKhachHang }))} />
    </Form.Item>
  );
}

const NoteField = () => (
  <Form.Item name="GhiChu" label="Ghi chú"><Input.TextArea rows={2} maxLength={500} /></Form.Item>
);
const PurchaseCreateForm = () => (<><SupplierField /><NoteField /></>);
const SalesCreateForm = () => (<><CustomerField /><NoteField /></>);

export function PurchaseOrderList() {
  return (
    <DocumentList title="Nhập hàng" subtitle="Phiếu nhập chỉ cộng tồn khi được xác nhận hoàn thành"
      endpoint="/purchase-orders" basePath="/purchase-orders" rowKey="MaPhieuNhap" createLabel="Lập phiếu nhập"
      CreateForm={PurchaseCreateForm}
      columns={[
        { title: 'Ngày lập', dataIndex: 'NgayNhap', render: dateTime },
        { title: 'Nhà cung cấp', dataIndex: 'TenNCC' },
        { title: 'Số dòng', dataIndex: 'SoDong', align: 'right' },
        { title: 'Tổng tiền', dataIndex: 'TongTien', align: 'right', render: money },
      ]} />
  );
}

export function SalesInvoiceList() {
  return (
    <DocumentList title="Bán hàng" subtitle="Hóa đơn được kiểm tra tồn kho trước khi hoàn tất"
      endpoint="/sales-invoices" basePath="/sales-invoices" rowKey="MaHoaDon" createLabel="Lập hóa đơn"
      CreateForm={SalesCreateForm}
      columns={[
        { title: 'Ngày lập', dataIndex: 'NgayBan', render: dateTime },
        { title: 'Khách hàng', dataIndex: 'TenKhachHang' },
        { title: 'Số dòng', dataIndex: 'SoDong', align: 'right' },
        { title: 'Tổng tiền', dataIndex: 'TongTien', align: 'right', render: money },
      ]} />
  );
}

function CheckCreateForm() {
  const { data } = useFetch('/categories');
  return (
    <>
      <Form.Item name="ThemTatCa" valuePropName="checked" initialValue>
        <Checkbox>Tự thêm toàn bộ sản phẩm đang kinh doanh</Checkbox>
      </Form.Item>
      <Form.Item name="MaDanhMuc" label="Hoặc chỉ kiểm kê một danh mục" extra="Bỏ trống để kiểm kê tất cả">
        <Select allowClear options={(data ?? []).map((c) => ({ value: c.MaDanhMuc, label: c.TenDanhMuc }))} />
      </Form.Item>
      <NoteField />
    </>
  );
}

export function InventoryCheckList() {
  return (
    <DocumentList title="Kiểm kê" subtitle="Đối chiếu số lượng thực tế với hệ thống và điều chỉnh tồn"
      endpoint="/inventory-checks" basePath="/inventory-checks" rowKey="MaPhieuKiemKe" createLabel="Lập phiếu kiểm kê"
      statusMap={CHECK_STATUS} CreateForm={CheckCreateForm}
      columns={[
        { title: 'Ngày lập', dataIndex: 'NgayKiemKe', render: dateTime },
        { title: 'Ghi chú', dataIndex: 'GhiChu' },
        { title: 'Số sản phẩm', dataIndex: 'SoDong', align: 'right' },
        { title: 'Dòng lệch', dataIndex: 'SoDongLech', align: 'right' },
      ]} />
  );
}
