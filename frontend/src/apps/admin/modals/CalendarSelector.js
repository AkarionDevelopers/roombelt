import React from "react";
import { Badge, Select } from "theme";
import { components } from "react-select";

const getValue = ({ deviceType, calendarId }) => {
  return `${deviceType}-${calendarId}`;
};

const SingleValue = props => {
  return (
    <components.SingleValue {...props}>
      {props.data.label} {props.data.isReadOnly && <Badge warning style={{ fontSize: 12 }}>Read only</Badge>}
    </components.SingleValue>
  );
};

const Option = props => {
  return (
    <components.Option {...props}>
      {props.data.label} {props.data.isReadOnly && <Badge warning style={{ fontSize: 12 }}>Read only</Badge>}
    </components.Option>
  );
};

export default React.forwardRef(({ value, ...props }, ref) => (
  <Select
    components={{ Option, SingleValue }}
    getOptionValue={getValue}
    value={value && getValue(value)}
    ref={ref}
    {...props}
  />
));

