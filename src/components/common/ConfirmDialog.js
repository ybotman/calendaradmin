'use client';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material';

/**
 * A reusable confirmation dialog component.
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.open - Whether the dialog is open
 * @param {Function} props.onClose - Callback when dialog is closed without confirmation
 * @param {Function} props.onConfirm - Callback when action is confirmed
 * @param {string} props.title - Dialog title text
 * @param {string} props.message - Dialog message text
 * @param {string} [props.confirmText="Confirm"] - Text for confirm button
 * @param {string} [props.cancelText="Cancel"] - Text for cancel button
 * @param {string} [props.confirmColor="primary"] - Color for confirm button (primary, secondary, error, etc.)
 * @returns {JSX.Element} ConfirmDialog component
 */
export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmColor = "primary",
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
    >
      <DialogTitle id="confirm-dialog-title">{title}</DialogTitle>
      <DialogContent>
        <DialogContentText id="confirm-dialog-description">
          {message}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{cancelText}</Button>
        <Button onClick={onConfirm} color={confirmColor} variant="contained" autoFocus>
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}