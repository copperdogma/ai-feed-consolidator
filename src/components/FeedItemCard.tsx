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
} from '@mui/material';
import { OpenInNew as OpenInNewIcon } from '@mui/icons-material';
import { ProcessedFeedItem } from '../server/types/feed';

interface FeedItemCardProps {
  item: ProcessedFeedItem;
}

export function FeedItemCard({ item }: FeedItemCardProps) {
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
        <Link href={item.url} target="_blank" rel="noopener noreferrer">
          <IconButton size="small" title="Open original">
            <OpenInNewIcon />
          </IconButton>
        </Link>
      </CardActions>
    </Card>
  );
} 