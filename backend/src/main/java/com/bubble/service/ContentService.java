package com.bubble.service;

import com.bubble.dto.ContentDtos.*;
import com.bubble.entity.*;
import com.bubble.exception.ResourceNotFoundException;
import com.bubble.repository.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class ContentService {
    private final NoteRepository notes;
    private final ChecklistRepository lists;
    private final ChecklistItemRepository items;
    private final UserRepository users;
    public ContentService(NoteRepository notes, ChecklistRepository lists, ChecklistItemRepository items, UserRepository users) {
        this.notes=notes; this.lists=lists; this.items=items; this.users=users;
    }
    @Transactional(readOnly=true)
    public PageView<NoteView> notes(UUID owner, int page, int size, String sort, String direction, Boolean pinned, String q) {
        var result=notes.findAll(ContentQueries.owned(owner,pinned,q,false),ContentQueries.page(page,size,sort,direction));
        return new PageView<>(result.getContent().stream().map(this::note).toList(),page,size,result.getTotalElements(),result.getTotalPages());
    }
    @Transactional(readOnly=true)
    public NoteView note(UUID owner, UUID id) { return note(notes.findByIdAndUser_Id(id,owner).orElseThrow(ResourceNotFoundException::new)); }
    public NoteView createNote(UUID owner, NewNote input) {
        var value=new Note(users.getReferenceById(owner),input.title().trim(),input.content());
        value.setPinned(Boolean.TRUE.equals(input.pinned()));
        return note(notes.saveAndFlush(value));
    }
    public NoteView patchNote(UUID owner, UUID id, PatchNote input) {
        if(input.title()==null && input.content()==null && input.pinned()==null) throw new IllegalArgumentException();
        var value=notes.lockOwned(id,owner).orElseThrow(ResourceNotFoundException::new);
        if(input.title()!=null)value.setTitle(input.title().trim());
        if(input.content()!=null)value.setContent(input.content());
        if(input.pinned()!=null)value.setPinned(input.pinned());
        notes.flush(); return note(value);
    }
    public void deleteNote(UUID owner, UUID id) { notes.delete(notes.lockOwned(id,owner).orElseThrow(ResourceNotFoundException::new)); }
    @Transactional(readOnly=true)
    public PageView<ChecklistSummary> lists(UUID owner,int page,int size,String sort,String direction,Boolean pinned,String q) {
        var result=lists.findAll(ContentQueries.owned(owner,pinned,q,true),ContentQueries.page(page,size,sort,direction));
        return new PageView<>(result.getContent().stream().map(v -> new ChecklistSummary(v.getId(),v.getTitle(),v.isPinned(),v.getCreatedAt(),v.getUpdatedAt())).toList(),
                page,size,result.getTotalElements(),result.getTotalPages());
    }
    @Transactional(readOnly=true)
    public ChecklistView list(UUID owner,UUID id) { return list(lists.findByIdAndUser_Id(id,owner).orElseThrow(ResourceNotFoundException::new)); }
    public ChecklistView createList(UUID owner,NewChecklist input) {
        var value=new Checklist(users.getReferenceById(owner),input.title().trim());
        value.setPinned(Boolean.TRUE.equals(input.pinned())); return list(lists.saveAndFlush(value));
    }
    private Checklist lock(UUID owner,UUID id) { return lists.lockOwned(id,owner).orElseThrow(ResourceNotFoundException::new); }
    public ChecklistView patchList(UUID owner,UUID id,PatchChecklist input) {
        if(input.title()==null && input.pinned()==null)throw new IllegalArgumentException();
        var value=lock(owner,id);
        if(input.title()!=null)value.setTitle(input.title().trim());
        if(input.pinned()!=null)value.setPinned(input.pinned());
        lists.flush(); return list(value);
    }
    public void deleteList(UUID owner,UUID id) {
        var value=lock(owner,id);
        // Explicit child deletion preserves the existing restrictive foreign keys and cascade policy.
        items.deleteAll(items.findByChecklist_IdAndChecklist_User_IdOrderByPositionAsc(id,owner));
        items.flush(); lists.delete(value);
    }
    public ItemView addItem(UUID owner,UUID id,NewItem input) {
        var parent=lock(owner,id);
        var ordered=items.findByChecklist_IdAndChecklist_User_IdOrderByPositionAsc(id,owner);
        if(ordered.size()>=1000)throw new IllegalArgumentException();
        long next=ordered.stream().mapToLong(ChecklistItem::getPosition).max().orElse(-1)+1;
        if(next>Integer.MAX_VALUE)throw new IllegalArgumentException();
        var value=items.saveAndFlush(new ChecklistItem(parent,input.content(),(int)next));
        parent.touch(); lists.flush(); return item(value);
    }
    public ItemView patchItem(UUID owner,UUID id,UUID itemId,PatchItem input) {
        if(input.content()==null && input.completed()==null)throw new IllegalArgumentException();
        var parent=lock(owner,id);
        var value=items.findByIdAndChecklist_User_Id(itemId,owner)
                .filter(v -> v.getChecklist().getId().equals(id)).orElseThrow(ResourceNotFoundException::new);
        if(input.content()!=null)value.setContent(input.content());
        if(input.completed()!=null)value.setCompleted(input.completed());
        parent.touch(); items.flush(); return item(value);
    }
    public void deleteItem(UUID owner,UUID id,UUID itemId) {
        var parent=lock(owner,id);
        var ordered=new ArrayList<>(items.findByChecklist_IdAndChecklist_User_IdOrderByPositionAsc(id,owner));
        var value=ordered.stream().filter(v -> v.getId().equals(itemId)).findFirst().orElseThrow(ResourceNotFoundException::new);
        items.delete(value); items.flush(); ordered.remove(value); reposition(ordered);
        parent.touch(); lists.flush();
    }
    public ChecklistView reorder(UUID owner,UUID id,ItemOrder input) {
        var parent=lock(owner,id);
        var ordered=items.findByChecklist_IdAndChecklist_User_IdOrderByPositionAsc(id,owner);
        var byId=new HashMap<UUID,ChecklistItem>(); ordered.forEach(v -> byId.put(v.getId(),v));
        if(input.itemIds().size()!=ordered.size() || new HashSet<>(input.itemIds()).size()!=ordered.size()
                || !byId.keySet().equals(new HashSet<>(input.itemIds())))throw new IllegalArgumentException();
        var result=input.itemIds().stream().map(byId::get).toList(); reposition(result);
        parent.touch(); lists.flush();
        return new ChecklistView(parent.getId(),parent.getTitle(),parent.isPinned(),parent.getCreatedAt(),parent.getUpdatedAt(),result.stream().map(this::item).toList());
    }
    public ChecklistView saveChecklistDraft(UUID owner, UUID id, ChecklistDraft input) {
        var parent = id == null ? lists.saveAndFlush(new Checklist(users.getReferenceById(owner), input.title().trim())) : lock(owner, id);
        var existing = items.findByChecklist_IdAndChecklist_User_IdOrderByPositionAsc(parent.getId(), owner);
        var byId = new HashMap<UUID, ChecklistItem>(); existing.forEach(row -> byId.put(row.getId(), row));
        var retained = new HashSet<UUID>();
        for (var row : input.items()) if (row.id() != null && (!byId.containsKey(row.id()) || !retained.add(row.id()))) throw new IllegalArgumentException();
        parent.setTitle(input.title().trim());
        for (var row : existing) if (!retained.contains(row.getId())) items.delete(row);
        items.flush();
        long next = existing.stream().mapToLong(ChecklistItem::getPosition).max().orElse(-1) + 1;
        if (next + input.items().size() > Integer.MAX_VALUE) throw new IllegalArgumentException();
        var ordered = new ArrayList<ChecklistItem>();
        for (var draft : input.items()) {
            var row = draft.id() == null ? new ChecklistItem(parent, draft.content(), (int) next++) : byId.get(draft.id());
            row.setContent(draft.content()); row.setCompleted(draft.completed());
            if (draft.id() == null) items.save(row);
            ordered.add(row);
        }
        items.flush(); reposition(ordered); parent.touch(); lists.flush();
        return new ChecklistView(parent.getId(), parent.getTitle(), parent.isPinned(), parent.getCreatedAt(), parent.getUpdatedAt(), ordered.stream().map(this::item).toList());
    }
    private void reposition(List<ChecklistItem> ordered) {
        // Move above all occupied positions first, avoiding transient uniqueness violations.
        long offset=ordered.stream().mapToLong(ChecklistItem::getPosition).max().orElse(-1)+1;
        if(offset+ordered.size()>Integer.MAX_VALUE)throw new IllegalArgumentException();
        for(int i=0;i<ordered.size();i++)ordered.get(i).setPosition((int)offset+i);
        items.flush();
        for(int i=0;i<ordered.size();i++)ordered.get(i).setPosition(i);
        items.flush();
    }
    private NoteView note(Note v) { return new NoteView(v.getId(),v.getTitle(),v.getContent(),v.isPinned(),v.getCreatedAt(),v.getUpdatedAt()); }
    private ItemView item(ChecklistItem v) { return new ItemView(v.getId(),v.getContent(),v.isCompleted(),v.getPosition(),v.getCreatedAt(),v.getUpdatedAt()); }
    private ChecklistView list(Checklist v) { return new ChecklistView(v.getId(),v.getTitle(),v.isPinned(),v.getCreatedAt(),v.getUpdatedAt(),v.getItems().stream().map(this::item).toList()); }
}
