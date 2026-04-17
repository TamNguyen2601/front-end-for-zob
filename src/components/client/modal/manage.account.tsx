import { Button, Col, Form, Modal, Row, Select, Table, Tabs, Tag, message, notification } from "antd";
import { isMobile } from "react-device-detect";
import type { TabsProps } from 'antd';
import { IResume, IUser } from "@/types/backend";
import { useState, useEffect } from 'react';
import { callFetchResumeByUser, callUpdateCurrentUser, callChangePassword, callFetchAccount } from "@/config/api";
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { setUserLoginInfo } from "@/redux/slice/accountSlide";
import { getResumeStatusTagColor } from "@/config/utils";

interface IProps {
    open: boolean;
    onClose: (v: boolean) => void;
}

const UserResume = (props: any) => {
    const [listCV, setListCV] = useState<IResume[]>([]);
    const [isFetching, setIsFetching] = useState<boolean>(false);

    useEffect(() => {
        const init = async () => {
            setIsFetching(true);
            const res = await callFetchResumeByUser();
            if (res && res.data) {
                setListCV(res.data.result as IResume[])
            }
            setIsFetching(false);
        }
        init();
    }, [])

    const columns: ColumnsType<IResume> = [
        {
            title: 'STT',
            key: 'index',
            width: 50,
            align: "center",
            render: (text, record, index) => {
                return (
                    <>
                        {(index + 1)}
                    </>)
            }
        },
        {
            title: 'Công Ty',
            dataIndex: "companyName",

        },
        {
            title: 'Job title',
            dataIndex: ["job", "name"],

        },
        {
            title: 'Trạng thái',
            dataIndex: "status",
            render: (value, record) => {
                return (
                    <Tag color={getResumeStatusTagColor(record.status)} style={{ marginInlineEnd: 0 }}>
                        {record.status}
                    </Tag>
                )
            }
        },
        {
            title: 'Ngày rải CV',
            dataIndex: "createdAt",
            render(value, record, index) {
                return (
                    <>{dayjs(record.createdAt).format('DD-MM-YYYY HH:mm:ss')}</>
                )
            },
        },
        {
            title: '',
            dataIndex: "",
            render(value, record, index) {
                return (
                    <a
                        href={`${import.meta.env.VITE_BACKEND_URL}/storage/resume/${record?.url}`}
                        target="_blank"
                    >Chi tiết</a>
                )
            },
        },
    ];

    return (
        <div>
            <Table<IResume>
                columns={columns}
                dataSource={listCV}
                loading={isFetching}
                pagination={false}
            />
        </div>
    )
}

