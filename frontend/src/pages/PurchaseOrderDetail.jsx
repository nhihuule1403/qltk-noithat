import LineDocumentDetail from '../components/LineDocumentDetail';
import { dateTime } from '../constants';

export default function PurchaseOrderDetail() {
  return (
    <LineDocumentDetail
      title="Phiếu nhập" endpoint="/purchase-orders" backTo="/purchase-orders" rowKey="MaPhieuNhap" linePk="MaChiTietNhap"
      priceField="DonGiaNhap" priceLabel="Đơn giá nhập" priceRequired
      confirmText="Xác nhận nhập kho" confirmDescription="Tồn kho sẽ được cộng theo số lượng trên phiếu."
      headerItems={(d) => [
        { label: 'Nhà cung cấp', children: d.TenNCC },
        { label: 'Ngày lập', children: dateTime(d.NgayNhap) },
      ]} />
  );
}
