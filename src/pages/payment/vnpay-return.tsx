import { useEffect, useRef, useState } from 'react';
import { Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { fetchPremiumStatus } from '@/redux/slice/premiumSlice';
import styles from '@/styles/client.module.scss';

const AUTO_RETRY_TIMES = 2;
const AUTO_RETRY_DELAY_MS = 3000;

const VNPayReturnPage = () => {
    const dispatch = useAppDispatch();
    const { isAuthenticated } = useAppSelector((state) => state.account);
    const premium = useAppSelector((state) => state.premium);

    const [isChecking, setIsChecking] = useState(false);
    const [autoRetryLeft, setAutoRetryLeft] = useState(AUTO_RETRY_TIMES);
    const [hasCheckedOnce, setHasCheckedOnce] = useState(false);
    const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const checkNow = async () => {
        if (!isAuthenticated) return;
        setIsChecking(true);
        try {
            await dispatch(fetchPremiumStatus());
            setHasCheckedOnce(true);
        } finally {
            setIsChecking(false);
        }
    };

    useEffect(() => {
        if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
        return () => {
            if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
        };
    }, []);

    useEffect(() => {
        if (!isAuthenticated) return;
        checkNow();
    }, [isAuthenticated]);

    useEffect(() => {
        if (!isAuthenticated) return;
        if (!hasCheckedOnce) return;
        if (premium.isPremium) return;
        if (autoRetryLeft <= 0) return;

        retryTimerRef.current = setTimeout(async () => {
            setAutoRetryLeft((left) => left - 1);
            await checkNow();
        }, AUTO_RETRY_DELAY_MS);

        return () => {
            if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
        };
    }, [isAuthenticated, hasCheckedOnce, premium.isPremium, autoRetryLeft]);

    return (
        <div style={{ padding: 24, display: 'flex', justifyContent: 'center' }}>
            <div className={styles['payment-waiting']} style={{ maxWidth: 560 }}>
                <Spin
                    spinning={isChecking}
                    indicator={<LoadingOutlined style={{ fontSize: 40 }} spin />}
                />

                {!isAuthenticated ? (
                    <>
                        <div className={styles['waiting-title']} style={{ marginTop: 16 }}>
                            Bạn cần đăng nhập để kiểm tra Premium
                        </div>
                        <p className={styles['waiting-desc']}>
                            Vui lòng đăng nhập lại, sau đó quay lại trang này để hệ thống cập nhật trạng thái.
                        </p>
                    </>
                ) : premium.isPremium ? (
                    <>
                        <div className={styles['waiting-title']} style={{ marginTop: 16 }}>
                            ✅ Đã kích hoạt Premium
                        </div>
                        <p className={styles['waiting-desc']}>
                            Trạng thái Premium đã được cập nhật từ hệ thống.
                        </p>
                    </>
                ) : (
                    <>
                        <div className={styles['waiting-title']} style={{ marginTop: 16 }}>
                            ⏳ Đang cập nhật trạng thái Premium...
                        </div>
                        <p className={styles['waiting-desc']}>
                            Trong môi trường sandbox, xác nhận có thể chậm vài giây. Nếu chưa thấy Premium, hãy bấm “Kiểm tra lại”.
                        </p>
                        {autoRetryLeft > 0 && (
                            <p className={styles['waiting-hint']}>
                                Tự động kiểm tra lại sau {Math.round(AUTO_RETRY_DELAY_MS / 1000)}s ({autoRetryLeft} lần còn lại)
                            </p>
                        )}
                        <button
                            id="btn-premium-recheck"
                            className={styles['btn-primary-purple']}
                            onClick={checkNow}
                            disabled={isChecking}
                        >
                            Kiểm tra lại
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default VNPayReturnPage;
