import { useState } from 'react';
import { useStore } from '../store';
import type { Room, Opening } from '../types';
import { getWallSegments } from '../utils/geometry';

interface Props {
  planId: string;
  rooms: Room[];
  openings: Opening[];
}

export default function OpeningEditor({ planId, rooms, openings }: Props) {
  const { addOpening, deleteOpening } = useStore();
  const [roomId, setRoomId] = useState('');
  const [wallIndex, setWallIndex] = useState('0');
  const [offsetMm, setOffsetMm] = useState('0');
  const [widthMm, setWidthMm] = useState('900');
  const [heightMm, setHeightMm] = useState('2100');
  const [type, setType] = useState<Opening['type']>('door');
  const [error, setError] = useState('');

  const selectedRoom = rooms.find((r) => r.id === roomId);
  const wallSegs = selectedRoom ? getWallSegments(selectedRoom) : [];
  const wallIdx = Math.min(Math.max(parseInt(wallIndex) || 0, 0), Math.max(wallSegs.length - 1, 0));
  const selectedWall = wallSegs[wallIdx];

  const handleAdd = () => {
    if (!roomId || !selectedRoom || !selectedWall) return;
    const offsetValue = Number(offsetMm);
    const widthValue = Number(widthMm);
    const heightValue = Number(heightMm);
    if (
      offsetMm.trim() === '' ||
      widthMm.trim() === '' ||
      heightMm.trim() === '' ||
      !Number.isFinite(offsetValue) ||
      !Number.isFinite(widthValue) ||
      !Number.isFinite(heightValue)
    ) {
      setError('偏移和宽高必须填写数字');
      return;
    }
    if (offsetValue < 0 || widthValue <= 0 || heightValue <= 0) {
      setError('偏移不能为负，宽度和高度必须大于 0');
      return;
    }
    if (offsetValue + widthValue > selectedWall.lengthMm) {
      setError(`洞口超出墙面范围：偏移+宽度不能超过墙长 ${Math.round(selectedWall.lengthMm)}mm`);
      return;
    }
    if (heightValue > selectedRoom.heightMm) {
      setError(`洞口高度不能超过层高 ${selectedRoom.heightMm}mm`);
      return;
    }
    const op: Opening = {
      id: Math.random().toString(36).slice(2),
      roomId,
      wallIndex: wallIdx,
      offsetMm: offsetValue,
      widthMm: widthValue,
      heightMm: heightValue,
      type,
    };
    addOpening(planId, op);
    setError('');
  };

  const roomOpenings = openings.filter((o) => o.roomId === roomId);

  return (
    <div className="card">
      <h3 style={{ marginBottom: 12, fontSize: 16 }}>门窗开洞</h3>

      <div className="form-group">
        <label>选择房间</label>
        <select
          value={roomId}
          onChange={(e) => {
            setRoomId(e.target.value);
            setWallIndex('0');
            setError('');
          }}
        >
          <option value="">请选择房间</option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      {selectedRoom && (
        <>
          <div className="form-group">
            <label>墙体 ({wallSegs.length}面)</label>
            <select value={String(wallIdx)} onChange={(e) => setWallIndex(e.target.value)}>
              {wallSegs.map((s, i) => (
                <option key={i} value={i}>
                  墙{i + 1} ({s.lengthMm.toFixed(0)}mm)
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>类型</label>
            <select value={type} onChange={(e) => setType(e.target.value as Opening['type'])}>
              <option value="door">门</option>
              <option value="window">窗</option>
              <option value="sliding">推拉门</option>
              <option value="arch">垭口</option>
            </select>
          </div>

          <div className="form-group">
            <label>偏移 (mm)</label>
            <input value={offsetMm} onChange={(e) => setOffsetMm(e.target.value)} />
          </div>
          <div className="form-group">
            <label>宽度 (mm)</label>
            <input value={widthMm} onChange={(e) => setWidthMm(e.target.value)} />
          </div>
          <div className="form-group">
            <label>高度 (mm)</label>
            <input value={heightMm} onChange={(e) => setHeightMm(e.target.value)} />
          </div>

          <button className="btn btn-primary" onClick={handleAdd} style={{ width: '100%' }}>
            添加洞口
          </button>
          {error && <div style={{ color: '#e74c3c', fontSize: 13, marginTop: 8 }}>{error}</div>}
        </>
      )}

      {roomOpenings.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h4 style={{ fontSize: 14, marginBottom: 8 }}>已添加洞口</h4>
          {roomOpenings.map((op) => (
            <div
              key={op.id}
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
                {op.type === 'door' ? '门' : op.type === 'window' ? '窗' : op.type === 'sliding' ? '推拉门' : '垭口'}
                {' '}墙{op.wallIndex + 1} {op.widthMm}×{op.heightMm}
              </span>
              <button className="btn btn-danger" onClick={() => deleteOpening(planId, op.id)}>
                删除
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
