import { useState } from 'react';
import { Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import { IResumeStats } from '@/types/backend';
import styles from '@/styles/client.module.scss';
import PremiumModal from './modal/premium.modal';

interface ResumeStatsBlockProps {
    stats: IResumeStats | null;
    isForbidden: boolean;  // true = 403 (chưa Premium)
    isLoading: boolean;
}

const STAT_ROWS = [
    { key: 'pending',   label: '⏳ Đang chờ',   colorClass: 'color-pending' },
    { key: 'reviewing', label: '🔍 Xem xét',     colorClass: 'color-reviewing' },
    { key: 'approved',  label: '✅ Đã duyệt',    colorClass: 'color-approved' },
    { key: 'rejected',  label: '❌ Từ chối',      colorClass: 'color-rejected' },
] as const;

const ResumeStatsBlock = ({ stats, isForbidden, isLoading }: ResumeStatsBlockProps) => {
    const [openPremiumModal, setOpenPremiumModal] = useState(false);

    if (isLoading) {
        return (
            <div className={styles['resume-stats-block']} style={{ textAlign: 'center', padding: 30 }}>
                <Spin indicator={<LoadingOutlined spin />} />
            </div>
        );
    }

    // Chưa có Premium — hiện locked block
    if (isForbidden) {
        return (
            <>
                <div className={styles['locked-block']}>
                    <div className={styles['locked-icon']}>🔒</div>
                    <div className={styles['locked-title']}>Thống kê ứng tuyển</div>
                    <div className={styles['locked-desc']}>
                        Xem số lượng CV theo từng trạng thái<br />
                        chỉ dành cho tài khoản <strong>Premium</strong>.
                    </div>
                    <button
                        id="btn-upgrade-from-stats"
                        className={styles['btn-upgrade']}
                        onClick={() => setOpenPremiumModal(true)}
                    >
                        ⭐ Nâng cấp Premium
                    </button>
                </div>
                <PremiumModal
                    open={openPremiumModal}
                    onClose={() => setOpenPremiumModal(false)}
                />
            </>
        );
    }

    // Có stats — hiện block thống kê
    if (!stats) return null;

    const total = stats.total || 1; // tránh chia cho 0

    return (
        <div className={styles['resume-stats-block']}>
            <div className={styles['stats-title']}>
                📊 Thống kê ứng tuyển <span style={{ color: '#fda085', fontSize: 14 }}>⭐ Premium</span>
            </div>
            <div className={styles['stats-total']}>
                Tổng: <span>{stats.total}</span> CV
            </div>
            {STAT_ROWS.map(({ key, label, colorClass }) => {
                const count = stats[key] ?? 0;
                const pct = Math.round((count / total) * 100);
                return (
                    <div key={key} className={styles['stats-row']}>
                        <span className={styles['stats-label']}>{label}</span>
                        <div className={styles['stats-bar-wrap']}>
                            <div
                                className={`${styles['stats-bar-fill']} ${styles[colorClass]}`}
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                        <span className={styles['stats-count']}>{count}</span>
                    </div>
                );
            })}
        </div>
    );
};

export default ResumeStatsBlock;
