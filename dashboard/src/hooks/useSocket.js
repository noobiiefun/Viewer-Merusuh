// dashboard/src/hooks/useSocket.js
import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'

const BASE = import.meta.env.DEV ? 'http://localhost:3000' : window.location.origin

export function useSocket() {
  const socketRef = useRef(null)
  const [connected, setConnected]     = useState(false)
  const [lastDonation, setLastDonation] = useState(null)
  const [lastEffect, setLastEffect]     = useState(null)
  const [lastTestLog, setLastTestLog]   = useState(null)

  useEffect(() => {
    const socket = io(BASE, { transports: ['websocket'] })
    socketRef.current = socket

    socket.on('connect',    () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))
    socket.on('donation',  (d) => setLastDonation({ ...d, _ts: Date.now() }))
    socket.on('effect',    (e) => setLastEffect({ ...e, _ts: Date.now() }))
    socket.on('test_log',  (l) => setLastTestLog({ ...l, _ts: Date.now() }))

    return () => socket.disconnect()
  }, [])

  return { connected, lastDonation, lastEffect, lastTestLog }
}
