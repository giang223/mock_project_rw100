package com.minisocial.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;
import com.minisocial.validation.BcryptPasswordLength;

@Data
public class RegisterRequest {

    @NotBlank(message = "Họ và tên không được để trống")
    @Size(min = 2, max = 100, message = "Họ và tên phải từ 2 đến 100 ký tự")
    private String fullName;

    @NotBlank(message = "Email không được để trống")
    @Email(message = "Email không hợp lệ")
    @Size(max = 254, message = "Email tối đa 254 ký tự")
    private String email;

    @NotBlank(message = "Mật khẩu không được để trống")
    @Size(min = 8, max = 100, message = "Mật khẩu phải từ 8 đến 100 ký tự")
    @BcryptPasswordLength
    private String password;

    @Pattern(regexp = "^(?:[A-Za-z0-9._]{3,50})?$", message = "Username chỉ gồm chữ, số, dấu chấm hoặc gạch dưới và dài 3-50 ký tự")
    private String username;

    @Pattern(regexp = "^(?:[+0-9().\\-\\s]{7,20})?$", message = "Số điện thoại không hợp lệ")
    private String phone;
}
