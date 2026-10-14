package com.bubble.repository;

import com.bubble.entity.UserPreferences;
import java.util.Optional;
import java.util.UUID;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface UserPreferencesRepository extends JpaRepository<UserPreferences, UUID> {
    Optional<UserPreferences> findByUser_Id(UUID userId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from UserPreferences p where p.user.id = :owner")
    Optional<UserPreferences> lockOwned(@Param("owner") UUID owner);
}
