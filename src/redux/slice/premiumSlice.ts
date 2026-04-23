import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { callGetPremiumStatus } from '@/config/api';
import { IPremiumStatus } from '@/types/backend';

const getDerivedIsPremium = (payload: IPremiumStatus | any): boolean => {
    return payload?.premium ?? payload?.isPremium ?? false;
};

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
            state.isPremium = getDerivedIsPremium(action.payload);
            state.startAt = action.payload.startAt ?? null;
            state.endAt = action.payload.endAt ?? null;
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
                state.isPremium = getDerivedIsPremium(action.payload);
                state.startAt = action.payload.startAt ?? null;
                state.endAt = action.payload.endAt ?? null;
            }
        });
        builder.addCase(fetchPremiumStatus.rejected, (state) => {
            state.isLoading = false;
            // Giữ trạng thái hiện tại nếu lỗi mạng/BE, tránh UI tụt về “chưa Premium”
        });
    },
});

export const { setPremiumStatus, clearPremiumStatus } = premiumSlice.actions;
export default premiumSlice.reducer;
