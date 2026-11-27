package com.minisocial.repository;

import com.minisocial.entity.Hashtag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;

public interface HashtagRepository extends JpaRepository<Hashtag, Long> {

    Optional<Hashtag> findByName(String name);

    @Modifying
    @Query(value = "INSERT IGNORE INTO hashtags (name, created_at) VALUES (:name, :createdAt)", nativeQuery = true)
    int insertIfAbsent(@Param("name") String name, @Param("createdAt") LocalDateTime createdAt);
}
