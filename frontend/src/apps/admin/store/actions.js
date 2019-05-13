import { action } from "utils/redux";

import {
  cancelSubscription,
  connectDevice,
  disconnectDevice,
  getCalendars,
  getConnectedDevices,
  getUserDetails,
  setOptionsForDevice,
  setSubscriptionPlan
} from "services/api";

import {
  canConnectAnotherDeviceSelector,
  currentSubscriptionPlanSelector,
  editDeviceDataSelector,
  newDeviceDataSelector,
  removedDeviceIdSelector,
  subscriptionUpdateUrlSelector
} from "./selectors";
import { isCheckoutOverlayOpenSelector, subscriptionPassthroughSelector } from "apps/admin/store/selectors";
import { wait } from "utils/time";

export const adminActions = {
  $setDevices: action(devices => ({ devices })),
  $setCalendars: action(calendars => ({ calendars })),
  $setUserDetails: action(user => ({ user })),
  $setUserProperty: action((propertyId, value) => ({ propertyId, value })),
  initialFetch: () => async dispatch => {
    const [calendars, devices, user] = await Promise.all([
      getCalendars(),
      getConnectedDevices(),
      getUserDetails()
    ]);

    if (process.env.REACT_APP_LOGROCKET_ID) {
      const LogRocket = require("logrocket");
      LogRocket.init(process.env.REACT_APP_LOGROCKET_ID);
      LogRocket.identify(user.subscriptionPassthrough, { name: user.displayName });
    }

    dispatch(adminActions.$setCalendars(calendars));
    dispatch(adminActions.$setUserDetails(user));
    dispatch(adminActions.$setDevices(devices));
  }
};

export const connectDeviceWizardActions = {
  $show: action(),
  show: () => async (dispatch, getState) => {
    if (canConnectAnotherDeviceSelector(getState())) {
      dispatch(connectDeviceWizardActions.$show());
    } else {
      dispatch(monetizationActions.openPlanDialog());
    }
  },
  hide: action(),

  $setSubmitButton: action(submitButton => ({ submitButton })),
  submit: (submitButton, openEditDialog = false) => async (dispatch, getState) => {
    dispatch(connectDeviceWizardActions.$setSubmitButton(submitButton));

    const { deviceId, deviceType, calendarId, language, clockType } = newDeviceDataSelector(getState());

    await setOptionsForDevice(deviceId, deviceType, calendarId, "", language, 0, 5, true, true, false, clockType);

    const allDevices = await getConnectedDevices();
    dispatch(adminActions.$setDevices(allDevices));
    dispatch(connectDeviceWizardActions.hide());

    if (openEditDialog) {
      dispatch(editDeviceDialogActions.show(allDevices.find(x => x.id === deviceId)));
    }

    dispatch(adminActions.$setUserDetails(await getUserDetails()));
  },
  firstStep: {
    setConnectionCode: action(connectionCode => ({ connectionCode })),
    $startSubmitting: action(),
    $submitSuccess: action(deviceId => ({ deviceId })),
    $submitError: action(errorMessage => ({ errorMessage })),
    submit: () => async (dispatch, getState) => {
      dispatch(connectDeviceWizardActions.firstStep.$startSubmitting());

      try {
        const { connectionCode } = newDeviceDataSelector(getState());
        const device = await connectDevice(connectionCode);

        dispatch(connectDeviceWizardActions.firstStep.$submitSuccess(device.id));
      } catch (error) {
        const isInvalidConnectionCode = error.response && error.response.status === 404;
        const errorMessage = isInvalidConnectionCode ? "Invalid connection code" : "Unknown error. Please try again later";

        dispatch(connectDeviceWizardActions.firstStep.$submitError(errorMessage));
      }
    }
  },
  secondStep: {
    setDeviceType: action(deviceType => ({ deviceType })),
    nextStep: action()
  },
  thirdStep: {
    setCalendarId: action(calendarId => ({ calendarId })),
    setLanguage: action(language => ({ language })),
    setClockType: action(clockType => ({ clockType })),
    setShowAvailableRooms: action(showAvailableRooms => ({ showAvailableRooms })),
    previousStep: action(),
    submit: () => async dispatch => {
      dispatch(connectDeviceWizardActions.submit(false));
    }
  }
};

