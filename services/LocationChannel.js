import { RTCIceCandidate, RTCPeerConnection, RTCSessionDescription } from 'react-native-webrtc'
import io from 'socket.io-client'

export default function LocationChannel() {
  const SIGNALING_URL = process.env.EXPO_PUBLIC_SIGNALING_BASEURL || ''
  let socket = null
  let peer = null
  let dataChannel = null
  let otherUser = null
  let onLocationRequest = null
  let onCoords = null
  let pendingCandidates = []

  const setOnLocationRequest = (cb) => { onLocationRequest = cb }
  const setOnCoords = (cb) => { onCoords = cb }

  const connect = () => {
    socket = io.connect(SIGNALING_URL)
    socket.on('connect', () => {
      console.log('[INFO] Connected to signaling server')
      socket.emit('join room', 'location-room')
    })
    socket.on('disconnect', () => {
      console.log('[INFO] Disconnected')
      close()
    })
    socket.on('other user', (userID) => {
      console.log('[INFO] Other user found:', userID)
      otherUser = userID
      callUser(userID)
    })
    socket.on('user joined', (userID) => {
      console.log('[INFO] User joined:', userID)
      otherUser = userID
    })
    socket.on('user left', () => {
      console.log('[INFO] User left')
      close()
    })
    socket.on('offer', handleOffer)
    socket.on('answer', handleAnswer)
    socket.on('ice-candidate', handleNewICECandidateMsg)
  }

  const Peer = (userID) => {
    const peerConn = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.stunprotocol.org' },
        {
          urls: 'turn:numb.viagenie.ca',
          credential: 'muazkh',
          username: 'webrtc@live.com',
        },
      ],
    })
    peerConn.onicecandidate = handleICECandidateEvent
    peerConn.onconnectionstatechange = () => {
      console.log('[INFO] Connection state:', peerConn.connectionState)
      if (peerConn.connectionState === 'disconnected' || peerConn.connectionState === 'failed') {
        close()
      }
    }
    if (userID) {
      peerConn.onnegotiationneeded = () => handleNegotiationNeededEvent(userID)
    }
    return peerConn
  }

  const callUser = (userID) => {
    peer = Peer(userID)
    dataChannel = peer.createDataChannel('location')
    dataChannel.onmessage = handleReceiveMessage
    dataChannel.onopen = () => console.log('[SUCCESS] Data channel opened')
    dataChannel.onclose = () => console.log('[INFO] Data channel closed')
  }

  const handleNegotiationNeededEvent = (userID) => {
    peer.createOffer()
      .then((offer) => peer.setLocalDescription(offer))
      .then(() => {
        socket.emit('offer', {
          target: userID,
          caller: socket.id,
          sdp: peer.localDescription,
        })
      })
      .catch((err) => console.error('Negotiation error:', err))
  }

  const handleOffer = (incoming) => {
    peer = Peer()
    peer.ondatachannel = (event) => {
      dataChannel = event.channel
      dataChannel.onmessage = handleReceiveMessage
      dataChannel.onopen = () => console.log('[SUCCESS] Connection established')
      dataChannel.onclose = () => console.log('[INFO] Data channel closed')
    }
    const desc = new RTCSessionDescription(incoming.sdp)
    peer.setRemoteDescription(desc)
      .then(() => peer.createAnswer())
      .then((answer) => peer.setLocalDescription(answer))
      .then(() => {
        socket.emit('answer', {
          target: incoming.caller,
          caller: socket.id,
          sdp: peer.localDescription,
        })
        pendingCandidates.forEach(c => peer.addIceCandidate(c))
        pendingCandidates = []
      })
      .catch((e) => console.error('Offer handling error:', e))
  }

  const handleAnswer = (message) => {
    const desc = new RTCSessionDescription(message.sdp)
    peer.setRemoteDescription(desc)
      .then(() => {
        pendingCandidates.forEach(c => peer.addIceCandidate(c))
        pendingCandidates = []
      })
      .catch((e) => console.error('Answer error:', e))
  }

  const handleICECandidateEvent = (e) => {
    if (e.candidate) {
      socket.emit('ice-candidate', {
        target: otherUser,
        candidate: e.candidate,
      })
    }
  }

  const handleNewICECandidateMsg = (incoming) => {
    const candidate = new RTCIceCandidate(incoming)
    if (peer && peer.remoteDescription) {
      peer.addIceCandidate(candidate).catch((e) => console.error('ICE error:', e))
    } else {
      pendingCandidates.push(candidate)
    }
  }

  const handleReceiveMessage = (e) => {
    console.log('[INFO] Location message received:', e.data)
    try {
      const msg = JSON.parse(e.data)
      if (msg.type === 'coords') {
        console.log('Received coords:', msg.lat, msg.lng)
        onCoords && onCoords(msg.lat, msg.lng)
      } else if (msg.type === 'location-request') {
        console.log('Received location request')
        onLocationRequest && onLocationRequest()
      }
    } catch (err) {
      console.error('Parse error:', err)
    }
  }

  const sendLocation = (lat, lng) => {
    if (dataChannel && dataChannel.readyState === 'open') {
      dataChannel.send(JSON.stringify({ type: 'coords', lat, lng }))
    } else {
      console.warn('[WARN] Data channel not open: cannot send coords')
    }
  }

  const requestLocation = () => {
    if (dataChannel && dataChannel.readyState === 'open') {
      dataChannel.send(JSON.stringify({ type: 'location-request' }))
    } else {
      console.warn('[WARN] Data channel not open: cannot request location')
    }
  }

  const close = () => {
    try {
      if (dataChannel) {
        dataChannel.close()
        dataChannel = null
      }
      if (peer) {
        peer.close()
        peer = null
      }
      otherUser = null
      if (socket) {
        socket.off('offer')
        socket.off('answer')
        socket.off('ice-candidate')
        socket.off('other user')
        socket.off('user joined')
        socket.off('user left')
        socket.disconnect()
        socket = null
      }
    } catch (e) {
      console.error('Close error:', e)
    }
  }

  return {
    connect,
    sendLocation,
    requestLocation,
    close,
    setOnLocationRequest,
    setOnCoords,
  }
}
