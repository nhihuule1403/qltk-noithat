import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { App, Button, Card, DatePicker, Flex, Select, Table, Typography } from 'antd';
import { api, errorMessage } from '../api';
import { PageHeader, ProductSelect, StatusTag, useFetch } from '../components/common';
import { useAuth } from '../auth';
import { MOVEMENT_TYPE, ROLE, dateTime, num } from '../constants';

function DocumentLink({ r }) {
  const { hasRole } = useAuth();
  if (r.MaPhieuNhap) return <Link to={`/purchase-orders/${r.MaPhieuNhap}`}>Phiếu nhập #{r.MaPhieuNhap}</Link>;
  if (r.MaHoaDon) {
    return hasRole(ROLE.ADMIN) ? <Link to={`/sales-invoices/${r.MaHoaDon}`}>Hóa đơn #{r.MaHoaDon}</Link> : <span>Hóa đơn #{r.MaHoaDon}</span>;
  }
  return <Link to={`/inventory-checks/${r.MaPhieuKiemKe}`}>Kiểm kê #{r.MaPhieuKiemKe}</Link>;
}

export default function StockMovements() {
  const { message } = App.useApp();
  const [searchParams] = useSearchParams();
  const initialProduct = searchParams.get('MaSanPham') ? Number(searchParams.get('MaSanPham')) : undefined;
  const [params, setParams] = useState({ page: 1, pageSize: 30, MaSanPham: initialProduct });
  const { data, loading } = useFetch('/stock-movements', params);
  const [at, setAt] = useState(null);
  const [stockAt, setStockAt] = useState(null);

  // F2: tồn tại thời điểm bất kỳ
  const lookup = async () => {
    if (!params.MaSanPham || !at) return;
    try {
      const res = await api.get(`/products/${params.MaSanPham}/stock-at`, { params: { time: at.format('YYYY-MM-DD HH:mm:ss') } });
      setStockAt(res.data);
    } catch (err) {
      message.error(errorMessage(err));
    }
  };

  return (
    <>
      <PageHeader title="Lịch sử biến động tồn kho" subtitle="Mỗi lần tồn thay đổi đều gắn với chứng từ gốc và người xác nhận" />
      <Card styles={{ body: { padding: 0 } }}>
        <Flex gap={8} wrap style={{ padding: 12 }}>
          <ProductSelect value={params.MaSanPham} showStock onChange={(v) => { setStockAt(null); setParams((p) => ({ ...p, page: 1, MaSanPham: v })); }} />
          {params.MaSanPham && <Button onClick={() => setParams((p) => ({ ...p, page: 1, MaSanPham: undefined }))}>Bỏ lọc sản phẩm</Button>}
          <Select allowClear placeholder="Loại biến động" style={{ width: 160 }}
            options={Object.entries(MOVEMENT_TYPE).map(([value, t]) => ({ value, label: t.label }))}
            onChange={(v) => setParams((p) => ({ ...p, page: 1, LoaiBienDong: v }))} />
          <DatePicker.RangePicker format="DD/MM/YYYY"
            onChange={(r) => setParams((p) => ({ ...p, page: 1, tuNgay: r?.[0]?.format('YYYY-MM-DD'), denNgay: r?.[1]?.format('YYYY-MM-DD') }))} />
        </Flex>
        {params.MaSanPham && (
          <Flex gap={8} wrap align="center" style={{ padding: '0 12px 12px' }}>
            <Typography.Text>Tra cứu tồn tại thời điểm:</Typography.Text>
            <DatePicker showTime format="DD/MM/YYYY HH:mm" value={at} onChange={setAt} />
            <Button onClick={lookup} disabled={!at}>Xem</Button>
            {stockAt && <Typography.Text strong>→ còn {num(stockAt.SoLuongTon)} sản phẩm</Typography.Text>}
          </Flex>
        )}
        <Table rowKey="MaBienDong" loading={loading} dataSource={data?.items ?? []} scroll={{ x: 'max-content' }}
          pagination={{
            current: params.page, pageSize: params.pageSize, total: data?.total, showSizeChanger: false,
            showTotal: (t) => `${t} bản ghi`, onChange: (page) => setParams((p) => ({ ...p, page })),
          }}
          columns={[
            { title: 'Thời điểm', dataIndex: 'NgayBienDong', render: dateTime },
            { title: 'SKU', dataIndex: 'MaSKU' },
            { title: 'Sản phẩm', dataIndex: 'TenSanPham' },
            { title: 'Loại', dataIndex: 'LoaiBienDong', render: (v) => <StatusTag value={v} map={MOVEMENT_TYPE} /> },
            {
              title: 'Thay đổi', dataIndex: 'SoLuongThayDoi', align: 'right',
              render: (v) => <Typography.Text strong type={v < 0 ? 'danger' : 'success'}>{v > 0 ? `+${v}` : v}</Typography.Text>,
            },
            { title: 'Tồn sau', dataIndex: 'TonSauBienDong', align: 'right' },
            { title: 'Chứng từ', key: 'ct', render: (_, r) => <DocumentLink r={r} /> },
            { title: 'Người xác nhận', dataIndex: 'TenNguoiDung' },
            { title: 'Ghi chú', dataIndex: 'GhiChu' },
          ]} />
      </Card>
    </>
  );
}