export const editDeviceDialogActions = {
  show: action(device => ({ device })),
  hide: action(),
  setDeviceType: action(deviceType => ({ deviceType })),
  setCalendarId: action(calendarId => ({ calendarId })),
  setLocation: action(location => ({ location })),
  setLanguage: action(language => ({ language })),
  setClockType: action(clockType => ({ clockType })),
  setMinutesForCheckIn: action(minutesForCheckIn => ({ minutesForCheckIn })),
  setMinutesForStartEarly: action(minutesForStartEarly => ({ minutesForStartEarly })),
  setShowAvailableRooms: action(showAvailableRooms => ({ showAvailableRooms })),
  setShowTentativeMeetings: action(showTentativeMeetings => ({ showTentativeMeetings })),
  setReadOnlyDevice: action(isReadOnlyDevice => ({ isReadOnlyDevice })),
  $startSubmitting: action(),
  submit: () => async (dispatch, getState) => {
    const { deviceId, deviceType, calendarId, location, language, minutesForCheckIn, minutesForStartEarly, showAvailableRooms, showTentativeMeetings, isReadOnlyDevice, clockType } = editDeviceDataSelector(getState());

    dispatch(editDeviceDialogActions.$startSubmitting());
    await setOptionsForDevice(deviceId, deviceType, calendarId, location, language, minutesForCheckIn, minutesForStartEarly, showAvailableRooms, showTentativeMeetings, isReadOnlyDevice, clockType);

    dispatch(adminActions.$setDevices(await getConnectedDevices()));
    dispatch(editDeviceDialogActions.hide());
  }
};

export const removeDeviceDialogActions = {
  show: action(device => ({ deviceId: device.id })),
  hide: action(),
  submit: () => async (dispatch, getState) => {
    await disconnectDevice(removedDeviceIdSelector(getState()));

    dispatch(adminActions.$setDevices(await getConnectedDevices()));
    dispatch(removeDeviceDialogActions.hide());
  }
};

export const monetizationActions = {
  init: () => () => {
    if (window.Paddle) {
      window.Paddle.Setup({ vendor: 39570 });
    }
  },

  $setIsCheckoutOverlayOpen: action(isCheckoutOverlayOpen => ({ isCheckoutOverlayOpen })),
  $toggleOverlay: isVisible => (dispatch) => {
    document.body.style.overflow = isVisible ? "hidden" : "auto";
    dispatch(monetizationActions.$setIsCheckoutOverlayOpen(isVisible));
  },

  openCheckoutOverlay: productId => (dispatch, getState) => {
    if (isCheckoutOverlayOpenSelector(getState())) {
      return;
    }

    const currentSubscriptionPlan = currentSubscriptionPlanSelector(getState());

    dispatch(monetizationActions.$toggleOverlay(true));

    window.Paddle.Checkout.open({
      product: productId,
      locale: "en",
      passthrough: subscriptionPassthroughSelector(getState()),
      closeCallback: () => dispatch(monetizationActions.$toggleOverlay(false)),
      successCallback: () => {
        dispatch(monetizationActions.$toggleOverlay(false));
        dispatch(monetizationActions.$waitUntilSubscriptionPlanIdChanges(currentSubscriptionPlan));
      }
    });
  },

  openUpdateSubscriptionOverlay: () => (dispatch, getState) => {
    dispatch(monetizationActions.$toggleOverlay(true));

    const hideOverlay = () => dispatch(monetizationActions.$toggleOverlay(false));

    window.Paddle.Checkout.open({
      locale: "en",
      override: subscriptionUpdateUrlSelector(getState()),
      closeCallback: hideOverlay,
      successCallback: hideOverlay
    });
  },

  openPlanDialog: action(),
  closePlanDialog: action(),

  openCancelSubscriptionDialog: action(),
  closeCancelSubscriptionDialog: action(),

  confirmCancelSubscription: () => async (dispatch, getState) => {
    try {
      const currentSubscriptionPlan = currentSubscriptionPlanSelector(getState());

      await cancelSubscription();

      dispatch(monetizationActions.closeCancelSubscriptionDialog());
      dispatch(monetizationActions.$waitUntilSubscriptionPlanIdChanges(currentSubscriptionPlan));
    } catch (error) {
      alert("Unable to cancel subscription. Please contact Roombelt support.");
    }
  },

  selectSubscriptionPlan: subscriptionPlanId => async (dispatch, getState) => {
    const currentSubscriptionPlan = currentSubscriptionPlanSelector(getState());

    if (!currentSubscriptionPlan) {
      dispatch(monetizationActions.openCheckoutOverlay(subscriptionPlanId));
    } else {
      try {
        await setSubscriptionPlan(subscriptionPlanId);

        dispatch(monetizationActions.$waitUntilSubscriptionPlanIdChanges(currentSubscriptionPlan));
      } catch (error) {
        alert("Unable to change subscription plan. Please contact Roombelt support.");
      }
    }
  },

  $toggleIsUpdatingSubscription: action((isUpdatingSubscription) => ({ isUpdatingSubscription })),
  $waitUntilSubscriptionPlanIdChanges: (startingSubscriptionPlan) => async (dispatch, getState) => {
    dispatch(monetizationActions.$toggleIsUpdatingSubscription(true));

    while (startingSubscriptionPlan === currentSubscriptionPlanSelector(getState())) {
      await wait(2000);
      const user = await getUserDetails();
      dispatch(adminActions.$setUserDetails(user));
    }

    dispatch(monetizationActions.$toggleIsUpdatingSubscription(false));
  }
};