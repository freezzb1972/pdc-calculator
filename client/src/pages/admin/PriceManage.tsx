import { useEffect, useState } from 'react';
import { Card, Table, Select, Space, Typography, Tag } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { api } from '../../api/client';
import { useAppTranslation } from '../../i18n/useAppTranslation';
import BilingualText from '../../i18n/BilingualText';

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
  const { t } = useAppTranslation('priceManage');
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
      title: <BilingualText textKey="columns.type" ns="priceManage" />, dataIndex: 'item_type', key: 'item_type', width: 80,
      render: (v: string) => v === 'filter' ? <Tag color="blue">{t('tags.filter')}</Tag> : <Tag color="green">{t('tags.cable')}</Tag>,
    },
    { title: <BilingualText textKey="columns.item" ns="priceManage" />, dataIndex: 'item_id', key: 'item_id', width: 60 },
    {
      title: <BilingualText textKey="columns.oldPrice" ns="priceManage" />, dataIndex: 'old_price', key: 'old_price', width: 100,
      render: (v: number) => <Typography.Text delete>{v?.toFixed(2)}</Typography.Text>,
    },
    {
      title: <BilingualText textKey="columns.newPrice" ns="priceManage" />, dataIndex: 'new_price', key: 'new_price', width: 100,
      render: (v: number) => <Typography.Text strong>{v?.toFixed(2)}</Typography.Text>,
    },
    { title: <BilingualText textKey="columns.source" ns="priceManage" />, dataIndex: 'source', key: 'source', width: 80 },
    { title: <BilingualText textKey="columns.time" ns="priceManage" />, dataIndex: 'created_at', key: 'created_at', width: 160, render: (v: string) => v?.slice(0, 19) },
  ];

  return (
    <Card
      title={t('title')}
      extra={
        <Space>
          <Select
            style={{ width: 140 }}
            placeholder={t('filterPlaceholder')}
            allowClear
            value={typeFilter || undefined}
            onChange={(v) => setTypeFilter(v || '')}
            options={[
              { value: 'filter', label: t('filterOptions.filter') },
              { value: 'cable', label: t('filterOptions.cable') },
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
