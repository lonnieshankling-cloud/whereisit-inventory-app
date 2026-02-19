import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

export function DashboardSkeleton() {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.container}>
      {/* Header Skeleton */}
      <View style={styles.header}>
        <Animated.View style={[styles.skeleton, styles.avatar, { opacity }]} />
        <View style={styles.headerText}>
          <Animated.View style={[styles.skeleton, styles.title, { opacity }]} />
          <Animated.View style={[styles.skeleton, styles.subtitle, { opacity }]} />
        </View>
      </View>

      {/* Stats Cards Skeleton */}
      <View style={styles.statsRow}>
        <Animated.View style={[styles.skeleton, styles.card, { opacity }]} />
        <Animated.View style={[styles.skeleton, styles.card, { opacity }]} />
      </View>

      {/* Search Bar Skeleton */}
      <Animated.View style={[styles.skeleton, styles.searchBar, { opacity }]} />

      {/* List Items Skeleton */}
      <View style={styles.list}>
        {[1, 2, 3, 4].map((key) => (
          <View key={key} style={styles.listItem}>
            <Animated.View style={[styles.skeleton, styles.listIcon, { opacity }]} />
            <View style={{ flex: 1 }}>
              <Animated.View style={[styles.skeleton, styles.listTitle, { opacity }]} />
              <Animated.View style={[styles.skeleton, styles.listSubtitle, { opacity }]} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  skeleton: {
    backgroundColor: '#E1E9EE',
    borderRadius: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 10,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  headerText: {
    marginLeft: 15,
    flex: 1,
  },
  title: {
    width: '60%',
    height: 20,
    marginBottom: 8,
  },
  subtitle: {
    width: '40%',
    height: 14,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  card: {
    width: '48%',
    height: 100,
  },
  searchBar: {
    width: '100%',
    height: 48,
    marginBottom: 24,
    borderRadius: 12,
  },
  list: {
    flex: 1,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  listIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 15,
  },
  listTitle: {
    width: '70%',
    height: 16,
    marginBottom: 6,
  },
  listSubtitle: {
    width: '40%',
    height: 12,
  },
});
