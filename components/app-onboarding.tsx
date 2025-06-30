import React, { useState, useEffect, createContext, useContext } from 'react';
// Import Supabase client from the installed package
import { createClient, Session, User, Provider } from '@supabase/supabase-js';

// --- CONFIGURATION & INITIALIZATION ---
// Use environment variables for Supabase credentials
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Initialize Supabase client, ensuring variables are defined
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Supabase URL and Anon Key must be provided in environment variables.");
}
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Define your app's color palette
const Colors = {
  light: {
    primary: '#0052FF',
    primaryLight: '#E6F0FF',
    accent: '#FF6B35',
    text: '#222222',
    textSecondary: '#4B5563',
    background: '#F7F7F7',
    backgroundSecondary: '#FFFFFF',
    border: '#E5E7EB',
    error: '#EF4444',
  },
  dark: {
    primary: '#4F8EF7',
    primaryLight: '#1E3A8A',
    accent: '#FF6B35',
    text: '#F9FAFB',
    textSecondary: '#E5E7EB',
    background: '#111827',
    backgroundSecondary: '#1F2937',
    border: '#374151',
    error: '#B91C1C',
  },
};

// --- ICONS (as SVG components for cleanliness) ---

const GoogleIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"></path>
    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"></path>
    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.222 0-9.618-3.226-11.283-7.582l-6.522 5.025C9.505 39.556 16.227 44 24 44z"></path>
    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.022 35.788 44 30.023 44 24c0-1.341-.138-2.65-.389-3.917z"></path>
  </svg>
);

interface AppleIconProps {
  color: string;
}

const AppleIcon: React.FC<AppleIconProps> = ({ color }) => (
  <svg className="w-6 h-6" fill={color} viewBox="0 0 24 24">
    <path d="M19.39,14.73A5.4,5.4,0,0,1,16,13.36a3.42,3.42,0,0,1,1.1-2.29,4.4,4.4,0,0,0-2.3-3.88,4.5,4.5,0,0,0-3.66.29,3.23,3.23,0,0,0-1.29,2.4,5.34,5.34,0,0,0,2.67,4.89,4.36,4.36,0,0,1-1.2,3.15A5.73,5.73,0,0,1,8.1,20.4a5.27,5.27,0,0,1-3.2-1.78,11.16,11.16,0,0,1-1.34-1.34,12.18,12.18,0,0,1,.63-1.89,10,10,0,0,1,1.13-1.58,11.9,11.9,0,0,1,1.55-1.5,4.28,4.28,0,0,1,3.45-1.4,4.33,4.33,0,0,1,2.83,1.06,1.44,1.44,0,0,0,1-.06,3.61,3.61,0,0,0-2.33-3.15,4.42,4.42,0,0,1,2.18-1,3.6,3.6,0,0,1,2.5.85,10.66,10.66,0,0,0-1.48,5.18,5.48,5.48,0,0,1,3.34-1.21,5.25,5.25,0,0,1,3,1.38,4.86,4.86,0,0,1,1.5,3.33A5.22,5.22,0,0,1,19.39,14.73ZM12.11,5.48a3.13,3.13,0,0,1,1.39-2.32,3.33,3.33,0,0,0-1.55-1A3.2,3.2,0,0,0,9.63,4.4,3.09,3.09,0,0,1,12.11,5.48Z"/>
  </svg>
);


// --- AUTHENTICATION CONTEXT ---
// Provides auth state and functions to the entire app
interface AuthContextType {
  session: Session | null;
  user: User | null | undefined;
  signOut: () => Promise<{ error: Error | null }>;
  loading: boolean;
}
const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for an active session on initial load
    const getSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setLoading(false);
    };
    getSession();

    // Listen for changes in authentication state
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    // Cleanup subscription on unmount
    return () => subscription.unsubscribe();
  }, []);

  const value = {
    session,
    user: session?.user,
    loading,
    signOut: () => supabase.auth.signOut(),
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined || context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// --- UI COMPONENTS ---
interface InputFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: string; // In React Native, this would be more specific like KeyboardTypeOptions
}

