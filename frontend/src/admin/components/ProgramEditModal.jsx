/**
 * Program Edit Modal Component
 * Separate component for program creation/edition
 */

import React, { useState, useEffect } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton,
  Button, Input, Textarea, Select, Switch, SimpleGrid, Box, Text, FormControl, FormLabel,
  useColorModeValue
} from '@chakra-ui/react';
import dayjs from 'dayjs';

const ProgramEditModal = ({ 
  isOpen, 
  onClose, 
  program, 
  onSave, 
  loading = false
}) => {
  const [form, setForm] = useState({
    title: '', 
    description: '', 
    code: '', 
    programType: 'free_access', 
    discountPercentage: '',
    freeAccess: false, 
    maxUsers: '', 
    expiresAt: '',
    ownerType: 'site',
    educatorId: ''
  });
  
  // Initialize form when program changes
  useEffect(() => {
    if (program) {
      setForm({
        title: program.title || '', 
        description: program.description || '', 
        code: program.code || '', 
        programType: program.programType || 'free_access', 
        discountPercentage: program.discountPercentage?.toString() || '',
        freeAccess: program.freeAccess || false, 
        maxUsers: program.maxUsers?.toString() || '', 
        expiresAt: program.expiresAt ? dayjs(program.expiresAt).format('YYYY-MM-DD') : '',
        ownerType: program.ownerType || 'site',
        educatorId: program.owner?._id || ''
      });
    } else {
      setForm({
        title: '', 
        description: '', 
        code: '', 
        programType: 'free_access', 
        discountPercentage: '',
        freeAccess: false, 
        maxUsers: '', 
        expiresAt: '',
        ownerType: 'site',
        educatorId: ''
      });
    }
  }, [program]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  const inputBg = useColorModeValue('white', 'gray.700');

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent as="form" onSubmit={handleSubmit}>
        <ModalHeader>{program ? 'Edit Program' : 'New Program'}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mb={4}>
            <FormControl isRequired>
              <FormLabel>Title</FormLabel>
              <Input 
                bg={inputBg}
                value={form.title} 
                onChange={(e) => setForm({ ...form, title: e.target.value })} 
                placeholder="Program title"
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Code</FormLabel>
              <Input 
                bg={inputBg}
                value={form.code} 
                onChange={(e) => setForm({ ...form, code: e.target.value })} 
                placeholder="PROGRAM-001"
              />
            </FormControl>

            <FormControl>
              <FormLabel>Type</FormLabel>
              <Select 
                bg={inputBg}
                value={form.programType} 
                onChange={(e) => setForm({ ...form, programType: e.target.value })}
              >
                <option value="free_access">Free Access</option>
                <option value="discount_access">Discount Access</option>
                <option value="quiz_bundle">Quiz Bundle</option>
                <option value="clinical_cases_bundle">Clinical Cases Bundle</option>
                <option value="premium_unlock">Premium Unlock</option>
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel>Discount (%)</FormLabel>
              <Input 
                bg={inputBg}
                type="number" 
                value={form.discountPercentage} 
                onChange={(e) => setForm({ ...form, discountPercentage: e.target.value })} 
                placeholder="0"
              />
            </FormControl>

            <FormControl>
              <FormLabel>Max Users</FormLabel>
              <Input 
                bg={inputBg}
                type="number" 
                value={form.maxUsers} 
                onChange={(e) => setForm({ ...form, maxUsers: e.target.value })} 
                placeholder="Unlimited"
              />
            </FormControl>

            <FormControl>
              <FormLabel>Expires At</FormLabel>
              <Input 
                bg={inputBg}
                type="date" 
                value={form.expiresAt} 
                onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
              />
            </FormControl>

            <FormControl display="flex" alignItems="center" mt={6}>
              <FormLabel mb={0} mr={3}>Free Access</FormLabel>
              <Switch 
                isChecked={form.freeAccess} 
                onChange={(e) => setForm({ ...form, freeAccess: e.target.checked })}
              />
            </FormControl>
          </SimpleGrid>

          <FormControl mb={4}>
            <FormLabel>Description</FormLabel>
            <Textarea 
              bg={inputBg}
              value={form.description} 
              onChange={(e) => setForm({ ...form, description: e.target.value })} 
              placeholder="Program description" 
              rows={4}
            />
          </FormControl>

          <Box mb={4} p={4} borderWidth="1px" borderRadius="md" borderColor="gray.200" bg={useColorModeValue('gray.50', 'gray.700')}>
            <Text fontSize="sm" fontWeight="medium" mb={2}>Ownership</Text>
            <FormControl mb={3}>
              <Select 
                value={form.ownerType} 
                onChange={(e) => setForm({ ...form, ownerType: e.target.value })}
              >
                <option value="site">Site Owned</option>
                <option value="educator">Educator Owned</option>
              </Select>
            </FormControl>
            
            {form.ownerType === 'educator' && (
              <FormControl>
                <FormLabel>Educator (username or ID)</FormLabel>
                <Input 
                  bg={inputBg}
                  placeholder="Educator username or ID"
                  value={form.educatorId} 
                  onChange={(e) => setForm({ ...form, educatorId: e.target.value })}
                />
                <Text fontSize="xs" color="gray.500" mt={1}>Leave blank to assign to current user</Text>
              </FormControl>
            )}
          </Box>
        </ModalBody>
        
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose} isDisabled={loading}>
            Cancel
          </Button>
          <Button 
            colorScheme="teal" 
            type="submit" 
            isLoading={loading}
            loadingText={program ? 'Updating...' : 'Creating...'}
          >
            {program ? 'Update Program' : 'Create Program'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ProgramEditModal;