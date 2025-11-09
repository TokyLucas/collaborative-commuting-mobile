import { Ionicons } from '@expo/vector-icons';
import React, { useRef } from 'react';
import {
    Animated,
    Dimensions,
    GestureResponderEvent,
    PanResponder,
    PanResponderGestureState,
    StyleSheet,
    TouchableOpacity
} from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BUBBLE_SIZE = 60;

interface ChatBubbleProps {
    onPress: () => void;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ onPress }) => {
    const pan = useRef(
        new Animated.ValueXY({ 
            x: SCREEN_WIDTH - BUBBLE_SIZE - 20, 
            y: SCREEN_HEIGHT - 150 
        })
    ).current;

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                pan.setOffset({
                    x: (pan.x as any)._value,
                    y: (pan.y as any)._value
                });
                pan.setValue({ x: 0, y: 0 });
            },
            onPanResponderMove: Animated.event(
                [null, { dx: pan.x, dy: pan.y }],
                { useNativeDriver: false }
            ),
            onPanResponderRelease: (_: GestureResponderEvent, gesture: PanResponderGestureState) => {
                pan.flattenOffset();
                
                // Si le mouvement est petit, c'est un tap
                if (Math.abs(gesture.dx) < 10 && Math.abs(gesture.dy) < 10) {
                    onPress();
                }
                
                // Repositionner dans les limites de l'écran
                const finalX = Math.max(0, Math.min((pan.x as any)._value, SCREEN_WIDTH - BUBBLE_SIZE));
                const finalY = Math.max(0, Math.min((pan.y as any)._value, SCREEN_HEIGHT - BUBBLE_SIZE - 100));
                
                Animated.spring(pan, {
                    toValue: { x: finalX, y: finalY },
                    useNativeDriver: false
                }).start();
            }
        })
    ).current;

    return (
        <Animated.View
            style={[
                styles.bubble,
                {
                    transform: [{ translateX: pan.x }, { translateY: pan.y }]
                }
            ]}
            {...panResponder.panHandlers}
        >
            <TouchableOpacity style={styles.bubbleButton} activeOpacity={0.8}>
                <Ionicons name="chatbubbles" size={28} color="#fff" />
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    bubble: {
        position: 'absolute',
        width: BUBBLE_SIZE,
        height: BUBBLE_SIZE,
        zIndex: 1000,
    },
    bubbleButton: {
        width: BUBBLE_SIZE,
        height: BUBBLE_SIZE,
        borderRadius: BUBBLE_SIZE / 2,
        backgroundColor: '#007AFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 8,
    }
});

export default ChatBubble;