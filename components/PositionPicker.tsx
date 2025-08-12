// PositionPicker.tsx
import React from 'react';
import MapView, { Marker, MapPressEvent } from 'react-native-maps';
import { View, StyleSheet } from 'react-native';

export default function PositionPicker({ value, onChange }: any) {
    const handlePress = (e: MapPressEvent) => {
        onChange(e.nativeEvent.coordinate);
    };

    return (
        <MapView
            style={styles.map}
            initialRegion={{
                latitude: value?.latitude || 48.8566,
                longitude: value?.longitude || 2.3522,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
            }}
            onPress={handlePress}
        >
            {value && <Marker coordinate={value} />}
        </MapView>
    );
}

const styles = StyleSheet.create({
    map: {
        height: 200,
        width: '100%',
        marginVertical: 10,
    },
});
