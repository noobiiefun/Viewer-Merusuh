/**
 * Test — Queue Manager
 */

let queueManager;

beforeEach(() => {
  jest.resetModules();
  queueManager = require('../queueManager');
});

describe('enqueue()', () => {
  test('berhasil masuk antrian, posisi 1 untuk RC kosong', () => {
    const result = queueManager.enqueue({ rc_id: 'rc_1', viewer_name: 'Budi', duration_sec: 60 });
    expect(result.success).toBe(true);
    expect(result.position).toBe(1);
  });

  test('viewer kedua dapat posisi 2', () => {
    queueManager.enqueue({ rc_id: 'rc_1', viewer_name: 'Budi', duration_sec: 60 });
    const result = queueManager.enqueue({ rc_id: 'rc_1', viewer_name: 'Siti', duration_sec: 60 });
    expect(result.position).toBe(2);
  });

  test('menolak rc_id kosong', () => {
    expect(() => queueManager.enqueue({ viewer_name: 'Budi', duration_sec: 60 })).toThrow();
  });

  test('menolak viewer_name kosong', () => {
    expect(() => queueManager.enqueue({ rc_id: 'rc_1', duration_sec: 60 })).toThrow();
  });

  test('menolak duration_sec tidak valid', () => {
    expect(() => queueManager.enqueue({ rc_id: 'rc_1', viewer_name: 'Budi', duration_sec: -5 })).toThrow();
  });

  test('antrian penuh ditolak dengan QUEUE_FULL', () => {
    queueManager.configure({ maxQueuePerRc: 2 });
    queueManager.enqueue({ rc_id: 'rc_1', viewer_name: 'A', duration_sec: 60 });
    queueManager.enqueue({ rc_id: 'rc_1', viewer_name: 'B', duration_sec: 60 });
    const result = queueManager.enqueue({ rc_id: 'rc_1', viewer_name: 'C', duration_sec: 60 });
    expect(result.success).toBe(false);
    expect(result.error).toBe('QUEUE_FULL');
  });
});

describe('dequeue()', () => {
  test('mengambil viewer pertama (FIFO)', () => {
    queueManager.enqueue({ rc_id: 'rc_1', viewer_name: 'A', duration_sec: 60 });
    queueManager.enqueue({ rc_id: 'rc_1', viewer_name: 'B', duration_sec: 60 });

    const next = queueManager.dequeue('rc_1');
    expect(next.viewer_name).toBe('A');
  });

  test('dequeue dari RC kosong mengembalikan null', () => {
    expect(queueManager.dequeue('rc_kosong')).toBeNull();
  });

  test('posisi viewer berikutnya bergeser setelah dequeue', () => {
    queueManager.enqueue({ rc_id: 'rc_1', viewer_name: 'A', duration_sec: 60 });
    queueManager.enqueue({ rc_id: 'rc_1', viewer_name: 'B', duration_sec: 60 });
    queueManager.dequeue('rc_1');

    const queue = queueManager.getQueueForRc('rc_1');
    expect(queue[0].viewer_name).toBe('B');
    expect(queue[0].position).toBe(1);
  });
});

describe('leave()', () => {
  test('viewer bisa keluar antrian pakai token', () => {
    const { entry } = queueManager.enqueue({ rc_id: 'rc_1', viewer_name: 'A', duration_sec: 60 });
    const ok = queueManager.leave(entry.queue_token);
    expect(ok).toBe(true);
    expect(queueManager.length('rc_1')).toBe(0);
  });

  test('leave dengan token tidak valid mengembalikan false', () => {
    expect(queueManager.leave('token-ngasal')).toBe(false);
  });
});

describe('estimatedWait()', () => {
  test('menghitung total wait termasuk sisa sesi aktif', () => {
    queueManager.enqueue({ rc_id: 'rc_1', viewer_name: 'A', duration_sec: 60 });
    queueManager.enqueue({ rc_id: 'rc_1', viewer_name: 'B', duration_sec: 30 });

    // Sesi aktif sisa 20 detik + A 60s + B 30s = 110
    const wait = queueManager.estimatedWait('rc_1', 20);
    expect(wait).toBe(110);
  });
});
