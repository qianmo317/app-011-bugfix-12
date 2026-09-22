import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStore } from '../store';
import type { Outlet, OutletKind } from '../types';
import { getWallSegments, formatMm } from '../utils/geometry';
import { parseNonNegativeMm } from '../utils/validation';

const KIND_LABEL: Record<OutletKind, string> = {
  socket: '插座',
  switch: '开关',
  net: '网口',
  light: '灯位',
  water: '水口',
};

export default function WallEditor() {
  const { id } = useParams<{ id: string }>();
  const { getPlan, addOutlet, deleteOutlet } = useStore();
  const plan = getPlan(id!);

  const [roomId, setRoomId] = useState('');
  const [wallIndex, setWallIndex] = useState('0');
  const [xMm, setXMm] = useState('0');
  const [heightMm, setHeightMm] = useState('300');
  const [kind, setKind] = useState<Outlet['kind']>('socket');
  const [circuit, setCircuit] = useState('');
  const [error, setError] = useState('');

  const selectedRoom = plan?.rooms.find((r) => r.id === roomId);
  const wallSegs = selectedRoom ? getWallSegments(selectedRoom) : [];
  // 换房间后墙面编号一律回到 0，并按新房间的墙数兜底，避免点位画到不存在的墙上
  const safeWallIndex = selectedRoom
    ? Math.min(Math.max(parseInt(wallIndex) || 0, 0), wallSegs.length - 1)
    : 0;
  const selectedWall = wallSegs[safeWallIndex];
  const wallKey = selectedRoom ? `${selectedRoom.id}-${safeWallIndex}` : '';

  const handleRoomChange = (nextRoomId: string) => {
    setRoomId(nextRoomId);
    setWallIndex('0');
    setError('');
  };

  const handleAdd = () => {
    if (!plan || !selectedRoom || !selectedWall || !wallKey) return;

    const xValue = parseNonNegativeMm(xMm);
    const heightValue = parseNonNegativeMm(heightMm);

    if (xValue === null) {
      setError('距墙左端必须是不小于 0 的整数（mm），不能为空格或负数');
      return;
    }
    if (heightValue === null) {
      setError('距地高度必须是不小于 0 的整数（mm），不能为空格或负数');
      return;
    }
    if (xValue > selectedWall.lengthMm) {
      setError(`距墙左端（${xValue}mm）超出该墙长度（${selectedWall.lengthMm.toFixed(0)}mm），点位画不到墙上`);
      return;
    }
    if (heightValue > selectedRoom.heightMm) {
      setError(`距地高度（${heightValue}mm）不能超过房间层高（${selectedRoom.heightMm}mm）`);
      return;
    }

    const outlet: Outlet = {
      id: Math.random().toString(36).slice(2) + Date.now().toString(36),
      wallKey,
      xMm: xValue,
      heightMm: heightValue,
      kind,
      circuit: circuit.trim() || undefined,
    };
    addOutlet(plan.id, outlet);
    setError('');
  };

  const wallOutlets = plan && wallKey ? plan.outlets.filter((o) => o.wallKey === wallKey) : [];

  // 页头只统计当前所选房间的点位；未选房间时各计数为 0
  const roomOutlets = plan && selectedRoom
    ? plan.outlets.filter((o) => o.wallKey.startsWith(`${selectedRoom.id}-`))
    : [];
  const countByKind = (k: OutletKind) => roomOutlets.filter((o) => o.kind === k).length;

  if (!plan) {
    return <div className="card">方案不存在</div>;
  }

  return (
    <div>
      <h2 className="page-title">{plan.name} - 墙面展开与点位标注</h2>

      <div className="tabs">
        <Link to={`/plan/${id}`} className="tab">
          平面绘制
        </Link>
        <Link to={`/plan/${id}/walls`} className="tab active">
          墙面点位
        </Link>
        <Link to={`/plan/${id}/bom`} className="tab">
          材料清单
        </Link>
        <Link to={`/plan/${id}/print`} className="tab">
          导出打印
        </Link>
      </div>

      <div className="info-bar">
        <span style={{ fontWeight: 500 }}>
          {selectedRoom ? `当前房间: ${selectedRoom.name}` : '当前房间: 未选择'}
        </span>
        <span>插座: <strong>{countByKind('socket')}</strong></span>
        <span>开关: <strong>{countByKind('switch')}</strong></span>
        <span>网口: <strong>{countByKind('net')}</strong></span>
        <span>灯位: <strong>{countByKind('light')}</strong></span>
        <span>水口: <strong>{countByKind('water')}</strong></span>
        <span>合计: <strong>{roomOutlets.length}</strong></span>
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ width: 320 }}>
          <div className="card">
            <h3 style={{ marginBottom: 12, fontSize: 16 }}>添加点位</h3>
            <div className="form-group">
              <label>房间</label>
              <select value={roomId} onChange={(e) => handleRoomChange(e.target.value)}>
                <option value="">选择房间</option>
                {plan.rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedRoom && (
              <>
                <div className="form-group">
                  <label>墙面</label>
                  <select value={safeWallIndex} onChange={(e) => setWallIndex(e.target.value)}>
                    {wallSegs.map((s, i) => (
                      <option key={i} value={i}>
                        墙{i + 1} ({formatMm(s.lengthMm)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>类型</label>
                  <select value={kind} onChange={(e) => setKind(e.target.value as Outlet['kind'])}>
                    <option value="socket">插座</option>
                    <option value="switch">开关</option>
                    <option value="net">网口</option>
                    <option value="light">灯位</option>
                    <option value="water">水口</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>距墙左端 (mm)</label>
                  <input value={xMm} onChange={(e) => { setXMm(e.target.value); setError(''); }} />
                </div>
                <div className="form-group">
                  <label>距地高度 (mm)</label>
                  <input value={heightMm} onChange={(e) => { setHeightMm(e.target.value); setError(''); }} />
                </div>
                <div className="form-group">
                  <label>回路 (可选)</label>
                  <input value={circuit} onChange={(e) => setCircuit(e.target.value)} placeholder="如: L1" />
                </div>

                {error && (
                  <div style={{ color: '#e74c3c', fontSize: 12, marginBottom: 8 }}>{error}</div>
                )}

                <button className="btn btn-primary" onClick={handleAdd} style={{ width: '100%' }}>
                  添加点位
                </button>
              </>
            )}
          </div>

          {wallOutlets.length > 0 && (
            <div className="card" style={{ marginTop: 16 }}>
              <h4 style={{ fontSize: 14, marginBottom: 8 }}>当前墙面点位</h4>
              {wallOutlets.map((o) => (
                <div
                  key={o.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '6px 0',
                    borderBottom: '1px solid #ecf0f1',
                    fontSize: 13,
                  }}
                >
                  <span>
                    {KIND_LABEL[o.kind]}
                    {' '}@{formatMm(o.xMm)} 高{formatMm(o.heightMm)}
                    {o.circuit ? ` (${o.circuit})` : ''}
                  </span>
                  <button className="btn btn-danger" onClick={() => deleteOutlet(plan.id, o.id)}>
                    删除
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ flex: 1 }}>
          <div className="card">
            <h3 style={{ marginBottom: 12, fontSize: 16 }}>墙面展开图</h3>
            <WallDiagram plan={plan} />
          </div>
        </div>
      </div>
    </div>
  );
}

function WallDiagram({ plan }: { plan: { rooms: Array<{ id: string; name: string; polygon: { x: number; y: number }[]; heightMm: number; floorMat: string; wallMat: string }>; outlets: Outlet[] } }) {
  const wallHeight = 120;
  const wallGap = 20;
  let y = 20;

  return (
    <svg width="100%" height={plan.rooms.length * (wallHeight + wallGap) + 40}>
      {plan.rooms.map((room) => {
        const segs = getWallSegments(room);
        const maxLen = Math.max(...segs.map((s) => s.lengthMm), 1);
        const scale = 600 / maxLen;
        let x = 20;
        const roomY = y;
        y += wallHeight + wallGap;

        return (
          <g key={room.id}>
            <text x={20} y={roomY - 4} fontSize="12" fill="#2c3e50" fontWeight="500">
              {room.name}
            </text>
            {segs.map((seg, i) => {
              const w = seg.lengthMm * scale;
              const wallKey = `${room.id}-${i}`;
              const outlets = plan.outlets.filter((o) => o.wallKey === wallKey);

              return (
                <g key={i}>
                  <rect x={x} y={roomY} width={w} height={wallHeight} fill="#f8f9fa" stroke="#7f8c8d" strokeWidth={1} />
                  <text x={x + w / 2} y={roomY + wallHeight / 2 + 4} fontSize="10" fill="#999" textAnchor="middle">
                    墙{i + 1}
                  </text>
                  {outlets.map((o) => {
                    const ox = x + Math.min(Math.max(o.xMm, 0), seg.lengthMm) * scale;
                    const oy = roomY + wallHeight - (Math.min(Math.max(o.heightMm, 0), room.heightMm) / room.heightMm) * wallHeight;
                    const color =
                      o.kind === 'socket'
                        ? '#e74c3c'
                        : o.kind === 'switch'
                        ? '#3498db'
                        : o.kind === 'net'
                        ? '#9b59b6'
                        : o.kind === 'light'
                        ? '#f39c12'
                        : '#1abc9c';
                    return (
                      <g key={o.id}>
                        <circle cx={ox} cy={oy} r={5} fill={color} stroke="white" strokeWidth={1} />
                        <text x={ox} y={oy - 8} fontSize="8" fill={color} textAnchor="middle">
                          {o.kind === 'socket' ? '插' : o.kind === 'switch' ? '开' : o.kind === 'net' ? '网' : o.kind === 'light' ? '灯' : '水'}
                        </text>
                      </g>
                    );
                  })}
                  <text x={x + w / 2} y={roomY + wallHeight + 12} fontSize="9" fill="#666" textAnchor="middle">
                    {formatMm(seg.lengthMm)}
                  </text>
                  {x += w + 4}
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}
