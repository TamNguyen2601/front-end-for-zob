import { useState } from 'react';
import { Modal, Spin, message } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import { IResumeStats } from '@/types/backend';
import styles from '@/styles/client.module.scss';
import PremiumModal from '@/components/client/modal/premium.modal';
import { callGetResumeStats } from '@/config/api';

interface ResumeStatsModalProps {
    open: boolean;
    jobId: string | undefined;
    jobName?: string;
    onClose: () => void;
}

const STAT_ROWS = [
    { key: 'pending',   label: '⏳ Chờ xét duyệt', colorClass: 'color-pending' },
    { key: 'reviewing', label: '🔍 Đang xem xét',   colorClass: 'color-reviewing' },
    { key: 'approved',  label: '✅ Đã duyệt',        colorClass: 'color-approved' },
    { key: 'rejected',  label: '❌ Từ chối',          colorClass: 'color-rejected' },
] as const;

const ResumeStatsModal = ({ open, jobId, jobName, onClose }: ResumeStatsModalProps) => {
    const [stats, setStats] = useState<IResumeStats | null>(null);
    const [isForbidden, setIsForbidden] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [openPremiumModal, setOpenPremiumModal] = useState(false);

    // Tải stats khi mở modal
    const handleAfterOpen = async () => {
        if (!jobId) return;
        setIsLoading(true);
        setStats(null);
        setIsForbidden(false);
        try {
            const res = await callGetResumeStats(jobId);
            if (res?.data) {
                setStats(res.data);
            }
        } catch (err: any) {
            const status = err?.response?.status;
            if (status === 403) {
                setIsForbidden(true);
            } else {
                message.error('Không thể tải thống kê');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const total = stats?.total || 1;

    return (
        <>
            <Modal
                title={<span>📊 Thống kê CV — <em>{jobName}</em></span>}
                open={open}
                onCancel={onClose}
                footer={null}
                width={480}
                afterOpenChange={(v) => { if (v) handleAfterOpen(); }}
            >
                {isLoading && (
                    <div style={{ textAlign: 'center', padding: 40 }}>
                        <Spin indicator={<LoadingOutlined spin />} />
                    </div>
                )}

                {!isLoading && isForbidden && (
                    <div className={styles['locked-block']}>
                        <div className={styles['locked-icon']}>🔒</div>
                        <div className={styles['locked-title']}>Bạn cần Premium để xem thống kê</div>
                        <div className={styles['locked-desc']}>
                            Nâng cấp tài khoản để mở khóa tính năng xem thống kê CV theo trạng thái.
                        </div>
                        <button
                            id="btn-admin-upgrade-premium"
                            className={styles['btn-upgrade']}
                            onClick={() => {
                                onClose();
                                setOpenPremiumModal(true);
                            }}
                        >
                            ⭐ Mua Premium
                        </button>
                    </div>
                )}

                {!isLoading && stats && (
                    <div className={styles['resume-stats-block']} style={{ margin: 0, boxShadow: 'none', border: 'none' }}>
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
                )}
            </Modal>

            <PremiumModal
                open={openPremiumModal}
                onClose={() => setOpenPremiumModal(false)}
            />
        </>
    );
};

export default ResumeStatsModal;
