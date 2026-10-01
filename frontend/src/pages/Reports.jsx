import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, App, Button, Card, DatePicker, Flex, InputNumber, Table, Tabs, Typography } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { Column, Pie } from '@ant-design/plots';
import dayjs from 'dayjs';
import { downloadCsv, errorMessage } from '../api';
import { useAuth } from '../auth';
import { PageHeader, StatusTag, useFetch } from '../components/common';
import { ROLE, STOCK_STATUS, money, num } from '../constants';

const { ADMIN, KHO, BANHANG } = ROLE;

function ExportButton({ url, params, filename }) {
  const { message } = App.useApp();
  return (
    <Button icon={<DownloadOutlined />} onClick={() => downloadCsv(url, params, filename).catch((e) => message.error(errorMessage(e)))}>
      Xuất CSV
    </Button>
  );
}

// Báo cáo có tham số khoảng ngày
function RangeReport({ url, filename, columns, rowKey, chart, extraParams, extraControls }) {
  const [range, setRange] = useState([dayjs('2026-06-01'), dayjs()]);
  const params = { tuNgay: range[0].format('YYYY-MM-DD'), denNgay: range[1].format('YYYY-MM-DD'), ...extraParams };
  const { data, loading } = useFetch(url, params);
  return (
    <>
      <Flex gap={8} wrap justify="space-between" style={{ marginBottom: 12 }}>
        <Flex gap={8} wrap align="center">
          <DatePicker.RangePicker format="DD/MM/YYYY" value={range} allowClear={false} onChange={setRange} />
          {extraControls}
        </Flex>
        <ExportButton url={url} params={params} filename={filename} />
      </Flex>
      {chart && data?.length > 0 && <Card style={{ marginBottom: 12 }}>{chart(data)}</Card>}
      <Card styles={{ body: { padding: 0 } }}>
        <Table rowKey={rowKey} loading={loading} dataSource={data ?? []} columns={columns} scroll={{ x: 'max-content' }}
          pagination={{ pageSize: 50, hideOnSinglePage: true }} />
      </Card>
    </>
  );
}

function InventoryReport() {
  const { data, loading } = useFetch('/reports/inventory');
  const total = (data ?? []).reduce((s, r) => s + r.GiaTriTon, 0);
  return (
    <>
      <Flex justify="space-between" wrap gap={8} style={{ marginBottom: 12 }}>
        <Typography.Text>Tổng giá trị tồn (theo giá bán): <b>{money(total)}</b></Typography.Text>
        <ExportButton url="/reports/inventory" filename="bao-cao-ton-kho" />
      </Flex>
      <Card styles={{ body: { padding: 0 } }}>
        <Table rowKey="MaSanPham" loading={loading} dataSource={data ?? []} scroll={{ x: 'max-content' }} pagination={false}
          columns={[
            { title: 'SKU', dataIndex: 'MaSKU' },
            { title: 'Sản phẩm', dataIndex: 'TenSanPham' },
            { title: 'Danh mục', dataIndex: 'TenDanhMuc', filters: [...new Set((data ?? []).map((r) => r.TenDanhMuc))].map((v) => ({ text: v, value: v })), onFilter: (v, r) => r.TenDanhMuc === v },
            { title: 'Tồn', dataIndex: 'SoLuongTon', align: 'right', sorter: (a, b) => a.SoLuongTon - b.SoLuongTon },
            { title: 'Tối thiểu', dataIndex: 'MucTonToiThieu', align: 'right' },
            { title: 'Giá bán', dataIndex: 'GiaBan', align: 'right', render: money },
            { title: 'Giá trị tồn', dataIndex: 'GiaTriTon', align: 'right', render: money, sorter: (a, b) => a.GiaTriTon - b.GiaTriTon },
            {
              title: 'Tình trạng', dataIndex: 'TinhTrang', render: (v) => <StatusTag value={v} map={STOCK_STATUS} />,
              filters: Object.entries(STOCK_STATUS).map(([value, s]) => ({ text: s.label, value })), onFilter: (v, r) => r.TinhTrang === v,
            },
          ]} />
      </Card>
    </>
  );
}

