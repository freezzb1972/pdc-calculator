import { useEffect, useState } from 'react';
import { Card, Table, Button, Space, Tabs, message, Typography } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { api } from '../../api/client';
import { useAppTranslation } from '../../i18n/useAppTranslation';
import BilingualText from '../../i18n/BilingualText';

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
  const { t } = useAppTranslation('gbTables');
  const [ampacity, setAmpacity] = useState<AmpacityRow[]>([]);
  const [derating, setDerating] = useState<DeratingRow[]>([]);
  const [safety, setSafety] = useState<SafetyRow[]>([]);
  const [loading, setLoading] = useState(false);

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
      message.success(t('messages.updated'));
      load();
    } catch {
      message.error(t('messages.updateFailed'));
    }
  };

  const inlineEdit = (table: string, id: number, field: string, value: any) => {
    const patch = { [field]: value };
    handleUpdate(table, id, patch);
  };

  const ampacityColumns = [
    { title: <BilingualText textKey="ampacity.columns.cableType" ns="gbTables" />, dataIndex: 'cable_type', key: 'cable_type', width: 100 },
    { title: <BilingualText textKey="ampacity.columns.layingMethod" ns="gbTables" />, dataIndex: 'installation_method', key: 'installation_method', width: 120 },
    { title: <BilingualText textKey="ampacity.columns.crossSection" ns="gbTables" />, dataIndex: 'cross_section_mm2', key: 'cross_section_mm2', width: 100 },
    { title: <BilingualText textKey="ampacity.columns.ampacity" ns="gbTables" />, dataIndex: 'current_rating_a', key: 'current_rating_a', width: 100,
      render: (_: any, r: AmpacityRow) => (
        <span
          style={{ cursor: 'pointer', color: '#1677ff' }}
          onClick={() => {
            const v = prompt(t('ampacity.editPrompt'), String(r.current_rating_a));
            if (v) inlineEdit('ampacity', r.id, 'current_rating_a', parseFloat(v));
          }}
        >{r.current_rating_a}</span>
      ),
    },
    { title: <BilingualText textKey="ampacity.columns.baseTemp" ns="gbTables" />, dataIndex: 'temperature_base', key: 'temperature_base', width: 80, render: (v: number) => v ? `${v}°C` : '-' },
    { title: <BilingualText textKey="ampacity.columns.version" ns="gbTables" />, dataIndex: 'version', key: 'version', width: 150 },
  ];

  const deratingColumns = [
    { title: <BilingualText textKey="derating.columns.correctionType" ns="gbTables" />, dataIndex: 'factor_type', key: 'factor_type', width: 100 },
    { title: <BilingualText textKey="derating.columns.condition" ns="gbTables" />, dataIndex: 'condition_desc', key: 'condition_desc', width: 140 },
    { title: <BilingualText textKey="derating.columns.factorValue" ns="gbTables" />, dataIndex: 'factor_value', key: 'factor_value', width: 80,
      render: (v: number) => <span style={{ fontWeight: 600 }}>{v?.toFixed(3)}</span>,
    },
    { title: <BilingualText textKey="derating.columns.version" ns="gbTables" />, dataIndex: 'version', key: 'version', width: 150 },
  ];

  const severityMap: Record<string, string> = {
    error: t('safetyRules.severity.mandatory'),
    warning: t('safetyRules.severity.recommended'),
    info: t('safetyRules.severity.reference'),
  };
  const severityColor: Record<string, string> = { error: 'red', warning: 'orange', info: 'blue' };

  const safetyColumns = [
    { title: <BilingualText textKey="safetyRules.columns.ruleNo" ns="gbTables" />, dataIndex: 'rule_code', key: 'rule_code', width: 130, render: (v: string) => <span style={{
      display: 'inline-block',
      padding: '0 7px',
      fontSize: 12,
      lineHeight: '20px',
      border: '1px solid #d9d9d9',
      borderRadius: 4,
    }}>{v}</span> },
    { title: <BilingualText textKey="safetyRules.columns.ruleName" ns="gbTables" />, dataIndex: 'rule_name', key: 'rule_name', width: 140 },
    { title: <BilingualText textKey="safetyRules.columns.description" ns="gbTables" />, dataIndex: 'description', key: 'description', ellipsis: true },
    { title: <BilingualText textKey="safetyRules.columns.minValue" ns="gbTables" />, dataIndex: 'min_value', key: 'min_value', width: 70, render: (v: number | null) => v != null ? v : '-' },
    { title: <BilingualText textKey="safetyRules.columns.severity" ns="gbTables" />, dataIndex: 'severity', key: 'severity', width: 80,
      render: (v: string) => <span style={{
        display: 'inline-block',
        padding: '0 7px',
        fontSize: 12,
        lineHeight: '20px',
        color: severityColor[v] || undefined,
        border: `1px solid ${severityColor[v] || '#d9d9d9'}`,
        borderRadius: 4,
      }}>{severityMap[v] || v}</span>,
    },
    { title: <BilingualText textKey="safetyRules.columns.version" ns="gbTables" />, dataIndex: 'version', key: 'version', width: 120 },
  ];

  const tabItems = [
    {
      key: 'ampacity',
      label: <BilingualText textKey="tabs.ampacity" ns="gbTables" />,
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
      label: <BilingualText textKey="tabs.derating" ns="gbTables" />,
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
      label: <BilingualText textKey="tabs.safetyRules" ns="gbTables" />,
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
      title={t('title')}
      extra={
        <Space>
          <Typography.Text type="secondary">{t('reference')}</Typography.Text>
          <Button icon={<ReloadOutlined />} onClick={load}>{t('btnRefresh')}</Button>
        </Space>
      }
    >
      <Tabs items={tabItems} />
    </Card>
  );
}
