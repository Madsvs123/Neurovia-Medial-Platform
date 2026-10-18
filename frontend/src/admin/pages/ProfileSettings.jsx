import React, { useState, useEffect } from 'react';
import {
  Box, Flex, Heading, Text, Button, Spinner, Alert, AlertIcon,
  VStack, SimpleGrid, FormControl, FormLabel, Input, Textarea,
  useColorModeValue, useToast, Tag, TagLabel, TagCloseButton, HStack,
} from '@chakra-ui/react';
import { FiSave, FiUser } from 'react-icons/fi';
import { getMyProfile, updateMyProfile } from '../../services/api';

const ProfileSettings = () => {
  const toast = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    fullName: '',
    bio: '',
    profession: '',
    specialization: '',
    country: '',
    university: '',
    yearsExperience: '',
    languages: [],
    skills: [],
    interests: [],
    socialLinks: { twitter: '', linkedin: '', facebook: '', instagram: '' },
  });

  const [newLang, setNewLang] = useState('');
  const [newSkill, setNewSkill] = useState('');

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await getMyProfile();
      const p = data.profile || data;
      setProfile(p);
      setForm({
        fullName: p.fullName || '',
        bio: p.bio || '',
        profession: p.profession || '',
        specialization: p.specialization || '',
        country: p.country || '',
        university: p.university || '',
        yearsExperience: p.yearsExperience?.toString() || '',
        languages: p.languages || [],
        skills: p.skills || [],
        interests: p.interests || [],
        socialLinks: {
          twitter: p.socialLinks?.twitter || '',
          linkedin: p.socialLinks?.linkedin || '',
          facebook: p.socialLinks?.facebook || '',
          instagram: p.socialLinks?.instagram || '',
        },
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setSuccess(false);
      const payload = {
        ...form,
        yearsExperience: form.yearsExperience ? parseInt(form.yearsExperience) : undefined,
      };
      const { data } = await updateMyProfile(payload);
      setProfile(data.profile || data);
      toast({ title: 'Profile updated successfully', status: 'success', duration: 3000 });
      setSuccess(true);
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.message, status: 'error', duration: 3000 });
    } finally {
      setSaving(false);
    }
  };

  const addItem = (field) => {
    const val = field === 'languages' ? newLang : newSkill;
    if (!val.trim() || form[field].includes(val.trim())) return;
    setForm({ ...form, [field]: [...form[field], val.trim()] });
    if (field === 'languages') setNewLang('');
    else setNewSkill('');
  };

  const removeItem = (field, index) => {
    setForm({ ...form, [field]: form[field].filter((_, i) => i !== index) });
  };

  if (loading) {
    return (
      <Flex justify="center" align="center" minH="300px">
        <Spinner size="xl" color="teal.500" />
      </Flex>
    );
  }

  if (error) {
    return (
      <Alert status="error" borderRadius="md">
        <AlertIcon /> {error}
      </Alert>
    );
  }

  return (
    <Box maxW="800px">
      <Flex align="center" gap={4} mb={6}>
        <Box bg="teal.100" p={3} borderRadius="lg">
          <FiUser size={24} color="#319795" />
        </Box>
        <Box>
          <Heading size="lg">Profile Settings</Heading>
          <Text color="gray.500" mt={1}>Manage your profile</Text>
        </Box>
      </Flex>

      {success && (
        <Alert status="success" mb={6} borderRadius="md">
          <AlertIcon /> Profile updated successfully
        </Alert>
      )}

      <VStack spacing={6} align="stretch">
        {/* Personal Information */}
        <Box bg={cardBg} p={6} borderRadius="xl" borderWidth="1px" borderColor={borderColor} shadow="sm">
          <Heading size="md" mb={6}>Personal Information</Heading>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={5}>
            <FormControl isRequired>
              <FormLabel>Full Name</FormLabel>
              <Input
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              />
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Profession</FormLabel>
              <Input
                value={form.profession}
                onChange={(e) => setForm({ ...form, profession: e.target.value })}
              />
            </FormControl>
            <FormControl gridColumn={{ md: '1 / -1' }}>
              <FormLabel>Bio</FormLabel>
              <Textarea
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                rows={3}
              />
            </FormControl>
          </SimpleGrid>
        </Box>

        {/* Professional Details */}
        <Box bg={cardBg} p={6} borderRadius="xl" borderWidth="1px" borderColor={borderColor} shadow="sm">
          <Heading size="md" mb={6}>Professional Details</Heading>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={5}>
            <FormControl>
              <FormLabel>Specialization</FormLabel>
              <Input
                value={form.specialization}
                onChange={(e) => setForm({ ...form, specialization: e.target.value })}
              />
            </FormControl>
            <FormControl>
              <FormLabel>Country</FormLabel>
              <Input
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
              />
            </FormControl>
            <FormControl>
              <FormLabel>University</FormLabel>
              <Input
                value={form.university}
                onChange={(e) => setForm({ ...form, university: e.target.value })}
              />
            </FormControl>
            <FormControl>
              <FormLabel>Years of Experience</FormLabel>
              <Input
                type="number"
                value={form.yearsExperience}
                onChange={(e) => setForm({ ...form, yearsExperience: e.target.value })}
              />
            </FormControl>
          </SimpleGrid>
        </Box>

        {/* Skills & Languages */}
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
          <Box bg={cardBg} p={6} borderRadius="xl" borderWidth="1px" borderColor={borderColor} shadow="sm">
            <Heading size="md" mb={4}>Skills</Heading>
            <HStack mb={3}>
              <Input
                placeholder="Add skill"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem('skills'); } }}
              />
              <Button size="sm" onClick={() => addItem('skills')}>+</Button>
            </HStack>
            <Flex wrap="wrap" gap={2}>
              {form.skills.map((s, i) => (
                <Tag key={i} size="md" colorScheme="teal" borderRadius="full">
                  <TagLabel>{s}</TagLabel>
                  <TagCloseButton onClick={() => removeItem('skills', i)} />
                </Tag>
              ))}
            </Flex>
          </Box>

          <Box bg={cardBg} p={6} borderRadius="xl" borderWidth="1px" borderColor={borderColor} shadow="sm">
            <Heading size="md" mb={4}>Languages</Heading>
            <HStack mb={3}>
              <Input
                placeholder="Add language"
                value={newLang}
                onChange={(e) => setNewLang(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem('languages'); } }}
              />
              <Button size="sm" onClick={() => addItem('languages')}>+</Button>
            </HStack>
            <Flex wrap="wrap" gap={2}>
              {form.languages.map((l, i) => (
                <Tag key={i} size="md" colorScheme="blue" borderRadius="full">
                  <TagLabel>{l}</TagLabel>
                  <TagCloseButton onClick={() => removeItem('languages', i)} />
                </Tag>
              ))}
            </Flex>
          </Box>
        </SimpleGrid>

        {/* Social Links */}
        <Box bg={cardBg} p={6} borderRadius="xl" borderWidth="1px" borderColor={borderColor} shadow="sm">
          <Heading size="md" mb={6}>Social Media</Heading>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={5}>
            <FormControl>
              <FormLabel>Twitter</FormLabel>
              <Input
                value={form.socialLinks.twitter}
                onChange={(e) => setForm({ ...form, socialLinks: { ...form.socialLinks, twitter: e.target.value } })}
                placeholder="https://twitter.com/..."
              />
            </FormControl>
            <FormControl>
              <FormLabel>LinkedIn</FormLabel>
              <Input
                value={form.socialLinks.linkedin}
                onChange={(e) => setForm({ ...form, socialLinks: { ...form.socialLinks, linkedin: e.target.value } })}
                placeholder="https://linkedin.com/in/..."
              />
            </FormControl>
            <FormControl>
              <FormLabel>Facebook</FormLabel>
              <Input
                value={form.socialLinks.facebook}
                onChange={(e) => setForm({ ...form, socialLinks: { ...form.socialLinks, facebook: e.target.value } })}
                placeholder="https://facebook.com/..."
              />
            </FormControl>
            <FormControl>
              <FormLabel>Instagram</FormLabel>
              <Input
                value={form.socialLinks.instagram}
                onChange={(e) => setForm({ ...form, socialLinks: { ...form.socialLinks, instagram: e.target.value } })}
                placeholder="https://instagram.com/..."
              />
            </FormControl>
          </SimpleGrid>
        </Box>

        {/* Save Button */}
        <Button
          colorScheme="teal" size="lg" leftIcon={<FiSave />}
          onClick={handleSave} isLoading={saving} loadingText="Saving..."
          alignSelf="flex-end"
        >
          Save Changes
        </Button>
      </VStack>
    </Box>
  );
};

export default ProfileSettings;
