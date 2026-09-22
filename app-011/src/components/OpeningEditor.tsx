import { useState } from 'react';
import { useStore } from '../store';
import type { Room, Opening } from '../types';
import { getWallSegments } from '../utils/geometry';
import { parseNonNegativeMm, parsePositiveMm } from '../utils/validation';

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
  // 换房间后墙面编号一律回到 0，并按新房间的墙数兜底，避免越界画到墙外
  const safeWallIndex = selectedRoom
    ? Math.min(Math.max(parseInt(wallIndex) || 0, 0), wallSegs.length - 1)
    : 0;
  const selectedWall = wallSegs[safeWallIndex];

  const handleRoomChange = (nextRoomId: string) => {
    setRoomId(nextRoomId);
    setWallIndex('0');
    setError('');
  };

  const clearErrorOnEdit = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setError('');
  };

  const handleAdd = () => {
    if (!roomId || !selectedRoom || !selectedWall) return;

    const offsetValue = parseNonNegativeMm(offsetMm);
    const widthValue = parsePositiveMm(widthMm);
    const heightValue = parsePositiveMm(heightMm);

    if (offsetValue === null) {
      setError('偏移必须是不小于 0 的整数（mm），不能为空格或负数');
      return;
    }
    if (widthValue === null) {
      setError('宽度必须是正整数（mm），不能为空格、0 或负数');
      return;
    }
    if (heightValue === null) {
      setError('高度必须是正整数（mm），不能为空格、0 或负数');
      return;
    }
    if (offsetValue + widthValue > selectedWall.lengthMm) {
      setError(
        `偏移+宽度（${offsetValue + widthValue}mm）超出该墙长度（${selectedWall.lengthMm.toFixed(0)}mm），洞口画不到墙上`
      );
      return;
    }
    if (heightValue > selectedRoom.heightMm) {
      setError(`高度（${heightValue}mm）不能超过房间层高（${selectedRoom.heightMm}mm）`);
      return;
    }

    const op: Opening = {
      id: Math.random().toString(36).slice(2) + Date.now().toString(36),
      roomId,
      wallIndex: safeWallIndex,
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
          onChange={(e) => handleRoomChange(e.target.value)}
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
            <select value={safeWallIndex} onChange={(e) => setWallIndex(e.target.value)}>
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
            <input value={offsetMm} onChange={(e) => clearErrorOnEdit(setOffsetMm)(e.target.value)} />
          </div>
          <div className="form-group">
            <label>宽度 (mm)</label>
            <input value={widthMm} onChange={(e) => clearErrorOnEdit(setWidthMm)(e.target.value)} />
          </div>
          <div className="form-group">
            <label>高度 (mm)</label>
            <input value={heightMm} onChange={(e) => clearErrorOnEdit(setHeightMm)(e.target.value)} />
          </div>

          {error && (
            <div style={{ color: '#e74c3c', fontSize: 12, marginBottom: 8 }}>{error}</div>
          )}

          <button className="btn btn-primary" onClick={handleAdd} style={{ width: '100%' }}>
            添加洞口
          </button>
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
