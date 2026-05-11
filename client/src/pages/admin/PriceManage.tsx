import { useEffect, useState } from 'react';
import { Card, Table, Select, Space, Typography, Tag } from 'antd';
import { ReloadOutlined, HistoryOutlined, UploadOutlined } from '@ant-design/icons';
import { api } from '../../api/client';

interface PriceRecord {
  id: number;
  item_type: string;
  item_id: number;
  old_price: number;
  new_price: number;
  source: string;
  created_at: string;
}

export default function PriceManage() {
  const [data, setData] = useState<PriceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>('');

  const load = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (typeFilter) params.item_type = typeFilter;
      params.limit = 200;
      setData(await api.getPriceHistory(params));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [typeFilter]);

  const columns = [
    {
      title: '类型', dataIndex: 'item_type', key: 'item_type', width: 80,
      render: (v: string) => v === 'filter' ? <Tag color="blue">滤波器</Tag> : <Tag color="green">电缆</Tag>,
    },
    { title: 'ID', dataIndex: 'item_id', key: 'item_id', width: 60 },
    {
      title: '旧价格', dataIndex: 'old_price', key: 'old_price', width: 100,
      render: (v: number) => <Typography.Text delete>{v?.toFixed(2)}</Typography.Text>,
    },
    {
      title: '新价格', dataIndex: 'new_price', key: 'new_price', width: 100,
      render: (v: number) => <Typography.Text strong>{v?.toFixed(2)}</Typography.Text>,
    },
    { title: '来源', dataIndex: 'source', key: 'source', width: 80 },
    { title: '时间', dataIndex: 'created_at', key: 'created_at', width: 160, render: (v: string) => v?.slice(0, 19) },
  ];

  return (
    <Card
      title="价格变更历史"
      extra={
        <Space>
          <Select
            style={{ width: 140 }}
            placeholder="筛选类型"
            allowClear
            value={typeFilter || undefined}
            onChange={(v) => setTypeFilter(v || '')}
            options={[
              { value: 'filter', label: '滤波器' },
              { value: 'cable', label: '电缆' },
            ]}
          />
          <ReloadOutlined style={{ cursor: 'pointer', fontSize: 16 }} onClick={load} />
        </Space>
      }
    >
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        size="small"
        pagination={{ pageSize: 50 }}
      />
    </Card>
  );
}
