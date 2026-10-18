import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Box, Flex, Text, Button, Icon, Heading, useColorModeValue,
  Breadcrumb, BreadcrumbItem, Avatar,
  useDisclosure, Drawer, DrawerOverlay, DrawerContent, DrawerHeader, DrawerBody,
  IconButton, Tooltip,
} from '@chakra-ui/react';
import {
  FiBarChart2, FiUsers, FiSettings, FiLogOut, FiMenu,
  FiChevronLeft, FiChevronRight,
  FiCreditCard, FiBookOpen, FiLayers, FiActivity, FiBell, FiCpu,
  FiHelpCircle, FiZap, FiMessageSquare,
  FiHome,
} from 'react-icons/fi';
import NotificationBell from '../../components/NotificationBell';
import * as notificationApi from '../services/api';

const SIDEBAR_WIDTH = 250;
const SIDEBAR_COLLAPSED = 68;

const NAV_ITEMS = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: FiBarChart2 },
  { path: '/admin/programs', label: 'Programs', icon: FiLayers },
  { path: '/admin/courses', label: 'Courses', icon: FiBookOpen },
  { path: '/admin/quizzes', label: 'Quizzes', icon: FiHelpCircle },
  { path: '/admin/clinical-cases', label: 'Clinical Cases', icon: FiBookOpen },
  { path: '/admin/flashcards', label: 'Flashcards', icon: FiZap },
  { path: '/admin/messages', label: 'Messages', icon: FiMessageSquare },
  { path: '/admin/users', label: 'Users', icon: FiUsers },
  { path: '/admin/notifications', label: 'Notifications', icon: FiBell },
  { path: '/admin/activity-logs', label: 'Activity Logs', icon: FiActivity },
  { path: '/admin/settings', label: 'Settings', icon: FiSettings },
];

