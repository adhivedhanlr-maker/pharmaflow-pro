import * as Location from 'expo-location';
import { Alert } from 'react-native';

export interface Coordinates {
    latitude: number;
    longitude: number;
}

export const getCurrentLocation = async (): Promise<Coordinates | null> => {
    try {
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Allow location access to verify your visits.');
            return null;
        }

        const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
        });

        return {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
        };
    } catch (error) {
        console.error('Location Error:', error);
        return null;
    }
};

/**
 * Calculates distance between two coordinates in meters using Haversine formula
 */
export const calculateDistance = (
    coords1: Coordinates,
    coords2: Coordinates
): number => {
    const toRad = (value: number) => (value * Math.PI) / 180;

    const R = 6371e3; // Earth radius in meters
    const lat1 = toRad(coords1.latitude);
    const lat2 = toRad(coords2.latitude);
    const dLat = toRad(coords2.latitude - coords1.latitude);
    const dLon = toRad(coords2.longitude - coords1.longitude);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
};

export const validateVisit = (
    userCoords: Coordinates,
    shopCoords: Coordinates,
    allowedRadiusMeters: number = 100
): boolean => {
    const distance = calculateDistance(userCoords, shopCoords);
    return distance <= allowedRadiusMeters;
};
