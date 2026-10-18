import React from 'react';
import {
  Box, Container, Heading, Text, SimpleGrid, Card, CardBody, CardHeader,
  Button, useColorModeValue, Icon, VStack, HStack, Badge, List, ListItem,
  ListIcon, useToast
} from '@chakra-ui/react';
import { Link, useNavigate } from 'react-router-dom';
import { FiAward, FiCheckCircle, FiXCircle, FiArrowRight, FiStar, FiClock } from 'react-icons/fi';
import { useAuth } from '../hooks/useAuth';

const PLANS = [
  {
    id: 'free',
    name: 'Free Plan',
    price: '$0',
    description: 'Basic access to limited content',
    features: [
      'Access to 5 free courses',
      'Basic quizzes',
      'Limited clinical cases',
      'Community support',
      'No certificates'
    ],
    disabledFeatures: [
      'Premium courses',
      'Advanced quizzes',
      'Full clinical case library',
      'Certificates of completion',
      'Priority support'
    ],
    color: 'blue',
    buttonText: 'Current Plan',
    buttonColor: 'blue',
    isCurrent: (user) => user?.subscriptionPlan === 'free'
  },
  {
    id: 'premium',
    name: 'Premium Plan',
    price: '$19.99/month',
    description: 'Full access to all content and features',
    features: [
      'Unlimited course access',
      'All quizzes and exams',
      'Full clinical case library',
      'Certificates of completion',
      'Priority support',
      'Early access to new content',
      'Downloadable resources',
      'Progress tracking'
    ],
    disabledFeatures: [],
    color: 'yellow',
    buttonText: (user) => user?.subscriptionPlan === 'premium' ? 'Current Plan' : 'Upgrade to Premium',
    buttonColor: (user) => user?.subscriptionPlan === 'premium' ? 'green' : 'yellow',
    isCurrent: (user) => user?.subscriptionPlan === 'premium'
  }
];

const PlanPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const cardBg = useColorModeValue('white', 'gray.800');

  const handleSubscribe = (planId) => {
    if (user?.subscriptionPlan === planId) {
      toast({
        title: 'Already Subscribed',
        description: `You're already on the ${planId} plan.`,
        status: 'info',
        duration: 3000,
        isClosable: true
      });
      return;
    }

    if (planId === 'free') {
      toast({
        title: 'Free Plan',
        description: 'You can use the free plan without subscription.',
        status: 'info',
        duration: 3000,
        isClosable: true
      });
      return;
    }

    // Navigate to subscription page for payment
    navigate('/subscription', { state: { planId } });
  };

  return (
    <Container maxW="1200px" py={8}>
      {/* Header */}
      <Box textAlign="center" mb={12}>
        <Box bg="purple.500" w="80px" h="80px" borderRadius="2xl" mx="auto" mb={4} display="flex" alignItems="center" justifyContent="center">
          <Icon as={FiAward} boxSize={10} color="white" />
        </Box>
        <Heading size="2xl" mb={3}>Choose Your Plan</Heading>
        <Text fontSize="lg" color="gray.500">Upgrade your learning experience</Text>

        {user?.subscriptionPlan && (
          <Box mt={4}>
            <Text fontSize="sm" color="gray.500">Current Plan</Text>
            <Badge
              colorScheme={user.subscriptionPlan === 'premium' ? 'yellow' : 'blue'}
              px={3} py={1} borderRadius="full" fontSize="md" fontWeight="bold"
            >
              {user.subscriptionPlan.charAt(0).toUpperCase() + user.subscriptionPlan.slice(1)}
            </Badge>
          </Box>
        )}
      </Box>

      {/* Plans Grid */}
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8} mb={12}>
        {PLANS.map((plan) => (
          <Card
            key={plan.id}
            bg={cardBg}
            borderRadius="2xl"
            boxShadow="xl"
            borderWidth="2px"
            borderColor={plan.isCurrent(user) ? `${plan.color}.500` : 'gray.200'}
            overflow="hidden"
            transition="all 0.3s"
            _hover={{ transform: 'translateY(-4px)', boxShadow: '2xl' }}
          >
            <CardHeader bg={plan.id === 'premium' ? 'yellow.500' : 'blue.500'} color="white" p={6} borderTopRadius="2xl">
              <HStack justify="space-between" align="flex-start">
                <Box>
                  <Text fontSize="sm" opacity={0.9} mb={1}>Neurovia {plan.name}</Text>
                  <Heading size="lg">{plan.name}</Heading>
                </Box>
                <Badge colorScheme="whiteAlpha" borderRadius="full" px={2} py={1} fontSize="xs">
                  {plan.id === 'premium' ? 'Most Popular' : 'Basic'}
                </Badge>
              </HStack>
              <Text fontSize="2xl" fontWeight="bold" mt={4}>
                {plan.price}
              </Text>
            </CardHeader>

            <CardBody p={6}>
              <Text color="gray.500" mb={6}>{plan.description}</Text>

              <VStack align="stretch" spacing={4} mb={8}>
                <Box>
                  <Text fontSize="sm" fontWeight="semibold" mb={3}>Included Features</Text>
                  <List spacing={2}>
                    {plan.features.map((feature, idx) => (
                      <ListItem key={idx} display="flex" alignItems="center" gap={2}>
                        <ListIcon as={FiCheckCircle} color="green.500" />
                        <Text fontSize="sm">{feature}</Text>
                      </ListItem>
                    ))}
                  </List>
                </Box>

                {plan.disabledFeatures.length > 0 && (
                  <Box>
                    <Text fontSize="sm" fontWeight="semibold" mb={3} color="gray.500">Not Included</Text>
                    <List spacing={2}>
                      {plan.disabledFeatures.map((feature, idx) => (
                        <ListItem key={idx} display="flex" alignItems="center" gap={2}>
                          <ListIcon as={FiXCircle} color="gray.400" />
                          <Text fontSize="sm" color="gray.400">{feature}</Text>
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
              </VStack>

              <Button
                w="full"
                colorScheme={typeof plan.buttonColor === 'function' ? plan.buttonColor(user) : plan.buttonColor}
                size="lg"
                rightIcon={plan.isCurrent(user) ? <FiCheckCircle /> : <FiArrowRight />}
                onClick={() => handleSubscribe(plan.id)}
                isDisabled={plan.isCurrent(user) && plan.id === 'free'}
              >
                {typeof plan.buttonText === 'function' ? plan.buttonText(user) : plan.buttonText}
              </Button>
            </CardBody>
          </Card>
        ))}
      </SimpleGrid>

      {/* Comparison Table */}
      <Box bg={cardBg} borderRadius="2xl" boxShadow="md" p={8} borderWidth="1px" borderColor={useColorModeValue('gray.100', 'gray.700')}>
        <Heading size="lg" textAlign="center" mb={6}>Plan Comparison</Heading>
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} textAlign="center">
          <Box></Box>
          <Box>
            <Text fontWeight="semibold" mb={2}>Free Plan</Text>
          </Box>
          <Box>
            <Text fontWeight="semibold" mb={2}>Premium Plan</Text>
          </Box>
          <Box></Box>

          <Text fontSize="sm" color="gray.500">Course Access</Text>
          <Text>5 courses</Text>
          <Text>Unlimited</Text>
          <Box></Box>

          <Text fontSize="sm" color="gray.500">Quizzes</Text>
          <Text>Basic</Text>
          <Text>All</Text>
          <Box></Box>

          <Text fontSize="sm" color="gray.500">Clinical Cases</Text>
          <Text>Limited</Text>
          <Text>Full library</Text>
          <Box></Box>

          <Text fontSize="sm" color="gray.500">Certificates</Text>
          <FiXCircle color="gray.400" />
          <FiCheckCircle color="green.500" />
          <Box></Box>

          <Text fontSize="sm" color="gray.500">Support</Text>
          <Text>Community</Text>
          <Text>Priority</Text>
          <Box></Box>

          <Text fontSize="sm" color="gray.500">Price</Text>
          <Text fontWeight="bold">$0</Text>
          <Text fontWeight="bold">$19.99/mo</Text>
          <Box></Box>
        </SimpleGrid>
      </Box>

      {/* FAQ */}
      <Box mt={12}>
        <Heading size="lg" mb={6}>Frequently Asked Questions</Heading>
        <VStack spacing={4} align="stretch">
          <Box bg={cardBg} p={5} borderRadius="lg" borderWidth="1px" borderColor={useColorModeValue('gray.100', 'gray.700')}>
            <Text fontWeight="semibold" mb={2}>Can I change plans later?</Text>
            <Text fontSize="sm" color="gray.600">Yes, you can upgrade or downgrade your plan at any time from your account settings.</Text>
          </Box>
          <Box bg={cardBg} p={5} borderRadius="lg" borderWidth="1px" borderColor={useColorModeValue('gray.100', 'gray.700')}>
            <Text fontWeight="semibold" mb={2}>Is there a free trial?</Text>
            <Text fontSize="sm" color="gray.600">The free plan gives you access to basic features without any time limit.</Text>
          </Box>
          <Box bg={cardBg} p={5} borderRadius="lg" borderWidth="1px" borderColor={useColorModeValue('gray.100', 'gray.700')}>
            <Text fontWeight="semibold" mb={2}>Can I cancel anytime?</Text>
            <Text fontSize="sm" color="gray.600">Yes, you can cancel your premium subscription at any time and continue using the free plan.</Text>
          </Box>
        </VStack>
      </Box>
    </Container>
  );
};

export default PlanPage;
