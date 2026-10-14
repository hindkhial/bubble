package com.bubble.repository;

import com.bubble.entity.Profile;
import java.util.UUID;
import java.util.Optional;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProfileRepository extends JpaRepository<Profile, UUID> {
    Optional<Profile> findByUser_Id(UUID userId);
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select p from Profile p where p.user.id = :owner")
    Optional<Profile> lockOwned(@org.springframework.data.repository.query.Param("owner") UUID owner);
}
