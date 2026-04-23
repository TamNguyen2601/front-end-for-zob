import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from 'react';
import { ICompany, IJob } from "@/types/backend";
import { callFetchCompanyById, callFetchJobsByCompanyId } from "@/config/api";
import styles from 'styles/client.module.scss';
import parse from 'html-react-parser';
import { Button, Col, Divider, Empty, Modal, Row, Skeleton, Spin, Table, Tag } from "antd";
import { EnvironmentOutlined } from "@ant-design/icons";
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { convertSlug } from "@/config/utils";


const ClientCompanyDetailPage = (props: any) => {
    const [companyDetail, setCompanyDetail] = useState<ICompany | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const [companyJobs, setCompanyJobs] = useState<IJob[] | null>(null);
    const [jobsLoading, setJobsLoading] = useState<boolean>(false);
    const [hasLoadedJobs, setHasLoadedJobs] = useState<boolean>(false);
    const [isJobsModalOpen, setIsJobsModalOpen] = useState<boolean>(false);

    const navigate = useNavigate();

    let location = useLocation();
    let params = new URLSearchParams(location.search);
    const id = params?.get("id"); // job id

    useEffect(() => {
        const init = async () => {
            if (id) {
                setIsLoading(true)
                const res = await callFetchCompanyById(id);
                if (res?.data) {
                    setCompanyDetail(res.data)
                }
                setIsLoading(false)
            }
        }
        init();
    }, [id]);

    const getLevelTagColor = (level?: string) => {
        switch ((level ?? '').toUpperCase()) {
            case 'INTERN':
                return 'blue';
            case 'FRESHER':
                return 'cyan';
            case 'JUNIOR':
                return 'green';
            case 'MIDDLE':
            case 'MID':
                return 'gold';
            case 'SENIOR':
                return 'red';
            default:
                return 'default';
        }
    }

    const handleLoadCompanyJobs = async () => {
        if (!companyDetail?.id) return;

        setJobsLoading(true);
        try {
            const query = `page=1&size=10`;
            const res = await callFetchJobsByCompanyId(companyDetail.id, query);
            const jobs = (res?.data?.result ?? []).filter(item => item.active);
            setCompanyJobs(jobs);
            setHasLoadedJobs(true);
        } finally {
            setJobsLoading(false);
        }
    }

    const handleViewDetailJob = (item: IJob) => {
        const slug = convertSlug(item.name);
        setIsJobsModalOpen(false);
        navigate(`/job/${slug}?id=${item.id}`)
    }

    const columns: ColumnsType<IJob> = [
        {
            title: 'Tên công việc',
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: 'Lương',
            dataIndex: 'salary',
            key: 'salary',
            render: (value: number) => `${(value + "")?.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} đ`,
        },
        {
            title: 'Trình độ',
            dataIndex: 'level',
            key: 'level',
            render: (value: string) => (
                <Tag color={getLevelTagColor(value)} style={{ marginInlineEnd: 0 }}>
                    {value}
                </Tag>
            ),
        },
        {
            title: 'Ngày bắt đầu',
            dataIndex: 'startDate',
            key: 'startDate',
            render: (value: any) => value ? dayjs(value).format('DD/MM/YYYY') : '-',
        },
        {
            title: 'Ngày hết hạn',
            dataIndex: 'endDate',
            key: 'endDate',
            render: (value: any) => value ? dayjs(value).format('DD/MM/YYYY') : '-',
        },
        {
            title: 'Chi tiết',
            key: 'detail',
            align: 'center',
            render: (_: any, record: IJob) => (
                <Button type="link" onClick={() => handleViewDetailJob(record)}>
                    Chi tiết
                </Button>
            )
        }
    ];

    return (
        <div className={`${styles["container"]} ${styles["detail-job-section"]}`}>
            {isLoading ?
                <Skeleton />
                :
                <Row gutter={[20, 20]}>
                    {companyDetail && companyDetail.id &&
                        <>
                            <Col span={24} md={16}>
                                <div className={styles["header"]}>
                                    {companyDetail.name}
                                </div>

                                <div className={styles["location"]}>
                                    <EnvironmentOutlined style={{ color: '#58aaab' }} />&nbsp;{(companyDetail?.address)}
                                </div>

                                <Divider />
                                {parse(companyDetail?.description ?? "")}
                            </Col>

                            <Col span={24} md={8}>
                                <div className={styles["company"]}>
                                    <div>
                                        <img
                                            width={200}
                                            alt="example"
                                            src={`${import.meta.env.VITE_BACKEND_URL}/storage/company/${companyDetail?.logo}`}
                                        />
                                    </div>
                                    <div>
                                        {companyDetail?.name}
                                    </div>
                                </div>

                                <Divider />
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                                    <div style={{ fontWeight: 600 }}>
                                        Việc làm của công ty
                                    </div>
                                    <Button
                                        type="primary"
                                        onClick={async () => {
                                            setIsJobsModalOpen(true);
                                            if (!hasLoadedJobs && !jobsLoading) {
                                                await handleLoadCompanyJobs();
                                            }
                                        }}
                                    >
                                        Xem danh sách
                                    </Button>
                                </div>

                                <Modal
                                    title={`Việc làm - ${companyDetail?.name ?? ''}`}
                                    open={isJobsModalOpen}
                                    onCancel={() => setIsJobsModalOpen(false)}
                                    footer={null}
                                    width={900}
                                >
                                    <Spin spinning={jobsLoading} tip="Loading...">
                                        {hasLoadedJobs ? (
                                            (companyJobs && companyJobs.length > 0) ? (
                                                <Table
                                                    rowKey={(record) => `${record.id}`}
                                                    columns={columns}
                                                    dataSource={companyJobs}
                                                    pagination={false}
                                                />
                                            ) : (
                                                <Empty description="Không có dữ liệu" />
                                            )
                                        ) : null}
                                    </Spin>
                                </Modal>
                            </Col>
                        </>
                    }
                </Row>
            }
        </div>
    )
}
export default ClientCompanyDetailPage;