package com.bubble.service;

import com.bubble.dto.LibraryDtos.*;
import com.bubble.dto.ContentDtos.*;
import com.bubble.exception.ResourceNotFoundException;
import java.io.*;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.*;
import javax.imageio.ImageIO;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Account ownership is taken only from the authenticated principal. */
@Service
@Transactional
public class LibraryService {
    private final JdbcTemplate db;
    private final ContentService content;
    public LibraryService(JdbcTemplate db, ContentService content) { this.db=db;this.content=content; }
    private Entry row(ResultSet r,int ignored) throws SQLException {
        return new Entry(r.getObject("id",UUID.class),r.getString("kind"),r.getString("title"),r.getString("description"),
                r.getObject("parent_id",UUID.class),r.getString("color"),r.getInt("image_width"),r.getInt("image_height"),
                r.getBoolean("is_pinned"),r.getTimestamp("created_at").toInstant(),r.getTimestamp("updated_at").toInstant());
    }
    private static final String FIELDS="id,kind,title,description,parent_id,color,image_width,image_height,is_pinned,created_at,updated_at";
    @Transactional(readOnly=true)
    public Entry get(UUID owner,UUID id) {
        return db.query("select "+FIELDS+" from library_entries where user_id=? and id=?",this::row,owner,id)
                .stream().findFirst().orElseThrow(ResourceNotFoundException::new);
    }
    private void parent(UUID owner,UUID id) {
        if(id==null)return;
        // Lock the destination through the insert so concurrent deletion cannot orphan a save.
        var kinds=db.queryForList("select kind from library_entries where user_id=? and id=? for update",String.class,owner,id);
        if(kinds.size()!=1 || !kinds.getFirst().equals("BUBBLE"))throw new ResourceNotFoundException();
    }
    @Transactional(readOnly=true)
    public PageView<Entry> entries(UUID owner,int page) {
        if(page<0 || page>100000)throw new IllegalArgumentException();
        long total=db.queryForObject("select count(*) from library_entries where user_id=?",Long.class,owner);
        var rows=db.query("select "+FIELDS+" from library_entries where user_id=? order by created_at,id limit 100 offset ?",this::row,owner,(long)page*100);
        return new PageView<>(rows,page,100,total,(int)((total+99)/100));
    }
    @Transactional(readOnly=true)
    public PageView<Placement> placements(UUID owner,int page) {
        if(page<0 || page>100000)throw new IllegalArgumentException();
        long total=db.queryForObject("select count(*) from library_placements where user_id=?",Long.class,owner);
        var rows=db.query("select * from library_placements where user_id=? order by id limit 100 offset ?",
                (r,n)->new Placement(r.getObject("id",UUID.class),r.getObject("bubble_id",UUID.class),r.getObject("note_id",UUID.class),r.getObject("checklist_id",UUID.class)),owner,(long)page*100);
        return new PageView<>(rows,page,100,total,(int)((total+99)/100));
    }
    public Entry create(UUID owner,NewEntry input) {
        db.queryForObject("select id from users where id=? for update",UUID.class,owner);
        long count=db.queryForObject("select count(*) from library_entries where user_id=?",Long.class,owner);
        long stored=db.queryForObject("select coalesce(sum(octet_length(image)),0) from library_entries where user_id=?",Long.class,owner);
        if(count>=500 || stored+524288>100L*1024*1024)throw new IllegalArgumentException();
        parent(owner,input.parentId());
        // Decode a bounded JPEG/PNG, inspect dimensions before allocating pixels, and
        // re-encode to remove EXIF/GPS and reject active/non-image payloads.
        byte[] bytes;
        try {bytes=Base64.getDecoder().decode(input.image());}catch(IllegalArgumentException e){throw new IllegalArgumentException();}
        if(bytes.length==0 || bytes.length>524288)throw new IllegalArgumentException();
        int width,height;
        try(var stream=ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
            var readers=ImageIO.getImageReaders(stream);
            if(!readers.hasNext())throw new IllegalArgumentException();
            var reader=readers.next();
            try {
                String format=reader.getFormatName();
                if(!format.equalsIgnoreCase("JPEG")&&!format.equalsIgnoreCase("PNG"))throw new IllegalArgumentException();
                reader.setInput(stream,true,true);width=reader.getWidth(0);height=reader.getHeight(0);
                if(width<1 || height<1 || (long)width*height>16000000)throw new IllegalArgumentException();
                var decoded=reader.read(0);
                var rgb=new java.awt.image.BufferedImage(width,height,java.awt.image.BufferedImage.TYPE_INT_RGB);
                var graphics=rgb.createGraphics();
                try {graphics.setColor(java.awt.Color.WHITE);graphics.fillRect(0,0,width,height);graphics.drawImage(decoded,0,0,null);}finally{graphics.dispose();}
                var writer=ImageIO.getImageWritersByFormatName("jpeg").next();
                try {
                    for(float quality:new float[]{0.8f,0.6f,0.4f,0.2f}) {
                        var output=new ByteArrayOutputStream();
                        try(var imageOutput=ImageIO.createImageOutputStream(output)) {
                            writer.setOutput(imageOutput);var parameters=writer.getDefaultWriteParam();
                            parameters.setCompressionMode(javax.imageio.ImageWriteParam.MODE_EXPLICIT);parameters.setCompressionQuality(quality);
                            writer.write(null,new javax.imageio.IIOImage(rgb,null,null),parameters);
                        }
                        bytes=output.toByteArray();if(bytes.length<=524288)break;
                    }
                }finally{writer.dispose();}
                if(bytes.length>524288)throw new IllegalArgumentException();
            }finally{reader.dispose();}
        }catch(IOException e){throw new IllegalArgumentException();}
        UUID id=UUID.randomUUID();
        db.update("insert into library_entries(id,user_id,kind,parent_id,title,description,color,image,image_width,image_height) values(?,?,?,?,?,?,?,?,?,?)",
                id,owner,input.kind(),input.parentId(),input.title().trim(),input.description(),input.color(),bytes,width,height);
        return get(owner,id);
    }
    @Transactional(readOnly=true)
    public ImageView image(UUID owner,UUID id) {
        var images=db.query("select image from library_entries where user_id=? and id=?",(r,n)->r.getBytes(1),owner,id);
        if(images.isEmpty())throw new ResourceNotFoundException();
        return new ImageView("data:image/jpeg;base64,"+Base64.getEncoder().encodeToString(images.getFirst()));
    }
    public Entry patch(UUID owner,UUID id,PatchEntry input) {
        get(owner,id);
        db.update("update library_entries set title=?,description=?,color=?,updated_at=current_timestamp where user_id=? and id=?",input.title().trim(),input.description(),input.color(),owner,id);
        return get(owner,id);
    }
    public Entry pin(UUID owner,UUID id,boolean pinned) {
        get(owner,id);db.update("update library_entries set is_pinned=?,updated_at=current_timestamp where user_id=? and id=?",pinned,owner,id);return get(owner,id);
    }
    public NoteView note(UUID owner,NoteDraft input) {
        parent(owner,input.bubbleId());
        var note=content.createNote(owner,input.note());
        if(input.bubbleId()!=null)db.update("insert into library_placements(id,user_id,bubble_id,note_id) values(?,?,?,?)",UUID.randomUUID(),owner,input.bubbleId(),note.id());
        return note;
    }
    public ChecklistView checklist(UUID owner,ListDraft input) {
        parent(owner,input.bubbleId());
        var list=content.saveChecklistDraft(owner,null,input.checklist());
        if(input.bubbleId()!=null)db.update("insert into library_placements(id,user_id,bubble_id,checklist_id) values(?,?,?,?)",UUID.randomUUID(),owner,input.bubbleId(),list.id());
        return list;
    }
    public void delete(UUID owner,UUID id) {
        get(owner,id);
        // Removing a collection never deletes its contents. Child collections and
        // photos become root entries; notes/lists lose only their placement.
        db.update("delete from library_entries where user_id=? and id=?",owner,id);
    }
}