function BestSellers() {
  const [top, setTop] = useState(10);
  return (
    <RangeReport url="/reports/best-sellers" filename="san-pham-ban-chay" rowKey="MaSanPham" extraParams={{ top }}
      extraControls={<Flex align="center" gap={6}>Top <InputNumber min={1} max={50} value={top} onChange={(v) => setTop(v || 10)} style={{ width: 70 }} /></Flex>}
      chart={(d) => (
        <Column height={260} data={d} xField="MaSKU" yField="SoLuongBan" style={{ fill: '#8b5e34' }}
          tooltip={{ title: 'TenSanPham', items: [{ channel: 'y', name: 'Số lượng bán' }] }} />
      )}
      columns={[
        { title: 'Hạng', dataIndex: 'Hang', width: 70 },
        { title: 'SKU', dataIndex: 'MaSKU' },
        { title: 'Sản phẩm', dataIndex: 'TenSanPham' },
        { title: 'Số lượng bán', dataIndex: 'SoLuongBan', align: 'right', render: num },
        { title: 'Doanh thu', dataIndex: 'DoanhThu', align: 'right', render: money },
      ]} />
  );
}

function Reorder() {
  const { data, loading } = useFetch('/reports/reorder-suggestions');
  return (
    <>
      <Alert type="info" showIcon style={{ marginBottom: 12 }}
        title="Sản phẩm có tồn ≤ mức tối thiểu. Số lượng đề xuất = đưa tồn lên gấp đôi mức tối thiểu; nhà cung cấp và đơn giá lấy từ lần nhập gần nhất." />
      <Card styles={{ body: { padding: 0 } }}>
        <Table rowKey="MaSanPham" loading={loading} dataSource={data ?? []} pagination={false} scroll={{ x: 'max-content' }}
          locale={{ emptyText: 'Không có sản phẩm cần nhập thêm' }}
          summary={(rows) => rows.length > 0 && (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={7} align="right"><b>Tổng chi phí dự kiến</b></Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="right"><b>{money(rows.reduce((s, r) => s + (r.ChiPhiDuKien || 0), 0))}</b></Table.Summary.Cell>
            </Table.Summary.Row>
          )}
          columns={[
            { title: 'SKU', dataIndex: 'MaSKU' },
            { title: 'Sản phẩm', dataIndex: 'TenSanPham' },
            { title: 'Tồn', dataIndex: 'SoLuongTon', align: 'right' },
            { title: 'Tối thiểu', dataIndex: 'MucTonToiThieu', align: 'right' },
            { title: 'Đề xuất nhập', dataIndex: 'SoLuongDeXuat', align: 'right', render: (v) => <b>{v}</b> },
            { title: 'Nhà cung cấp gần nhất', dataIndex: 'TenNCC', render: (v) => v || '—' },
            { title: 'Đơn giá gần nhất', dataIndex: 'DonGiaGanNhat', align: 'right', render: money },
            { title: 'Chi phí dự kiến', dataIndex: 'ChiPhiDuKien', align: 'right', render: money },
          ]} />
      </Card>
    </>
  );
}

function Reconciliation() {
  const { data, loading, reload } = useFetch('/reports/reconciliation');
  return (
    <>
      <Flex justify="space-between" wrap gap={8} style={{ marginBottom: 12 }}>
        <Typography.Text type="secondary">So sánh tồn hiện tại với “tồn sau biến động” của bản ghi lịch sử mới nhất. Lệch nghĩa là tồn đã bị sửa trực tiếp, không qua chứng từ.</Typography.Text>
        <Button onClick={reload}>Chạy lại</Button>
      </Flex>
      {!loading && data?.length === 0 && <Alert type="success" showIcon title="Tồn kho khớp với lịch sử biến động của tất cả sản phẩm." />}
      {data?.length > 0 && (
        <Table rowKey="MaSanPham" dataSource={data} pagination={false}
          columns={[
            { title: 'SKU', dataIndex: 'MaSKU' }, { title: 'Sản phẩm', dataIndex: 'TenSanPham' },
            { title: 'Tồn hiện tại', dataIndex: 'SoLuongTon', align: 'right' }, { title: 'Tồn theo lịch sử', dataIndex: 'TonTheoLichSu', align: 'right' },
            { title: 'Chênh lệch', dataIndex: 'ChenhLech', align: 'right' },
          ]} />
      )}
    </>
  );
}

