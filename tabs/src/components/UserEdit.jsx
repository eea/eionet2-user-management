import { React, useState, useEffect } from 'react';
import { format } from 'date-fns';
import { editUser, resendInvitation } from '../data/provider';
import { getComboLists, getOrganisationList, getMappingsList } from '../data/sharepointProvider';
import { validateName, validatePhone, validateMandatoryField } from '../data/validator';
import './UserEdit.scss';
import messages from '../data/messages.json';
import {
  Box,
  TextField,
  Autocomplete,
  Button,
  FormLabel,
  CircularProgress,
  Backdrop,
  Link,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import SaveIcon from '@mui/icons-material/Save';
import SendIcon from '@mui/icons-material/Send';
import WarningIcon from '@mui/icons-material/Warning';

export function UserEdit({ user, refreshRow, saveFunction, newYN, userInfo }) {
  const [loading, setLoading] = useState(false),
    [dataFetching, setDataFetching] = useState(false),
    [success, setSuccess] = useState(false),
    [resendSuccess, setResendSuccess] = useState(false),
    [oldValues, setOldValues] = useState(JSON.parse(JSON.stringify(user))),
    [warningText, setWarningText] = useState('');

  const [errors, setErrors] = useState({});

  const [countries, setCountries] = useState([]),
    [memberships, setMemberships] = useState([]),
    [otherMemberships, setOtherMemberships] = useState([]),
    [genders, setGenders] = useState([]),
    [organisations, setOrganisations] = useState([]),
    [nfps, setNfps] = useState([]),
    [mappings, setMappings] = useState([]);

  const [unspecifiedOrg, setUnspecifiedOrg] = useState(false);

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
          switch (buttonId) {
            case 'submitNew': {
              setSuccess(false);
              const addResult = await saveFunction();
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
                (await refreshRow) && refreshRow(user);
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
                (await refreshRow) && refreshRow(user);
              }
              setResendSuccess(true);
              break;
            }
          }

          setLoading(false);
        }
      }
    },
    loadOrganisations = async () => {
      let organisations = await getOrganisationList(user.Country);
      if (organisations) {
        setOrganisations(organisations);
      }

      const userOrganisation = organisations.filter((o) => o.header === user.Organisation);
      userOrganisation[0] && setUnspecifiedOrg(userOrganisation[0].unspecified);
    },
    validateMembership = () => {
      const validMembership = user.Membership && user.Membership.length > 0,
        validOtherMemberships = user.OtherMemberships && user.OtherMemberships.length > 0;
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

      let mappings = await getMappingsList();
      if (mappings) {
        setMappings(mappings);
      }

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
              disablePortal
              id="combo-box-gender"
              className="small-width"
              defaultValue={user.Gender}
              options={genders}
              isOptionEqualToValue={(option, value) => option === value}
              onChange={(e, value) => {
                user.Gender = value ? value : '';
                user.GenderTitle = value ? value : '';
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  autoComplete="off"
                  className="small-width"
                  label="Salutation"
                  variant="standard"
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
              variant="standard"
              defaultValue={user.FirstName}
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
              variant="standard"
              defaultValue={user.LastName}
              onChange={(e) => {
                user.LastName = e.target.value;
                validateField(e);
              }}
              inputProps={{ style: { textTransform: 'capitalize' } }}
              error={Boolean(errors?.lastName)}
              helperText={errors?.lastName}
              onBlur={validateField}
            />
            <Autocomplete
              disablePortal
              disabled={userInfo.isNFP || userInfo.isGuest}
              id="country"
              defaultValue={user.Country}
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
                  variant="standard"
                  className="control"
                  error={Boolean(errors?.country)}
                  helperText={errors?.country}
                  onBlur={validateField}
                />
              )}
            />
          </div>
          <div className="row">
            <TextField
              autoComplete="off"
              className="control"
              id="phone"
              label="Phone"
              variant="standard"
              defaultValue={user.Phone}
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
              defaultValue={user.Email}
              label="Email"
              variant="standard"
            />

            <Autocomplete
              disablePortal
              id="organisation"
              defaultValue={{
                content: user.OrganisationLookupId,
                header: user.Organisation,
                unspecified: false,
              }}
              options={organisations}
              getOptionLabel={(option) =>
                Object.prototype.hasOwnProperty.call(option, 'header') ? option.header : option
              }
              isOptionEqualToValue={(option, value) => option.content === value.content}
              onChange={(e, value) => {
                user.OrganisationLookupId = value ? value.content : undefined;
                user.Organisation = value ? value.header : undefined;
                setUnspecifiedOrg(value.unspecified);
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
                  variant="standard"
                  error={Boolean(errors?.organisation)}
                  helperText={errors?.organisation}
                  onBlur={validateField}
                />
              )}
            />
          </div>
          <div className="row">
            {userInfo.isNFP && (
              <Autocomplete
                required
                multiple
                limitTags={1}
                id="membership"
                defaultValue={user.Membership}
                options={memberships}
                getOptionLabel={(option) => option}
                onChange={(e, value) => {
                  user.Membership = value;
                }}
                renderInput={(params) => (
                  <TextField
                    className="control"
                    {...params}
                    required
                    autoComplete="off"
                    variant="standard"
                    label="Eionet groups"
                    error={Boolean(errors?.membership)}
                    helperText={errors?.membership}
                    onBlur={validateField}
                  />
                )}
              />
            )}
            {userInfo.isAdmin && (
              <Autocomplete
                required
                multiple
                limitTags={1}
                id="membership"
                defaultValue={user.Membership}
                options={memberships}
                getOptionLabel={(option) => option}
                onChange={(e, value) => {
                  user.Membership = value;
                }}
                renderInput={(params) => (
                  <TextField
                    className="control"
                    {...params}
                    autoComplete="off"
                    variant="standard"
                    label="Eionet groups"
                  />
                )}
              />
            )}
            {userInfo.isAdmin && (
              <Autocomplete
                required
                multiple
                limitTags={1}
                id="otherMembership"
                defaultValue={user.OtherMemberships}
                options={otherMemberships}
                getOptionLabel={(option) => option}
                onChange={(e, value) => {
                  user.OtherMemberships = value;
                }}
                renderInput={(params) => (
                  <TextField
                    className="control"
                    {...params}
                    autoComplete="off"
                    variant="standard"
                    label="Other memberships"
                  />
                )}
              />
            )}
            {userInfo.isAdmin && (
              <Autocomplete
                disablePortal
                id="nfp"
                defaultValue={user.NFP}
                options={nfps}
                onChange={(e, value) => {
                  user.NFP = value;
                }}
                renderInput={(params) => (
                  <TextField
                    className="control"
                    autoComplete="off"
                    {...params}
                    label="NFP"
                    variant="standard"
                  />
                )}
              />
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
                variant="standard"
                multiline
                rows={4}
                placeholder="Please enter Name and URL of the organisation to add. We will then add the Organisation to the list and update the User information."
                defaultValue={user.SuggestedOrganisation}
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
          {!newYN && !user.SignedIn && user.LastInvitationDate && (
            <div className="row">
              <WarningIcon sx={{ color: '#eed202', alignSelf: 'center' }}></WarningIcon>
              <FormLabel className="note-label" color="secondary" sx={{ fontWeight: 'bold' }}>
                User was last invited on{' '}
                {format(new Date(user.LastInvitationDate), 'dd-MMM-yyyy HH:mm')}. The user has not
                yet completed the signup.{' '}
              </FormLabel>
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
                  disabled={loading || (newYN && success)}
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
                  disabled={loading}
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
                  disabled={loading}
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
            {warningText && (
              <FormLabel className="note-label warning" error>
                {warningText}
              </FormLabel>
            )}
          </div>
          {!newYN && (
            <div className="row">
              <FormLabel className="note-label control">
                Note: If the email or other details needs to be changed, kindly contact{' '}
                <Link className="mail-link" href="mailto:helpdesk@eionet.europa.eu">
                  Eionet Helpdesk
                </Link>
                .
              </FormLabel>
            </div>
          )}
        </Box>
      </div>
    </div>
  );
}
