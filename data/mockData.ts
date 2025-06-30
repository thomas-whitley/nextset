export interface CommunityPost {
  id: string;
  username: string;
  userAvatar: string;
  postImage: string;
  caption: string;
  likes: number;
  comments: number;
  timestamp: string;
}

export const communityPosts: CommunityPost[] = [
  {
    id: '1',
    username: 'sarah_fitness',
    userAvatar: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
    postImage: 'https://images.pexels.com/photos/416778/pexels-photo-416778.jpeg?auto=compress&cs=tinysrgb&w=800',
    caption: 'Just finished an amazing morning workout! 💪 Nothing beats that post-exercise endorphin rush. Who else is crushing their fitness goals today?',
    likes: 124,
    comments: 18,
    timestamp: '2h ago',
  },
  {
    id: '2',
    username: 'mike_trainer',
    userAvatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
    postImage: 'https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=800',
    caption: 'Deadlift day is the best day! Remember, form over weight every single time. Your future self will thank you.',
    likes: 89,
    comments: 12,
    timestamp: '4h ago',
  },
  {
    id: '3',
    username: 'yoga_emma',
    userAvatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
    postImage: 'https://images.pexels.com/photos/317157/pexels-photo-317157.jpeg?auto=compress&cs=tinysrgb&w=800',
    caption: 'Finding peace in movement. Today\'s yoga session was exactly what my mind and body needed. 🧘‍♀️✨',
    likes: 156,
    comments: 23,
    timestamp: '6h ago',
  },
  {
    id: '4',
    username: 'runner_alex',
    userAvatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
    postImage: 'https://images.pexels.com/photos/2402777/pexels-photo-2402777.jpeg?auto=compress&cs=tinysrgb&w=800',
    caption: '5K morning run complete! The sunrise views made every step worth it. Running isn\'t just exercise, it\'s therapy.',
    likes: 67,
    comments: 9,
    timestamp: '8h ago',
  },
  {
    id: '5',
    username: 'crossfit_jenny',
    userAvatar: 'https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
    postImage: 'https://images.pexels.com/photos/1552106/pexels-photo-1552106.jpeg?auto=compress&cs=tinysrgb&w=800',
    caption: 'WOD crushed! 💥 Today was all about pushing limits and breaking through mental barriers. The only bad workout is the one you didn\'t do.',
    likes: 203,
    comments: 31,
    timestamp: '1d ago',
  },
];