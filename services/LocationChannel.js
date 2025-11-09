import { RTCIceCandidate, RTCPeerConnection, RTCSessionDescription } from 'react-native-webrtc'
import io from 'socket.io-client'

export default function LocationChannel() {
  const SIGNALING_URL = process.env.EXPO_PUBLIC_SIGNALING_BASEURL || ''
  let socket = null
  let hasHandlers = false
  let peer = null
  let dataChannel = null
  let otherUser = null
  let onLocationRequest = null
  let onCoords = null
  let pendingCandidates = []
  let isChannelReady = false
  let onReady = null
  let joinedRoom = false
  let isInitiator = false

  const setOnLocationRequest = (cb) => { onLocationRequest = cb }
  const setOnCoords = (cb) => { onCoords = cb }
  const setOnReady = (cb) => { onReady = cb }

  const connect = () => {
    if (socket && (socket.connected || socket.active)) return
    if (!SIGNALING_URL) return
    if (!socket) {
      socket = io(SIGNALING_URL, {
        transports: ['websocket'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: Infinity,
      })
      attachSocketHandlers()
    } else {
      if (!hasHandlers) attachSocketHandlers()
      socket.connect()
    }
  }

  const attachSocketHandlers = () => {
    if (!socket || hasHandlers) return
    hasHandlers = true

    socket.on('connect', () => {
      if (!joinedRoom) {
        socket.emit('join room', 'location-room')
        joinedRoom = true
      }
    })

    socket.on('other user', (userID) => {
      if (!userID || userID === socket.id) return
      otherUser = userID
      isInitiator = true
      if (!peer) callUser(userID)
    })

    socket.on('user joined', (userID) => {
      if (!userID || userID === socket.id) return
      otherUser = userID
      isInitiator = false
    })

    socket.on('user left', (userID) => {
      if (!userID || userID !== otherUser) return
      otherUser = null
      isInitiator = false
      softResetPeer()
    })

    socket.on('offer', (msg) => {
      if (!msg || msg.caller === socket.id || msg.target !== socket.id) return
      handleOffer(msg)
    })

    socket.on('answer', (msg) => {
      if (!msg || msg.caller === socket.id || msg.target !== socket.id) return
      handleAnswer(msg)
    })

    socket.on('ice-candidate', (msg) => {
      if (!msg || msg.caller === socket.id || msg.target !== socket.id) return
      handleNewICECandidateMsg(msg)
    })
  }

  const Peer = (userID) => {
    const peerConn = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] })
    peerConn.onicecandidate = handleICECandidateEvent
    peerConn.ondatachannel = (event) => setupDataChannel(event.channel)
    peerConn.onconnectionstatechange = () => {
      const s = peerConn.connectionState
      if (s === 'connected') {
        isChannelReady = true
        onReady && onReady(true)
      } else if (s === 'disconnected') {
        onReady && onReady(false)
      } else if (s === 'failed') {
        onReady && onReady(false)
      } else if (s === 'closed') {
        isChannelReady = false
        onReady && onReady(false)
      }
    }
    if (userID) peerConn.onnegotiationneeded = () => handleNegotiationNeededEvent(userID)
    return peerConn
  }

  const setupDataChannel = (channel) => {
    dataChannel = channel
    dataChannel.onmessage = handleReceiveMessage
    dataChannel.onopen = () => {
      isChannelReady = true
      onReady && onReady(true)
    }
    dataChannel.onclose = () => {
      isChannelReady = false
      onReady && onReady(false)
    }
  }

  const callUser = (userID) => {
    if (peer) return
    peer = Peer(userID)
    const dc = peer.createDataChannel('location')
    setupDataChannel(dc)
  }

  const handleNegotiationNeededEvent = (userID) => {
    if (!peer || !socket || !isInitiator) return
    peer.createOffer()
      .then((offer) => peer.setLocalDescription(offer))
      .then(() => {
        socket.emit('offer', { target: userID, caller: socket.id, sdp: peer.localDescription })
      })
      .catch((err) => console.error('Negotiation error:', err))
  }

  const handleOffer = (incoming) => {
    if (peer) return
    otherUser = incoming.caller
    isInitiator = false
    peer = Peer()
    const desc = new RTCSessionDescription(incoming.sdp)
    peer.setRemoteDescription(desc)
      .then(() => peer.createAnswer())
      .then((answer) => peer.setLocalDescription(answer))
      .then(() => {
        socket.emit('answer', { target: incoming.caller, caller: socket.id, sdp: peer.localDescription })
        if (pendingCandidates.length) {
          pendingCandidates.forEach(c => peer.addIceCandidate(c).catch(() => {}))
          pendingCandidates = []
        }
      })
      .catch((e) => console.error('Offer handling error:', e))
  }

  const handleAnswer = (message) => {
    if (!peer) return
    const desc = new RTCSessionDescription(message.sdp)
    peer.setRemoteDescription(desc)
      .then(() => {
        if (pendingCandidates.length) {
          pendingCandidates.forEach(c => peer.addIceCandidate(c).catch(() => {}))
          pendingCandidates = []
        }
      })
      .catch((e) => console.error('Answer error:', e))
  }

  const handleICECandidateEvent = (e) => {
    if (e.candidate && otherUser) {
      socket.emit('ice-candidate', { target: otherUser, candidate: e.candidate, caller: socket.id })
    }
  }

  const handleNewICECandidateMsg = (incoming) => {
    const payload = incoming.candidate || incoming
    const candidate = new RTCIceCandidate(payload)
    if (peer && peer.remoteDescription) {
      peer.addIceCandidate(candidate).catch((e) => console.error('ICE error:', e))
    } else {
      pendingCandidates.push(candidate)
    }
  }

  const handleReceiveMessage = (e) => {
    try {
      const msg = JSON.parse(e.data)
      if (msg.type === 'coords') onCoords && onCoords(msg.lat, msg.lng)
      else if (msg.type === 'location-request') onLocationRequest && onLocationRequest()
    } catch {}
  }

  const sendLocation = (lat, lng) => {
    if (isChannelReady && dataChannel?.readyState === 'open') {
      dataChannel.send(JSON.stringify({ type: 'coords', lat, lng }))
    }
  }

  const requestLocation = () => {
    if (isChannelReady && dataChannel?.readyState === 'open') {
      dataChannel.send(JSON.stringify({ type: 'location-request' }))
    }
  }

  const softResetPeer = () => {
    try { dataChannel?.close() } catch {}
    dataChannel = null
    try { peer?.close() } catch {}
    peer = null
    isChannelReady = false
    onReady && onReady(false)
    pendingCandidates = []
  }

  const resetPeer = () => {
    softResetPeer()
  }

  const close = () => {
    softResetPeer()
    otherUser = null
    isInitiator = false
  }

  return {
    connect,
    sendLocation,
    requestLocation,
    close,
    setOnLocationRequest,
    setOnCoords,
    isChannelReady: () => isChannelReady,
    setOnReady,
  }
}
