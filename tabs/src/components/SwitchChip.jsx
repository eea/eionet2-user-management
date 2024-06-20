import { React, useState } from 'react';
import { Chip, Switch, FormControlLabel, Box } from '@mui/material';

export default function SwitchChip(props) {
  const { switchChecked, onSwitchChange, chipValue, ...other } = props,
    [checked, setChecked] = useState(switchChecked);
  const handleChange = (event) => {
    onSwitchChange(event.target.checked, chipValue);
    setChecked(event.target.checked);
  };
  return (
    <Box>
      <Chip {...other} label={chipValue}></Chip>
      <FormControlLabel
        sx={{ paddingLeft: '0.5rem' }}
        control={
          <Switch
            value={switchChecked}
            checked={checked}
            onChange={handleChange}
            size="small"
            name="pcp"
          />
        }
        label="PCP"
      />
    </Box>
  );
}
