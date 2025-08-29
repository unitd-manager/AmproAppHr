// Library Imports
import {StyleSheet, View, Alert} from 'react-native';
import React, {useState, useEffect, useCallback} from 'react';
import {useSelector} from 'react-redux';
import {FlashList} from '@shopify/flash-list';
import filter from 'lodash/filter';
import moment from 'moment';
import 'moment-timezone';
// Custom Imports
import {styles, commonColor} from '../../../themes';
import HomeHeader from '../../../components/homeComponent/HomeHeader';
import SearchComponent from '../../../components/homeComponent/SearchComponent';
import ProjectConfirmModal from '../../../components/models/ProjectConfirmModal';
import CardData from './CardData';
import strings from '../../../i18n/strings';
import api from '../../../api/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocation from 'react-native-geolocation-service';
import { isInsideGeofence, fetchGeofenceData } from '../../../utils/geofence';
import { androidLocationPermission } from '../../../components/homeComponent/permissions';


export default function HomeTab({navigation}) {
  const [canCheckIn, setCanCheckIn] = useState(false);
  const colors = useSelector(state => state.theme.theme);
  // const userData = useSelector(state => state.user.userData);
  const [currentInsertId, setCurrentInsertId] = useState(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [project, setProject] = useState();
  const [isLoading, setIsLoading] = useState('');
  const [error, setError] = useState('');
  const [fullData, setFullData] = useState('');
  const [searchProject, setSearchProject] = useState('');
  const [selectedProject, setSelectedProject] = useState();
  const [btnTextDay, setBtnTextDay] = useState(strings.daycheckIn);
  const [btnTextNight, setBtnTextNight] = useState(strings.nightcheckIn);
  const [headerTitle, setHeaderTitle] = useState(strings.confirmationIn);
  const [lastClickedButton, setLastClickedButton] = useState('day');
  const [isDayButtonVisible, setIsDayButtonVisible] = useState(true);
  const [isNightButtonVisible, setIsNightButtonVisible] = useState(true);
  const [user, setUserData] = useState();
  const [insertedData, setInsertedData] = useState(null);
  const [location, setLocation] = useState({latitude: 0, longitude: 0});
  const [refreshing, setRefreshing] = useState(false);

useEffect(() => {
  const requestAndGetLocation = async () => {
    const hasPermission = await androidLocationPermission();
    if (hasPermission) {
      const geofenceData = await fetchGeofenceData();
      if (geofenceData) {
        Geolocation.getCurrentPosition(
          (data) => {
            const currentLat = data.coords.latitude;
            const currentLng = data.coords.longitude;

            setLocation({ latitude: currentLat, longitude: currentLng });

            console.log("Current Location:", { latitude: currentLat, longitude: currentLng });

            // ✅ Only check if geofenceData has proper values
            if (geofenceData.latitude && geofenceData.longitude && geofenceData.radius) {
              const insideGeofence = isInsideGeofence(
                currentLat,
                currentLng,
                geofenceData.latitude,
                geofenceData.longitude,
                geofenceData.radius
              );
              console.log("Is inside geofence:", insideGeofence);
              setCanCheckIn(insideGeofence);
            } else {
              console.log("Invalid geofence data:", geofenceData);
              setCanCheckIn(false);
            }
          },
          (error) => {
            console.log("Geolocation error: ", error);
            Alert.alert("Location Error", `Error getting location: ${error.message}. Code: ${error.code}`);
            setCanCheckIn(false);
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
        );
      } else {
        Alert.alert("Geofence Error", "Failed to load geofence data. Please try again.");
        setCanCheckIn(false);
      }
    }
  };
  requestAndGetLocation();
}, []);

  const onPressModalClose = useCallback(() => {
    setModalVisible(false);
  }, [modalVisible]);
  // const [checkOutdata, setCheckOutData] = useState();

  const checkTodayAttendance = async (userData) => {
    try {
      const now = moment.tz('Asia/Singapore');
      const currentDate = now.format('DD-MM-YYYY');
      const currentHour = now.hour();
      let showDayCheckout = false;
      let showNightCheckout = false;
      let lastDayCheckinId = null;
      let lastNightCheckinId = null;

      // 1. Check today's attendance for day and night check-out
      const resToday = await api.get(`/attendance/getTodayAttendance?staff_id=${userData.staff_id}&date=${currentDate}`);
      if (resToday.data && Array.isArray(resToday.data.data)) {
        resToday.data.data.forEach(att => {
          // Day check-out: only for today
          if (att.day_check_in_time && !att.day_check_out_time) {
            showDayCheckout = true;
            lastDayCheckinId = att.id;
          }
          // Night check-out: for today (any time)
          if (att.night_check_In_time && !att.night_check_out_time) {
            showNightCheckout = true;
            lastNightCheckinId = att.id;
          }
        });
      }

      // 2. Check yesterday's attendance for night check-out (if before 6am)
      if (!showNightCheckout && currentHour < 6) {
        const yesterday = now.clone().subtract(1, 'day').format('DD-MM-YYYY');
        const resYesterday = await api.get(`/attendance/getTodayAttendance?staff_id=${userData.staff_id}&date=${yesterday}`);
        if (resYesterday.data && Array.isArray(resYesterday.data.data)) {
          resYesterday.data.data.forEach(att => {
            // Night check-out: only for yesterday, if before 6am
            if (att.night_check_In_time && !att.night_check_out_time) {
              showNightCheckout = true;
              lastNightCheckinId = att.id;
            }
          });
        }
      }

      // Set button states
      if (showDayCheckout) {
        setBtnTextDay(strings.daycheckout);
        setIsDayButtonVisible(true);
        setIsNightButtonVisible(false);
        setCurrentInsertId(lastDayCheckinId);
        setLastClickedButton('day');
      } else if (showNightCheckout) {
        setBtnTextNight(strings.nightcheckout);
        setIsNightButtonVisible(true);
        setIsDayButtonVisible(false);
        setCurrentInsertId(lastNightCheckinId);
        setLastClickedButton('night');
      } else {
        setBtnTextDay(strings.daycheckIn);
        setBtnTextNight(strings.nightcheckIn);
        setIsDayButtonVisible(true);
        setIsNightButtonVisible(true);
        setCurrentInsertId(null);
        setLastClickedButton('day');
        // Clear any stale AsyncStorage keys for attendance state
        AsyncStorage.removeItem('btnTextDay');
        AsyncStorage.removeItem('lastClickedButton');
        AsyncStorage.removeItem('currentInsertId');
      }
    } catch (error) {
      console.log('Error checking today attendance:', error);
      setBtnTextDay(strings.daycheckIn);
      setBtnTextNight(strings.nightcheckIn);
      setIsDayButtonVisible(true);
      setIsNightButtonVisible(true);
      setCurrentInsertId(null);
      setLastClickedButton('day');
    }
  };

  const getUser = async () => {
    let userData = await AsyncStorage.getItem('USER');
    userData = JSON.parse(userData);
    setUserData(userData);
    if (userData) {
      checkTodayAttendance(userData);
    }
  };

  const getProject = () => {
    api
      .get('/attendance/getProjects')
      .then(res => {
        setProject(res.data.data);
        setFullData(res.data.data);
        setIsLoading(false);
      })
      .catch(error => {
        setError(error);
        setIsLoading(false);
      });
  };

  const insertAttendance = selectedProject => {
    const project_id = selectedProject.project_id;
    const staff_id = user.staff_id;
    const employee_id = user.employee_id;
    const currentDate = moment.tz('Asia/Singapore').format('DD-MM-YYYY');
    const currentTime = moment.tz('Asia/Singapore').format('h:mm:ss a');
    const day_checkIn_latitude = location.latitude;
    const day_checkIn_longitude = location.longitude;
    const night_checkIn_latitude = location.latitude;
    const night_checkIn_longitude = location.longitude;

    if (lastClickedButton === 'day') {
      const user = {
        date: currentDate,
        project_id: project_id,
        staff_id: staff_id,
        employee_id: employee_id,
        day_check_in_time: currentTime,
        day_checkIn_latitude: day_checkIn_latitude,
        day_checkIn_longitude: day_checkIn_longitude,
      };
      Alert.alert(
        'Day Check-In',
        `Latitude: ${day_checkIn_latitude}\nLongitude: ${day_checkIn_longitude}`
      );
      api
        .post('/attendance/insertAppAttendance', user)
        .then(({data}) => {
          setCurrentInsertId(data.data.insertId);
          setInsertedData(user);
          AsyncStorage.setItem('btnTextDay', strings.daycheckout);
          AsyncStorage.setItem('lastClickedButton', 'day');
          AsyncStorage.setItem('currentInsertId', data.data.insertId.toString());
          navigation.navigate('AttendanceTab', {insertedData: user});
        })
        .catch(error => {
          console.log('Error: ', error);
          Alert.alert('Network connection error.');
        });
    } else if (lastClickedButton === 'night') {
      const user = {
        date: currentDate,
        project_id: project_id,
        staff_id: staff_id,
        employee_id: employee_id,
        night_check_In_time: currentTime,
        night_checkIn_latitude: night_checkIn_latitude,
        night_checkIn_longitude: night_checkIn_longitude,
      };
      Alert.alert(
        'Night Check-In',
        `Latitude: ${night_checkIn_latitude}\nLongitude: ${night_checkIn_longitude}`
      );
      api
        .post('/attendance/insertAppAttendance', user)
        .then(({data}) => {
          setCurrentInsertId(data.data.insertId);
          setInsertedData(user);
          AsyncStorage.setItem('btnTextNight', strings.nightcheckout);
          AsyncStorage.setItem('lastClickedButton', 'night');
          AsyncStorage.setItem('currentInsertId', data.data.insertId.toString());
          navigation.navigate('AttendanceTab', {insertedData: user});
        })
        .catch(() => {
          Alert.alert('Network connection error.');
        });
    }
  };

   const handleDayPress = (item) => {
    if (!canCheckIn) {
      Alert.alert(
        'You are not in office location',
        `Latitude: ${location.latitude}\nLongitude: ${location.longitude}`
      );
    } else {
      onPress(item, 'day');
    }
  };

  const handleNightPress = (item) => {
    if (!canCheckIn) {
      Alert.alert(
        'You are not in office location',
        `Latitude: ${location.latitude}\nLongitude: ${location.longitude}`
      );
    } else {
      onPress(item, 'night');
    }
  };

  const checkOut = selectedProject => {
    const currentTime = moment.tz('Asia/Singapore').format('h:mm:ss a');
    const currentDate = moment.tz('Asia/Singapore').format('DD-MM-YYYY');
    const day_checkOut_latitude = location.latitude;
    const day_checkOut_longitude = location.longitude;
    const night_checkOut_latitude = location.latitude;
    const night_checkOut_longitude = location.longitude;

    if (lastClickedButton === 'day') {
      const user = {
        day_check_out_time: currentTime,
        date: currentDate,
        project_id: selectedProject.project_id,
        id: currentInsertId,
        day_checkOut_latitude: day_checkOut_latitude,
        day_checkOut_longitude: day_checkOut_longitude,
      };
      Alert.alert(
        'Day Check-Out',
        `Latitude: ${day_checkOut_latitude}\nLongitude: ${day_checkOut_longitude}`
      );
      api
        .post('/attendance/updateAppAttendance', user)
        .then(() => {
          setInsertedData(user);
          AsyncStorage.setItem('btnTextDay', strings.daycheckIn);
          AsyncStorage.removeItem('lastClickedButton');
          AsyncStorage.removeItem('currentInsertId');
          navigation.navigate('AttendanceTab', {insertedData: user});
        })
        .catch(() => {
          Alert.alert('Network connection error.');
        });
    } else if (lastClickedButton === 'night') {
      const user = {
        night_check_out_time: currentTime,
        date: currentDate,
        project_id: selectedProject.project_id,
        id: currentInsertId,
        night_checkOut_latitude: night_checkOut_latitude,
        night_checkOut_longitude: night_checkOut_longitude,
      };
      Alert.alert(
        'Night Check-Out',
        `Latitude: ${night_checkOut_latitude}\nLongitude: ${night_checkOut_longitude}`
      );
      api
        .post('/attendance/updateAppAttendance', user)
        .then(() => {
          setInsertedData(user);
          AsyncStorage.setItem('btnTextNight', strings.nightcheckIn);
          AsyncStorage.removeItem('lastClickedButton');
          AsyncStorage.removeItem('currentInsertId');
          navigation.navigate('AttendanceTab', {insertedData: user});
        })
        .catch(() => {
          Alert.alert('Network connection error.');
        });
    }
  };

  const onPress = (data, buttonType) => {
    setModalVisible(true);
    setSelectedProject(data);
    setLastClickedButton(buttonType);

    if (btnTextDay === strings.daycheckout) {
      if (headerTitle === strings.confirmationIn) {
        setHeaderTitle(strings.confirmationOut);
      }
    }

    if (btnTextNight === strings.nightcheckout) {
      if (headerTitle === strings.confirmationIn) {
        setHeaderTitle(strings.confirmationOut);
      }
    }
  };

  const onPressYes = () => {
    const singleData = [selectedProject];
    setProject(singleData);

    if (lastClickedButton === 'day') {
      if (
        btnTextDay === strings.daycheckIn &&
        headerTitle === strings.confirmationIn
      ) {
        setBtnTextDay(strings.daycheckout);
        setHeaderTitle(strings.confirmationOut);
        setIsNightButtonVisible(false);
        insertAttendance(selectedProject);
      }
      if (btnTextDay === strings.daycheckout) {
        setBtnTextDay(strings.daycheckIn);
        setHeaderTitle(strings.confirmationIn);
        checkOut(selectedProject);
        setIsNightButtonVisible(true);
        setProject(fullData);
      }
    } else if (lastClickedButton === 'night') {
      if (
        btnTextNight === strings.nightcheckIn &&
        headerTitle === strings.confirmationIn
      ) {
        setBtnTextNight(strings.nightcheckout);
        setHeaderTitle(strings.confirmationOut);
        setIsDayButtonVisible(false);
        insertAttendance(selectedProject);
      }
      if (btnTextNight === strings.nightcheckout) {
        setBtnTextNight(strings.nightcheckIn);
        setHeaderTitle(strings.confirmationIn);
        checkOut(selectedProject);
        setIsDayButtonVisible(true);
        setProject(fullData);
      }
    }

    setModalVisible(false);
  };

  const onPressNo = () => {
    setModalVisible(false);
    setTimeout(() => {
      navigation.goBack();
    }, 500);
  };

  useEffect(() => {
    setIsLoading(true);
    getProject();
  }, [colors]);
  useEffect(() => {
    getUser();
  }, []);

  // Search Functionality Start
  const handleSearch = query => {
    setSearchProject(query);
    const filteredData = filter(fullData, user => {
      return contains(user, query);
    });
    setProject(filteredData);
  };

  const contains = ({title}, query) => {
    if (title?.toLowerCase().includes(query.toLowerCase())) {
      return true;
    }
    return false;
  };

  // Search Functionality End

  const onRefresh = async () => {
    setRefreshing(true);
    setIsLoading(true);
    await getProject();
    setRefreshing(false);
    setIsLoading(false);
  };

  const renderVerticalItem = ({item, index}) => {
    return (
      <>
        <CardData
          item={item}
          isCompleted={false}
          btnTextDay={btnTextDay}
          btnTextNight={btnTextNight}
          textColor={commonColor.primary5}
          onPressBtnDay={() => handleDayPress(item)}
          onPressBtnNight={() => handleNightPress(item)}
          isDayButtonVisible={true}
          isNightButtonVisible={true}
          insertAttendance={insertAttendance}
        />
      </>
    );
  };

  return (
    <View style={[styles.flexGrow1, {backgroundColor: '#F5F5F5'}]}>
      <View
        style={{
          backgroundColor: colors.backgroundColor3,
          borderBottomRightRadius: 50,
          borderBottomLeftRadius: 50,
          ...styles.pb50,
        }}>
        <HomeHeader user={user} />
{/* 
        <SearchComponent
          search={searchProject}
          onSearchInput={handleSearch}
          isLoading={isLoading}
          error={error}
        /> */}
      </View>

      <View style={{flex: 1, marginTop: 100}}>
        <FlashList
          keyboardShouldPersistTaps="always"
          data={project && project.length > 0 ? [project[0]] : []} // Display only the first project
          renderItem={renderVerticalItem}
          keyExtractor={(item, index) => index.toString()}
          estimatedItemSize={10}
          contentContainerStyle={localStyles.contentContainerStyle}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      </View>

      <ProjectConfirmModal
        visible={modalVisible}
        onPressModalClose={onPressModalClose}
        headerTitle={headerTitle}
        subTitle={strings.cancelBookingSuccess}
        btnText1={strings.yes}
        btnText2={strings.no}
        onPressBtn1={onPressYes}
        onPressBtn2={onPressNo}
        data={selectedProject}
      />
    </View>
  );
}

const localStyles = StyleSheet.create({
  contentContainerStyle: {
    ...styles.ph20,
    ...styles.pb20,
  },
});
