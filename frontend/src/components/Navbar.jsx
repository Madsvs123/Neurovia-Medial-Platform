import React from 'react';
import {
  Box, Flex, Text, Button, useColorModeValue, HStack,
  Menu, MenuButton, MenuList, MenuItem, IconButton, Icon, Divider,
  Badge,
} from '@chakra-ui/react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getPanelSwitchOptions } from '../utils/roleAuth';
import {
  FiBookOpen, FiChevronDown, FiMenu, FiGrid,
  FiBook, FiClipboard, FiActivity, FiAward,
  FiFileText, FiTool, FiUser, FiHelpCircle,
  FiLogOut, FiShield, FiMessageSquare
} from 'react-icons/fi';
import { GiMicroscope } from 'react-icons/gi';
import NotificationBell from './NotificationBell';
import * as notificationApi from '../services/api';

// ─── 6 Main Sections (shared with HomePage) ─────────────────
export const MAIN_SECTIONS = [
  { label: 'Courses', icon: FiBook, path: '/courses' },
  { label: 'Quizzes', icon: FiClipboard, path: '/quizzes' },
  { label: 'Clinical Cases', icon: GiMicroscope, path: '/clinical-cases' },
  { label: 'Programs', icon: FiAward, path: '/programs' },
  { label: 'Medical Reference', icon: FiFileText, path: '/medical-reference' },
  { label: 'Doctor Tools', icon: FiTool, path: '/doctor-tools' },
];

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const hoverBg = useColorModeValue('gray.100', 'gray.700');

  return (
    <Box
      as="nav"
      position="sticky"
      top={0}
      zIndex={1000}
      bg={bgColor}
      borderBottomWidth="1px"
      borderColor={borderColor}
      boxShadow="sm"
    >
      <Box maxW="1400px" mx="auto" px={4} py={3}>
        <Flex alignItems="center" justifyContent="space-between">
          {/* Logo */}
          <Link to="/">
            <Flex alignItems="center" gap={2}>
              <Box bg="teal.500" p={2} borderRadius="full">
                <FiBookOpen color="white" size={20} />
              </Box>
              <Text
                fontSize="xl"
                fontWeight="bold"
                bgGradient="linear(to-r, teal.500, blue.600)"
                bgClip="text"
                display={{ base: 'none', md: 'block' }}
              >
                Neurovia
              </Text>
            </Flex>
          </Link>

          {/* Right side - Menus */}
          <HStack spacing={2}>
            {/* Sections Menu */}
            <Menu>
              <MenuButton
                as={IconButton}
                icon={<FiGrid />}
                variant="ghost"
                aria-label="Sections menu"
                size="lg"
                fontSize="xl"
              />
              <MenuList minW="220px" shadow="lg" zIndex={1001}>
                {MAIN_SECTIONS.map((section) => (
                  <MenuItem
                    key={section.path}
                    icon={<Icon as={section.icon} boxSize={5} />}
                    onClick={() => navigate(section.path)}
                    _hover={{ bg: hoverBg }}
                  >
                    {section.label}
                  </MenuItem>
                ))}
              </MenuList>
            </Menu>

            {/* Notifications Bell */}
            {isAuthenticated && (
              <NotificationBell api={notificationApi} />
            )}
            {/* View Site lives in educator/admin panels; not on main navbar */}
            
            {/* Subscription Button (for non-premium users) */}
            {isAuthenticated && user?.subscriptionPlan !== 'premium' && (
              <Button
                as={Link}
                to="/plans"
                size="sm"
                colorScheme="yellow"
                variant="solid"
                leftIcon={<FiAward />}
                ml={2}
              >
                Upgrade
              </Button>
            )}
            
            {/* Show plan name if premium */}
            {isAuthenticated && user?.subscriptionPlan === 'premium' && (
              <Badge
                colorScheme="green"
                px={3}
                py={1}
                borderRadius="full"
                fontSize="sm"
                fontWeight="bold"
                ml={2}
              >
                Premium
              </Badge>
            )}

            {/* Account Menu */}
            <Menu>
              <MenuButton
                as={IconButton}
                icon={<FiUser />}
                variant="ghost"
                aria-label="Account menu"
                size="lg"
                fontSize="xl"
              />
              <MenuList minW="200px" shadow="lg" zIndex={1001}>
                {isAuthenticated ? (
                  <>
                    {/* Plan Display */}
                    <Box px={4} py={2} fontSize="sm" color="gray.500">
                      <Text fontWeight="semibold">Plan:</Text>
                      {user?.subscriptionPlan === 'premium' ? (
                        <Text color="yellow.500" fontWeight="bold">Premium</Text>
                      ) : user?.subscriptionPlan === 'free' ? (
                        <Text color="blue.500" fontWeight="bold">Free</Text>
                      ) : (
                        <Text color="gray.400">No plan</Text>
                      )}
                    </Box>
                    <Divider />
                    <MenuItem
                      icon={<FiUser />}
                      onClick={() => navigate('/profile')}
                    >
                      Account
                    </MenuItem>
                    <MenuItem
                      icon={<FiAward />}
                      onClick={() => navigate('/programs')}
                    >
                      My Programs
                    </MenuItem>
                    <MenuItem
                      icon={<FiMessageSquare />}
                      onClick={() => navigate('/messages')}
                    >
                      Messages
                    </MenuItem>
                    {/* Educator Panel is provided in the panel switcher below; removed explicit link */}
                    <MenuItem
                      icon={<FiHelpCircle />}
                      onClick={() => navigate('/support')}
                    >
                      Support
                    </MenuItem>
                    {/* Panel Switching - Dynamic based on user role */}
                    {getPanelSwitchOptions().length > 0 && (
                      <>
                        <Divider />
                        {getPanelSwitchOptions().filter(option => option.role !== 'user').map((option) => (
                          <MenuItem
                            key={option.path}
                            icon={option.role === 'admin' ? <FiShield /> : <FiBook />}
                            onClick={() => navigate(option.path)}
                            fontWeight="semibold"
                            color={option.role === 'admin' ? 'teal.500' : 'purple.500'}
                          >
                            {option.label}
                          </MenuItem>
                        ))}
                      </>
                    )}
                    <Divider />
                    <MenuItem
                      icon={<FiLogOut />}
                      onClick={logout}
                      color="red.500"
                    >
                      Sign Out
                    </MenuItem>
                  </>
                ) : (
                  <>
                    <MenuItem
                      icon={<FiLogOut />}
                      onClick={() => navigate('/login')}
                    >
                      Login
                    </MenuItem>
                    <MenuItem
                      icon={<FiUser />}
                      onClick={() => navigate('/register')}
                    >
                      Register
                    </MenuItem>
                    <Divider />
                    <MenuItem
                      icon={<FiHelpCircle />}
                      onClick={() => navigate('/support')}
                    >
                      Support
                    </MenuItem>
                  </>
                )}
              </MenuList>
            </Menu>
          </HStack>
        </Flex>
      </Box>
    </Box>
  );
};

export default Navbar;
