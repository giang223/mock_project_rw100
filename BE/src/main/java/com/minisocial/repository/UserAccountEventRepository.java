package com.minisocial.repository;

import com.minisocial.entity.UserAccountEvent;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserAccountEventRepository extends JpaRepository<UserAccountEvent, Long> {
}
