import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Chip,
  Box,
  IconButton,
  CardActions,
  Link,
  Tooltip,
} from '@mui/material';
import { 
  OpenInNew as OpenInNewIcon, 
  Chat as ChatIcon,
  Article as ArticleIcon,
  Headphones as HeadphonesIcon,
  Videocam as VideocamIcon,
  Bookmark as BookmarkIcon,
  BookmarkBorder as BookmarkBorderIcon,
} from '@mui/icons-material';
import { ProcessedFeedItem, ConsumptionType, Tag } from '../types/feed';
import config from '../config';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface FeedItemCardProps {
  item: ProcessedFeedItem;
  onRefresh?: () => void;
  'data-testid'?: string;
}

const getMediaIcon = (type: ConsumptionType) => {
  switch (type) {
    case 'listen':
      return <HeadphonesIcon fontSize="small" />;
    case 'watch':
      return <VideocamIcon fontSize="small" />;
    default:
      return <ArticleIcon fontSize="small" />;
  }
};

export function FeedItemCard({ item, onRefresh, 'data-testid': testId }: FeedItemCardProps) {
  const queryClient = useQueryClient();
  const isSaved = item.metadata?.tags?.some(tag => tag.id.includes('global.saved')) ?? false;

  const toggleSavedMutation = useMutation({
    mutationFn: async () => {
      const togglePath = config.api.toggleSavedPath.replace(':id', item.externalId);
      const response = await fetch(`${config.serverUrl}${togglePath}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ saved: !isSaved }),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        throw new Error('Failed to toggle saved status');
      }

      return response.json();
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['feedItems'] });
      const previousItems = queryClient.getQueryData(['feedItems']);

      // Optimistically update the item's saved status
      queryClient.setQueryData(['feedItems'], (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.map(feedItem => {
          if (feedItem.externalId === item.externalId) {
            return {
              ...feedItem,
              metadata: {
                ...feedItem.metadata,
                tags: isSaved
                  ? feedItem.metadata.tags.filter((tag: Tag) => !tag.id.includes('global.saved'))
                  : [...(feedItem.metadata.tags || []), { id: 'global.saved' }]
              }
            };
          }
          return feedItem;
        });
      });

      return { previousItems };
    },
    onError: (err, variables, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(['feedItems'], context.previousItems);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['feedItems'] });
      if (onRefresh) {
        onRefresh();
      }
    },
  });

  const toggleSaved = () => {
    if (toggleSavedMutation.isPending) return;
    toggleSavedMutation.mutate();
  };

  const openInChatGPT = () => {
    const prompt = `Analyze ${item.url}

Please provide:
1. Main arguments and key findings
2. Supporting evidence and data
3. Context and implications
4. Notable quotes or statements
5. Technical details or methodologies
6. Critical evaluation

For context:
Title: ${item.title}
Source: ${item.source.name} (${item.source.platform})`;

    const encodedPrompt = encodeURIComponent(prompt);
    const chatGPTUrl = `https://chat.openai.com/?q=${encodedPrompt}`;
    window.open(chatGPTUrl, '_blank');
  };

  return (
    <Card 
      sx={{ 
        mb: 1,
        width: '100%', 
        display: 'flex', 
        alignItems: 'flex-start',
        borderRadius: 0,
        borderBottom: 1,
        borderColor: 'divider',
        boxShadow: 'none',
      }}
      data-testid={testId}
    >
      {item.media?.[0]?.thumbnailUrl && (
        <Box 
          component="img"
          src={item.media[0].thumbnailUrl}
          alt={`${item.title} thumbnail`}
          sx={{ 
            width: 100, 
            height: 100, 
            objectFit: 'cover',
            borderRadius: 1,
            m: 2
          }}
        />
      )}
      
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <CardContent sx={{ flex: '1 0 auto', py: 2, px: 0, '&:last-child': { pb: 1 } }}>
          <Typography 
            variant="h6" 
            component="h2" 
            sx={{ 
              fontWeight: 500,
              lineHeight: 1.3,
              mb: 1,
              fontSize: '1.1rem',
              textAlign: 'left'
            }}
          >
            {item.title}
          </Typography>

          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              mb: 1,
              gap: 1,
              flexWrap: 'wrap',
              '& > *': { flexShrink: 0 }
            }}
          >
            <Chip
              icon={getMediaIcon(item.consumption_time?.type || 'read')}
              label={`${item.consumption_time?.minutes || 0} min`}
              size="small"
              sx={{ 
                height: 20,
                '& .MuiChip-icon': { 
                  fontSize: 14,
                  ml: 0.5,
                  mr: -0.5 
                },
                '& .MuiChip-label': {
                  px: 1,
                  fontSize: '0.75rem'
                }
              }}
            />
            <Chip 
              label={item.content_type} 
              size="small"
              sx={{
                height: 20,
                bgcolor: 'grey.100',
                '& .MuiChip-label': {
                  px: 1,
                  fontSize: '0.75rem'
                }
              }}
            />
            <Typography 
              variant="caption" 
              color="primary"
              sx={{ 
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'underline'
                }
              }}
              component={Link}
              href={item.source.url}
              target="_blank"
            >
              {item.source.name}
            </Typography>
            {item.topics?.map(topic => (
              <Chip 
                key={topic} 
                label={topic} 
                size="small"
                sx={{
                  height: 20,
                  bgcolor: 'primary.light',
                  color: 'primary.contrastText',
                  '& .MuiChip-label': {
                    px: 1,
                    fontSize: '0.75rem'
                  }
                }}
              />
            ))}
            {item.requires_background?.map(topic => (
              <Chip 
                key={topic} 
                label={topic} 
                size="small"
                variant="outlined"
                sx={{
                  height: 20,
                  '& .MuiChip-label': {
                    px: 1,
                    fontSize: '0.75rem'
                  }
                }}
              />
            ))}
          </Box>

          {item.summary && (
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ 
                fontSize: '0.875rem',
                lineHeight: 1.4,
                textAlign: 'left'
              }}
            >
              {item.summary}
            </Typography>
          )}
        </CardContent>
        
        <CardActions sx={{ pt: 0, pb: 2, px: 2, gap: 1 }}>
          <Tooltip title="Open in ChatGPT">
            <IconButton
              onClick={openInChatGPT}
              size="small"
              aria-label="Analyze with ChatGPT"
            >
              <ChatIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Open original">
            <IconButton
              component={Link}
              href={item.url}
              target="_blank"
              size="small"
              aria-label="Open original"
            >
              <OpenInNewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={isSaved ? 'Remove from saved' : 'Save for later'}>
            <IconButton 
              size="small" 
              onClick={toggleSaved}
              data-testid={`bookmark-button-${item.id}`}
            >
              {isSaved ? <BookmarkIcon fontSize="small" /> : <BookmarkBorderIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </CardActions>
      </Box>
    </Card>
  );
} 