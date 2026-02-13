import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Alert } from 'react-native';
import { apiCall, getAuthToken } from './api';

const LOCATION_TASK_NAME = 'background-location-task';

export interface Coordinates {
    latitude: number;
    longitude: number;
}

// Define the background task
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: any) => {
    if (error) {
        console.error("Location task error:", error);
        return;
    }
    if (data) {
        const { locations } = data;
        const token = getAuthToken();
        if (!token) return; // Stop if no user logged in

        // Process locations (array of updates)
        const lastLoc = locations[locations.length - 1];
        if (lastLoc) {
            try {
                await apiCall('/visits/sync-location', {
                    method: 'POST',
                    body: JSON.stringify({
                        latitude: lastLoc.coords.latitude,
                        longitude: lastLoc.coords.longitude
                    })
                });
            } catch (e) {
                // silently fail in background to avoid spam
                console.log("Background sync failed", e);
            }
        }
    }
});

export const startBackgroundTracking = async () => {
    try {
        const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
        if (fgStatus !== 'granted') return;

        const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
        if (bgStatus !== 'granted') {
            console.log("Background permission denied");
            return;
        }

        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 60 * 1000, // 1 minute (more frequent for "actual path" feel)
            distanceInterval: 100, // 100 meters
            deferredUpdatesInterval: 60 * 1000,
            deferredUpdatesDistance: 100,
            foregroundService: {
                notificationTitle: "PharmaFlow Tracking",
                notificationBody: "Tracking your route actively.",
                notificationColor: "#2563eb"
            }
        });
    } catch (error) {
        console.error("Failed to start tracking:", error);
    }
};

export const stopBackgroundTracking = async () => {
    try {
        const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
        if (hasStarted) {
            await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
        }
    } catch (error) {
        console.error("Failed to stop tracking:", error);
    }
};

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
