import { useEffect, useState } from 'react';
import { Modal, Table, Tag, Descriptions, Result, Spin, Statistic, Row, Col, Card } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { api } from '../api/client';
import type { GBCheckResult } from '../types';
import { useAppTranslation } from '../i18n/useAppTranslation';

interface CheckResponse {
  project_name: string;
  results: GBCheckResult[];
  summary: { pass: number; warn: number; fail: number };
}

function statusIcon(status: string) {
  switch (status) {
    case 'pass': return <CheckCircleOutlined />;
    case 'warn': return <WarningOutlined />;
    case 'fail': return <CloseCircleOutlined />;
    default: return null;
  }
}

function statusColor(status: string) {
  switch (status) {
    case 'pass': return 'green';
    case 'warn': return 'orange';
    case 'fail': return 'red';
    default: return 'default';
  }
}

export default function ComplianceReport({ open, onClose, projectId }: {
  open: boolean;
  onClose: () => void;
  projectId: number;
}) {
  const { t } = useAppTranslation('compliance');
  const [data, setData] = useState<CheckResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    api.getGBCheck(projectId)
      .then((d) => setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [open, projectId]);

  const columns = [
    {
      title: t('columns.item'), dataIndex: 'check_name', key: 'check_name', width: 120,
    },
    {
      title: t('columns.standard'), dataIndex: 'standard', key: 'standard', width: 100,
    },
    {
      title: t('columns.status'), dataIndex: 'status', key: 'status', width: 70,
      render: (v: string) => (
        <Tag color={statusColor(v)} icon={statusIcon(v)}>
          {v === 'pass' ? t('stats.pass') : v === 'warn' ? t('stats.warning') : t('stats.fail')}
        </Tag>
      ),
    },
    { title: t('columns.description'), dataIndex: 'message', key: 'message' },
    { title: t('columns.source'), dataIndex: 'detail', key: 'detail', ellipsis: true, width: 180 },
  ];

  const summary = data?.summary;
  const allPass = summary && summary.fail === 0;

  return (
    <Modal
      title={t('title')}
      open={open}
      onCancel={onClose}
      footer={null}
      width={960}
    >
      <Descriptions size="small" column={1} style={{ marginBottom: 16 }}>
        <Descriptions.Item label={t('project')}>{data?.project_name || '-'}</Descriptions.Item>
        <Descriptions.Item label={t('reference')}>
          GB 50054-2011, GB/T 16895.15-2022, GB 50052-2009, GB 50217-2018
        </Descriptions.Item>
      </Descriptions>

      {loading ? (
        <Spin style={{ display: 'block', margin: '60px auto' }} />
      ) : error ? (
        <Result status="error" title={error} />
      ) : !data ? (
        <Result title={t('noData')} subTitle={t('noDataHint')} />
      ) : (
        <>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}>
              <Card size="small"><Statistic title={t('stats.pass')} value={summary?.pass || 0} valueStyle={{ color: '#52c41a' }} suffix="项" /></Card>
            </Col>
            <Col span={6}>
              <Card size="small"><Statistic title={t('stats.warning')} value={summary?.warn || 0} valueStyle={{ color: '#faad14' }} suffix="项" /></Card>
            </Col>
            <Col span={6}>
              <Card size="small"><Statistic title={t('stats.fail')} value={summary?.fail || 0} valueStyle={{ color: '#ff4d4f' }} suffix="项" /></Card>
            </Col>
            <Col span={6}>
              <Card size="small" style={{ background: allPass ? '#f6ffed' : '#fff2f0' }}>
                <Statistic title={t('stats.conclusion')} value={allPass ? t('stats.allPass') : t('stats.needFix')} valueStyle={{ color: allPass ? '#52c41a' : '#ff4d4f' }} />
              </Card>
            </Col>
          </Row>

          {data.results.length === 0 ? (
            <Result icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />} title={t('allPassed')} />
          ) : (
            <Table
              rowKey={(r, i) => `${r.check_name}-${i}`}
              columns={columns}
              dataSource={data.results}
              size="small"
              pagination={{ pageSize: 20 }}
            />
          )}
        </>
      )}
    </Modal>
  );
}
