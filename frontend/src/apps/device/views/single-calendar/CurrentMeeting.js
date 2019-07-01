import React from "react";
import i18next from "i18next";
import { connect } from "react-redux";
import { Time } from "theme/index";
import styled from "styled-components/macro";
import colors from "dark/colors";
import EventAvailable from "react-icons/lib/md/event-available";
import AccountBox from "react-icons/lib/md/account-box";
import {
  currentMeetingSelector,
  isAmPmClockSelector,
  minutesAvailableTillNextMeetingSelector,
  nextMeetingSelector
} from "apps/device/store/selectors";
import { getMeetingSummary, prettyFormatMinutes } from "services/formatting";

const Wrapper = styled.div`
  color: ${colors.foreground.gray};
  padding: 0.4rem 1.2rem;
`;

const Indent = styled.div`
  text-indent: -1.5rem;
  margin-left: 1.5rem;
  
  :after {
    display: block;
    content: '';
  }
`;

const CurrentMeeting = ({ currentMeeting, nextMeeting, minutesToNextMeeting, isAmPmClock }) => {
  const getTitle = () => {
    if (!currentMeeting && !nextMeeting) {
      return i18next.t("availability.available-all-day");
    }

    if (!currentMeeting && nextMeeting) {
      return i18next.t("availability.available-for", { time: prettyFormatMinutes(minutesToNextMeeting) });
    }

    return (
      <>
        {getMeetingSummary(currentMeeting)}
        {" "}
        {!currentMeeting.isAllDayEvent &&
        <span style={{ whitespace: "nowrap", display: "inline-block", textIndent: 0 }}>
          {<Time timestamp={currentMeeting.startTimestamp} ampm={isAmPmClock}/>}
          {" – "}
          {<Time timestamp={currentMeeting.endTimestamp} ampm={isAmPmClock}/>}
        </span>}
      </>
    );
  };

  const guests = currentMeeting && !currentMeeting.isPrivate && currentMeeting.attendees.map((u) => {
    console.log(u);
    return u.displayName;
  });
  console.log(currentMeeting);
  
  // filter(u => u.displayName !== currentMeeting.organizer.displayName);

  return (
    <Wrapper>
      <Indent>
        <EventAvailable style={{ color: colors.foreground.white, verticalAlign: "middle", width: "1.5rem" }}/>
        <span style={{ verticalAlign: "middle" }}>{getTitle()}</span>
      </Indent>
      {currentMeeting && !currentMeeting.isPrivate && <Indent>
        <AccountBox style={{ color: colors.foreground.white, verticalAlign: "middle", width: "1.5rem" }}/>
        <span style={{ verticalAlign: "middle" }}>
          {currentMeeting.organizer.displayName}
          {guests.length > 0 && guests.length <= 5 && (", " + guests.join(", "))}
          {guests.length > 0 && guests.length > 5 && (" " + i18next.t("meeting.guests", { count: guests.length }))}
        </span>
      </Indent>}
    </Wrapper>
  );
};

const mapStateToProps = state => ({
  currentMeeting: currentMeetingSelector(state),
  nextMeeting: nextMeetingSelector(state),
  minutesToNextMeeting: minutesAvailableTillNextMeetingSelector(state),
  isAmPmClock: isAmPmClockSelector(state)
});

export default connect(mapStateToProps)(CurrentMeeting);
