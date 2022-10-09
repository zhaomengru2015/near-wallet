import { createAsyncThunk, createSlice, current } from '@reduxjs/toolkit';
import set from 'lodash.set';
import unset from 'lodash.unset';
import { createSelector } from 'reselect';

import { HIDE_SIGN_IN_WITH_KEYSTONE_ENTER_ACCOUNT_ID_MODAL } from '../../../config';
import { showAlertToolkit } from '../../../utils/alerts';
import { setKeystoneHdPath } from '../../../utils/localStorage';
import { wallet } from '../../../utils/wallet';
import { showCustomAlert } from '../../actions/status';
import handleAsyncThunkStatus from '../../reducerStatus/handleAsyncThunkStatus';
import initialStatusState from '../../reducerStatus/initialState/initialStatusState';
import refreshAccountOwner from '../../sharedThunks/refreshAccountOwner';

const SLICE_NAME = 'keystone';

export const KEYSTONE_HD_PATH_PREFIX = '44\'/397\'/0\'/0\'/';

export const KEYSTONE_MODAL_STATUS = {
    CONFIRM_PUBLIC_KEY: 'confirm-public-key',
    CONFIRM_ACCOUNTS: 'confirm-accounts',
    ENTER_ACCOUNTID: 'enter-accountId',
    SUCCESS: 'success'
};

export const CONNECT_MODAL_TYPE = {
    CONNECT: 'connect',
    CONNECTION_ERROR: 'connection-error',
    DISCONNECTED: 'disconnected'
};

const initialState = {
    ...initialStatusState,
    modal: {},
    connection: {
        available: false,
        disconnected: false,
        modal: {},
        ...initialStatusState
    }
};

const handleShowConnectModal = createAsyncThunk(
    `${SLICE_NAME}/handleConnectKeystone`,
    async (_, { dispatch }) => {
        dispatch(keystoneSlice.actions.setKeystoneConnectionModalType({ type: CONNECT_MODAL_TYPE.CONNECT }));
    }
);

const handleConnectKeystone = createAsyncThunk(
    `${SLICE_NAME}/handleConnectKeystone`,
    async (_, { dispatch }) => {
        try {
            await keystoneManager.initialize(() => dispatch(handleDisconnectKeystone()));
            const { available } = keystoneManager;
            dispatch(keystoneSlice.actions.setKeystoneConnectionStatus({ available }));
            dispatch(showCustomAlert({
                success: true,
                messageCodeHeader: 'connectKeystone.keystoneConnected',
                messageCode: 'connectKeystone.youMayNow',
            }));
            dispatch(keystoneSlice.actions.setKeystoneConnectionModalType({ type: undefined }));
        } catch (error) {
            dispatch(keystoneSlice.actions.setKeystoneConnectionModalType({ type: CONNECT_MODAL_TYPE.CONNECTION_ERROR }));
            throw error;
        }
    },
    showAlertToolkit({ onlyError: true })
);

const handleDisconnectKeystone = createAsyncThunk(
    `${SLICE_NAME}/handleDisconnectKeystone`,
    async (_, { dispatch }) => {
        dispatch(keystoneSlice.actions.setKeystoneConnectionStatus({ available: false }));
        dispatch(keystoneSlice.actions.setKeystoneDisconnect({ disconnected: true }));
        dispatch(keystoneSlice.actions.setKeystoneConnectionModalType({ type: CONNECT_MODAL_TYPE.DISCONNECTED }));

        dispatch(showCustomAlert({
            success: false,
            messageCodeHeader: 'warning',
            messageCode: 'errors.keystone.disconnected',
        }));
    }
);

const getKeystoneAccountIds = createAsyncThunk(
    `${SLICE_NAME}/getKeystoneAccountIds`,
    async ({ path }) => await wallet.getKeystoneAccountIds({ path }),
    showAlertToolkit({ onlyError: true })
);

const addKeystoneAccountId = createAsyncThunk(
    `${SLICE_NAME}/addKeystoneAccountId`,
    async ({ accountId}) => await wallet.addKeystoneAccountId({ accountId }),
    showAlertToolkit()
);

const saveAndSelectKeystoneAccounts = createAsyncThunk(
    `${SLICE_NAME}/saveAndSelectKeystoneAccounts`,
    async ({ accounts}) => await wallet.saveAndSelectKeystoneAccounts({ accounts }),
    showAlertToolkit()
);

