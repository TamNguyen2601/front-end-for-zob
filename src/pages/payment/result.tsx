import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Result, Space, Typography } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { callGetPremiumStatus } from '@/config/api';
import { setPremiumStatus } from '@/redux/slice/premiumSlice';

type PremiumSyncState =
    | { type: 'idle' }
    | { type: 'checking'; attempt: number; maxAttempts: number }
    | { type: 'active' }
    | { type: 'pending'; maxAttempts: number }
    | { type: 'error'; message: string };

const MAX_PREMIUM_SYNC_ATTEMPTS = 4;
const PREMIUM_SYNC_DELAY_MS = 2500;

const PaymentResultPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();

    const isAuthenticated = useAppSelector((state) => state.account.isAuthenticated);
    const premium = useAppSelector((state) => state.premium);

    const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const successParam = params.get('success');
    const code = params.get('code') ?? '';
    const txnRef = params.get('txnRef') ?? '';

    const urlSuccess = useMemo(() => {
        if (successParam !== null) return successParam === 'true';
        if (code) return code === '00';
        return false;
    }, [successParam, code]);

    const shouldSyncPremium = urlSuccess;
    const [premiumSync, setPremiumSync] = useState<PremiumSyncState>({ type: 'idle' });
    const cancelRef = useRef(false);

    useEffect(() => {
        cancelRef.current = false;
        return () => {
            cancelRef.current = true;
        };
    }, []);

    useEffect(() => {
        const run = async () => {
            if (!shouldSyncPremium) return;
            if (!isAuthenticated) return;

            for (let attempt = 1; attempt <= MAX_PREMIUM_SYNC_ATTEMPTS; attempt++) {
                if (cancelRef.current) return;
                setPremiumSync({
                    type: 'checking',
                    attempt,
                    maxAttempts: MAX_PREMIUM_SYNC_ATTEMPTS,
                });

                try {
                    const res = await callGetPremiumStatus();
                    const data = res?.data;

                    if (data) {
                        dispatch(setPremiumStatus(data));
                    }

                    if (data?.isPremium) {
                        setPremiumSync({ type: 'active' });
                        return;
                    }
                } catch {
                    // ignore and retry for a short period
                }

                if (attempt < MAX_PREMIUM_SYNC_ATTEMPTS) {
                    await new Promise((resolve) => setTimeout(resolve, PREMIUM_SYNC_DELAY_MS));
                }
            }

            setPremiumSync({ type: 'pending', maxAttempts: MAX_PREMIUM_SYNC_ATTEMPTS });
        };

        void run();
    }, [dispatch, isAuthenticated, shouldSyncPremium]);

    const title = urlSuccess ? 'Thanh toán thành công' : 'Thanh toán thất bại';

    const subTitle = urlSuccess
        ? `Mã giao dịch: ${txnRef || '(không có)'}${code ? ` · Mã kết quả: ${code}` : ''}`
        : `Mã kết quả: ${code || '(không có)'}${txnRef ? ` · Mã giao dịch: ${txnRef}` : ''}`;

    const extra = (
        <Space wrap>
            <Button type="primary" onClick={() => navigate('/')}
            >
                Về trang chủ
            </Button>
            {!urlSuccess && (
                <Button onClick={() => navigate('/?premium=1')}>
                    Mua lại
                </Button>
            )}
        </Space>
    );

    return (
        <div style={{ padding: 24, display: 'flex', justifyContent: 'center' }}>
            <div style={{ maxWidth: 720, width: '100%' }}>
                <Result
                    status={urlSuccess ? 'success' : 'error'}
                    title={title}
                    subTitle={subTitle}
                    extra={extra}
                />

                {urlSuccess && (
                    <div style={{ marginTop: 8 }}>
                        {!isAuthenticated ? (
                            <Typography.Paragraph type="secondary" style={{ textAlign: 'center' }}>
                                Bạn cần đăng nhập để hệ thống kiểm tra Premium.
                            </Typography.Paragraph>
                        ) : premium.isPremium ? (
                            <Typography.Paragraph style={{ textAlign: 'center' }}>
                                Premium đã được kích hoạt.
                            </Typography.Paragraph>
                        ) : premiumSync.type === 'checking' ? (
                            <Typography.Paragraph type="secondary" style={{ textAlign: 'center' }}>
                                Đang xác nhận thanh toán… (kiểm tra Premium {premiumSync.attempt}/{premiumSync.maxAttempts})
                            </Typography.Paragraph>
                        ) : premiumSync.type === 'pending' ? (
                            <Typography.Paragraph type="warning" style={{ textAlign: 'center' }}>
                                Chưa ghi nhận Premium sau {premiumSync.maxAttempts} lần kiểm tra. Nếu bạn đã thanh toán, vui lòng chờ thêm vài phút
                                hoặc liên hệ hỗ trợ kèm mã giao dịch {txnRef || '(không có)'}.
                            </Typography.Paragraph>
                        ) : premiumSync.type === 'error' ? (
                            <Typography.Paragraph type="danger" style={{ textAlign: 'center' }}>
                                {premiumSync.message}
                            </Typography.Paragraph>
                        ) : (
                            <Typography.Paragraph type="secondary" style={{ textAlign: 'center' }}>
                                Đang đồng bộ trạng thái Premium…
                            </Typography.Paragraph>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PaymentResultPage;
