import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { callGetPremiumStatus } from '@/config/api';
import { IPremiumStatus } from '@/types/backend';

export const fetchPremiumStatus = createAsyncThunk(
    'premium/fetchPremiumStatus',
    async (_, { rejectWithValue }) => {
        try {
            const response = await callGetPremiumStatus();
            return response.data;
        } catch (err: any) {
            return rejectWithValue(err?.response?.data ?? 'Lỗi khi lấy trạng thái Premium');
        }
    }
);

interface IPremiumState {
    isPremium: boolean;
    startAt: string | null;
    endAt: string | null;
    isLoading: boolean;
}

const initialState: IPremiumState = {
    isPremium: false,
    startAt: null,
    endAt: null,
    isLoading: false,
};

export const premiumSlice = createSlice({
    name: 'premium',
    initialState,
    reducers: {
        setPremiumStatus: (state, action: PayloadAction<IPremiumStatus>) => {
            state.isPremium = action.payload.isPremium;
            state.startAt = action.payload.startAt;
            state.endAt = action.payload.endAt;
        },
        clearPremiumStatus: (state) => {
            state.isPremium = false;
            state.startAt = null;
            state.endAt = null;
        },
    },
    extraReducers: (builder) => {
        builder.addCase(fetchPremiumStatus.pending, (state) => {
            state.isLoading = true;
        });
        builder.addCase(fetchPremiumStatus.fulfilled, (state, action) => {
            state.isLoading = false;
            if (action.payload) {
                state.isPremium = action.payload.isPremium;
                state.startAt = action.payload.startAt;
                state.endAt = action.payload.endAt;
            }
        });
        builder.addCase(fetchPremiumStatus.rejected, (state) => {
            state.isLoading = false;
            state.isPremium = false;
        });
    },
});

export const { setPremiumStatus, clearPremiumStatus } = premiumSlice.actions;
export default premiumSlice.reducer;
