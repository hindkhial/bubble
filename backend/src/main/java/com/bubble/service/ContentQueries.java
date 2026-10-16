package com.bubble.service;

import com.bubble.entity.ChecklistItem;
import java.util.*;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;

final class ContentQueries {
    private ContentQueries() {}
    static Pageable page(int page, int size, String sort, String direction) {
        if (page < 0 || size < 1 || size > 100 || page > 1000000
                || !Set.of("createdAt", "updatedAt").contains(sort)
                || !("asc".equals(direction) || "desc".equals(direction))) throw new IllegalArgumentException();
        return PageRequest.of(page, size, Sort.by(Sort.Direction.fromString(direction), sort).and(Sort.by("id")));
    }
    static <T> Specification<T> owned(UUID owner, Boolean pinned, String search, boolean checklist) {
        if (search != null && search.length() > 200) throw new IllegalArgumentException();
        return (root, query, cb) -> {
            var predicates = new ArrayList<jakarta.persistence.criteria.Predicate>();
            predicates.add(cb.equal(root.get("user").get("id"), owner));
            if (pinned != null) predicates.add(cb.equal(root.get("pinned"), pinned));
            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase(Locale.ROOT)
                        .replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
                var title = cb.like(cb.lower(root.get("title")), pattern, '\\');
                if (checklist) {
                    var sub = query.subquery(Integer.class);
                    var item = sub.from(ChecklistItem.class);
                    sub.select(cb.literal(1)).where(cb.equal(item.get("checklist").get("id"), root.get("id")),
                            cb.like(cb.lower(item.get("content")), pattern, '\\'));
                    predicates.add(cb.or(title, cb.exists(sub)));
                } else predicates.add(cb.or(title, cb.like(cb.lower(root.get("content")), pattern, '\\')));
            }
            return cb.and(predicates.toArray(jakarta.persistence.criteria.Predicate[]::new));
        };
    }
}
