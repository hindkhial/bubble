package com.bubble;

import com.bubble.dto.ApiError;
import com.bubble.exception.ApiExceptionHandler;
import jakarta.validation.ConstraintViolationException;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;

class ExceptionHandlerTest {
    @Test
    void constraintViolationsHaveStablePublicResponse() {
        var response = new ApiExceptionHandler().invalidRequest(mock(ConstraintViolationException.class));
        assertEquals(400, response.getStatusCode().value());
        assertEquals(new ApiError(400, "The request failed validation."), response.getBody());
    }
}
