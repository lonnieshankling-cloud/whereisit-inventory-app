import { useAuth, useSignIn } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { setAuthToken } from '../services/api';

export default function SignInScreen() {
  const router = useRouter();
  const { signIn, setActive, isLoaded } = useSignIn();
  const { getToken } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [needsMFA, setNeedsMFA] = useState(false);

  const handleSignIn = async () => {
    if (!isLoaded) return;
    if (!signIn) {
      Alert.alert('Not ready', 'Sign-in is still initializing. Please try again.');
      return;
    }
    if (!email.trim() || !password) {
      Alert.alert('Missing info', 'Enter email and password');
      return;
    }
    try {
      setLoading(true);
      const result = await signIn.create({ identifier: email.trim(), password });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        const token = await getToken();
        if (token) {
          await setAuthToken(`Bearer ${token}`);
        }
        Alert.alert('Signed in', 'You are signed in.');
        router.replace('/');
      } else if (result.status === 'needs_second_factor') {
        setNeedsMFA(true);
        Alert.alert('Two-Factor Authentication', 'Check your email for a verification code.');
      } else {
        Alert.alert('Sign-in incomplete', result.status ?? 'unknown status');
      }
    } catch (err: any) {
      console.error('Sign-in error', err);
      Alert.alert('Sign-in failed', err?.errors?.[0]?.message || err?.message || 'Please try again');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMFA = async () => {
    if (!signIn) {
      Alert.alert('Not ready', 'Sign-in is still initializing. Please try again.');
      return;
    }
    if (!code.trim()) {
      Alert.alert('Missing code', 'Enter the verification code');
      return;
    }
    try {
      setLoading(true);
      const result = await signIn.attemptSecondFactor({ strategy: 'email_code', code });
      console.log('MFA attempt result:', result.status);
      if (result.status === 'complete') {
        console.log('Setting active session:', result.createdSessionId);
        await setActive({ session: result.createdSessionId });
        
        // Wait a moment for the session to be active
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const token = await getToken();
        console.log('Token after MFA:', token ? 'present' : 'missing');
        if (token) {
          const bearerToken = `Bearer ${token}`;
          console.log('Storing bearer token:', bearerToken.substring(0, 30) + '...');
          await setAuthToken(bearerToken);
        } else {
          console.warn('No token returned from getToken()');
        }
        Alert.alert('Signed in', 'You are signed in.');
        router.replace('/');
      } else {
        Alert.alert('Verification failed', result.status ?? 'unknown status');
      }
    } catch (err: any) {
      console.error('MFA error', err);
      Alert.alert('Verification failed', err?.errors?.[0]?.message || err?.message || 'Please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{needsMFA ? 'Verify Code' : 'Sign in'}</Text>
        {!needsMFA ? (
          <>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              secureTextEntry
              style={styles.input}
            />
            <TouchableOpacity style={styles.button} onPress={handleSignIn} disabled={loading}>
              <Text style={styles.buttonText}>{loading ? 'Signing in...' : 'Sign in'}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.hint}>Enter the verification code sent to your email</Text>
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder="Verification code"
              keyboardType="number-pad"
              style={styles.input}
            />
            <TouchableOpacity style={styles.button} onPress={handleVerifyMFA} disabled={loading}>
              <Text style={styles.buttonText}>{loading ? 'Verifying...' : 'Verify'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setNeedsMFA(false)}>
              <Text style={styles.backText}>← Back to sign in</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f7f7f7',
  },
  card: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  hint: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    backgroundColor: 'white',
  },
  button: {
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
  backText: {
    color: '#3B82F6',
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '500',
  },
});
