import { React, useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { editUser, resendInvitation } from '../data/provider';
import { getComboLists, getOrganisationList } from '../data/sharepointProvider';
import { getMappingsList } from '../data/configurationProvider';
import { validateName, validatePhone, validateMandatoryField } from '../data/validator';
import './UserEdit.scss';
import messages from '../data/messages.json';
import {
  Box,
  TextField,
  Autocomplete,
  Button,
  CircularProgress,
  Backdrop,
  Link,
  Checkbox,
  Tooltip,
  FormControlLabel,
  Alert,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import SaveIcon from '@mui/icons-material/Save';
import SendIcon from '@mui/icons-material/Send';

import { useAppInsightsContext, useTrackEvent } from '@microsoft/applicationinsights-react-js';
import SwitchChip from './SwitchChip';

export function UserEdit({
  userEntity,
  refreshRow,
  saveFunction,
  newYN,
  userInfo,
  configuration,
  checkPCP,
}) {
  const appInsights = useAppInsightsContext();

  const user = useRef(JSON.parse(JSON.stringify(userEntity))).current;

  const trackUser = useTrackEvent(appInsights, 'UserEdit', user);

  const [loading, setLoading] = useState(false),
    [dataFetching, setDataFetching] = useState(false),
    [success, setSuccess] = useState(false),
    [resendSuccess, setResendSuccess] = useState(false),
    [oldValues, setOldValues] = useState(JSON.parse(JSON.stringify(user))),
    [warningText, setWarningText] = useState(''),
    [pcps, setPcps] = useState(user.PCP || []),
    [eeaNominated, setEeaNominated] = useState(userEntity.EEANominated);

  const [errors, setErrors] = useState({});

  const [countries, setCountries] = useState([]),
    [memberships, setMemberships] = useState([]),
    [otherMemberships, setOtherMemberships] = useState([]),
    [genders, setGenders] = useState([]),
    [organisations, setOrganisations] = useState([]),
    [nfps, setNfps] = useState([]),
    [mappings, setMappings] = useState([]);

  const [unspecifiedOrg, setUnspecifiedOrg] = useState(false),
    [showEEANominted, setShowEEANominted] = useState(
      userInfo.isAdmin && userEntity.Membership?.length > 0,
    );

  const submit = async (e) => {
    const buttonId = e.nativeEvent.submitter.id;
    if (!loading) {
      e.preventDefault();
      let tempErrors = validateForm();
      setWarningText('');
      if (
        (!tempErrors ||
          !Object.values(tempErrors).some((v) => {
            return v;
          })) &&
        validateMembership()
      ) {
        setLoading(true);
        user.PCP = pcps;
        switch (buttonId) {
          case 'submitNew': {
            setSuccess(false);
            const addResult = await saveFunction.apply(null, [user]);
            if (!addResult.Success) {
              setWarningText(addResult.Message + '\n' + addResult.Error);
              setSuccess(false);
            }
            setSuccess(true);
            break;
          }
          case 'submitEdit': {
            setSuccess(false);
            const editResult = await editUser(user, mappings, oldValues);
            if (!editResult.Success) {
              setWarningText(editResult.Message + '\n' + editResult.Error);
              setSuccess(false);
            } else {
              setOldValues(JSON.parse(JSON.stringify(user)));
              userEntity = JSON.parse(JSON.stringify(user));
              refreshRow?.(user);
            }
            setSuccess(true);
            break;
          }
          case 'submitResend': {
            setResendSuccess(false);
            const resendResult = await resendInvitation(user, mappings, oldValues);
            if (!resendResult.Success) {
              setWarningText(resendResult.Message + '\n' + resendResult.Error);
              setResendSuccess(false);
            } else {
              setOldValues(JSON.parse(JSON.stringify(user)));
              userEntity = JSON.parse(JSON.stringify(user));
              refreshRow?.(user);
            }
            setResendSuccess(true);
            break;
          }
        }
        setPcps(user.PCP);
        setLoading(false);
        trackUser();
      }
    }
  },
    loadOrganisations = async () => {
      let loadedOrganisations = await getOrganisationList(user.Country);
      if (loadedOrganisations) {
        setOrganisations(loadedOrganisations);
      }

      const userOrganisation = loadedOrganisations.filter((o) => o.header === user.Organisation);
      userOrganisation[0] && setUnspecifiedOrg(userOrganisation[0].unspecified);
    },
    validateMembership = () => {
      const validMembership = user.Membership?.length > 0,
        validOtherMemberships = user.OtherMemberships?.length > 0;
      if (!validMembership && !validOtherMemberships && !user.NFP) {
        setWarningText(messages.UserEdit.MissingMembership);
        return false;
      } else {
        setWarningText('');
        return true;
      }
    },
    validateField = (e) => {
      let id = e.target.id,
        tempErrors = { ...errors };

      switch (id) {
        case 'gender':
          tempErrors.gender = validateName(user.Gender);
          break;
        case 'firstName':
          tempErrors.firstName = validateName(user.FirstName);
          break;
        case 'lastName':
          tempErrors.lastName = validateName(user.LastName);
          break;
        case 'phone':
          tempErrors.phone = validatePhone(user.Phone);
          break;
        case 'country':
          tempErrors.country = validateMandatoryField(user.Country);
          break;
        case 'organisation':
          tempErrors.organisation = validateMandatoryField(user.OrganisationLookupId);
          break;
        case 'suggestedOrganisation':
          tempErrors.suggestedOrganisation = validateMandatoryField(user.SuggestedOrganisation);
          break;
        case 'membership':
          tempErrors.membership = validateMandatoryField(user.Membership);
          break;
        default:
          console.log('Undefined field for validation');
          break;
      }

      setErrors({ ...tempErrors });
    },
    validateForm = () => {
      let tempErrors = { ...errors };
      tempErrors.gender = validateMandatoryField(user.Gender);
      tempErrors.firstName = validateName(user.FirstName);
      tempErrors.lastName = validateName(user.LastName);
      tempErrors.phone = validatePhone(user.Phone);
      tempErrors.country = validateMandatoryField(user.Country);
      tempErrors.organisation = validateMandatoryField(user.OrganisationLookupId);
      if (unspecifiedOrg) {
        tempErrors.suggestedOrganisation = validateMandatoryField(user.SuggestedOrganisation);
      }
      if (userInfo.isNFP) {
        tempErrors.membership = validateMandatoryField(user.Membership);
      }
      setErrors({ ...tempErrors });
      return tempErrors;
    },
    onPCPChange = (value, option) => {
      !pcps && setPcps([]);
      if (value) {
        pcps.push(option);
      } else {
        const index = pcps.indexOf(option);
        index >= 0 && pcps.splice(index, 1);
      }
      const result = checkPCP && checkPCP(user, option);
      if (result.length) {
        setWarningText(`${configuration.PcpValidationMessage} ${result.join(', ')}`);
      } else {
        setWarningText('');
      }
    };

  useEffect(() => {
    (async () => {
      setDataFetching(true);
      if (userInfo.isNFP && newYN) {
        user.Country = userInfo.country;
      }

      let items = await getComboLists();
      if (items) {
        setCountries(items.countries);
        setMemberships(items.memberships);
        setOtherMemberships(items.otherMemberships);
        setGenders(items.genders);
        setNfps(items.nfps);
      }
      loadOrganisations();

      let loadedMappings = await getMappingsList();
      loadedMappings && setMappings(loadedMappings);

      setDataFetching(false);
    })();
  }, [userInfo, user, newYN]);

  return (
    <div className="welcome page main edit-user">
      <div>
        <Backdrop
          sx={{ color: '#6b32a8', zIndex: (theme) => theme.zIndex.drawer + 1 }}
          open={dataFetching}
        >
          <CircularProgress color="inherit" />
        </Backdrop>
        <Box
          component="form"
          sx={{
            '& .MuiTextField-root': { m: 1, width: '50ch' },
          }}
          autoComplete="off"
          noValidate
          onSubmit={(e) => {
            submit(e);
          }}
        >
          <div className="row">
            <Autocomplete
              id="gender"
              className="small-width"
              value={user.Gender}
              options={genders}
              isOptionEqualToValue={(option, value) => option === value}
              onChange={(_e, value) => {
                user.Gender = value || '';
                user.GenderTitle = value || '';
              }}
              renderInput={(params) => (
                <TextField
                  required
                  {...params}
                  autoComplete="off"
                  className="small-width"
                  label="Salutation"
                  variant="outlined"
                  error={Boolean(errors?.gender)}
                  helperText={errors?.gender}
                  onBlur={validateField}
                />
              )}
            />
          </div>
          <div className="row">
            <TextField
              required
              autoComplete="off"
              className="control"
              id="firstName"
              label="First name"
              variant="outlined"
              value={user.FirstName}
              onChange={(e) => {
                user.FirstName = e.target.value;
                validateField(e);
              }}
              inputProps={{ style: { textTransform: 'capitalize' } }}
              error={Boolean(errors?.firstName)}
              helperText={errors?.firstName}
              onBlur={validateField}
            />
            <TextField
              required
              autoComplete="off"
              className="control"
              id="lastName"
              label="Last name"
              variant="outlined"
              value={user.LastName}
              onChange={(e) => {
                user.LastName = e.target.value;
                validateField(e);
              }}
              inputProps={{ style: { textTransform: 'capitalize' } }}
              error={Boolean(errors?.lastName)}
              helperText={errors?.lastName}
              onBlur={validateField}
            />
            <TextField
              autoComplete="off"
              className="control"
              id="jobTitle"
              label="Job title"
              variant="outlined"
              value={user.JobTitle}
              onChange={(e) => {
                user.JobTitle = e.target.value;
                validateField(e);
              }}
              inputProps={{ style: { textTransform: 'capitalize' } }}
            />
          </div>
          <div className="row">
            <Autocomplete
              ListboxProps={{ style: { maxHeight: '15rem' }, position: 'bottom-start' }}
              disabled={userInfo.isNFP || userInfo.isGuest}
              id="country"
              value={user.Country}
              options={countries}
              onChange={(e, value) => {
                user.Country = value;
                loadOrganisations();
                user.OrganisationLookupId = null;
                user.Organisation = '';
                validateField(e);
              }}
              renderInput={(params) => (
                <TextField
                  required
                  autoComplete="off"
                  {...params}
                  label="Country"
                  variant="outlined"
                  className="control"
                  error={Boolean(errors?.country)}
                  helperText={errors?.country}
                  onBlur={validateField}
                />
              )}
            />
            <TextField
              autoComplete="off"
              className="control"
              id="phone"
              label="Phone"
              variant="outlined"
              value={user.Phone}
              onChange={(e) => {
                user.Phone = e.target.value;
                validateField(e);
              }}
              inputProps={{ maxLength: 15 }}
              error={Boolean(errors?.phone)}
              helperText={errors?.phone}
              onBlur={validateField}
            />
            <TextField
              disabled
              required
              autoComplete="off"
              className="control"
              id="email"
              value={user.Email}
              label="Email"
              variant="outlined"
            />
          </div>
          <div className="row">
            <Autocomplete
              id="organisation"
              ListboxProps={{ style: { maxHeight: '15rem' }, position: 'bottom-start' }}
              value={{
                content: user.OrganisationLookupId,
                header: user.Organisation,
                unspecified: false,
              }}
              options={organisations}
              getOptionLabel={(option) =>
                Object.hasOwn(option, 'header') && option.header !== undefined ? option.header : ''
              }
              isOptionEqualToValue={(option, value) => option.content === value.content}
              onChange={(e, value) => {
                user.OrganisationLookupId = value ? value.content : undefined;
                user.Organisation = value ? value.header : undefined;
                setUnspecifiedOrg(value?.unspecified);
                if (!unspecifiedOrg) {
                  user.SuggestedOrganisation = null;
                }
                validateField(e);
              }}
              renderInput={(params) => (
                <TextField
                  className="control"
                  required
                  {...params}
                  label="Organisation"
                  variant="outlined"
                  error={Boolean(errors?.organisation)}
                  helperText={errors?.organisation}
                  onBlur={validateField}
                />
              )}
            />
            <TextField
              autoComplete="off"
              className="control"
              id="department"
              label="Department"
              variant="outlined"
              defaultValue={user.Department}
              onChange={(e) => {
                user.Department = e.target.value;
              }}
            />

            {userInfo.isNFP && (
              <Autocomplete
                ListboxProps={{ style: { maxHeight: '15rem' }, position: 'bottom-start' }}
                required
                multiple
                limitTags={1}
                id="membership"
                defaultValue={user.Membership}
                options={memberships}
                getOptionLabel={(option) => option || ''}
                onChange={(_e, value) => {
                  user.Membership = value;
                }}
                renderTags={(tagValue, getTagProps) => {
                  return tagValue.map((option, index) => (
                    <SwitchChip
                      {...getTagProps({ index })}
                      key={index}
                      chipValue={option}
                      switchChecked={pcps?.includes(option)}
                      onSwitchChange={onPCPChange}
                    />
                  ));
                }}
                renderInput={(params) => (
                  <TextField
                    className="control"
                    {...params}
                    required
                    autoComplete="off"
                    variant="outlined"
                    label="Membership of Eionet groups"
                    error={Boolean(errors?.membership)}
                    helperText={errors?.membership}
                    onBlur={validateField}
                  />
                )}
              />
            )}
            {userInfo.isAdmin && (
              <Autocomplete
                ListboxProps={{ style: { maxHeight: '15rem' }, position: 'bottom-start' }}
                required
                multiple
                limitTags={1}
                id="membership"
                defaultValue={user.Membership}
                options={memberships}
                getOptionLabel={(option) => option || ''}
                onChange={(_e, value) => {
                  user.Membership = value;
                  const eeaNominatedVisible = userInfo.isAdmin && value && value.length > 0;
                  setShowEEANominted(eeaNominatedVisible);
                  !eeaNominatedVisible && (user.EEANominated = false);
                  setEeaNominated(user.EEANominated);
                }}
                renderTags={(tagValue, getTagProps) => {
                  return tagValue.map((option, index) => (
                    <SwitchChip
                      {...getTagProps({ index })}
                      key={index}
                      chipValue={option}
                      switchChecked={pcps?.includes(option)}
                      onSwitchChange={onPCPChange}
                    />
                  ));
                }}
                renderInput={(params) => (
                  <TextField
                    className="control"
                    {...params}
                    autoComplete="off"
                    variant="outlined"
                    label="Membership of Eionet groups"
                  />
                )}
              />
            )}
          </div>
          <div className="row">
            {userInfo.isAdmin && (
              <Autocomplete
                ListboxProps={{ style: { maxHeight: '15rem' }, position: 'bottom-start' }}
                required
                multiple
                limitTags={1}
                id="otherMembership"
                defaultValue={user.OtherMemberships}
                options={otherMemberships}
                getOptionLabel={(option) => option || ''}
                onChange={(_e, value) => {
                  user.OtherMemberships = value;
                }}
                renderInput={(params) => (
                  <TextField
                    className="control"
                    {...params}
                    autoComplete="off"
                    variant="outlined"
                    label="Other memberships"
                  />
                )}
              />
            )}

            {userInfo.isAdmin && (
              <Autocomplete
                id="nfp"
                defaultValue={user.NFP}
                options={nfps}
                getOptionLabel={(option) => option}
                onChange={(_e, value) => {
                  user.NFP = value;
                }}
                renderInput={(params) => (
                  <TextField
                    className="control"
                    autoComplete="off"
                    {...params}
                    label="Membership of NFP group"
                    variant="outlined"
                  />
                )}
              />
            )}
            {showEEANominted && (
              <Tooltip title={configuration.EEANominatedTooltip}>
                <FormControlLabel
                  sx={{ marginLeft: '0.1rem' }}
                  control={
                    <Checkbox
                      checked={eeaNominated}
                      onChange={(e) => {
                        const value = e.target.checked;
                        setEeaNominated(value);
                        user.EEANominated = value;
                      }}
                      inputProps={{ 'aria-label': 'controlled' }}
                    ></Checkbox>
                  }
                  label="Nominated by EEA"
                ></FormControlLabel>
              </Tooltip>
            )}
          </div>
          <div className="row">
            {unspecifiedOrg && (
              <TextField
                required
                autoComplete="off"
                className="control"
                id="suggestedOrganisation"
                label="Suggest new organisation"
                variant="outlined"
                multiline
                rows={4}
                placeholder="Please enter Name and URL of the organisation to add. We will then add the Organisation to the list and update the User information."
                value={user.SuggestedOrganisation}
                onChange={(e) => {
                  user.SuggestedOrganisation = e.target.value;
                  validateField(e);
                }}
                error={Boolean(errors?.suggestedOrganisation)}
                helperText={errors?.suggestedOrganisation}
                onBlur={validateField}
              />
            )}
          </div>
          {warningText && (
            <div className="row">
              <Alert sx={{ fontWeight: 'bold' }} severity="error" className="note-label warning">
                {warningText}
              </Alert>
            </div>
          )}
          {!newYN && !user.SignedIn && user.LastInvitationDate && (
            <div className="row">
              <Alert sx={{ fontWeight: 'bold' }} severity="warning" className="note-label warning">
                User was last invited on{' '}
                {format(new Date(user.LastInvitationDate), 'dd-MMM-yyyy HH:mm')}. The user has not
                yet completed the signup.{' '}
              </Alert>
            </div>
          )}
          <div className="row">
            <Box sx={{ m: 1, position: 'relative' }}>
              {newYN && (
                <Button
                  id="submitNew"
                  type="submit"
                  variant="contained"
                  color="secondary"
                  size="medium"
                  className="button"
                  disabled={loading || (newYN && success) || warningText}
                  endIcon={success ? <CheckIcon /> : <SaveIcon />}
                >
                  {success ? 'Saved and invitation sent' : 'Save and send invitation'}
                </Button>
              )}
              {!newYN && (
                <Button
                  id="submitEdit"
                  type="submit"
                  variant="contained"
                  color="secondary"
                  size="medium"
                  className="button"
                  disabled={loading || warningText}
                  endIcon={success ? <CheckIcon /> : <SaveIcon />}
                >
                  Update user
                </Button>
              )}
              {!user.SignedIn && !newYN && (
                <Button
                  id="submitResend"
                  type="submit"
                  variant="contained"
                  color="secondary"
                  size="medium"
                  style={{ marginLeft: 16 }}
                  className="button"
                  disabled={loading || warningText}
                  endIcon={resendSuccess ? <CheckIcon /> : <SendIcon />}
                >
                  {' '}
                  Re-send invite email
                </Button>
              )}
              {loading && (
                <CircularProgress
                  size={24}
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    marginTop: '-12px',
                    marginLeft: '-12px',
                  }}
                />
              )}
            </Box>
          </div>

          {!newYN && (
            <div className="row">
              <Alert className="note-label warning" severity="info">
                Note: If the email or other details needs to be changed, kindly contact{' '}
                <Link className="mail-link" href="mailto:helpdesk@eea.europa.eu">
                  EEA Helpdesk
                </Link>
                .
              </Alert>
            </div>
          )}
        </Box>
      </div>
    </div>
  );
}
