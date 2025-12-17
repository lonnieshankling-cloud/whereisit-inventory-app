import { Animated, Easing } from 'react-native';

/**
 * Animation utilities for consistent, smooth transitions across the app
 */

export const AnimationTimings = {
  fast: 150,
  normal: 250,
  slow: 350,
};

export const AnimationEasings = {
  easeIn: Easing.in(Easing.ease),
  easeOut: Easing.out(Easing.ease),
  easeInOut: Easing.inOut(Easing.ease),
  spring: Easing.elastic(1),
};

/**
 * Fade in animation
 */
export const fadeIn = (
  animatedValue: Animated.Value,
  duration: number = AnimationTimings.normal,
  callback?: () => void
) => {
  Animated.timing(animatedValue, {
    toValue: 1,
    duration,
    easing: AnimationEasings.easeOut,
    useNativeDriver: true,
  }).start(callback);
};

/**
 * Fade out animation
 */
export const fadeOut = (
  animatedValue: Animated.Value,
  duration: number = AnimationTimings.normal,
  callback?: () => void
) => {
  Animated.timing(animatedValue, {
    toValue: 0,
    duration,
    easing: AnimationEasings.easeIn,
    useNativeDriver: true,
  }).start(callback);
};

/**
 * Slide up animation
 */
export const slideUp = (
  animatedValue: Animated.Value,
  toValue: number = 0,
  callback?: () => void
) => {
  Animated.spring(animatedValue, {
    toValue,
    damping: 25,
    stiffness: 120,
    useNativeDriver: true,
  }).start(callback);
};

/**
 * Slide down animation
 */
export const slideDown = (
  animatedValue: Animated.Value,
  toValue: number,
  callback?: () => void
) => {
  Animated.timing(animatedValue, {
    toValue,
    duration: AnimationTimings.normal,
    easing: AnimationEasings.easeIn,
    useNativeDriver: true,
  }).start(callback);
};

/**
 * Scale animation
 */
export const scale = (
  animatedValue: Animated.Value,
  toValue: number = 1,
  duration: number = AnimationTimings.normal,
  callback?: () => void
) => {
  Animated.spring(animatedValue, {
    toValue,
    damping: 15,
    stiffness: 100,
    useNativeDriver: true,
  }).start(callback);
};

/**
 * Combine multiple animations in parallel
 */
export const parallelAnimations = (
  animations: Animated.CompositeAnimation[],
  callback?: () => void
) => {
  Animated.parallel(animations).start(callback);
};

/**
 * Combine multiple animations in sequence
 */
export const sequenceAnimations = (
  animations: Animated.CompositeAnimation[],
  callback?: () => void
) => {
  Animated.sequence(animations).start(callback);
};
