'use client';

import { Component } from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import ErrorIcon from '@mui/icons-material/Error';

/**
 * Error Boundary component to catch and display errors gracefully
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can log the error to an error reporting service
    console.error("Error caught by error boundary:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ 
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    const { children, fallback, componentName = 'component' } = this.props;
    
    if (this.state.hasError) {
      // You can render any custom fallback UI
      if (fallback) {
        return fallback(this.state.error, this.handleReset);
      }
      
      return (
        <Paper 
          elevation={3} 
          sx={{ 
            p: 3, 
            m: 2, 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            gap: 2,
            bgcolor: 'error.light'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ErrorIcon color="error" fontSize="large" />
            <Typography variant="h5" component="h2" color="error.dark">
              An error occurred in {componentName}
            </Typography>
          </Box>
          
          <Typography variant="body1">
            {this.state.error?.message || 'Something went wrong.'}
          </Typography>
          
          <Button 
            variant="contained" 
            color="primary" 
            onClick={this.handleReset}
          >
            Try Again
          </Button>
        </Paper>
      );
    }

    return children;
  }
}