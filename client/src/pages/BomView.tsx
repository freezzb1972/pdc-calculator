import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Table, Statistic, Row, Col, Spin, Typography, Button, Space, Tag, Divider, Descriptions } from 'antd';
import { ArrowLeftOutlined, DownloadOutlined, SafetyOutlined } from '@ant-design/icons';
import { api } from '../api/client';
import type { BomResult } from '../types';

const { Title, Text } = Typography;

const categoryColors: Record<string, string> = {
  '滤波器': 'blue',
  '电缆': 'green',
  '附件': 'orange',
  '设备': 'purple',
};

export default function BomView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const projectId = Number(id);
  const [bom, setBom] = useState<BomResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const [b, p] = await Promise.all([
          api.getBom(projectId),
          api.getProject(projectId),
        ]);
        setBom(b);
        setProject(p);
      } catch (e: any) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [projectId]);

  if (loading) return <Spin style={{ display: 'block', margin: '80px auto' }} />;
  if (!bom) return <Card title="错误">无法加载BOM数据</Card>;

  const columns = [
    {
      title: '类别', dataIndex: 'category', key: 'category', width: 80,
      render: (v: string) => <Tag color={categoryColors[v] || 'default'}>{v}</Tag>,
    },
    { title: '名称', dataIndex: 'description', key: 'description', width: 200 },
    { title: '规格', dataIndex: 'spec', key: 'spec', width: 160 },
    { title: '数量', dataIndex: 'quantity', key: 'quantity', width: 60 },
    { title: '单位', dataIndex: 'unit', key: 'unit', width: 50 },
    {
      title: '单价(¥)', dataIndex: 'unit_price', key: 'unit_price', width: 90,
      render: (v: number) => v?.toFixed(2),
      align: 'right' as const,
    },
    {
      title: '小计(¥)', dataIndex: 'subtotal', key: 'subtotal', width: 100,
      render: (v: number) => v?.toFixed(2),
      align: 'right' as const,
      sorter: (a: any, b: any) => a.subtotal - b.subtotal,
    },
  ];

  const handleExportExcel = () => api.exportProjectExcel(projectId);

  return (
    <div>
      <Card
        title={<><Button icon={<ArrowLeftOutlined />} type="text" onClick={() => navigate(`/projects/${projectId}`)} /> 物料清单 (BOM)</>}
        extra={
          <Space>
            <Button icon={<DownloadOutlined />} type="primary" onClick={handleExportExcel}>导出Excel</Button>
          </Space>
        }
      >
        {/* Summary Stats */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card size="small">
              <Statistic title="滤波器数" value={bom.summary?.filters_count || 0} suffix="个" />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title="电缆总长" value={bom.summary?.cable_total_m?.toFixed(1) || 0} suffix="m" />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title="设备数" value={bom.summary?.device_count || 0} suffix="个" />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" style={{ background: '#f6ffed' }}>
              <Statistic
                title="总价"
                value={bom.grand_total?.toFixed(2) || 0}
                suffix="¥"
                valueStyle={{ color: '#52c41a', fontWeight: 600 }}
              />
            </Card>
          </Col>
        </Row>

        {/* BOM Table */}
        <Table
          rowKey={(_, i) => String(i)}
          columns={columns}
          dataSource={bom.items || []}
          size="small"
          pagination={false}
          summary={() => (
            <Table.Summary fixed>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={6} align="right">
                  <Text strong>合计</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="right">
                  <Text strong style={{ fontSize: 16, color: '#52c41a' }}>
                    ¥{bom.grand_total?.toFixed(2)}
                  </Text>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />
      </Card>
    </div>
  );
}
