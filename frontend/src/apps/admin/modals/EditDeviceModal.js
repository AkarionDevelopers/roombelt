import React, { useEffect, useRef } from "react";
import styled from "styled-components/macro";
import { connect } from "react-redux";

import { BlueModal, Button, Checkbox, InlineHelp, Input, LoaderButton, Select } from "theme";
import { translations } from "i18n";
import { editDeviceDialogActions } from "apps/admin/store/actions";
import CalendarSelector from "./CalendarSelector";
import { isGoogleAccountSelector } from "../store/selectors";

const FormField = styled.div`
  margin-bottom: 20px;
`;

const FormFieldLabel = styled.label`
  margin-bottom: 5px;
  display: block;
  color: #333;
`;

const LocaleWrapper = styled.div`
  display: flex;
  justify-content: stretch;
  width: 100%;

  > :first-child {
    flex: 1 1 0;
  }

  > :last-child {
    width: 200px;
    margin-left: 20px;
  }
`;

const CheckInWrapper = styled.div`
  display: flex;
  justify-content: stretch;
  width: 100%;
  
  > :first-child {
    flex: 1 1 0;
  }

  > :last-child {
    flex: 1 1 0;
    margin-left: 20px;
  }
`;

const InlineCheckbox = styled(Checkbox)`
  display: inline-block;
  margin-right: 25px;
  margin-top: 10px;
`;

const EditDeviceModal = ({ isVisible, isSaving, isGoogleAccount, device, calendars, onCancel, onSubmit, onChangeType, onChangeCalendar, onChangeLocation, onChangeLanguage, onChangeMinutesForCheckIn, onChangeMinutesForStartEarly, onChangeShowAvailableRooms, onChangeClockType, onChangeShowTentativeMeetings, onChangeReadOnlyDevice }) => {
  const select = useRef();
  useEffect(() => {
    if (isVisible) select.current.focus();
  }, [isVisible]);

  const footer = (
    <>
      <div style={{ flexGrow: 1 }}/>
      <Button disabled={isSaving} onClick={onCancel}>Cancel</Button>
      <LoaderButton primary onClick={onSubmit} isLoading={isSaving}>
        OK
      </LoaderButton>
    </>
  );

  const viewOptions = [
    { label: "Dashboard", deviceType: "dashboard", calendarId: null, isDisabled: false },
    {
      label: "Calendars",
      options: Object.values(calendars).map(calendar => ({
        label: calendar.summary,
        isReadOnly: !calendar.canModifyEvents,
        deviceType: "calendar",
        calendarId: calendar.id
      }))
    }
  ];

  const onOptionSelected = option => {
    onChangeCalendar(option && option.calendarId);
    onChangeType(option && option.deviceType);
  };

  const currentCalendar = device && calendars && calendars[device.calendarId];
  const isReadOnly = (device && device.isReadOnlyDevice) || (currentCalendar && !currentCalendar.canModifyEvents);

  return (
    <BlueModal
      title="Device settings"
      visible={isVisible}
      footer={footer}
      wide
    >
      <FormField>
        <FormFieldLabel>View</FormFieldLabel>
        <CalendarSelector
          instanceId="edit-device-choose-calendar"
          value={device}
          onChange={onOptionSelected}
          options={viewOptions}
          ref={select}
        />
        {isGoogleAccount && (
          <Button link href="https://go.roombelt.com/scMpEB" target="_blank"
                  style={{ fontSize: 12, margin: "5px 0 0 0", padding: "5px 3px" }}>
            Why is my calendar read-only or absent?
          </Button>
        )}
        <div>
          <InlineCheckbox checked={device && device.showTentativeMeetings} onChange={onChangeShowTentativeMeetings}>
            Show tentative meetings
            <InlineHelp>
              With this option enabled tentative meetings will be treated like accepted/confirmed meetings.
            </InlineHelp>
          </InlineCheckbox>
          {device && device.deviceType === "calendar" && (
            <InlineCheckbox checked={isReadOnly}
                            disabled={currentCalendar && !currentCalendar.canModifyEvents}
                            onChange={onChangeReadOnlyDevice}>
              Read-only display
              <InlineHelp>
                With this option enabled users won't be able to take any actions (like scheduling meetings) from this
                device.
              </InlineHelp>
            </InlineCheckbox>
          )}
          {device && device.deviceType === "dashboard" && (
            <InlineCheckbox checked={device && device.showAvailableRooms}
                            onChange={onChangeShowAvailableRooms}>
              Highlight available rooms
              <InlineHelp>Show available rooms on the top of the dashboard view.</InlineHelp>
            </InlineCheckbox>
          )}
        </div>
      </FormField>
      {device && device.deviceType === "dashboard" && <FormField>
        <FormFieldLabel>
          Location (optional)
          <InlineHelp>Name of the device shown in the administration panel.</InlineHelp>
        </FormFieldLabel>
        <Input style={{ fontSize: 16, fontFamily: "inherit" }}
               value={device && device.location}
               onChange={event => onChangeLocation(event.target.value)}
               placeholder="e.g. reception"/>
      </FormField>}
      <FormField>
        <FormFieldLabel>Locale</FormFieldLabel>
        <LocaleWrapper>
          <Select
            instanceId="edit-device-choose-language"
            value={(device && device.language) || "en-US"}
            options={Object.values(translations)}
            getOptionLabel={lang => lang.language}
            getOptionValue={lang => lang.key}
            onChange={translation => onChangeLanguage && onChangeLanguage(translation && translation.key)}
          />
          <Select
            instanceId="edit-device-choose-clock-type"
            value={(device && device.clockType) || 12}
            options={[{ label: "12h clock", value: 12 }, { label: "24h clock", value: 24 }]}
            onChange={option => onChangeClockType && onChangeClockType(option && option.value)}
          />
        </LocaleWrapper>
      </FormField>

      {device && device.deviceType === "calendar" && <FormField>
        <FormFieldLabel>
          Check-in
          <InlineHelp>
            If check-in is required and nobody checks-in to a meeting then this meeting is cancelled automatically.
            <br/><br/>
            This functionality is not available for <em>read-only</em> displays.
          </InlineHelp>
        </FormFieldLabel>
        <CheckInWrapper>
          <Select
            instanceId="edit-device-minutes-for-start-early"
            isDisabled={isReadOnly}
            value={device && isReadOnly ? 0 : device.minutesForStartEarly}
            options={[
              { label: "Not allowed before meeting", value: 0 },
              { label: "Allowed 5 minutes before meeting", value: 5 },
              { label: "Allowed 10 minutes before meeting", value: 10 },
              { label: "Allowed 15 minutes before meeting", value: 15 }
            ]}
            onChange={option => onChangeMinutesForStartEarly(option.value)}
          />
          <Select
            instanceId="edit-device-require-check-in"
            isDisabled={isReadOnly}
            value={device && isReadOnly ? 0 : device.minutesForCheckIn}
            options={[
              { label: "Not required", value: 0 },
              { label: "Required in the first 5 minutes", value: 5 },
              { label: "Required in the first 10 minutes", value: 10 },
              { label: "Required in the first 15 minutes", value: 15 }
            ]}
            onChange={option => onChangeMinutesForCheckIn(option.value)}
          />
        </CheckInWrapper>
      </FormField>}
    </BlueModal>
  );
};

