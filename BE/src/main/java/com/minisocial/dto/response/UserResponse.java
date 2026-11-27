package com.minisocial.dto.response;

import com.minisocial.entity.User;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
public class UserResponse {
    private Long id;
    private String email;
    private String fullName;
    private String username;
    private String phone;
    private LocalDate birthday;
    private User.Gender gender;
    private String address;
    private String bio;
    private String avatarUrl;
    private String coverUrl;
    private User.Role role;
    private Boolean isEmailVerified;
    private Boolean isPrivate;
    private LocalDateTime createdAt;
}
