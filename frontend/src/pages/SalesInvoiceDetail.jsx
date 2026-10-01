import LineDocumentDetail from '../components/LineDocumentDetail';
import { dateTime } from '../constants';

export default function SalesInvoiceDetail() {
  return (
    <LineDocumentDetail
      title="Hóa đơn" endpoint="/sales-invoices" backTo="/sales-invoices" rowKey="MaHoaDon" linePk="MaChiTietBan"
      priceField="DonGiaBan" priceLabel="Đơn giá bán" showStock defaultPrice={(p) => p?.GiaBan}
      confirmText="Hoàn tất hóa đơn" confirmDescription="Hệ thống kiểm tra tồn kho rồi trừ tồn theo hóa đơn."
      headerItems={(d) => [
        { label: 'Khách hàng', children: d.SoDienThoai ? `${d.TenKhachHang} – ${d.SoDienThoai}` : d.TenKhachHang },
        { label: 'Ngày lập', children: dateTime(d.NgayBan) },
      ]} />
  );
}
