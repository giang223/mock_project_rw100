package com.minisocial.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateNotificationPreferencesRequest {

    @NotNull
    private Boolean socialEnabled;

    @NotNull
    private Boolean messagesEnabled;
}
