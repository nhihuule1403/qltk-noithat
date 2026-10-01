import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { App, Button, Card, Flex, Input, InputNumber, Popconfirm, Result, Segmented, Spin, Table, Typography } from 'antd';
import { DeleteOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons';
import { api, errorMessage } from '../api';
import { ProductSelect, useFetch } from '../components/common';
import DocumentHeader from '../components/DocumentHeader';
import { CHECK_STATUS, dateTime, num } from '../constants';

export default function InventoryCheckDetail() {
  const { id } = useParams();
  const { message } = App.useApp();
  const endpoint = `/inventory-checks/${id}`;
  const { data: doc, loading, setData: setDoc } = useFetch(endpoint);
  const [edits, setEdits] = useState({}); // MaChiTietKiemKe → { SoLuongThucTe, LyDo }
  const [view, setView] = useState('all');
  const [newProduct, setNewProduct] = useState();
  const [saving, setSaving] = useState(false);

  useEffect(() => { setEdits({}); }, [doc]);

  const rows = useMemo(() => (doc?.ChiTiet ?? []).map((l) => {
    const e = edits[l.MaChiTietKiemKe] ?? {};
    const thucTe = 'SoLuongThucTe' in e ? e.SoLuongThucTe : l.SoLuongThucTe;
    const heThong = doc.TrangThai === 'DRAFT' ? l.TonHienTai : l.SoLuongHeThong;
    return { ...l, thucTe, lyDo: 'LyDo' in e ? e.LyDo : l.LyDo, heThong, lech: thucTe == null ? null : thucTe - heThong };
  }), [doc, edits]);

  if (loading && !doc) return <Spin />;
  if (!doc) return <Result status="404" title="Không tìm thấy phiếu kiểm kê" />;
  const isDraft = doc.TrangThai === 'DRAFT';
  const dirty = Object.keys(edits).length > 0;

  const edit = (lineId, patch) => setEdits((s) => ({ ...s, [lineId]: { ...s[lineId], ...patch } }));

  const save = async ({ silent } = {}) => {
    if (!dirty) return;
    const body = rows.filter((r) => edits[r.MaChiTietKiemKe]).map((r) => ({
      MaChiTietKiemKe: r.MaChiTietKiemKe, SoLuongThucTe: r.thucTe, LyDo: r.lyDo,
    }));
    setSaving(true);
    try {
      const res = await api.put(`${endpoint}/lines`, body);
      setDoc(res.data);
      if (!silent) message.success('Đã lưu số liệu kiểm kê');
    } finally {
      setSaving(false);
    }
  };

  const addProduct = async () => {
    if (!newProduct) return;
    try {
      const res = await api.post(`${endpoint}/lines`, { MaSanPham: newProduct });
      setDoc(res.data);
      setNewProduct(undefined);
    } catch (err) {
      message.error(errorMessage(err));
    }
  };

  const removeLine = async (l) => {
    try {
      const res = await api.delete(`${endpoint}/lines/${l.MaChiTietKiemKe}`);
      setDoc(res.data);
    } catch (err) {
      message.error(errorMessage(err));
    }
  };

  const filtered = rows.filter((r) => (view === 'todo' ? r.thucTe == null : view === 'diff' ? r.lech : true));
  const counted = rows.filter((r) => r.thucTe != null).length;
  const diffCount = rows.filter((r) => r.lech).length;

  return (
    <>
      <DocumentHeader title={`Phiếu kiểm kê #${doc.MaPhieuKiemKe}`} doc={doc} endpoint={endpoint} backTo="/inventory-checks"
        statusMap={CHECK_STATUS} onChanged={setDoc} confirmDisabled={!rows.length}
        confirmText="Xác nhận điều chỉnh"
        confirmDescription="Số lượng hệ thống được chốt lại tại thời điểm xác nhận; tồn kho sẽ được đưa về số thực tế."
        beforeConfirm={() => save({ silent: true })}
        items={[
          { label: 'Ngày lập', children: dateTime(doc.NgayKiemKe) },
          { label: 'Tiến độ', children: `${counted}/${rows.length} sản phẩm đã đếm, ${diffCount} dòng lệch` },
        ]} />

      <Card styles={{ body: { padding: 0 } }}>
        <Flex gap={8} wrap align="center" justify="space-between" style={{ padding: 12, borderBottom: '1px solid #f0f0f0' }}>
          <Segmented value={view} onChange={setView}
            options={[{ value: 'all', label: 'Tất cả' }, { value: 'todo', label: 'Chưa đếm' }, { value: 'diff', label: 'Có chênh lệch' }]} />
          {isDraft && (
            <Flex gap={8} wrap>
              <ProductSelect value={newProduct} onChange={setNewProduct} showStock excludeIds={rows.map((r) => r.MaSanPham)} />
              <Button icon={<PlusOutlined />} onClick={addProduct}>Thêm</Button>
              <Button type="primary" icon={<SaveOutlined />} disabled={!dirty} loading={saving}
                onClick={() => save().catch((err) => message.error(errorMessage(err)))}>Lưu</Button>
            </Flex>
          )}
        </Flex>
        <Table rowKey="MaChiTietKiemKe" dataSource={filtered} pagination={false} scroll={{ x: 'max-content' }}
          columns={[
            { title: 'SKU', dataIndex: 'MaSKU', width: 130 },
            { title: 'Sản phẩm', dataIndex: 'TenSanPham' },
            { title: 'Danh mục', dataIndex: 'TenDanhMuc' },
            { title: isDraft ? 'Tồn hệ thống (hiện tại)' : 'SL hệ thống', dataIndex: 'heThong', align: 'right', render: num },
            {
              title: 'SL thực tế', dataIndex: 'thucTe', align: 'right', width: 120,
              render: (v, r) => (isDraft
                ? <InputNumber min={0} value={v} style={{ width: 90 }} status={v == null ? 'warning' : undefined}
                    onChange={(val) => edit(r.MaChiTietKiemKe, { SoLuongThucTe: val ?? null })} />
                : num(v)),
            },
            {
              title: 'Chênh lệch', dataIndex: 'lech', align: 'right',
              render: (v) => (v == null ? '' : <Typography.Text strong type={v < 0 ? 'danger' : v > 0 ? 'success' : undefined}>{v > 0 ? `+${v}` : v}</Typography.Text>),
            },
            {
              title: 'Lý do', dataIndex: 'lyDo', width: 260,
              render: (v, r) => (isDraft
                ? <Input value={v ?? ''} maxLength={300} placeholder={r.lech ? 'Bắt buộc khi có chênh lệch' : ''}
                    status={r.lech && !v ? 'error' : undefined} onChange={(e) => edit(r.MaChiTietKiemKe, { LyDo: e.target.value })} />
                : v),
            },
            ...(isDraft ? [{
              title: '', key: 'del', width: 50,
              render: (_, r) => (
                <Popconfirm title="Bỏ sản phẩm khỏi phiếu?" onConfirm={() => removeLine(r)} okText="Bỏ" cancelText="Không">
                  <Button type="text" danger size="small" icon={<DeleteOutlined />} />
                </Popconfirm>
              ),
            }] : []),
          ]} />
      </Card>
    </>
  );
}
