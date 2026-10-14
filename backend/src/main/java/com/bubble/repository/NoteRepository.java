package com.bubble.repository;

import com.bubble.entity.Note;
import java.util.UUID;
import java.util.Optional;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NoteRepository extends JpaRepository<Note, UUID>, org.springframework.data.jpa.repository.JpaSpecificationExecutor<Note> {
    Optional<Note> findByIdAndUser_Id(UUID id, UUID userId);
    List<Note> findAllByUser_IdOrderByUpdatedAtDescIdAsc(UUID userId);
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select x from Note x where x.id = :id and x.user.id = :owner")
    Optional<Note> lockOwned(@org.springframework.data.repository.query.Param("id") UUID id,
            @org.springframework.data.repository.query.Param("owner") UUID owner);
}
