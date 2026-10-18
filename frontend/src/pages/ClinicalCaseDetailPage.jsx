import React, { useState, useEffect } from 'react';
import {
  Box, Container, Heading, Text, Spinner, Alert, AlertIcon, Badge, Flex,
  Button, useColorModeValue, Icon, VStack, Divider, HStack, Card, CardBody,
  Grid, GridItem, Stat, StatLabel, StatNumber,
  Wrap, WrapItem
} from '@chakra-ui/react';
import { useParams, Link } from 'react-router-dom';
import {
  FiArrowLeft, FiCheckCircle, FiTarget, FiLock,
  FiThermometer, FiDroplet, FiBookOpen,
  FiAlertCircle, FiFileText
} from 'react-icons/fi';
import { getClinicalCaseById } from '../services/api';

// ─── Regex parser for clinical text with bold emphasis ─────
const renderClinicalText = (text) => {
  if (!text) return null;
  
  const lines = text.split('\n').filter(Boolean);
  
  return lines.map((line, i) => {
    // Match "Label: content" pattern - bold the label
    const labelMatch = line.match(/^([A-Z][A-Za-z\s]+)\s*:\s*(.+)$/);
    if (labelMatch) {
      const [, label, content] = labelMatch;
      // Check for abnormal values to highlight
      const hasAbnormal = /\b(?:elevated|low|high|abnormal|positive|negative|tender|palpable)\b/i.test(content);
      return (
        <Box key={i} mb={2}>
          <Text fontSize="sm" lineHeight="1.6">
            <Text as="span" fontWeight="extrabold" color="gray.700">{label}:</Text>
            <Text as="span" ml={1} fontWeight={hasAbnormal ? "bold" : "normal"} color={hasAbnormal ? "red.600" : "gray.600"}>
              {content}
            </Text>
          </Text>
        </Box>
      );
    }
    
    // Bold bullet points
    if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) {
      const content = line.substring(1).trim();
      const hasKeyword = /\b(?:key|important|critical|note|finding)\b/i.test(content);
      return (
        <HStack key={i} spacing={2} align="start" mb={1.5}>
          <Icon as={FiAlertCircle} color="gray.500" boxSize={3} mt={1} />
          <Text fontSize="sm" fontWeight={hasKeyword ? "bold" : "normal"}>{content}</Text>
        </HStack>
      );
    }
    
    // Bold lines with important keywords
    const hasImportant = /\b(?:important|critical|diagnosis|treatment|management)\b/i.test(line);
    return <Text key={i} fontSize="sm" lineHeight="1.6" mb={1.5} fontWeight={hasImportant ? "semibold" : "normal"}>{line}</Text>;
  });
};

// ─── Render an array of clinical findings (physical exam / lab results) ─────
const renderClinicalArray = (items, itemBg, itemBorder, itemText) => {
  if (!items || items.length === 0) return null;

  return (
    <VStack spacing={3} align="stretch">
      {items.map((item, i) => {
        const labelMatch = item.match(/^([A-Z][A-Za-z0-9\s()+/-]+)\s*:\s*(.+)$/);
        if (labelMatch) {
          const [, label, content] = labelMatch;
          const hasAbnormal = /\b(?:elevated|low|high|abnormal|positive|negative|tender|palpable|fever|tachycardia|hypotension)\b/i.test(content);
          return (
            <Box
              key={i}
              p={3}
              borderWidth="1px"
              borderColor={itemBorder}
              borderRadius="md"
              bg={itemBg}
            >
              <Text fontSize="sm" fontWeight="bold" color={itemText} mb={1}>
                {label}
              </Text>
              <Text fontSize="sm" lineHeight="1.6" color={hasAbnormal ? 'red.600' : itemText} fontWeight={hasAbnormal ? 'bold' : 'normal'}>
                {content}
              </Text>
            </Box>
          );
        }

        return (
          <Box
            key={i}
            p={3}
            borderWidth="1px"
            borderColor={itemBorder}
            borderRadius="md"
            bg={itemBg}
          >
            <Text fontSize="sm" lineHeight="1.6" color={itemText} fontWeight="bold">
              {item}
            </Text>
          </Box>
        );
      })}
    </VStack>
  );
};

