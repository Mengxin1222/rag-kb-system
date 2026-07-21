import { useState, useEffect } from 'react';
import { Card, Typography, Table, Button, Spin, Empty } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { getDashboard, type DashboardResponse } from '../api/admin';
import { listKBs } from '../api/kb';

const { Text } = Typography;

export default function DashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [dash, kbs] = await Promise.all([getDashboard(), listKBs()]);
      // Resolve kb names for ranking
      const kbMap = new Map(kbs.map((kb) => [kb.id, kb.name]));
      setData({
        ...dash,
        kb_ranking: dash.kb_ranking.map((r) => ({ ...r, kb_name: kbMap.get(r.kb_id) || `知识库#${r.kb_id}` }) as any),
      });
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div>;
  }

  if (!data) {
    return <Empty description="无法获取仪表盘数据" />;
  }

  const maxCount = Math.max(...(data.trend_7d.length > 0 ? data.trend_7d.map((d) => d.count) : [1]));

  const rankColumns = [
    {
      title: '#',
      width: 60,
      render: (_: unknown, __: unknown, index: number) => (
        <span
          style={{
            width: 28, height: 28, borderRadius: '50%',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 600, fontFamily: 'monospace',
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
      dataIndex: 'kb_name',
      render: (name: string, record: any) => (
        <div>
          {name}
          <div style={{ height: 6, borderRadius: 3, background: '#2f6feb', opacity: 0.3, marginTop: 4, width: `${(record.count / data.kb_ranking[0]?.count || 1) * 100}%` }} />
        </div>
      ),
    },
    {
      title: '查询数',
      dataIndex: 'count',
      width: 100,
      align: 'right' as const,
      render: (v: number) => <span style={{ fontFamily: 'monospace' }}>{v.toLocaleString()}</span>,
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Text style={{ fontSize: 20, fontWeight: 600 }}>仪表盘</Text>
        <Button icon={<ReloadOutlined />} onClick={fetchData}>刷新</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 24 }}>
        <Card style={{ borderRadius: 12 }}>
          <Text type="secondary" style={{ fontSize: 14, display: 'block' }}>知识库总数</Text>
          <Text style={{ fontSize: 36, fontWeight: 700 }}>{data.kb_count}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>管理多个知识库</Text>
        </Card>
        <Card style={{ borderRadius: 12 }}>
          <Text type="secondary" style={{ fontSize: 14, display: 'block' }}>文档总数</Text>
          <Text style={{ fontSize: 36, fontWeight: 700 }}>{data.doc_count}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>失败 {data.doc_failed}</Text>
        </Card>
        <Card style={{ borderRadius: 12 }}>
          <Text type="secondary" style={{ fontSize: 14, display: 'block' }}>总提问数</Text>
          <Text style={{ fontSize: 36, fontWeight: 700 }}>{data.query_count.toLocaleString()}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>切片 {data.chunk_count}</Text>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20 }}>
        <Card title="7 天提问趋势" extra={<Button type="text" icon={<ReloadOutlined />} onClick={fetchData} />} style={{ borderRadius: 12 }}>
          {data.trend_7d.length === 0 ? (
            <Empty description="暂无数据" />
          ) : (
            <div style={{ height: 240, display: 'flex', alignItems: 'flex-end', gap: 12, padding: '0 8px 24px', borderBottom: '1px solid #f0f0f0' }}>
              {data.trend_7d.map((d) => (
                <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
                  <div
                    style={{
                      width: '100%', maxWidth: 40, borderRadius: '4px 4px 0 0',
                      background: '#2f6feb', height: `${(d.count / maxCount) * 100}%`,
                      minHeight: 4, cursor: 'pointer', position: 'relative',
                    }}
                    title={`${d.date}: ${d.count} 次`}
                  />
                  <Text style={{ fontSize: 11, color: '#6b6b6b', fontFamily: 'monospace' }}>{d.date}</Text>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="活跃知识库排行" style={{ borderRadius: 12 }}>
          {data.kb_ranking.length === 0 ? (
            <Empty description="暂无数据" />
          ) : (
            <Table columns={rankColumns} dataSource={data.kb_ranking} rowKey="kb_id" pagination={false} size="small" showHeader={false} />
          )}
        </Card>
      </div>
    </div>
  );
}
