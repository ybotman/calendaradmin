'use client';

import { Box } from '@mui/material';

/**
 * A simple tab panel component that displays content for the active tab.
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Content to display when tab is active
 * @param {number} props.value - Current active tab value
 * @param {number} props.index - This tab's index value
 * @returns {JSX.Element} TabPanel component
 */
export default function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}