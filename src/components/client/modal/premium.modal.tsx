import { useState, useEffect, useRef } from 'react';
import { Spin, message } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import { QRCodeSVG } from 'qrcode.react';
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
    { code: 'DEMO_1_MIN', name: 'Demo', duration: '1 phút', price: '3.000đ' },
    { code: 'MONTH_1',    name: '1 Tháng', duration: '1 tháng', price: '50.000đ' },
    { code: 'MONTH_3',    name: '3 Tháng', duration: '3 tháng', price: '100.000đ' },
    { code: 'YEAR_1',     name: '1 Năm',   duration: '1 năm',   price: '250.000đ' },
];

type Step = 'select' | 'qr' | 'success';

const PremiumModal = ({ open, onClose }: PremiumModalProps) => {
    const dispatch = useAppDispatch();
    const [step, setStep] = useState<Step>('select');
    const [selectedPlan, setSelectedPlan] = useState<string>('MONTH_1');
    const [payUrl, setPayUrl] = useState<string>('');
    const [momoDeeplink, setMomoDeeplink] = useState<string>('');
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
            setMomoDeeplink('');
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
                setPayUrl(res.data.payUrl);
                setMomoDeeplink(res.data.momoDeeplink ?? '');
                setStep('qr');
                startPolling();
            } else {
                message.error(res?.message || 'Có lỗi xảy ra khi tạo QR');
            }
        } catch (err) {
            message.error('Không thể kết nối máy chủ');
        } finally {
            setIsSubmitting(false);
        }
    };

    const startPolling = () => {
        let attempts = 0;
        const MAX = 100; // 5 phút
        timerRef.current = setInterval(async () => {
            attempts++;
            try {
                const res = await callGetPremiumStatus();
                if (res?.data?.isPremium) {
                    clearInterval(timerRef.current!);
                    // Cập nhật Redux
                    dispatch(setPremiumStatus({
                        isPremium: true,
                        startAt: res.data.startAt,
                        endAt: res.data.endAt,
                    }));
                    setSuccessData({ endAt: res.data.endAt });
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
                        {step === 'qr' && '📱 Thanh toán MoMo'}
                        {step === 'success' && '🎉 Kích hoạt thành công!'}
                    </h3>
                    <p>
                        {step === 'select' && 'Chọn gói phù hợp với nhu cầu của bạn'}
                        {step === 'qr' && 'Quét mã QR bằng ứng dụng MoMo để thanh toán'}
                        {step === 'success' && 'Tài khoản của bạn đã được nâng cấp'}
                    </p>
                </div>

                {/* Body */}
                <div className={styles['modal-body']}>
                    {/* STEP 1: Chọn gói */}
                    {step === 'select' && (
                        <>
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
                        </>
                    )}

                    {/* STEP 2: QR MoMo */}
                    {step === 'qr' && (
                        <div className={styles['qr-section']}>
                            <QRCodeSVG
                                value={payUrl}
                                size={220}
                                level="M"
                                includeMargin={true}
                                style={{ borderRadius: 12, border: '3px solid #f0f0f0', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            />
                            <p className={styles['qr-instruction']}>
                                Dùng camera điện thoại hoặc app <strong>MoMo</strong> quét mã QR → Xác nhận thanh toán
                            </p>
                            {momoDeeplink && (
                                <div style={{ marginBottom: 12 }}>
                                    <a
                                        href={momoDeeplink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ color: '#ae2070', fontWeight: 600, fontSize: 13 }}
                                    >
                                        📱 Mở app MoMo để thanh toán
                                    </a>
                                </div>
                            )}
                            {pollTimeout ? (
                                <div style={{ color: '#ff4d4f', fontSize: 13 }}>
                                    ⚠️ Chưa xác nhận được thanh toán. Vui lòng kiểm tra lại MoMo hoặc thử lại.
                                </div>
                            ) : (
                                <div className={styles['qr-spinner']}>
                                    <Spin indicator={<LoadingOutlined spin />} />
                                    <span>Đang chờ xác nhận thanh toán...</span>
                                </div>
                            )}
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
                                {isSubmitting ? <Spin size="small" /> : 'Tiếp tục →'}
                            </button>
                        </>
                    )}
                    {step === 'qr' && (
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
