'use strict';

/**
 * LAN Discovery — UDP Broadcast
 *
 * Modul ini dijalankan di CLIENT untuk:
 *   1. Broadcast UDP ke subnet mencari Viewer Merusuh Server
 *   2. Menerima response dari server yang aktif
 *   3. Mengembalikan daftar server yang ditemukan
 *
 * Protokol:
 *   Client broadcast: "VM_DISCOVER" ke port 47777 (UDP)
 *   Server reply:     JSON { name, url, version } ke port pengirim
 */

const dgram = require('dgram');

const DISCOVER_PORT    = 47777;
const DISCOVER_MSG     = 'VM_DISCOVER';
const DISCOVER_TIMEOUT = 3000;   // 3 detik scanning

/**
 * Scan LAN untuk server Viewer Merusuh yang aktif.
 * @returns {Promise<Array<{name:string, url:string, version:string, ip:string}>>}
 */
function discoverServers() {
  return new Promise((resolve) => {
    const socket  = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    const found   = new Map();   // ip → server info
    const msg     = Buffer.from(DISCOVER_MSG);

    socket.on('error', () => {
      socket.close();
      resolve([...found.values()]);
    });

    socket.on('message', (data, rinfo) => {
      try {
        const info = JSON.parse(data.toString());
        if (info.vm_server) {
          found.set(rinfo.address, {
            ip:      rinfo.address,
            name:    info.name    || 'Unknown',
            url:     info.url     || `http://${rinfo.address}:3000`,
            version: info.version || '?',
          });
        }
      } catch {}
    });

    socket.bind(() => {
      socket.setBroadcast(true);
      // Broadcast ke subnet
      socket.send(msg, 0, msg.length, DISCOVER_PORT, '255.255.255.255');
    });

    // Tutup setelah timeout
    setTimeout(() => {
      socket.close();
      resolve([...found.values()]);
    }, DISCOVER_TIMEOUT);
  });
}

module.exports = { discoverServers, DISCOVER_PORT, DISCOVER_TIMEOUT };
