import { useState } from 'react';
import { Tooltip } from 'antd';
import { useAppSelector } from '@/redux/hooks';
import styles from '@/styles/client.module.scss';
import PremiumModal from './modal/premium.modal';

const PremiumBadge = () => {
    const [openModal, setOpenModal] = useState(false);
    const { isPremium, endAt, isLoading } = useAppSelector(state => state.premium);
    const isAuthenticated = useAppSelector(state => state.account.isAuthenticated);

    if (isLoading || !isAuthenticated) return null;

    // Tính số ngày còn lại
    const daysLeft = endAt
        ? Math.ceil((new Date(endAt).getTime() - new Date().getTime()) / 86400000)
        : null;

    const isExpiring = daysLeft !== null && daysLeft <= 3 && daysLeft > 0;
    const isAdmin = isPremium && endAt === null;

    if (!isPremium) {
        return (
            <>
                <button
                    id="btn-upgrade-premium"
                    className={`${styles['premium-badge']} ${styles['badge-upgrade']}`}
                    onClick={() => setOpenModal(true)}
                >
                    ⭐ Nâng cấp
                </button>
                <PremiumModal open={openModal} onClose={() => setOpenModal(false)} />
            </>
        );
    }

    if (isAdmin) {
        return (
            <Tooltip title="Premium vĩnh viễn (Admin)">
                <span className={`${styles['premium-badge']} ${styles['badge-admin']}`}>
                    ⭐ Premium
                </span>
            </Tooltip>
        );
    }

    if (isExpiring) {
        return (
            <>
                <Tooltip title={`Sắp hết hạn! Còn ${daysLeft} ngày`}>
                    <button
                        id="btn-premium-expiring"
                        className={`${styles['premium-badge']} ${styles['badge-expiring']}`}
                        onClick={() => setOpenModal(true)}
                    >
                        ⭐ Premium · ⚠️ {daysLeft} ngày
                    </button>
                </Tooltip>
                <PremiumModal open={openModal} onClose={() => setOpenModal(false)} />
            </>
        );
    }

    return (
        <Tooltip title={endAt ? `Hết hạn: ${new Date(endAt).toLocaleDateString('vi-VN')}` : ''}>
            <span
                id="badge-premium-active"
                className={`${styles['premium-badge']} ${styles['badge-premium']}`}
            >
                ⭐ Premium · {daysLeft !== null ? `Còn ${daysLeft} ngày` : ''}
            </span>
        </Tooltip>
    );
};

export default PremiumBadge;
