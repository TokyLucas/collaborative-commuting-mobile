import { useEffect, useRef, useState } from 'react';
import {
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

	useEffect(() => {
		socketRef.current = io.connect(SIGNALING_URL);
		socketRef.current.emit("join room", roomID);

		socketRef.current.on("other user", userID => {
			callUser(userID);
			otherUser.current = userID;
		});

		socketRef.current.on("user joined", userID => {
			otherUser.current = userID;
		});

		socketRef.current.on("offer", handleOffer);
		socketRef.current.on("answer", handleAnswer);
		socketRef.current.on("ice-candidate", handleNewICECandidateMsg);

		return () => {
			socketRef.current?.disconnect();
			peerRef.current?.close();
		};
	}, []);

	const callUser = (userID) => {
		console.log("[INFO] Initiated a call")
		peerRef.current = Peer(userID);
		sendChannel.current = peerRef.current.createDataChannel("sendChannel");
		sendChannel.current.onmessage = handleReceiveMessage;
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
		peer.onnegotiationneeded = () => handleNegotiationNeededEvent(userID);

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
			console.log('[SUCCESS] Connection established')
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
				/>
				<TouchableOpacity 
					style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]} 
					onPress={sendMessage}
					disabled={!inputText.trim()}
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