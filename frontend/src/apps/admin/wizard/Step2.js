import React from "react";
import { connect } from "react-redux";
import WizardStepLayout from "./WizardStepLayout";
import { Text, Select, Button } from "theme";
import { connectDeviceWizard } from "apps/admin/store/actions";
import { useWizard } from "./Wizard";
import { PaidDisclaimer } from "apps/admin/Paid";

const Content = ({ deviceType, setDeviceType }) => {
  const { isCurrentStep, isTransitioning } = useWizard();
  const deviceTypes = [{ label: "Single calendar", value: "calendar" }, { label: "Dashboard 💰", value: "dashboard" }];

  return (
    <WizardStepLayout img={require("./calendar.png")}>
      <Text large block>
        Device type
      </Text>
      <Select
        instanceId="edit-device-choose-type"
        value={deviceType}
        options={deviceTypes}
        styles={{ container: base => ({ ...base, marginTop: 15, marginBottom: 10 }) }}
        onChange={option => setDeviceType(option.value)}
        menuPortalTarget={document.body}
        autofocus={isCurrentStep && !isTransitioning}
        tabIndex={isCurrentStep ? 0 : -1}
      />
      <Text muted small>
        <div>Pick whether device should show a single calendar or dashboard view.</div>
        <div style={{ marginTop: 10 }}>Dashboard shows status of all your conference rooms on one display.</div>
      </Text>
    </WizardStepLayout>
  );
};

const Buttons = ({ deviceType, onSubmit }) => (
  <>
    <Button primary disabled={deviceType === null} onClick={onSubmit}>Next</Button>
    <PaidDisclaimer/>
  </>
);


const mapStateToProps = state => ({
  deviceType: state.connectDeviceWizard.deviceType
});

const mapDispatchToProps = dispatch => ({
  setDeviceType: type => dispatch(connectDeviceWizard.secondStep.setDeviceType(type)),
  onSubmit: () => dispatch(connectDeviceWizard.secondStep.nextStep())
});

export default {
  key: "device-type",
  name: "Choose type",
  content: connect(mapStateToProps, mapDispatchToProps)(Content),
  buttons: connect(mapStateToProps, mapDispatchToProps)(Buttons)
};

