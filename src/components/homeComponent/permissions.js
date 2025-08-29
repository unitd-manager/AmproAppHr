import { Platform, PermissionsAndroid } from 'react-native';
import { showError } from '../../utils/helpers';

export const androidCameraPermission = () => new Promise(async (resolve, reject) => {
    try {
        if (Platform.OS === 'android' && Platform.Version > 22) {
            const granted = await PermissionsAndroid.requestMultiple([
                PermissionsAndroid.PERMISSIONS.CAMERA,
                PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
                PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
            ]);
            console.log(granted, 'granted response')
            if (
                granted['android.permission.CAMERA'] !== 'granted' ||
                granted['android.permission.WRITE_EXTERNAL_STORAGE'] !== 'granted' ||
                granted['android.permission.READ_EXTERNAL_STORAGE'] !== 'granted'
            ) {
                showError("Don't have required permission.Please allow permissions")
                return resolve(false);
            }
            return resolve(true);
        }

        return resolve(true);
    } catch (error) {
        return resolve(false);
    }
});

export const androidLocationPermission = () => new Promise(async (resolve, reject) => {
    try {
        if (Platform.OS === 'android' && Platform.Version > 22) {
            const granted = await PermissionsAndroid.requestMultiple([
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION
            ]);
            console.log(granted, 'granted location response')
            if (
                granted['android.permission.ACCESS_FINE_LOCATION'] !== 'granted' ||
                granted['android.permission.ACCESS_COARSE_LOCATION'] !== 'granted'
            ) {
                showError("Location permission not granted. Please allow permissions.")
                return resolve(false);
            }
            return resolve(true);
        }
        return resolve(true);
    } catch (error) {
        return resolve(false);
    }
});




