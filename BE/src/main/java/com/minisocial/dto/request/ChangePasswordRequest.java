package com.minisocial.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import com.minisocial.validation.BcryptPasswordLength;

@Data
public class ChangePasswordRequest {

    @NotBlank(message = "Mật khẩu hiện tại không được để trống")
    @Size(max = 100, message = "Mật khẩu hiện tại không hợp lệ")
    private String currentPassword;

    @NotBlank(message = "Mật khẩu mới không được để trống")
    @Size(min = 8, max = 100, message = "Mật khẩu mới phải từ 8 đến 100 ký tự")
    @BcryptPasswordLength
    private String newPassword;

    @NotBlank(message = "Xác nhận mật khẩu không được để trống")
    @Size(max = 100, message = "Xác nhận mật khẩu không hợp lệ")
    private String confirmPassword;
}
