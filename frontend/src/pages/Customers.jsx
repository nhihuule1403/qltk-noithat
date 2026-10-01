import { useRef, useState } from 'react';
import { App, Button, List, Modal, Typography } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import SimpleCrudPage from '../components/SimpleCrudPage';
import { useAuth } from '../auth';
import { api, errorMessage } from '../api';
import { ROLE } from '../constants';

export default function Customers() {
  const { hasRole } = useAuth();
  const { message } = App.useApp();
  const fileRef = useRef();
  const [result, setResult] = useState(null);
  const [version, setVersion] = useState(0);

  // Import CSV: gửi nguyên nội dung file, backend làm sạch và loại trùng số điện thoại
  const importFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const res = await api.post('/customers/import', text, { headers: { 'Content-Type': 'text/csv' } });
      setResult(res.data);
      setVersion((v) => v + 1);
    } catch (err) {
      message.error(errorMessage(err));
    }
  };

  return (
    <>
      <SimpleCrudPage key={version} title="Khách hàng" subtitle="Thông tin khách hàng phục vụ bán hàng" endpoint="/customers"
        rowKey="MaKhachHang" searchable canWrite canDelete={hasRole(ROLE.ADMIN)}
        extra={<Button icon={<UploadOutlined />} onClick={() => fileRef.current.click()}>Import CSV</Button>}
        columns={[
          { title: 'Mã', dataIndex: 'MaKhachHang', width: 70 },
          { title: 'Tên khách hàng', dataIndex: 'TenKhachHang' },
          { title: 'Số điện thoại', dataIndex: 'SoDienThoai' },
          { title: 'Địa chỉ', dataIndex: 'DiaChi' },
        ]}
        fields={[
          { name: 'TenKhachHang', label: 'Tên khách hàng', required: true, max: 200 },
          { name: 'SoDienThoai', label: 'Số điện thoại', max: 20 },
          { name: 'DiaChi', label: 'Địa chỉ', max: 300 },
        ]}
      />
      <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={importFile} />
      <Modal title="Kết quả import" open={!!result} onCancel={() => setResult(null)} footer={null}>
        <Typography.Paragraph>Đã thêm <b>{result?.daThem}</b> khách hàng.</Typography.Paragraph>
        {result?.boQua?.length > 0 && (
          <List size="small" header={`Bỏ qua ${result.boQua.length} dòng`} dataSource={result.boQua}
            renderItem={(r) => <List.Item>Dòng {r.dong}: {r.lyDo}</List.Item>} />
        )}
        <Typography.Paragraph type="secondary" style={{ marginTop: 12, fontSize: 12 }}>
          Định dạng file: CSV UTF-8, dòng đầu là tiêu đề TenKhachHang,SoDienThoai,DiaChi
        </Typography.Paragraph>
      </Modal>
    </>
  );
}
