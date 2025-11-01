import {
    RTCIceCandidate,
    RTCPeerConnection,
    RTCSessionDescription,
} from 'react-native-webrtc';

export type PeerSide = 'caller' | 'callee';

export function createPeer() {
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }],
  });
  return pc;
}

export async function makeOffer(pc: RTCPeerConnection) {
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  return offer.sdp!;
}

export async function applyRemoteOffer(pc: RTCPeerConnection, sdp: string) {
  await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp }));
}

export async function makeAnswer(pc: RTCPeerConnection) {
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  return answer.sdp!;
}

export async function applyRemoteAnswer(pc: RTCPeerConnection, sdp: string) {
  await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp }));
}

export async function addIceCandidate(pc: RTCPeerConnection, cand: any) {
  if (!cand) return;
  try {
    await pc.addIceCandidate(new RTCIceCandidate(cand));
  } catch {}
}
