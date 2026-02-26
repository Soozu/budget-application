import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Animated } from 'react-native';

const { width, height } = Dimensions.get('window');

export default function GlobalBackground() {
  // Animated values for floating shapes
  const anim1 = useRef(new Animated.Value(0)).current;
  const anim2 = useRef(new Animated.Value(0)).current;
  const anim3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Create continuous animations
    const animate1 = Animated.loop(
      Animated.sequence([
        Animated.timing(anim1, {
          toValue: 1,
          duration: 8000,
          useNativeDriver: true,
        }),
        Animated.timing(anim1, {
          toValue: 0,
          duration: 8000,
          useNativeDriver: true,
        }),
      ])
    );

    const animate2 = Animated.loop(
      Animated.sequence([
        Animated.timing(anim2, {
          toValue: 1,
          duration: 10000,
          useNativeDriver: true,
        }),
        Animated.timing(anim2, {
          toValue: 0,
          duration: 10000,
          useNativeDriver: true,
        }),
      ])
    );

    const animate3 = Animated.loop(
      Animated.sequence([
        Animated.timing(anim3, {
          toValue: 1,
          duration: 12000,
          useNativeDriver: true,
        }),
        Animated.timing(anim3, {
          toValue: 0,
          duration: 12000,
          useNativeDriver: true,
        }),
      ])
    );

    animate1.start();
    animate2.start();
    animate3.start();

    return () => {
      animate1.stop();
      animate2.stop();
      animate3.stop();
    };
  }, []);

  const translateY1 = anim1.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 30],
  });

  const translateX1 = anim1.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 20],
  });

  const translateY2 = anim2.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -25],
  });

  const translateX2 = anim2.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -15],
  });

  const translateY3 = anim3.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 35],
  });

  const translateX3 = anim3.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 25],
  });

  return (
    <View style={styles.container}>
      {/* Base Background with Gradient Effect */}
      <View style={styles.baseBackground}>
        <View style={styles.gradientLayer1} />
        <View style={styles.gradientLayer2} />
        <View style={styles.gradientLayer3} />
      </View>

      {/* Animated Floating Shapes */}
      <Animated.View
        style={[
          styles.shape,
          styles.shape1,
          {
            transform: [{ translateY: translateY1 }, { translateX: translateX1 }],
          },
        ]}
      >
        <View style={styles.shapeInner1} />
      </Animated.View>

      <Animated.View
        style={[
          styles.shape,
          styles.shape2,
          {
            transform: [{ translateY: translateY2 }, { translateX: translateX2 }],
          },
        ]}
      >
        <View style={styles.shapeInner2} />
      </Animated.View>

      <Animated.View
        style={[
          styles.shape,
          styles.shape3,
          {
            transform: [{ translateY: translateY3 }, { translateX: translateX3 }],
          },
        ]}
      >
        <View style={styles.shapeInner3} />
      </Animated.View>

      {/* Subtle Pattern Overlay */}
      <View style={styles.patternOverlay}>
        <View style={styles.patternLine} />
        <View style={[styles.patternLine, styles.patternLine2]} />
        <View style={[styles.patternLine, styles.patternLine3]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    zIndex: 0,
  },
  baseBackground: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  gradientLayer1: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F9FAFB',
  },
  gradientLayer2: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: '#F3F4F6',
    opacity: 0.5,
  },
  gradientLayer3: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '50%',
    bottom: 0,
    backgroundColor: '#E5E7EB',
    opacity: 0.3,
  },
  shape: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.1,
  },
  shape1: {
    width: 200,
    height: 200,
    top: -50,
    right: -50,
    backgroundColor: '#4F46E5',
  },
  shape2: {
    width: 150,
    height: 150,
    bottom: 100,
    left: -30,
    backgroundColor: '#7C3AED',
  },
  shape3: {
    width: 180,
    height: 180,
    top: height * 0.4,
    right: width * 0.3,
    backgroundColor: '#2563EB',
  },
  shapeInner1: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#4F46E5',
    opacity: 0.2,
  },
  shapeInner2: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#7C3AED',
    opacity: 0.2,
  },
  shapeInner3: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#2563EB',
    opacity: 0.2,
  },
  patternOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.03,
  },
  patternLine: {
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: '#4F46E5',
  },
  patternLine2: {
    top: '33%',
    transform: [{ rotate: '45deg' }],
  },
  patternLine3: {
    top: '66%',
    transform: [{ rotate: '-45deg' }],
  },
});

