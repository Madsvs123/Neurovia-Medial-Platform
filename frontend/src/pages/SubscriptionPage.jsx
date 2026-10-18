import React, { useState } from 'react';
import {
  Box, Container, Heading, Text, Card, CardBody, CardHeader,
  Button, useColorModeValue, Icon, VStack, HStack, Alert, AlertIcon,
  Spinner, useToast
} from '@chakra-ui/react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FiAward, FiCreditCard, FiCheckCircle, FiAlertTriangle, FiArrowLeft } from 'react-icons/fi';
import { useAuth } from '../hooks/useAuth';

const PLAN_DETAILS = {
  premium: {
    name: 'Premium Plan',
    price: '$19.99',
    description: 'Full access to all Neurovia content and features',
    features: [
      'Unlimited course access',
      'All quizzes and exams',
      'Full clinical case library',
      'Certificates of completion'
    ]
  }
};

const SubscriptionPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const cardBg = useColorModeValue('white', 'gray.800');

  const planId = location.state?.planId || 'premium';
  const plan = PLAN_DETAILS[planId];

  if (!plan) {
    return (
      <Container py={20} textAlign="center">
        <Alert status="error" borderRadius="lg">
          <AlertIcon /> Invalid plan selected
        </Alert>
        <Button as={Link} to="/plans" leftIcon={<FiArrowLeft />} variant="link" colorScheme="blue" mt={4}>
          Back to Plans
        </Button>
      </Container>
    );
  }

  const handleSubscribe = async () => {
    setLoading(true);
    setError(null);

    try {
      // Simulate API call to create subscription
      // In a real app, this would call your backend to create a Stripe/PayPal subscription
      console.log('Creating subscription for plan:', planId);
      console.log('User:', user);

      // Simulate delay for API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Show success
      toast({
        title: 'Subscription Created',
        description: `You've successfully subscribed to ${plan.name}`,
        status: 'success',
        duration: 5000,
        isClosable: true
      });

      // In a real app, you would:
      // 1. Call backend to create subscription
      // 2. Redirect to payment provider (Stripe/PayPal)
      // 3. On successful payment, backend updates user.subscriptionPlan
      // 4. Redirect back to homepage or profile

      // For demo purposes, we'll just navigate to profile
      navigate('/profile', {
        state: {
          subscriptionSuccess: true,
          planName: plan.name
        }
      });

    } catch (err) {
      setError(err.message || 'Failed to create subscription');
      toast({
        title: 'Subscription Failed',
        description: error || 'Could not create subscription',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxW="800px" py={8}>
      <Button as={Link} to="/plans" leftIcon={<FiArrowLeft />} variant="ghost" colorScheme="blue" size="sm" mb={6}>
        Back to Plans
      </Button>

      <Card bg={cardBg} borderRadius="2xl" boxShadow="xl" overflow="hidden">
        <CardHeader bg="yellow.500" color="white" p={8} textAlign="center">
          <Box bg="white" w="60px" h="60px" borderRadius="xl" mx="auto" mb={4} display="flex" alignItems="center" justifyContent="center">
            <Icon as={FiAward} boxSize={8} color="yellow.500" />
          </Box>
          <Heading size="xl">{plan.name}</Heading>
          <Text fontSize="2xl" fontWeight="bold" mt={2}>{plan.price}/month</Text>
        </CardHeader>

        <CardBody p={8}>
          <Text fontSize="lg" textAlign="center" color="gray.500" mb={8}>
            {plan.description}
          </Text>

          {error && (
            <Alert status="error" borderRadius="lg" mb={6}>
              <AlertIcon />
              {error}
            </Alert>
          )}

          <VStack spacing={4} align="stretch" mb={8}>
            <Text fontSize="sm" fontWeight="semibold" color="gray.500" mb={2}>What's included:</Text>
            {plan.features.map((feature, idx) => (
              <HStack key={idx} spacing={3}>
                <Icon as={FiCheckCircle} boxSize={5} color="green.500" />
                <Text>{feature}</Text>
              </HStack>
            ))}
          </VStack>

          <Box bg="yellow.50" p={4} borderRadius="lg" mb={8}>
            <HStack spacing={3} mb={2}>
              <Icon as={FiAlertTriangle} boxSize={5} color="yellow.600" />
              <Text fontWeight="semibold" color="yellow.700">Important Notes</Text>
            </HStack>
            <VStack spacing={1} align="stretch" fontSize="sm" color="yellow.700">
              <Text>• Your subscription will auto-renew monthly</Text>
              <Text>• Cancel anytime from your account settings</Text>
              <Text>• 30-day money-back guarantee</Text>
              <Text>• Secure payment via Stripe</Text>
            </VStack>
          </Box>

          <Button
            colorScheme="yellow"
            size="lg"
            w="full"
            leftIcon={<FiCreditCard />}
            onClick={handleSubscribe}
            isLoading={loading}
            loadingText="Processing..."
          >
            Subscribe Now
          </Button>

          <Text fontSize="xs" color="gray.500" textAlign="center" mt={4}>
            By subscribing, you agree to our <Link to="/terms" style={{ color: 'blue.500', textDecoration: 'underline' }}>Terms of Service</Link> and <Link to="/privacy" style={{ color: 'blue.500', textDecoration: 'underline' }}>Privacy Policy</Link>
          </Text>
        </CardBody>
      </Card>

      {/* Payment Methods */}
      <Box mt={8} bg={cardBg} borderRadius="xl" boxShadow="md" p={6} borderWidth="1px" borderColor={useColorModeValue('gray.100', 'gray.700')}>
        <Heading size="md" mb={4}>Accepted Payment Methods</Heading>
        <HStack spacing={4} justify="center" wrap="wrap" gap={4}>
          <Box bg="gray.50" p={3} borderRadius="lg" flex="1" minW="120px" textAlign="center">
            <Text fontSize="sm" fontWeight="semibold">Credit Card</Text>
            <Text fontSize="xs" color="gray.500">Visa, Mastercard, Amex</Text>
          </Box>
          <Box bg="gray.50" p={3} borderRadius="lg" flex="1" minW="120px" textAlign="center">
            <Text fontSize="sm" fontWeight="semibold">PayPal</Text>
            <Text fontSize="xs" color="gray.500">Secure checkout</Text>
          </Box>
          <Box bg="gray.50" p={3} borderRadius="lg" flex="1" minW="120px" textAlign="center">
            <Text fontSize="sm" fontWeight="semibold">Stripe</Text>
            <Text fontSize="xs" color="gray.500">Encrypted payments</Text>
          </Box>
        </HStack>
      </Box>
    </Container>
  );
};

export default SubscriptionPage;
