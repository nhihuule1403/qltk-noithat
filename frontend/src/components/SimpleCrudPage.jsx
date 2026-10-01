import { useState } from 'react';
import { App, Button, Card, Flex, Form, Input, Modal, Popconfirm, Table } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { api, errorMessage } from '../api';
import { PageHeader, useFetch } from './common';

/** Trang danh sách + thêm / sửa / xóa cho bảng đơn giản (danh mục, NCC, khách hàng...) */
export default function SimpleCrudPage({
  title, subtitle, endpoint, rowKey, columns, fields, canWrite, canDelete, searchable, extra, embedded,
}) {
  const { message } = App.useApp();
  const [q, setQ] = useState('');
  const { data, loading, reload } = useFetch(endpoint, searchable && q ? { q } : undefined);
  const [editing, setEditing] = useState(null); // null: đóng, {}: thêm mới, row: sửa
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const open = (row) => {
    setEditing(row);
    form.setFieldsValue(row?.[rowKey] ? row : Object.fromEntries(fields.map((f) => [f.name, undefined])));
  };

  const save = async (values) => {
    setSaving(true);
    try {
      if (editing[rowKey]) await api.put(`${endpoint}/${editing[rowKey]}`, values);
      else await api.post(endpoint, values);
      message.success('Đã lưu');
      setEditing(null);
      reload();
    } catch (err) {
      message.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row) => {
    try {
      await api.delete(`${endpoint}/${row[rowKey]}`);
      message.success('Đã xóa');
      reload();
    } catch (err) {
      message.error(errorMessage(err));
    }
  };

  const actionColumn = (canWrite || canDelete) && {
    title: '', key: 'actions', width: 96, align: 'right',
    render: (_, row) => (
      <Flex gap={4} justify="flex-end">
        {canWrite && <Button size="small" type="text" icon={<EditOutlined />} onClick={() => open(row)} />}
        {canDelete && (
          <Popconfirm title="Xóa bản ghi này?" onConfirm={() => remove(row)} okText="Xóa" cancelText="Hủy">
            <Button size="small" type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        )}
      </Flex>
    ),
  };

  const toolbar = (
    <Flex gap={8} wrap>
      {searchable && (
        <Input allowClear prefix={<SearchOutlined />} placeholder="Tìm kiếm" style={{ width: 220 }}
          onPressEnter={(e) => setQ(e.target.value)} onChange={(e) => !e.target.value && setQ('')} />
      )}
      {extra}
      {canWrite && <Button type="primary" icon={<PlusOutlined />} onClick={() => open({})}>Thêm</Button>}
    </Flex>
  );

  return (
    <>
      {embedded ? <Flex justify="flex-end" style={{ marginBottom: 12 }}>{toolbar}</Flex>
        : <PageHeader title={title} subtitle={subtitle} extra={toolbar} />}
      <Card styles={{ body: { padding: 0 } }}>
        <Table rowKey={rowKey} loading={loading} dataSource={data ?? []} columns={[...columns, actionColumn].filter(Boolean)}
          scroll={{ x: 'max-content' }} pagination={{ pageSize: 20, hideOnSinglePage: true }} />
      </Card>
      <Modal title={editing?.[rowKey] ? `Sửa ${title.toLowerCase()}` : `Thêm ${title.toLowerCase()}`} open={!!editing}
        onCancel={() => setEditing(null)} onOk={() => form.submit()} confirmLoading={saving} okText="Lưu" destroyOnHidden>
        <Form form={form} layout="vertical" onFinish={save}>
          {fields.map((f) => (
            <Form.Item key={f.name} name={f.name} label={f.label} rules={f.required ? [{ required: true, message: `Nhập ${f.label.toLowerCase()}` }] : f.rules}>
              {f.input ?? <Input maxLength={f.max} />}
            </Form.Item>
          ))}
        </Form>
      </Modal>
    </>
  );
}
