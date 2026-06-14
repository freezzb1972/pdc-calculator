import { useState } from 'react';
import { Modal, Form, InputNumber, Space, Button, Typography, Divider, Descriptions, Tag, Card, Row, Col, Alert } from 'antd';
import { CalculatorOutlined } from '@ant-design/icons';
import { useAppTranslation } from '../i18n/useAppTranslation';

const { Text, Title } = Typography;

interface DragChainParams {
  turntableRadius: number;
  rotationAngle: number;
  cableBendRadius: number;
  cableOuterDiameter: number;
  cableCount: number;
  chainHeight: number;
  chainWidth: number;
}

interface DragChainResult {
  chainLength: number;
  bendingRadius: number;
  cablePerLayer: number;
  layers: number;
  chainModel: string;
  totalCableLength: number;
}

export default function DragChainCalc({ open, onClose }: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useAppTranslation('dragchain');
  const [params, setParams] = useState<DragChainParams>({
    turntableRadius: 4,
    rotationAngle: 270,
    cableBendRadius: 120,
    cableOuterDiameter: 30,
    cableCount: 4,
    chainHeight: 100,
    chainWidth: 200,
  });
  const [result, setResult] = useState<DragChainResult | null>(null);

  const handleCalc = () => {
    // TODO: 需与工程师讨论确认计算公式
    // 当前为估算公式，待验证：
    // 链长 = π × 转台半径 × 角度/180 + 直线段余量(1.5m)
    const chainLength = Math.PI * params.turntableRadius * params.rotationAngle / 180 + 1.5;

    // 弯曲半径 ≥ 电缆最小弯曲半径 × 1.5 (安全系数)
    const bendingRadius = Math.max(params.cableBendRadius * 1.5, 200);

    // 每层电缆数估算
    const cablePerLayer = Math.max(1, Math.floor((params.chainWidth - 20) / (params.cableOuterDiameter + 5)));
    const layers = Math.ceil(params.cableCount / cablePerLayer);

    // 拖链型号推荐（宽高比匹配）
    const chainModel = `${bendingRadius >= 300 ? t('models.heavy') : t('models.standard')}${t('models.series')} R${bendingRadius}`;

    const totalCableLength = chainLength * params.cableCount;

    setResult({ chainLength, bendingRadius, cablePerLayer, layers, chainModel, totalCableLength });
  };

  const fields: { key: keyof DragChainParams; label: string; min?: number; step?: number }[] = [
    { key: 'turntableRadius', label: t('labels.turntableRadius'), min: 0.5, step: 0.1 },
    { key: 'rotationAngle', label: t('labels.maxAngle'), min: 1 },
    { key: 'cableBendRadius', label: t('labels.bendRadius'), min: 10 },
    { key: 'cableOuterDiameter', label: t('labels.cableDiameter'), min: 5 },
    { key: 'cableCount', label: t('labels.cableCount'), min: 1 },
    { key: 'chainHeight', label: t('labels.chainHeight'), min: 50 },
    { key: 'chainWidth', label: t('labels.chainWidth'), min: 50 },
  ];

  return (
    <Modal
      title={<><CalculatorOutlined /> {t('title')}</>}
      open={open}
      onCancel={onClose}
      footer={null}
      width={700}
    >
      <Alert
        type="info"
        showIcon
        message={t('alert.title')}
        description={t('alert.desc')}
        style={{ marginBottom: 16 }}
      />

      <Row gutter={16}>
        <Col span={14}>
          <Form layout="vertical" size="small">
            {fields.map(f => (
              <Form.Item key={f.key} label={f.label}>
                <InputNumber
                  style={{ width: '100%' }}
                  min={f.min || 0}
                  step={f.step || 1}
                  value={params[f.key]}
                  onChange={(v) => setParams({ ...params, [f.key]: v || 0 })}
                />
              </Form.Item>
            ))}
            <Button type="primary" icon={<CalculatorOutlined />} onClick={handleCalc} block>
              {t('btnCalculate')}
            </Button>
          </Form>
        </Col>

        <Col span={10}>
          {result && (
            <Card size="small" title={t('result.title')}>
              <Descriptions column={1} size="small">
                <Descriptions.Item label={t('result.chainLength')}>
                  <Text strong style={{ fontSize: 16 }}>{result.chainLength.toFixed(2)} m</Text>
                </Descriptions.Item>
                <Descriptions.Item label={t('result.bendRadius')}>{result.bendingRadius} mm</Descriptions.Item>
                <Descriptions.Item label={t('result.cablesPerLayer')}>{result.cablePerLayer}</Descriptions.Item>
                <Descriptions.Item label={t('result.layers')}>{result.layers}</Descriptions.Item>
                <Descriptions.Item label={t('result.recommendedModel')}><Tag color="blue">{result.chainModel}</Tag></Descriptions.Item>
              </Descriptions>
              <Divider />
              <Text type="secondary">
                {t('result.totalCableLength')}: {result.totalCableLength.toFixed(2)}m
              </Text>
            </Card>
          )}
        </Col>
      </Row>

      <Divider />
      <Text type="secondary">
        <strong>{t('formula.title')}</strong><br />
        {t('formula.chainLength')}<br />
        {t('formula.bendRadius')}<br />
        <Text type="warning">{t('formula.warning')}</Text>
      </Text>
    </Modal>
  );
}
