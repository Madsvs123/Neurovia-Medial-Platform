/**
 * Messaging feature — public surface.
 *
 * Portals render <InboxPage/>, <NewThreadPage/> with their portalConfig;
 * the student app additionally mounts <SupportWidget/>; main.jsx mounts
 * <MessagingSocketProvider/> once for the whole session.
 */
export { default as InboxPage } from './pages/InboxPage';
export { default as NewThreadPage } from './pages/NewThreadPage';
export { default as MessagingStatsCard } from './pages/MessagingStatsCard';
export { default as TemplatesSettings } from './pages/TemplatesSettings';
export { default as SupportWidget, OPEN_WIDGET_EVENT } from './components/SupportWidget/SupportWidget';
export { MessagingSocketProvider, useMessagingSocket } from './hooks/MessagingSocketProvider';
export { useThreadCounts, useMessagingConfig } from './hooks/useMessaging';
export { studentPortal, educatorPortal, adminPortal, portalFor } from './portal/portalConfig';
export { messagingApi } from './api/messagingApi';
