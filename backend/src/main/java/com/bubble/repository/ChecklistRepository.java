package com.bubble.repository;

import com.bubble.entity.Checklist;
import java.util.UUID;
import java.util.Optional;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChecklistRepository extends JpaRepository<Checklist, UUID>, org.springframework.data.jpa.repository.JpaSpecificationExecutor<Checklist> {
    Optional<Checklist> findByIdAndUser_Id(UUID id, UUID userId);
    List<Checklist> findAllByUser_IdOrderByUpdatedAtDescIdAsc(UUID userId);
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select x from Checklist x where x.id = :id and x.user.id = :owner")
    Optional<Checklist> lockOwned(@org.springframework.data.repository.query.Param("id") UUID id,
            @org.springframework.data.repository.query.Param("owner") UUID owner);
}
