import { useState } from 'react';
import { Modal, Form, InputNumber, Space, Button, Typography, Divider, Descriptions, Tag, Card, Row, Col, Alert } from 'antd';
import { CalculatorOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

interface DragChainParams {
  turntableRadius: number;    // 转台半径 (m)
  rotationAngle: number;      // 最大旋转角度 (°)
  cableBendRadius: number;    // 电缆最小弯曲半径 (mm)
  cableOuterDiameter: number; // 电缆外径 (mm)
  cableCount: number;         // 电缆根数
  chainHeight: number;        // 拖链高度 (mm)
  chainWidth: number;         // 拖链宽度 (mm)
}

interface DragChainResult {
  chainLength: number;            // 拖链长度 (m)
  bendingRadius: number;          // 弯曲半径 (mm)
  cablePerLayer: number;          // 每层电缆数
  layers: number;                 // 层数
  chainModel: string;             // 推荐拖链型号
  totalCableLength: number;       // 电缆总长 (m)
}

function calcDragChain(p: DragChainParams): DragChainResult {
  // TODO: 需与工程师讨论确认计算公式
  // 当前为估算公式，待验证：
  // 链长 = π × 转台半径 × 角度/180 + 直线段余量(1.5m)
  const chainLength = Math.PI * p.turntableRadius * p.rotationAngle / 180 + 1.5;

  // 弯曲半径 ≥ 电缆最小弯曲半径 × 1.5 (安全系数)
  const bendingRadius = Math.max(p.cableBendRadius * 1.5, 200);

  // 每层电缆数估算
  const cablePerLayer = Math.max(1, Math.floor((p.chainWidth - 20) / (p.cableOuterDiameter + 5)));
  const layers = Math.ceil(p.cableCount / cablePerLayer);

  // 拖链型号推荐（宽高比匹配）
  const chainModel = `${bendingRadius >= 300 ? '重载' : '标准'}系列 R${bendingRadius}`;

  const totalCableLength = chainLength * p.cableCount;

  return { chainLength, bendingRadius, cablePerLayer, layers, chainModel, totalCableLength };
}

export default function DragChainCalc({ open, onClose }: {
  open: boolean;
  onClose: () => void;
}) {
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
    setResult(calcDragChain(params));
  };

  const fields: { key: keyof DragChainParams; label: string; min?: number; step?: number }[] = [
    { key: 'turntableRadius', label: '转台半径 (m)', min: 0.5, step: 0.1 },
    { key: 'rotationAngle', label: '最大旋转角 (°)', min: 1 },
    { key: 'cableBendRadius', label: '电缆弯曲半径 (mm)', min: 10 },
    { key: 'cableOuterDiameter', label: '电缆外径 (mm)', min: 5 },
    { key: 'cableCount', label: '电缆根数', min: 1 },
    { key: 'chainHeight', label: '拖链高度 (mm)', min: 50 },
    { key: 'chainWidth', label: '拖链宽度 (mm)', min: 50 },
  ];

  return (
    <Modal
      title={<><CalculatorOutlined /> 转台拖链长度计算</>}
      open={open}
      onCancel={onClose}
      footer={null}
      width={700}
    >
      <Alert
        type="info"
        showIcon
        message="公式待确认"
        description="当前计算为预估值，拖链长度和型号选择需与工程师讨论确认。影响参数：转台半径、旋转角度、电缆弯曲半径。"
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
              计算
            </Button>
          </Form>
        </Col>

        <Col span={10}>
          {result && (
            <Card size="small" title="计算结果">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="拖链长度">
                  <Text strong style={{ fontSize: 16 }}>{result.chainLength.toFixed(2)} m</Text>
                </Descriptions.Item>
                <Descriptions.Item label="弯曲半径">{result.bendingRadius} mm</Descriptions.Item>
                <Descriptions.Item label="每层电缆数">{result.cablePerLayer}</Descriptions.Item>
                <Descriptions.Item label="层数">{result.layers}</Descriptions.Item>
                <Descriptions.Item label="推荐型号"><Tag color="blue">{result.chainModel}</Tag></Descriptions.Item>
              </Descriptions>
              <Divider />
              <Text type="secondary">
                电缆总长: {result.totalCableLength.toFixed(2)}m
              </Text>
            </Card>
          )}
        </Col>
      </Row>

      <Divider />
      <Text type="secondary">
        <strong>计算公式说明:</strong><br />
        链长 ≈ π × R × θ/180 + 直线余量(1.5m)<br />
        弯曲半径 ≥ 电缆最小弯曲半径 × 1.5<br />
        <Text type="warning">⚠ 以上公式为估算，需工程师确认</Text>
      </Text>
    </Modal>
  );
}
