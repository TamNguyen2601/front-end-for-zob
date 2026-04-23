import { useEffect, useState } from 'react';
import { Tooltip } from 'antd';
import { useAppSelector } from '@/redux/hooks';
import styles from '@/styles/client.module.scss';
import PremiumModal from './modal/premium.modal';
import { useLocation, useNavigate } from 'react-router-dom';

const PremiumBadge = () => {
    const [openModal, setOpenModal] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const { isPremium, endAt, isLoading } = useAppSelector(state => state.premium);
    const isAuthenticated = useAppSelector(state => state.account.isAuthenticated);

    useEffect(() => {
        if (!isAuthenticated || isPremium) return;
        const params = new URLSearchParams(location.search);
        if (params.get('premium') !== '1') return;

        setOpenModal(true);

        params.delete('premium');
        const nextSearch = params.toString();
        navigate(
            {
                pathname: location.pathname,
                search: nextSearch ? `?${nextSearch}` : '',
            },
            { replace: true }
        );
    }, [isAuthenticated, isPremium, location.pathname, location.search, navigate]);

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

    // Đã Premium (không phải Admin) => hiển thị nút Gia hạn
    const btnClass = isExpiring ? styles['badge-expiring'] : styles['badge-premium'];
    const tooltipTitle = isExpiring
        ? `Sắp hết hạn! Còn ${daysLeft} ngày`
        : (endAt ? `Hết hạn: ${new Date(endAt).toLocaleDateString('vi-VN')}` : '');

    return (
        <>
            <Tooltip title={tooltipTitle}>
                <button
                    id={isExpiring ? 'btn-premium-renew-expiring' : 'btn-premium-renew'}
                    className={`${styles['premium-badge']} ${btnClass}`}
                    onClick={() => setOpenModal(true)}
                >
                    ⭐ Gia hạn{daysLeft !== null ? ` · Còn ${daysLeft} ngày` : ''}
                </button>
            </Tooltip>
            <PremiumModal open={openModal} onClose={() => setOpenModal(false)} />
        </>
    );
};

export default PremiumBadge;
