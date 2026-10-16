package com.bubble.repository;

import com.bubble.entity.ChecklistItem;
import java.util.UUID;
import java.util.Optional;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChecklistItemRepository extends JpaRepository<ChecklistItem, UUID> {
    Optional<ChecklistItem> findByIdAndChecklist_User_Id(UUID id, UUID userId);
    List<ChecklistItem> findByChecklist_IdAndChecklist_User_IdOrderByPositionAsc(UUID checklistId, UUID userId);
    List<ChecklistItem> findByChecklist_IdInAndChecklist_User_IdOrderByChecklist_IdAscPositionAsc(List<UUID> checklistIds, UUID userId);
}
