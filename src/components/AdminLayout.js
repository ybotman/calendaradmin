import { useState } from 'react';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import List from '@mui/material/List';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Avatar from '@mui/material/Avatar';
import { useAppContext } from '@/lib/AppContext';

// Icons
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import BusinessIcon from '@mui/icons-material/Business';
import AppsIcon from '@mui/icons-material/Apps';
import BuildIcon from '@mui/icons-material/Build';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';

// Navigation items
const mainNavItems = [
  { name: 'Dashboard', icon: <DashboardIcon />, href: '/dashboard' },
  { name: 'Users', icon: <PeopleIcon />, href: '/dashboard/users' },
  { name: 'Organizers', icon: <BusinessIcon />, href: '/dashboard/organizers' },
  { name: 'Geo Hierarchy', icon: <LocationOnIcon />, href: '/dashboard/geo-hierarchy' },
  { name: 'Venues', icon: <LocationOnIcon />, href: '/dashboard/venues' },
];

const drawerWidth = 240;

export default function AdminLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { currentApp, updateCurrentApp } = useAppContext();
  const [anchorEl, setAnchorEl] = useState(null);
  const [appMenuAnchor, setAppMenuAnchor] = useState(null);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleAppMenu = (event) => {
    setAppMenuAnchor(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleAppMenuClose = () => {
    setAppMenuAnchor(null);
  };

  const handleAppChange = (app) => {
    updateCurrentApp(app);
    setAppMenuAnchor(null);
  };

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        py: 1 
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
          <Box 
            component="img"
            src="/CalOpsWideSmall.jpg"
            alt="Calendar Admin Logo"
            sx={{ 
              height: 40,
              width: 'auto',
              mr: 1
            }}
          />
        </Box>
      </Toolbar>
      <Divider />
      <List>
        {mainNavItems.map((item) => (
          <ListItem key={item.name} disablePadding>
            <ListItemButton component="a" href={item.href}>
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.name} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Box sx={{ flexGrow: 1 }} />
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton component="a" href="/dashboard/maintenance">
            <ListItemIcon><BuildIcon /></ListItemIcon>
            <ListItemText primary="Maintenance" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton component="a" href="/auth/logout">
            <ListItemIcon><ExitToAppIcon /></ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="subtitle1" noWrap component="div" sx={{ flexGrow: 1 }}>
            <Box onClick={handleAppMenu} sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              Current Application: {currentApp.name} <AppsIcon sx={{ ml: 1 }} />
            </Box>
          </Typography>
          
          <Menu
            id="app-menu"
            anchorEl={appMenuAnchor}
            open={Boolean(appMenuAnchor)}
            onClose={handleAppMenuClose}
          >
            <MenuItem onClick={() => handleAppChange({ id: '1', name: 'TangoTiempo' })}>
              TangoTiempo
            </MenuItem>
            <MenuItem onClick={() => handleAppChange({ id: '2', name: 'HarmonyJunction' })}>
              HarmonyJunction
            </MenuItem>
          </Menu>
          
          <IconButton
            size="large"
            aria-label="account of current user"
            aria-controls="menu-appbar"
            aria-haspopup="true"
            onClick={handleMenu}
            color="inherit"
          >
            <Avatar sx={{ width: 32, height: 32 }} />
          </IconButton>
          <Menu
            id="menu-appbar"
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorEl)}
            onClose={handleClose}
          >
            <MenuItem onClick={handleClose}>Profile</MenuItem>
            <MenuItem onClick={handleClose}>Logout</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better mobile performance
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: '64px', // AppBar height
        }}
      >
        {children}
      </Box>
    </Box>
  );
}