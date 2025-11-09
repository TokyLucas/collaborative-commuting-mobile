import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useRef, useState } from 'react';
import {
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import {
    RTCIceCandidate,
    RTCPeerConnection,
    RTCSessionDescription
} from 'react-native-webrtc';
import { Socket, io } from "socket.io-client";

// Types pour la navigation
type RootStackParamList = {
    Chat: { roomID: string };
};

type ChatScreenProps = NativeStackScreenProps<RootStackParamList, 'Chat'>;

interface RTCDataChannel {
    send: (data: string) => void;
    close: () => void;
    onmessage: ((event: MessageEvent) => void) | null;
    onopen: (() => void) | null;
    onclose: (() => void) | null;
}

interface RTCDataChannelEvent {
    channel: RTCDataChannel;
}

interface RTCPeerConnectionIceEvent {
    candidate: RTCIceCandidate | null;
}

interface Message {
    _id: string;
    text: string;
    createdAt: Date;
    user: {
        _id: number;
    };
}

interface OfferPayload {
    caller: string;
    target: string;
    sdp: RTCSessionDescription;
}

interface AnswerPayload {
    caller: string;
    target: string;
    sdp: RTCSessionDescription;
}

interface IceCandidatePayload {
    target: string;
    candidate: RTCIceCandidate;
}

export default function Chat({ route }: ChatScreenProps) {
    const SIGNALING_URL = process.env.EXPO_PUBLIC_SIGNALING_BASEURL || '';
    const peerRef = useRef<RTCPeerConnection | null>(null);
    const socketRef = useRef<Socket | null>(null);
    const otherUser = useRef<string | null>(null);
    const sendChannel = useRef<RTCDataChannel | null>(null);
    const roomID = route?.params?.roomID || "chat";
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [isInRoom, setIsInRoom] = useState(false);

    useEffect(() => {
        connectAndJoinRoom();

        return () => {
            console.log('[INFO] Component unmounting, cleaning up...');
            leaveRoom();
        };
    }, []);

    const connectAndJoinRoom = () => {
        socketRef.current = io(SIGNALING_URL);

        socketRef.current.on('connect', () => {
            console.log('[INFO] Connected to signaling server');
            setIsConnected(true);
            joinRoom();
        });

        socketRef.current.on('disconnect', () => {
            console.log('[INFO] Disconnected from signaling server');
            setIsConnected(false);
            setIsInRoom(false);
        });

        socketRef.current.on("other user", (userID: string) => {
            console.log('[INFO] Other user found:', userID);
            callUser(userID);
            otherUser.current = userID;
        });

        socketRef.current.on("user joined", (userID: string) => {
            console.log('[INFO] User joined:', userID);
            otherUser.current = userID;
        });

        socketRef.current.on("user left", (userID: string) => {
            console.log('[INFO] User left:', userID);
            closePeerConnection();
            Alert.alert('User Disconnected', 'The other user has left the chat.');
        });

        socketRef.current.on("offer", handleOffer);
        socketRef.current.on("answer", handleAnswer);
        socketRef.current.on("ice-candidate", handleNewICECandidateMsg);
    };

    const joinRoom = () => {
        if (!socketRef.current || !isConnected) return;
        
        socketRef.current.emit("join room", roomID);
        setIsInRoom(true);
        console.log('[INFO] Joined room:', roomID);
    };

    const closePeerConnection = () => {
        if (sendChannel.current) {
            sendChannel.current.close();
            sendChannel.current = null;
        }
        if (peerRef.current) {
            peerRef.current.close();
            peerRef.current = null;
        }
        otherUser.current = null;
    };

    const leaveRoom = () => {
        closePeerConnection();
        
        if (socketRef.current) {
            socketRef.current.emit('leave room');
            socketRef.current.disconnect();
            socketRef.current = null;
        }
        
        setIsInRoom(false);
        setIsConnected(false);
    };

    const handleLeaveButton = () => {
        Alert.alert(
            'Leave Chat',
            'Are you sure you want to leave?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Leave',
                    style: 'destructive',
                    onPress: () => {
                        leaveRoom();
                        setMessages([]);
                    }
                }
            ]
        );
    };

    const handleRejoinButton = () => {
        if (!isConnected) {
            connectAndJoinRoom();
        } else if (!isInRoom) {
            joinRoom();
        }
    };

    const callUser = (userID: string) => {
        console.log("[INFO] Initiated a call");
        peerRef.current = createPeer(userID);
        if (!peerRef.current) return;

        const channel = (peerRef.current as any).createDataChannel("sendChannel") as RTCDataChannel;
        sendChannel.current = channel;
        
        channel.onmessage = handleReceiveMessage;
        channel.onopen = () => {
            console.log('[SUCCESS] Data channel opened');
        };
        channel.onclose = () => {
            console.log('[INFO] Data channel closed');
        };
    };

    const createPeer = (userID?: string): RTCPeerConnection => {
        const peer = new RTCPeerConnection({
            iceServers: [
                {
                    urls: "stun:stun.stunprotocol.org"
                },
                {
                    urls: 'turn:numb.viagenie.ca',
                    credential: 'muazkh',
                    username: 'webrtc@live.com'
                },
            ]
        });
        
        (peer as any).onicecandidate = (e: RTCPeerConnectionIceEvent) => {
            handleICECandidateEvent(e);
        };
        
        (peer as any).onconnectionstatechange = () => {
            console.log('[INFO] Connection state:', (peer as any).connectionState);
            if ((peer as any).connectionState === 'disconnected' || (peer as any).connectionState === 'failed') {
                closePeerConnection();
            }
        };
        
        if (userID) {
            (peer as any).onnegotiationneeded = () => handleNegotiationNeededEvent(userID);
        }

        return peer;
    };

    const handleNegotiationNeededEvent = (userID: string) => {
        if (!peerRef.current || !socketRef.current) return;

        const socket = socketRef.current;
        
        peerRef.current.createOffer()
            .then(offer => {
                if (!peerRef.current) return;
                return peerRef.current.setLocalDescription(offer);
            })
            .then(() => {
                if (!peerRef.current || !socket) return;
                
                const localDesc = (peerRef.current as any).localDescription;
                if (!localDesc) return;
                
                const socketId = socket.id;
                if (!socketId) return;
                
                const payload: OfferPayload = {
                    target: userID,
                    caller: socketId,
                    sdp: localDesc,
                };
                socket.emit("offer", payload);
            })
            .catch(err => console.log("Error handling negotiation needed event", err));
    };

    const handleOffer = (incoming: OfferPayload) => {
        console.log("[INFO] Handling Offer");
        peerRef.current = createPeer();
        if (!peerRef.current || !socketRef.current) return;

        const socket = socketRef.current;

        (peerRef.current as any).ondatachannel = (event: RTCDataChannelEvent) => {
            sendChannel.current = event.channel;
            sendChannel.current.onmessage = handleReceiveMessage;
            sendChannel.current.onopen = () => {
                console.log('[SUCCESS] Connection established');
            };
            sendChannel.current.onclose = () => {
                console.log('[INFO] Data channel closed');
            };
        };

        const desc = new RTCSessionDescription(incoming.sdp);
        peerRef.current.setRemoteDescription(desc)
            .then(() => {
                if (!peerRef.current) return;
                return peerRef.current.createAnswer();
            })
            .then(answer => {
                if (!peerRef.current || !answer) return;
                return peerRef.current.setLocalDescription(answer);
            })
            .then(() => {
                if (!peerRef.current || !socket) return;
                
                const localDesc = (peerRef.current as any).localDescription;
                if (!localDesc) return;
                
                const socketId = socket.id;
                if (!socketId) return;
                
                const payload: AnswerPayload = {
                    target: incoming.caller,
                    caller: socketId,
                    sdp: localDesc
                };
                socket.emit("answer", payload);
            })
            .catch(err => console.log("Error handling offer", err));
    };

    const handleAnswer = (message: AnswerPayload) => {
        if (!peerRef.current) return;
        
        const desc = new RTCSessionDescription(message.sdp);
        peerRef.current.setRemoteDescription(desc)
            .catch(e => console.log("Error handle answer", e));
    };

    const handleReceiveMessage = (e: MessageEvent) => {
        console.log("[INFO] Message received from peer", e.data);
        const msg: Message = {
            _id: Math.random().toString(),
            text: e.data,
            createdAt: new Date(),
            user: {
                _id: 2,
            },
        };
        setMessages(previousMessages => [...previousMessages, msg]);
    };

    const handleICECandidateEvent = (e: RTCPeerConnectionIceEvent) => {
        if (!e.candidate || !otherUser.current || !socketRef.current) return;
        
        const payload: IceCandidatePayload = {
            target: otherUser.current,
            candidate: e.candidate,
        };
        socketRef.current.emit("ice-candidate", payload);
    };

    const handleNewICECandidateMsg = (incoming: IceCandidatePayload) => {
        if (!peerRef.current) return;
        
        const candidate = new RTCIceCandidate(incoming.candidate);
        peerRef.current.addIceCandidate(candidate)
            .catch(e => console.log("Error adding ICE candidate", e));
    };

    const sendMessage = () => {
        if (!inputText.trim() || !sendChannel.current) return;

        sendChannel.current.send(inputText);
        
        const msg: Message = {
            _id: Math.random().toString(),
            text: inputText,
            createdAt: new Date(),
            user: {
                _id: 1,
            },
        };
        
        setMessages(previousMessages => [...previousMessages, msg]);
        setInputText('');
    };

    const renderMessage = ({ item }: { item: Message }) => {
        const isOwn = item.user._id === 1;
        return (
            <View style={[
                styles.messageBubble,
                isOwn ? styles.ownMessage : styles.otherMessage
            ]}>
                <Text style={[styles.messageText, isOwn && styles.ownMessageText]}>
                    {item.text}
                </Text>
                <Text style={styles.timestamp}>
                    {item.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
            </View>
        );
    };

    return (
        <KeyboardAvoidingView 
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={90}
        >
            <View style={styles.header}>
                <Text style={styles.headerText}>
                    {isConnected && isInRoom ? '🟢 Connected' : '🔴 Disconnected'}
                </Text>
                {isConnected && isInRoom ? (
                    <TouchableOpacity style={styles.leaveButton} onPress={handleLeaveButton}>
                        <Text style={styles.leaveButtonText}>Leave</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity style={styles.rejoinButton} onPress={handleRejoinButton}>
                        <Text style={styles.rejoinButtonText}>
                            {isConnected ? 'Rejoin' : 'Connect'}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
            
            {!isInRoom && (
                <View style={styles.disconnectedOverlay}>
                    <Text style={styles.disconnectedText}>Not connected to chat</Text>
                    <TouchableOpacity style={styles.connectButton} onPress={handleRejoinButton}>
                        <Text style={styles.connectButtonText}>Connect to Chat</Text>
                    </TouchableOpacity>
                </View>
            )}
            
            <FlatList
                data={messages}
                renderItem={renderMessage}
                keyExtractor={(item) => item._id}
                contentContainerStyle={styles.messageList}
            />
            
            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    value={inputText}
                    onChangeText={setInputText}
                    placeholder="Type a message..."
                    onSubmitEditing={sendMessage}
                    returnKeyType="send"
                    editable={isInRoom}
                />
                <TouchableOpacity 
                    style={[
                        styles.sendButton, 
                        (!inputText.trim() || !isInRoom) && styles.sendButtonDisabled
                    ]} 
                    onPress={sendMessage}
                    disabled={!inputText.trim() || !isInRoom}
                >
                    <Text style={styles.sendButtonText}>Send</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        padding: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerText: {
        fontSize: 14,
        fontWeight: '600',
    },
    leaveButton: {
        backgroundColor: '#FF3B30',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 12,
    },
    leaveButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    rejoinButton: {
        backgroundColor: '#34C759',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 12,
    },
    rejoinButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    disconnectedOverlay: {
        position: 'absolute',
        top: 60,
        left: 0,
        right: 0,
        bottom: 60,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    disconnectedText: {
        color: '#fff',
        fontSize: 18,
        marginBottom: 20,
    },
    connectButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 20,
    },
    connectButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    messageList: {
        padding: 16,
        flexGrow: 1,
    },
    messageBubble: {
        maxWidth: '75%',
        padding: 12,
        borderRadius: 16,
        marginVertical: 4,
    },
    ownMessage: {
        alignSelf: 'flex-end',
        backgroundColor: '#007AFF',
    },
    otherMessage: {
        alignSelf: 'flex-start',
        backgroundColor: '#E5E5EA',
    },
    messageText: {
        fontSize: 16,
        color: '#000',
    },
    ownMessageText: {
        color: '#fff',
    },
    timestamp: {
        fontSize: 11,
        color: '#666',
        marginTop: 4,
        alignSelf: 'flex-end',
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 8,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#ddd',
    },
    input: {
        flex: 1,
        backgroundColor: '#f0f0f0',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        fontSize: 16,
        marginRight: 8,
    },
    sendButton: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#007AFF',
        borderRadius: 20,
        paddingHorizontal: 20,
    },
    sendButtonDisabled: {
        backgroundColor: '#ccc',
    },
    sendButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});