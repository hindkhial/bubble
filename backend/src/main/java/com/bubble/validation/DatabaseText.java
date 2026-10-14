package com.bubble.validation;

import jakarta.validation.*;
import java.lang.annotation.*;

/** Reject text PostgreSQL UTF-8 cannot store, before executing SQL. */
@Target({ElementType.FIELD, ElementType.PARAMETER, ElementType.RECORD_COMPONENT, ElementType.TYPE_USE})
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = DatabaseText.Validator.class)
public @interface DatabaseText {
    String message() default "Text contains unsupported characters";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
    final class Validator implements ConstraintValidator<DatabaseText, String> {
        @Override public boolean isValid(String value, ConstraintValidatorContext context) {
            if (value == null) return true;
            for (int i = 0; i < value.length(); i++) {
                char c = value.charAt(i);
                if (c == 0 || Character.isLowSurrogate(c)) return false;
                if (Character.isHighSurrogate(c) && (++i == value.length() || !Character.isLowSurrogate(value.charAt(i)))) return false;
            }
            return true;
        }
    }
}
