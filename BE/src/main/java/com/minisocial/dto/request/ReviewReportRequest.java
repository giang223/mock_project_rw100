package com.minisocial.dto.request;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ReviewReportRequest {

    @Size(max = 1000, message = "Ghi chú xử lý tối đa 1000 ký tự")
    private String note;
}
