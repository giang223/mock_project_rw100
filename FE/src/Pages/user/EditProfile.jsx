
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/auth";
import { getApiErrorMessage } from "../../api/http";
import { getMyProfile, updateMyProfile, uploadAvatar, uploadCover } from "../../api/users";
import { toUserView } from "../../api/adapters";

const PROFILE_EVENT = "miniSocialProfileUpdated";

const emptyProfile = { fullName: "", username: "", email: "", phone: "", birthday: "", address: "", gender: "", bio: "", avatar: "", cover: "" };

const mapProfileToForm = (profile) => {
  const user = toUserView(profile) || {};

  return {
    ...emptyProfile,
    ...user,
    fullName: user.fullName ?? "",
    username: user.username ?? "",
    email: user.email ?? "",
    phone: user.phone ?? "",
    birthday: profile?.birthday ?? "",
    address: user.address ?? "",
    gender: user.gender ?? "",
    bio: user.bio ?? "",
    avatar: user.avatar ?? "",
    cover: user.cover ?? "",
  };
};

function EditProfile() {
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const [formData, setFormData] = useState(emptyProfile);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [serverImages, setServerImages] = useState({ avatar: "", cover: "" });
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;
    getMyProfile()
      .then((profile) => {
        if (active) {
          const mapped = mapProfileToForm(profile);
          setFormData(mapped);
          setServerImages({ avatar: mapped.avatar || "", cover: mapped.cover || "" });
        }
      })
      .catch((error) => {
        if (active) setLoadError(getApiErrorMessage(error));
      });
    return () => { active = false; };
  }, []);

  // THAY ĐỔI THÔNG TIN
  const handleChange = (event) => {
  const { name, value } = event.target;

  setFormData((previous) => ({
    ...previous,
    [name]: value,
  }));

  setErrors((previous) => ({
    ...previous,
    [name]: "",
  }));
};

  // CHỌN ẢNH ĐẠI DIỆN HOẶC ẢNH BÌA
  const handleImageChange = (event, field) => {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Vui lòng chọn tệp hình ảnh!");
      return;
    }

    if (file.size > 1024 * 1024) {
  alert("Dung lượng ảnh không được vượt quá 1MB!");
  return;
}

    if (field === "avatar") setAvatarFile(file);
    if (field === "cover") setCoverFile(file);
    setIsLoading(true);

    const reader = new FileReader();

    reader.onload = () => {
  setFormData((previous) => ({
    ...previous,
    [field]: String(reader.result),
  }));

  setIsLoading(false);
};

    reader.onerror = () => {
      setIsLoading(false);
      alert("Không thể đọc hình ảnh!");
    };

    reader.readAsDataURL(file);
  };

  // XÓA HÌNH ẢNH
  const handleRemoveImage = (field) => {
  const hasPendingUpload = field === "avatar" ? avatarFile : coverFile;
  if (field === "avatar" && avatarFile) setAvatarFile(null);
  if (field === "cover" && coverFile) setCoverFile(null);
  if (!hasPendingUpload) {
    alert("Backend hiện chưa có API xóa ảnh hồ sơ. Bạn có thể tải ảnh khác lên để thay thế.");
    return;
  }
  setFormData((previous) => ({
    ...previous,
    [field]: serverImages[field],
  }));
};

  // KIỂM TRA DỮ LIỆU
  const validate = () => {
  const newErrors = {};

  const fullName = formData.fullName.trim();
  const phone = formData.phone.trim();

  const nameRegex = /^[\p{L}\p{M}\s.'’-]+$/u;

  const phoneRegex = /^(0\d{9}|\+84\d{9})$/;

  // KIỂM TRA HỌ TÊN
  if (!fullName) {
    newErrors.fullName = "Vui lòng nhập họ và tên!";
  } else if (fullName.length < 2) {
    newErrors.fullName = "Họ tên phải có ít nhất 2 ký tự!";
  } else if (fullName.length > 100) {
    newErrors.fullName = "Họ tên tối đa 100 ký tự!";
  } else if (
  !nameRegex.test(fullName) ||
  !/\p{L}/u.test(fullName)
) {
  newErrors.fullName =
    "Họ tên không được chứa số hoặc ký tự không hợp lệ!";
}

  // KIỂM TRA SỐ ĐIỆN THOẠI
  if (phone && !phoneRegex.test(phone)) {
    newErrors.phone = "Số điện thoại không hợp lệ!";
  }

  // KIỂM TRA NGÀY SINH
  if (formData.birthday) {
    const birthday = new Date(formData.birthday);

    if (
      Number.isNaN(birthday.getTime()) ||
      birthday.getTime() > Date.now()
    ) {
      newErrors.birthday = "Ngày sinh không hợp lệ!";
    }
  }

  // KIỂM TRA GIỚI THIỆU
  if (formData.bio.length > 500) {
    newErrors.bio = "Giới thiệu tối đa 500 ký tự!";
  }

  setErrors(newErrors);

  return Object.keys(newErrors).length === 0;
};

// LƯU THÔNG TIN RIÊNG CHO TỪNG TÀI KHOẢN
const handleSubmit = async (event) => {
  event.preventDefault();

  if (isLoading) return;

  if (!validate()) return;

  setIsLoading(true);
  setLoadError("");
  try {
    const payload = {
      fullName: formData.fullName.trim(),
      username: formData.username?.trim() || null,
      phone: formData.phone.trim() || null,
      birthday: formData.birthday || null,
      gender: ({ Nam: "MALE", Nữ: "FEMALE", Khác: "OTHER" })[formData.gender] || null,
      address: formData.address.trim() || null,
      bio: formData.bio.trim() || null,
      isPrivate: Boolean(formData.isPrivate),
    };
    let updated = await updateMyProfile(payload);
    if (avatarFile) updated = await uploadAvatar(avatarFile);
    if (coverFile) updated = await uploadCover(coverFile);
    const mapped = mapProfileToForm(updated);
    setFormData(mapped);
    setServerImages({ avatar: mapped.avatar || "", cover: mapped.cover || "" });
    setAvatarFile(null);
    setCoverFile(null);
    updateUser(updated);
    window.dispatchEvent(new Event(PROFILE_EVENT));
    alert("Cập nhật thông tin thành công!");
    navigate("/profile");
  } catch (error) {
    setLoadError(getApiErrorMessage(error));
  } finally {
    setIsLoading(false);
  }
};

  return (
    <div className="profile-page">
      <div className="edit-profile-card">
        <h2>Chỉnh sửa thông tin</h2>

        <p className="edit-subtitle">
          Cập nhật thông tin cá nhân của bạn.
        </p>

        {loadError && <p className="profile-field-error" role="alert">{loadError}</p>}

        <form onSubmit={handleSubmit}>
          {/* ẢNH BÌA */}
          <div className="edit-cover-section">
            <h3>Ảnh bìa</h3>

            <div className="edit-cover-preview">
              {formData.cover ? (
                <img
                  src={formData.cover}
                  alt="Ảnh bìa"
                />
              ) : (
                <span>Chưa có ảnh bìa</span>
              )}
            </div>

            <div className="profile-image-actions">
              <label
                htmlFor="cover"
                className="upload-label"
              >
                📷 Đổi ảnh bìa
              </label>

              <input
                id="cover"
                type="file"
                accept="image/*"
                disabled={isLoading}
                onChange={(event) =>
                  handleImageChange(event, "cover")
                }
                hidden
              />

              {formData.cover && (
                <button
                  type="button"
                  className="profile-remove-image"
                  disabled={isLoading}
                  onClick={() =>
                    handleRemoveImage("cover")
                  }
                >
                  Xóa ảnh
                </button>
              )}
            </div>
          </div>

          {/* ẢNH ĐẠI DIỆN */}
          <div className="avatar-upload">
            <h3>Ảnh đại diện</h3>

            <div
  className={`profile-avatar ${
    formData.color || "blue"
  }`}
>
              {formData.avatar ? (
                <img
                  src={formData.avatar}
                  alt="Ảnh đại diện"
                />
              ) : (
                String(formData.fullName || "U")
  .trim()
  .split(/\s+/)
  .pop()
  ?.charAt(0)
  .toUpperCase() || "U"
              )}
            </div>

            <div className="profile-image-actions">
              <label
                htmlFor="avatar"
                className="upload-label"
              >
                📷 Đổi ảnh đại diện
              </label>

              <input
                id="avatar"
                type="file"
                accept="image/*"
                disabled={isLoading}
                onChange={(event) =>
                  handleImageChange(event, "avatar")
                }
                hidden
              />

              {formData.avatar && (
                <button
                  type="button"
                  className="profile-remove-image"
                  disabled={isLoading}
                  onClick={() =>
                    handleRemoveImage("avatar")
                  }
                >
                  Xóa ảnh
                </button>
              )}
            </div>

            <small className="profile-image-note">
              Mỗi ảnh có dung lượng tối đa 1MB.
            </small>
          </div>

          {/* THÔNG TIN CÁ NHÂN */}
          <div className="edit-form-grid">
            <div className="edit-field">
              <label htmlFor="fullName">
                Họ và tên
              </label>

              <input
                id="fullName"
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                maxLength={100}
                required
              />

              {errors.fullName && (
                <small className="profile-field-error">
                  {errors.fullName}
                </small>
              )}
            </div>

            <div className="edit-field">
              <label htmlFor="email">Email</label>

              <input
                id="email"
                type="email"
                value={formData.email}
                readOnly
                className="profile-readonly"
              />

              <small className="profile-image-note">
                Email tài khoản không thể sửa tại đây.
              </small>
            </div>

            <div className="edit-field">
              <label htmlFor="phone">
                Số điện thoại
              </label>

              <input
                id="phone"
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                maxLength={12}
              />

              {errors.phone && (
                <small className="profile-field-error">
                  {errors.phone}
                </small>
              )}
            </div>

            <div className="edit-field">
              <label htmlFor="birthday">
                Ngày sinh
              </label>

              <input
                id="birthday"
                type="date"
                name="birthday"
                value={formData.birthday}
                onChange={handleChange}
              />

              {errors.birthday && (
                <small className="profile-field-error">
                  {errors.birthday}
                </small>
              )}
            </div>

            <div className="edit-field">
              <label htmlFor="gender">
                Giới tính
              </label>

              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
              >
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
                <option value="Khác">Khác</option>
                <option value="Không công khai">
                  Không công khai
                </option>
              </select>
            </div>

            <div className="edit-field full-width">
              <label htmlFor="address">
                Địa chỉ
              </label>

              <input
                id="address"
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                maxLength={200}
                placeholder="Nhập địa chỉ..."
              />
            </div>

            <div className="edit-field full-width">
              <label htmlFor="bio">
                Giới thiệu bản thân
              </label>

              <textarea
                id="bio"
                name="bio"
                rows={4}
                value={formData.bio}
                onChange={handleChange}
                maxLength={500}
                placeholder="Viết đôi điều về bạn..."
              />

              <div className="profile-character-count">
                {(formData.bio ?? "").length}/500
              </div>

              {errors.bio && (
                <small className="profile-field-error">
                  {errors.bio}
                </small>
              )}
            </div>
          </div>

          {/* NÚT THAO TÁC */}
          <div className="edit-actions">
            <Link
              to="/profile"
              className="cancel-button"
            >
              Hủy
            </Link>

            <button
              type="submit"
              className="login-button"
              disabled={isLoading}
            >
              {isLoading
                ? "Đang lưu..."
                : "Lưu thay đổi"}
            </button>
          </div>
        </form>

        {/* BẢO MẬT TÀI KHOẢN */}
        <div className="profile-security-section">
          <h3>Bảo mật tài khoản</h3>

          <p>
            Thay đổi mật khẩu để bảo vệ tài khoản
            của bạn.
          </p>

          <Link
            to="/change-password"
            className="profile-security-link"
          >
            🔒 Đổi mật khẩu
          </Link>
        </div>
      </div>
    </div>
  );
}

export default EditProfile;
