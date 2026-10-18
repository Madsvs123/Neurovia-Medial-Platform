import React, { useMemo, useState } from 'react';
import { Box, Flex, Heading, Button, Text, Icon, HStack } from '@chakra-ui/react';
import { FiPlus, FiMessageSquare } from 'react-icons/fi';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import InboxShell from '../components/InboxShell/InboxShell';
import BoxNav from '../components/ThreadList/BoxNav';
import ThreadList from '../components/ThreadList/ThreadList';
import ThreadView from '../components/ThreadView/ThreadView';
import ThreadSidebar from '../components/ThreadSidebar/ThreadSidebar';
import { useThreadCounts } from '../hooks/useMessaging';

/**
 * The inbox for every portal. Route shape: `${basePath}` (list) and
 * `${basePath}/:threadId` (list + open thread). The active box is kept in
 * the query string (`?box=queue`) so deep links and refreshes keep state.
 */
const InboxPage = ({ portal, currentUser, title }) => {
  const { t } = useTranslation('messaging');
  const navigate = useNavigate();
  const { threadId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState({});

  const boxKey = searchParams.get('box') || portal.boxes[0].key;
  const box = useMemo(() => portal.boxes.find((b) => b.key === boxKey) || portal.boxes[0], [portal, boxKey]);
  const { data: counts } = useThreadCounts();

  const selectBox = (b) => {
    setFilters({});
    setSearchParams({ box: b.key });
    if (threadId) navigate(`${portal.basePath}?box=${b.key}`);
  };

  const openThread = (thread) => navigate(`${portal.basePath}/${thread._id}?box=${box.key}`);
  const back = () => navigate(`${portal.basePath}?box=${box.key}`);

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={4} flexWrap="wrap" gap={3}>
        <Heading size="lg">{title || t('nav.messages')}</Heading>
        <Button leftIcon={<FiPlus />} colorScheme="teal" size="sm" onClick={() => navigate(`${portal.basePath}/new`)}>
          {portal.isStaff ? t('nav.newMessage') : t('nav.newRequest')}
        </Button>
      </Flex>

      <InboxShell
        hasThread={!!threadId}
        nav={<BoxNav boxes={portal.boxes} activeKey={box.key} counts={counts} onSelect={selectBox} />}
        list={(
          <ThreadList
            key={box.key}
            params={box.params}
            filters={filters}
            onFiltersChange={setFilters}
            showFilters={portal.showFilters}
            isStaff={portal.isStaff}
            activeId={threadId}
            onSelect={openThread}
            isQueue={box.params.box === 'queue'}
          />
        )}
        thread={threadId ? (
          <ThreadView
            key={threadId}
            threadId={threadId}
            currentUser={currentUser}
            portal={portal}
            onBack={back}
            sidebar={<ThreadSidebar portal={portal} currentUser={currentUser} />}
          />
        ) : (
          <Flex direction="column" align="center" justify="center" h="100%" color="gray.400" px={6}>
            <Icon as={FiMessageSquare} boxSize={10} opacity={0.3} />
            <Text mt={3} fontSize="sm">{t('list.selectThread')}</Text>
            <HStack mt={4}>
              <Button size="sm" variant="outline" onClick={() => navigate(`${portal.basePath}/new`)}>{portal.isStaff ? t('nav.newMessage') : t('nav.newRequest')}</Button>
            </HStack>
          </Flex>
        )}
      />
    </Box>
  );
};

export default InboxPage;