const InputField: React.FC<InputFieldProps> = ({
  label, value, onChangeText, placeholder,
  secureTextEntry = false,
  // keyboardType = 'default' // keyboardType is not a standard HTML input attribute
}) => {
  // Using a simplified component structure for web-like React
  // In React Native, you'd use <TextInput> from 'react-native'
  const colors = Colors.light; // simplified for example
  return (
    <div className="w-full mb-4">
      <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>
        {label}
      </label>
      <input
        type={secureTextEntry ? 'password' : 'text'}
        value={value}
        onChange={(e) => onChangeText(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2"
        style={{
          backgroundColor: colors.background,
          border: `1px solid ${colors.border}`,
          color: colors.text,
          borderColor: colors.border,
          '--tw-ring-color': colors.primary
        }}
        // In React Native, these would be props like `secureTextEntry` and `keyboardType`
      />
    </div>
  );
};

interface StyledButtonProps {
  title: string;
  onPress: () => void;
  isLoading?: boolean;
  type?: 'primary' | 'secondary';
}

const StyledButton: React.FC<StyledButtonProps> = ({ title, onPress, isLoading = false, type = 'primary' }) => {
  const colors = Colors.light;
  const bgColor = type === 'primary' ? colors.primary : colors.backgroundSecondary;
  const textColor = type === 'primary' ? colors.backgroundSecondary : colors.primary;
  const borderColor = type === 'primary' ? 'transparent' : colors.primary;

  return (
    <button
      onClick={onPress}
      disabled={isLoading}
      className="w-full py-3 px-4 rounded-lg font-semibold text-center transition-opacity duration-200 disabled:opacity-50"
      style={{
        backgroundColor: bgColor,
        color: textColor,
        border: `2px solid ${borderColor}`,
      }}
    >
      {isLoading ? 'Loading...' : title}
    </button>
  );
};

interface SocialButtonProps {
  provider: string;
  icon: React.ReactNode;
  onPress: () => void;
  isLoading?: boolean;
}

const SocialButton: React.FC<SocialButtonProps> = ({ provider, icon, onPress, isLoading = false }) => {
    const colors = Colors.light;
    return (
        <button
            onClick={onPress}
            disabled={isLoading}
            className="w-full flex items-center justify-center py-3 px-4 rounded-lg font-semibold text-center transition-opacity duration-200 disabled:opacity-50 mb-4"
            style={{
                backgroundColor: colors.backgroundSecondary,
                color: colors.text,
                border: `1px solid ${colors.border}`,
            }}
        >
            {icon}
            <span className="ml-3">Continue with {provider}</span>
        </button>
    );
};


// --- SCREENS ---
interface AuthScreenProps {
  setView: (view: 'main' | 'signup' | 'login') => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ setView }) => {
  const [loading, setLoading] = useState<Provider | null>(null);
  const colors = Colors.light;

  const handleOAuth = async (provider: Provider) => {
    setLoading(provider);
    const { error } = await supabase.auth.signInWithOAuth({ provider });
    if (error) {
      alert(error.message); // Replace with a better modal in a real app
    }
    setLoading(null);
  };

  return (
    <div className="w-full max-w-sm p-8 space-y-6" style={{ backgroundColor: colors.backgroundSecondary, borderRadius: '1.5rem' }}>
      <div className="text-center">
        <h1 className="text-3xl font-bold" style={{ color: colors.text }}>Get Started</h1>
        <p className="mt-2 text-md" style={{ color: colors.textSecondary }}>Create an account to join the elite.</p>
      </div>

      <div className="space-y-4">
        <SocialButton provider="Google" icon={<GoogleIcon />} onPress={() => handleOAuth('google')} isLoading={loading === 'google'} />
        <SocialButton provider="Apple" icon={<AppleIcon color={colors.text} />} onPress={() => handleOAuth('apple')} isLoading={loading === 'apple'} />
      </div>

      <div className="flex items-center">
        <hr className="w-full" style={{borderColor: colors.border}} />
        <span className="p-2 text-sm" style={{color: colors.textSecondary}}>OR</span>
        <hr className="w-full" style={{borderColor: colors.border}}/>
      </div>

      <StyledButton title="Sign up with Email" onPress={() => setView('signup')} type="primary" />

      <p className="text-center text-sm" style={{ color: colors.textSecondary }}>
        Already have an account?{' '}
        <button onClick={() => setView('login')} className="font-semibold" style={{ color: colors.primary }}>
          Log In
        </button>
      </p>
    </div>
  );
};

interface SignUpScreenProps {
  setView: (view: 'main' | 'signup' | 'login') => void;
}

const SignUpScreen: React.FC<SignUpScreenProps> = ({ setView }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const colors = Colors.light;

  const handleSignUp = async () => {
    if (!email || !password || !fullName || !username) {
        alert("Please fill all required fields.");
        return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          full_name: fullName,
          username: username,
          phone: phone,
        },
      },
    });
    if (error) {
      alert(error.message);
    } else if (!data.session) {
      alert('Please check your email for a confirmation link to complete your sign up.');
    }
    setLoading(false);
  };

  return (
    <div className="w-full max-w-sm p-8 space-y-4" style={{ backgroundColor: colors.backgroundSecondary, borderRadius: '1.5rem' }}>
      <div className="text-center">
        <h1 className="text-3xl font-bold" style={{ color: colors.text }}>Create Account</h1>
      </div>
      <InputField label="Full Name" value={fullName} onChangeText={setFullName} placeholder="John Doe" />
      <InputField label="Username" value={username} onChangeText={setUsername} placeholder="johndoe" />
      <InputField label="Email Address" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" />
      <InputField label="Phone Number (Optional)" value={phone} onChangeText={setPhone} placeholder="+1234567890" keyboardType="phone-pad" />
      <InputField label="Password" value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry />
      
      <div className="pt-2">
        <StyledButton title="Create Account" onPress={handleSignUp} isLoading={loading} type="primary" />
      </div>

      <p className="text-center text-sm" style={{ color: colors.textSecondary }}>
        Already a member?{' '}
        <button onClick={() => setView('login')} className="font-semibold" style={{ color: colors.primary }}>
          Log In
        </button>
      </p>
    </div>
  );
};