const mapStateToProps = state => ({
  isVisible: !!state.editedDevice.data,
  isSaving: state.editedDevice.isSaving,
  device: state.editedDevice.data,
  calendars: state.calendars,
  isGoogleAccount: isGoogleAccountSelector(state)
});

const mapDispatchToProps = dispatch => ({
  onSubmit: () => dispatch(editDeviceDialogActions.submit()),
  onCancel: () => dispatch(editDeviceDialogActions.hide()),
  onChangeType: deviceType => dispatch(editDeviceDialogActions.setDeviceType(deviceType)),
  onChangeCalendar: calendarId => dispatch(editDeviceDialogActions.setCalendarId(calendarId)),
  onChangeLocation: location => dispatch(editDeviceDialogActions.setLocation(location)),
  onChangeLanguage: language => dispatch(editDeviceDialogActions.setLanguage(language)),
  onChangeClockType: clockType => dispatch(editDeviceDialogActions.setClockType(clockType)),
  onChangeMinutesForCheckIn: minutes => dispatch(editDeviceDialogActions.setMinutesForCheckIn(minutes)),
  onChangeMinutesForStartEarly: minutes => dispatch(editDeviceDialogActions.setMinutesForStartEarly(minutes)),
  onChangeShowAvailableRooms: value => dispatch(editDeviceDialogActions.setShowAvailableRooms(value)),
  onChangeShowTentativeMeetings: value => dispatch(editDeviceDialogActions.setShowTentativeMeetings(value)),
  onChangeReadOnlyDevice: value => dispatch(editDeviceDialogActions.setReadOnlyDevice(value))
});

export default connect(mapStateToProps, mapDispatchToProps)(EditDeviceModal);
