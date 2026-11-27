package com.minisocial.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AdminUserActionRequest {

    @NotBlank(message = "Lý do không được để trống")
    @Size(max = 450, message = "Lý do tối đa 450 ký tự")
    private String reason;
}
