package com.minisocial.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import com.minisocial.validation.BcryptPasswordLength;

@Data
public class LoginRequest {

    @NotBlank(message = "Email không được để trống")
    @Email(message = "Email không hợp lệ")
    @Size(max = 254, message = "Email không hợp lệ")
    private String email;

    @NotBlank(message = "Mật khẩu không được để trống")
    @Size(max = 100, message = "Mật khẩu không hợp lệ")
    @BcryptPasswordLength
    private String password;
}
