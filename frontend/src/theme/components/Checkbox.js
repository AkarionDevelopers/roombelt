import React from "react";
import styled from "styled-components/macro";
import Text from './Text'

const CheckboxIcon = styled.span`
  position: relative;
  width: 1rem;
  height: 1rem;
  display: inline-block;
  margin-right: 0.3rem;
  vertical-align: -0.1rem;
  
  &:before {
    box-sizing: border-box;
    border: 1px solid rgba(0, 40, 100, 0.12);
    background-color: #fff;
    border-radius: 3px;
    position: absolute;
    top: 0;
    left: 0;
    display: block;
    width: 1rem;
    height: 1rem;
    content: "";
  }
  
  input:focus + &:before {
    box-shadow: 0 0 0 2px rgba(70, 127, 207, 0.25);
  }
  
  input[disabled] + &:before {
    background-color: #f8f9fa;
  }

  input:checked + &:before {
    border-color: #467fcf;
    background-color: #467fcf;
  }

  input[disabled]:checked + &:before {
    background-color: rgba(70, 127, 207, 0.5);
  }
  
  :after {
    box-sizing: border-box;
    background: no-repeat 50% / 50% 50%;
    background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3e%3cpath fill='%23fff' d='M6.564.75l-3.59 3.612-1.538-1.55L0 4.26 2.974 7.25 8 2.193z'/%3e%3c/svg%3e");
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 1rem;
    height: 1rem;
  }
`;

const Checkbox = ({ children, checked, disabled, onChange, style, className }) => (
  <label style={style} className={className}>
    <input type="checkbox"
           style={{ position: "absolute", opacity: 0 }}
           onChange={e => onChange(e.target.checked)}
           checked={checked || false}
           disabled={disabled}/>
    <CheckboxIcon/>
    <Text muted={disabled}>{children}</Text>
  </label>
);

export default Checkbox;
