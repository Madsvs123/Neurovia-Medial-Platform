import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  Box, Flex, Heading, Text, Button, useColorModeValue, Icon,
  Avatar, Menu, MenuButton, MenuList, MenuItem, IconButton, HStack, Tooltip
} from '@chakra-ui/react';
import {
  FiBarChart2, FiPackage, FiClipboard, FiHeart, FiUsers, FiLogOut,
  FiMenu, FiAward, FiHome, FiBell, FiMessageSquare, FiZap,
  FiChevronLeft, FiChevronRight,
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { removeUserToken, removeUserInfo } from '../../utils/auth';
import { getUserInfo } from '../utils/auth';
import NotificationBell from '../../components/NotificationBell';
import * as notificationApi from '../services/api';

const SIDEBAR_WIDTH = 220;
const SIDEBAR_COLLAPSED = 68;
const NAV_ITEMS = [
  { path: '/educator/dashboard', name: 'Dashboard', icon: FiBarChart2 },
  { path: '/educator/programs', name: 'Programs', icon: FiAward },
  { path: '/educator/courses', name: 'Courses', icon: FiPackage },
  { path: '/educator/quizzes', name: 'Quizzes', icon: FiClipboard },
  { path: '/educator/clinical-cases', name: 'Clinical Cases', icon: FiHeart },
  { path: '/educator/flashcards', name: 'Flashcards', icon: FiZap },
  { path: '/educator/students', name: 'Students', icon: FiUsers },
  { path: '/educator/messages', name: 'Messages', icon: FiMessageSquare },
];

const EducatorLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const userInfo = getUserInfo();

  const sidebarBg = useColorModeValue('gray.800', 'gray.900');
  const headerBg = useColorModeValue('white', 'gray.800');
  const mainBg = useColorModeValue('gray.50', 'gray.900');
  const activeColor = 'teal.300';
  const sidebarHover = 'gray.700';

  const isActive = (path) => location.pathname === path;

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const sidebarWidth = sidebarCollapsed ? SIDEBAR_COLLAPSED : SIDEBAR_WIDTH;

  const renderNavLink = (item, collapsed) => (
    <Tooltip key={item.path} label={collapsed ? item.name : ''} placement="right" hasArrow>
      <Link to={item.path} style={{ textDecoration: 'none' }}>
        <Flex
          align="center"
          px={collapsed ? 2 : 3} py={2.5} mb={0.5}
          borderRadius="md" cursor="pointer"
          bg={isActive(item.path) ? sidebarHover : 'transparent'}
          color={isActive(item.path) ? activeColor : 'gray.300'}
          _hover={{ bg: sidebarHover, color: 'white' }}
          transition="all 0.15s"
          justify={collapsed ? 'center' : 'flex-start'}
        >
          <Icon as={item.icon} boxSize={5} mr={collapsed ? 0 : 3} />
          {!collapsed && (
            <Text fontSize="sm" fontWeight={isActive(item.path) ? 'semibold' : 'normal'}>{item.name}</Text>
          )}
        </Flex>
      </Link>
    </Tooltip>
  );

  const handleLogout = () => {
    removeUserToken();
    removeUserInfo();
    navigate('/login');
  };

  return (
    <Flex minH="100vh">
      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <Box position="fixed" inset={0} bg="blackAlpha.600" zIndex={99} onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile sidebar */}
      <Box
        position="fixed" left={0} top={0} h="100vh" w="260px"
        bg={sidebarBg} color="white" zIndex={100}
        transform={mobileOpen ? 'translateX(0)' : 'translateX(-100%)'}
        transition="transform 0.2s"
        display={{ base: 'flex', md: 'none' }}
        flexDirection="column"
      >
        <Flex p={5} borderBottom="1px solid" borderColor="gray.700" align="center" gap={3}>
          <Box bg="teal.500" p={2} borderRadius="lg">
            <Icon as={FiAward} boxSize={4} color="white" />
          </Box>
          <Heading size="sm">Educator Panel</Heading>
        </Flex>
        <Box flex={1} p={2}>
          {NAV_ITEMS.map(item => (
            <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)}>
              <Flex
                align="center" px={3} py={2.5} mb={0.5} borderRadius="md"
                bg={isActive(item.path) ? 'gray.700' : 'transparent'}
                color={isActive(item.path) ? activeColor : 'gray.300'}
                _hover={{ bg: 'gray.700', color: 'white' }}
              >
                <Icon as={item.icon} boxSize={5} mr={3} />
                <Text fontSize="sm">{item.name}</Text>
              </Flex>
            </Link>
          ))}
        </Box>
        <Box p={4} borderTop="1px solid" borderColor="gray.700">
          <Button variant="ghost" color="gray.300" w="full" justifyContent="flex-start"
            leftIcon={<FiLogOut />} onClick={handleLogout} _hover={{ bg: sidebarHover }}>
            Logout
          </Button>
        </Box>
      </Box>

      {/* Desktop sidebar */}
      <Box
        as="aside" w={`${sidebarWidth}px`} bg={sidebarBg} color="white"
        display={{ base: 'none', md: 'flex' }} flexDirection="column"
        position="fixed" left={0} top={0} h="100vh" zIndex={100}
        transition="width 0.2s" overflow="hidden"
      >
        <Flex p={sidebarCollapsed ? 3 : 5} borderBottom="1px solid" borderColor="gray.700" align="center" gap={3} justify={sidebarCollapsed ? 'center' : 'flex-start'}>
          <Box bg="teal.500" p={2} borderRadius="lg">
            <Icon as={FiAward} boxSize={sidebarCollapsed ? 4 : 5} color="white" />
          </Box>
          {!sidebarCollapsed && (
            <Box>
              <Heading size="sm" letterSpacing="tight">Educator Panel</Heading>
              <Text fontSize="xs" color="gray.400">Manage your courses & programs</Text>
            </Box>
          )}
        </Flex>
        <Box flex={1} overflowY="auto" py={2}>
          {NAV_ITEMS.map((item) => renderNavLink(item, sidebarCollapsed))}
        </Box>

        {/* Collapse toggle */}
        <Flex p={2} borderTop="1px solid" borderColor="gray.700" justify="center">
          <IconButton
            icon={sidebarCollapsed ? <FiChevronRight /> : <FiChevronLeft />}
            size="sm" variant="ghost" color="gray.400"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          />
        </Flex>

        {/* Logout / avatar area */}
        <Box p={4} borderTop="1px solid" borderColor="gray.700">
          <Flex align="center" gap={3}>
            <Avatar size="sm" name={userInfo?.username || 'Educator'} bg="teal.500" />
            {!sidebarCollapsed && (
              <Box flex={1} minW={0}>
                <Text fontSize="sm" fontWeight="semibold" noOfLines={1}>{userInfo?.username || 'Educator'}</Text>
                <Text fontSize="xs" color="gray.400">Educator</Text>
              </Box>
            )}
            <Tooltip label="View Site" placement="top" hasArrow>
              <IconButton
                icon={<FiHome />}
                aria-label="View Site"
                size="sm"
                variant="ghost"
                color="gray.400"
                onClick={() => navigate('/')}
                _hover={{ bg: sidebarHover, color: 'white' }}
                mr={2}
              />
            </Tooltip>
            <IconButton icon={<FiLogOut />} size="xs" variant="ghost" color="gray.400"
              aria-label="Logout" onClick={handleLogout} />
          </Flex>
        </Box>
      </Box>

      {/* Main content */}
      <Box
        flex={1} ml={{ base: 0, md: `${sidebarWidth}px` }}
        bg={mainBg} minH="100vh"
      >
        {/* Mobile header */}
        <Flex
          as="header" bg={headerBg} boxShadow="sm" position="sticky" top={0} zIndex={10}
          px={4} py={3} display={{ base: 'flex', md: 'none' }} align="center" gap={3}
        >
          <IconButton icon={<FiMenu />} variant="ghost" size="sm" onClick={() => setMobileOpen(true)} aria-label="Menu" />
          <Heading size="sm" flex={1}>Educator Panel</Heading>
          <NotificationBell api={notificationApi} />
        </Flex>

        <Box p={6}>
          <Outlet />
        </Box>
      </Box>
    </Flex>
  );
};

export default EducatorLayout;
 
