import SimpleCrudPage from '../components/SimpleCrudPage';
import { useAuth } from '../auth';
import { ROLE } from '../constants';

export default function Suppliers() {
  const { hasRole } = useAuth();
  return (
    <SimpleCrudPage title="Nhà cung cấp" subtitle="Đơn vị cung cấp hàng hóa cho cửa hàng" endpoint="/suppliers" rowKey="MaNCC"
      searchable canWrite canDelete={hasRole(ROLE.ADMIN)}
      columns={[
        { title: 'Mã', dataIndex: 'MaNCC', width: 70 },
        { title: 'Tên nhà cung cấp', dataIndex: 'TenNCC' },
        { title: 'Số điện thoại', dataIndex: 'SoDienThoai' },
        { title: 'Email', dataIndex: 'Email' },
        { title: 'Địa chỉ', dataIndex: 'DiaChi' },
      ]}
      fields={[
        { name: 'TenNCC', label: 'Tên nhà cung cấp', required: true, max: 200 },
        { name: 'SoDienThoai', label: 'Số điện thoại', max: 20 },
        { name: 'Email', label: 'Email', max: 100, rules: [{ type: 'email', message: 'Email không hợp lệ' }] },
        { name: 'DiaChi', label: 'Địa chỉ', max: 300 },
      ]}
    />
  );
}
