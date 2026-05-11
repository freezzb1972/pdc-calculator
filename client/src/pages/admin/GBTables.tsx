import { useEffect, useState } from 'react';
import { Card, Table, Button, Space, Tabs, message, InputNumber, Popconfirm, Typography, Tag } from 'antd';
import { ReloadOutlined, EditOutlined } from '@ant-design/icons';
import { api } from '../../api/client';

interface AmpacityRow {
  id: number;
  cable_type: string;
  installation_method: string;
  cross_section_mm2: number;
  current_rating_a: number;
  temperature_base: number;
  version: string;
}

interface DeratingRow {
  id: number;
  factor_type: string;
  condition_desc: string;
  factor_value: number;
  version: string;
}

interface SafetyRow {
  id: number;
  rule_code: string;
  rule_name: string;
  description: string;
  check_formula: string;
  min_value: number | null;
  max_value: number | null;
  unit: string;
  severity: string;
  version: string;
}

export default function GBTables() {
  const [ampacity, setAmpacity] = useState<AmpacityRow[]>([]);
  const [derating, setDerating] = useState<DeratingRow[]>([]);
  const [safety, setSafety] = useState<SafetyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingCell, setEditingCell] = useState<{ table: string; id: number; field: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getGBTables();
      setAmpacity(res.ampacity || []);
      setDerating(res.derating || []);
      setSafety(res.safety || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleUpdate = async (table: string, id: number, data: any) => {
    try {
      if (table === 'ampacity') {
        await api.updateGBAmpacity(id, data);
      }
      message.success('已更新');
      setEditingCell(null);
      load();
    } catch {
      message.error('更新失败');
    }
  };

  const inlineEdit = (table: string, id: number, field: string, value: any) => {
    const patch = { [field]: value };
    handleUpdate(table, id, patch);
  };

  const ampacityColumns = [
    { title: '电缆类型', dataIndex: 'cable_type', key: 'cable_type', width: 100 },
    { title: '敷设方式', dataIndex: 'installation_method', key: 'installation_method', width: 120 },
    { title: '截面(mm²)', dataIndex: 'cross_section_mm2', key: 'cross_section_mm2', width: 100 },
    { title: '载流量(A)', dataIndex: 'current_rating_a', key: 'current_rating_a', width: 100,
      render: (_: any, r: AmpacityRow) => (
        <span
          style={{ cursor: 'pointer', color: '#1677ff' }}
          onClick={() => {
            const v = prompt('输入新值', String(r.current_rating_a));
            if (v) inlineEdit('ampacity', r.id, 'current_rating_a', parseFloat(v));
          }}
        >{r.current_rating_a}</span>
      ),
    },
    { title: '基准温度', dataIndex: 'temperature_base', key: 'temperature_base', width: 80, render: (v: number) => v ? `${v}°C` : '-' },
    { title: '版本', dataIndex: 'version', key: 'version', width: 150 },
  ];

  const deratingColumns = [
    { title: '校正类型', dataIndex: 'factor_type', key: 'factor_type', width: 100 },
    { title: '条件描述', dataIndex: 'condition_desc', key: 'condition_desc', width: 140 },
    { title: '系数值', dataIndex: 'factor_value', key: 'factor_value', width: 80,
      render: (v: number) => <span style={{ fontWeight: 600 }}>{v?.toFixed(3)}</span>,
    },
    { title: '版本', dataIndex: 'version', key: 'version', width: 150 },
  ];

  const severityColor: Record<string, string> = { error: 'red', warning: 'orange', info: 'blue' };
  const safetyColumns = [
    { title: '规则编号', dataIndex: 'rule_code', key: 'rule_code', width: 130, render: (v: string) => <Tag>{v}</Tag> },
    { title: '规则名称', dataIndex: 'rule_name', key: 'rule_name', width: 140 },
    { title: '说明', dataIndex: 'description', key: 'description', ellipsis: true },
    { title: '最小值', dataIndex: 'min_value', key: 'min_value', width: 70, render: (v: number | null) => v != null ? `${v}${'unit' in ({} as any) ? '' : ''}` : '-' },
    { title: '严重程度', dataIndex: 'severity', key: 'severity', width: 80,
      render: (v: string) => <Tag color={severityColor[v] || 'default'}>{v === 'error' ? '强制' : v === 'warning' ? '建议' : '参考'}</Tag>,
    },
    { title: '版本', dataIndex: 'version', key: 'version', width: 120 },
  ];

  const tabItems = [
    {
      key: 'ampacity',
      label: '载流量表 (GB/T 16895)',
      children: (
        <Table
          rowKey="id"
          columns={ampacityColumns}
          dataSource={ampacity}
          loading={loading}
          size="small"
          pagination={false}
          scroll={{ x: 600 }}
        />
      ),
    },
    {
      key: 'derating',
      label: '校正系数 (GB/T 16895)',
      children: (
        <Table
          rowKey="id"
          columns={deratingColumns}
          dataSource={derating}
          loading={loading}
          size="small"
          pagination={false}
        />
      ),
    },
    {
      key: 'safety',
      label: '安全规则 (GB 50054)',
      children: (
        <Table
          rowKey="id"
          columns={safetyColumns}
          dataSource={safety}
          loading={loading}
          size="small"
          pagination={false}
        />
      ),
    },
  ];

  return (
    <Card
      title="GB标准数据管理"
      extra={
        <Space>
          <Typography.Text type="secondary">参考标准: GB/T 16895, GB 50054, GB 50052, GB 50217</Typography.Text>
          <Button icon={<ReloadOutlined />} onClick={load}>刷新</Button>
        </Space>
      }
    >
      <Tabs items={tabItems} />
    </Card>
  );
}
