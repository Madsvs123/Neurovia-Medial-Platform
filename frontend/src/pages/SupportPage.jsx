import React from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  Box, Heading, Text, VStack, Container, Button, HStack,
  Accordion, AccordionItem, AccordionButton, AccordionPanel, AccordionIcon,
} from '@chakra-ui/react';
import { FiHelpCircle, FiMessageCircle, FiInbox } from 'react-icons/fi';

const FAQS = [
  {
    question: 'How do I access my enrolled courses?',
    answer: 'All courses and programs you are enrolled in appear under "My Programs" in your dashboard. If a course you purchased is missing, try logging out and back in first — then message us and we will restore access for you.',
  },
  {
    question: 'How does my subscription work?',
    answer: 'Your subscription renews automatically and unlocks the full course catalog while active. You can review your plan, update your payment method, or cancel anytime from the Subscription page in your account.',
  },
  {
    question: 'Do I get a certificate when I finish a course?',
    answer: 'Yes. Once you complete all lessons and required quizzes in a course, a completion certificate is generated automatically and can be downloaded from the course page and your profile.',
  },
  {
    question: 'A video or quiz is not loading — what should I do?',
    answer: 'First, try refreshing the page or clearing your browser cache, and make sure you are using an up-to-date browser. If the problem persists, contact support and include the course name and lesson — a screenshot helps us fix it faster.',
  },
  {
    question: 'How do I ask my instructor a question?',
    answer: 'Open Messages and choose "Ask my instructor" — you can message any educator from a program you are enrolled in. Platform, billing or technical problems go to the support team via "Help with the platform".',
  },
];

/**
 * Public help page: FAQ + entry points into Messaging.
 * `?conversationId=` links from the first messaging version redirect to the thread.
 */
const SupportPage = () => {
  const { t } = useTranslation('messaging');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { userInfo } = useSelector((state) => state.auth);
  const isStaff = userInfo && userInfo.role !== 'student';

  const legacyId = searchParams.get('conversationId');
  if (legacyId) return <Navigate to={`/messages/${legacyId}`} replace />;

  const contact = () => navigate(userInfo ? '/messages/new?kind=support' : '/login');

  return (
    <Container maxW="800px" py={16}>
      <VStack spacing={4} textAlign="center" mb={10}>
        <Box bg="teal.500" p={4} borderRadius="full"><FiHelpCircle size={32} color="white" /></Box>
        <Heading>{t('support.title')}</Heading>
        <Text color="gray.500" maxW="520px">{isStaff ? t('support.introStaff') : t('support.intro')}</Text>
        {!isStaff && (
          <HStack spacing={3}>
            <Button colorScheme="teal" size="lg" leftIcon={<FiMessageCircle />} onClick={contact} borderRadius="lg">
              {t('support.contact')}
            </Button>
            {userInfo && (
              <Button variant="outline" size="lg" leftIcon={<FiInbox />} onClick={() => navigate('/messages?box=support')} borderRadius="lg">
                {t('support.myRequests')}
              </Button>
            )}
          </HStack>
        )}
      </VStack>

      <Box bg="white" _dark={{ bg: 'gray.800' }} borderWidth="1px" borderColor="gray.200" borderRadius="lg" boxShadow="sm" overflow="hidden">
        <Accordion allowMultiple>
          {FAQS.map((faq, idx) => (
            <AccordionItem key={idx}>
              <h2>
                <AccordionButton py={4} px={5} _expanded={{ bg: 'teal.50', color: 'teal.700' }}>
                  <Box flex="1" textAlign="left" fontWeight="semibold" fontSize="sm">{faq.question}</Box>
                  <AccordionIcon />
                </AccordionButton>
              </h2>
              <AccordionPanel pb={5} px={5}>
                <Text fontSize="sm" color="gray.600" lineHeight="1.7">{faq.answer}</Text>
              </AccordionPanel>
            </AccordionItem>
          ))}
        </Accordion>
      </Box>
    </Container>
  );
};

export default SupportPage;
