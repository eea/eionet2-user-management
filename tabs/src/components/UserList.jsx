import { React, useState, useEffect } from 'react';
import { logInfo } from '../data/apiProvider';
import { getUser, removeUser, removeUserMemberships, getUserGroups } from '../data/provider';
import { getConfiguration } from '../data/apiProvider';
import { getInvitedUsers } from '../data/sharepointProvider';
import messages from '../data/messages.json';
import { useMediaQuery } from 'react-responsive';
import { DataGrid } from '@mui/x-data-grid';
import './UserList.scss';
import {
  TextField,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  IconButton,
  Backdrop,
  CircularProgress,
  Box,
  Alert,
  Tooltip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CreateIcon from '@mui/icons-material/Create';
import DeleteIcon from '@mui/icons-material/Delete';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import InfoIcon from '@mui/icons-material/Info';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import WarningIcon from '@mui/icons-material/Warning';
import ClearIcon from '@mui/icons-material/Clear';
import PersonRemove from '@mui/icons-material/PersonRemoveAlt1';
import { UserEdit } from './UserEdit';
import { UserInvite } from './UserInvite';
import Snack from './Snack';
import DeleteDialog from './DeleteDialog';

export function UserList({ userInfo }) {
  const isMobile = useMediaQuery({ query: `(max-width: 760px)` });
  const [users, setUsers] = useState([]),
    [filteredUsers, setFilteredUsers] = useState([]),
    [selectedUser, setSelectedUser] = useState({}),
    [configuration, setConfiguration] = useState({}),
    [addFormVisible, setAddFormVisible] = useState(false),
    [formVisible, setFormVisible] = useState(false),
    [alertOpen, setAlertOpen] = useState(false),
    [loading, setloading] = useState(false),
    [filterValue, setFilterValue] = useState(''),
    [searchOpen, setSearchOpen] = useState(false);

  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false),
    [deleteMembershipAlertOpen, setDeleteMembershipAlertOpen] = useState(false),
    [snackbarMessage, setSnackbarMessage] = useState(''),
    [snackbarOpen, setSnackbarOpen] = useState(false);

  const renderButtons = (params) => {
      const showRemoveMemberships =
          userInfo.isNFP &&
          (params.row?.OtherMemberships?.length > 0 || params.row?.NFP) &&
          params.row?.Membership?.length > 0,
        showRemoveUser =
          (userInfo.isNFP && !params.row?.OtherMemberships?.length && !params.row?.NFP) ||
          userInfo.isAdmin;
      return (
        <div className="row">
          <strong>
            <Tooltip title="Edit">
              <IconButton
                variant="contained"
                color="secondary"
                size="small"
                onClick={async () => {
                  setFormVisible(false);
                  const user = params.row;
                  let missingUser = user.ADUserId === undefined;
                  if (user.ADUserId) {
                    const userDetails = await getUser(user.ADUserId);
                    missingUser = userDetails === undefined;
                    if (userDetails) {
                      user.FirstName = userDetails.givenName;
                      user.LastName = userDetails.surname;
                      setSelectedUser(user);
                      setFormVisible(true);
                    }
                  }
                  setAlertOpen(missingUser);
                  missingUser && logInfo(messages.UserList.MissingADUser, '', user, 'Edit user');
                }}
              >
                <CreateIcon />
              </IconButton>
            </Tooltip>
            {showRemoveUser && (
              <Tooltip title="Remove">
                <IconButton
                  variant="contained"
                  color="secondary"
                  size="small"
                  onClick={async () => {
                    setFormVisible(false);
                    const user = params.row;
                    if (user.ADUserId) {
                      const userDetails = await getUser(user.ADUserId),
                        groupsString = await getUserGroups(user.ADUserId);

                      user.FirstName = userDetails.givenName;
                      user.LastName = userDetails.surname;
                      user.groupsString = groupsString;
                    }
                    setSelectedUser(user);
                    setDeleteAlertOpen(true);
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            )}

            {showRemoveMemberships && (
              <Tooltip title="Remove Eionet memberships">
                <IconButton
                  variant="contained"
                  color="secondary"
                  size="small"
                  onClick={async () => {
                    setFormVisible(false);
                    const user = params.row;
                    if (user.ADUserId) {
                      const userDetails = await getUser(user.ADUserId),
                        groupsString = await getUserGroups(user.ADUserId);

                      user.FirstName = userDetails.givenName;
                      user.LastName = userDetails.surname;
                      user.groupsString = groupsString;
                    }
                    setSelectedUser(user);
                    setDeleteMembershipAlertOpen(true);
                  }}
                >
                  <PersonRemove />
                </IconButton>
              </Tooltip>
            )}
          </strong>
        </div>
      );
    },
    handleAlertClose = (_event, reason) => {
      if (reason === 'clickaway') {
        return;
      }

      setAlertOpen(false);
    },
    handleDeleteYes = async () => {
      setDeleteAlertOpen(false);
      setloading(true);
      let result = await removeUser(selectedUser);
      await refreshList();
      setloading(false);
      setSnackbarMessage('Success. User removed from Eionet&lsquo;s workspace.');
      setSnackbarOpen(result.Success);
    },
    handleDeleteNo = () => {
      setDeleteAlertOpen(false);
    },
    handleDeleteMembershipYes = async () => {
      setDeleteMembershipAlertOpen(false);
      setloading(true);
      let result = await removeUserMemberships(selectedUser);
      await refreshList();
      setloading(false);
      setSnackbarMessage('Success. User&lsquo;s Eionet memberships removed.');
      setSnackbarOpen(result.Success);
    },
    handleDeleteMembershipNo = () => {
      setDeleteMembershipAlertOpen(false);
    },
    handleSearchDialog = () => {
      setSearchOpen(true);
    },
    handleSearchClose = () => {
      setSearchOpen(false);
    },
    renderMembershipTags = (params) => {
      let index = 0,
        allMemberships = [];

      params.row.Membership && params.row.Membership.forEach((m) => allMemberships.push(m));
      params.row.OtherMemberships &&
        params.row.OtherMemberships.forEach((m) => allMemberships.push(m));
      params.row.NFP && allMemberships.push(params.row.NFP);
      return (
        <Tooltip title={allMemberships.join(', ') || ''} arrow>
          <div id="test">
            {allMemberships.map((m) => (
              <Chip key={index++} label={m} />
            ))}
          </div>
        </Tooltip>
      );
    },
    renderSignedIn = (params) => {
      let value = params.row.SignedIn || false;

      return value ? (
        <CheckCircleOutlineIcon sx={{ color: 'green' }}></CheckCircleOutlineIcon>
      ) : (
        <WarningIcon sx={{ color: '#eed202' }}></WarningIcon>
      );
    },
    refreshRow = async (user) => {
      let existingRecord = filteredUsers.find((u) => {
        return u.id == user.id;
      });

      if (existingRecord) {
        Object.assign(existingRecord, user);
      }
    },
    refreshList = async () => {
      let invitedUsers = await getInvitedUsers(userInfo);
      if (invitedUsers) {
        setUsers(invitedUsers);
        setFilteredUsers(invitedUsers);
      }
    },
    getDeleteMessage = () => {
      let message = messages.UserList.DeleteUser;
      message = selectedUser ? message.replace('#name#', selectedUser.Title) : '';
      message += ' ' + configuration.DeleteEionetUserDetails;
      return message;
    },
    getDeleteMembershipMessage = () => {
      const configMessage = configuration.DeleteEionetUserMemberships
        ? configuration.DeleteEionetUserMemberships
        : '';
      let message = messages.UserList.DeleteUserMemberships;
      message = selectedUser ? message.replace('#name#', selectedUser.Title) : '';
      message += ' ' + configMessage;
      return message;
    },
    handleClose = () => {
      setSelectedUser({});
      setFormVisible(false);
    },
    handleAddClose = () => {
      setSelectedUser({});
      setAddFormVisible(false);
    },
    handleSnackbarClose = (_event, reason) => {
      if (reason === 'clickaway') {
        return;
      }

      setSnackbarOpen(false);
    },
    onFilterValueChanged = (value) => {
      setFilterValue(value);
      if (!value || (value && value.length < 2)) {
        setFilteredUsers(users);
      } else {
        setTimeout(
          setFilteredUsers(
            users.filter((u) => {
              return (
                u.Email.toLowerCase().includes(value.toLowerCase()) ||
                (u.Title && u.Title.toLowerCase().includes(value.toLowerCase())) ||
                (u.Membership &&
                  u.Membership.some((m) => m.toLowerCase().includes(value.toLowerCase())))
              );
            }),
          ),
          50,
        );
      }
    };

  const columns = [
    { field: 'Title', headerName: 'Name', flex: 0.65 },
    { field: 'Email', headerName: 'Email', flex: 0.65 },
    {
      field: 'MembershipString',
      headerName: 'Memberships',
      renderCell: renderMembershipTags,
      flex: 1,
      hide: isMobile,
    },
    { field: 'Country', headerName: 'Country', flex: 0.15, hide: isMobile },
    { field: 'Organisation', headerName: 'Organisation', flex: 0.65, hide: isMobile },
    {
      field: 'SignedIn',
      headerName: 'Signed In',
      renderCell: renderSignedIn,
      flex: 0.15,
      align: 'center',
      hide: isMobile,
    },
    {
      field: 'Edit',
      headerName: '',
      width: 85,
      renderCell: renderButtons,
      disableClickEventBubbling: true,
    },
  ];

  useEffect(() => {
    (async () => {
      setloading(true);
      let loadedConfiguration = await getConfiguration();
      if (loadedConfiguration) {
        setConfiguration(loadedConfiguration);
      }
      let invitedUsers = await getInvitedUsers(userInfo);
      if (invitedUsers) {
        setUsers(invitedUsers);
        setFilteredUsers(invitedUsers);
      }

      setloading(false);
    })();
  }, []);

  return (
    <div className="welcome page main page-padding">
      <Snack open={snackbarOpen} message={snackbarMessage} onClose={handleSnackbarClose}></Snack>
      <Box
        sx={{
          boxShadow: 2,
        }}
      >
        <Backdrop
          sx={{ color: '#6b32a8', zIndex: (theme) => theme.zIndex.drawer + 1 }}
          open={loading}
        >
          <CircularProgress color="inherit" />
        </Backdrop>
        <Dialog open={searchOpen} onClose={handleSearchClose} maxWidth="xl">
          <Alert onClose={handleSearchClose} severity="info" sx={{ width: '100%' }}>
            {configuration.UserListSearchInfo}
          </Alert>
        </Dialog>
        <Dialog open={alertOpen} onClose={handleAlertClose} maxWidth="xl">
          <Alert onClose={handleAlertClose} severity="error" sx={{ width: '100%' }}>
            {messages.UserList.MissingADUser}
          </Alert>
        </Dialog>

        <DeleteDialog
          open={deleteAlertOpen}
          title={'Remove user'}
          message={getDeleteMessage}
          groupsString={selectedUser.groupsString}
          onClose={handleDeleteNo}
          onYes={handleDeleteYes}
          onNo={handleDeleteNo}
        ></DeleteDialog>
        <DeleteDialog
          open={deleteMembershipAlertOpen}
          title={'Remove user membership'}
          message={getDeleteMembershipMessage}
          groupsString={selectedUser.groupsString}
          onClose={handleDeleteMembershipNo}
          onYes={handleDeleteMembershipYes}
          onNo={handleDeleteMembershipNo}
        ></DeleteDialog>
        <div className="list-bar">
          <div className="add-bar">
            <Button
              variant="contained"
              color="secondary"
              size="small"
              style={{ marginLeft: 16 }}
              endIcon={<GroupAddIcon />}
              onClick={async () => {
                setAddFormVisible(true);
              }}
            >
              Invite user
            </Button>
            <Button
              variant="contained"
              color="secondary"
              size="small"
              style={{ marginLeft: 16 }}
              endIcon={<RefreshIcon />}
              onClick={async () => {
                setloading(true);
                let invitedUsers = await getInvitedUsers(userInfo);
                if (invitedUsers) {
                  setUsers(invitedUsers);
                  setFilteredUsers(invitedUsers);
                }
                setFilterValue('');
                setloading(false);
              }}
            >
              {' '}
              Reload
            </Button>
          </div>
          <div className="search-bar">
            <TextField
              id="search"
              label="Search"
              variant="standard"
              className="search-box"
              value={filterValue || ''}
              InputProps={{
                endAdornment: (
                  <IconButton
                    sx={{ visibility: filterValue ? 'visible' : 'hidden' }}
                    onClick={() => {
                      setFilterValue('');
                      setFilteredUsers(users);
                    }}
                  >
                    <ClearIcon />
                  </IconButton>
                ),
              }}
              onChange={(event) => {
                const { value } = event.target;
                onFilterValueChanged(value);
              }}
            />
            <IconButton
              aria-label="close"
              onClick={handleSearchDialog}
              sx={{
                right: 8,
                top: 8,
                color: (theme) => theme.palette.grey[500],
              }}
            >
              <InfoIcon />
            </IconButton>
          </div>
        </div>
        <div className="user-list">
          <DataGrid
            rows={filteredUsers}
            columns={columns}
            pageSize={100}
            rowsPerPageOptions={[100]}
            hideFooterSelectedRowCount={true}
            initialState={{
              sorting: {
                sortModel: [
                  {
                    field: 'Title',
                    sort: 'asc',
                  },
                ],
              },
            }}
            getRowHeight={() => {
              return 36;
            }}
          />
        </div>
        <Dialog open={formVisible} onClose={handleClose} maxWidth="xl">
          <DialogTitle>
            <IconButton
              aria-label="close"
              onClick={handleClose}
              sx={{
                position: 'absolute',
                right: 8,
                top: 8,
                color: (theme) => theme.palette.grey[500],
              }}
            >
              <CloseIcon />
            </IconButton>
            User details
          </DialogTitle>
          <div className="page-padding">
            <UserEdit
              user={selectedUser}
              refreshRow={refreshRow}
              newYN={false}
              userInfo={userInfo}
            ></UserEdit>
          </div>
        </Dialog>
        <Dialog open={addFormVisible} onClose={handleAddClose} maxWidth="xl">
          <DialogTitle>
            <IconButton
              aria-label="close"
              onClick={handleAddClose}
              sx={{
                position: 'absolute',
                right: 8,
                top: 8,
                color: (theme) => theme.palette.grey[500],
              }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <div className="page-padding">
            <UserInvite userInfo={userInfo} refreshList={refreshList}>
              {' '}
            </UserInvite>
          </div>
        </Dialog>
      </Box>
    </div>
  );
}