// Physical Exam Card - unified color (slate/blue)
const PhysicalExamCard = ({ physicalExam }) => {
  const itemBg = useColorModeValue('white', 'gray.900');
  const itemBorder = useColorModeValue('gray.200', 'gray.700');
  const itemText = useColorModeValue('gray.700', 'gray.300');

  return (
    <Card 
      bg={useColorModeValue('gray.50', 'gray.800')} 
      borderRadius="lg" 
      shadow="sm" 
      overflow="hidden"
      border="1px solid"
      borderColor={useColorModeValue('gray.200', 'gray.700')}
    >
      <Box bg={useColorModeValue('gray.100', 'gray.700')} px={4} py={3}>
        <Flex align="center" gap={2}>
          <Icon as={FiThermometer} boxSize={4} color="gray.600" />
          <Text fontWeight="bold" fontSize="sm" textTransform="uppercase" letterSpacing="wide" color="gray.700">
            Physical Examination
          </Text>
        </Flex>
        <Text fontSize="xs" color="gray.500" mt={1}>
          Organized by finding with abnormal values highlighted.
        </Text>
      </Box>
      <CardBody py={4} px={5}>
        {renderClinicalArray(physicalExam, itemBg, itemBorder, itemText)}
      </CardBody>
    </Card>
  );
};

// Lab Results Card - unified color (slate/blue)
const LabResultsCard = ({ labResults }) => {
  const itemBg = useColorModeValue('white', 'gray.900');
  const itemBorder = useColorModeValue('gray.200', 'gray.700');
  const itemText = useColorModeValue('gray.700', 'gray.300');

  return (
    <Card 
      bg={useColorModeValue('gray.50', 'gray.800')} 
      borderRadius="lg" 
      shadow="sm" 
      overflow="hidden"
      border="1px solid"
      borderColor={useColorModeValue('gray.200', 'gray.700')}
    >
      <Box bg={useColorModeValue('gray.100', 'gray.700')} px={4} py={3}>
        <Flex align="center" gap={2}>
          <Icon as={FiDroplet} boxSize={4} color="gray.600" />
          <Text fontWeight="bold" fontSize="sm" textTransform="uppercase" letterSpacing="wide" color="gray.700">
            Laboratory Results
          </Text>
        </Flex>
        <Text fontSize="xs" color="gray.500" mt={1}>
          Key test values organized for quick review.
        </Text>
      </Box>
      <CardBody py={4} px={5}>
        {renderClinicalArray(labResults, itemBg, itemBorder, itemText)}
      </CardBody>
    </Card>
  );
};

