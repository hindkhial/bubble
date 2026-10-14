package com.bubble.repository;

import com.bubble.entity.Checklist;
import java.util.UUID;
import java.util.Optional;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChecklistRepository extends JpaRepository<Checklist, UUID> {
    Optional<Checklist> findByIdAndUser_Id(UUID id, UUID userId);
    List<Checklist> findAllByUser_IdOrderByUpdatedAtDescIdAsc(UUID userId);
}
