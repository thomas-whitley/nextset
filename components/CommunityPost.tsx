import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Heart, MessageCircle, Share } from 'lucide-react-native';

interface CommunityPostProps {
  username: string;
  userAvatar: string;
  postImage: string;
  caption: string;
  likes: number;
  comments: number;
  timestamp: string;
}

export default function CommunityPost({
  username,
  userAvatar,
  postImage,
  caption,
  likes,
  comments,
  timestamp,
}: CommunityPostProps) {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Image source={{ uri: userAvatar }} style={styles.avatar} />
        <View style={styles.userInfo}>
          <Text style={styles.username}>{username}</Text>
          <Text style={styles.timestamp}>{timestamp}</Text>
        </View>
      </View>

      {/* Post Image */}
      <Image source={{ uri: postImage }} style={styles.postImage} />

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton}>
          <Heart size={20} color="#1F2937" />
          <Text style={styles.actionText}>{likes}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <MessageCircle size={20} color="#1F2937" />
          <Text style={styles.actionText}>{comments}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Share size={20} color="#1F2937" />
        </TouchableOpacity>
      </View>

      {/* Caption */}
      <View style={styles.captionContainer}>
        <Text style={styles.caption}>
          <Text style={styles.captionUsername}>{username}</Text> {caption}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
  },
  timestamp: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  postImage: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  actionText: {
    fontSize: 14,
    color: '#1F2937',
    marginLeft: 6,
    fontFamily: 'Inter-Regular',
  },
  captionContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  caption: {
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 20,
    fontFamily: 'Inter-Regular',
  },
  captionUsername: {
    fontFamily: 'Inter-Bold',
  },
});