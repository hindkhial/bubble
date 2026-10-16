package com.bubble.controller;

import com.bubble.dto.ContentDtos.*;
import com.bubble.security.AccountPrincipal;
import com.bubble.service.ContentService;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class ContentController {
    private final ContentService service;
    public ContentController(ContentService service) { this.service=service; }
    @GetMapping("/notes")
    public PageView<NoteView> notes(@AuthenticationPrincipal AccountPrincipal user,
            @RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size,
            @RequestParam(defaultValue="updatedAt") String sort,@RequestParam(defaultValue="desc") String direction,
            @RequestParam(required=false) Boolean pinned,@RequestParam(required=false) String q) {
        return service.notes(user.id(),page,size,sort,direction,pinned,q);
    }
    @GetMapping("/notes/{id}") public NoteView note(@AuthenticationPrincipal AccountPrincipal user,@PathVariable UUID id) { return service.note(user.id(),id); }
    @PostMapping("/notes") @ResponseStatus(HttpStatus.CREATED)
    public NoteView createNote(@AuthenticationPrincipal AccountPrincipal user,@Valid @RequestBody NewNote input) { return service.createNote(user.id(),input); }
    @PatchMapping("/notes/{id}") public NoteView patchNote(@AuthenticationPrincipal AccountPrincipal user,@PathVariable UUID id,@Valid @RequestBody PatchNote input) { return service.patchNote(user.id(),id,input); }
    @DeleteMapping("/notes/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteNote(@AuthenticationPrincipal AccountPrincipal user,@PathVariable UUID id) { service.deleteNote(user.id(),id); }
    @GetMapping("/checklists")
    public PageView<?> lists(@AuthenticationPrincipal AccountPrincipal user,
            @RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size,
            @RequestParam(defaultValue="updatedAt") String sort,@RequestParam(defaultValue="desc") String direction,
            @RequestParam(required=false) Boolean pinned,@RequestParam(required=false) String q,
            @RequestParam(defaultValue="false") boolean includeItems) {
        return includeItems ? service.listsWithItems(user.id(),page,size,sort,direction,pinned,q)
                : service.lists(user.id(),page,size,sort,direction,pinned,q);
    }
    @GetMapping("/checklists/{id}") public ChecklistView list(@AuthenticationPrincipal AccountPrincipal user,@PathVariable UUID id) { return service.list(user.id(),id); }
    @PostMapping("/checklists") @ResponseStatus(HttpStatus.CREATED)
    public ChecklistView createList(@AuthenticationPrincipal AccountPrincipal user,@Valid @RequestBody NewChecklist input) { return service.createList(user.id(),input); }
    @PatchMapping("/checklists/{id}") public ChecklistView patchList(@AuthenticationPrincipal AccountPrincipal user,@PathVariable UUID id,@Valid @RequestBody PatchChecklist input) { return service.patchList(user.id(),id,input); }
    @DeleteMapping("/checklists/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteList(@AuthenticationPrincipal AccountPrincipal user,@PathVariable UUID id) { service.deleteList(user.id(),id); }
    @PostMapping("/checklists/{id}/items") @ResponseStatus(HttpStatus.CREATED)
    public ItemView addItem(@AuthenticationPrincipal AccountPrincipal user,@PathVariable UUID id,@Valid @RequestBody NewItem input) { return service.addItem(user.id(),id,input); }
    @PatchMapping("/checklists/{id}/items/{itemId}") public ItemView patchItem(@AuthenticationPrincipal AccountPrincipal user,@PathVariable UUID id,@PathVariable UUID itemId,@Valid @RequestBody PatchItem input) { return service.patchItem(user.id(),id,itemId,input); }
    @DeleteMapping("/checklists/{id}/items/{itemId}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteItem(@AuthenticationPrincipal AccountPrincipal user,@PathVariable UUID id,@PathVariable UUID itemId) { service.deleteItem(user.id(),id,itemId); }
    @PostMapping("/checklists/with-items") @ResponseStatus(HttpStatus.CREATED)
    public ChecklistView createDraft(@AuthenticationPrincipal AccountPrincipal user, @Valid @RequestBody ChecklistDraft input) {
        return service.saveChecklistDraft(user.id(), null, input);
    }
    @PutMapping("/checklists/{id}/content")
    public ChecklistView saveDraft(@AuthenticationPrincipal AccountPrincipal user, @PathVariable UUID id, @Valid @RequestBody ChecklistDraft input) {
        return service.saveChecklistDraft(user.id(), id, input);
    }
    @PutMapping("/checklists/{id}/items/order") public ChecklistView reorder(@AuthenticationPrincipal AccountPrincipal user,@PathVariable UUID id,@Valid @RequestBody ItemOrder input) { return service.reorder(user.id(),id,input); }
}
