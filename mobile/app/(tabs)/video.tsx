import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission, useCameraFormat } from 'react-native-vision-camera';

export default function VideoScreen() {
	const device = useCameraDevice('back');
	const { hasPermission } = useCameraPermission();
	const format = useCameraFormat(device, [{ fps: 240 }]);

	if (!hasPermission) {
		return (
			<View>
				<Text>Requesting camera permission...</Text>
			</View>
		);
	}

	if (!device) {
		return (
			<View>
				<Text>No camera device found.</Text>
			</View>
		);
	}

    return (
		<Camera
			style={StyleSheet.absoluteFill}
			device={device}
			isActive={true}
			video={true}
			format={format}
			fps={60}
		/>
    );
}
