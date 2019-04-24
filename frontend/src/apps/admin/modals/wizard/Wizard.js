import React, { useState, useEffect, useContext } from "react";
import styled from "styled-components/macro";
import { ensureElement } from "utils/react";

const WizardLayout = styled.div`
  width: 100%;
  overflow: hidden;
`;

const WizardSteps = styled.div`
  display: grid;
`;

const WizardStep = styled.div`
  grid-area: 1/1;
`;

const wizardContext = React.createContext({
  steps: [],
  currentStep: null,
  currentStepIndex: null,
  isTransitioning: false
});

const stepContext = React.createContext(null);

export const useWizard = () => {
  const wizard = useContext(wizardContext);
  const stepKey = useContext(stepContext);

  return { ...wizard, isCurrentStep: wizard.currentStep && wizard.currentStep.key === stepKey };
};

export default ({ currentStepKey, steps, footer, header, getStepStyle }) => {
  const [visibleStepKey, setVisibleStepKey] = useState(null);
  const currentStepIndex = steps.findIndex(step => step.key === currentStepKey);
  const currentStep = steps[currentStepIndex];
  const isTransitioning = currentStepKey !== visibleStepKey;

  useEffect(() => {
    if (!visibleStepKey) {
      return setVisibleStepKey(currentStepKey);
    }

    const handle = setTimeout(() => setVisibleStepKey(currentStepKey), 500);
    return () => clearTimeout(handle);
  }, [currentStepKey]);

  return (
    <WizardLayout>
      <wizardContext.Provider value={{ steps, currentStep, currentStepKey, currentStepIndex, isTransitioning }}>
        {ensureElement(header)}

        <WizardSteps>
          {steps.map((step, i) => (
            <stepContext.Provider value={step.key} key={step.key || i}>
              <WizardStep style={getStepStyle(currentStepIndex, i, step)} children={ensureElement(step.content)}/>
            </stepContext.Provider>
          ))}
        </WizardSteps>

        {ensureElement(footer)}
      </wizardContext.Provider>
    </WizardLayout>
  );
};