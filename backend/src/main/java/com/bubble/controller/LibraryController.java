package com.bubble.controller;

import com.bubble.dto.LibraryDtos.*;
import com.bubble.dto.ContentDtos.*;
import com.bubble.security.AccountPrincipal;
import com.bubble.service.LibraryService;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/library")
public class LibraryController {
    private final LibraryService service;
    public LibraryController(LibraryService service){this.service=service;}
    @GetMapping public PageView<Entry> entries(@AuthenticationPrincipal AccountPrincipal u,@RequestParam(defaultValue="0") int page){return service.entries(u.id(),page);}
    @GetMapping("/placements") public PageView<Placement> placements(@AuthenticationPrincipal AccountPrincipal u,@RequestParam(defaultValue="0") int page){return service.placements(u.id(),page);}
    @GetMapping("/{id}/image") public ImageView image(@AuthenticationPrincipal AccountPrincipal u,@PathVariable UUID id){return service.image(u.id(),id);}
    @PostMapping @ResponseStatus(HttpStatus.CREATED) public Entry create(@AuthenticationPrincipal AccountPrincipal u,@Valid @RequestBody NewEntry input){return service.create(u.id(),input);}
    @PatchMapping("/{id}") public Entry patch(@AuthenticationPrincipal AccountPrincipal u,@PathVariable UUID id,@Valid @RequestBody PatchEntry input){return service.patch(u.id(),id,input);}
    @PutMapping("/{id}/pin") public Entry pin(@AuthenticationPrincipal AccountPrincipal u,@PathVariable UUID id,@Valid @RequestBody Pin input){return service.pin(u.id(),id,input.pinned());}
    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void delete(@AuthenticationPrincipal AccountPrincipal u,@PathVariable UUID id){service.delete(u.id(),id);}
    @PostMapping("/notes") @ResponseStatus(HttpStatus.CREATED) public NoteView note(@AuthenticationPrincipal AccountPrincipal u,@Valid @RequestBody NoteDraft input){return service.note(u.id(),input);}
    @PostMapping("/checklists") @ResponseStatus(HttpStatus.CREATED) public ChecklistView checklist(@AuthenticationPrincipal AccountPrincipal u,@Valid @RequestBody ListDraft input){return service.checklist(u.id(),input);}
}