export default function Reports() {
  const { hasRole } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabs = [
    { key: 'inventory', label: 'R1. Tồn kho hiện tại', roles: [ADMIN, KHO, BANHANG], children: <InventoryReport /> },
    {
      key: 'stock', label: 'R2. Nhập – xuất – tồn', roles: [ADMIN, KHO],
      children: (
        <RangeReport url="/reports/stock-summary" filename="nhap-xuat-ton" rowKey="MaSanPham"
          columns={[
            { title: 'SKU', dataIndex: 'MaSKU' }, { title: 'Sản phẩm', dataIndex: 'TenSanPham' }, { title: 'Danh mục', dataIndex: 'TenDanhMuc' },
            { title: 'Tồn đầu kỳ', dataIndex: 'TonDauKy', align: 'right' }, { title: 'Nhập', dataIndex: 'Nhap', align: 'right' },
            { title: 'Xuất', dataIndex: 'Xuat', align: 'right' }, { title: 'Điều chỉnh', dataIndex: 'DieuChinh', align: 'right' },
            { title: 'Tồn cuối kỳ', dataIndex: 'TonCuoiKy', align: 'right', render: (v) => <b>{v}</b> },
          ]} />
      ),
    },
    {
      key: 'revenue', label: 'R3. Doanh số theo tháng', roles: [ADMIN, BANHANG],
      children: (
        <RangeReport url="/reports/revenue" filename="doanh-thu-theo-thang" rowKey="Thang"
          chart={(d) => (
            <Column height={260} data={d} xField="Thang" yField="DoanhThu" style={{ fill: '#8b5e34' }}
              axis={{ y: { labelFormatter: (v) => `${(v / 1e6).toLocaleString('vi-VN')}tr` } }}
              tooltip={{ items: [{ channel: 'y', name: 'Doanh thu', valueFormatter: money }] }} />
          )}
          columns={[
            { title: 'Tháng', dataIndex: 'Thang' }, { title: 'Số hóa đơn', dataIndex: 'SoHoaDon', align: 'right' },
            { title: 'Số lượng bán', dataIndex: 'SoLuongBan', align: 'right', render: num },
            { title: 'Doanh thu', dataIndex: 'DoanhThu', align: 'right', render: money },
          ]} />
      ),
    },
    { key: 'best', label: 'R4. Sản phẩm bán chạy', roles: [ADMIN, BANHANG], children: <BestSellers /> },
    {
      key: 'supplier', label: 'R5. Nhập hàng theo NCC', roles: [ADMIN, KHO],
      children: (
        <RangeReport url="/reports/purchases-by-supplier" filename="nhap-hang-theo-ncc" rowKey="MaNCC"
          chart={(d) => (
            <Pie height={260} data={d} angleField="TongTienNhap" colorField="TenNCC" innerRadius={0.6}
              legend={{ color: { position: 'right' } }}
              tooltip={{ items: [{ field: 'TongTienNhap', name: 'Tổng tiền nhập', valueFormatter: money }] }} />
          )}
          columns={[
            { title: 'Nhà cung cấp', dataIndex: 'TenNCC' }, { title: 'Số phiếu', dataIndex: 'SoPhieu', align: 'right' },
            { title: 'Tổng số lượng', dataIndex: 'TongSoLuong', align: 'right', render: num },
            { title: 'Tổng tiền nhập', dataIndex: 'TongTienNhap', align: 'right', render: money },
            { title: 'Tỷ trọng', dataIndex: 'TyTrong', align: 'right', render: (v) => `${v}%` },
          ]} />
      ),
    },
    { key: 'reorder', label: 'Đề xuất nhập hàng', roles: [ADMIN, KHO], children: <Reorder /> },
    { key: 'reconcile', label: 'Đối soát tồn kho', roles: [ADMIN], children: <Reconciliation /> },
  ].filter((t) => hasRole(...t.roles));

  const active = tabs.some((t) => t.key === searchParams.get('tab')) ? searchParams.get('tab') : tabs[0].key;

  return (
    <>
      <PageHeader title="Báo cáo" subtitle="Chỉ tính các chứng từ đã hoàn thành" />
      <Tabs activeKey={active} onChange={(k) => setSearchParams({ tab: k })} items={tabs} destroyOnHidden />
    </>
  );
}
