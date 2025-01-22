import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
  Box,
  IconButton,
  CardActions,
  Link,
  Tooltip,
} from '@mui/material';
import { OpenInNew as OpenInNewIcon, Chat as ChatIcon } from '@mui/icons-material';
import { ProcessedFeedItem } from '../server/types/feed';

interface FeedItemCardProps {
  item: ProcessedFeedItem;
}

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
    <Card sx={{ mb: 2, width: '100%' }}>
      <CardContent>
        <Typography variant="h6" component="h2" gutterBottom>
          {item.title}
        </Typography>
        
        <Box sx={{ mb: 2 }}>
          <Chip 
            label={`${item.readingTime || 0} min read`} 
            size="small" 
            sx={{ mr: 1 }} 
          />
          <Chip 
            label={item.source.platform} 
            size="small" 
            sx={{ mr: 1 }} 
          />
          <Chip 
            label={item.source.name}
            size="small" 
            sx={{ mr: 1 }}
            color="primary"
            variant="outlined"
          />
          {item.topics?.map(topic => (
            <Chip 
              key={topic} 
              label={topic} 
              size="small" 
              sx={{ mr: 1 }} 
            />
          ))}
        </Box>

        {item.keyPoints && item.keyPoints.length > 0 && (
          <>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Key Points:
            </Typography>
            <List dense>
              {item.keyPoints.map((point, index) => (
                <ListItem key={index}>
                  <ListItemText primary={point} />
                </ListItem>
              ))}
            </List>
          </>
        )}
      </CardContent>
      
      <CardActions>
        <Tooltip title="Open original article">
          <Link href={item.url} target="_blank" rel="noopener noreferrer">
            <IconButton size="small">
              <OpenInNewIcon />
            </IconButton>
          </Link>
        </Tooltip>
        <Tooltip title="Analyze with GPT-4">
          <IconButton size="small" onClick={openInChatGPT}>
            <ChatIcon />
          </IconButton>
        </Tooltip>
      </CardActions>
    </Card>
  );
} 