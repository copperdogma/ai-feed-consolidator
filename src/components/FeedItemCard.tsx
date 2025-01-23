import React from 'react';
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
  Stack,
} from '@mui/material';
import { 
  OpenInNew as OpenInNewIcon, 
  Chat as ChatIcon,
  Article as ArticleIcon,
  Headphones as HeadphonesIcon,
  Videocam as VideocamIcon,
} from '@mui/icons-material';
import { ProcessedFeedItem } from '../server/types/feed';

interface FeedItemCardProps {
  item: ProcessedFeedItem;
}

const getMediaIcon = (type: string) => {
  switch (type) {
    case 'listen':
      return <HeadphonesIcon fontSize="small" />;
    case 'watch':
      return <VideocamIcon fontSize="small" />;
    default:
      return <ArticleIcon fontSize="small" />;
  }
};

export function FeedItemCard({ item }: FeedItemCardProps) {
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
    >
      {item.media && item.media.length > 0 && item.media[0].thumbnailUrl && (
        <Box 
          component="img"
          src={item.media[0].thumbnailUrl}
          alt=""
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
        
        <CardActions sx={{ pt: 0, pb: 1, px: 0 }}>
          <Tooltip title="Open original article">
            <Link href={item.url} target="_blank" rel="noopener noreferrer">
              <IconButton size="small">
                <OpenInNewIcon fontSize="small" />
              </IconButton>
            </Link>
          </Tooltip>
          <Tooltip title="Analyze with GPT-4">
            <IconButton size="small" onClick={openInChatGPT}>
              <ChatIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </CardActions>
      </Box>
    </Card>
  );
} 