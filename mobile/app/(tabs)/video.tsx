import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, Alert } from 'react-native';
import { Camera, useCameraDevices, useCameraPermission } from 'react-native-vision-camera';

export default function VideoScreen() {
	const device = useCameraDevice('back')
	const { hasPermission } = useCameraPermission()

    return (
		<Camera
			{...props}
			video={true}
		/>
    );
}
