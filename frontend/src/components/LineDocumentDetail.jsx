import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { App, Button, Card, Flex, InputNumber, Popconfirm, Result, Spin, Table, Tag, Tooltip, Typography } from 'antd';
import { DeleteOutlined, PlusOutlined, WarningOutlined } from '@ant-design/icons';
import { api, errorMessage } from '../api';
import { ProductSelect, useFetch } from './common';
import DocumentHeader from './DocumentHeader';
import { money, num } from '../constants';

const moneyInput = {
  min: 1, step: 10000, style: { width: 140 },
  formatter: (v) => (v ? Number(v).toLocaleString('vi-VN') : ''),
  parser: (v) => v.replace(/\D/g, ''),
};

/**
 * Chi tiết phiếu nhập / hóa đơn: thêm, sửa, xóa dòng khi còn Nháp.
 * cfg: endpoint, rowKey, linePk, priceField, priceLabel, title, backTo, headerItems(doc), showStock, confirmText
 */
export default function LineDocumentDetail(cfg) {
  const { id } = useParams();
  const { message } = App.useApp();
  const endpoint = `${cfg.endpoint}/${id}`;
  const { data: doc, loading, setData: setDoc } = useFetch(endpoint);
  const [newLine, setNewLine] = useState({});
  const [adding, setAdding] = useState(false);

  if (loading && !doc) return <Spin />;
  if (!doc) return <Result status="404" title="Không tìm thấy chứng từ" />;
  const isDraft = doc.TrangThai === 'DRAFT';

  const addLine = async () => {
    if (!newLine.MaSanPham || !newLine.SoLuong || (cfg.priceRequired && !newLine.price)) {
      message.warning('Chọn sản phẩm, nhập số lượng và đơn giá');
      return;
    }
    setAdding(true);
    try {
      const res = await api.post(`${endpoint}/lines`, { MaSanPham: newLine.MaSanPham, SoLuong: newLine.SoLuong, [cfg.priceField]: newLine.price });
      setDoc(res.data);
      setNewLine({});
    } catch (err) {
      message.error(errorMessage(err));
    } finally {
      setAdding(false);
    }
  };

  const updateLine = async (line, patch) => {
    const body = { SoLuong: line.SoLuong, [cfg.priceField]: line[cfg.priceField], ...patch };
    if (body.SoLuong === line.SoLuong && body[cfg.priceField] === line[cfg.priceField]) return;
    if (!body.SoLuong || !body[cfg.priceField]) return;
    try {
      const res = await api.put(`${endpoint}/lines/${line[cfg.linePk]}`, body);
      setDoc(res.data);
    } catch (err) {
      message.error(errorMessage(err));
    }
  };

  const deleteLine = async (line) => {
    try {
      const res = await api.delete(`${endpoint}/lines/${line[cfg.linePk]}`);
      setDoc(res.data);
    } catch (err) {
      message.error(errorMessage(err));
    }
  };

  const shortage = cfg.showStock && isDraft && doc.ChiTiet.some((l) => l.SoLuong > l.SoLuongTon);

  const columns = [
    { title: 'SKU', dataIndex: 'MaSKU', width: 130 },
    { title: 'Sản phẩm', dataIndex: 'TenSanPham' },
    { title: 'ĐVT', dataIndex: 'TenDonVi', width: 70 },
    ...(cfg.showStock && isDraft ? [{
      title: 'Tồn hiện tại', dataIndex: 'SoLuongTon', align: 'right',
      render: (v, l) => (l.SoLuong > v
        ? <Tooltip title="Không đủ tồn kho"><Tag color="red" icon={<WarningOutlined />}>{num(v)}</Tag></Tooltip>
        : num(v)),
    }] : []),
    {
      title: 'Số lượng', dataIndex: 'SoLuong', align: 'right', width: 110,
      render: (v, l) => (isDraft
        ? <InputNumber key={`${l[cfg.linePk]}-${v}`} min={1} defaultValue={v} style={{ width: 90 }}
            onBlur={(e) => updateLine(l, { SoLuong: Number(e.target.value.replace(/\D/g, '')) })}
            onPressEnter={(e) => e.target.blur()} />
        : num(v)),
    },
    {
      title: cfg.priceLabel, dataIndex: cfg.priceField, align: 'right',
      render: (v, l) => (isDraft
        ? <InputNumber key={`${l[cfg.linePk]}-${v}`} {...moneyInput} defaultValue={v}
            onBlur={(e) => updateLine(l, { [cfg.priceField]: Number(e.target.value.replace(/\D/g, '')) })}
            onPressEnter={(e) => e.target.blur()} />
        : money(v)),
    },
    { title: 'Thành tiền', dataIndex: 'ThanhTien', align: 'right', render: (v) => <b>{money(v)}</b> },
    ...(isDraft ? [{
      title: '', key: 'del', width: 50,
      render: (_, l) => (
        <Popconfirm title="Xóa dòng này?" onConfirm={() => deleteLine(l)} okText="Xóa" cancelText="Không">
          <Button type="text" danger size="small" icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    }] : []),
  ];

  return (
    <>
      <DocumentHeader title={`${cfg.title} #${doc[cfg.rowKey]}`} doc={doc} endpoint={endpoint} backTo={cfg.backTo}
        items={cfg.headerItems(doc)} confirmText={cfg.confirmText} confirmDescription={cfg.confirmDescription}
        confirmDisabled={!doc.ChiTiet.length} onChanged={setDoc} />

      <Card title="Chi tiết" styles={{ body: { padding: 0 } }}>
        {isDraft && (
          <Flex gap={8} wrap align="center" style={{ padding: 12, borderBottom: '1px solid #f0f0f0' }}>
            <ProductSelect value={newLine.MaSanPham} showStock={cfg.showStock} showPrice={cfg.showStock}
              excludeIds={doc.ChiTiet.map((l) => l.MaSanPham)} style={{ flex: 1 }}
              onChange={(v, p) => setNewLine((n) => ({ ...n, MaSanPham: v, price: cfg.defaultPrice ? cfg.defaultPrice(p) : n.price }))} />
            <InputNumber min={1} placeholder="Số lượng" value={newLine.SoLuong} style={{ width: 110 }}
              onChange={(v) => setNewLine((n) => ({ ...n, SoLuong: v }))} />
            <InputNumber {...moneyInput} placeholder={cfg.priceLabel} value={newLine.price}
              onChange={(v) => setNewLine((n) => ({ ...n, price: v }))} />
            <Button type="primary" icon={<PlusOutlined />} loading={adding} onClick={addLine}>Thêm</Button>
          </Flex>
        )}
        <Table rowKey={cfg.linePk} dataSource={doc.ChiTiet} columns={columns} pagination={false} scroll={{ x: 'max-content' }}
          locale={{ emptyText: 'Chưa có sản phẩm nào' }}
          summary={() => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={columns.length - (isDraft ? 2 : 1)} align="right"><b>Tổng tiền</b></Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="right"><Typography.Text strong style={{ fontSize: 16 }}>{money(doc.TongTien)}</Typography.Text></Table.Summary.Cell>
              {isDraft && <Table.Summary.Cell index={2} />}
            </Table.Summary.Row>
          )} />
        {shortage && (
          <Typography.Paragraph type="danger" style={{ padding: 12, margin: 0 }}>
            <WarningOutlined /> Có sản phẩm vượt quá số lượng tồn, hóa đơn sẽ không được xác nhận.
          </Typography.Paragraph>
        )}
      </Card>
    </>
  );
}
