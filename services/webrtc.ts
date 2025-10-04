// webrtc.js
import { RTCPeerConnection } from "react-native-webrtc";

export const pc: RTCPeerConnection = new RTCPeerConnection({
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        {
            urls: ["turn:openrelay.metered.ca:80", "turn:openrelay.metered.ca:443"],
            username: "openrelayproject",
            credential: "openrelayproject",
        },
    ],
    iceCandidatePoolSize: 10,
    // Uncomment this line to force TURN usage if direct connection keeps failing
    // iceTransportPolicy: 'relay',
});

export let dataChannel: any;
let messageHandler: ((msg: string) => void) | any = null;

export function restartIce() {
    console.log("Restarting ICE connection");
    return pc.restartIce();
}

export function logIceCandidates() {
    (pc as any).onicecandidate = (event: any) => {
        if (event.candidate) {
            console.log("ICE candidate:", {
                type: event.candidate.type,
                protocol: event.candidate.protocol,
                address: event.candidate.address,
                port: event.candidate.port,
                candidate: event.candidate.candidate
            });
        } else {
            console.log("All ICE candidates have been sent");
        }
    };
}
export function getConnectionState() {
    return {
        connectionState: pc.connectionState,
        iceConnectionState: pc.iceConnectionState,
        iceGatheringState: pc.iceGatheringState,
        signalingState: pc.signalingState,
    };
}

export function createDataChannel(onMessage?: (msg: string) => void) {
    if (onMessage) messageHandler = onMessage;
    
    dataChannel = pc.createDataChannel("chat", {
        ordered: true
    });
    
    dataChannel.onopen = () => {
        console.log("Data channel open (offerer)");
        if (messageHandler) {
            dataChannel.onmessage = (event: any) => messageHandler(event.data);
        }
    };
    
    dataChannel.onclose = () => console.log("Data channel closed");
    dataChannel.onerror = (error: any) => console.error("Data channel error:", error);
}

export function sendMessage(message: string) {
    if (dataChannel && dataChannel.readyState === "open") {
        dataChannel.send(message);
        console.log("Sent message:", message);
    } else {
        console.warn("⚠️ Data channel not open, state:", dataChannel?.readyState);
    }
}

export function setupDataChannelListener(onMessage: (msg: string) => void) {
    messageHandler = onMessage;
    
    (pc as any).ondatachannel = (event: any) => {
        console.log("Data channel received on answerer");
        dataChannel = event.channel;
        
        dataChannel.onopen = () => {
            console.log("Data channel open (answerer)");
        };
        
        dataChannel.onmessage = (event: any) => {
            console.log("Received message:", event.data);
            onMessage(event.data);
        };
        
        dataChannel.onclose = () => console.log("Data channel closed");
        dataChannel.onerror = (error: any) => console.error("Data channel error:", error);
    };
}