import React from 'react';
import {StackNav} from '../NavigationKeys';
import {StackRoute} from '../NavigationRoutes';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();

export default function AuthStack() {
  

  return (
    <Stack.Navigator
      screenOptions={{headerShown: false}}
      initialRouteName={StackNav.AuthChoice}>
      <Stack.Screen name={StackNav.AuthChoice} component={StackRoute.AuthChoice} />
      <Stack.Screen name={StackNav.Login} component={StackRoute.Login} />
    </Stack.Navigator>
  );
}
