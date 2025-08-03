import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  Image,
  SafeAreaView,
  StatusBar
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useLocalization } from '../../context/LocalizationContext';
import { STORAGE_KEYS } from '../../api/config';

const { width, height } = Dimensions.get('window');

const OnboardingScreen = ({ navigation }) => {
  const { t } = useLocalization();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);
  
  // Onboarding screens data
  const slides = [
    {
      id: '1',
      title: 'Welcome to EvokeEssence Crypto',
      description: 'Your trusted cryptocurrency exchange platform for secure and easy digital asset trading.',
      image: require('../../assets/onboarding-1.png'),
      backgroundColor: '#6200ee'
    },
    {
      id: '2',
      title: 'Trade with Confidence',
      description: 'Access real-time market data, advanced charts, and trade on the go with our secure mobile platform.',
      image: require('../../assets/onboarding-2.png'),
      backgroundColor: '#4a148c'
    },
    {
      id: '3',
      title: 'Secure & Compliant',
      description: 'Your assets are protected with industry-leading security measures and full regulatory compliance.',
      image: require('../../assets/onboarding-3.png'),
      backgroundColor: '#311b92'
    },
    {
      id: '4',
      title: 'Earn with Referrals',
      description: 'Invite friends and earn commission on their trading activity with our contractor program.',
      image: require('../../assets/onboarding-4.png'),
      backgroundColor: '#1a237e'
    }
  ];

  // Handle skip button press
  const handleSkip = async () => {
    // Mark onboarding as completed
    await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, 'true');
    // Navigate to login screen
    navigation.replace('Login');
  };

  // Handle next button press
  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      // Go to next slide
      flatListRef.current.scrollToIndex({
        index: currentIndex + 1,
        animated: true
      });
    } else {
      // Last slide, complete onboarding
      handleSkip();
    }
  };

  // Handle slide change
  const handleSlideChange = (event) => {
    const slideIndex = Math.floor(event.nativeEvent.contentOffset.x / event.nativeEvent.layoutMeasurement.width);
    if (slideIndex >= 0 && slideIndex < slides.length) {
      setCurrentIndex(slideIndex);
    }
  };

  // Render indicator dots
  const renderDots = () => {
    return slides.map((_, index) => (
      <View
        key={index}
        style={[
          styles.dot,
          index === currentIndex && styles.activeDot
        ]}
      />
    ));
  };

  // Render slide item
  const renderItem = ({ item }) => {
    return (
      <View style={[styles.slide, { backgroundColor: item.backgroundColor }]}>
        <Image
          source={item.image}
          style={styles.image}
          resizeMode="contain"
        />
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      
      <View style={styles.skipContainer}>
        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
          <Text style={styles.skipText}>{t('skip')}</Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleSlideChange}
        keyExtractor={item => item.id}
        decelerationRate="fast"
        scrollEventThrottle={16}
      />
      
      <View style={styles.bottomContainer}>
        <View style={styles.dotsContainer}>
          {renderDots()}
        </View>
        
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          {currentIndex === slides.length - 1 ? (
            <>
              <Text style={styles.nextText}>{t('get_started')}</Text>
              <Ionicons name="checkmark" size={24} color="#fff" style={styles.nextIcon} />
            </>
          ) : (
            <>
              <Text style={styles.nextText}>{t('next')}</Text>
              <Ionicons name="arrow-forward" size={24} color="#fff" style={styles.nextIcon} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#6200ee',
  },
  skipContainer: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  skipButton: {
    padding: 10,
  },
  skipText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    fontWeight: '600',
  },
  slide: {
    width,
    height,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  image: {
    width: width * 0.8,
    height: height * 0.4,
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  description: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 26,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: 5,
  },
  activeDot: {
    backgroundColor: '#fff',
    width: 20,
  },
  nextButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  nextText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  nextIcon: {
    marginLeft: 10,
  }
});

export default OnboardingScreen;