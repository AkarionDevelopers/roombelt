import React from "react";
import i18next from "i18next";
import { connect } from "react-redux";
import { Badge, Time } from "../../../../theme/index";
import { MeetingHeader, MeetingTitle, MeetingSubtitle } from "./Components";
import { currentMeetingSelector, nextMeetingSelector } from "../../store/selectors";
import { requireCheckInSelector } from "apps/device/store/selectors";

const CurrentMeeting = props => {
  const { requireCheckIn } = props;
  const { attendees, organizer, isCheckedIn, startTimestamp, endTimestamp, summary } = props.currentMeeting;

  const guestsCount = attendees.filter(u => u.displayName !== organizer.displayName).length;
  const fromStart = Math.floor((props.currentTimestamp - startTimestamp) / 1000 / 60);

  const getHeader = () => {
    if (isCheckedIn) return <Badge danger>{i18next.t("availability.occupied")}</Badge>;

    if (fromStart < 0) return <Badge info>{i18next.t("availability.starts.in", { count: -fromStart })}</Badge>;
    if (fromStart === 0) return <Badge info>{i18next.t("availability.starts.now")}</Badge>;
    if (requireCheckIn) return <Badge warning>{i18next.t("availability.starts.ago", { count: fromStart })}</Badge>;

    return <Badge danger>{i18next.t("availability.occupied")}</Badge>;
  };

  return (
    <React.Fragment>
      <MeetingHeader>{getHeader()}</MeetingHeader>
      <MeetingTitle>
        {summary || i18next.t("meeting.no-title")} <Time timestamp={startTimestamp}/> - <Time timestamp={endTimestamp}/>
      </MeetingTitle>
      <MeetingSubtitle>
        {organizer.displayName} {guestsCount > 0 && i18next.t("meeting.guests", { count: guestsCount })}
      </MeetingSubtitle>
    </React.Fragment>
  );
};

const mapStateToProps = state => ({
  currentTimestamp: state.timestamp,
  currentMeeting: currentMeetingSelector(state),
  nextMeeting: nextMeetingSelector(state),
  requireCheckIn: requireCheckInSelector(state)
});

export default connect(mapStateToProps)(CurrentMeeting);