const signInWithKeystoneAddAndSaveAccounts = createAsyncThunk(
    `${SLICE_NAME}/signInWithKeystoneAddAndSaveAccounts`,
    async ({ path, accountIds }, { dispatch, getState }) => {
        for (let accountId of accountIds) {
            try {
                setKeystoneHdPath({ accountId, path });
                await dispatch(addKeystoneAccountId({ accountId })).unwrap();
                dispatch(keystoneSlice.actions.setKeystoneTxSigned({ status: false, accountId }));
            } catch (e) {
                console.warn('Error importing Keystone-based account', accountId, e);
                // NOTE: We still continue importing other accounts
            }
        }
        return dispatch(saveAndSelectKeystoneAccounts({ accounts: selectKeystoneSignInWithKeystone(getState()) }));
    }
);

const checkAndHideKeystoneModal = createAsyncThunk(
    `${SLICE_NAME}/checkAndHideKeystoneModal`,
    async (_, { dispatch, getState }) => {
        if (selectKeystoneModalShow(getState())) {
            dispatch(keystoneSlice.actions.hideKeystoneModal());
        }
    }
);

const signInWithKeystone = createAsyncThunk(
    `${SLICE_NAME}/signInWithKeystone`,
    async ({ path }, { dispatch, getState }) => {
        dispatch(keystoneSlice.actions.setKeystoneTxSigned({ status: true }));
        await dispatch(getKeystoneAccountIds({ path })).unwrap();

        const accountIds = Object.keys(selectKeystoneSignInWithKeystone(getState()));
        await dispatch(signInWithKeystoneAddAndSaveAccounts({ path, accountIds }));
    }
);

const keystoneSlice = createSlice({
    name: SLICE_NAME,
    initialState,
    reducers: {
        setKeystoneTxSigned(state, { payload, ready, error }) {
            const { signInWithKeystone } = current(state);

            set(state, ['txSigned'], payload.status);

            if (!payload.accountId) {
                return;
            }
            if (!Object.keys(signInWithKeystone || {}).length) {
                return;
            }
            if (signInWithKeystone[payload.accountId].status === 'confirm' && payload.status) {
                set(state, ['signInWithKeystone', payload.accountId, 'status'], 'pending');
            }
        },
        clearSignInWithKeystoneModalState(state, { payload, ready, error }) {
            unset(state, ['txSigned']);
            unset(state, ['signInWithKeystoneStatus']);
            unset(state, ['signInWithKeystone']);
        },
        showKeystoneModal(state, { payload, ready, error }) {
            const { signInWithKeystoneStatus } = current(state);

            unset(state, ['txSigned']);
            set(state, ['modal', 'show'], !signInWithKeystoneStatus && payload.show);
            set(state, ['modal', 'action'], payload.action);
            set(state, ['modal', 'textId'], 'keystoneSignTxModal.DEFAULT');
        },
        hideKeystoneModal(state, { payload, ready, error }) {
            set(state, ['modal'], {});
            unset(state, ['txSigned']);
        },
        setKeystoneConnectionStatus(state, { payload: { available } }) {
            set(state, ['connection', 'available'], available);
        },
        setKeystoneDisconnect(state, { payload: { disconnected } }) {
            set(state, ['connection', 'disconnected'], disconnected);
        },
        setKeystoneConnectionModalType(state, { payload: { type } }) {
            set(state, ['connection', 'modal', 'type'], type);
        }
    },
    extraReducers: ((builder) => {
        // getKeystoneAccountIds
        builder.addCase(getKeystoneAccountIds.pending, (state) => {
            set(state, ['signInWithKeystoneStatus'], KEYSTONE_MODAL_STATUS.CONFIRM_PUBLIC_KEY);
        });
        builder.addCase(getKeystoneAccountIds.fulfilled, (state, { payload }) => {
            unset(state, ['txSigned']);
            set(state, ['signInWithKeystoneStatus'], KEYSTONE_MODAL_STATUS.CONFIRM_ACCOUNTS);
            payload.forEach((accountId) =>
                set(state, ['signInWithKeystone', accountId, 'status'], 'waiting')
            );
        });
        builder.addCase(getKeystoneAccountIds.rejected, (state, { error }) => {
            const noAccounts = error.message === 'No accounts were found.' && !HIDE_SIGN_IN_WITH_KEYSTONE_ENTER_ACCOUNT_ID_MODAL;

            set(state, ['signInWithKeystoneStatus'], noAccounts ? KEYSTONE_MODAL_STATUS.ENTER_ACCOUNTID : undefined);
            unset(state, ['signInWithKeystone']);
            unset(state, ['txSigned']);
        });
        // addKeystoneAccountId
        builder.addCase(addKeystoneAccountId.pending, (state, { payload, meta: { arg: { accountId } } }) => {
            set(state, ['signInWithKeystoneStatus'], KEYSTONE_MODAL_STATUS.CONFIRM_ACCOUNTS);
            set(state, ['signInWithKeystone', accountId, 'status'], 'confirm');
        });
        builder.addCase(addKeystoneAccountId.fulfilled, (state, { payload, meta: { arg: { accountId } } }) => {
            set(state, ['signInWithKeystoneStatus'], KEYSTONE_MODAL_STATUS.CONFIRM_ACCOUNTS);
            set(state, ['signInWithKeystone', accountId, 'status'], 'success');
        });
        builder.addCase(addKeystoneAccountId.rejected, (state, { error, meta: { arg: { accountId } } }) => {
            set(state, ['signInWithKeystoneStatus'], KEYSTONE_MODAL_STATUS.CONFIRM_ACCOUNTS);

            const transportError = error?.name === 'TransportStatusError';
            set(state, ['signInWithKeystone', accountId, 'status'], transportError ? 'rejected' : 'error');
        });
        // refreshAccountOwner
        builder.addCase(refreshAccountOwner.fulfilled, (state, { payload }) => {
            set(state, ['hasKeystone'], payload.keystone.hasKeystone);
            set(state, ['keystoneKey'], payload.keystone.keystoneKey);
        });
        builder.addCase(handleConnectKeystone.rejected, (state) => {
            set(state, ['connection', 'available'], false);
        });
        // signInWithKeystone
        builder.addCase(signInWithKeystone.fulfilled, (state) => {
            set(state, ['signInWithKeystoneStatus'], KEYSTONE_MODAL_STATUS.SUCCESS);
        });
        // matcher to handle closing modal automatically
        builder.addMatcher(
            ({ type, ready, error }) => ready || error || type.endsWith('/rejected') || type.endsWith('/fulfilled'),
            (state, { type }) => {
                const { modal } = current(state);
                if (modal.show && type === modal.action) {
                    set(state, ['modal'], {});
                    unset(state, ['txSigned']);
                }
            }
        );
        handleAsyncThunkStatus({
            asyncThunk: signInWithKeystone,
            buildStatusPath: () => [],
            builder
        });
        handleAsyncThunkStatus({
            asyncThunk: handleConnectKeystone,
            buildStatusPath: () => ['connection'],
            builder
        });
    })
});