const UserUpdateInfo = (props: { open: boolean }) => {
    const [form] = Form.useForm();
    const dispatch = useAppDispatch();
    const user = useAppSelector(state => state.account.user);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isFormChanged, setIsFormChanged] = useState<boolean>(false);
    const [isFetchingAccount, setIsFetchingAccount] = useState<boolean>(false);
    const [initialValues, setInitialValues] = useState<any>(null);

    const applyUserToForm = (accountUser: any) => {
        const formValues = {
            id: accountUser?.id,
            email: accountUser?.email || "",
            name: accountUser?.name || "",
            age: accountUser?.age ?? undefined,
            gender: accountUser?.gender || undefined,
            address: accountUser?.address || ""
        };
        setInitialValues(formValues);
        form.setFieldsValue(formValues);
        setIsFormChanged(false);
    }

    const fetchCurrentAccount = async () => {
        setIsFetchingAccount(true);
        const res = await callFetchAccount();
        if (res?.data?.user) {
            dispatch(setUserLoginInfo(res.data.user));
            applyUserToForm(res.data.user);
        }
        setIsFetchingAccount(false);
    }

    useEffect(() => {
        if (props.open) {
            fetchCurrentAccount();
        }
    }, [props.open]);

    useEffect(() => {
        if (!initialValues && user?.id) {
            applyUserToForm(user);
        }
    }, [user]);

    const onValuesChange = (changedValues: any, allValues: any) => {
        const hasChanged = JSON.stringify(allValues) !== JSON.stringify(initialValues);
        setIsFormChanged(hasChanged);
    };

    const onFinish = async (values: any) => {
        setIsLoading(true);
        try {
            const userData = {
                name: values.name,
                age: values.age,
                gender: values.gender,
                address: values.address || ""
            };

            const res = await callUpdateCurrentUser(userData as Partial<IUser>);
            if (res.data) {
                message.success("Cập nhật thông tin cá nhân thành công");
                await fetchCurrentAccount();
            } else {
                notification.error({
                    message: 'Có lỗi xảy ra',
                    description: res.message || 'Cập nhật thông tin thất bại'
                });
            }
        } catch (error: any) {
            notification.error({
                message: 'Có lỗi xảy ra',
                description: error?.message || 'Cập nhật thông tin thất bại'
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = () => {
        form.setFieldsValue(initialValues);
        setIsFormChanged(false);
    };

    return (
        <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            onValuesChange={onValuesChange}
            disabled={isFetchingAccount}
        >
            <Row gutter={[20, 20]}>
                <Col span={isMobile ? 24 : 12}>
                    <div style={{ paddingRight: isMobile ? 0 : 12 }}>
                        <Form.Item
                            label={<span>Email <span style={{ color: 'red' }}>*</span> (Chỉ xem)</span>}
                            name="email"
                        >
                            <input
                                type="email"
                                disabled
                                style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    border: '1px solid #d9d9d9',
                                    borderRadius: '4px',
                                    backgroundColor: '#f5f5f5',
                                    color: '#999',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </Form.Item>
                    </div>
                </Col>

                <Col span={isMobile ? 24 : 12}>
                    <div style={{ paddingLeft: isMobile ? 0 : 12 }}>
                        <Form.Item
                            label={<span>Tên đầy đủ <span style={{ color: 'red' }}>*</span></span>}
                            name="name"
                            rules={[
                                { required: true, message: 'Tên không được để trống' },
                                {
                                    min: 1,
                                    message: 'Tên phải có ít nhất 1 ký tự'
                                },
                                {
                                    max: 255,
                                    message: 'Tên không vượt quá 255 ký tự'
                                }
                            ]}
                        >
                            <input
                                type="text"
                                placeholder="Nhập tên đầy đủ"
                                style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    border: '1px solid #d9d9d9',
                                    borderRadius: '4px',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </Form.Item>
                    </div>
                </Col>

                <Col span={isMobile ? 24 : 12}>
                    <div style={{ paddingRight: isMobile ? 0 : 12 }}>
                        <Form.Item
                            label="Tuổi"
                            name="age"
                            rules={[
                                {
                                    pattern: /^(\d{1,3})?$/,
                                    message: 'Tuổi phải là số'
                                },
                                {
                                    validator: (_, value) => {
                                        if (value === undefined || value === null || value === "") return Promise.resolve();
                                        const age = Number(value);
                                        if (age < 0 || age > 120) {
                                            return Promise.reject(new Error('Tuổi phải từ 0 đến 120'));
                                        }
                                        return Promise.resolve();
                                    }
                                }
                            ]}
                        >
                            <input
                                type="number"
                                placeholder="Nhập tuổi"
                                min={0}
                                max={120}
                                style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    border: '1px solid #d9d9d9',
                                    borderRadius: '4px',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </Form.Item>
                    </div>
                </Col>

                <Col span={isMobile ? 24 : 12}>
                    <div style={{ paddingLeft: isMobile ? 0 : 12 }}>
                        <Form.Item
                            label="Giới tính"
                            name="gender"
                            rules={[
                                {
                                    pattern: /^(MALE|FEMALE|OTHER)?$/,
                                    message: 'Giới tính không hợp lệ'
                                }
                            ]}
                        >
                            <Select
                                placeholder="Chọn giới tính"
                                allowClear
                                options={[
                                    { label: 'Nam (Male)', value: 'MALE' },
                                    { label: 'Nữ (Female)', value: 'FEMALE' },
                                    { label: 'Khác (Other)', value: 'OTHER' }
                                ]}
                            />
                        </Form.Item>
                    </div>
                </Col>

                <Col span={24}>
                    <Form.Item
                        label="Địa chỉ"
                        name="address"
                        rules={[
                            {
                                max: 500,
                                message: 'Địa chỉ không vượt quá 500 ký tự'
                            }
                        ]}
                    >
                        <textarea
                            placeholder="Nhập địa chỉ của bạn"
                            rows={3}
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                border: '1px solid #d9d9d9',
                                borderRadius: '4px',
                                fontFamily: 'inherit'
                            }}
                        />
                    </Form.Item>
                </Col>

                <Col span={24}>
                    <Row gutter={[10, 10]}>
                        <Col>
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={isLoading || isFetchingAccount}
                                disabled={
                                    !isFormChanged
                                    || isLoading
                                    || isFetchingAccount
                                    || form.getFieldsError().some(({ errors }) => errors.length > 0)
                                }
                            >
                                Cập nhật
                            </Button>
                        </Col>
                        <Col>
                            <Button
                                onClick={handleReset}
                                disabled={!isFormChanged || isLoading || isFetchingAccount}
                            >
                                Hủy
                            </Button>
                        </Col>
                    </Row>
                </Col>
            </Row>
        </Form>
    )
}

const ChangePassword = (props: any) => {
    const [form] = Form.useForm();
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [showPasswords, setShowPasswords] = useState<{
        oldPassword: boolean;
        newPassword: boolean;
        confirmPassword: boolean;
    }>({
        oldPassword: false,
        newPassword: false,
        confirmPassword: false
    });

    const togglePasswordVisibility = (field: keyof typeof showPasswords) => {
        setShowPasswords(prev => ({
            ...prev,
            [field]: !prev[field]
        }));
    };

    const onFinish = async (values: any) => {
        setIsLoading(true);
        try {
            const res = await callChangePassword(
                values.oldPassword,
                values.newPassword,
                values.newPasswordConfirm
            );
            if (res.data) {
                message.success("Thay đổi mật khẩu thành công");
                form.resetFields();
                setShowPasswords({
                    oldPassword: false,
                    newPassword: false,
                    confirmPassword: false
                });
            } else {
                notification.error({
                    message: 'Có lỗi xảy ra',
                    description: res.message || 'Thay đổi mật khẩu thất bại'
                });
            }
        } catch (error: any) {
            notification.error({
                message: 'Có lỗi xảy ra',
                description: error?.message || 'Thay đổi mật khẩu thất bại'
            });
        } finally {
            setIsLoading(false);
        }
    };

    const PasswordInput = ({ value, onChange, type = 'password', placeholder = '', fieldName }: any) => (
        <div style={{ position: 'relative', width: '100%' }}>
            <input
                type={showPasswords[fieldName as keyof typeof showPasswords] ? 'text' : type}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d9d9d9',
                    borderRadius: '4px',
                    paddingRight: '40px',
                    boxSizing: 'border-box'
                }}
            />
            <button
                type="button"
                onClick={() => togglePasswordVisibility(fieldName)}
                style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#666',
                    fontSize: '16px',
                    padding: '0'
                }}
            >
                {showPasswords[fieldName as keyof typeof showPasswords] ? '👁️' : '👁️‍🗨️'}
            </button>
        </div>
    );

    return (
        <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
        >
            <Row gutter={[20, 20]}>
                <Col span={isMobile ? 24 : 12}>
                    <Form.Item
                        label={<span>Mật khẩu cũ <span style={{ color: 'red' }}>*</span></span>}
                        name="oldPassword"
                        rules={[
                            { required: true, message: 'Mật khẩu cũ không được để trống' }
                        ]}
                    >
                        <PasswordInput fieldName="oldPassword" placeholder="Nhập mật khẩu cũ" />
                    </Form.Item>
                </Col>

                <Col span={isMobile ? 24 : 12}>
                    <Form.Item
                        label={<span>Mật khẩu mới <span style={{ color: 'red' }}>*</span></span>}
                        name="newPassword"
                        rules={[
                            { required: true, message: 'Mật khẩu mới không được để trống' }
                        ]}
                    >
                        <PasswordInput fieldName="newPassword" placeholder="Nhập mật khẩu mới" />
                    </Form.Item>
                </Col>

                <Col span={isMobile ? 24 : 12}>
                    <Form.Item
                        label={<span>Xác nhận mật khẩu <span style={{ color: 'red' }}>*</span></span>}
                        name="newPasswordConfirm"
                        dependencies={['newPassword']}
                        rules={[
                            { required: true, message: 'Xác nhận mật khẩu không được để trống' },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (!value || getFieldValue('newPassword') === value) {
                                        return Promise.resolve();
                                    }
                                    return Promise.reject(new Error('Xác nhận mật khẩu phải trùng với mật khẩu mới'));
                                },
                            }),
                        ]}
                    >
                        <PasswordInput fieldName="confirmPassword" placeholder="Xác nhận mật khẩu mới" />
                    </Form.Item>
                </Col>

                <Col span={24}>
                    <Row gutter={[10, 10]}>
                        <Col>
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={isLoading}
                                disabled={isLoading}
                            >
                                Thay đổi mật khẩu
                            </Button>
                        </Col>
                    </Row>
                </Col>
            </Row>
        </Form>
    )
}

const ManageAccount = (props: IProps) => {
    const { open, onClose } = props;

    const onChange = (key: string) => {
        // console.log(key);
    };

    const items: TabsProps['items'] = [
        {
            key: 'user-resume',
            label: `Rải CV`,
            children: <UserResume />,
        },
        {
            key: 'user-update-info',
            label: `Cập nhật thông tin`,
            children: <UserUpdateInfo open={open} />,
        },
        {
            key: 'user-password',
            label: `Thay đổi mật khẩu`,
            children: <ChangePassword />,
        },
    ];


    return (
        <>
            <Modal
                title="Quản lý tài khoản"
                open={open}
                onCancel={() => onClose(false)}
                maskClosable={false}
                footer={null}
                destroyOnClose={true}
                width={isMobile ? "100%" : "1000px"}
            >

                <div style={{ minHeight: 400 }}>
                    <Tabs
                        defaultActiveKey="user-resume"
                        items={items}
                        onChange={onChange}
                    />
                </div>

            </Modal>
        </>
    )
}

export default ManageAccount;