import React from 'react';
import { IconButton, Tooltip, Box, Badge } from '@chakra-ui/react';
import { FiMessageCircle } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

const MotionBox = motion(Box);

const SupportChatButton = ({ onClick, unreadCount = 0 }) => {
    return (
        <MotionBox
            position="fixed"
            bottom="20px"
            right="20px"
            zIndex={1000}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
            <Tooltip label={unreadCount > 0 ? `${unreadCount} unread messages` : 'Support Chat'} hasArrow>
                <Box position="relative">
                    <IconButton
                        icon={<FiMessageCircle size={24} />}
                        aria-label="Open support chat"
                        colorScheme="teal"
                        size="lg"
                        isRound
                        boxShadow="lg"
                        onClick={onClick}
                        _hover={{ transform: 'scale(1.05)' }}
                        transition="all 0.2s"
                    />
                    <AnimatePresence>
                        {unreadCount > 0 && (
                            <MotionBox
                                position="absolute"
                                top="-4px"
                                right="-4px"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                            >
                                <Badge
                                    colorScheme="red"
                                    borderRadius="full"
                                    fontSize="11px"
                                    px={1.5}
                                    minW="20px"
                                    textAlign="center"
                                    boxShadow="md"
                                >
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </Badge>
                            </MotionBox>
                        )}
                    </AnimatePresence>
                </Box>
            </Tooltip>
        </MotionBox>
    );
};

export default SupportChatButton;
