package com.minisocial.dto.request;

import jakarta.validation.constraints.Positive;
import lombok.Data;

@Data
public class AssignReportRequest {

    @Positive(message = "ID quản trị viên không hợp lệ")
    private Long assigneeAdminId;
}
