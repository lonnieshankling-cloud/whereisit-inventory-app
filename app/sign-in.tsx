import { useOAuth, useSignIn, useSignUp } from '@clerk/clerk-expo';
import * as WebBrowser from 'expo-web-browser';
import React, { useCallback } from 'react';
import { Image, KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/theme';
import { useWarmUpBrowser } from '../hooks/useWarmUpBrowser';

const Logo = require('../assets/images/icon.png');

WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  useWarmUpBrowser();
  const { signIn, setActive: setActiveSignIn, isLoaded: isSignInLoaded } = useSignIn();
  const { signUp, setActive: setActiveSignUp, isLoaded: isSignUpLoaded } = useSignUp();
  
  // Initialize OAuth flows
  const { startOAuthFlow: startGoogleAuth } = useOAuth({ strategy: "oauth_google" });
  const { startOAuthFlow: startAppleAuth } = useOAuth({ strategy: "oauth_apple" });
  
  // Note: We don't need manual navigation because app/_layout.tsx listens to authentication state changes
  // and redirects automatically when 'isSignedIn' becomes true.
  
  const [mode, setMode] = React.useState<'signin' | 'signup'>('signin');
  const [emailAddress, setEmailAddress] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [pendingVerification, setPendingVerification] = React.useState(false);
  const [code, setCode] = React.useState('');

  const isLoaded = isSignInLoaded && isSignUpLoaded;

  const onSignInPress = async () => {
    if (!isLoaded) return;
    setLoading(true);
    setError('');
    try {
      const completeSignIn = await signIn.create({
        identifier: emailAddress,
        password,
      });
      console.log('Sign in successful', completeSignIn.status);
      await setActiveSignIn({ session: completeSignIn.createdSessionId });
      // No router.replace('/') here! Layout handles it.
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2));
      setError(err.errors?.[0]?.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const onSignUpPress = async () => {
    if (!isLoaded) return;
    setLoading(true);
    setError('');
    try {
      await signUp.create({
        emailAddress,
        password,
      });

      // Send email verification code
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      
      setPendingVerification(true);
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2));
      setError(err.errors?.[0]?.message || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  const onVerifyPress = async () => {
    if (!isLoaded) return;
    setLoading(true);
    setError('');
    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (completeSignUp.status === 'complete') {
        await setActiveSignUp({ session: completeSignUp.createdSessionId });
        // Layout handles redirect
      } else {
        console.log('Verification incomplete', completeSignUp);
        setError('Verification failed. Please try again.');
      }
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2));
      setError(err.errors?.[0]?.message || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  const onSocialSignIn = useCallback(async (strategy: 'google' | 'apple') => {
    try {
      setLoading(true);
      setError('');
      const startFlow = strategy === 'google' ? startGoogleAuth : startAppleAuth;
      
      const { createdSessionId, setActive: setSocialActive, signUp, signIn } = await startFlow();
      
      if (createdSessionId) {
        if (setSocialActive) {
           await setSocialActive({ session: createdSessionId });
        }
        // Layout handles redirect
      } else {
        // If no createdSessionId, it means further steps are needed (e.g. MFA)
        // or the user cancelled.
        console.log('Social auth incomplete', { createdSessionId, signIn, signUp });
      }
    } catch (err: any) {
      console.error("OAuth error", err);
      // Don't show error if user cancelled (common in OAuth flow)
      // Check for specific error codes if possible, otherwise generic message
      if ((err as any)?.code !== 'session_exists') {
          setError('Social authentication failed or cancelled.');
      }
    } finally {
      setLoading(false);
    }
  }, [startGoogleAuth, startAppleAuth]);

  // Show verification screen if pending
  if (pendingVerification) {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.logoContainer}>
            <Image source={Logo} style={styles.logo} resizeMode="contain" />
            <Text style={styles.appName}>Verify Your Email</Text>
            <Text style={styles.tagline}>Enter the code sent to {emailAddress}</Text>
          </View>

          <View style={styles.formContainer}>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.inputContainer}>
              <TextInput
                value={code}
                placeholder="Verification Code"
                placeholderTextColor="#666"
                onChangeText={setCode}
                style={styles.input}
                keyboardType="number-pad"
                autoFocus
              />
            </View>

            <TouchableOpacity 
              style={[styles.button, loading && styles.buttonDisabled]} 
              onPress={onVerifyPress}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Verifying...' : 'Verify Email'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => {
                setPendingVerification(false);
                setCode('');
                setError('');
              }}
            >
              <Text style={styles.linkText}>← Back to sign up</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.logoContainer}>
          <Image source={Logo} style={styles.logo} resizeMode="contain" />
          <Text style={styles.appName}>WhereIsIt?</Text>
          <Text style={styles.tagline}>Find your stuff, fast.</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.welcomeText}>
            {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
          </Text>
          
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Social Logins */}
          <View style={styles.socialContainer}>
            <TouchableOpacity 
                style={[styles.socialButton, styles.googleButton]} 
                onPress={() => onSocialSignIn('google')}
                disabled={loading}
            >
                {/* Simple Text Fallback */}
                <Text style={styles.socialButtonTextInternal}>Continue with Google</Text>
            </TouchableOpacity>

            <TouchableOpacity 
                style={[styles.socialButton, styles.appleButton]} 
                onPress={() => onSocialSignIn('apple')}
                disabled={loading}
            >
                <Text style={[styles.socialButtonTextInternal, styles.appleButtonText]}>Continue with Apple</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider}>
             <View style={styles.dividerLine} />
             <Text style={styles.dividerText}>OR</Text>
             <View style={styles.dividerLine} />
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              autoCapitalize="none"
              value={emailAddress}
              placeholder="Email..."
              placeholderTextColor="#666"
              onChangeText={(emailAddress) => setEmailAddress(emailAddress)}
              style={styles.input}
            />
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              value={password}
              placeholder="Password..."
              placeholderTextColor="#666"
              secureTextEntry={true}
              onChangeText={(password) => setPassword(password)}
              style={styles.input}
            />
          </View>

          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]} 
            onPress={mode === 'signin' ? onSignInPress : onSignUpPress}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading 
                ? (mode === 'signin' ? 'Signing In...' : 'Creating Account...') 
                : (mode === 'signin' ? 'Sign In' : 'Sign Up')}
            </Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {mode === 'signin' ? "Don't have an account?" : "Already have an account?"}
            </Text>
            <TouchableOpacity onPress={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setError('');
            }}>
              <Text style={styles.linkText}>
                {mode === 'signin' ? 'Sign up' : 'Sign in'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30, 
  },
  logo: {
    width: 90,
    height: 90,
    marginBottom: 10,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  tagline: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  formContainer: {
    width: '100%',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 15,
  },
  input: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    fontSize: 16,
    color: '#333',
  },
  button: {
    backgroundColor: Colors.light.tint, 
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    gap: 5,
  },
  footerText: {
    color: '#666',
    fontSize: 14,
  },
  linkText: {
    color: Colors.light.tint,
    fontWeight: '600',
    fontSize: 14,
  },
  // Social Styles
  socialContainer: {
    gap: 12,
    marginBottom: 20,
  },
  socialButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  googleButton: {
    backgroundColor: '#fff',
  },
  appleButton: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  socialButtonTextInternal: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  appleButtonText: {
    color: '#fff',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  dividerText: {
    marginHorizontal: 10,
    color: '#999',
    fontSize: 14,
  },
  backButton: {
    marginTop: 20,
    alignItems: 'center',
  },
});