interface LogInScreenProps {
  setView: (view: 'main' | 'signup' | 'login') => void;
}

const LogInScreen: React.FC<LogInScreenProps> = ({ setView }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const colors = Colors.light;

  const handleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });
    if (error) alert(error.message);
    setLoading(false);
  };

  return (
    <div className="w-full max-w-sm p-8 space-y-6" style={{ backgroundColor: colors.backgroundSecondary, borderRadius: '1.5rem' }}>
       <div className="text-center">
        <h1 className="text-3xl font-bold" style={{ color: colors.text }}>Welcome Back</h1>
        <p className="mt-2 text-md" style={{ color: colors.textSecondary }}>Log in to continue your journey.</p>
      </div>

      <InputField label="Email Address" value={email} onChangeText={setEmail} placeholder="you@example.com" />
      <InputField label="Password" value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry />

      <StyledButton title="Log In" onPress={handleLogin} isLoading={loading} type="primary" />

      <p className="text-center text-sm" style={{ color: colors.textSecondary }}>
        Don't have an account?{' '}
        <button onClick={() => setView('signup')} className="font-semibold" style={{ color: colors.primary }}>
          Sign Up
        </button>
      </p>
    </div>
  );
};


// --- NAVIGATION / APP ENTRY POINT ---

const AuthFlow = () => {
  // This state determines which auth screen is visible: 'main', 'signup', or 'login'
  const [view, setView] = useState<'main' | 'signup' | 'login'>('main'); 
  const colors = Colors.light;

  const renderView = () => {
    switch (view) {
      case 'signup':
        return <SignUpScreen setView={setView} />;
      case 'login':
        return <LogInScreen setView={setView} />;
      case 'main':
      default:
        return <AuthScreen setView={setView} />;
    }
  };

  return (
    <div className="w-full h-screen flex items-center justify-center font-sans" style={{ backgroundColor: colors.background }}>
      {renderView()}
    </div>
  );
};

const Dashboard = () => {
  const { user, signOut, loading: authLoading } = useAuth(); // Added authLoading
  const colors = Colors.light;

  return (
    <div className="w-full h-screen flex flex-col items-center justify-center font-sans" style={{ backgroundColor: colors.background }}>
      <div className="text-center p-8" style={{ backgroundColor: colors.backgroundSecondary, borderRadius: '1.5rem' }}>
          <h1 className="text-3xl font-bold" style={{ color: colors.text }}>Dashboard</h1>
          <p className="mt-2 text-lg" style={{ color: colors.textSecondary }}>
            Welcome, {user?.user_metadata?.full_name || user?.email}!
          </p>
          <p className="mt-1 text-sm" style={{ color: colors.textSecondary }}>
            This is where your main app content will live.
          </p>
          <div className="mt-8">
            <StyledButton title="Sign Out" onPress={signOut} type="secondary" />
          </div>
      </div>
    </div>
  );
};


// --- MAIN APP COMPONENT ---
export default function App() {
  return (
    <AuthProvider>
      <AppContainer />
    </AuthProvider>
  );
}

const AppContainer = () => {
  const { session, loading: authLoading } = useAuth();

  // Optionally, show a loading indicator while auth state is being determined
  if (authLoading) return <div className="w-full h-screen flex items-center justify-center">Loading authentication...</div>;

  // Conditionally render the correct flow based on auth session
  return session && session.user ? <Dashboard /> : <AuthFlow />;
};
