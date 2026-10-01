import { Link } from 'react-router-dom';
import { Alert, Card, Col, Row, Statistic, Table, Typography } from 'antd';
import { Column } from '@ant-design/plots';
import dayjs from 'dayjs';
import { useAuth } from '../auth';
import { PageHeader, StatusTag, useFetch } from '../components/common';
import { ROLE, STOCK_STATUS, money, num } from '../constants';

export default function Dashboard() {
  const { user, hasRole } = useAuth();
  const { data, loading } = useFetch('/reports/dashboard');
  const d = data ?? {};
  const seeSales = hasRole(ROLE.ADMIN, ROLE.BANHANG);
  const seeStock = hasRole(ROLE.ADMIN, ROLE.KHO);

  return (
    <>
      <PageHeader title={`Xin chào, ${user.HoTen}`} subtitle={dayjs().format('dddd, DD/MM/YYYY')} />
      <Row gutter={[16, 16]}>
        <Col xs={12} md={6}><Card loading={loading}><Statistic title="Sản phẩm đang bán" value={d.tonKho?.SoSanPham} /></Card></Col>
        <Col xs={12} md={6}><Card loading={loading}><Statistic title="Tổng số lượng tồn" value={d.tonKho?.TongTon} formatter={num} /></Card></Col>
        <Col xs={12} md={6}>
          <Card loading={loading}><Statistic title="Tồn thấp / hết hàng" value={`${d.tonKho?.SoTonThap ?? 0} / ${d.tonKho?.SoHetHang ?? 0}`} styles={{ content: { color: '#d4380d' } }} /></Card>
        </Col>
        <Col xs={12} md={6}><Card loading={loading}><Statistic title="Giá trị tồn (giá bán)" value={d.tonKho?.GiaTriTon} formatter={money} /></Card></Col>
        {seeSales && (
          <>
            <Col xs={12} md={6}><Card loading={loading}><Statistic title="Doanh thu hôm nay" value={d.homNay?.DoanhThu} formatter={money} /></Card></Col>
            <Col xs={12} md={6}><Card loading={loading}><Statistic title="Doanh thu tháng này" value={d.thang?.DoanhThu} formatter={money} /></Card></Col>
          </>
        )}
      </Row>

      {(d.chungTuNhap?.PhieuNhapNhap > 0 || d.chungTuNhap?.HoaDonNhap > 0 || d.chungTuNhap?.KiemKeNhap > 0) && (
        <Alert style={{ marginTop: 16 }} type="info" showIcon
          title={
            <span>
              Chứng từ đang ở trạng thái Nháp:{' '}
              {seeStock && <Link to="/purchase-orders?TrangThai=DRAFT">{d.chungTuNhap.PhieuNhapNhap} phiếu nhập</Link>}
              {seeStock && seeSales && ' · '}
              {seeSales && <Link to="/sales-invoices?TrangThai=DRAFT">{d.chungTuNhap.HoaDonNhap} hóa đơn</Link>}
              {seeStock && <> · <Link to="/inventory-checks?TrangThai=DRAFT">{d.chungTuNhap.KiemKeNhap} phiếu kiểm kê</Link></>}
            </span>
          } />
      )}

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        {seeSales && (
          <Col xs={24} xl={14}>
            <Card title="Doanh thu 30 ngày gần nhất" loading={loading}>
              <Column height={280} data={(d.doanhThu30Ngay ?? []).map((r) => ({ ...r, Ngay: dayjs(r.Ngay).format('DD/MM') }))}
                xField="Ngay" yField="DoanhThu" style={{ fill: '#8b5e34' }}
                axis={{ y: { labelFormatter: (v) => `${(v / 1e6).toLocaleString('vi-VN')}tr` } }}
                tooltip={{ items: [{ channel: 'y', name: 'Doanh thu', valueFormatter: money }] }} />
            </Card>
          </Col>
        )}
        <Col xs={24} xl={seeSales ? 10 : 24}>
          <Card title="Cảnh báo tồn kho" loading={loading} extra={seeStock && <Link to="/reports?tab=reorder">Đề xuất nhập hàng</Link>}
            styles={{ body: { padding: 0 } }}>
            <Table rowKey="MaSanPham" size="small" dataSource={d.canhBao ?? []} pagination={false} scroll={{ x: 'max-content', y: 300 }}
              locale={{ emptyText: 'Tất cả sản phẩm đều đủ hàng' }}
              columns={[
                { title: 'SKU', dataIndex: 'MaSKU' },
                { title: 'Sản phẩm', dataIndex: 'TenSanPham' },
                { title: 'Tồn', dataIndex: 'SoLuongTon', align: 'right' },
                { title: 'Tối thiểu', dataIndex: 'MucTonToiThieu', align: 'right' },
                { title: '', dataIndex: 'TinhTrang', render: (v) => <StatusTag value={v} map={STOCK_STATUS} /> },
              ]} />
          </Card>
        </Col>
      </Row>
      <Typography.Paragraph type="secondary" style={{ marginTop: 16, fontSize: 12 }}>
        Sản phẩm được xem là tồn thấp khi tồn hiện tại ≤ mức tồn tối thiểu.
      </Typography.Paragraph>
    </>
  );
}