const ClinicalCaseDetailPage = () => {
  const { id } = useParams();
  const [clinicalCase, setClinicalCase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDiagnosis, setShowDiagnosis] = useState(false);
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  useEffect(() => {
    const fetchCase = async () => {
      try {
        setLoading(true);
        const { data } = await getClinicalCaseById(id);
        setClinicalCase(data.clinicalCase);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    };
    fetchCase();
  }, [id]);

  if (loading) return (
    <Container py={20} textAlign="center">
      <Spinner size="xl" thickness="3px" color="gray.600" />
    </Container>
  );
  if (error) return (
    <Container py={20}>
      <Alert status="error" borderRadius="lg"><AlertIcon /> {error}</Alert>
      <Button as={Link} to="/clinical-cases" leftIcon={<FiArrowLeft />} variant="link" colorScheme="gray" mt={4}>
        Back to Cases
      </Button>
    </Container>
  );

  const c = clinicalCase;

  return (
    <Box bg={useColorModeValue('gray.100', 'gray.900')} minH="100vh">
      <Container maxW="1100px" py={8}>
        
        {/* Navigation */}
        <Button 
          as={Link} 
          to="/clinical-cases" 
          leftIcon={<FiArrowLeft />} 
          variant="ghost" 
          size="sm" 
          mb={5}
          fontWeight="medium"
        >
          Back to Cases
        </Button>

        {/* Header - Compact, firm, unified gray tones */}
        <Card bg={cardBg} borderRadius="lg" shadow="sm" mb={6} border="1px solid" borderColor={borderColor}>
          <Flex 
            direction={{ base: 'column', md: 'row' }} 
            justify="space-between" 
            align={{ base: 'flex-start', md: 'center' }}
            p={5}
            gap={3}
          >
            <Flex align="center" gap={3} wrap="wrap">
              {c.specialty && (
                <Badge variant="outline" colorScheme="gray" fontSize="xs" px={2} py={1} fontWeight="medium">
                  {c.specialty}
                </Badge>
              )}

              {c.premiumOnly && (
                <Badge variant="outline" colorScheme="yellow" fontSize="xs" px={2} py={1}>
                  <Flex align="center" gap={1}><FiLock size={10} />Premium</Flex>
                </Badge>
              )}
              <Heading size="md" fontWeight="bold" letterSpacing="tight">{c.title}</Heading>
            </Flex>
            
            <HStack spacing={6} divider={<Divider orientation="vertical" h="30px" />}>
              <Stat size="sm">
                <StatNumber fontSize="lg" fontWeight="bold">{c.symptoms?.length || 0}</StatNumber>
                <StatLabel fontSize="xs" color="gray.500">Symptoms</StatLabel>
              </Stat>
              <Stat size="sm">
                <StatNumber fontSize="lg" fontWeight="bold">{c.physicalExam?.length || 0}</StatNumber>
                <StatLabel fontSize="xs" color="gray.500">Exam Findings</StatLabel>
              </Stat>
              <Stat size="sm">
                <StatNumber fontSize="lg" fontWeight="bold">{c.labResults?.length || 0}</StatNumber>
                <StatLabel fontSize="xs" color="gray.500">Lab Results</StatLabel>
              </Stat>
            </HStack>
          </Flex>
        </Card>

        {/* Patient History + Presenting Symptoms */}
        {(c.patientHistory || c.symptoms?.length > 0) && (
          <Card 
            bg={cardBg} 
            borderRadius="lg" 
            shadow="sm" 
            mb={6}
            border="1px solid"
            borderColor={borderColor}
          >
            <Flex align="center" gap={2} px={5} pt={4} pb={1}>
              <Icon as={FiFileText} color="gray.600" boxSize={5} />
              <Text fontWeight="extrabold" fontSize="md" textTransform="uppercase" letterSpacing="wide" color="gray.700">
                Patient History
              </Text>
            </Flex>
            <CardBody pt={3} px={5} pb={5}>
              {c.patientHistory ? (
                <Text fontSize="md" lineHeight="1.7" fontWeight="medium" color="gray.700" mb={4}>
                  {c.patientHistory}
                </Text>
              ) : (
                <Text fontSize="sm" color="gray.500" mb={4}>
                  No patient history provided.
                </Text>
              )}

              {c.symptoms?.length > 0 ? (
                <Box>
                  <Text fontSize="sm" fontWeight="bold" textTransform="uppercase" letterSpacing="wide" color="gray.600" mb={3}>
                    Presenting Symptoms
                  </Text>
                  <Wrap spacing={2}>
                    {c.symptoms.map((s, i) => (
                      <WrapItem key={i}>
                        <Badge
                          variant="solid"
                          colorScheme="gray"
                          px={3}
                          py={1.5}
                          borderRadius="md"
                          fontSize="xs"
                          fontWeight="medium"
                        >
                          {s}
                        </Badge>
                      </WrapItem>
                    ))}
                  </Wrap>
                </Box>
              ) : c.patientHistory ? null : (
                <Text fontSize="sm" color="gray.500">
                  No symptoms recorded.
                </Text>
              )}
            </CardBody>
          </Card>
        )}

        {/* Main Grid: Physical + Labs */}
        {(c.physicalExam?.length > 0 || c.labResults?.length > 0) && (
          <Grid templateColumns={{ base: '1fr', lg: 'repeat(2, 1fr)' }} gap={6} mb={6}>
            {c.physicalExam?.length > 0 && (
              <GridItem>
                <PhysicalExamCard physicalExam={c.physicalExam} />
              </GridItem>
            )}
            {c.labResults?.length > 0 && (
              <GridItem>
                <LabResultsCard labResults={c.labResults} />
              </GridItem>
            )}
          </Grid>
        )}

        {/* Diagnosis & Management Section */}
        <Card bg={cardBg} borderRadius="lg" shadow="sm" mb={6} border="1px solid" borderColor={borderColor}>
          <Flex justify="space-between" align="center" px={5} pt={4} pb={1}>
            <Flex align="center" gap={2}>
              <Icon as={FiCheckCircle} boxSize={5} color="gray.600" />
              <Text fontWeight="extrabold" fontSize="md" textTransform="uppercase" letterSpacing="wide" color="gray.700">
                Diagnosis & Management
              </Text>
            </Flex>
            <Button
              size="xs"
              variant="outline"
              onClick={() => setShowDiagnosis(!showDiagnosis)}
              fontWeight="medium"
            >
              {showDiagnosis ? 'Hide' : 'Reveal'}
            </Button>
          </Flex>
          
          {showDiagnosis ? (
            <CardBody pt={3} px={5} pb={5}>
              <Box bg={useColorModeValue('gray.100', 'gray.700')} borderRadius="md" p={4} mb={4}>
                <Text fontWeight="extrabold" fontSize="sm" mb={1} textTransform="uppercase" letterSpacing="wide">Final Diagnosis</Text>
                <Text fontSize="md" fontWeight="bold" color="gray.800">{c.diagnosis}</Text>
              </Box>
              
              {c.treatmentPlan && (
                <Box mb={4}>
                  <Text fontWeight="extrabold" fontSize="sm" mb={2} textTransform="uppercase" letterSpacing="wide">Treatment Plan</Text>
                  <Text fontSize="sm" lineHeight="1.6" whiteSpace="pre-line">{c.treatmentPlan}</Text>
                </Box>
              )}
              
              {c.discussion && (
                <Box>
                  <Text fontWeight="extrabold" fontSize="sm" mb={2} textTransform="uppercase" letterSpacing="wide">Clinical Discussion</Text>
                  <Text fontSize="sm" lineHeight="1.6" whiteSpace="pre-line">{c.discussion}</Text>
                </Box>
              )}
            </CardBody>
          ) : (
            <CardBody pt={2} px={5} pb={4}>
              <Text fontSize="sm" color="gray.500" textAlign="center" py={3}>
                Click "Reveal" to view diagnosis, treatment plan, and discussion
              </Text>
            </CardBody>
          )}
        </Card>

        {/* References - Minimal */}
        {c.references?.length > 0 && (
          <Card bg={cardBg} borderRadius="lg" shadow="sm" mt={4} border="1px solid" borderColor={borderColor}>
            <Flex align="center" gap={2} px={5} pt={3} pb={1}>
              <Icon as={FiBookOpen} boxSize={3} color="gray.400" />
              <Text fontSize="xs" fontWeight="medium" color="gray.500" textTransform="uppercase" letterSpacing="wide">
                References
              </Text>
            </Flex>
            <CardBody pt={1} px={5} pb={3}>
              <VStack align="stretch" spacing={1}>
                {c.references.map((ref, i) => (
                  <Text key={i} fontSize="xs" color="gray.500">
                    {ref.url ? (
                      <a href={ref.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline', color: 'inherit' }}>
                        {ref.title || ref.url}
                      </a>
                    ) : (
                      ref.title
                    )}
                  </Text>
                ))}
              </VStack>
            </CardBody>
          </Card>
        )}
      </Container>
    </Box>
  );
};

export default ClinicalCaseDetailPage;
