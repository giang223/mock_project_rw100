package com.minisocial.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ReportPostRequest {

    @NotBlank(message = "Lý do báo cáo không được để trống")
    @Size(max = 1000, message = "Lý do tối đa 1000 ký tự")
    private String reason;
}
