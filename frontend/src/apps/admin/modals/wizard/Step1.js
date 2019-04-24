import React, { useEffect, useRef } from "react";
import { connect } from "react-redux";
import { Button, Input, LoaderButton, Text } from "theme";
import styled from "styled-components/macro";
import WizardStepLayout from "./WizardStepLayout";
import { useWizard } from "./Wizard";
import { connectDeviceWizardActions } from "apps/admin/store/actions";

const ErrorMessage = styled.p`
  font-size: 12px;
  height: 12px;
  line-height: 1;
  color: red;
  margin-top: 20px;
`;

const Content = ({ connectionCode, connectionError, onChangeConnectionCode, onSubmit, onCancel }) => {
  const { isCurrentStep, isTransitioning } = useWizard();
  const input = useRef();

  const onKeyDown = event => {
    if (event.key === "Enter") onSubmit();
    if (event.key === "Escape") onCancel();
  };

  useEffect(() => {
    if (connectionError) input.current.focus();
  }, [connectionError]);

  return (
    <WizardStepLayout img={require("./tablet.png")}>
      <Text large block>
        Connection code
      </Text>
      <Input
        onChange={event => onChangeConnectionCode(event.target.value)}
        onKeyDown={onKeyDown}
        value={connectionCode}
        error={connectionError}
        placeholder="e.g. 12345"
        autofocus={isCurrentStep && !isTransitioning}
        tabIndex={isCurrentStep ? 0 : -1}
        ref={input}
        style={{ marginTop: 15, marginBottom: 10 }}
      />
      <Button link
              tabIndex={isCurrentStep ? 0 : -1}
              href="https://go.roombelt.com/UgIpHu"
              target="_blank"
              style={{ padding: "5px 3px" }}>
        How to get this code?
      </Button>
      <ErrorMessage>{connectionError}</ErrorMessage>
    </WizardStepLayout>
  );
};

const Buttons = ({ onSubmit, onCancel, isSubmitting }) => (
  <>
    <LoaderButton primary onClick={onSubmit} isLoading={isSubmitting}>Next</LoaderButton>
    <Button onClick={onCancel}>Close</Button>
  </>
);

const mapStateToProps = state => ({
  connectionCode: state.connectDeviceWizard.connectionCode,
  connectionError: state.connectDeviceWizard.errorMessage,
  isSubmitting: !!state.connectDeviceWizard.submitButton
});

const mapDispatchToProps = dispatch => ({
  onChangeConnectionCode: connectionCode => dispatch(connectDeviceWizardActions.firstStep.setConnectionCode(connectionCode)),
  onCancel: () => dispatch(connectDeviceWizardActions.hide()),
  onSubmit: () => dispatch(connectDeviceWizardActions.firstStep.submit())
});

export default {
  key: "connection-code",
  name: "Connect",
  content: connect(mapStateToProps, mapDispatchToProps)(Content),
  buttons: connect(mapStateToProps, mapDispatchToProps)(Buttons)
};
