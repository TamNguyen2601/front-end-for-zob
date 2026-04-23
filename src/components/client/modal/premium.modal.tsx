import { useState, useEffect, useRef } from 'react';
import { Spin, Button, message } from 'antd';
import { LoadingOutlined, ExportOutlined } from '@ant-design/icons';
import styles from '@/styles/client.module.scss';
import { callPurchasePremium, callGetPremiumStatus } from '@/config/api';
import { useAppDispatch } from '@/redux/hooks';
import { setPremiumStatus } from '@/redux/slice/premiumSlice';
import dayjs from 'dayjs';

interface PremiumModalProps {
    open: boolean;
    onClose: () => void;
}

const PLANS = [
    { code: 'DEMO_1_MIN', name: 'Demo', duration: '1 phút', price: '10.000đ' },
    { code: 'MONTH_1', name: '1 Tháng', duration: '1 tháng', price: '50.000đ' },
    { code: 'MONTH_3', name: '3 Tháng', duration: '3 tháng', price: '100.000đ' },
    { code: 'YEAR_1', name: '1 Năm', duration: '1 năm', price: '250.000đ' },
];

type Step = 'select' | 'waiting' | 'success';

const PremiumModal = ({ open, onClose }: PremiumModalProps) => {
    const dispatch = useAppDispatch();
    const [step, setStep] = useState<Step>('select');
    const [selectedPlan, setSelectedPlan] = useState<string>('MONTH_1');
    const [payUrl, setPayUrl] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successData, setSuccessData] = useState<{ endAt: string | null }>({ endAt: null });
    const [pollTimeout, setPollTimeout] = useState(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Reset khi mở lại modal
    useEffect(() => {
        if (open) {
            setStep('select');
            setSelectedPlan('MONTH_1');
            setPayUrl('');
            setPollTimeout(false);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [open]);

    const handlePurchase = async () => {
        setIsSubmitting(true);
        try {
            const res = await callPurchasePremium(selectedPlan);
            if (res?.data?.payUrl) {
                const url = res.data.payUrl;
                setPayUrl(url);
                // Chuyển sang trang thanh toán VNPay trong CÙNG tab.
                // Sau khi thanh toán xong, BE sẽ redirect về FE /payment/result?... theo spec.
                window.location.assign(url);
                setStep('waiting');
            } else {
                message.error(res?.message || 'Có lỗi xảy ra khi tạo giao dịch');
            }
        } catch (err) {
            message.error('Không thể kết nối máy chủ');
        } finally {
            setIsSubmitting(false);
        }
    };

    const startPolling = () => {
        let attempts = 0;
        const MAX = 100; // 5 phút (100 × 3s)
        timerRef.current = setInterval(async () => {
            attempts++;
            try {
                const res = await callGetPremiumStatus();
                const payload = res?.data;
                const isPremium = (payload as any)?.premium ?? (payload as any)?.isPremium;
                if (isPremium) {
                    clearInterval(timerRef.current!);
                    dispatch(setPremiumStatus({
                        premium: true,
                        startAt: payload?.startAt ?? null,
                        endAt: payload?.endAt ?? null,
                    }));
                    setSuccessData({ endAt: payload?.endAt ?? null });
                    setStep('success');
                }
            } catch { /* bỏ qua lỗi polling */ }
            if (attempts >= MAX) {
                clearInterval(timerRef.current!);
                setPollTimeout(true);
            }
        }, 3000);
    };

    const handleClose = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        onClose();
    };

    if (!open) return null;

    return (
        <div className={styles['premium-modal-overlay']} onClick={handleClose}>
            <div
                className={styles['premium-modal-box']}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className={styles['modal-header']}>
                    <h3>
                        {step === 'select' && '⭐ Nâng cấp Premium'}
                        {step === 'waiting' && '⏳ Đang chờ thanh toán'}
                        {step === 'success' && '🎉 Kích hoạt thành công!'}
                    </h3>
                    <p>
                        {step === 'select' && 'Chọn gói phù hợp với nhu cầu của bạn'}
                        {step === 'waiting' && 'Hoàn tất thanh toán trong tab VNPay vừa mở'}
                        {step === 'success' && 'Tài khoản của bạn đã được nâng cấp'}
                    </p>
                </div>

                {/* Body */}
                <div className={styles['modal-body']}>
                    {/* STEP 1: Chọn gói */}
                    {step === 'select' && (
                        <div className={styles['plan-grid']}>
                            {PLANS.map((plan) => (
                                <div
                                    key={plan.code}
                                    data-plan={plan.code}
                                    className={`${styles['plan-card']} ${selectedPlan === plan.code ? styles['selected'] : ''}`}
                                    onClick={() => setSelectedPlan(plan.code)}
                                >
                                    <div className={styles['plan-badge-best']}>Tốt nhất</div>
                                    <div className={styles['plan-name']}>{plan.name}</div>
                                    <div className={styles['plan-duration']}>{plan.duration}</div>
                                    <div className={styles['plan-price']}>{plan.price}</div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* STEP 2: Chờ thanh toán (thay QR) */}
                    {step === 'waiting' && (
                        <div className={styles['payment-waiting']}>
                            {pollTimeout ? (
                                <>
                                    <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
                                    <div className={styles['waiting-title']} style={{ color: '#ff4d4f' }}>
                                        Chưa xác nhận được thanh toán
                                    </div>
                                    <p className={styles['waiting-desc']}>
                                        Vui lòng kiểm tra lại giao dịch hoặc thử lại sau.
                                    </p>
                                </>
                            ) : (
                                <>
                                    <Spin
                                        indicator={<LoadingOutlined style={{ fontSize: 40, color: '#667eea' }} spin />}
                                        style={{ marginBottom: 16 }}
                                    />
                                    <div className={styles['waiting-title']}>Đang chờ xác nhận thanh toán...</div>
                                    <p className={styles['waiting-desc']}>
                                        Trang thanh toán VNPay đã được mở trong tab mới.<br />
                                        Vui lòng hoàn tất thanh toán tại đó.
                                    </p>
                                    <p className={styles['waiting-hint']}>
                                        Trang này sẽ tự động cập nhật sau khi thanh toán thành công.
                                    </p>
                                </>
                            )}
                            <Button
                                id="btn-reopen-vnpay"
                                icon={<ExportOutlined />}
                                onClick={() => window.open(payUrl, '_blank', 'noopener,noreferrer')}
                                style={{ marginTop: 8 }}
                            >
                                Mở lại trang thanh toán VNPay
                            </Button>
                        </div>
                    )}

                    {/* STEP 3: Thành công */}
                    {step === 'success' && (
                        <div className={styles['success-section']}>
                            <div className={styles['success-icon']}>🎉</div>
                            <div className={styles['success-title']}>Tài khoản đã được nâng cấp Premium!</div>
                            <div className={styles['success-desc']}>
                                {successData.endAt
                                    ? `Hạn sử dụng: đến ${dayjs(successData.endAt).format('DD/MM/YYYY HH:mm')}`
                                    : 'Premium vĩnh viễn (Admin)'}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className={styles['modal-footer']}>
                    {step === 'select' && (
                        <>
                            <button className={styles['btn-ghost']} onClick={handleClose}>Hủy</button>
                            <button
                                id="btn-purchase-premium"
                                className={styles['btn-primary-purple']}
                                onClick={handlePurchase}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? <Spin size="small" /> : 'Thanh toán →'}
                            </button>
                        </>
                    )}
                    {step === 'waiting' && (
                        <button className={styles['btn-ghost']} onClick={handleClose}>Đóng</button>
                    )}
                    {step === 'success' && (
                        <button
                            id="btn-premium-success-close"
                            className={styles['btn-primary-purple']}
                            onClick={handleClose}
                        >
                            Tuyệt vời! Đóng
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PremiumModal;
