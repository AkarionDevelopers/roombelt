import React from "react";
import styled from "styled-components/macro";
import IoIosHelpCircleOutline from "react-icons/lib/io/ios-help-outline";

const Wrapper = styled.div`
  font-size: 18px;
  margin-left: 3px;
  position: relative;
  display: inline-block;
`;

const Tooltip = styled.div`
  margin-top: 10px;
  position: absolute;
  width: 300px;
  left: 50%;
  transform: translateX(-50%);
  display: none;
  opacity: 0.9;
  background: #222;
  border: 1px solid black;
  border-radius: 2px;
  color: white;
  font-size: 12px;
  padding: 5px;
  z-index: 1;
  
  ${Wrapper}:hover & {
    display: block;
  }
  
  &::before, &::after {
    content: '';
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    top: -6px;
    width: 0; 
    height: 0; 
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-bottom: 6px solid black;
  }
  
  &::after {
    border-bottom-color: #222;
    top: -5px;
  }
`;

const InlineHelp = ({ children, style, className }) => (
  <Wrapper style={style} className={className}>
    <IoIosHelpCircleOutline/>
    <Tooltip>{children}</Tooltip>
  </Wrapper>
);

export default InlineHelp;
