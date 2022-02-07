import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import set from 'lodash.set';
import { createSelector } from 'reselect';

import { wallet } from '../../../utils/wallet';
import createParameterSelector from '../createParameterSelector';
import handleAsyncThunkStatus from '../handleAsyncThunkStatus';
import initialErrorState from '../initialErrorState';

const SLICE_NAME = 'recoveryMethods';

const initialState = {
    byAccountId: {}
};

const initialAccountIdState = {
    items: [],
    status: {
        loading: false,
        error: initialErrorState
    }
};

const fetchRecoveryMethods = createAsyncThunk(
    `${SLICE_NAME}/fetchRecoveryMethods`,
    async ({ accountId }, thunkAPI) => {
        const { dispatch } = thunkAPI;

        const recoveryMethods = await wallet.getRecoveryMethods();

        const { actions: { setRecoveryMethods } } = recoveryMethodsSlice;
        dispatch(setRecoveryMethods({ recoveryMethods, accountId }));
    },
    {
        condition: ({ accountId }, thunkAPI) => {
            const { getState } = thunkAPI;
            if (selectRecoveryMethodsLoading(getState(), { accountId })) {
                return false;
            }
        }
    }
);

const recoveryMethodsSlice = createSlice({
        name: SLICE_NAME,
        initialState,
        reducers: {
            setRecoveryMethods(state, { payload }) {
                const { recoveryMethods, accountId } = payload;
                set(state, ['byAccountId', accountId, 'items'], recoveryMethods);
            }
        },
        extraReducers: ((builder) => {
            handleAsyncThunkStatus({
                asyncThunk: `${SLICE_NAME}/fetchRecoveryMethods`,
                buildStatusPath: ({ meta: { arg: { accountId }}}) => ['byAccountId', accountId, 'status'],
                builder
            });
        })
    }
);

export default recoveryMethodsSlice;
export const actions = {
    fetchRecoveryMethods,
    ...recoveryMethodsSlice.actions
};

const getAccountIdParam = createParameterSelector((params) => params.accountId);

// Top level selectors
const selectRecoveryMethodsSlice = (state) => state[SLICE_NAME] || {};

export const selectRecoveryMethodsObjectByAccountId = createSelector(
    [selectRecoveryMethodsSlice, getAccountIdParam],
    (recoveryMethods, accountId) => ({
        ...initialAccountIdState,
        ...recoveryMethods.byAccountId[accountId]
    })
);

export const selectRecoveryMethodsByAccountId = createSelector(
    [selectRecoveryMethodsObjectByAccountId],
    (recoveryMethods) => recoveryMethods.items
);

export const selectRecoveryMethodsLoading = createSelector(
    [selectRecoveryMethodsObjectByAccountId],
    (recoveryMethods) => recoveryMethods.status.loading
);
