import { combineReducers } from "redux";

import {
  adminActions,
  connectDeviceWizardActions,
  editDeviceDialogActions,
  monetizationActions,
  removeDeviceDialogActions
} from "apps/admin/store/actions";

const defaultUserState = {
  isLoaded: false,
  displayName: "",
  createdAt: undefined,
  avatarUrl: undefined,
  properties: {}
};

const user = (state = defaultUserState, action) => {
  switch (action.type) {
    case adminActions.$setUserDetails:
      return {
        isLoaded: true,
        provider: action.user.provider,
        createdAt: action.user.createdAt,
        displayName: action.user.displayName,
        avatarUrl: action.user.avatarUrl,
        properties: action.user.properties,
        subscriptionPassthrough: action.user.subscriptionPassthrough,
        subscriptionTrialEndTimestamp: action.user.subscriptionTrialEndTimestamp,
        subscriptionPlanId: action.user.subscriptionPlanId,
        subscriptionUpdateUrl: action.user.subscriptionUpdateUrl
      };
    case adminActions.$setUserProperty:
      return { ...state, properties: { ...state.properties, [action.propertyId]: action.value } };
    default:
      return state;
  }
};

const devices = (state = { isLoaded: false, data: [] }, action) => {
  switch (action.type) {
    case adminActions.$setDevices:
      return { isLoaded: true, data: action.devices };
    default:
      return state;
  }
};

const calendars = (state = {}, action) => {
  switch (action.type) {
    case adminActions.$setCalendars:
      return action.calendars.reduce((acc, calendar) => ({ ...acc, [calendar.id]: calendar }), {});
    default:
      return state;
  }
};

const editedDevice = (state = { data: null, isSaving: false }, action) => {
  switch (action.type) {
    case editDeviceDialogActions.show:
      return { data: JSON.parse(JSON.stringify(action.device)) };
    case editDeviceDialogActions.hide:
      return { data: null };
    case editDeviceDialogActions.$startSubmitting:
      return { data: state.data, isSaving: true };
    case editDeviceDialogActions.setDeviceType:
      return { data: { ...state.data, deviceType: action.deviceType } };
    case editDeviceDialogActions.setCalendarId:
      return { data: { ...state.data, calendarId: action.calendarId } };
    case editDeviceDialogActions.setLocation:
      return { data: { ...state.data, location: action.location } };
    case editDeviceDialogActions.setLanguage:
      return { data: { ...state.data, language: action.language } };
    case editDeviceDialogActions.setClockType:
      return { data: { ...state.data, clockType: action.clockType } };
    case editDeviceDialogActions.setMinutesForCheckIn:
      return { data: { ...state.data, minutesForCheckIn: action.minutesForCheckIn } };
    case editDeviceDialogActions.setMinutesForStartEarly:
      return { data: { ...state.data, minutesForStartEarly: action.minutesForStartEarly } };
    case editDeviceDialogActions.setShowAvailableRooms:
      return { data: { ...state.data, showAvailableRooms: action.showAvailableRooms } };
    case editDeviceDialogActions.setShowTentativeMeetings:
      return { data: { ...state.data, showTentativeMeetings: action.showTentativeMeetings } };
    case editDeviceDialogActions.setReadOnlyDevice:
      return { data: { ...state.data, isReadOnlyDevice: action.isReadOnlyDevice } };
    default:
      return state;
  }
};

const removedDevice = (state = null, action) => {
  switch (action.type) {
    case removeDeviceDialogActions.show:
      return action.deviceId;
    case removeDeviceDialogActions.hide:
      return null;
    default:
      return state;
  }
};

const defaultConnectDeviceWizardState = {
  currentStep: null,
  connectionCode: "",
  deviceId: null,
  deviceType: "calendar",
  calendarId: null,
  language: "en-US",
  clockType: 12,
  errorMessage: null,
  submitButton: null
};

const connectDeviceWizard = (state = defaultConnectDeviceWizardState, action) => {
  switch (action.type) {
    case connectDeviceWizardActions.$show:
      return { ...defaultConnectDeviceWizardState, currentStep: "connection-code" };
    case connectDeviceWizardActions.hide:
      return defaultConnectDeviceWizardState;
    case connectDeviceWizardActions.$setSubmitButton:
      return { ...state, submitButton: action.submitButton };
    case connectDeviceWizardActions.firstStep.setConnectionCode:
      return { ...state, connectionCode: action.connectionCode.replace(/\D/g, "") };
    case connectDeviceWizardActions.firstStep.$startSubmitting:
      return { ...state, errorMessage: null, submitButton: "first-step-submit" };
    case connectDeviceWizardActions.firstStep.$submitSuccess:
      return { ...state, currentStep: "device-type", submitButton: null, deviceId: action.deviceId };
    case connectDeviceWizardActions.firstStep.$submitError:
      return { ...state, errorMessage: action.errorMessage, submitButton: null };
    case connectDeviceWizardActions.secondStep.setDeviceType:
      return { ...state, deviceType: action.deviceType };
    case connectDeviceWizardActions.secondStep.nextStep:
      return { ...state, currentStep: "configuration" };
    case connectDeviceWizardActions.thirdStep.previousStep:
      return { ...state, currentStep: "device-type" };
    case connectDeviceWizardActions.thirdStep.setCalendarId:
      return { ...state, calendarId: action.calendarId };
    case connectDeviceWizardActions.thirdStep.setLanguage:
      return { ...state, language: action.language };
    case connectDeviceWizardActions.thirdStep.setClockType:
      return { ...state, clockType: action.clockType };
    case connectDeviceWizardActions.thirdStep.setShowAvailableRooms:
      return { ...state, showAvailableRooms: action.showAvailableRooms };
    default:
      return state;
  }
};

const monetization = (state = {
  currentPlan: null,
  isChoosePlanDialogOpenByUser: false,
  isCancelSubscriptionDialogOpen: false,
  isCheckoutOverlayOpen: false,
  isUpdatingSubscription: false
}, action) => {
  switch (action.type) {
    case monetizationActions.openPlanDialog:
      return { ...state, isChoosePlanDialogOpenByUser: true };
    case monetizationActions.closePlanDialog:
      return { ...state, isChoosePlanDialogOpenByUser: false };
    case monetizationActions.openCancelSubscriptionDialog:
      return { ...state, isCancelSubscriptionDialogOpen: true };
    case monetizationActions.closeCancelSubscriptionDialog:
      return { ...state, isCancelSubscriptionDialogOpen: false };
    case monetizationActions.$setIsCheckoutOverlayOpen:
      return { ...state, isCheckoutOverlayOpen: action.isCheckoutOverlayOpen };
    case monetizationActions.$toggleIsUpdatingSubscription:
      return { ...state, isUpdatingSubscription: action.isUpdatingSubscription };
    default:
      return state;
  }
};

export default combineReducers({
  user,
  devices,
  calendars,
  editedDevice,
  removedDevice,
  connectDeviceWizard,
  monetization
});
