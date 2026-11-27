package com.minisocial.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class DeactivateAccountRequest {

    @NotBlank(message = "Mật khẩu hiện tại không được để trống")
    @Size(max = 100, message = "Mật khẩu hiện tại không hợp lệ")
    private String currentPassword;
}