export default keystoneSlice;

export const actions = {
    handleShowConnectModal,
    handleConnectKeystone,
    signInWithKeystone,
    checkAndHideKeystoneModal,
    signInWithKeystoneAddAndSaveAccounts,
    ...keystoneSlice.actions
};
export const reducer = keystoneSlice.reducer;

// Top level selectors
export const selectKeystoneSlice = (state) => state[SLICE_NAME];

export const selectKeystoneTxSigned = createSelector(selectKeystoneSlice, (keystone) => keystone.txSigned);

export const selectKeystoneModal = createSelector(selectKeystoneSlice, (keystone) => keystone.modal || {});

export const selectKeystoneModalShow = createSelector(selectKeystoneModal, (modal) => modal.show || false);

export const selectKeystoneHasKeystone = createSelector(selectKeystoneSlice, (keystone) => keystone.hasKeystone);

export const selectKeystoneSignInWithKeystone = createSelector(selectKeystoneSlice, (keystone) => keystone.signInWithKeystone || {});

export const selectKeystoneSignInWithKeystoneStatus = createSelector(selectKeystoneSlice, (keystone) => keystone.signInWithKeystoneStatus);

const selectKeystoneConnection = createSelector(selectKeystoneSlice, (keystone) => keystone.connection);

export const selectKeystoneConnectionAvailable= createSelector(selectKeystoneConnection, (connection) => connection.available);

export const selectKeystoneConnectionModalType = createSelector(selectKeystoneConnection, (connection) => connection.modal.type);

export const selectKeystoneConnectionStatus = createSelector(selectKeystoneConnection, (connection) => connection.status);

export const selectKeystoneConnectionStatusLoading = createSelector(selectKeystoneConnectionStatus, (status) => status.loading);

export const selectKeystoneConnectionStatusError = createSelector(selectKeystoneConnectionStatus, (status) => status.error);
