package com.minisocial.dto.request;

import com.minisocial.entity.User;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;

@Data
public class UpdateProfileRequest {

    @Size(min = 2, max = 100, message = "Họ và tên phải từ 2 đến 100 ký tự")
    private String fullName;

    @Pattern(regexp = "^(?:[A-Za-z0-9._]{3,50})?$", message = "Username chỉ gồm chữ, số, dấu chấm hoặc gạch dưới và dài 3-50 ký tự")
    private String username;

    @Size(max = 20, message = "Số điện thoại tối đa 20 ký tự")
    private String phone;

    @PastOrPresent(message = "Ngày sinh không được ở tương lai")
    private LocalDate birthday;

    private User.Gender gender;

    @Size(max = 255, message = "Địa chỉ tối đa 255 ký tự")
    private String address;

    @Size(max = 500, message = "Giới thiệu tối đa 500 ký tự")
    private String bio;

    private Boolean isPrivate;
}
