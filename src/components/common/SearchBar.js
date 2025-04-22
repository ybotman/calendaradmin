'use client';

import { TextField, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

/**
 * A reusable search bar component with search icon.
 * 
 * @param {Object} props - Component props
 * @param {string} props.value - Current search term value
 * @param {Function} props.onChange - Callback function when search value changes
 * @param {string} [props.placeholder="Search..."] - Placeholder text to display
 * @param {Object} [props.sx] - Additional MUI sx styling
 * @returns {JSX.Element} SearchBar component
 */
export default function SearchBar({ 
  value, 
  onChange, 
  placeholder = "Search...", 
  sx = {},
  ...rest 
}) {
  return (
    <TextField
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      variant="outlined"
      size="small"
      sx={{ ...sx }}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon />
          </InputAdornment>
        ),
      }}
      {...rest}
    />
  );
}