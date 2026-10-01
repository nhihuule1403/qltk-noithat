import { useNavigate } from 'react-router-dom';
import { App, Button, Card, Descriptions, Flex, Popconfirm, Typography } from 'antd';
import { ArrowLeftOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { api, errorMessage } from '../api';
import { StatusTag } from './common';
import { DOC_STATUS, dateTime } from '../constants';

/** Phần đầu chứng từ: tiêu đề, trạng thái, thông tin, nút Xác nhận / Hủy */
export default function DocumentHeader({
  title, doc, endpoint, backTo, items, statusMap = DOC_STATUS, confirmText, confirmDescription, beforeConfirm, onChanged, confirmDisabled,
}) {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const isDraft = doc.TrangThai === 'DRAFT';

  const act = async (action) => {
    try {
      if (action === 'confirm' && beforeConfirm) await beforeConfirm();
      const res = await api.post(`${endpoint}/${action}`);
      message.success(action === 'confirm' ? 'Đã xác nhận chứng từ' : 'Đã hủy chứng từ');
      onChanged(res.data);
    } catch (err) {
      message.error({ content: errorMessage(err), duration: 6 });
    }
  };

  return (
    <Card style={{ marginBottom: 16 }}>
      <Flex justify="space-between" align="flex-start" wrap gap={12}>
        <Flex align="center" gap={8}>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate(backTo)} />
          <Typography.Title level={4} style={{ margin: 0 }}>{title}</Typography.Title>
          <StatusTag value={doc.TrangThai} map={statusMap} />
        </Flex>
        {isDraft && (
          <Flex gap={8} wrap>
            <Popconfirm title="Hủy chứng từ này?" description="Chứng từ đã hủy không thể khôi phục." onConfirm={() => act('cancel')} okText="Hủy chứng từ" cancelText="Không">
              <Button icon={<CloseOutlined />}>Hủy</Button>
            </Popconfirm>
            <Popconfirm title={confirmText} description={confirmDescription} onConfirm={() => act('confirm')} okText="Xác nhận" cancelText="Không">
              <Button type="primary" icon={<CheckOutlined />} disabled={confirmDisabled}>{confirmText}</Button>
            </Popconfirm>
          </Flex>
        )}
      </Flex>
      <Descriptions size="small" style={{ marginTop: 12 }} column={{ xs: 1, sm: 2, lg: 3 }}
        items={[
          ...items,
          { label: 'Người lập', children: doc.TenNguoiLap },
          ...(doc.NgayXacNhan ? [
            { label: doc.TrangThai === 'CANCELLED' ? 'Người hủy' : 'Người xác nhận', children: doc.TenNguoiXacNhan },
            { label: doc.TrangThai === 'CANCELLED' ? 'Thời điểm hủy' : 'Thời điểm xác nhận', children: dateTime(doc.NgayXacNhan) },
          ] : []),
          ...(doc.GhiChu ? [{ label: 'Ghi chú', children: doc.GhiChu }] : []),
        ]} />
    </Card>
  );
}
