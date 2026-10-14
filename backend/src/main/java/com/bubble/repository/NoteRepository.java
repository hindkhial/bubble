package com.bubble.repository;

import com.bubble.entity.Note;
import java.util.UUID;
import java.util.Optional;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NoteRepository extends JpaRepository<Note, UUID> {
    Optional<Note> findByIdAndUser_Id(UUID id, UUID userId);
    List<Note> findAllByUser_IdOrderByUpdatedAtDescIdAsc(UUID userId);
}
