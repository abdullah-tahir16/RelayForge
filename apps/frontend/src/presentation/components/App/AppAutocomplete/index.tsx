import Autocomplete, { AutocompleteProps } from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';

export interface AppAutocompleteOption {
  id: string;
  label: string;
}

export type AppAutocompleteProps = Omit<
  AutocompleteProps<AppAutocompleteOption, false, false, false>,
  'renderInput'
> & {
  label?: string;
  placeholder?: string;
};

const AppAutocomplete = ({
  label,
  placeholder,
  ...props
}: AppAutocompleteProps) => {
  return (
    <Autocomplete
      size="small"
      getOptionLabel={(option) => option.label}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          margin="dense"
        />
      )}
      {...props}
    />
  );
};

export default AppAutocomplete;
