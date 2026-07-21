import { Card, Typography, Table, Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import type { DashboardData, TrendItem, RankingItem } from '../types';

const { Text } = Typography;

const dashboardData: DashboardData = {
  kb_count: 8,
  doc_count: 52,
  query_count: 1203,
  trend_7d: [
    { date: '07-15', count: 45 },
    { date: '07-16', count: 62 },
    { date: '07-17', count: 38 },
    { date: '07-18', count: 75 },
    { date: '07-19', count: 55 },
    { date: '07-20', count: 88 },
    { date: '07-21', count: 103 },
  ],
  kb_ranking: [
    { name: '技术文档知识库', queries: 456 },
    { name: '产品手册知识库', queries: 321 },
    { name: '规章制度知识库', queries: 198 },
    { name: '运维手册', queries: 112 },
    { name: '新人指南', queries: 87 },
    { name: 'API 参考文档', queries: 65 },
    { name: '培训资料', queries: 43 },
    { name: '客户FAQ', queries: 21 },
  ],
};

export default function DashboardPage() {
  const maxCount = Math.max(...dashboardData.trend_7d.map((d: TrendItem) => d.count));

  const rankColumns = [
    {
      title: '#',
      dataIndex: '_index',
      width: 60,
      render: (_: unknown, __: RankingItem, index: number) => (
        <span
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            fontWeight: 600,
            fontFamily: 'monospace',
            background: index < 3 ? '#2f6feb' : undefined,
            color: index < 3 ? '#fff' : undefined,
          }}
        >
          {index + 1}
        </span>
      ),
    },
    {
      title: '知识库',
      dataIndex: 'name',
      render: (name: string, record: RankingItem) => (
        <div>
          {name}
          <div
            style={{
              height: 6,
              borderRadius: 3,
              background: '#2f6feb',
              opacity: 0.3,
              marginTop: 4,
              width: `${(record.queries / dashboardData.kb_ranking[0].queries) * 100}%`,
            }}
          />
        </div>
      ),
    },
    {
      title: '查询数',
      dataIndex: 'queries',
      width: 100,
      align: 'right' as const,
      render: (v: number) => <span style={{ fontFamily: 'monospace' }}>{v.toLocaleString()}</span>,
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Text style={{ fontSize: 20, fontWeight: 600 }}>仪表盘</Text>
        <Button icon={<ReloadOutlined />}>刷新</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 24 }}>
        <Card style={{ borderRadius: 12 }}>
          <Text type="secondary" style={{ fontSize: 14, display: 'block' }}>
            知识库总数
          </Text>
          <Text style={{ fontSize: 36, fontWeight: 700, fontFamily: 'Inter, sans-serif', letterSpacing: '-0.02em' }}>
            {dashboardData.kb_count}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            管理多个知识库
          </Text>
        </Card>
        <Card style={{ borderRadius: 12 }}>
          <Text type="secondary" style={{ fontSize: 14, display: 'block' }}>
            文档总数
          </Text>
          <Text style={{ fontSize: 36, fontWeight: 700, fontFamily: 'Inter, sans-serif', letterSpacing: '-0.02em' }}>
            {dashboardData.doc_count}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            已就绪 48 · 处理中 2 · 失败 2
          </Text>
        </Card>
        <Card style={{ borderRadius: 12 }}>
          <Text type="secondary" style={{ fontSize: 14, display: 'block' }}>
            总提问数
          </Text>
          <Text style={{ fontSize: 36, fontWeight: 700, fontFamily: 'Inter, sans-serif', letterSpacing: '-0.02em' }}>
            {dashboardData.query_count.toLocaleString()}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            近 7 天活跃趋势上升
          </Text>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20 }}>
        <Card
          title="7 天提问趋势"
          extra={<Button type="text" icon={<ReloadOutlined />} />}
          style={{ borderRadius: 12 }}
        >
          <div style={{ height: 240, display: 'flex', alignItems: 'flex-end', gap: 12, padding: '0 8px 24px', borderBottom: '1px solid #f0f0f0' }}>
            {dashboardData.trend_7d.map((d: TrendItem) => (
              <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
                <div
                  style={{
                    width: '100%',
                    maxWidth: 40,
                    borderRadius: '4px 4px 0 0',
                    background: '#2f6feb',
                    height: `${(d.count / maxCount) * 100}%`,
                    minHeight: 4,
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'opacity 150ms',
                  }}
                  title={`${d.date}: ${d.count} 次`}
                />
                <Text style={{ fontSize: 11, color: '#6b6b6b', fontFamily: 'monospace' }}>{d.date}</Text>
              </div>
            ))}
          </div>
        </Card>

        <Card title="活跃知识库排行" style={{ borderRadius: 12 }}>
          <Table
            columns={rankColumns}
            dataSource={dashboardData.kb_ranking}
            rowKey="name"
            pagination={false}
            size="small"
            showHeader={false}
          />
        </Card>
      </div>
    </div>
  );
}
