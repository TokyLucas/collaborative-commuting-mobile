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
import { RTCIceCandidate, RTCPeerConnection, RTCSessionDescription } from 'react-native-webrtc';
import io from "socket.io-client";

export default function Chat() {
    const SIGNALING_URL = process.env.EXPO_PUBLIC_SIGNALING_BASEURL || '';
	const peerRef = useRef();
	const socketRef = useRef();
	const otherUser = useRef();
	const sendChannel = useRef();
	const roomID = "chat";
	const [messages, setMessages] = useState([]);
	const [inputText, setInputText] = useState('');
	const [isConnected, setIsConnected] = useState(false);
	const [isInRoom, setIsInRoom] = useState(false);

	useEffect(() => {
		connectAndJoinRoom();

		// Cleanup on unmount
		return () => {
			console.log('[INFO] Component unmounting, cleaning up...');
			leaveRoom();
		};
	}, []);

	const connectAndJoinRoom = () => {
		// Connect to signaling server
		socketRef.current = io.connect(SIGNALING_URL);

		socketRef.current.on('connect', () => {
			console.log('[INFO] Connected to signaling server');
			setIsConnected(true);
			// Join room after connection
			joinRoom();
		});

		socketRef.current.on('disconnect', () => {
			console.log('[INFO] Disconnected from signaling server');
			setIsConnected(false);
			setIsInRoom(false);
		});

		socketRef.current.on("other user", userID => {
			console.log('[INFO] Other user found:', userID);
			callUser(userID);
			otherUser.current = userID;
		});

		socketRef.current.on("user joined", userID => {
			console.log('[INFO] User joined:', userID);
			otherUser.current = userID;
		});

		socketRef.current.on("user left", userID => {
			console.log('[INFO] User left:', userID);
			closePeerConnection();
			Alert.alert('User Disconnected', 'The other user has left the chat.');
		});

		socketRef.current.on("offer", handleOffer);
		socketRef.current.on("answer", handleAnswer);
		socketRef.current.on("ice-candidate", handleNewICECandidateMsg);
	};

	const joinRoom = () => {
		if (socketRef.current && isConnected) {
			socketRef.current.emit("join room", roomID);
			setIsInRoom(true);
			console.log('[INFO] Joined room:', roomID);
		}
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
		// Close peer connection
		closePeerConnection();
		
		// Leave room on server
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

	const callUser = (userID) => {
		console.log("[INFO] Initiated a call")
		peerRef.current = Peer(userID);
		sendChannel.current = peerRef.current.createDataChannel("sendChannel");
		sendChannel.current.onmessage = handleReceiveMessage;
		sendChannel.current.onopen = () => {
			console.log('[SUCCESS] Data channel opened');
		};
		sendChannel.current.onclose = () => {
			console.log('[INFO] Data channel closed');
		};
	}

	const Peer = (userID) => {
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
		
		peer.onicecandidate = handleICECandidateEvent;
		peer.onconnectionstatechange = () => {
			console.log('[INFO] Connection state:', peer.connectionState);
			if (peer.connectionState === 'disconnected' || peer.connectionState === 'failed') {
				closePeerConnection();
			}
		};
		
		if (userID) {
			peer.onnegotiationneeded = () => handleNegotiationNeededEvent(userID);
		}

		return peer;
	}

	const handleNegotiationNeededEvent = (userID) => {
		peerRef.current.createOffer().then(offer => {
			return peerRef.current.setLocalDescription(offer);
		})
			.then(() => {
				const payload = {
					target: userID,
					caller: socketRef.current.id,
					sdp: peerRef.current.localDescription,
				};
				socketRef.current.emit("offer", payload);
			})
			.catch(err => console.log("Error handling negotiation needed event", err));
	}

	const handleOffer = (incoming) => {
		console.log("[INFO] Handling Offer")
		peerRef.current = Peer();
		peerRef.current.ondatachannel = (event) => {
			sendChannel.current = event.channel;
			sendChannel.current.onmessage = handleReceiveMessage;
			sendChannel.current.onopen = () => {
				console.log('[SUCCESS] Connection established');
			};
			sendChannel.current.onclose = () => {
				console.log('[INFO] Data channel closed');
			};
		}

		const desc = new RTCSessionDescription(incoming.sdp);
		peerRef.current.setRemoteDescription(desc).then(() => {
		}).then(() => {
			return peerRef.current.createAnswer();
		}).then(answer => {
			return peerRef.current.setLocalDescription(answer);
		}).then(() => {
			const payload = {
				target: incoming.caller,
				caller: socketRef.current.id,
				sdp: peerRef.current.localDescription
			}
			socketRef.current.emit("answer", payload);
		})
	}

	const handleAnswer = (message) => {
		const desc = new RTCSessionDescription(message.sdp);
		peerRef.current.setRemoteDescription(desc).catch(e => console.log("Error handle answer", e));
	}

	const handleReceiveMessage = (e) => {
		console.log("[INFO] Message received from peer", e.data);
		const msg = {
			_id: Math.random().toString(),
			text: e.data,
			createdAt: new Date(),
			user: {
				_id: 2,
			},
		};
		setMessages(previousMessages => [...previousMessages, msg]);
	};

	const handleICECandidateEvent = (e) => {
		if (e.candidate) {
			const payload = {
				target: otherUser.current,
				candidate: e.candidate,
			}
			socketRef.current.emit("ice-candidate", payload);
		}
	}

	const handleNewICECandidateMsg = (incoming) => {
		const candidate = new RTCIceCandidate(incoming);
		peerRef.current.addIceCandidate(candidate)
			.catch(e => console.log(e));
	}

	const sendMessage = () => {
		if (!inputText.trim() || !sendChannel.current) return;

		sendChannel.current.send(inputText);
		
		const msg = {
			_id: Math.random().toString(),
			text: inputText,
			createdAt: new Date(),
			user: {
				_id: 1,
			},
		};
		
		setMessages(previousMessages => [...previousMessages, msg]);
		setInputText('');
	}

	const renderMessage = ({ item }) => {
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