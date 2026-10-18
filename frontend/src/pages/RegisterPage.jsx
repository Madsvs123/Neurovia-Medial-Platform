import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Flex, Heading, Text, FormControl, FormLabel, Input, Button,
  useColorModeValue, Link, Alert, AlertIcon, useToast, Divider,
  InputGroup, InputRightElement, VStack, Image, AbsoluteCenter,
  Progress, Checkbox, HStack
} from '@chakra-ui/react';
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiUserPlus } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const REGISTER_IMAGE = 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const formBg = useColorModeValue('white', 'gray.900');
  const inputBg = useColorModeValue('white', 'gray.900');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');

  const navigate = useNavigate();
  const toast = useToast();
  const { register, googleLogin, error, loading } = useAuth();

  useEffect(() => {
    if (error) {
      toast({
        title: 'Registration failed',
        description: error,
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top-right',
      });
    }
  }, [error, toast]);

  useEffect(() => {
    const password = formData.password;
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++;
    if (password.match(/[0-9]/)) strength++;
    if (password.match(/[^a-zA-Z0-9]/)) strength++;
    setPasswordStrength(strength);
  }, [formData.password]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validateForm = () => {
    if (!formData.username.trim()) {
      toast({ title: 'Username required', status: 'warning', duration: 3000 });
      return false;
    }
    if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      toast({ title: 'Valid email required', status: 'warning', duration: 3000 });
      return false;
    }
    if (formData.password.length < 6) {
      toast({ title: 'Password must be at least 6 characters', status: 'warning', duration: 3000 });
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      toast({ title: 'Passwords do not match', status: 'warning', duration: 3000 });
      return false;
    }
    if (!acceptTerms) {
      toast({ title: 'Please accept Terms & Conditions', status: 'warning', duration: 3000 });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const result = await register({
      username: formData.username,
      email: formData.email,
      password: formData.password
    });
    if (result.success) {
      // Redirect to login with form data pre-filled
      navigate('/login', {
        state: {
          formData: {
            email: formData.email,
            password: formData.password
          },
          registrationSuccess: true
        }
      });
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
      console.error('Google sign-up failed:', err);
    } finally {
      setIsGoogleLoading(false);
    }
  }, [googleLogin, navigate]);

  const handleGoogleError = useCallback(() => {
    toast({
      title: 'Google sign-up failed',
      description: 'Google authentication was cancelled or failed. Please try again.',
      status: 'error',
      duration: 5000,
      isClosable: true,
    });
    setIsGoogleLoading(false);
  }, [toast]);

  // Dynamically import GoogleLogin
  const [GoogleLoginComp, setGoogleLoginComp] = useState(null);
  useEffect(() => {
    import('@react-oauth/google').then((mod) => {
      setGoogleLoginComp(() => mod.GoogleLogin);
    }).catch(() => {});
  }, []);

  const getPasswordStrengthColor = () => {
    const colors = ['red.400', 'orange.400', 'yellow.400', 'green.500'];
    return colors[passwordStrength - 1] || 'gray.200';
  };

  const getPasswordStrengthText = () => {
    const texts = ['Weak', 'Fair', 'Good', 'Strong'];
    return texts[passwordStrength - 1] || 'Very weak';
  };

  const passwordsMatch = formData.password && formData.confirmPassword &&
    formData.password === formData.confirmPassword;

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
          src={REGISTER_IMAGE}
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
            Join Neurovia
          </Heading>
          <Text fontSize="lg" opacity={0.9}>
            Create an account to access medical education resources
          </Text>
        </Box>
      </Box>

      {/* Right Side - Register Form */}
      <Flex
        flex="1"
        align="center"
        justify="center"
        bg={formBg}
        p={8}
        overflowY="auto"
      >
        <Box w="full" maxW="500px">
          {/* Logo/Brand */}
          <Box textAlign="center" mb={6}>
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
              Create Account
            </Heading>
            <Text color="gray.500">
              Join our community of medical learners
            </Text>
          </Box>

          {error && (
            <Alert status="error" mb={6} borderRadius="lg">
              <AlertIcon />
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel fontSize="sm" fontWeight="medium">
                  Username
                </FormLabel>
                <InputGroup>
                  <Input
                    name="username"
                    type="text"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="johndoe"
                    size="lg"
                    borderRadius="lg"
                    pl={10}
                  />
                  <Box position="absolute" left={3} top="50%" transform="translateY(-50%)">
                    <FiUser color="gray.400" />
                  </Box>
                </InputGroup>
              </FormControl>

              <FormControl isRequired>
                <FormLabel fontSize="sm" fontWeight="medium">
                  Email Address
                </FormLabel>
                <InputGroup>
                  <Input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
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
                <FormLabel fontSize="sm" fontWeight="medium">
                  Password
                </FormLabel>
                <InputGroup>
                  <Input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Create a password"
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

                {formData.password && (
                  <Box mt={2}>
                    <HStack justify="space-between" mb={1}>
                      <Text fontSize="xs" color="gray.500">Strength:</Text>
                      <Text fontSize="xs" fontWeight="medium" color={getPasswordStrengthColor()}>
                        {getPasswordStrengthText()}
                      </Text>
                    </HStack>
                    <Progress
                      value={passwordStrength * 25}
                      size="xs"
                      colorScheme={passwordStrength >= 3 ? 'green' : 'orange'}
                      borderRadius="full"
                    />
                  </Box>
                )}
              </FormControl>

              <FormControl isRequired>
                <FormLabel fontSize="sm" fontWeight="medium">
                  Confirm Password
                </FormLabel>
                <InputGroup>
                  <Input
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm your password"
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
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      size="sm"
                    >
                      {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                    </Button>
                  </InputRightElement>
                </InputGroup>
                {formData.confirmPassword && (
                  <Text fontSize="xs" color={passwordsMatch ? 'green.500' : 'red.500'} mt={1}>
                    {passwordsMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
                  </Text>
                )}
              </FormControl>

              <Checkbox
                isChecked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                colorScheme="teal"
                size="sm"
              >
                <Text fontSize="sm">
                  I agree to the <Link href="#" color="teal.500">Terms</Link> and <Link href="#" color="teal.500">Privacy Policy</Link>
                </Text>
              </Checkbox>

              <Button
                type="submit"
                colorScheme="teal"
                size="lg"
                w="full"
                isLoading={loading}
                loadingText="Creating account..."
                leftIcon={<FiUserPlus />}
                _hover={{ transform: 'translateY(-2px)' }}
                transition="all 0.2s"
              >
                Create Account
              </Button>
            </VStack>
          </form>

          <Box position="relative" my={6}>
            <Divider />
            <AbsoluteCenter bg={inputBg} px={4}>
              <Text fontSize="sm" color="gray.500">OR</Text>
            </AbsoluteCenter>
          </Box>

          {/* Google OAuth Button */}
          <Box w="full" display="flex" justifyContent="center">
            {GoogleLoginComp ? (
              <GoogleLoginComp
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                theme="outline"
                size="large"
                width="400"
                text="signup_with"
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
                Sign up with Google
              </Button>
            )}
          </Box>

          <Flex justify="center" mt={6}>
            <Text color="gray.500">
              Already have an account?{' '}
              <Link
                as={RouterLink}
                to="/login"
                color="teal.500"
                fontWeight="semibold"
                _hover={{ textDecoration: 'underline' }}
              >
                Sign In
              </Link>
            </Text>
          </Flex>
        </Box>
      </Flex>
    </Flex>
  );
};

export default RegisterPage;
