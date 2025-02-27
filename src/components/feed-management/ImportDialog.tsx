import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { ImportResult } from '../../types/feed-management';

/**
 * Props for the ImportDialog component
 */
interface ImportDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when the dialog is closed */
  onClose: () => void;
  /** Results from the OPML import operation */
  result: ImportResult;
}

/**
 * Dialog component for displaying OPML import results.
 * Shows a summary of successful imports, skipped feeds, and any errors.
 * 
 * Displays:
 * - Number of successfully added feeds
 * - Number of skipped (duplicate) feeds
 * - List of any import errors
 * 
 * Features:
 * - Clear success/error messages
 * - Detailed error list if any
 * - Close button
 * - Proper pluralization of feed counts
 * 
 * @component
 * @example
 * ```tsx
 * <ImportDialog
 *   open={hasResult}
 *   onClose={() => setResult(null)}
 *   result={{
 *     added: 5,
 *     skipped: 2,
 *     errors: ['Invalid feed URL: http://example.com']
 *   }}
 * />
 * ```
 */
export const ImportDialog: React.FC<ImportDialogProps> = ({
  open,
  onClose,
  result,
}) => (
  <Dialog open={open} onClose={onClose}>
    <DialogTitle>Import Results</DialogTitle>
    <DialogContent>
      <Typography variant="body1" gutterBottom>
        Successfully added {result.added} feed{result.added !== 1 ? 's' : ''}.
      </Typography>
      {result.skipped > 0 && (
        <Typography variant="body1" gutterBottom>
          Skipped {result.skipped} duplicate feed{result.skipped !== 1 ? 's' : ''}.
        </Typography>
      )}
      {result.errors.length > 0 && (
        <>
          <Typography variant="body1" color="error" gutterBottom>
            Failed to import {result.errors.length} feed{result.errors.length !== 1 ? 's' : ''}:
          </Typography>
          <List dense>
            {result.errors.map((error, index) => (
              <ListItem key={index}>
                <ListItemText primary={error} />
              </ListItem>
            ))}
          </List>
        </>
      )}
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Close</Button>
    </DialogActions>
  </Dialog>
); 