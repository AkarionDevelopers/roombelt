import React from "react";

import { Modal } from "theme";
import { connect } from "react-redux";

import Wizard from "./Wizard";
import WizardHeader from "./WizardHeader";
import WizardFooter from "./WizardFooter";

import step1 from "./Step1";
import step2 from "./Step2";
import step3 from "./Step3";

const getStepStyle = (currentStepIndex, index) => {
  if (currentStepIndex === -1 && index === 0) return { transform: "translateX(0)" };

  const transition = "transform 0.5s ease";

  if (index < currentStepIndex) return { transform: "translateX(-100%)", transition };
  if (index > currentStepIndex) return { transform: "translateX(100%)", transition };

  return { transform: `translateX(0)`, transition };
};


const NewDeviceWizard = ({ currentStep }) => (
  <Modal footer={null} header={null} visible={currentStep !== null} compact wide>
    <Wizard
      steps={[step1, step2, step3]}
      header={WizardHeader}
      footer={WizardFooter}
      getStepStyle={getStepStyle}
      currentStepKey={currentStep}
    />
  </Modal>
);

const mapStateToProps = state => ({ currentStep: state.connectDeviceWizard.currentStep });

export default connect(mapStateToProps)(NewDeviceWizard);
