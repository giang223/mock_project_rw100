// DANH SÁCH TÀI KHOẢN MOCK
export const MOCK_ACCOUNTS = [
    {
        id: 1,
        fullName: "Nguyễn Văn A",
        username: "nguyenvana",
        email: "nguyenvana@example.com",
        role: "USER",
        avatar: "",
        color: "blue",
        gender: "Nam",
        bio: "Xin chào! Mình đang sử dụng MiniSocial.",
    },
    {
        id: 2,
        fullName: "Trần Thị B",
        username: "tranthib",
        email: "tranthib@example.com",
        role: "USER",
        avatar: "",
        color: "green",
        gender: "Nữ",
        bio: "Yêu thích du lịch và chụp ảnh.",
    },
    {
        id: 3,
        fullName: "Lê Văn C",
        username: "levanc",
        email: "levanc@example.com",
        role: "USER",
        avatar: "",
        color: "orange",
        gender: "Nam",
        bio: "Đam mê công nghệ và lập trình.",
    },
    {
        id: 4,
        fullName: "Phạm Thu Hà",
        username: "phamthuha",
        email: "phamthuha@example.com",
        role: "USER",
        avatar: "",
        color: "purple",
        gender: "Nữ",
        bio: "Yêu thích âm nhạc và đọc sách.",
    },
    {
        id: 5,
        fullName: "Lan Anh",
        username: "lananh",
        email: "lananh@example.com",
        role: "USER",
        avatar: "",
        color: "pink",
        gender: "Nữ",
        bio: "Chia sẻ những điều tích cực mỗi ngày.",
    },
    {
        id: 6,
        fullName: "Quang Minh",
        username: "quangminh",
        email: "quangminh@example.com",
        role: "USER",
        avatar: "",
        color: "orange",
        gender: "Nam",
        bio: "Thích thể thao và khám phá.",
    },
    {
        id: 7,
        fullName: "Quản trị viên",
        username: "admin",
        email: "admin@example.com",
        role: "ADMIN",
        avatar: "",
        color: "blue",
        gender: "",
        bio: "Quản trị hệ thống MiniSocial.",
    },
];

export const MOCK_PASSWORD = "Demo@123";

export const CURRENT_ACCOUNT_KEY = "miniSocialCurrentAccount";

export const ACCOUNT_EVENT = "miniSocialAccountUpdated";

// LẤY DANH SÁCH TÀI KHOẢN
export function getMockAccounts() {
    return MOCK_ACCOUNTS.map((account) => ({
        ...account,
    }));
}

// TÌM TÀI KHOẢN THEO ID
export function getAccountById(id) {
    return (
        MOCK_ACCOUNTS.find((account) => String(account.id) === String(id)) ||
        null
    );
}

// TÌM TÀI KHOẢN THEO EMAIL
export function getAccountByEmail(email) {
    const normalizedEmail = String(email || "")
        .trim()
        .toLowerCase();

    return (
        MOCK_ACCOUNTS.find((account) => account.email === normalizedEmail) ||
        null
    );
}

// TÌM TÀI KHOẢN THEO TÊN
export function getAccountByName(name) {
    return MOCK_ACCOUNTS.find((account) => account.fullName === name) || null;
}

// LẤY TÀI KHOẢN ĐANG ĐĂNG NHẬP
export function getCurrentAccount() {
    try {
        const id = sessionStorage.getItem(CURRENT_ACCOUNT_KEY);

        return getAccountById(id);
    } catch {
        return null;
    }
}

// LƯU TÀI KHOẢN ĐANG ĐĂNG NHẬP
export function setCurrentAccount(id) {
    const account = getAccountById(id);

    if (!account) return false;

    try {
        sessionStorage.setItem(CURRENT_ACCOUNT_KEY, String(account.id));

        window.dispatchEvent(new Event(ACCOUNT_EVENT));

        return true;
    } catch {
        return false;
    }
}

// ĐĂNG NHẬP MOCK
export function loginMockAccount(email, password) {
    const account = getAccountByEmail(email);

    if (!account || password !== MOCK_PASSWORD) {
        return {
            success: false,
            message: "Email hoặc mật khẩu không chính xác.",
        };
    }

    if (!setCurrentAccount(account.id)) {
        return {
            success: false,
            message: "Không thể lưu phiên đăng nhập.",
        };
    }

    return {
        success: true,
        account,
    };
}

// CHUYỂN ĐỔI TÀI KHOẢN
export function switchMockAccount(id) {
    return setCurrentAccount(id);
}

// ĐĂNG XUẤT
export function logoutMockAccount() {
    sessionStorage.removeItem(CURRENT_ACCOUNT_KEY);

    window.dispatchEvent(new Event(ACCOUNT_EVENT));
}

// TẠO KEY DỮ LIỆU RIÊNG CHO TỪNG TÀI KHOẢN
export function getAccountStorageKey(key, accountId) {
    const id = accountId ?? getCurrentAccount()?.id;

    if (!id) {
        throw new Error("Chưa chọn tài khoản demo.");
    }

    return `${key}_${id}`;
}

// ĐỌC DỮ LIỆU RIÊNG
export function readAccountData(key, fallback = null, accountId) {
    try {
        const storageKey = getAccountStorageKey(key, accountId);

        const saved = localStorage.getItem(storageKey);

        return saved === null ? fallback : JSON.parse(saved);
    } catch {
        return fallback;
    }
}

// LƯU DỮ LIỆU RIÊNG
export function saveAccountData(key, data, accountId) {
    try {
        const storageKey = getAccountStorageKey(key, accountId);

        localStorage.setItem(storageKey, JSON.stringify(data));

        return true;
    } catch {
        return false;
    }
}

// KIỂM TRA QUYỀN ADMIN
export function isAdmin(account = getCurrentAccount()) {
    return account?.role === "ADMIN";
}

// KIỂM TRA QUYỀN USER
export function isUser(account = getCurrentAccount()) {
    return account?.role === "USER";
}

// LẤY VAI TRÒ TÀI KHOẢN HIỆN TẠI
export function getCurrentRole() {
    return getCurrentAccount()?.role || null;
}

// LẤY DANH SÁCH NGƯỜI DÙNG THÔNG THƯỜNG
export function getMockUsers() {
    return MOCK_ACCOUNTS.filter((account) => account.role === "USER").map(
        (account) => ({
            ...account,
        }),
    );
}

// LẤY DANH SÁCH QUẢN TRỊ VIÊN
export function getMockAdmins() {
    return MOCK_ACCOUNTS.filter((account) => account.role === "ADMIN").map(
        (account) => ({
            ...account,
        }),
    );
}
