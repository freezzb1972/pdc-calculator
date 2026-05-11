import { useEffect, useState } from 'react';
import { Modal, Table, Tag, Descriptions, Result, Spin, Statistic, Row, Col, Card } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { api } from '../api/client';
import type { GBCheckResult } from '../types';

interface CheckResponse {
  project_name: string;
  results: GBCheckResult[];
  summary: { pass: number; warn: number; fail: number };
}

export default function ComplianceReport({ open, onClose, projectId }: {
  open: boolean;
  onClose: () => void;
  projectId: number;
}) {
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

  const statusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircleOutlined />;
      case 'warn': return <WarningOutlined />;
      case 'fail': return <CloseCircleOutlined />;
      default: return null;
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'pass': return 'green';
      case 'warn': return 'orange';
      case 'fail': return 'red';
      default: return 'default';
    }
  };

  const columns = [
    {
      title: '校验项', dataIndex: 'check_name', key: 'check_name', width: 120,
    },
    {
      title: '标准', dataIndex: 'standard', key: 'standard', width: 100,
    },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 70,
      render: (v: string) => (
        <Tag color={statusColor(v)} icon={statusIcon(v)}>
          {v === 'pass' ? '通过' : v === 'warn' ? '警告' : '不通过'}
        </Tag>
      ),
    },
    { title: '描述', dataIndex: 'message', key: 'message' },
    { title: '回路/线段', dataIndex: 'detail', key: 'detail', ellipsis: true, width: 180 },
  ];

  const summary = data?.summary;
  const allPass = summary && summary.fail === 0;

  return (
    <Modal
      title="GB标准合规校验"
      open={open}
      onCancel={onClose}
      footer={null}
      width={960}
    >
      <Descriptions size="small" column={1} style={{ marginBottom: 16 }}>
        <Descriptions.Item label="项目">{data?.project_name || '-'}</Descriptions.Item>
        <Descriptions.Item label="参考标准">
          GB 50054-2011, GB/T 16895.15-2022, GB 50052-2009, GB 50217-2018
        </Descriptions.Item>
      </Descriptions>

      {loading ? (
        <Spin style={{ display: 'block', margin: '60px auto' }} />
      ) : error ? (
        <Result status="error" title="加载失败" subTitle={error} />
      ) : !data ? (
        <Result title="无数据" subTitle="请先配置项目回路和线缆段" />
      ) : (
        <>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}>
              <Card size="small"><Statistic title="通过" value={summary?.pass || 0} valueStyle={{ color: '#52c41a' }} suffix="项" /></Card>
            </Col>
            <Col span={6}>
              <Card size="small"><Statistic title="警告" value={summary?.warn || 0} valueStyle={{ color: '#faad14' }} suffix="项" /></Card>
            </Col>
            <Col span={6}>
              <Card size="small"><Statistic title="不通过" value={summary?.fail || 0} valueStyle={{ color: '#ff4d4f' }} suffix="项" /></Card>
            </Col>
            <Col span={6}>
              <Card size="small" style={{ background: allPass ? '#f6ffed' : '#fff2f0' }}>
                <Statistic title="结论" value={allPass ? '全部通过' : '需整改'} valueStyle={{ color: allPass ? '#52c41a' : '#ff4d4f' }} />
              </Card>
            </Col>
          </Row>

          {data.results.length === 0 ? (
            <Result icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />} title="所有校验通过" />
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
