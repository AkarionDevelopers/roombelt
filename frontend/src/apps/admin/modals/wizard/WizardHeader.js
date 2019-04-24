import React from "react";
import colors from "../../../../theme/colors";
import styled from "styled-components/macro";
import { useWizard } from "./Wizard";

const HeaderWrapper = styled.div`
  background: ${colors.primary};
  color: white;
  padding: 30px;
  font-weight: bold;
`;

const Steps = styled.div`
  font-size: 14px; 
  margin-top: 20px;
`;

const Step = styled.span`
  :before {
    content: '${props => props.index}';
    display: inline-block;
    box-sizing: border-box;
    
    width: 22px;
    height: 22px;
    line-height: 24px;
    border-radius: 50%;
    text-align: center;
    margin-right: 5px;
    
    background: ${props => (props.isActive ? "white" : colors.primary.hover)};
    color: ${props => (props.isActive ? colors.primary : "white")};
  }
  
  :not(:last-child):after {
    content: '';
    display: inline-block;
    border-top: 1px solid rgba(255, 255, 255, 0.4);
    vertical-align: middle;
    margin: 0 15px;
    width: 50px;
  }
`;

export default props => {
  const { steps, currentStepIndex } = useWizard();

  return (
    <HeaderWrapper style={props.style}>
      Connect device
      <Steps>
        {steps.map((step, i) => <Step key={i} index={i + 1} isActive={currentStepIndex >= i}>{step.name}</Step>)}
      </Steps>
    </HeaderWrapper>
  );
}
;
