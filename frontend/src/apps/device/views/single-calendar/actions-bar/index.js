import React from "react";
import { connect } from "react-redux";
import {
  currentMeetingSelector,
  isActionErrorSelector,
  isReadOnlyDeviceSelector,
  isRetryingActionSelector
} from "apps/device/store/selectors";

import ActionError from "../../../components/ActionError";
import RoomAvailable from "./RoomAvailable";
import MeetingActions from "./MeetingActions";

const ActionsBar = ({ isReadOnlyDevice, isActionError, isRetryingAction, currentMeeting }) => {
  if (isReadOnlyDevice) return null;
  if (isActionError || isRetryingAction) return <ActionError/>;
  if (!currentMeeting) return <RoomAvailable/>;

  return !currentMeeting.isAllDayEvent && <MeetingActions/>;
};

const mapStateToProps = state => ({
  isReadOnlyDevice: isReadOnlyDeviceSelector(state),
  currentMeeting: currentMeetingSelector(state),
  isActionError: isActionErrorSelector(state),
  isRetryingAction: isRetryingActionSelector(state)
});

export default connect(mapStateToProps)(ActionsBar);
