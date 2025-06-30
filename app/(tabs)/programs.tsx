import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus } from 'lucide-react-native';
import { router } from 'expo-router';
import Colors from '@/constants/Colors';
import { useWorkout } from '@/contexts/WorkoutContext';

export default function ProgramsScreen() {
  const { programs, setCurrentProgram } = useWorkout();

  const handleProgramPress = (program: any) => {
    setCurrentProgram(program);
    router.push({
      pathname: '/program-detail',
      params: { programId: program.id }
    });
  };

  const handleCreateProgram = () => {
    router.push('/create-program');
  };

  const ProgramCard = ({ program }: { program: any }) => (
    <TouchableOpacity 
      style={styles.programCard} 
      onPress={() => handleProgramPress(program)}
      activeOpacity={0.8}
    >
      <Image source={{ uri: program.imageUrl }} style={styles.programImage} />
      <View style={styles.programContent}>
        <View style={styles.programHeader}>
          <Text style={styles.programName}>{program.name}</Text>
          <Text style={styles.programCreator}>{program.creator}</Text>
        </View>
        
        <View style={styles.programDays}>
          {program.workouts.slice(0, 3).map((workout: any, index: number) => (
            <View key={index} style={styles.dayTag}>
              <Text style={styles.dayTagText}>{workout.name}</Text>
            </View>
          ))}
          {program.workouts.length > 3 && (
            <View style={styles.dayTag}>
              <Text style={styles.dayTagText}>+{program.workouts.length - 3}</Text>
            </View>
          )}
        </View>

        <View style={styles.programStats}>
          <Text style={styles.statText}>{program.workouts.length} workouts</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Programs</Text>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.programList}>
          {programs.map((program) => (
            <ProgramCard key={program.id} program={program} />
          ))}
          
          <TouchableOpacity 
            style={styles.createButton} 
            onPress={handleCreateProgram}
            activeOpacity={0.8}
          >
            <Plus size={24} color={Colors.light.primary} />
            <Text style={styles.createButtonText}>Create New Program</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: Colors.light.text,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  programList: {
    paddingBottom: 40,
  },
  programCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 4,
      },
    }),
  },
  programImage: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  programContent: {
    padding: 16,
  },
  programHeader: {
    marginBottom: 12,
  },
  programName: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: Colors.light.text,
    marginBottom: 4,
  },
  programCreator: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textTertiary,
  },
  programDays: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  dayTag: {
    backgroundColor: Colors.light.primaryLight,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginRight: 8,
    marginBottom: 4,
  },
  dayTagText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: Colors.light.primary,
  },
  programStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textTertiary,
  },
  createButton: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderWidth: 2,
    borderColor: Colors.light.border,
    borderStyle: 'dashed',
  },
  createButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: Colors.light.primary,
    marginLeft: 8,
  },
});