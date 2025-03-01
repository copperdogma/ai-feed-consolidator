import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from '@mui/material';

/**
 * Props for the DeleteConfirmDialog component
 */
interface DeleteConfirmDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when the dialog is closed */
  onClose: () => void;
  /** Callback when deletion is confirmed */
  onConfirm: () => void;
}

/**
 * Dialog component for confirming feed deletion.
 * Displays a warning message and requires explicit confirmation.
 * 
 * Features:
 * - Clear warning message
 * - Cancel and confirm buttons
 * - Confirm button styled in error color
 * 
 * @component
 * @example
 * ```tsx
 * <DeleteConfirmDialog
 *   open={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   onConfirm={() => handleDelete()}
 * />
 * ```
 */
export const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  open,
  onClose,
  onConfirm,
}) => (
  <Dialog 
    open={open} 
    onClose={onClose}
  >
    <DialogTitle>Delete Feed</DialogTitle>
    <DialogContent>
      <Typography gutterBottom>Are you sure you want to delete this feed?</Typography>
      <Typography color="error" variant="body2">
        This action cannot be undone.
      </Typography>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Cancel</Button>
      <Button onClick={onConfirm} color="error">
        Delete
      </Button>
    </DialogActions>
  </Dialog>
); 