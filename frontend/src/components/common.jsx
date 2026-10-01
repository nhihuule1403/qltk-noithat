import { useCallback, useEffect, useState } from 'react';
import { App, Flex, Select, Tag, Typography } from 'antd';
import { api, errorMessage } from '../api';
import { money, num } from '../constants';

export function PageHeader({ title, subtitle, extra }) {
  return (
    <Flex justify="space-between" align="flex-start" wrap gap={12} style={{ marginBottom: 16 }}>
      <div>
        <Typography.Title level={3} style={{ margin: 0 }}>{title}</Typography.Title>
        {subtitle && <Typography.Text type="secondary">{subtitle}</Typography.Text>}
      </div>
      {extra && <Flex gap={8} wrap>{extra}</Flex>}
    </Flex>
  );
}

export function StatusTag({ value, map }) {
  const s = map[value];
  return s ? <Tag color={s.color}>{s.label}</Tag> : <Tag>{value}</Tag>;
}

// Gọi API GET và giữ trạng thái loading / data; reload() để tải lại
export function useFetch(url, params) {
  const { message } = App.useApp();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const key = JSON.stringify(params ?? {});

  const reload = useCallback(async () => {
    if (!url) return;
    setLoading(true);
    try {
      const res = await api.get(url, { params: JSON.parse(key) });
      setData(res.data);
    } catch (err) {
      message.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [url, key, message]);

  useEffect(() => { reload(); }, [reload]);
  return { data, loading, reload, setData };
}

// Chọn sản phẩm đang kinh doanh, tìm theo SKU / tên
export function ProductSelect({ value, onChange, showStock, showPrice, excludeIds = [], style }) {
  const { data } = useFetch('/products', { TrangThai: 1 });
  const options = (data ?? [])
    .filter((p) => !excludeIds.includes(p.MaSanPham))
    .map((p) => ({
      value: p.MaSanPham,
      product: p,
      search: `${p.MaSKU} ${p.TenSanPham}`.toLowerCase(),
      label: (
        <Flex justify="space-between" gap={8}>
          <span><b>{p.MaSKU}</b> · {p.TenSanPham}</span>
          <Typography.Text type="secondary" style={{ whiteSpace: 'nowrap' }}>
            {showStock && `Tồn ${num(p.SoLuongTon)}`}{showStock && showPrice && ' · '}{showPrice && money(p.GiaBan)}
          </Typography.Text>
        </Flex>
      ),
    }));
  return (
    <Select
      showSearch
      value={value}
      placeholder="Chọn sản phẩm (gõ SKU hoặc tên)"
      options={options}
      filterOption={(input, opt) => opt.search.includes(input.toLowerCase())}
      onChange={(v, opt) => onChange?.(v, opt?.product)}
      style={{ minWidth: 280, ...style }}
      popupMatchSelectWidth={false}
    />
  );
}
