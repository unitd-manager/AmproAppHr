import React from 'react';
import { View, Button, StyleSheet, Alert } from 'react-native';
import ReactNativeBiometrics from 'react-native-biometrics';
import AuthContext from '../../navigation/Type/Auth';
import { StackNav } from '../../navigation/NavigationKeys';
import AsyncStorage from '@react-native-async-storage/async-storage';
 
export default function AuthChoiceScreen({ navigation }) {
  const { signIn } = React.useContext(AuthContext);
  const handleLogin = () => {
    navigation.navigate('Login');
  };

  const handleBiometric = async () => {
    const rnBiometrics = new ReactNativeBiometrics();
    const { available, biometryType } = await rnBiometrics.isSensorAvailable();
    if (!available) {
      Alert.alert('Biometric not available');
      return;
    }
    try {
      const resultObject = await rnBiometrics.simplePrompt({ promptMessage: 'Authenticate with Biometrics' });
      const { success } = resultObject;
      if (success) {
        // Check if user data is already stored locally
        const storedUserString = await AsyncStorage.getItem('USER');

        
         let storedUser = null;
        if (typeof storedUserString === 'string' && storedUserString.startsWith('{')) {
          try {
            storedUser = JSON.parse(storedUserString);
          } catch (e) {
            console.log('Error parsing storedUserString:', e);
          }
        }
        const biometricUserId = await AsyncStorage.getItem('BIOMETRIC_USER_ID');
        const userToken = await AsyncStorage.getItem('USER_TOKEN');
        
        console.log('Stored User:', storedUser);
        console.log('Biometric User ID:', biometricUserId);
        console.log('User Token:', userToken);
        
        if (!biometricUserId || !storedUser?.staff_id) {
          Alert.alert('Biometric Error', 'No biometric user ID found. Please log in once with your credentials to enable biometric login.');
          return;
        }
        
        // If user data is missing but we have biometric ID and user was previously logged in
        if (!storedUser && userToken) {
          Alert.alert(
            'Session Expired', 
            'Your session has expired. Please log in again with your credentials to refresh your biometric access.',
            [
              {
                text: 'Login',
                onPress: () => navigation.navigate('Login')
              }
            ]
          );
          return;
        }
        
        if (!storedUser) {
          Alert.alert('Biometric Error', 'No user data found. Please log in once with your credentials to enable biometric login.');
          return;
        }

        try {
          // Parse stored user data
          const userData = typeof storedUser === 'string' ? JSON.parse(storedUser) : storedUser;
          console.log('Parsed User Data:', userData);
          
          // Verify the stored user matches the biometric user ID
          if (userData && userData.staff_id && String(userData.staff_id) === String(biometricUserId)) {
            // User data is valid, proceed with biometric login
            await AsyncStorage.setItem('USER_TOKEN', 'biometric');
            signIn('biometric');
          } else {
            // Data mismatch, ask user to login again
            console.log('Data mismatch - User staff_id:', userData?.staff_id, 'Biometric ID:', biometricUserId);
            Alert.alert(
              'Data Mismatch', 
              'User data doesn\'t match biometric ID. Please log in again with your credentials.',
              [
                {
                  text: 'Login',
                  onPress: () => navigation.navigate('Login')
                }
              ]
            );
          }
        } catch (parseError) {
          // Error parsing stored data, ask user to login again
          console.log('An error occurred during data processing:', {
            message: parseError?.message || 'Unknown error',
            name: parseError?.name || 'Error',
            stack: parseError?.stack || 'No stack trace'
          });
          Alert.alert(
            'Error', 
            'An unexpected error occurred. Please log in again.',
            [
              {
                text: 'Login',
                onPress: () => navigation.navigate('Login')
              }
            ]
          );
        }
      } else {
        Alert.alert('Biometric Auth Failed');
      }
    } catch (error) {
      console.log('Biometric error:', error);
      Alert.alert('Biometric Auth Error', 'Authentication failed. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <Button title="Login" onPress={handleLogin} />
      <View style={{ height: 20 }} />
      <Button title="Biometric (Thumb Impression)" onPress={handleBiometric} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
