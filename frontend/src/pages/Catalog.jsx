import { Tabs } from 'antd';
import SimpleCrudPage from '../components/SimpleCrudPage';
import { PageHeader } from '../components/common';

export default function Catalog() {
  return (
    <>
      <PageHeader title="Danh mục & đơn vị tính" subtitle="Dữ liệu dùng để phân loại sản phẩm" />
      <Tabs
        items={[
          {
            key: 'cat', label: 'Danh mục',
            children: (
              <SimpleCrudPage embedded title="Danh mục" endpoint="/categories" rowKey="MaDanhMuc" canWrite canDelete
                columns={[
                  { title: 'Mã', dataIndex: 'MaDanhMuc', width: 70 },
                  { title: 'Tên danh mục', dataIndex: 'TenDanhMuc' },
                  { title: 'Mô tả', dataIndex: 'MoTa' },
                ]}
                fields={[{ name: 'TenDanhMuc', label: 'Tên danh mục', required: true, max: 100 }, { name: 'MoTa', label: 'Mô tả', max: 255 }]}
              />
            ),
          },
          {
            key: 'unit', label: 'Đơn vị tính',
            children: (
              <SimpleCrudPage embedded title="Đơn vị tính" endpoint="/units" rowKey="MaDonVi" canWrite canDelete
                columns={[{ title: 'Mã', dataIndex: 'MaDonVi', width: 70 }, { title: 'Tên đơn vị', dataIndex: 'TenDonVi' }]}
                fields={[{ name: 'TenDonVi', label: 'Tên đơn vị', required: true, max: 50 }]}
              />
            ),
          },
        ]}
      />
    </>
  );
}
