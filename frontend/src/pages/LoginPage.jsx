import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Flex, Heading, Text, FormControl, FormLabel, Input, Button,
  useColorModeValue, Link, Alert, AlertIcon, useToast, Divider,
  InputGroup, InputRightElement, VStack, Image, AbsoluteCenter,
  HStack, Spinner
} from '@chakra-ui/react';
import { FiMail, FiLock, FiEye, FiEyeOff, FiLogIn } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import { useNavigate, Link as RouterLink, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const LOGIN_IMAGE = 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const location = useLocation();

  // Prefill from the registration redirect only. Passwords are never stored.
  useEffect(() => {
    localStorage.removeItem('loginPassword');
    if (location.state?.formData) {
      setEmail(location.state.formData.email || '');
      setPassword(location.state.formData.password || '');
      return;
    }
    const savedEmail = localStorage.getItem('loginEmail') || '';
    if (savedEmail) setEmail(savedEmail);
  }, [location.state]);

  useEffect(() => {
    if (email) {
      localStorage.setItem('loginEmail', email);
    } else {
      localStorage.removeItem('loginEmail');
    }
  }, [email]);

  const navigate = useNavigate();
  const toast = useToast();
  const { login, googleLogin, error, loading } = useAuth();
  const formBg = useColorModeValue('white', 'gray.900');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');
  const sectionBg = useColorModeValue('gray.50', 'gray.800');

  useEffect(() => {
    if (error) {
      toast({
        title: 'Login failed',
        description: error,
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top-right',
      });
    }
  }, [error, toast]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: 'Missing fields',
        description: 'Please enter both email and password',
        status: 'warning',
        duration: 3000,
      });
      return;
    }
    const result = await login(email, password);
    if (result.success) {
      navigate('/');
    }
  };

  // Google OAuth success handler
  const handleGoogleSuccess = useCallback(async (credentialResponse) => {
    setIsGoogleLoading(true);
    try {
      const result = await googleLogin({ credential: credentialResponse.credential });
      if (result.success) {
        navigate('/');
      }
    } catch (err) {
      console.error('Google login failed:', err);
    } finally {
      setIsGoogleLoading(false);
    }
  }, [googleLogin, navigate]);

  const handleGoogleError = useCallback(() => {
    toast({
      title: 'Google login failed',
      description: 'Google authentication was cancelled or failed. Please try again.',
      status: 'error',
      duration: 5000,
      isClosable: true,
    });
    setIsGoogleLoading(false);
  }, [toast]);

  // Dynamically import GoogleLogin only when needed (lazy)
  const [GoogleLoginComp, setGoogleLoginComp] = useState(null);
  useEffect(() => {
    import('@react-oauth/google').then((mod) => {
      setGoogleLoginComp(() => mod.GoogleLogin);
    }).catch(() => {
      // @react-oauth/google not installed — Google button won't render
    });
  }, []);

  return (
    <Flex minH="100vh" overflow="hidden">
      {/* Left Side - Image */}
      <Box
        flex="1"
        position="relative"
        display={{ base: 'none', lg: 'block' }}
        bg="teal.500"
      >
        <Image
          src={LOGIN_IMAGE}
          alt="Medical Education"
          objectFit="cover"
          w="100%"
          h="100%"
          fallbackSrc="https://via.placeholder.com/800x1200?text=Medical+Education"
        />
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          bg="linear-gradient(135deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 100%)"
        />
        <Box
          position="absolute"
          bottom={12}
          left={8}
          right={8}
          color="white"
        >
          <Heading size="2xl" mb={4}>
            Welcome Back!
          </Heading>
          <Text fontSize="lg" opacity={0.9}>
            Sign in to access your medical education resources
          </Text>
        </Box>
      </Box>

      {/* Right Side - Login Form */}
      <Flex
        flex="1"
        align="center"
        justify="center"
        bg={formBg}
        p={8}
        overflowY="auto"
      >
        <Box w="full" maxW="450px">
          {/* Logo/Brand */}
          <Box textAlign="center" mb={8}>
            <Box
              as="span"
              fontSize="3xl"
              fontWeight="bold"
              bgGradient="linear(to-r, teal.500, blue.600)"
              bgClip="text"
            >
              Neurovia
            </Box>
            <Heading size="xl" mt={4} mb={2}>
              Sign In
            </Heading>
            <Text color="gray.500">
              Enter your credentials to access your account
            </Text>
          </Box>

          {error && (
            <Alert status="error" mb={6} borderRadius="lg">
              <AlertIcon />
              {error}
            </Alert>
          )}

          {/* Registration success message */}
          {location.state?.registrationSuccess && (
            <Alert status="success" borderRadius="lg" mb={4}>
              <AlertIcon />
              <Text>Registration successful! Please log in with your credentials.</Text>
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <VStack spacing={5}>
              <FormControl isRequired>
                <FormLabel fontSize="sm" fontWeight="medium">Email Address</FormLabel>
                <InputGroup>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    size="lg"
                    borderRadius="lg"
                    pl={10}
                  />
                  <Box position="absolute" left={3} top="50%" transform="translateY(-50%)">
                    <FiMail color="gray.400" />
                  </Box>
                </InputGroup>
              </FormControl>

              <FormControl isRequired>
                <FormLabel fontSize="sm" fontWeight="medium">Password</FormLabel>
                <InputGroup>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    size="lg"
                    borderRadius="lg"
                    pl={10}
                  />
                  <Box position="absolute" left={3} top="50%" transform="translateY(-50%)">
                    <FiLock color="gray.400" />
                  </Box>
                  <InputRightElement h="full">
                    <Button
                      variant="ghost"
                      onClick={() => setShowPassword(!showPassword)}
                      size="sm"
                    >
                      {showPassword ? <FiEyeOff /> : <FiEye />}
                    </Button>
                  </InputRightElement>
                </InputGroup>
              </FormControl>

              <Flex justify="flex-end" w="full">
                <Link
                  as={RouterLink}
                  to="/forgot-password"
                  color="teal.500"
                  fontSize="sm"
                  _hover={{ textDecoration: 'underline' }}
                >
                  Forgot password?
                </Link>
              </Flex>

              <Button
                type="submit"
                colorScheme="teal"
                size="lg"
                w="full"
                isLoading={loading}
                loadingText="Signing In..."
                leftIcon={<FiLogIn />}
                _hover={{ transform: 'translateY(-2px)' }}
                transition="all 0.2s"
              >
                Sign In
              </Button>
            </VStack>
          </form>

          <Box position="relative" my={8}>
            <Divider />
            <AbsoluteCenter bg={formBg} px={4}>
              <Text fontSize="sm" color="gray.500">OR</Text>
            </AbsoluteCenter>
          </Box>

          {/* Google OAuth Button */}
          <Box w="full" display="flex" justifyContent="center">
            {GoogleLoginComp ? (
              <GoogleLoginComp
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                useOneTap
                theme="outline"
                size="large"
                width="400"
                text="continue_with"
                shape="rectangular"
                logo_alignment="center"
              />
            ) : (
              <Button
                w="full"
                size="lg"
                variant="outline"
                leftIcon={<FcGoogle size={20} />}
                onClick={() => {
                  toast({
                    title: 'Google OAuth',
                    description: 'Install @react-oauth/google or set VITE_GOOGLE_CLIENT_ID to enable.',
                    status: 'info',
                    duration: 4000,
                  });
                }}
                isLoading={isGoogleLoading}
                _hover={{ bg: hoverBg }}
                borderRadius="lg"
              >
                Continue with Google
              </Button>
            )}
          </Box>

          <Flex justify="center" mt={6}>
            <Text color="gray.500">
              Don't have an account?{' '}
              <Link
                as={RouterLink}
                to="/register"
                color="teal.500"
                fontWeight="semibold"
                _hover={{ textDecoration: 'underline' }}
              >
                Create Account
              </Link>
            </Text>
          </Flex>

          {/* Demo Credentials */}
          <Box mt={8} p={4} bg={sectionBg} borderRadius="lg" textAlign="center">
            <Text fontSize="sm" fontWeight="medium" mb={2}>
              Demo Credentials
            </Text>
            <Text fontSize="xs" color="gray.500">
              Email: user@example.com
            </Text>
            <Text fontSize="xs" color="gray.500">
              Password: password123
            </Text>
          </Box>
        </Box>
      </Flex>
    </Flex>
  );
};

export default LoginPage;