const AdminLayout = () => {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const sidebarBg = useColorModeValue('gray.800', 'gray.900');
  const sidebarHover = useColorModeValue('gray.700', 'gray.700');
  const headerBg = useColorModeValue('white', 'gray.800');
  const mainBg = useColorModeValue('gray.50', 'gray.900');
  const activeColor = 'teal.300';

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  const navigate = useNavigate();

  const sidebarWidth = sidebarCollapsed ? SIDEBAR_COLLAPSED : SIDEBAR_WIDTH;

  const renderNavLink = (item, collapsed) => (
    <Tooltip key={item.path} label={collapsed ? item.label : ''} placement="right" hasArrow>
      <Link to={item.path} style={{ textDecoration: 'none' }}>
        <Flex
          align="center"
          px={collapsed ? 2 : 4} py={2.5} mb={0.5} mx={collapsed ? 1 : 2}
          borderRadius="md" cursor="pointer"
          bg={isActive(item.path) ? sidebarHover : 'transparent'}
          color={isActive(item.path) ? activeColor : 'gray.300'}
          _hover={{ bg: sidebarHover, color: 'white' }}
          transition="all 0.15s"
          justify={collapsed ? 'center' : 'flex-start'}
        >
          <Icon as={item.icon} boxSize={5} flexShrink={0} />
          {!collapsed && (
            <Text fontSize="sm" fontWeight={isActive(item.path) ? 'semibold' : 'normal'} ml={3}>
              {item.label}
            </Text>
          )}
        </Flex>
      </Link>
    </Tooltip>
  );

  return (
    <Flex minH="100vh">
      {/* Mobile Drawer */}
      <Drawer isOpen={mobileMenuOpen} placement="left" onClose={() => setMobileMenuOpen(false)}>
        <DrawerOverlay />
        <DrawerContent bg={sidebarBg} color="white">
          <DrawerHeader borderBottomWidth="1px" borderColor="gray.700">
            <Flex align="center" gap={2}>
              <Box bg="teal.500" p={2} borderRadius="lg">
                <Icon as={FiSettings} boxSize={4} color="white" />
              </Box>
              <Text fontSize="lg" fontWeight="bold">Admin Panel</Text>
            </Flex>
          </DrawerHeader>
          <DrawerBody p={0}>
            <Box as="nav" py={4}>
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.path} to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    display: 'flex', alignItems: 'center', padding: '12px 20px',
                    color: isActive(item.path) ? activeColor : 'gray.300',
                    textDecoration: 'none',
                    borderLeft: isActive(item.path) ? `3px solid ${activeColor}` : '3px solid transparent',
                    background: isActive(item.path) ? 'rgba(255,255,255,0.05)' : 'transparent',
                  }}
                >
                  <Icon as={item.icon} boxSize={5} style={{ marginRight: '12px' }} />
                  <Text fontSize="sm">{item.label}</Text>
                </Link>
              ))}
            </Box>
          </DrawerBody>
          <Box p={4} borderTop="1px solid" borderColor="gray.700">
            <Button variant="ghost" color="gray.300" w="full" justifyContent="flex-start"
              leftIcon={<FiLogOut />} _hover={{ bg: sidebarHover }}>
              Logout
            </Button>
          </Box>
        </DrawerContent>
      </Drawer>

      {/* Desktop Sidebar */}
      <Box
        as="aside"
        w={`${sidebarWidth}px`}
        bg={sidebarBg}
        color="white"
        display={{ base: 'none', md: 'flex' }}
        flexDirection="column"
        position="fixed"
        left={0}
        h="100vh"
        transition="width 0.2s"
        overflow="hidden"
        zIndex={100}
      >
        {/* Logo */}
        <Flex
          p={sidebarCollapsed ? 3 : 5}
          align="center"
          gap={3}
          borderBottom="1px solid"
          borderColor="gray.700"
          justify={sidebarCollapsed ? 'center' : 'flex-start'}
        >
          <Box bg="teal.500" p={2} borderRadius="lg">
            <Icon as={FiSettings} boxSize={4} color="white" />
          </Box>
          {!sidebarCollapsed && (
            <Box>
              <Heading size="sm" letterSpacing="tight">Admin Panel</Heading>
              <Text fontSize="xs" color="gray.400">Manage Neurovia System</Text>
            </Box>
          )}
        </Flex>

        {/* Navigation */}
        <Box as="nav" flex={1} overflowY="auto" py={2}>
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

        {/* Logout */}
        <Box p={4} borderTop="1px solid" borderColor="gray.700">
          <Flex align="center" gap={3}>
            <Avatar size="sm" name="Admin" bg="teal.500" />
            <Box flex={1} minW={0}>
              <Text fontSize="sm" fontWeight="semibold" noOfLines={1}>Admin</Text>
              <Text fontSize="xs" color="gray.400">Administrator</Text>
            </Box>
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
              aria-label="Logout" />
          </Flex>
        </Box>
      </Box>

      {/* Main Content Area */}
      <Box
        flex={1}
        bg={mainBg}
        minH="100vh"
        ml={{ base: 0, md: `${sidebarWidth}px` }}
        transition="margin 0.2s"
        display="flex"
        flexDirection="column"
      >
        {/* Header */}
        <Box as="header" bg={headerBg} boxShadow="sm" position="sticky" top={0} zIndex={10}
          px={{ base: 4, md: 6 }} py={3}>
          <Flex align="center" justify="space-between">
            <Flex align="center" gap={3}>
              <IconButton icon={<FiMenu />} display={{ base: 'flex', md: 'none' }}
                variant="ghost" size="sm" onClick={() => setMobileMenuOpen(true)} aria-label="Menu" />
              <Breadcrumb separator="/" fontSize="sm" display={{ base: 'none', sm: 'flex' }}>
                <BreadcrumbItem>
                  <Link to="/admin/dashboard" style={{ color: '#718096', fontSize: '14px' }}>Home</Link>
                </BreadcrumbItem>
                {location.pathname !== '/admin/dashboard' && (
                  <BreadcrumbItem isCurrentPage>
                    <Text color="gray.800" fontSize="14px" fontWeight="semibold">
                      {NAV_ITEMS.find((n) => location.pathname.startsWith(n.path))?.label || ''}
                    </Text>
                  </BreadcrumbItem>
                )}
              </Breadcrumb>
            </Flex>
            <Flex align="center" gap={2}>
              <NotificationBell api={notificationApi} />
            </Flex>
          </Flex>
        </Box>

        {/* Page Content */}
        <Box flex={1} p={{ base: 4, md: 6 }}>
          <Outlet />
        </Box>
      </Box>
    </Flex>
  );
};

export default AdminLayout;
