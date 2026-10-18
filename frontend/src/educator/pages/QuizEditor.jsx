import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Flex, Heading, Text, Button, Spinner, Alert, AlertIcon,
  FormControl, FormLabel, Input, Textarea, Select, Switch,
  useColorModeValue, useToast, IconButton, VStack, SimpleGrid,
  NumberInput, NumberInputField, NumberInputStepper,
  NumberIncrementStepper, NumberDecrementStepper,
  Divider, HStack, Radio, RadioGroup, Stack, Badge,
} from '@chakra-ui/react';
import { FiArrowLeft, FiSave, FiPlus, FiTrash2, FiMove } from 'react-icons/fi';
import { getQuizById, createQuiz, updateQuiz, getCourses, getPrograms } from '../services/api';

const emptyQuestion = {
  question: '',
  options: ['', '', '', ''],
  correctAnswer: '',
  explanation: '',
  type: 'mcq',
};

const QuizEditor = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const isNew = !quizId || quizId === 'new';

  const [courses, setCourses] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    courseId: '',
    lessonId: '',
    programId: '',
    title: '',
    description: '',
    difficulty: 'medium',
    specialty: '',
    passingScore: '70',
    timeLimit: '',
    premiumOnly: false,
    questions: [{ ...emptyQuestion }],
  });

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  useEffect(() => {
    fetchCourses();
    fetchPrograms();
    if (!isNew) fetchQuiz();
  }, [quizId]);

  const fetchCourses = async () => {
    try {
      const { data } = await getCourses({ limit: 100 });
      setCourses(data.courses || []);
    } catch { /* non-critical */ }
  };

  const fetchPrograms = async () => {
    try {
      const { data } = await getPrograms({ limit: 100 });
      setPrograms(data.programs || []);
    } catch { /* non-critical */ }
  };

  const fetchQuiz = async () => {
    try {
      setLoading(true);
      const { data } = await getQuizById(quizId);
      const q = data.quiz || data;
      setForm({
        courseId: q.courseId?._id || q.courseId || '',
        lessonId: q.lessonId || '',
        programId: q.programId || '',
        title: q.title || '',
        description: q.description || '',
        difficulty: q.difficulty || 'medium',
        specialty: q.specialty || '',
        passingScore: q.passingScore?.toString() || '70',
        timeLimit: q.timeLimit?.toString() || '',
        premiumOnly: q.premiumOnly || false,
        questions: q.questions?.length > 0
          ? q.questions.map((qq) => ({
              question: qq.question || '',
              options: qq.options?.length >= 2 ? qq.options : ['', '', '', ''],
              correctAnswer: qq.correctAnswer || '',
              explanation: qq.explanation || '',
              type: qq.type || 'mcq',
            }))
          : [{ ...emptyQuestion }],
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.title || !form.courseId) {
      toast({ title: 'Title and Course are required', status: 'warning', duration: 3000 });
      return;
    }

    // Validate questions
    const validQuestions = form.questions.filter((q) => q.question && q.correctAnswer);
    if (validQuestions.length === 0) {
      toast({ title: 'At least one complete question is required', status: 'warning', duration: 3000 });
      return;
    }

    try {
      setSaving(true);
      const payload = {
        courseId: form.courseId,
        lessonId: form.lessonId || undefined,
        programId: form.programId || undefined,
        title: form.title,
        description: form.description,
        difficulty: form.difficulty,
        specialty: form.specialty || undefined,
        passingScore: parseInt(form.passingScore) || 70,
        timeLimit: form.timeLimit ? parseInt(form.timeLimit) : undefined,
        premiumOnly: form.premiumOnly,
        questions: validQuestions,
      };

      if (isNew) {
        await createQuiz(payload);
        toast({ title: 'Quiz created', status: 'success', duration: 3000 });
      } else {
        await updateQuiz(quizId, payload);
        toast({ title: 'Quiz updated', status: 'success', duration: 3000 });
      }
      navigate('/educator/quizzes');
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.message, status: 'error', duration: 3000 });
    } finally {
      setSaving(false);
    }
  };

  const addQuestion = () => {
    setForm({ ...form, questions: [...form.questions, { ...emptyQuestion, options: ['', '', '', ''] }] });
  };

  const removeQuestion = (index) => {
    if (form.questions.length <= 1) return;
    setForm({ ...form, questions: form.questions.filter((_, i) => i !== index) });
  };

  const updateQuestion = (index, field, value) => {
    const updated = [...form.questions];
    updated[index] = { ...updated[index], [field]: value };
    setForm({ ...form, questions: updated });
  };

  const updateOption = (qIndex, oIndex, value) => {
    const updated = [...form.questions];
    updated[qIndex].options[oIndex] = value;
    setForm({ ...form, questions: updated });
  };

  if (loading) {
    return <Flex justify="center" align="center" minH="300px"><Spinner size="xl" color="purple.500" /></Flex>;
  }

  if (error && !isNew) {
    return <Alert status="error" borderRadius="md"><AlertIcon /> {error}</Alert>;
  }

  return (
    <Box maxW="900px">
      <Flex align="center" gap={4} mb={6}>
        <IconButton icon={<FiArrowLeft />} variant="ghost"
          onClick={() => navigate('/educator/quizzes')} aria-label="Back" />
        <Box>
          <Heading size="lg">{isNew ? 'New Quiz' : 'Edit Quiz'}</Heading>
        </Box>
      </Flex>

      <VStack spacing={6} align="stretch">
        {/* Quiz Settings */}
        <Box bg={cardBg} p={6} borderRadius="xl" borderWidth="1px" borderColor={borderColor} shadow="sm">
          <Heading size="md" mb={6}>Quiz Settings</Heading>
          <VStack spacing={4} align="stretch">
            <FormControl isRequired>
              <FormLabel>Title</FormLabel>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Cardiology Basics Quiz" />
            </FormControl>
            <FormControl>
              <FormLabel>Description</FormLabel>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </FormControl>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              <FormControl isRequired>
                <FormLabel>Course</FormLabel>
                <Select value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })}>
                  <option value="">Select course...</option>
                  {courses.map((c) => (
                    <option key={c._id} value={c._id}>{c.title}</option>
                  ))}
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>Difficulty</FormLabel>
                <Select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </Select>
              </FormControl>
            </SimpleGrid>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              <FormControl>
                <FormLabel>Specialty (optional)</FormLabel>
                <Input value={form.specialty}
                  onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                  placeholder="e.g. Cardiology, Neurology" />
              </FormControl>
              <FormControl>
                <FormLabel>Program (optional)</FormLabel>
                <Select value={form.programId} onChange={(e) => setForm({ ...form, programId: e.target.value })}>
                  <option value="">No program</option>
                  {programs.map((p) => (
                    <option key={p._id} value={p._id}>{p.title}</option>
                  ))}
                </Select>
              </FormControl>
            </SimpleGrid>
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
              <FormControl>
                <FormLabel>Passing Score (%)</FormLabel>
                <NumberInput value={form.passingScore} min={0} max={100}
                  onChange={(v) => setForm({ ...form, passingScore: v })}>
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </FormControl>
              <FormControl>
                <FormLabel>Time Limit (min)</FormLabel>
                <NumberInput value={form.timeLimit} min={0}
                  onChange={(v) => setForm({ ...form, timeLimit: v })}>
                  <NumberInputField placeholder="No limit" />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </FormControl>
              <FormControl display="flex" alignItems="flex-end" pb={2}>
                <FormLabel mb={0} mr={4}>Premium Only</FormLabel>
                <Switch isChecked={form.premiumOnly} colorScheme="purple"
                  onChange={(e) => setForm({ ...form, premiumOnly: e.target.checked })} />
              </FormControl>
            </SimpleGrid>
          </VStack>
        </Box>

        {/* Questions Builder */}
        <Box bg={cardBg} p={6} borderRadius="xl" borderWidth="1px" borderColor={borderColor} shadow="sm">
          <Flex justify="space-between" align="center" mb={4}>
            <Heading size="md">Questions ({form.questions.length})</Heading>
            <Button size="sm" leftIcon={<FiPlus />} colorScheme="purple" variant="outline" onClick={addQuestion}>
              Add Question
            </Button>
          </Flex>
          <Divider mb={4} />

          {form.questions.map((q, qIndex) => (
            <Box key={qIndex} mb={6} p={4} borderRadius="lg"
              borderWidth="1px" borderColor={borderColor}
              bg={useColorModeValue('gray.50', 'gray.800')}>
              {/* Question Header */}
              <Flex justify="space-between" align="center" mb={3}>
                <Flex align="center" gap={2}>
                  <Badge colorScheme="purple">Q{qIndex + 1}</Badge>
                  <Select value={q.type} size="xs" w="130px"
                    onChange={(e) => updateQuestion(qIndex, 'type', e.target.value)}>
                    <option value="mcq">Multiple Choice</option>
                    <option value="true_false">True/False</option>
                    <option value="short_answer">Short Answer</option>
                  </Select>
                </Flex>
                <IconButton size="xs" variant="ghost" colorScheme="red"
                  icon={<FiTrash2 />} onClick={() => removeQuestion(qIndex)}
                  isDisabled={form.questions.length <= 1} aria-label="Remove question" />
              </Flex>

              <FormControl mb={3}>
                <FormLabel fontSize="sm">Question</FormLabel>
                <Input value={q.question} onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
                  placeholder="Enter the question..." />
              </FormControl>

              {/* Options (MCQ only) */}
              {q.type === 'mcq' && (
                <VStack spacing={2} align="stretch" mb={3}>
                  {q.options.map((opt, oIndex) => (
                    <Flex key={oIndex} align="center" gap={2}>
                      <Radio colorScheme="purple" value={opt} isChecked={q.correctAnswer === opt}
                        onChange={() => updateQuestion(qIndex, 'correctAnswer', opt)} />
                      <Input
                        size="sm"
                        value={opt}
                        onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                        placeholder={`Option ${oIndex + 1}`}
                        borderColor={q.correctAnswer === opt ? 'green.400' : undefined}
                      />
                    </Flex>
                  ))}
                </VStack>
              )}

              {/* True/False */}
              {q.type === 'true_false' && (
                <FormControl mb={3}>
                  <FormLabel fontSize="sm">Correct Answer</FormLabel>
                  <Select value={q.correctAnswer}
                    onChange={(e) => updateQuestion(qIndex, 'correctAnswer', e.target.value)}>
                    <option value="">Select...</option>
                    <option value="True">True</option>
                    <option value="False">False</option>
                  </Select>
                </FormControl>
              )}

              {/* Short Answer */}
              {q.type === 'short_answer' && (
                <FormControl mb={3}>
                  <FormLabel fontSize="sm">Correct Answer</FormLabel>
                  <Input value={q.correctAnswer}
                    onChange={(e) => updateQuestion(qIndex, 'correctAnswer', e.target.value)}
                    placeholder="Enter the correct answer..." />
                </FormControl>
              )}

              <FormControl>
                <FormLabel fontSize="sm">Explanation (optional)</FormLabel>
                <Input size="sm" value={q.explanation}
                  onChange={(e) => updateQuestion(qIndex, 'explanation', e.target.value)}
                  placeholder="Explain why this is correct..." />
              </FormControl>
            </Box>
          ))}
        </Box>

        {/* Save */}
        <Button colorScheme="purple" size="lg" leftIcon={<FiSave />}
          onClick={handleSave} isLoading={saving} loadingText="Saving..."
          alignSelf="flex-end">
          {isNew ? 'Create Quiz' : 'Save Changes'}
        </Button>
      </VStack>
    </Box>
  );
};

export default QuizEditor;
